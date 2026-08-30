/**
 * Straight-through processing (STP) automation for settlement backlog clearance.
 *
 * Segments each RCA finding into an action the free-path runner (or operator
 * campaign) may take without inventing scores:
 *
 *   AUTO_SETTLE       — CONFIRMED final, write PENDING→terminal (existing path)
 *   AUTO_SETTLE_AUDIT — SINGLE_SOURCE allowed with audit flag
 *   REPROCESS         — no final yet / race lost — queue for next STP cycle
 *   EXCEPTION_QUEUE   — DISPUTED / orient fail / path misconfig — human
 *   WAIT              — within grace or not commenced
 *
 * Clearance campaign math: net burn = cleared − new overdue inflow. Campaign
 * succeeds only while burn < 0 and aged buckets shrink.
 *
 * Pure + deterministic. Does not touch the database.
 */

import type {
  SettlementRcaFinding,
  SettlementRootCauseCode,
} from "./root-cause-analysis";

export type StpAction =
  | "AUTO_SETTLE"
  | "AUTO_SETTLE_AUDIT"
  | "REPROCESS"
  | "EXCEPTION_QUEUE"
  | "WAIT";

export interface StpPolicy {
  /** Allow SINGLE_SOURCE finals through STP with audit flag. Default true (matches free-settlement). */
  readonly allowSingleSource: boolean;
  /** Max age (hours) for automatic reprocess priority boost. Default 72. */
  readonly reprocessPriorityMaxAgeHours: number;
}

export const DEFAULT_STP_POLICY: StpPolicy = {
  allowSingleSource: true,
  reprocessPriorityMaxAgeHours: 72,
};

export interface StpDecision {
  readonly pickId: string;
  readonly action: StpAction;
  readonly priority: number;
  readonly code: SettlementRootCauseCode;
  readonly reason: string;
  readonly requiresHuman: boolean;
}

export interface ClearanceWavePlan {
  readonly waveA: readonly StpDecision[];
  readonly waveB: readonly StpDecision[];
  readonly waveC: readonly StpDecision[];
  readonly waveD: readonly StpDecision[];
  readonly autoEligible: number;
  readonly exceptionCount: number;
  readonly waitCount: number;
  readonly ordered: readonly StpDecision[];
}

export interface BurnRateSample {
  readonly cleared: number;
  readonly newOverdueInflow: number;
  readonly reopened: number;
}

export interface BurnRateReport {
  readonly netBurn: number;
  /** True when backlog is shrinking (cleared exceeds inflow+reopen). */
  readonly draining: boolean;
  readonly cleared: number;
  readonly inflow: number;
  readonly reopened: number;
  readonly operatorMessage: string;
}

const ACTION_PRIORITY: Record<StpAction, number> = {
  AUTO_SETTLE: 100,
  AUTO_SETTLE_AUDIT: 80,
  REPROCESS: 60,
  EXCEPTION_QUEUE: 40,
  WAIT: 0,
};

/**
 * Map one RCA finding (+ optional settlement confirmation) to an STP action.
 */
export function decideStpAction(
  finding: SettlementRcaFinding,
  opts: {
    readonly policy?: StpPolicy;
    /** When the settle matcher already produced a terminal decision this cycle. */
    readonly settledThisCycle?: boolean;
    readonly confirmation?: "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED";
  } = {},
): StpDecision {
  const policy = opts.policy ?? DEFAULT_STP_POLICY;

  if (opts.settledThisCycle) {
    const audit = opts.confirmation === "SINGLE_SOURCE";
    return {
      pickId: finding.pickId,
      action: audit ? "AUTO_SETTLE_AUDIT" : "AUTO_SETTLE",
      priority: ACTION_PRIORITY[audit ? "AUTO_SETTLE_AUDIT" : "AUTO_SETTLE"] + ageBoost(finding),
      code: finding.code,
      reason: audit
        ? "Settled this cycle on SINGLE_SOURCE — audit flag."
        : "Settled this cycle via STP (CONFIRMED or graded final).",
      requiresHuman: false,
    };
  }

  switch (finding.code) {
    case "DISPUTED_SCORES":
      return dec(finding, "EXCEPTION_QUEUE", "DISPUTED scores — human/evidence required.", true);
    case "TEAM_ORIENT_FAIL":
      return dec(finding, "EXCEPTION_QUEUE", "Team orientation failed — alias repair needed.", true);
    case "PATH_MISCONFIG":
      return dec(finding, "EXCEPTION_QUEUE", "Path misconfig — fix env before STP can drain.", true);
    case "WITHIN_GRACE":
    case "NOT_COMMENCED":
      return dec(finding, "WAIT", "Not yet actionable for clearance.", false);
    case "WRITE_RACE_LOST":
      return dec(finding, "REPROCESS", "Lost write race — re-count then reprocess if still PENDING.", false);
    case "NO_TRUSTED_FINAL":
    case "OVERDUE_NO_SCORE":
      return dec(
        finding,
        "REPROCESS",
        finding.ageHours <= policy.reprocessPriorityMaxAgeHours
          ? "Overdue without final — priority reprocess on next score cycle."
          : "Long-aged overdue — reprocess and escalate if still dark.",
        false,
      );
    case "SINGLE_SOURCE_POLICY_HOLD":
      return policy.allowSingleSource
        ? dec(finding, "AUTO_SETTLE_AUDIT", "SINGLE_SOURCE allowed under STP audit policy.", false)
        : dec(finding, "EXCEPTION_QUEUE", "SINGLE_SOURCE blocked by policy.", true);
    default:
      return dec(finding, "EXCEPTION_QUEUE", "Unclassified — exception queue.", true);
  }
}

