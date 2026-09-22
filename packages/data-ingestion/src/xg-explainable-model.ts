/**
 * Explainable expected goal models for performance analysis in football analytics
 *
 * arXiv:2206.07212v2 · lane:props_dfs · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build an 'AP what-if' layer over GSE's existing expected-metric models (no new training): for
 * any player/team and feature (aDOT, target location, defensive front), compute aggregated
 * profiles — fix the feature on a grid, average predictions over that player's actual targets this
 * season; serve in an internal prop-research notebook and content graphics, with guardrails
 * (profiles only on the original data distribution, shade outside observed support, bootstrap CIs)
 * — then go beyond the paper with coverage-conditional profiles (aDOT split by man vs zone).
 *
 * ACCEPTANCE GATE: ADOPT the AP what-if layer iff Test 1 fidelity holds for >= 16 of 20 players (AP value at
 * observed mean aDOT matches actual yards-per-target within +-0.5) AND Test 2 shows AP beats the
 * global PDP by >= 0.10 Spearman points on half-2 efficiency ranking; REJECT if median player
 * curve correlation across halves < 0.7.
 *
 * Ingest role: feature builder (explainable expected-goals-style shot value model for NFL: shot->play value).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.07212v2" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the AP what-if layer iff Test 1 fidelity holds for >= 16 of 20 players (AP value at
 * observed mean aDOT matches actual yards-per-target within +-0.5) AND Test 2 shows AP beats the
 * global PDP by >= 0.10 Spearman points on half-2 efficiency ranking; REJECT if median player
 * curve correlation across halves < 0.7.`;

export const CONFIG = {
  enabled: false,
  analog: "xG for NFL play value (EPA-based)",
  explain: "SHAP-lite attributions",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PlayShot {
  readonly distanceYd: number;
  readonly angleDeg: number;
  readonly down: number;
  readonly defendersInBox: number;
  readonly isPlayAction: boolean;
  readonly epa: number;
}

export function isPlayShot(x: unknown): x is PlayShot {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    isFiniteNumber(o["distanceYd"]) && (o["distanceYd"] as number) >= 0 &&
    isFiniteNumber(o["angleDeg"]) &&
    Number.isInteger(o["down"]) && (o["down"] as number) >= 1 && (o["down"] as number) <= 4 &&
    Number.isInteger(o["defendersInBox"]) && (o["defendersInBox"] as number) >= 0 &&
    typeof o["isPlayAction"] === "boolean" &&
    isFiniteNumber(o["epa"])
  );
}

/** Logistic xG-analog: P(success) from play features. */
export function xgAnalog(
  p: Pick<PlayShot, "distanceYd" | "angleDeg" | "down" | "defendersInBox" | "isPlayAction">,
  beta = { b0: 0.5, bDist: -0.08, bAngle: -0.01, bDown: -0.15, bBox: -0.12, bPA: 0.3 },
): number | null {
  const bs = [p.distanceYd, p.angleDeg, p.down, p.defendersInBox];
  if (!bs.every(isFiniteNumber) || typeof p.isPlayAction !== "boolean") return null;
  const z =
    beta.b0 +
    beta.bDist * p.distanceYd +
    beta.bAngle * Math.abs(p.angleDeg) +
    beta.bDown * p.down +
    beta.bBox * p.defendersInBox +
    beta.bPA * (p.isPlayAction ? 1 : 0);
  return 1 / (1 + Math.exp(-z));
}

/** Attribution: leave-one-out delta vs baseline means. */
export function xgAttribution(
  p: Pick<PlayShot, "distanceYd" | "angleDeg" | "down" | "defendersInBox" | "isPlayAction">,
  baseline: Pick<PlayShot, "distanceYd" | "angleDeg" | "down" | "defendersInBox" | "isPlayAction">,
): Record<string, number> | null {
  const full = xgAnalog(p);
  if (full === null) return null;
  const attrs: Record<string, number> = {};
  const keys = ["distanceYd", "angleDeg", "down", "defendersInBox", "isPlayAction"] as const;
  for (const k of keys) {
    const mod2 = { ...p, [k]: baseline[k] };
    const v = xgAnalog(mod2);
    if (v === null) return null;
    attrs[k] = full - v;
  }
  return attrs;
}

/** Calibration: mean predicted vs mean actual EPA bucketed by xG decile. */
export function xgCalibration(
  plays: readonly unknown[],
  nBins = 10,
): Array<{ xgMean: number; epaMean: number; n: number }> {
  const v: Array<{ xg: number; epa: number }> = [];
  for (const p of plays) {
    if (!isPlayShot(p)) continue;
    const xg = xgAnalog(p);
    if (xg !== null) v.push({ xg, epa: p.epa });
  }
  const bins: Array<{ xg: number; epa: number }[]> = Array.from({ length: nBins }, () => []);
  for (const e of v) {
    const b = Math.min(nBins - 1, Math.floor(e.xg * nBins));
    (bins[b] ?? []).push(e);
  }
  return bins
    .filter((b) => b.length > 0)
    .map((b) => ({
      xgMean: b.reduce((s, e) => s + e.xg, 0) / b.length,
      epaMean: b.reduce((s, e) => s + e.epa, 0) / b.length,
      n: b.length,
    }));
}
