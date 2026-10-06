import type { FactorBreakdown, IndependentEdgeSummary, PublicPick } from "../api/contracts";

/**
 * The trust predicates — the rules that decide what this app is allowed to show.
 *
 * These are not UI helpers. Each one is a port of a server-side gate that exists
 * because a real defect shipped, and each port is DEFENSIVE: it can only remove
 * a row the server already sent, never add one. The server remains the enforcer;
 * this is the second lock on the same door, and it is here because a native
 * client caches, and a cached row outlives the process that gated it.
 *
 * Every function documents the upstream file it mirrors and the measured
 * incident that produced it. Where the upstream rule is stated as a predicate
 * (`pricesWorseThanMarket`), the port reproduces the SAME asymmetry: absence is
 * silence, and silence keeps the row.
 */

/* ══════════════════════════════════════════════════════════════════════════
   STALE PICK POLICY
   Mirrors: apps/web/lib/board/stale-pick-policy.ts
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A published PENDING pick is refreshed in place by the pipeline on every odds
 * run. "Still refreshed" is read from `dataFreshnessAt`, with `generatedAt` only
 * as the fallback for rows that predate the freshness stamp.
 *
 * The upstream comment records the incident: 18 picks from model v5.0.0 written
 * 2026-05-22 to 06-04, last refreshed 2026-06-16, still sitting on NFL/NCAAF
 * games kicking off in September and November — while 317 live v5.2.7 picks
 * created in May were refreshed that same day. The app surfaces the same
 * 14-day window so a stale line can never render as an actionable one.
 */
export const STALE_PENDING_PICK_MAX_AGE_DAYS = 14;

export function stalePickCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - STALE_PENDING_PICK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
}

/** The timestamp the freshness rule reads: refresh time, then creation time. */
export function effectiveFreshnessAt(pick: {
  dataFreshnessAt: string | null;
  generatedAt: string;
}): string {
  return pick.dataFreshnessAt ?? pick.generatedAt;
}

export function isStalePendingPick(
  pick: { result: string; dataFreshnessAt: string | null; generatedAt: string },
  now: Date = new Date(),
): boolean {
  if (pick.result !== "PENDING") return false;
  const at = new Date(effectiveFreshnessAt(pick));
  if (Number.isNaN(at.getTime())) return false; // unparseable is silence → keep
  return at.getTime() < stalePickCutoff(now).getTime();
}

/* ══════════════════════════════════════════════════════════════════════════
   ADVERSE EDGE SUPPRESSION
   Mirrors: apps/web/lib/picks/adverse-edge-suppression.ts
            packages/types  →  pricesWorseThanMarket()
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Never show a customer a bet the model itself prices worse than the book.
 *
 * Measured on production 2026-09-13T20:20Z over published PENDING rows carrying
 * an edge estimate: 71 rows, 9 with `expectedClv < 0`, and all 9 of those also
 * carried `independentEdge.decision = "PASS"` — worst −0.1742. The mint-time
 * gate is forward-only and cannot reach rows already written, so the display
 * surface carries the rule too.
 *
 * Four properties that must survive every future edit, all of them ported:
 *
 *   1. Gate on the SIGNED NUMBER, never on `decision === "PASS"`. The two select
 *      the same nine rows today, but a CONTRADICTS row carries `expectedClv` 0.0
 *      by construction, so the label would drop rows that are not adverse. "The
 *      signed number is the claim; the label is a summary of it."
 *   2. ABSENCE IS SILENCE. No estimate, a non-finite value, or an unparseable
 *      breakdown all KEEP the row. If that asymmetry ever inverts, a parse bug
 *      becomes a silent board wipe. There is a negative-control test pinning it.
 *   3. EXACTLY ZERO IS KEPT. Zero is "no edge either way", not "adverse".
 *   4. It reorders nothing and re-scores nothing. The surviving set is a subset.
 */
export function pricesWorseThanMarket(edge: IndependentEdgeSummary | null | undefined): boolean {
  if (!edge) return false; // absence is silence
  const clv = edge.expectedClv;
  if (typeof clv !== "number" || !Number.isFinite(clv)) return false; // silence
  return clv < 0;
}

/**
 * Pull the edge summary out of a stored factor breakdown without trusting its
 * shape. Prisma stores the breakdown as JSON and the server has a dedicated
 * `parseFactorBreakdown` because it sometimes arrives as a string; the same
 * tolerance applies here.
 *
 * A malformed or legacy blob yields null → silence → the row is kept.
 */
export function extractIndependentEdge(
  factorBreakdown: unknown,
): IndependentEdgeSummary | null {
  const parsed = normaliseBreakdown(factorBreakdown);
  if (!parsed) return null;
  const edge = parsed.independentEdge;
  if (!edge || typeof edge !== "object") return null;
  return edge as IndependentEdgeSummary;
}

