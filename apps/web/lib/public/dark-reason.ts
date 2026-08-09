/**
 * Unified public "why is this surface dark?" taxonomy.
 * Quiet board ≠ outage. Stale odds ≠ engine death. Seed purge ≠ bootstrap.
 */

export type PublicDarkReason =
  | "feature_gate"
  | "bootstrap"
  | "stale_odds_sla"
  | "quiet_board_no_slate"
  | "selective_empty"
  | "seed_excluded"
  | "stub_mode"
  | "not_evaluated"
  | "calibration_unpublished"
  | "unknown";

export type PublicDarkCopy = {
  readonly reason: PublicDarkReason;
  readonly title: string;
  readonly body: string;
  readonly isOutage: boolean;
};

const COPY: Record<PublicDarkReason, Omit<PublicDarkCopy, "reason">> = {
  feature_gate: {
    title: "Surface gated",
    body: "This surface is off by product gate until readiness clears. Not a site outage.",
    isOutage: false,
  },
  bootstrap: {
    title: "Bootstrap mode",
    body: "Public picks stay dark while the system is in bootstrap — demo/seed eras are not shown as live.",
    isOutage: false,
  },
  stale_odds_sla: {
    title: "Odds refresh outside SLA",
    body: "Market-context board needs a fresh odds insert. Model-signal board can still open when slate is fresh — book lines are never invented.",
    isOutage: false,
  },
  quiet_board_no_slate: {
    title: "Quiet board",
    body: "No recent published non-seed model signals within the refresh window. The model said no — not a book outage.",
    isOutage: false,
  },
  selective_empty: {
    title: "Selective path empty",
    body: "Published candidates were filtered by selective ranking rules. Empty is an honest no-bet, not a failure.",
    isOutage: false,
  },
  seed_excluded: {
    title: "Seed rows excluded",
    body: "Development seed picks never appear on public production surfaces.",
    isOutage: false,
  },
  stub_mode: {
    title: "Stub database",
    body: "This environment has no live database — empty by design.",
    isOutage: false,
  },
  not_evaluated: {
    title: "Not evaluated",
    body: "Game is on the board but the model has not published a pick (unevaluated / gated).",
    isOutage: false,
  },
  calibration_unpublished: {
    title: "Performance unpublished",
    body: "Track record stays dark until calibration eligibility is GREEN and publish policy allows it.",
    isOutage: false,
  },
  unknown: {
    title: "Unavailable",
    body: "Surface is dark. Check ops public-surface-truth for the live reason.",
    isOutage: false,
  },
};

export function publicDarkCopy(reason: PublicDarkReason): PublicDarkCopy {
  return { reason, ...COPY[reason] };
}

/** Map common API error codes / hints to taxonomy. */
export function classifyPublicDarkHint(hint: string | null | undefined): PublicDarkReason {
  const h = (hint ?? "").toLowerCase();
  if (!h) return "unknown";
  if (h.includes("stale") || h.includes("refresh sla") || h.includes("odds insert")) return "stale_odds_sla";
  if (h.includes("quiet") || h.includes("no recent") || h.includes("slate")) return "quiet_board_no_slate";
  if (h.includes("bootstrap")) return "bootstrap";
  if (h.includes("selective")) return "selective_empty";
  if (h.includes("seed")) return "seed_excluded";
  if (h.includes("stub")) return "stub_mode";
  if (h.includes("feature") || h.includes("gate") || h.includes("disabled")) return "feature_gate";
  if (h.includes("calibration") || h.includes("performance") || h.includes("proven")) return "calibration_unpublished";
  if (h.includes("unevaluated") || h.includes("not evaluated") || h.includes("gated")) return "not_evaluated";
  return "unknown";
}
