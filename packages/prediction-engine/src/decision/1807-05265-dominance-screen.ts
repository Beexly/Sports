// ============================================================
// Kelly dominance / redundancy screen (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * (>=10% Calmar-style improvement at unchanged transparency) to pass, plus
 * a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 1807.05265 — "Rebalancing Frequency Considerations for Kelly-Optimal Stock Portfolios in a Control-Theoretic Framework"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: in the Kelly control-theoretic framework a dominated
 * asset (expected ratio E[(1+X_i)/(1+X_j)] <= 1 for all j) receives zero
 * weight in the growth-optimal portfolio; rebalancing only matters when
 * dominance changes, and the paper's bang-bang all-in concentration is the
 * pathology GSE must not copy.
 *
 * IMPROVEMENT (from ledger): Implement a dominance/redundancy screen
 * over each GSE slate, ported from the Kelly-optimal control-theoretic
 * framework: for mutually exclusive or highly correlated picks (spread +
 * moneyline on the same game, correlated props), evaluate the
 * expected-ratio condition E[(1+X_i)/(1+X_j)] <= 1 on the calibrated
 * outcome distribution. If one pick dominates, suppress the dominated
 * picks from the public card (or merge stakes) rather than posting
 * redundant exposure. Do NOT implement literal all-in concentration --
 * cap any single pick at the existing fractional-Kelly ceiling from
 * kelly-investigation.ts; log every dominance trigger with the
 * triggering window and probabilities for audit. Improvement beyond the
 * paper: make dominance time-varying with a regime test -- only suppress
 * when dominance holds in both the trailing window and a structural
 * model (e.g., GSE's team-strength state space), reducing false triggers
 * from noisy windows; hypothesis: dual-confirmation dominance improves
 * the screen's precision.
 *
 * ACCEPTANCE GATE: ADOPT the dominance screen only if it improves realized
 * ROI per unit of max drawdown (Calmar-style) by >= 10% on the held-out
 * season without reducing hit-rate transparency (same number of graded
 * picks or explicit 'suppressed as redundant' labeling). REJECT otherwise.
 */

export interface DominancePick {
  id: string;
  gameId: string;
  kind: string; // e.g. "spread", "moneyline", "prop"
}

export interface DominanceTrigger {
  suppressedId: string;
  dominantId: string;
  expectedRatio: number;
  trailingWindow: string;
  pDominant: number;
  pSuppressed: number;
  structuralConfirmed: boolean;
}

/**
 * Expected-ratio condition on paired outcome scenarios:
 * E[(1+X_i)/(1+X_j)] <= 1 means pick i is dominated by pick j
 * (growth-optimal weight on i is zero).
 */
export function expectedRatioDominated(
  returnsI: number[],
  returnsJ: number[],
): number {
  const n = Math.min(returnsI.length, returnsJ.length);
  if (n === 0) return Infinity;
  let acc = 0;
  let count = 0;
  for (let k = 0; k < n; k++) {
    const denom = 1 + returnsJ[k]!;
    if (denom <= 0) continue; // inadmissible scenario for the ratio test
    acc += (1 + returnsI[k]!) / denom;
    count++;
  }
  return count > 0 ? acc / count : Infinity;
}

export interface DominanceScreenInput {
  picks: DominancePick[];
  /** Paired net-return scenarios per pick id (trailing window). */
  trailingReturns: Record<string, number[]>;
  /** Structural-model win probabilities per pick id (regime confirmation). */
  structuralProbs: Record<string, number>;
  trailingWindow: string;
  /** Fractional-Kelly ceiling per pick (from kelly-investigation.ts); never all-in. */
  fractionalKellyCeiling: number;
}

export interface DominanceScreenResult {
  posted: DominancePick[];
  suppressed: DominancePick[];
  triggers: DominanceTrigger[];
}

/**
 * Redundancy screen: for mutually exclusive / highly correlated picks
 * (same gameId), suppress pick i when the expected-ratio condition says it
 * is dominated by pick j in BOTH the trailing window and the structural
 * model (dual confirmation). Suppressed picks are returned with explicit
 * 'suppressed as redundant' labeling for transparency.
 */
export function dominanceScreen(input: DominanceScreenInput): DominanceScreenResult {
  const { picks, trailingReturns, structuralProbs, trailingWindow } = input;
  const suppressedIds = new Set<string>();
  const triggers: DominanceTrigger[] = [];
  const byGame = new Map<string, DominancePick[]>();
  for (const p of picks) {
    const arr = byGame.get(p.gameId) ?? [];
    arr.push(p);
    byGame.set(p.gameId, arr);
  }
  for (const group of byGame.values()) {
    for (let a = 0; a < group.length; a++) {
      for (let b = 0; b < group.length; b++) {
        if (a === b) continue;
        const pa = group[a]!;
        const pb = group[b]!;
        if (suppressedIds.has(pa.id)) continue;
        const ra = trailingReturns[pa.id] ?? [];
        const rb = trailingReturns[pb.id] ?? [];
        const ratio = expectedRatioDominated(ra, rb);
        const structuralConfirmed =
          (structuralProbs[pb.id] ?? 0) >= (structuralProbs[pa.id] ?? 0);
        if (ratio <= 1 && structuralConfirmed) {
          suppressedIds.add(pa.id);
          triggers.push({
            suppressedId: pa.id,
            dominantId: pb.id,
            expectedRatio: ratio,
            trailingWindow,
            pDominant: structuralProbs[pb.id] ?? 0,
            pSuppressed: structuralProbs[pa.id] ?? 0,
            structuralConfirmed,
          });
        }
      }
    }
  }
  return {
    posted: picks.filter((p) => !suppressedIds.has(p.id)),
    suppressed: picks.filter((p) => suppressedIds.has(p.id)),
    triggers,
  };
}

/**
 * Post-screen stake cap: no single pick may exceed the fractional-Kelly
 * ceiling (anti all-in guardrail — the paper's bang-bang concentration is
 * explicitly NOT implemented).
 */
export function capAtFractionalCeiling(stake: number, ceiling: number): number {
  return Math.min(Math.max(stake, 0), Math.max(ceiling, 0));
}

/** Gate helper: Calmar-style ROI/drawdown improves >= 10% at unchanged transparency. */
export function dominanceGatePasses(
  candidateCalmar: number,
  baselineCalmar: number,
  gradedPickCountEqual: boolean,
): boolean {
  return candidateCalmar >= 1.1 * baselineCalmar && gradedPickCountEqual;
}
