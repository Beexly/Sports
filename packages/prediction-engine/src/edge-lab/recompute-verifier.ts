/**
 * The open recompute verifier (handoff §2 P2) — the logic behind
 * `scripts/edge-lab/recompute.ts`, the checked-in script ANYONE (or any AI
 * agent) can run to reproduce every CLV figure the Glass Ledger posts.
 * This is what makes "audited" literally true rather than self-attested.
 *
 * Verifies, from a ledger export alone:
 *   1. CHAIN INTEGRITY — every entry hash recomputed, every linkage checked
 *      (any edit to any historical entry breaks the chain visibly).
 *   2. PUBLISH-BEFORE-KICKOFF — every pick's decisionAt strictly precedes
 *      its kickoffAt (re-verified here independently of the append-time
 *      enforcement; belt and suspenders).
 *   3. CLV REPRODUCTION — every settlement's clvBps recomputed from the
 *      recorded decision and closing prices; must match within rounding
 *      (0.5 bps). Aggregates (mean CLV, per-season) recomputed from the
 *      raw entries, never trusted from any summary.
 *
 * Pure — no I/O. The CLI wraps it; an external verifier can port this file
 * to any language from its doc comments alone.
 */

import {
  computeClvBps,
  isSettlement,
  verifyChain,
  type LedgerEntry,
  type LedgerPickEntry,
} from "./ledger-chain.js";

export interface ClvDiscrepancy {
  readonly seq: number;
  readonly pickId: string;
  readonly recordedBps: number;
  readonly recomputedBps: number;
  readonly deltaBps: number;
}

export interface RecomputeReport {
  readonly chainValid: boolean;
  readonly chainBrokenAt: number | null;
  readonly picks: number;
  readonly settlements: number;
  /** Picks whose decision time does NOT precede kickoff (must be empty). */
  readonly kickoffViolations: readonly { seq: number; pickId: string }[];
  /** Settlements whose recorded CLV could not be reproduced within 0.5 bps. */
  readonly clvDiscrepancies: readonly ClvDiscrepancy[];
  /** Recomputed (never copied) aggregate: mean CLV bps over settled, graded plays. */
  readonly recomputedMeanClvBps: number | null;
  readonly gradedSettlements: number;
  readonly reproduced: boolean;
}

const CLV_TOLERANCE_BPS = 0.5;

export function recomputeLedger(entries: readonly LedgerEntry[]): RecomputeReport {
  const chain = verifyChain(entries);

  const picks = entries.filter((e): e is LedgerPickEntry => !isSettlement(e));
  const settlements = entries.filter(isSettlement);
  const pickById = new Map(picks.map((p) => [p.pickId, p]));

  const kickoffViolations = picks
    .filter((p) => !(Date.parse(p.decisionAt) < Date.parse(p.kickoffAt)))
    .map((p) => ({ seq: p.seq, pickId: p.pickId }));

  const clvDiscrepancies: ClvDiscrepancy[] = [];
  const gradedBps: number[] = [];
  for (const s of settlements) {
    if (s.clvBps === null || s.closingPriceDecimal === null) continue;
    const pick = pickById.get(s.pickId);
    if (!pick) {
      clvDiscrepancies.push({
        seq: s.seq,
        pickId: s.pickId,
        recordedBps: s.clvBps,
        recomputedBps: Number.NaN,
        deltaBps: Number.NaN,
      });
      continue;
    }
    const recomputed = computeClvBps(pick.priceDecimal, s.closingPriceDecimal);
    const delta = Math.abs(recomputed - s.clvBps);
    if (!(delta <= CLV_TOLERANCE_BPS)) {
      clvDiscrepancies.push({
        seq: s.seq,
        pickId: s.pickId,
        recordedBps: s.clvBps,
        recomputedBps: recomputed,
        deltaBps: delta,
      });
    }
    gradedBps.push(recomputed);
  }

  const recomputedMeanClvBps =
    gradedBps.length > 0 ? gradedBps.reduce((a, b) => a + b, 0) / gradedBps.length : null;

  return {
    chainValid: chain.valid,
    chainBrokenAt: chain.valid ? null : (chain.brokenAt ?? -1),
    picks: picks.length,
    settlements: settlements.length,
    kickoffViolations,
    clvDiscrepancies,
    recomputedMeanClvBps,
    gradedSettlements: gradedBps.length,
    reproduced:
      chain.valid && kickoffViolations.length === 0 && clvDiscrepancies.length === 0,
  };
}
