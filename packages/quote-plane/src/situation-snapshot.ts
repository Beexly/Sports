/**
 * SituationSnapshot — book market-state bundle from FREE quote ladder.
 *
 * Pure merge: earlier FREE_QUOTE_PRECEDENCE tier wins on conflict when freshness
 * is comparable; later tiers fill gaps only. Apify never alone sets headline
 * consensus. Does not invent live HTTP providers — accepts already-fetched
 * contributions labeled with freeTier metadata.
 *
 * Additive parallel to QuoteLine; does not rewrite QuoteLine / KIND_RANK.
 */

import type { QuoteLine } from "./types";
import {
  FREE_QUOTE_PRECEDENCE,
  type FreeQuoteTier,
  citeAllowed,
  certifiableForLiveGate,
  earlierWins,
  isFreeQuoteTier,
  isTierBOnly,
  tierIndex,
} from "./precedence";

/** Thin wrapper: QuoteLine + free-ladder tier (keeps QuoteLine untouched). */
export interface FreeQuoteContribution {
  readonly line: QuoteLine;
  readonly freeTier: FreeQuoteTier;
}

export interface SituationBookLineRef {
  readonly market: QuoteLine["market"];
  readonly selection: string;
  readonly q: number;
  readonly rawAmerican?: number;
  readonly rawDecimal?: number;
  readonly quoteAsOf: string;
  readonly sourceId: string;
  /** Line key for conflict identity within a book. */
  readonly lineKey: string;
}

export interface SituationBookEntry {
  readonly bookId: string;
  readonly lines: readonly SituationBookLineRef[];
  readonly suppliedByTier: FreeQuoteTier;
}

export interface SituationSnapshot {
  readonly eventId: string;
  readonly sport: string;
  readonly markets: readonly QuoteLine["market"][];
  readonly books: readonly SituationBookEntry[];
  readonly asOf: string;
  readonly sourcesUsed: readonly FreeQuoteTier[];
  readonly citeEligibleSources: readonly FreeQuoteTier[];
  readonly primaryTier: FreeQuoteTier | null;
  readonly tierBOnly: boolean;
  readonly divergenceFlags?: readonly string[];
}

export interface BuildSituationSnapshotInput {
  readonly eventId: string;
  readonly sport: string;
  readonly contributions: readonly FreeQuoteContribution[];
  /**
   * Max absolute age skew (ms) to treat two quotes as "freshness comparable".
   * Default 5 minutes. When later tier is substantially fresher, conflict is
   * flagged rather than blindly overwritten by earlier tier.
   */
  readonly freshnessWindowMs?: number;
}

function bookLineKey(
  bookId: string,
  market: QuoteLine["market"],
  selection: string,
): string {
  return `${bookId}|${market}|${selection}`;
}

function lineRefFrom(
  c: FreeQuoteContribution,
  bookId: string,
): SituationBookLineRef {
  const { line } = c;
  return {
    market: line.market,
    selection: line.selection,
    q: line.q,
    rawAmerican: line.rawAmerican,
    rawDecimal: line.rawDecimal,
    quoteAsOf: line.quoteAsOf,
    sourceId: line.sourceId,
    lineKey: bookLineKey(bookId, line.market, line.selection),
  };
}

function resolveBookId(line: QuoteLine, freeTier: FreeQuoteTier): string {
  return line.bookId?.trim() || `source:${line.sourceId || freeTier}`;
}

/**
 * Merge free-ladder contributions into a SituationSnapshot.
 *
 * Policy:
 * 1. Sort contributions by FREE_QUOTE_PRECEDENCE (ascending index).
 * 2. For each book|market|selection: first (earlier) tier that supplies a line
 *    owns it when freshness is comparable; later tiers fill gaps only.
 * 3. If later tier disagrees and is not substantially fresher → keep earlier,
 *    emit divergence flag.
 * 4. If only Tier-B (Apify) contributions remain → tierBOnly=true and
 *    citeEligibleSources=[].
 * 5. Never let Apify alone set headline consensus (primaryTier stays null /
 *    tierBOnly when no Tier-A-eligible free source contributed a kept line).
 */
