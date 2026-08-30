/**
 * Fire authority — composition of dual-asOf + calibration + LIVE_BOARD + selective gate.
 *
 * Does NOT reimplement Venn–Abers / IVAP / CVAP. Callers pass the result of the
 * existing applySelectiveGate (or multiprob) as `selectiveWouldFire`.
 *
 * Law: LIVE_BOARD hard-off by default · refuse-default · measurement > narrative
 *      · no pav/ivap rewrite · selective-gate remains the multiprob authority
 */

export type FireRefuseReason =
  | "dual_asof_fail"
  | "calibration_not_ready"
  | "quote_stale"
  | "live_board_off"
  | "selective_refused"
  | "topology_not_ready";

export interface FireAuthorityInput {
  /** Six-gate dual-asOf already evaluated (truth layer) */
  dualAsOfOk: boolean;
  dualAsOfEdge?: number;
  dualAsOfCode?: string;
  /** Certificate readyForEdgeFire / cohort ready */
  calibrationReady: boolean;
  /** LIVE_BOARD product flag — production default false */
  liveBoardOn: boolean;
  /** Quote plane freshness already measured */
  quoteFresh: boolean;
  /**
   * Result of existing selective gate / multiprob path.
   * Never recompute IVAP here.
   */
  selectiveWouldFire: boolean;
  selectiveRefuseReason?: string;
  /** Optional edge for fire payload when selective would fire */
  edge?: number;
}

export type FireAuthorityDecision =
  | {
      fire: true;
      decision: "FIRE";
      edge: number;
      score: number;
      chain: readonly string[];
      readyForEdgeFire: true;
    }
  | {
      fire: false;
      decision: "PASS" | "ABSTAIN";
      reason: FireRefuseReason;
      score: number;
      chain: readonly string[];
      readyForEdgeFire: false;
      detail?: string;
    };

/**
 * Topology score mirrors truth.scoreTopologyHealth ownership for gate package.
 * readyForEdgeFire requires dual-asOf + cal + quoteFresh + LIVE_BOARD.
 */
export function topologyScore(input: {
  dualAsOfOk: boolean;
  calibrationReady: boolean;
  liveBoardOn: boolean;
  quoteFresh: boolean;
}): { score: number; readyForEdgeFire: boolean; reasons: string[] } {
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
  const readyForEdgeFire =
    input.dualAsOfOk &&
    input.calibrationReady &&
    input.quoteFresh &&
    input.liveBoardOn;
  return { score: Math.max(0, score), readyForEdgeFire, reasons };
}

/**
 * Canonical fire path. Never invents FIRE while LIVE_BOARD off.
 * Order of refuse is deterministic and auditable via `chain`.
 */
export function evaluateFireAuthority(
  input: FireAuthorityInput,
): FireAuthorityDecision {
  const chain: string[] = ["fire_authority.v1"];
  const topo = topologyScore({
    dualAsOfOk: input.dualAsOfOk,
    calibrationReady: input.calibrationReady,
    liveBoardOn: input.liveBoardOn,
    quoteFresh: input.quoteFresh,
  });
  chain.push(...topo.reasons.map((r) => `topo:${r}`));

  if (!input.dualAsOfOk) {
    return {
      fire: false,
      decision: "PASS",
      reason: "dual_asof_fail",
      score: topo.score,
      chain: [...chain, "refuse:dual_asof"],
      readyForEdgeFire: false,
      detail: input.dualAsOfCode,
    };
  }
  if (!input.calibrationReady) {
    return {
      fire: false,
      decision: "PASS",
      reason: "calibration_not_ready",
      score: topo.score,
      chain: [...chain, "refuse:calibration"],
      readyForEdgeFire: false,
    };
  }
  if (!input.quoteFresh) {
    return {
      fire: false,
      decision: "PASS",
      reason: "quote_stale",
      score: topo.score,
      chain: [...chain, "refuse:quote_stale"],
      readyForEdgeFire: false,
    };
  }
  if (!input.liveBoardOn) {
    return {
      fire: false,
      decision: "ABSTAIN",
      reason: "live_board_off",
      score: topo.score,
      chain: [...chain, "refuse:live_board_off"],
      readyForEdgeFire: false,
    };
  }
  if (!input.selectiveWouldFire) {
    return {
      fire: false,
      decision: "PASS",
      reason: "selective_refused",
      score: topo.score,
      chain: [
        ...chain,
        `refuse:selective:${input.selectiveRefuseReason ?? "unknown"}`,
      ],
      readyForEdgeFire: false,
      detail: input.selectiveRefuseReason,
    };
  }

  const edge = input.edge ?? input.dualAsOfEdge ?? 0;
  return {
    fire: true,
    decision: "FIRE",
    edge,
    score: topo.score,
    chain: [...chain, "gate:FIRE"],
    readyForEdgeFire: true,
  };
}

/** Demo scenarios — LIVE_BOARD always starts false in production defaults. */
export const FIRE_DEMO_SCENARIOS = [
  {
    id: "live_off",
    label: "Production default (LIVE_BOARD off)",
    input: {
      dualAsOfOk: true,
      dualAsOfEdge: 0.05,
      calibrationReady: true,
      liveBoardOn: false,
      quoteFresh: true,
      selectiveWouldFire: true,
      edge: 0.05,
    } satisfies FireAuthorityInput,
  },
  {
    id: "would_fire_if_live",
    label: "All green if founder flips LIVE_BOARD",
    input: {
      dualAsOfOk: true,
      dualAsOfEdge: 0.05,
      calibrationReady: true,
      liveBoardOn: true,
      quoteFresh: true,
      selectiveWouldFire: true,
      edge: 0.05,
    } satisfies FireAuthorityInput,
  },
  {
    id: "dual_fail",
    label: "Dual-asOf refuse",
    input: {
      dualAsOfOk: false,
      dualAsOfCode: "quote_stale",
      calibrationReady: true,
      liveBoardOn: true,
      quoteFresh: false,
      selectiveWouldFire: true,
    } satisfies FireAuthorityInput,
  },
  {
    id: "cal_fail",
    label: "Calibration not ready",
    input: {
      dualAsOfOk: true,
      dualAsOfEdge: 0.04,
      calibrationReady: false,
      liveBoardOn: true,
      quoteFresh: true,
      selectiveWouldFire: true,
    } satisfies FireAuthorityInput,
  },
  {
    id: "selective_refused",
    label: "Selective gate refused (multiprob)",
    input: {
      dualAsOfOk: true,
      dualAsOfEdge: 0.005,
      calibrationReady: true,
      liveBoardOn: true,
      quoteFresh: true,
      selectiveWouldFire: false,
      selectiveRefuseReason: "edge_below_tau",
    } satisfies FireAuthorityInput,
  },
] as const;
