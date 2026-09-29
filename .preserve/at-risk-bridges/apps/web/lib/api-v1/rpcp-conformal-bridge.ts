/**
 * RPCP ↔ conformal bridge — OFFLINE / diagnostic only.
 *
 * Purpose: attach split-conformal residual width + Mondrian group thresholds
 * to Ranking Power Control Plane residual attribution so ops can see whether
 * uncertainty bands are TIGHT while ranking is still dead (maps cannot fix RES).
 *
 * Hard laws:
 *   - CONFORMAL_ABSTAIN_ENABLED default false — this module does not flip it.
 *   - Coverage ≠ eligibility. Conformal never raises Murphy RES.
 *   - CALIBRATION_ADJUSTMENTS_ENABLED stays OFF; bridge never applies maps.
 *   - No public surface, no PROVEN unlock, no AUTO_PUBLISH.
 *
 * Product consumers: founder-ops only (via rankingPower.conformalBridge when
 * explicitly requested). Default wiring keeps bridge out of the public path.
 */

import {
  residualNonconformity,
  splitConformalResidualThreshold,
  mondrianResidualThresholds,
  clipConformalAlpha,
} from "@/lib/calibration/conformal-calibration";
import type {
  RankingPowerControl,
  RankingPowerRow,
  ResidualAttribution,
} from "@/lib/calibration/ranking-power-control";

export type RpcpConformalBridgeInput = {
  readonly rows: readonly RankingPowerRow[];
  readonly control: RankingPowerControl;
  /** Target miscoverage. Default 0.1 → ~90% coverage under exchangeability. */
  readonly alpha?: number;
  /**
   * Explicit opt-in to compute bridge. Default false — offline only.
   * Even when true, product flags remain OFF.
   */
  readonly compute?: boolean;
};

export type RpcpConformalBridge = {
  readonly computed: boolean;
  readonly alpha: number;
  readonly n: number;
  readonly residualThreshold: number | null;
  readonly meanResidual: number | null;
  readonly mondrianGroupCount: number;
  readonly thinGroupCount: number;
  /** Residual bottleneck echoed from RPCP (not re-derived by coverage). */
  readonly primaryBottleneck: ResidualAttribution["primaryBottleneck"];
  readonly residualOperatorHint: string;
  readonly mapsStillOff: true;
  readonly conformalAbstainStillOff: true;
  readonly unlocksProven: false;
  readonly raisesRes: false;
  readonly operatorHint: string;
  readonly honesty: string;
};

const EMPTY: RpcpConformalBridge = {
  computed: false,
  alpha: 0.1,
  n: 0,
  residualThreshold: null,
  meanResidual: null,
  mondrianGroupCount: 0,
  thinGroupCount: 0,
  primaryBottleneck: "ranking_dead",
  residualOperatorHint: "Bridge not computed (offline default).",
  mapsStillOff: true,
  conformalAbstainStillOff: true,
  unlocksProven: false,
  raisesRes: false,
  operatorHint:
    "RPCP–conformal bridge offline. Coverage diagnostics do not clear PROVEN floors.",
  honesty:
    "Conformal coverage ≠ eligibility. Never treat residual threshold as ranking power. Maps OFF.",
};

/**
 * Build offline conformal diagnostics attached to an RPCP control.
 * Default: returns empty posture (compute must be true).
 */
export function buildRpcpConformalBridge(
  input: RpcpConformalBridgeInput,
): RpcpConformalBridge {
  const alpha = clipConformalAlpha(input.alpha ?? 0.1);
  const residual = input.control.residual;

  if (!input.compute) {
    return {
      ...EMPTY,
      alpha,
      primaryBottleneck: residual.primaryBottleneck,
      residualOperatorHint: residual.operatorHint,
    };
  }

  const residuals: number[] = [];
  const mondrian: { group: string; residual: number }[] = [];
  for (const r of input.rows) {
    const p = Math.min(1 - 1e-6, Math.max(1e-6, r.pConfidence));
    const res = residualNonconformity(p, r.y);
    residuals.push(res);
    mondrian.push({ group: r.groupKey, residual: res });
  }

  if (residuals.length === 0) {
    return {
      ...EMPTY,
      computed: true,
      alpha,
      primaryBottleneck: residual.primaryBottleneck,
      residualOperatorHint: residual.operatorHint,
      operatorHint:
        "Bridge computed but sample empty — no residual threshold.",
    };
  }

  const threshold = splitConformalResidualThreshold(residuals, alpha);
  const meanResidual =
    residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const groupThresholds = mondrianResidualThresholds(mondrian, alpha, 20);
  const groupKeys = Object.keys(groupThresholds);
  const thinGroupCount = groupKeys.filter(
    (g) => !Number.isFinite(groupThresholds[g]!),
  ).length;

  const operatorHint =
    residual.primaryBottleneck === "ranking_dead"
      ? `Conformal residual q̂≈${threshold.toFixed(3)} (α=${alpha}) but RPCP bottleneck is ranking_dead — coverage width cannot invent RES. Prefer independents / features, not maps.`
      : residual.primaryBottleneck === "missing_independent"
        ? `Conformal bridge OK offline; primary bottleneck is missing_independent (coverage ${(residual.independentCoverage * 100).toFixed(0)}%). Expand Kalshi/FPI/Elo trueProb — not conformal product flags.`
        : `Conformal offline diagnostic attached. RPCP bottleneck=${residual.primaryBottleneck}. Conformal abstain + maps remain OFF.`;

  return {
    computed: true,
    alpha,
    n: residuals.length,
    residualThreshold: threshold,
    meanResidual,
    mondrianGroupCount: groupKeys.length,
    thinGroupCount,
    primaryBottleneck: residual.primaryBottleneck,
    residualOperatorHint: residual.operatorHint,
    mapsStillOff: true,
    conformalAbstainStillOff: true,
    unlocksProven: false,
    raisesRes: false,
    operatorHint,
    honesty: EMPTY.honesty,
  };
}

/**
 * Env-gated posture for ops truth. Never enables product flags.
 * Set RPCP_CONFORMAL_BRIDGE_COMPUTE=true only for offline bake-off / research.
 */
export function rpcpConformalBridgePosture(
  env: Record<string, string | undefined> = process.env,
): {
  readonly computeEnabled: boolean;
  readonly productFlags: {
    readonly conformalAbstainEnabled: boolean;
    readonly calibrationAdjustmentsEnabled: boolean;
    readonly autoPublish: boolean;
  };
  readonly unlocksProven: false;
  readonly raisesRes: false;
  readonly operatorHint: string;
} {
  const computeEnabled =
    env["RPCP_CONFORMAL_BRIDGE_COMPUTE"]?.trim().toLowerCase() === "true";
  const abstain =
    env["CONFORMAL_ABSTAIN_ENABLED"]?.trim().toLowerCase() === "true";
  const maps =
    env["CALIBRATION_ADJUSTMENTS_ENABLED"]?.trim().toLowerCase() === "true";
  const auto =
    env["CALIBRATION_AUTO_PUBLISH"]?.trim().toLowerCase() === "true";
  return {
    computeEnabled,
    productFlags: {
      conformalAbstainEnabled: abstain,
      calibrationAdjustmentsEnabled: maps,
      autoPublish: auto,
    },
    unlocksProven: false,
    raisesRes: false,
    operatorHint: computeEnabled
      ? "Offline bridge compute env ON — still does not flip abstain/maps/AUTO_PUBLISH."
      : "RPCP–conformal bridge default offline (RPCP_CONFORMAL_BRIDGE_COMPUTE unset).",
  };
}