function ageBoost(finding: SettlementRcaFinding): number {
  if (!finding.overdue) return 0;
  // Older overdue clears first within the same action class.
  return Math.min(30, Math.floor(finding.ageHours));
}

function dec(
  finding: SettlementRcaFinding,
  action: StpAction,
  reason: string,
  requiresHuman: boolean,
): StpDecision {
  return {
    pickId: finding.pickId,
    action,
    priority: ACTION_PRIORITY[action] + ageBoost(finding),
    code: finding.code,
    reason,
    requiresHuman,
  };
}

/** Build ordered clearance waves from findings (highest priority first within waves). */
export function planClearanceWaves(
  findings: readonly SettlementRcaFinding[],
  opts: {
    readonly policy?: StpPolicy;
    readonly settledPickIds?: ReadonlySet<string>;
    readonly confirmationByPickId?: ReadonlyMap<string, "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED">;
  } = {},
): ClearanceWavePlan {
  const decisions = findings.map((f) =>
    decideStpAction(f, {
      policy: opts.policy,
      settledThisCycle: opts.settledPickIds?.has(f.pickId) ?? false,
      confirmation: opts.confirmationByPickId?.get(f.pickId),
    }),
  );

  const byWave = { A: [] as StpDecision[], B: [] as StpDecision[], C: [] as StpDecision[], D: [] as StpDecision[] };
  for (let i = 0; i < findings.length; i++) {
    const wave = findings[i]!.clearanceWave;
    byWave[wave].push(decisions[i]!);
  }
  for (const k of ["A", "B", "C", "D"] as const) {
    byWave[k].sort((a, b) => b.priority - a.priority);
  }

  const ordered = [...decisions].sort((a, b) => b.priority - a.priority);
  const autoEligible = decisions.filter(
    (d) => d.action === "AUTO_SETTLE" || d.action === "AUTO_SETTLE_AUDIT" || d.action === "REPROCESS",
  ).length;
  const exceptionCount = decisions.filter((d) => d.action === "EXCEPTION_QUEUE").length;
  const waitCount = decisions.filter((d) => d.action === "WAIT").length;

  return {
    waveA: byWave.A,
    waveB: byWave.B,
    waveC: byWave.C,
    waveD: byWave.D,
    autoEligible,
    exceptionCount,
    waitCount,
    ordered,
  };
}

export function computeBurnRate(sample: BurnRateSample): BurnRateReport {
  const cleared = Math.max(0, Math.floor(sample.cleared));
  const inflow = Math.max(0, Math.floor(sample.newOverdueInflow));
  const reopened = Math.max(0, Math.floor(sample.reopened));
  const netBurn = cleared - inflow - reopened;
  const draining = netBurn > 0;
  return {
    netBurn,
    draining,
    cleared,
    inflow,
    reopened,
    operatorMessage: draining
      ? `Backlog draining: net burn ${netBurn} (cleared ${cleared} − inflow ${inflow} − reopened ${reopened}).`
      : `Backlog not draining: net burn ${netBurn} (cleared ${cleared} − inflow ${inflow} − reopened ${reopened}). ` +
        `Fix top RCA cause and gate inflow before declaring clearance.`,
  };
}

/**
 * Priority sort key for loading PENDING picks into the free runner:
 * commenced overdue first, then in-grace, then future.
 */
export function stpLoadPriority(ageHours: number, graceHours: number): number {
  if (ageHours >= graceHours) return 1_000_000 + Math.floor(ageHours * 10);
  if (ageHours >= 0) return 100_000 + Math.floor(ageHours * 10);
  return Math.max(0, 10_000 + Math.floor(ageHours)); // future games lowest
}
