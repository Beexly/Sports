/**
 * Autonomy Map — what the system runs by itself, and the few levers it parks.
 *
 * The owner's standing directive: this platform should operate as autonomously as
 * possible, with as little human input as possible. This module is the honest,
 * single source of truth for HOW autonomous it actually is. It classifies every
 * recurring operation and every gated decision into one of three buckets:
 *
 *   - `autonomous`              — runs itself on a schedule / on demand, no owner input.
 *   - `autonomous_within_budget`— runs itself, but inside a hard resource/cost budget
 *                                 (e.g. the Odds API quota) that can throttle it to zero.
 *   - `owner_parked`            — deliberately waits for a human, because the action is
 *                                 irreversible, spends real money, publishes externally,
 *                                 changes the model, or has legal/financial weight.
 *
 * Plus a fourth, one-time bucket:
 *   - `owner_activation`        — a single setup step to GO LIVE; once done the loop
 *                                 self-runs. These are the ONLY required human inputs to
 *                                 reach a self-operating state.
 *
 * This is a PURE module: no network, no side effects. It is the spine behind the
 * /cockpit/autonomy "watch it run itself" surface and is asserted by tests so the
 * autonomy posture can never silently drift (e.g. a money-out action must never be
 * reclassified as autonomous).
 *
 * Honesty rule: parked items are parked BY DESIGN, not by laziness. Each one names
 * the specific guardrail that holds it (a MODEL_VERSION bump, the spend governor,
 * the human-gated publish switch). Autonomy never means bypassing those bars.
 */

export type AutonomyLevel =
  | "autonomous"
  | "autonomous_within_budget"
  | "owner_parked"
  | "owner_activation";

export type AutonomyDomain =
  | "data"
  | "scoring"
  | "content"
  | "revenue"
  | "ops"
  | "intelligence";

export interface AutonomyEntry {
  readonly id: string;
  readonly name: string;
  readonly domain: AutonomyDomain;
  readonly level: AutonomyLevel;
  /** How often it runs (for recurring ops) or "on demand" / "one-time". */
  readonly cadence: string;
  /** What it does, in one honest line. */
  readonly what: string;
  /**
   * For parked / activation items: the exact guardrail or owner step that holds it.
   * For autonomous items: the hard-stop that protects the loop (budget, dedupe, kill-switch).
   */
  readonly gate: string;
  /** Pointer to the code that implements / enforces this. */
  readonly ref: string;
}

/**
 * The full map. Recurring autonomous loops first, then the budget-gated loops,
 * then the deliberately-parked levers, then the one-time activation steps.
 */
