/**
 * Friction Layer — the intentional slow-downs Galaxy applies when the
 * product detects a context where a faster path would harm the user.
 *
 * Friction is never a paywall or a gate. It is a clarity insertion:
 *  - an "Are you sure?" interstitial before submitting a parlay above
 *    a structural-risk threshold
 *  - a methodology link inserted above an evidence card the user has
 *    not consulted before
 *  - a 'read this' prompt before allowing a same-game parlay
 *
 * Server-only. No client autonomy beyond rendering the prompt.
 */

import type { TelemetrySurfaceId } from "../telemetry/surfaces";

export type FrictionTrigger =
  | "parlay-correlation-high"
  | "tilt-cascade-detected"
  | "stale-data-on-bet-surface"
  | "no-bet-list-not-checked"
  | "evidence-card-skipped"
  | "first-time-on-betting-surface"
  | "post-loss-within-cooldown";

export interface FrictionPrompt {
  readonly id: string;
  readonly trigger: FrictionTrigger;
  readonly surface: TelemetrySurfaceId;
  readonly title: string;
  readonly body: string;
  /** A small, finite set of legal "next actions" — none are bets. */
  readonly actions: ReadonlyArray<{
    readonly label: string;
    readonly href: string;
    readonly kind: "primary" | "secondary" | "dismiss";
  }>;
  /** True if the user must acknowledge before continuing. */
  readonly modal: boolean;
}

export const FRICTION_PROMPTS: ReadonlyArray<FrictionPrompt> = [
  {
    id: "fp-001-parlay-correlation",
    trigger: "parlay-correlation-high",
    surface: "parlay-mri",
    title: "This parlay has correlated legs.",
    body: "Two or more legs depend on overlapping events. The structural risk is concentrated. Read the diagnostic before continuing.",
    actions: [
      { label: "Read diagnostic", href: "/parlay-mri", kind: "primary" },
      { label: "No-Bet doctrine", href: "/no-bet", kind: "secondary" },
      { label: "Continue anyway", href: "#", kind: "dismiss" },
    ],
    modal: true,
  },
  {
    id: "fp-002-tilt-cascade",
    trigger: "tilt-cascade-detected",
    surface: "picks",
    title: "Pause for a moment.",
    body: "Recent activity looks like a tilt cascade: multiple high-stake entries in a short window after a loss. The most common edge here is restraint.",
    actions: [
      { label: "Responsible play", href: "/responsible-play", kind: "primary" },
      { label: "Open Autopsy", href: "/autopsy", kind: "secondary" },
      { label: "Dismiss", href: "#", kind: "dismiss" },
    ],
    modal: true,
  },
  {
    id: "fp-003-stale-data",
    trigger: "stale-data-on-bet-surface",
    surface: "picks",
    title: "Data may be stale.",
    body: "This signal has not refreshed in the last few minutes. Verify the freshness pill before acting.",
    actions: [
      { label: "Refresh", href: "#", kind: "primary" },
      { label: "Methodology", href: "/methodology", kind: "secondary" },
    ],
    modal: false,
  },
  {
    id: "fp-004-no-bet-not-checked",
    trigger: "no-bet-list-not-checked",
    surface: "today",
    title: "Check the pass list first.",
    body: "The No-Bet list shows what we deliberately skipped today. Reading it is the cheapest possible edge.",
    actions: [
      { label: "Open No-Bet list", href: "/no-bet", kind: "primary" },
      { label: "Continue", href: "#", kind: "dismiss" },
    ],
    modal: false,
  },
  {
    id: "fp-005-evidence-skipped",
    trigger: "evidence-card-skipped",
    surface: "picks",
    title: "Open the evidence card.",
    body: "Galaxy never asks you to trust a signal. The evidence card shows source, freshness, factor trail, and the failure case.",
    actions: [
      { label: "Open evidence", href: "#evidence", kind: "primary" },
      { label: "Evidence chain explainer", href: "/intelligence", kind: "secondary" },
    ],
    modal: false,
  },
  {
    id: "fp-006-first-time-on-betting-surface",
    trigger: "first-time-on-betting-surface",
    surface: "picks",
    title: "First time here — quick context.",
    body: "Galaxy publishes a signal only when the calibrated gate clears. Confidence is never certainty. The No-Bet list is part of the read.",
    actions: [
      { label: "Read methodology", href: "/methodology", kind: "primary" },
      { label: "Continue to slate", href: "#", kind: "dismiss" },
    ],
    modal: false,
  },
  {
    id: "fp-007-post-loss-cooldown",
    trigger: "post-loss-within-cooldown",
    surface: "picks",
    title: "Coming off a recent loss.",
    body: "The product is biased toward restraint in this window. The pass list and Autopsy are the recommended reads.",
    actions: [
      { label: "Open Autopsy", href: "/autopsy", kind: "primary" },
      { label: "Pass list", href: "/no-bet", kind: "secondary" },
      { label: "Continue", href: "#", kind: "dismiss" },
    ],
    modal: true,
  },
];

const BY_TRIGGER: ReadonlyMap<FrictionTrigger, FrictionPrompt> = new Map(
  FRICTION_PROMPTS.map((p) => [p.trigger, p]),
);

export function promptFor(trigger: FrictionTrigger): FrictionPrompt | undefined {
  return BY_TRIGGER.get(trigger);
}

/** Hard rule: friction actions can never include a bet/stake action. */
export function isLegalAction(href: string, label: string): boolean {
  const bad = /(place bet|raise stake|increase stake|bet now|tail|fade)/i;
  if (bad.test(href) || bad.test(label)) return false;
  return true;
}