export function buildSituationSnapshotFromQuotes(
  input: BuildSituationSnapshotInput,
): SituationSnapshot {
  const freshnessWindowMs = input.freshnessWindowMs ?? 5 * 60 * 1000;
  const scoped = input.contributions.filter(
    (c) =>
      c.line.eventId === input.eventId &&
      isFreeQuoteTier(c.freeTier) &&
      (FREE_QUOTE_PRECEDENCE as readonly string[]).includes(c.freeTier),
  );

  const ordered = [...scoped].sort(
    (a, b) =>
      tierIndex(a.freeTier) - tierIndex(b.freeTier) ||
      Date.parse(b.line.quoteAsOf) - Date.parse(a.line.quoteAsOf),
  );

  /** Winning contribution per book|market|selection. */
  const winners = new Map<
    string,
    { contrib: FreeQuoteContribution; bookId: string }
  >();
  const divergenceFlags: string[] = [];
  const sourcesUsedSet = new Set<FreeQuoteTier>();

  for (const c of ordered) {
    const bookId = resolveBookId(c.line, c.freeTier);
    const key = bookLineKey(bookId, c.line.market, c.line.selection);
    const existing = winners.get(key);

    if (!existing) {
      winners.set(key, { contrib: c, bookId });
      sourcesUsedSet.add(c.freeTier);
      continue;
    }

    // Gap already filled by earlier (or equal) tier — later only enrich gaps.
    const kept = existing.contrib;
    const keptTs = Date.parse(kept.line.quoteAsOf);
    const candTs = Date.parse(c.line.quoteAsOf);
    const ageSkew = Number.isFinite(keptTs) && Number.isFinite(candTs)
      ? Math.abs(candTs - keptTs)
      : 0;

    const disagree =
      Math.abs(kept.line.q - c.line.q) > 1e-6 ||
      (kept.line.rawAmerican !== undefined &&
        c.line.rawAmerican !== undefined &&
        kept.line.rawAmerican !== c.line.rawAmerican);

    if (disagree) {
      const laterFresher =
        Number.isFinite(candTs) &&
        Number.isFinite(keptTs) &&
        candTs > keptTs + freshnessWindowMs;

      if (laterFresher && earlierWins(kept.freeTier, c.freeTier)) {
        // Explicit divergence: higher tier kept despite substantially fresher lower tier.
        divergenceFlags.push(
          `stale_higher_tier:${key}:${kept.freeTier}>${c.freeTier}`,
        );
      } else if (earlierWins(kept.freeTier, c.freeTier)) {
        divergenceFlags.push(
          `conflict_earlier_wins:${key}:${kept.freeTier}>${c.freeTier}`,
        );
      }
    }

    // Never overwrite earlier winner with later tier (gap-fill only).
    void ageSkew;
    sourcesUsedSet.add(c.freeTier);
  }

  // Group winners into books
  const byBook = new Map<
    string,
    { tier: FreeQuoteTier; lines: SituationBookLineRef[] }
  >();
  for (const { contrib, bookId } of winners.values()) {
    const entry = byBook.get(bookId) ?? {
      tier: contrib.freeTier,
      lines: [],
    };
    // Book-level suppliedByTier = best (earliest) tier that supplied any line.
    if (tierIndex(contrib.freeTier) < tierIndex(entry.tier)) {
      entry.tier = contrib.freeTier;
    }
    entry.lines.push(lineRefFrom(contrib, bookId));
    byBook.set(bookId, entry);
  }

  const books: SituationBookEntry[] = [...byBook.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bookId, v]) => ({
      bookId,
      lines: v.lines,
      suppliedByTier: v.tier,
    }));

  const markets = [
    ...new Set(
      [...winners.values()].map((w) => w.contrib.line.market),
    ),
  ] as QuoteLine["market"][];

  const sourcesUsed = FREE_QUOTE_PRECEDENCE.filter((t) =>
    sourcesUsedSet.has(t),
  );

  const keptTiers = new Set(
    [...winners.values()].map((w) => w.contrib.freeTier),
  );
  const keptNonB = [...keptTiers].filter((t) => !isTierBOnly(t));
  const tierBOnly =
    winners.size > 0 ? keptNonB.length === 0 : false;

  // Cite-eligible: tiers that actually supplied a kept line AND citeAllowed,
  // excluding live-gate-uncertifiable from "cert" path — OddsPapi stays out of
  // citeEligibleSources for live-gate cert (internal analytics only).
  const citeEligibleSources = FREE_QUOTE_PRECEDENCE.filter(
    (t) =>
      keptTiers.has(t) &&
      citeAllowed(t) &&
      certifiableForLiveGate(t),
  );

  // Headline / primary: earliest non–Tier-B kept tier; never Apify alone.
  let primaryTier: FreeQuoteTier | null = null;
  for (const t of FREE_QUOTE_PRECEDENCE) {
    if (keptTiers.has(t) && !isTierBOnly(t)) {
      primaryTier = t;
      break;
    }
  }

  const asOfCandidates = [...winners.values()].map((w) =>
    Date.parse(w.contrib.line.quoteAsOf),
  );
  const newest = asOfCandidates.length
    ? Math.max(...asOfCandidates.filter((n) => Number.isFinite(n)))
    : NaN;
  const asOf = Number.isFinite(newest)
    ? new Date(newest).toISOString()
    : new Date(0).toISOString();

  const snapshot: SituationSnapshot = {
    eventId: input.eventId,
    sport: input.sport,
    markets,
    books,
    asOf,
    sourcesUsed,
    citeEligibleSources,
    primaryTier,
    tierBOnly,
    ...(divergenceFlags.length
      ? { divergenceFlags: [...new Set(divergenceFlags)] }
      : {}),
  };

  return snapshot;
}

export type { FreeQuoteTier };
