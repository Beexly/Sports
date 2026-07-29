/**
 * Unified prefire — run BEFORE selective FIRE / multiprob evaluation.
 *
 * Purpose: cheap topology refuses (dual-asOf, calibration readiness, quote
 * freshness, LIVE_BOARD) without paying for applySelectiveGate when prefire
 * already holds the fire path. Selective gate remains multiprob FIRE authority
 * once prefire returns proceedToSelective.
 *
 * Law: LIVE_BOARD off · refuse-default · no pav/ivap rewrite · selective-gate
 *      remains sole multiprob authority after prefire green.
 *
 * Composition with evaluateFireAuthority:
 *   1) evaluateUnifiedPrefire(input) — if !proceedToSelective → return PASS/ABSTAIN
 *   2) run applySelectiveGate / multiprob only when proceedToSelective
 *   3) evaluateFireAuthority({ ...prefire, selectiveWouldFire })
 */

export type PrefireRefuseReason =
  | "dual_asof_fail"
  | "calibration_not_ready"
  | "quote_stale"
  | "live_board_off";

export interface UnifiedPrefireInput {
  /** Six-gate dual-asOf already evaluated (truth layer) */
  readonly dualAsOfOk: boolean;
  readonly dualAsOfCode?: string;
  /** Certificate / cohort ready for edge fire */
  readonly calibrationReady: boolean;
  /** Quote plane freshness already measured */
  readonly quoteFresh: boolean;
  /** LIVE_BOARD product flag — production default false */
  readonly liveBoardOn: boolean;
}

export type UnifiedPrefireDecision =
  | {
      proceedToSelective: true;
      decision: "PROCEED";
      chain: readonly string[];
      score: number;
    }
  | {
      proceedToSelective: false;
      decision: "PASS" | "ABSTAIN";
      reason: PrefireRefuseReason;
      chain: readonly string[];
      score: number;
      detail?: string;
    };

function scorePrefire(input: UnifiedPrefireInput): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 100;
  if (!input.dualAsOfOk) {
    score -= 40;
    reasons.push("dual_asof_fail");
  }
  if (!input.calibrationReady) {
    score -= 30;
    reasons.push("calibration_not_ready");
  }
  if (!input.quoteFresh) {
    score -= 20;
    reasons.push("quote_stale");
  }
  if (!input.liveBoardOn) {
    score -= 5;
    reasons.push("live_board_off");
  }
  return { score: Math.max(0, score), reasons };
}

/**
 * Prefire gate before selective FIRE. Deterministic refuse order:
 * dual-asOf → calibration → quote freshness → LIVE_BOARD.
 *
 * When all green, returns proceedToSelective so the caller may run
 * applySelectiveGate. Never invents FIRE.
 */
export function evaluateUnifiedPrefire(
  input: UnifiedPrefireInput,
): UnifiedPrefireDecision {
  const chain: string[] = ["unified_prefire.v1"];
  const { score, reasons } = scorePrefire(input);
  chain.push(...reasons.map((r) => `topo:${r}`));

  if (!input.dualAsOfOk) {
    return {
      proceedToSelective: false,
      decision: "PASS",
      reason: "dual_asof_fail",
      score,
      chain: [...chain, "refuse:dual_asof"],
      detail: input.dualAsOfCode,
    };
  }
  if (!input.calibrationReady) {
    return {
      proceedToSelective: false,
      decision: "PASS",
      reason: "calibration_not_ready",
      score,
      chain: [...chain, "refuse:calibration"],
    };
  }
  if (!input.quoteFresh) {
    return {
      proceedToSelective: false,
      decision: "PASS",
      reason: "quote_stale",
      score,
      chain: [...chain, "refuse:quote_stale"],
    };
  }
  if (!input.liveBoardOn) {
    return {
      proceedToSelective: false,
      decision: "ABSTAIN",
      reason: "live_board_off",
      score,
      chain: [...chain, "refuse:live_board_off"],
    };
  }

  return {
    proceedToSelective: true,
    decision: "PROCEED",
    score,
    chain: [...chain, "prefire:proceed_to_selective"],
  };
}

/**
 * Compose prefire + selective result into the same chain language as
 * evaluateFireAuthority without re-running topology twice.
 */
export function composePrefireWithSelective(input: {
  prefire: UnifiedPrefireDecision;
  selectiveWouldFire: boolean;
  selectiveRefuseReason?: string;
  edge?: number;
}):
  | { fire: true; edge: number; chain: readonly string[] }
  | {
      fire: false;
      reason: PrefireRefuseReason | "selective_refused";
      chain: readonly string[];
      detail?: string;
    } {
  if (!input.prefire.proceedToSelective) {
    return {
      fire: false,
      reason: input.prefire.reason,
      chain: input.prefire.chain,
      detail: "detail" in input.prefire ? input.prefire.detail : undefined,
    };
  }
  if (!input.selectiveWouldFire) {
    return {
      fire: false,
      reason: "selective_refused",
      chain: [
        ...input.prefire.chain,
        `refuse:selective:${input.selectiveRefuseReason ?? "unknown"}`,
      ],
      detail: input.selectiveRefuseReason,
    };
  }
  return {
    fire: true,
    edge: input.edge ?? 0,
    chain: [...input.prefire.chain, "gate:FIRE"],
  };
}
