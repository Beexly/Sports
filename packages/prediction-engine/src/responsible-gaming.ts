/**
 * Responsible-play gates — pure rules that decide when to interrupt with a break,
 * a cool-down, or a hard block (self-exclusion). Returns TOKEN reasons; the UI maps
 * them to vetted copy. Harm-reduction by design: for a trust brand, provable,
 * enforced safeguards are both an ethical duty and the best defense against
 * criticism. Pure, no I/O.
 */

export interface PlayState {
  /** Consecutive losing settled picks the user followed. */
  readonly consecutiveLosses?: number;
  /** Net result this period, in units (negative = down). */
  readonly netUnitsThisPeriod?: number;
  /** Active session length in minutes. */
  readonly sessionMinutes?: number;
  /** ISO timestamp; if in the future, the user is self-excluded. */
  readonly selfExcludedUntil?: string;
}

export interface RgOptions {
  readonly coolDownAfterLosses?: number; // default 5
  readonly sessionLimitMinutes?: number; // default 120
  readonly profitMilestoneUnits?: number; // default 50
  readonly lossMilestoneUnits?: number; // default -50
  readonly now?: () => Date;
}

export type RgReason =
  | "self_excluded"
  | "loss_cooldown"
  | "session_limit"
  | "profit_milestone"
  | "loss_milestone";

export interface RgVerdict {
  /** True = access should be hard-blocked (self-exclusion or mandatory cool-down). */
  readonly blocked: boolean;
  /** Token reasons (UI maps to vetted copy); soft nudges and hard blocks alike. */
  readonly reasons: readonly RgReason[];
}

export function evaluateResponsiblePlay(state: PlayState, options: RgOptions = {}): RgVerdict {
  const now = (options.now ?? (() => new Date()))();
  const reasons: RgReason[] = [];

  if (state.selfExcludedUntil) {
    const until = Date.parse(state.selfExcludedUntil);
    if (!Number.isNaN(until) && until > now.getTime()) reasons.push("self_excluded");
  }
  if ((state.consecutiveLosses ?? 0) >= (options.coolDownAfterLosses ?? 5)) reasons.push("loss_cooldown");
  if ((state.sessionMinutes ?? 0) >= (options.sessionLimitMinutes ?? 120)) reasons.push("session_limit");

  const net = state.netUnitsThisPeriod ?? 0;
  if (net >= (options.profitMilestoneUnits ?? 50)) reasons.push("profit_milestone");
  if (net <= (options.lossMilestoneUnits ?? -50)) reasons.push("loss_milestone");

  const blocked = reasons.includes("self_excluded") || reasons.includes("loss_cooldown");
  return { blocked, reasons };
}
