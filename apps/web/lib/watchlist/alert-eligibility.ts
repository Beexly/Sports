/**
 * Watchlist — the alert doctrine.
 *
 * Hard rule for PICKS: a watchlist alert may fire for a GRADED (settled)
 * pick only. An ungraded/PENDING tip must NEVER trigger a follow alert — that
 * would be exactly the "hot tip" behavior this platform explicitly refuses to
 * ship (CLAUDE.md: no fabricated stats, no promise dressed as a result).
 * Grading is the only thing that turns a prediction into a fact worth
 * notifying someone about.
 *
 * C-413 extends the same module with STATUS CHANGES: a watched player's
 * published injury report status or depth-chart slot moving. Those are facts
 * from the nflverse report, not forecasts, so they clear the same
 * alerts-enabled + Elite gates and never enter the graded-only check.
 *
 * This is intentionally the ONE place that decides "is this event allowed
 * to alert." Every caller — settlement-hook.ts, status-alert-hook.ts, and
 * `alert-dispatch.ts` — must route through `isAlertEligible` rather than
 * re-deriving the check inline, so the doctrine can never drift between
 * call sites.
 *
 * Pure module — no DB, no env, no I/O. Fully unit-testable.
 */

import type { PickResult } from "@sports/types";

export interface GradedEventInput {
  /** The pick's current result. PENDING is the only non-graded state. */
  readonly pickResult: PickResult;
  /** Set only at settlement. A null/undefined settledAt on a non-PENDING
   *  result is treated as NOT graded — belt-and-suspenders against a
   *  mis-transitioned record (result flipped without the settlement
   *  timestamp actually being stamped). */
  readonly settledAt: Date | string | null | undefined;
}

/**
 * C-413. A watched player's injury report status or depth-chart slot moved.
 * This is a FACT from the published nflverse report — the same epistemic
 * class as a graded pick, never a forecast — so it is eligible under the
 * same alerts-enabled + Elite gates and skips the graded-only check
 * (which exists solely to stop ungraded TIPS; a status change is not a tip).
 */
export interface StatusChangeEventInput {
  readonly kind: "status_change";
  readonly statusKind: "injury" | "depth_chart";
  readonly playerName: string;
  /** Previous published value; null when the player had no prior row. */
  readonly previous: string | null;
  /** Current published value; null when the player dropped off the report. */
  readonly current: string | null;
  readonly changedAt: Date;
}

export type WatchlistAlertEventInput = GradedEventInput | StatusChangeEventInput;

export function isStatusChangeEvent(
  event: WatchlistAlertEventInput,
): event is StatusChangeEventInput {
  return "kind" in event && event.kind === "status_change";
}

/**
 * GRADED = settled. True only when the pick has moved off PENDING AND
 * carries a settlement timestamp. This is the single predicate the
 * "never alert on an ungraded tip" guarantee rests on.
 */
export function isGradedEvent(input: GradedEventInput): boolean {
  if (input.pickResult === "PENDING") return false;
  return input.settledAt !== null && input.settledAt !== undefined;
}

export interface AlertEligibilityInput {
  /** The global kill switch — see alert-dispatch.ts. Checked here too (not
   *  only at the dispatch call site) so any future caller of
   *  `isAlertEligible` gets the same fail-closed default for free. */
  readonly alertsEnabled: boolean;
  /** Real-time alerts are Elite-exclusive (CLAUDE.md tier table). Reuses
   *  the existing `Entitlements.canGetAlerts` field — this module does not
   *  re-decide the tier, only combines it with the graded-only rule. */
  readonly canGetAlerts: boolean;
  readonly event: WatchlistAlertEventInput;
}

export type AlertIneligibleReason = "alerts_disabled" | "tier_ineligible" | "not_graded";

export type AlertEligibilityResult =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reason: AlertIneligibleReason };

/**
 * The combined gate a watchlist alert must clear before it may be sent.
 * All three checks are independent and ALL must pass — this function does
 * not short-circuit in a way that could hide the graded check behind a
 * disabled flag (order matters for the reason returned, not for safety:
 * every branch below is fail-closed).
 */
export function evaluateAlertEligibility(input: AlertEligibilityInput): AlertEligibilityResult {
  if (!input.alertsEnabled) {
    return { eligible: false, reason: "alerts_disabled" };
  }
  if (!input.canGetAlerts) {
    return { eligible: false, reason: "tier_ineligible" };
  }
  // C-413: a published status change is a fact, not an ungraded tip — it
  // never enters the graded-only check. The two gates above still apply.
  if (isStatusChangeEvent(input.event)) {
    return { eligible: true };
  }
  if (!isGradedEvent(input.event)) {
    return { eligible: false, reason: "not_graded" };
  }
  return { eligible: true };
}

/** Convenience boolean form of `evaluateAlertEligibility`. */
export function isAlertEligible(input: AlertEligibilityInput): boolean {
  return evaluateAlertEligibility(input).eligible;
}
