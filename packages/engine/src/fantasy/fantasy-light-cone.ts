/**
 * FANTASY DISCOVERY LAYER — Fantasy Information Light Cone (Invention F13).
 *
 * Fantasy is full of hindsight fraud: "obvious" waiver adds that were only obvious after the
 * inactive report, or after the waiver ran. A recommendation is valid only if it was KNOWABLE
 * before the relevant lock (waiver deadline, FAAB lock, trade acceptance, kickoff, inactives,
 * DFS salary/contest lock, late-swap, best-ball pick, dynasty window). Fails closed: it never
 * credits the system for "knowing" something after the window closed or with post-decision data.
 * Pure + deterministic.
 */

export type FantasyLock =
  | "waiver_deadline" | "faab_lock" | "trade_acceptance" | "thursday_kickoff"
  | "sunday_inactive" | "dfs_salary_lock" | "contest_lock" | "late_swap"
  | "bestball_pick" | "dynasty_window";

export type FantasyLightConeStatus =
  | "INSIDE_LIGHT_CONE" | "OUTSIDE_LIGHT_CONE" | "CONTAMINATED" | "POST_LOCK_ONLY" | "SOURCE_UNCLEAR";

export interface FantasyLightConeQuery {
  readonly lock: FantasyLock;
  /** When the decision is/was made. */
  readonly decisionTime: string;
  /** When the relevant lock closes (after which no action is possible). */
  readonly lockTime: string;
  /** When the role-truth first became knowable from a valid source. */
  readonly infoFirstKnowableTime: string;
  /** Timestamps of the data actually used (to detect post-decision leakage). */
  readonly usedDataTimestamps?: readonly string[];
}

export interface FantasyLightConeVerdict {
  readonly status: FantasyLightConeStatus;
  readonly knowableAtDecision: boolean;
  readonly actionableBeforeLock: boolean;
  readonly contaminationBoundary: string | null;
  readonly reason: string;
}

const ms = (iso: string): number => Date.parse(iso);

/** Evaluate whether a fantasy decision was knowable AND actionable before its lock. Fails closed. */
export function evaluateFantasyLightCone(q: FantasyLightConeQuery): FantasyLightConeVerdict {
  const decision = ms(q.decisionTime), lock = ms(q.lockTime), known = ms(q.infoFirstKnowableTime);
  if (![decision, lock, known].every(Number.isFinite)) {
    return { status: "SOURCE_UNCLEAR", knowableAtDecision: false, actionableBeforeLock: false, contaminationBoundary: null, reason: "Missing/unparseable timestamps — cannot certify knowability." };
  }
  const contaminating = (q.usedDataTimestamps ?? []).find((t) => Number.isFinite(ms(t)) && ms(t) > decision);
  if (contaminating) {
    return { status: "CONTAMINATED", knowableAtDecision: false, actionableBeforeLock: false, contaminationBoundary: contaminating, reason: `Used data at ${contaminating} postdates the decision — hindsight leakage.` };
  }
  if (decision < known) {
    return { status: "OUTSIDE_LIGHT_CONE", knowableAtDecision: false, actionableBeforeLock: decision <= lock, contaminationBoundary: q.infoFirstKnowableTime, reason: `Decision ${q.decisionTime} precedes first-knowable ${q.infoFirstKnowableTime} — not knowable yet.` };
  }
  if (decision > lock) {
    return { status: "POST_LOCK_ONLY", knowableAtDecision: true, actionableBeforeLock: false, contaminationBoundary: q.lockTime, reason: `Knowable, but only after the ${q.lock} lock at ${q.lockTime} — not actionable; do not credit the decision.` };
  }
  return { status: "INSIDE_LIGHT_CONE", knowableAtDecision: true, actionableBeforeLock: true, contaminationBoundary: null, reason: `Knowable at decision and before the ${q.lock} lock — actionable.` };
}
