/**
 * First-party audience churn features: per-user trailing-30d daily aggregates
 *
 * Research port: arXiv:2309.14390
 * Normalized lane: props_dfs | Doctrine: PROPRIETARY_EDGE
 *
 * Builds the engagement feature row the churn model needs: per-user daily aggregates over a trailing 30-day window from first-party events (site pageviews, newsletter opens/clicks, X engagement with @GalaxySportsHQ, Kit-page visits). Pure aggregation; the Transformer-vs-GBT shootout is a downstream training concern.
 *
 * ACCEPTANCE GATE: ADAPT the Transformer encoder only if it beats the GBT baseline by >= 0.03 AUC on at least 3 of 4 weeks in the time-ordered test window. Live-data gate -> GSE_CHURN_TRANSFORMER_ENABLED flag (default false).
 */

export type EngagementKind = "pageview" | "newsletter_open" | "newsletter_click" | "x_engagement" | "kit_visit";

export interface EngagementEvent {
  userId: string;
  ts: number; // epoch ms
  kind: EngagementKind;
}

export interface EngagementAggregate {
  userId: string;
  windowDays: number;
  pageviews: number;
  newsletterOpens: number;
  newsletterClicks: number;
  xEngagements: number;
  kitVisits: number;
  activeDays: number;
}

export const CHURN_WINDOW_DAYS = 30;

/** Aggregate a user's trailing-N-day engagement from first-party events. */
export function aggregateEngagement(
  events: EngagementEvent[],
  userId: string,
  nowMs: number,
  windowDays = CHURN_WINDOW_DAYS,
): EngagementAggregate {
  const cutoff = nowMs - windowDays * 86_400_000;
  const inWindow = events.filter((e) => e.userId === userId && e.ts >= cutoff && e.ts <= nowMs);
  const days = new Set(inWindow.map((e) => new Date(e.ts).toISOString().slice(0, 10)));
  const count = (k: EngagementKind): number => inWindow.filter((e) => e.kind === k).length;
  return {
    userId,
    windowDays,
    pageviews: count("pageview"),
    newsletterOpens: count("newsletter_open"),
    newsletterClicks: count("newsletter_click"),
    xEngagements: count("x_engagement"),
    kitVisits: count("kit_visit"),
    activeDays: days.size,
  };
}

/** Live-data gate: Transformer must beat GBT by >=0.03 AUC on >=3/4 weeks. */
export const GSE_CHURN_TRANSFORMER_ENABLED = false;

