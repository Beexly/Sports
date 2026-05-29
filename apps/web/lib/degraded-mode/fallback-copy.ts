/**
 * Fallback Copy registry.
 *
 * Pre-approved, trust-gate-clean copy strings used when a feature is
 * in a degraded or unavailable state.
 *
 * Rules:
 *  - Plain English. No euphemism.
 *  - No certainty language.
 *  - No "we're working on it" filler — say exactly what is happening.
 *  - No marketing in a fallback.
 */

export interface FallbackCopy {
  /** Short title for the fallback card (1-3 words). */
  readonly title: string;
  /** Single-sentence explanation of what the user is seeing. */
  readonly body: string;
  /** Optional secondary action label. */
  readonly actionLabel?: string;
  /** Optional secondary action href. */
  readonly actionHref?: string;
}

export const FALLBACK_COPY = {
  liveOddsUnavailable: {
    title: "Live odds paused",
    body:
      "The odds data feed is currently unavailable. Cached signals are labeled with their actual freshness — " +
      "no published picks are derived from missing data.",
    actionLabel: "Read the no-bet doctrine",
    actionHref: "/no-bet",
  },
  liveOddsStale: {
    title: "Cached data only",
    body:
      "Live data is delayed. Numbers shown here may not reflect the latest line movement. " +
      "Freshness labels show the actual age of each data point.",
    actionLabel: "See methodology",
    actionHref: "/methodology",
  },
  aiContentPaused: {
    title: "Content generation paused",
    body:
      "Automated content is paused. Previously published material remains available. " +
      "No content from this period was published.",
  },
  aiCoachCanned: {
    title: "Static answers",
    body:
      "The Decision Coach is using its static answer set. Questions outside the prompt registry " +
      "are not answered live. See methodology for the long-form explanation.",
    actionLabel: "See methodology",
    actionHref: "/methodology",
  },
  telemetryPaused: {
    title: "Analytics paused",
    body: "Product analytics are paused. This has no impact on what you see — only on our internal measurement.",
  },
  databaseDegraded: {
    title: "Account services degraded",
    body:
      "Account-related features (saving cards, tracking decisions) are temporarily unavailable. " +
      "Public surfaces remain functional.",
  },
  stripeDisabled: {
    title: "New subscriptions paused",
    body:
      "New subscriptions cannot be started right now. Existing subscribers retain full access. " +
      "Try again later or contact support.",
    actionLabel: "See pricing",
    actionHref: "/pricing",
  },
  reportsDelayed: {
    title: "Reports delayed",
    body:
      "Detailed report pages are delayed. The report hub remains available — published reports are unaffected.",
    actionLabel: "Open reports hub",
    actionHref: "/reports",
  },
  decisionRoomUnavailable: {
    title: "Decision Room unavailable",
    body:
      "This game's Decision Room is temporarily unavailable. Today's Board has the slate-wide view.",
    actionLabel: "Back to Today's Board",
    actionHref: "/today",
  },
  cronDelayed: {
    title: "Refresh delayed",
    body:
      "Scheduled data refresh is delayed. Freshness labels reflect the actual age of each data point — " +
      "nothing is shown as live unless it is.",
  },
  lowSourceConfidence: {
    title: "Lower confidence",
    body:
      "Evidence health for this signal is below the publish threshold. Treat the read as lower confidence " +
      "and check the evidence drawer for source detail.",
    actionLabel: "What does evidence say?",
    actionHref: "/methodology",
  },
} as const satisfies Record<string, FallbackCopy>;

export type FallbackCopyKey = keyof typeof FALLBACK_COPY;

export function getFallbackCopy(key: FallbackCopyKey): FallbackCopy {
  return FALLBACK_COPY[key];
}