/** Accept an object, a JSON string, or nothing. Never throw. */
export function normaliseBreakdown(value: unknown): FactorBreakdown | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as FactorBreakdown;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as FactorBreakdown)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** The row-level predicate, matching the server's own wrapper. */
export function isAdverseEdgeRow(pick: { factorBreakdown?: unknown }): boolean {
  return pricesWorseThanMarket(extractIndependentEdge(pick.factorBreakdown));
}

/* ══════════════════════════════════════════════════════════════════════════
   BOARD-SAFETY COMPOSITION
   ══════════════════════════════════════════════════════════════════════════ */

export interface SuppressionReport {
  rows: PublicPick[];
  suppressedAdverse: number;
  suppressedStale: number;
  /** True when the incoming set was non-empty and everything was suppressed. */
  emptiedBoard: boolean;
}

/**
 * Apply the display invariants to a pick set.
 *
 * Order matters and mirrors the server: adverse-edge first (it is a correctness
 * rule about the bet), then staleness (it is a liveness rule about the data).
 *
 * A board that empties out is NOT an error here. It is a legitimate, expected
 * outcome — "Most days, fewer than five picks. Thin slate? We post less.
 * Sometimes nothing." — and the caller renders the honest empty state. The
 * `emptiedBoard` flag exists so a screen can tell the difference between
 * "nothing published today" and "everything we published was withheld", which
 * are different sentences to a customer.
 */
export function applyBoardSafety(picks: PublicPick[], now: Date = new Date()): SuppressionReport {
  let suppressedAdverse = 0;
  let suppressedStale = 0;

  const rows = picks.filter((pick) => {
    if (isAdverseEdgeRow(pick)) {
      suppressedAdverse += 1;
      return false;
    }
    if (isStalePendingPick(pick, now)) {
      suppressedStale += 1;
      return false;
    }
    return true;
  });

  return {
    rows,
    suppressedAdverse,
    suppressedStale,
    emptiedBoard: picks.length > 0 && rows.length === 0,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   RANKING
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Rank a board WITHOUT ever sorting on `confidence` alone.
 *
 * AGENTS.md, 2026-09-13: "Rank public boards on `expectedClv` / `trueProb` vs
 * `marketFairProb`, never on `confidence` alone, until the composite is refit
 * under a real MODEL_VERSION bump." The measured inversion that day: the
 * top-ranked pick on the board (confidence 91) carried the SMALLEST positive
 * edge on the board (+0.0217) while the largest edge (+0.2257) sat at 85 —
 * because `consensusScore` + `marketDepthScore` are constants for any 11-book
 * MLB run line, so 50 of the 100 points are fixed before the engine looks at
 * the game.
 *
 * Sort key, in strict order:
 *   1. `expectedClv` when present (the engine's own honest edge) — desc
 *   2. `trueProb − marketFairProb` when both finite — desc
 *   3. `edgeScore` (the public, always-visible trust signal) — desc
 *   4. `generatedAt` — desc, so the newest mint breaks ties deterministically
 *
 * `confidence` is deliberately NOT in this chain. If a future field is added
 * here, it must not be confidence.
 */
export function rankingKey(pick: PublicPick): [number, number, number, number] {
  const edge = extractIndependentEdge(pick.factorBreakdown);
  const clv =
    edge && Number.isFinite(edge.expectedClv) ? edge.expectedClv : Number.NEGATIVE_INFINITY;

  let diff = Number.NEGATIVE_INFINITY;
  if (edge && typeof edge.trueProb === "number" && Number.isFinite(edge.trueProb)) {
    const fair =
      typeof edge.marketFairProb === "number" && Number.isFinite(edge.marketFairProb)
        ? edge.marketFairProb
        : pick.winProbability?.value;
    if (typeof fair === "number" && Number.isFinite(fair)) diff = edge.trueProb - fair;
  }

  const edgeScore =
    typeof pick.edgeScore === "number" && Number.isFinite(pick.edgeScore)
      ? pick.edgeScore
      : Number.NEGATIVE_INFINITY;
  const minted = new Date(pick.generatedAt).getTime();
  return [clv, diff, edgeScore, Number.isNaN(minted) ? 0 : minted];
}

export function compareByRanking(a: PublicPick, b: PublicPick): number {
  const ka = rankingKey(a);
  const kb = rankingKey(b);
  for (let i = 0; i < ka.length; i += 1) {
    const av = ka[i] ?? 0;
    const bv = kb[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Whether a row is priced by a real book at all.
 *
 * A signal-slate row (bookmakerCount 0) has no book behind it. The server marks
 * it with `hasBookPrice: false` and the card renders "No book price attached"
 * in the line slot — a row's teaser already says as much. This helper exists so
 * that statement is made in exactly one place.
 */
export function hasRealBookPrice(pick: {
  hasBookPrice?: boolean;
  winProbability?: { books: number } | null;
}): boolean {
  if (pick.hasBookPrice === false) return false;
  if (pick.hasBookPrice === true) return true;
  const books = pick.winProbability?.books;
  return typeof books === "number" && books >= 2;
}
