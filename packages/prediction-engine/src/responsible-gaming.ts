/**
 * Responsible-play gates — pure rules that decide when to interrupt a user with a
 * soft nudge (take a break, you hit a profit/loss milestone) or a hard block
 * (a mandatory loss cool-down or an active self-exclusion).
 *
 * Returns opaque TOKEN reasons (never user-facing prose); the UI maps each token
 * to vetted, compliant copy. Two tokens hard-block access (`self_excluded`,
 * `loss_cooldown`); the other three (`session_limit`, `profit_milestone`,
 * `loss_milestone`) are advisory nudges that never gate access.
 *
 * Harm-reduction by design: for a trust brand, provable, enforced safeguards are
 * both an ethical duty and the best defense against criticism. The rules are pure
 * and deterministic given an injected clock (`options.now`). This module holds no
 * state and performs no I/O or enforcement — the caller owns persistence, acting
 * on `blocked`, and rendering copy.
 */

export interface PlayState {
  /** Consecutive losing settled picks the user followed. */
  readonly consecutiveLosses?: number;
  /** Net result this period, in units (negative = down). */
  readonly netUnitsThisPeriod?: number;
  /** Active session length in minutes. */
  readonly sessionMinutes?: number;
  /**
   * ISO timestamp of when a self-exclusion lifts. The user is self-excluded only
   * while this parses to a time strictly after `now` (a window ending exactly at
   * `now` is already lifted). Absent or unparseable values yield no exclusion —
   * this gate fails open: a corrupt timestamp is treated as "not excluded", never
   * as a block, so upstream storage must guarantee a valid ISO string.
   */
  readonly selfExcludedUntil?: string;
}

export interface RgOptions {
  readonly coolDownAfterLosses?: number; // default 5
  readonly sessionLimitMinutes?: number; // default 120
  readonly profitMilestoneUnits?: number; // default 50
  readonly lossMilestoneUnits?: number; // default -50
  /** Injectable clock for deterministic evaluation; defaults to wall-clock `new Date()`. */
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

/**
 * Evaluate a play-state snapshot against the responsible-play gates and return the
 * triggered reason tokens plus whether access must be hard-blocked.
 *
 * Pure and deterministic given `options.now`. Thresholds are configurable via
 * `options` (defaults documented on {@link RgOptions}); every {@link PlayState}
 * field defaults to a neutral 0 / absent when omitted.
 *
 * Gates, in the fixed order they are appended to `reasons`:
 *  1. `self_excluded`   — BLOCKING. `selfExcludedUntil` parses to a time strictly
 *                         after `now`. Absent/unparseable → no exclusion (fails open).
 *  2. `loss_cooldown`   — BLOCKING. `consecutiveLosses >= coolDownAfterLosses` (default 5).
 *  3. `session_limit`   — soft nudge. `sessionMinutes >= sessionLimitMinutes` (default 120).
 *  4. `profit_milestone`— soft nudge. `netUnitsThisPeriod >= profitMilestoneUnits` (default +50).
 *  5. `loss_milestone`  — soft nudge. `netUnitsThisPeriod <= lossMilestoneUnits` (default -50).
 *
 * `blocked` is true iff `self_excluded` or `loss_cooldown` is present; the three
 * soft nudges inform UI copy but never gate access. All threshold comparisons are
 * inclusive (`>=` / `<=`); the self-exclusion window alone is strictly future
 * (`until > now`). `profit_milestone` and `loss_milestone` are mutually exclusive
 * because their bounds (+50 / -50) cannot both hold for one net figure.
 *
 * Limitation: this scores a single supplied snapshot. It neither persists state,
 * enforces the block, nor tracks history — those are the caller's responsibility.
 *
 * @param state   Point-in-time play signals; missing fields default to 0 / absent.
 * @param options Threshold overrides and the injectable clock. See {@link RgOptions}.
 * @returns `{ blocked, reasons }`, with `reasons` in the deterministic order above.
 */
export function evaluateResponsiblePlay(state: PlayState, options: RgOptions = {}): RgVerdict {
  // Clock seam: callers inject `options.now` for deterministic, testable time and
  // should do so in production. The argless `new Date()` fallback is this module's
  // sole impurity and its only nondeterministic input. Read once so every gate
  // below evaluates against the same instant.
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
