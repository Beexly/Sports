/**
 * SituationSnapshot — book market-state bundle from FREE quote ladder.
 *
 * Pure merge: earlier FREE_QUOTE_PRECEDENCE tier always keeps the line on
 * conflict; later tiers fill gaps only. A substantially fresher later tier
 * only emits a `stale_higher_tier` divergence flag (no overwrite). Apify
 * never alone sets headline consensus. Does not invent live HTTP providers —
 * accepts already-fetched contributions labeled with freeTier metadata.
 *
 * Hard wall: freeTier label alone is not trusted. Contributions whose line
 * has non-book provenance (model_prior / synthetic_demo / prediction_market /
 * market===model / research_only / internal_synthetic) are rejected and never
 * enter winners/sourcesUsed.
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
  /**
   * Tiers that supplied a kept line AND citeAllowed(t).
   * NOT gated by certifiableForLiveGate — OddsPapi may appear here.
   */
  readonly citeEligibleSources: readonly FreeQuoteTier[];
  /**
   * Tiers that supplied a kept line AND certifiableForLiveGate(t).
   * OddsPapi / parlay / Apify never appear here.
   */
  readonly liveGateEligibleSources: readonly FreeQuoteTier[];
  readonly primaryTier: FreeQuoteTier | null;
  readonly tierBOnly: boolean;
  readonly divergenceFlags?: readonly string[];
}

export interface BuildSituationSnapshotInput {
  readonly eventId: string;
  readonly sport: string;
  readonly contributions: readonly FreeQuoteContribution[];
  /**
   * Age skew (ms) used only to decide when a disagreeing later tier is
   * "substantially fresher" than the kept earlier-tier line. When that
   * happens we emit `stale_higher_tier` — we never overwrite the earlier
   * winner. Default 5 minutes. Earlier tier always keeps the line on conflict.
   */
  readonly freshnessWindowMs?: number;
}

const NON_BOOK_SOURCE_KINDS = new Set<QuoteLine["sourceKind"]>([
  "model_prior",
  "synthetic_demo",
  "prediction_market",
]);

const NON_BOOK_RIGHTS = new Set<QuoteLine["rights"]>([
  "research_only",
  "internal_synthetic",
]);

/**
 * Hard wall: true only when the QuoteLine itself looks like book market-state.
 * freeTier label alone is not trusted — callers may mislabel model/PM lines.
 */
export function isBookMarketStateLine(line: QuoteLine): boolean {
  if (NON_BOOK_SOURCE_KINDS.has(line.sourceKind)) return false;
  if (line.market === "model") return false;
  if (NON_BOOK_RIGHTS.has(line.rights)) return false;
  return true;
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

function rejectReason(line: QuoteLine): string | null {
  if (NON_BOOK_SOURCE_KINDS.has(line.sourceKind)) {
    return `sourceKind=${line.sourceKind}`;
  }
  if (line.market === "model") {
    return "market=model";
  }
  if (NON_BOOK_RIGHTS.has(line.rights)) {
    return `rights=${line.rights}`;
  }
  return null;
}

/**
 * Merge free-ladder contributions into a SituationSnapshot.
 *
 * Policy:
 * 1. Hard-wall reject non-book lines (model/PM/synthetic) regardless of freeTier.
 * 2. Sort remaining by FREE_QUOTE_PRECEDENCE (ascending index).
 * 3. For each book|market|selection: earlier tier always keeps the line;
 *    later tiers fill gaps only. Substantially fresher later tier →
 *    `stale_higher_tier` flag, still no overwrite.
 * 4. If only Tier-B (Apify) contributions remain → tierBOnly=true and
 *    citeEligibleSources / liveGateEligibleSources empty of Tier-A.
 * 5. citeEligibleSources = kept ∩ citeAllowed (OddsPapi ok; parlay/Apify out).
 * 6. liveGateEligibleSources = kept ∩ certifiableForLiveGate
 *    (OddsPapi / parlay / Apify out).
 */
export function buildSituationSnapshotFromQuotes(
  input: BuildSituationSnapshotInput,
): SituationSnapshot {
  const freshnessWindowMs = input.freshnessWindowMs ?? 5 * 60 * 1000;
  const divergenceFlags: string[] = [];

  const scoped = input.contributions.filter(
    (c) =>
      c.line.eventId === input.eventId &&
      isFreeQuoteTier(c.freeTier) &&
      (FREE_QUOTE_PRECEDENCE as readonly string[]).includes(c.freeTier),
  );

  const bookScoped: FreeQuoteContribution[] = [];
  for (const c of scoped) {
    const reason = rejectReason(c.line);
    if (reason !== null) {
      divergenceFlags.push(
        `rejected_non_book:${c.freeTier}:${c.line.sourceId}:${reason}`,
      );
      continue;
    }
    bookScoped.push(c);
  }

  const ordered = [...bookScoped].sort(
    (a, b) =>
      tierIndex(a.freeTier) - tierIndex(b.freeTier) ||
      Date.parse(b.line.quoteAsOf) - Date.parse(a.line.quoteAsOf),
  );

  /** Winning contribution per book|market|selection. */
  const winners = new Map<
    string,
    { contrib: FreeQuoteContribution; bookId: string }
  >();
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
    // Earlier tier always keeps the line on conflict (no overwrite).
    const kept = existing.contrib;
    const keptTs = Date.parse(kept.line.quoteAsOf);
    const candTs = Date.parse(c.line.quoteAsOf);

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
        // Higher tier kept despite substantially fresher lower tier — flag only.
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

  // Cite-eligible: kept line AND citeAllowed — NOT gated by live-gate.
  // OddsPapi (citeAllowed=true, certifiableForLiveGate=false) may appear here.
  const citeEligibleSources = FREE_QUOTE_PRECEDENCE.filter(
    (t) => keptTiers.has(t) && citeAllowed(t),
  );

  // Live-gate-eligible: kept line AND certifiableForLiveGate.
  // OddsPapi / parlay / Apify never appear here.
  const liveGateEligibleSources = FREE_QUOTE_PRECEDENCE.filter(
    (t) => keptTiers.has(t) && certifiableForLiveGate(t),
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
    liveGateEligibleSources,
    primaryTier,
    tierBOnly,
    ...(divergenceFlags.length
      ? { divergenceFlags: [...new Set(divergenceFlags)] }
      : {}),
  };

  return snapshot;
}

export type { FreeQuoteTier };
