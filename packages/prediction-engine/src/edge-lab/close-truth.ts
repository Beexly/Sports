/**
 * CL4 · close-truth — de-vigged prop close + per-book opener from archive rows.
 *
 * Doctrine C6.2 (docs/data/CARDS_CLOSING_LINE.md §CL4): the forecaster's GROUND
 * TRUTH (q of the realized close) and the opener-attack map's opener quotes —
 * pure functions over ArchiveRow[] (local interface, embedded below).
 * Imports: americanToDecimal from ./game-row.js, shinDevig from ./devig.js.
 * Nothing else. Pure, deterministic, no I/O.
 *
 * Invariants (I1–I9):
 *  - priced: false (I1) — every output carries `priced: false`
 *  - fail-closed refusal enum, never fabricate (I2)
 *  - outputs layer MARKET_PROP, q-side timing/execution only, never independent p (I3)
 *  - no live p without masterplan §6 (I4) — this deck ships glass-box research modules only
 *  - no MODEL_VERSION (I5)
 *  - forbidden zones per I6 — this file lives in edge-lab/ (allowed read side)
 *  - no key/feature emission (I7 — trivially holds; we emit quote shapes, not feature keys)
 *  - strict TS, no any, ESM .js extensions (I8/I9)
 */

import { americanToDecimal } from "./game-row.js";
import { shinDevig } from "./devig.js";

/** Mirror of the local ArchiveRow interface from CL deck spec. */
export interface ArchiveRow {
  readonly gameId: string;
  readonly capturedAt: string; // ISO UTC — OUR poll time
  readonly phase: "OPEN" | "INTERIM" | "CLOSE";
  readonly book: string;
  readonly market: string; // props: "<oddsApiKey>|<playerSlug>"
  readonly side: string; // "over" | "under" | "home" | "away" | "draw"
  readonly price: number; // AMERICAN odds
  readonly line: number | null; // prop/spread/total point; null for ML
  readonly source: string; // "the-odds-api" | "the-odds-api-eu"
}

export type CloseSource = "phase_close" | "latest_pre_kickoff";

export interface PropQuoteTruth {
  readonly gameId: string;
  readonly market: string;
  readonly book: string;
  readonly family: string; // oddsApiKey (left half of market)
  readonly playerSlug: string; // right half of market
  readonly capturedAt: string;
  readonly line: number;
  readonly qOver: number; // Shin de-vigged probability of over, in (0,1)
  readonly shinZ: number; // fitted insider fraction z
  readonly overround: number; // 1/decOver + 1/decUnder
  readonly source: CloseSource | "earliest_row"; // openers use "earliest_row"
  readonly priced: false;
  readonly layer: "MARKET_PROP";
}

export type QuoteRefuse =
  | "no_rows"
  | "not_a_prop_market"
  | "one_sided"
  | "cycle_mismatch"
  | "rung_mismatch"
  | "bad_price"
  | "subvig_or_invalid"
  | "after_kickoff_only";

export interface QuoteRefusal {
  readonly market: string;
  readonly book: string;
  readonly refuse: QuoteRefuse;
}

const PAIR_TOLERANCE_MS_DEFAULT = 20 * 60_000;

/**
 * Decode a prop market string: must contain exactly one "|" with non-empty halves.
 * family = left half (oddsApiKey), playerSlug = right half.
 * Returns null when there is no "|"" (non-prop market — skip silently) or
 * when the "|" structure is malformed (exactly the not-a-prop-market refusal case).
 */
function decodePropMarket(market: string): { family: string; playerSlug: string } | null {
  const parts = market.split("|");
  if (parts.length !== 2) return null;
  const family = parts[0];
  const playerSlug = parts[1];
  if (!family || !playerSlug) return null;
  return { family, playerSlug };
}

/**
 * Is this a prop market? A prop market contains a "|" delimiter.
 * Markets with NO "|" (SPREAD, MONEYLINE, TOTAL) are non-prop — skipped silently.
 * Markets WITH "|" but malformed (e.g. "a||b", "a|b|c", "|slug") are prop-shaped
 * but invalid — the caller refuses them as not_a_prop_market.
 */
function hasPropDelimiter(market: string): boolean {
  return market.includes("|");
}

function parseIsoOrThrow(iso: string, label: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new RangeError(`close-truth: ${label} is not a valid ISO instant: ${iso}`);
  }
  return ms;
}

