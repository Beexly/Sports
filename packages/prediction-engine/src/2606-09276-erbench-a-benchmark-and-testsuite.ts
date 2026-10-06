/**
 * arXiv:2606.09276 — ERBench: A Benchmark and Testsuite for Equation Discovery Algorithms
 *
 * ERBench 200-formula panel as the mandatory regression test for GSE's symbolic-regression pipeline:
 * Symbolic Recovery / Jaccard / TED scores plus failure-boundary diagnostic sweeps (complexity, noise,
 * sample size, domain); no SR config ships without beating the previous panel Recovery/JI.
 *
 * Improvement: Make the ERBench 200-formula panel the mandatory regression test for GSE's symbolic-regression pipeline: run the sports-config PySR on all 200 formulas, score Symbolic Recovery/JI/TED plus failure-boundary diagnostic sweeps (recovery vs complexity, noise 0-5%, sample size, domain); no SR config ships to the engine without beating the previous Recovery/JI — and build a SportsEq dev set (~100 known sports formulas: Elo, Glicko-2, TrueSkill, Pythagorean, Kelly, Dixon-Coles).
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if: GSE's current sports-config PySR scores Recovery < 0.40 on the 200-formula panel AND the diagnostic sweeps identify at least one concrete failure axis that a ledger 2166–2172 upgrade is designed to fix.
 */

/** One panel formula's recovery result. */
export interface PanelResult {
  formulaId: string;
  /** Exact symbolic recovery (1) or not (0). */
  recovered: boolean;
  /** Jaccard index over operator/terminal sets. */
  jaccard: number;
  /** Tree-edit distance (normalized 0..1, lower = closer). */
  ted: number;
}

/** Panel aggregates: Recovery rate, mean JI, mean TED. */
export function panelScores(results: readonly PanelResult[]): { recovery: number; jaccard: number; ted: number } {
  if (results.length === 0) throw new Error("panelScores: no results");
  const n = results.length;
  return {
    recovery: results.filter((r) => r.recovered).length / n,
    jaccard: results.reduce((s, r) => s + r.jaccard, 0) / n,
    ted: results.reduce((s, r) => s + r.ted, 0) / n,
  };
}

/**
 * Regression gate: a new SR config ships only if it beats the previous
 * config on Recovery AND Jaccard (no regression on either).
 */
export function panelRegressionGate(
  prev: { recovery: number; jaccard: number },
  next: { recovery: number; jaccard: number },
): boolean {
  return next.recovery > prev.recovery && next.jaccard >= prev.jaccard;
}

/** Failure-boundary sweep: recovery rate within one sweep cell. */
export function sweepCellRecovery(
  results: readonly PanelResult[],
  predicate: (r: PanelResult) => boolean,
): number {
  const sub = results.filter(predicate);
  if (sub.length === 0) return NaN;
  return sub.filter((r) => r.recovered).length / sub.length;
}