export const AUTONOMY_MAP: readonly AutonomyEntry[] = [
  // ── Autonomous: the system does this itself, no input ────────────────────────
  {
    id: "settle_picks",
    name: "Pick settlement",
    domain: "scoring",
    level: "autonomous",
    cadence: "daily cron",
    what: "Grades settled games, records win/loss, captures closing line for CLV.",
    gate: "Reads real results only; decisive-result gate; never fabricates outcomes.",
    ref: "app/api/cron/settle-picks/route.ts",
  },
  {
    id: "stale_ingestion_check",
    name: "Stale-ingestion health check",
    domain: "ops",
    level: "autonomous",
    cadence: "scheduled cron",
    what: "Detects stale sources and self-queues a deduped reliability task to the cockpit.",
    gate: "Dedupes tasks; raises a review item — never silently mutates data.",
    ref: "app/api/cron/stale-ingestion-check/route.ts",
  },
  {
    id: "jarvis_self_audit",
    name: "Jarvis operating self-audit",
    domain: "ops",
    level: "autonomous",
    cadence: "scheduled cron",
    what: "Recomputes the platform's launch/health assessment without an operator visit.",
    gate: "Read-only assessment; surfaces status + recommended actions, changes nothing.",
    ref: "app/api/cron/jarvis-snapshot/route.ts",
  },
  {
    id: "jarvis_answers",
    name: "Jarvis answers + content drafts",
    domain: "intelligence",
    level: "autonomous",
    cadence: "on demand",
    what: "Answers operator questions and drafts content via the free LLM pool — $0, keyless default.",
    gate: "Free pool first; honest-degrade if every provider is down; content stays draft-only.",
    ref: "lib/claude-api/provider-pool.ts",
  },
  {
    id: "calibration_drift_watch",
    name: "Calibration drift monitoring",
    domain: "scoring",
    level: "autonomous",
    cadence: "on settlement",
    what: "Watches reliability/Brier drift and RAISES a cockpit task when it degrades.",
    gate: "Raises a review task only — it NEVER changes model weights itself.",
    ref: "packages/prediction-engine/src/calibration-drift.ts",
  },

  // ── Autonomous within a hard budget ──────────────────────────────────────────
  {
    id: "odds_capture",
    name: "Odds API evidence capture",
    domain: "data",
    level: "autonomous_within_budget",
    cadence: "in-season cron",
    what: "Captures one sport's h2h/spreads/totals as internal evidence for CLV/replay/calibration.",
    gate: "Quota-governed: one sport/region, budgeted to a safety slice of the free credit cap; CAP_REACHED stops it.",
    ref: "lib/spend/odds-capture-governor.ts",
  },
  {
    id: "data_refresh",
    name: "Odds/line refresh",
    domain: "data",
    level: "autonomous_within_budget",
    cadence: "daily cron",
    what: "Refreshes odds/lines for in-season sports and scores new picks.",
    gate: "Free-first source ordering + in-season gate; paid feeds stay DISABLED.",
    ref: "app/api/cron/refresh-odds/route.ts",
  },
  {
    id: "player_stats_refresh",
    name: "Player-stat refresh / backfills",
    domain: "data",
    level: "autonomous_within_budget",
    cadence: "scheduled cron",
    what: "Pulls player/team stats from free, rights-cleared sources to deepen the data moat.",
    gate: "Rights-gated via the clearance engine; free-tier sources only.",
    ref: "app/api/cron/refresh-player-stats/route.ts",
  },

  // ── Owner-parked: the few human levers (by design) ───────────────────────────
  {
    id: "model_activation",
    name: "Calibration / model activation",
    domain: "scoring",
    level: "owner_parked",
    cadence: "on proof",
    what: "Turning the calibrator ON / bumping the conviction model once the sample clears 100.",
    gate: "Founder-gated: requires a MODEL_VERSION bump + CalibrationProposal audit entry. Never auto-flipped.",
    ref: "scripts/guardrails/model-freeze.mjs",
  },
  {
    id: "content_publish",
    name: "Content publishing",
    domain: "content",
    level: "owner_parked",
    cadence: "on review",
    what: "Pushing drafted blog/GSN/Beat content live to the public.",
    gate: "Human-gated: autoPublish/autoSend stay false; content is data-backed + reviewed before publish.",
    ref: "lib/airwave/source-policy.ts",
  },
  {
    id: "paid_spend",
    name: "Real money spend (beyond free tiers)",
    domain: "revenue",
    level: "owner_parked",
    cadence: "on proof",
    what: "Authorizing any paid service above the free tier (paid LLM, paid data, ads).",
    gate: "Spend Governor: proof-gated upgrade ladder; paid ads hard-DISABLED until funnel + proof.",
    ref: "lib/spend/spend-governor.ts",
  },
  {
    id: "external_actions",
    name: "External / legal / financial actions",
    domain: "ops",
    level: "owner_parked",
    cadence: "on review",
    what: "Mass email, contracts, Stripe price/subscription changes, scraping a protected source.",
    gate: "L4/L5 in the approval matrix; rights/clearance gate; never auto-executed.",
    ref: "lib/scraping/clearance-engine.ts",
  },

  // ── Owner activation: one-time setup to reach the self-running state ──────────
  {
    id: "activate_database",
    name: "Database",
    domain: "ops",
    level: "owner_activation",
    cadence: "one-time",
    what: "Set DATABASE_URL/DIRECT_URL and run migrations so real data persists.",
    gate: "Owner secret + `prisma migrate deploy`. See OWNER_ACTIVATION_RUNBOOK.",
    ref: "reports/go-live/OWNER_ACTIVATION_RUNBOOK.md",
  },
  {
    id: "activate_stripe",
    name: "Stripe billing",
    domain: "revenue",
    level: "owner_activation",
    cadence: "one-time",
    what: "Set STRIPE_SECRET_KEY + price IDs so live checkout works.",
    gate: "Owner secret + products/prices created in Stripe. See OWNER_ACTIVATION_RUNBOOK.",
    ref: "reports/go-live/OWNER_ACTIVATION_RUNBOOK.md",
  },
  {
    id: "activate_auth",
    name: "Authentication",
    domain: "ops",
    level: "owner_activation",
    cadence: "one-time",
    what: "Set NEXTAUTH_SECRET + Google OAuth so members can sign in.",
    gate: "Owner secrets. See OWNER_ACTIVATION_RUNBOOK.",
    ref: "reports/go-live/OWNER_ACTIVATION_RUNBOOK.md",
  },
  {
    id: "activate_deploy",
    name: "Deploy + schedule crons",
    domain: "ops",
    level: "owner_activation",
    cadence: "one-time",
    what: "Deploy to the host and enable the cron schedule so the autonomous loops fire.",
    gate: "Owner deploy + cron env. After this, the loops above run themselves.",
    ref: "reports/go-live/OWNER_ACTIVATION_RUNBOOK.md",
  },
];

export interface AutonomySummary {
  readonly total: number;
  readonly autonomous: number;
  readonly autonomousWithinBudget: number;
  readonly ownerParked: number;
  readonly ownerActivation: number;
  /** Share of recurring operations that run without owner input (0–1). */
  readonly recurringAutonomyShare: number;
}

const RECURRING_LEVELS: ReadonlySet<AutonomyLevel> = new Set<AutonomyLevel>([
  "autonomous",
  "autonomous_within_budget",
  "owner_parked",
]);

/** Summarize the map: counts per level + the recurring-autonomy share. */
export function summarizeAutonomy(map: readonly AutonomyEntry[] = AUTONOMY_MAP): AutonomySummary {
  const autonomous = map.filter((e) => e.level === "autonomous").length;
  const autonomousWithinBudget = map.filter((e) => e.level === "autonomous_within_budget").length;
  const ownerParked = map.filter((e) => e.level === "owner_parked").length;
  const ownerActivation = map.filter((e) => e.level === "owner_activation").length;

  // Recurring operations = everything that isn't one-time activation.
  const recurring = map.filter((e) => RECURRING_LEVELS.has(e.level));
  const recurringSelfDriving = recurring.filter(
    (e) => e.level === "autonomous" || e.level === "autonomous_within_budget",
  ).length;
  const recurringAutonomyShare =
    recurring.length === 0 ? 0 : recurringSelfDriving / recurring.length;

  return {
    total: map.length,
    autonomous,
    autonomousWithinBudget,
    ownerParked,
    ownerActivation,
    recurringAutonomyShare,
  };
}

/** All entries in a given autonomy level. */
export function entriesByLevel(
  level: AutonomyLevel,
  map: readonly AutonomyEntry[] = AUTONOMY_MAP,
): readonly AutonomyEntry[] {
  return map.filter((e) => e.level === level);
}