/**
 * For closeTruthForGame: prefer the CLOSE-phase row; fall back to the latest
 * pre-kickoff row (INTERIM or OPEN). Returns null if no pre-kickoff row exists.
 */
function pickCloseRow(rows: readonly ArchiveRow[], commenceMs: number): ArchiveRow | null {
  let fallback: ArchiveRow | null = null;
  let fallbackMs = -1;
  let closeRow: ArchiveRow | null = null;

  for (const r of rows) {
    const ms = parseIsoOrThrow(r.capturedAt, "capturedAt");
    if (ms > commenceMs) continue; // after kickoff — skip
    if (r.phase === "CLOSE" && closeRow === null) {
      closeRow = r;
    }
    if (ms > fallbackMs) {
      fallbackMs = ms;
      fallback = r;
    }
  }

  return closeRow ?? fallback;
}

/**
 * For openerTruthForGame: take the earliest row (by capturedAt), regardless of phase.
 */
function pickEarliestRow(rows: readonly ArchiveRow[]): ArchiveRow | null {
  if (rows.length === 0) return null;
  let best: ArchiveRow | null = null;
  let bestMs = Infinity;
  for (const r of rows) {
    const ms = parseIsoOrThrow(r.capturedAt, "capturedAt");
    if (ms < bestMs) {
      bestMs = ms;
      best = r;
    }
  }
  return best;
}

interface BuildResult {
  truths: PropQuoteTruth[];
  refusals: QuoteRefusal[];
}

/**
 * Build truths and refusals for all prop markets in one game's rows.
 * `isCloser` selects the row-picking strategy (CLOSE-phase preference vs earliest).
 */
function buildTruths(
  rows: readonly ArchiveRow[],
  gameId: string,
  commenceTime: string,
  pairToleranceMs: number,
  isCloser: boolean,
): BuildResult {
  const commenceMs = parseIsoOrThrow(commenceTime, "commenceTime");

  // Track all (market, book) pairs that had rows, so we can detect
  // after_kickoff_only markets (rows exist but all post-kickoff).
  const allMarketBooks = new Set<string>();

  // Group rows by (market, book, side), filtering out post-kickoff rows.
  const groups = new Map<string, ArchiveRow[]>();
  for (const r of rows) {
    // Track every (market, book) pair that had ANY row.
    allMarketBooks.add(`${r.market}::${r.book}`);

    const ms = parseIsoOrThrow(r.capturedAt, "capturedAt");
    if (ms > commenceMs) continue; // after kickoff — skip for truth selection

    const key = `${r.market}::${r.book}::${r.side}`;
    const existing = groups.get(key);
    if (existing) existing.push(r);
    else groups.set(key, [r]);
  }

  // Detect markets where ALL rows were post-kickoff (or sides had no pre-kickoff rows).
  const postKickoffOnly: string[] = [];
  for (const mbKey of allMarketBooks) {
    const [market, book] = mbKey.split("::");
    if (market === undefined || book === undefined) continue;
    if (!hasPropDelimiter(market)) continue; // skip non-prop silently
    const overKey = `${market}::${book}::over`;
    const underKey = `${market}::${book}::under`;
    if (!groups.has(overKey) && !groups.has(underKey)) {
      postKickoffOnly.push(mbKey);
    }
  }

  // Pair over/under sides per (market, book).
  const marketBooks = new Map<string, { over: ArchiveRow[]; under: ArchiveRow[] }>();
  for (const [key, sideRows] of groups) {
    const [market, book, side] = key.split("::");
    if (market === undefined || book === undefined || side === undefined) continue;
    const mbKey = `${market}::${book}`;
    const entry = marketBooks.get(mbKey);
    if (entry) {
      if (side === "over") entry.over.push(...sideRows);
      else if (side === "under") entry.under.push(...sideRows);
    } else {
      marketBooks.set(mbKey, {
        over: side === "over" ? [...sideRows] : [],
        under: side === "under" ? [...sideRows] : [],
      });
    }
  }

  const truths: PropQuoteTruth[] = [];
  const refusals: QuoteRefusal[] = [];

  for (const [mbKey, sides] of marketBooks) {
    const [market, book] = mbKey.split("::");
    if (market === undefined || book === undefined) continue;

    // Non-prop markets (no "|") are skipped silently (deck scope).
    if (!hasPropDelimiter(market)) continue;

    const decoded = decodePropMarket(market);
    if (!decoded) {
      refusals.push({ market, book, refuse: "not_a_prop_market" });
      continue;
    }

    // Step 3: pick the best row per side.
    const bestOver = isCloser ? pickCloseRow(sides.over, commenceMs) : pickEarliestRow(sides.over);
    const bestUnder = isCloser ? pickCloseRow(sides.under, commenceMs) : pickEarliestRow(sides.under);

    if (!bestOver || !bestUnder) {
      refusals.push({ market, book, refuse: "one_sided" });
      continue;
    }

    // Step 4: cycle mismatch — the two sides' capturedAt must differ by <= pairToleranceMs.
    const overMs = parseIsoOrThrow(bestOver.capturedAt, "capturedAt");
    const underMs = parseIsoOrThrow(bestUnder.capturedAt, "capturedAt");
    if (Math.abs(overMs - underMs) > pairToleranceMs) {
      refusals.push({ market, book, refuse: "cycle_mismatch" });
      continue;
    }

    // Step 5: rung must match (line equality).
    if (bestOver.line !== bestUnder.line) {
      refusals.push({ market, book, refuse: "rung_mismatch" });
      continue;
    }

    // Step 6: American -> decimal -> Shin devig.
    const decOver = americanToDecimal(bestOver.price);
    const decUnder = americanToDecimal(bestUnder.price);
    if (decOver === null || decUnder === null) {
      refusals.push({ market, book, refuse: "bad_price" });
      continue;
    }

    const devigged = shinDevig([decOver, decUnder]);
    if (devigged === null) {
      refusals.push({ market, book, refuse: "subvig_or_invalid" });
      continue;
    }

    const overround = 1 / decOver + 1 / decUnder;
    const sourceKind = isCloser
      ? bestOver.phase === "CLOSE" && bestUnder.phase === "CLOSE"
        ? ("phase_close" as const)
        : ("latest_pre_kickoff" as const)
      : ("earliest_row" as const);

    truths.push({
      gameId,
      market,
      book,
      family: decoded.family,
      playerSlug: decoded.playerSlug,
      capturedAt: bestOver.capturedAt,
      line: bestOver.line ?? 0,
      qOver: devigged.probs[0]!,
      shinZ: devigged.z,
      overround,
      source: sourceKind,
      priced: false,
      layer: "MARKET_PROP",
    });
  }

  // after_kickoff_only: markets that had rows but all were post-kickoff.
  for (const mbKey of postKickoffOnly) {
    const [market, book] = mbKey.split("::");
    if (market === undefined || book === undefined) continue;
    refusals.push({ market, book, refuse: "after_kickoff_only" });
  }

  return { truths, refusals };
}

