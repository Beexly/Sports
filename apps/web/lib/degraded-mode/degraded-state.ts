/**
 * Degraded Mode runtime helpers.
 *
 * Honest fallbacks for each external dependency. Galaxy never lies to
 * appear functional — when something is degraded, we say so and route
 * to a safe state.
 *
 * See docs/ops/contingency/RESILIENCE_RUNBOOK.md for the ladder and
 * docs/ops/contingency/DATA_PROVIDER_FAILOVER.md for per-provider rules.
 */

export type Dependency =
  | "live-odds"
  | "ai-content"
  | "ai-coach"
  | "telemetry"
  | "database"
  | "stripe"
  | "reports"
  | "decision-room"
  | "cron"
  | "source-confidence";

export type DependencyHealth = "live" | "degraded" | "unavailable";

export interface DegradedDecision {
  readonly dependency: Dependency;
  readonly health: DependencyHealth;
  /** Should the consumer hide the feature, render fallback, or proceed? */
  readonly action: "proceed" | "fallback" | "hide";
  /** Short, user-facing reason for the fallback. */
  readonly userMessage?: string;
}

const FALLBACK_USER_MESSAGES: Readonly<Record<Dependency, string>> = {
  "live-odds": "Live odds data temporarily unavailable — showing cached or sample values.",
  "ai-content": "Content generation is paused — showing previously published material only.",
  "ai-coach": "Decision Coach is using its static answer set while live AI is paused.",
  telemetry: "Product analytics are paused — no impact on what you see.",
  database: "Some account features are temporarily unavailable while we restore data services.",
  stripe: "New subscriptions are temporarily paused. Existing subscriptions are unaffected.",
  reports: "Report details are delayed — the report hub remains available.",
  "decision-room": "Decision Room temporarily unavailable for this game — see Today's Board for the slate view.",
  cron: "Scheduled refresh is delayed — freshness labels reflect the actual data age.",
  "source-confidence": "Evidence health is low for this signal — treat as lower confidence.",
};

/** Map a health signal to a fallback decision. Pure function. */
export function decideFallback(dependency: Dependency, health: DependencyHealth): DegradedDecision {
  if (health === "live") {
    return { dependency, health, action: "proceed" };
  }
  if (health === "degraded") {
    return {
      dependency,
      health,
      action: "fallback",
      userMessage: FALLBACK_USER_MESSAGES[dependency],
    };
  }
  // unavailable
  return {
    dependency,
    health,
    action: dependency === "decision-room" || dependency === "reports" ? "hide" : "fallback",
    userMessage: FALLBACK_USER_MESSAGES[dependency],
  };
}

/**
 * Quick check derived from the env state. This is the cheapest signal —
 * higher-fidelity monitors live in the workers and feed back via
 * `decideFallback`.
 */
export function liveOddsHealthFromEnv(): DependencyHealth {
  if (!process.env.THE_ODDS_API_KEY) return "unavailable";
  return "live";
}

export function stripeHealthFromEnv(): DependencyHealth {
  if (!process.env.STRIPE_SECRET_KEY) return "unavailable";
  return "live";
}

export function databaseHealthFromEnv(): DependencyHealth {
  if (!process.env.DATABASE_URL) return "unavailable";
  return "live";
}

export function aiContentHealthFromEnv(): DependencyHealth {
  if (!process.env.ANTHROPIC_API_KEY) return "unavailable";
  return "live";
}

/** The contract is honest: a degraded read never silently looks like a live read. */
export function isDegraded(decision: DegradedDecision): boolean {
  return decision.action !== "proceed";
}