/**
 * Compute the de-vigged close truth for a game's prop rows.
 *
 * `commenceTime` is the game's kickoff (ISO UTC). Only rows with capturedAt
 * <= commenceTime are eligible for truth selection.
 */
export function closeTruthForGame(args: {
  rows: readonly ArchiveRow[];
  gameId: string;
  commenceTime: string;
  pairToleranceMs?: number;
}): { ok: true; truths: readonly PropQuoteTruth[]; refusals: readonly QuoteRefusal[] } | { ok: false; refuse: "no_rows" } {
  if (args.rows.length === 0) {
    return { ok: false, refuse: "no_rows" };
  }

  const pairTolerance = args.pairToleranceMs ?? PAIR_TOLERANCE_MS_DEFAULT;
  const { truths, refusals } = buildTruths(
    args.rows,
    args.gameId,
    args.commenceTime,
    pairTolerance,
    true, // isCloser = true
  );

  return { ok: true, truths, refusals };
}

/**
 * Compute per-book openers for a game. Identical pairing/devig logic to
 * closeTruthForGame, but per side takes the EARLIEST row (not earliest CLOSE).
 */
export function openerTruthForGame(args: {
  rows: readonly ArchiveRow[];
  gameId: string;
  commenceTime: string;
  pairToleranceMs?: number;
}): { ok: true; truths: readonly PropQuoteTruth[]; refusals: readonly QuoteRefusal[] } | { ok: false; refuse: "no_rows" } {
  if (args.rows.length === 0) {
    return { ok: false, refuse: "no_rows" };
  }

  const pairTolerance = args.pairToleranceMs ?? PAIR_TOLERANCE_MS_DEFAULT;
  const { truths, refusals } = buildTruths(
    args.rows,
    args.gameId,
    args.commenceTime,
    pairTolerance,
    false, // isCloser = false → use earliest rows
  );

  return { ok: true, truths, refusals };
}
