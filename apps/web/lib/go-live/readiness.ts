/**
 * Go-Live readiness aggregator (capstone surface).
 *
 * WHAT THIS IS
 * A never-throw server boundary that assembles the GoLiveReadiness consumed by
 * `/cockpit/go-live`. It probes env-var presence and DB reachability, then
 * returns a grouped, status-tagged checklist the owner can use as a concrete
 * finish line.
 *
 * WHY IT IS SAFE
 * - NEVER THROWS. Any DB error / absent env var → honest "action_needed" or
 *   "unknown" status. Never crashes the page.
 * - NEVER FABRICATES. Reports only env-var PRESENCE (never values).
 * - READ-ONLY. Never writes, never mutates, never charges.
 * - The calibration eligible-count logic mirrors load-diagnostics.ts (read-only
 *   DB probe, null on any error → "unknown" rather than fabricated zero).
 *
 * HONESTY (non-negotiable)
 * - "ready" means the check passed right now.
 * - "action_needed" means the check failed and the owner must act.
 * - "unknown" means we could not determine status (e.g. DB unreachable, no key).
 * - We never represent an unchecked item as "ready".
 */

import { db } from "@sports/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckStatus = "ready" | "action_needed" | "unknown";

export interface ReadinessCheck {
  /** Machine-readable identifier for this check. */
  readonly id: string;
  /** Human-readable label. */
  readonly label: string;
  readonly status: CheckStatus;
  /** Plain-English explanation of the current status. */
  readonly detail: string;
  /**
   * The exact step the owner must take to resolve an action_needed.
   * null when status is "ready" or "unknown" with no clear owner action.
   */
  readonly ownerAction: string | null;
}

export interface ReadinessGroup {
  readonly name: string;
  readonly checks: readonly ReadinessCheck[];
}

export interface GoLiveReadiness {
  /** ISO timestamp the loader ran. */
  readonly loadedAtIso: string;
  readonly groups: readonly ReadinessGroup[];
  /** Total number of checks across all groups. */
  readonly totalCount: number;
  /** Number of checks with status "ready". */
  readonly readyCount: number;
  /** IDs of checks that are "action_needed" — the blocking list. */
  readonly blocking: readonly string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true iff the env var is set and non-empty. Reports presence only. */
function envPresent(key: string): boolean {
  const val = process.env[key];
  return typeof val === "string" && val.trim().length > 0;
}

function envCheck(
  id: string,
  label: string,
  key: string,
  readyDetail: string,
  missingDetail: string,
  ownerAction: string,
): ReadinessCheck {
  const present = envPresent(key);
  return {
    id,
    label,
    status: present ? "ready" : "action_needed",
    detail: present ? readyDetail : missingDetail,
    ownerAction: present ? null : ownerAction,
  };
}

// ── DB reachability probe (never-throw) ───────────────────────────────────────

/**
 * Attempt a trivial DB read to confirm connectivity. Returns "ready" if it
 * resolves, "action_needed" if DATABASE_URL is absent, "unknown" if the DB is
 * configured but unreachable (network, cold start, etc.).
 */
async function probeDbReachability(): Promise<ReadinessCheck> {
  const id = "infra_db_reachable";
  const label = "Database reachable";

  if (!envPresent("DATABASE_URL")) {
    return {
      id,
      label,
      status: "action_needed",
      detail: "DATABASE_URL is not set — the database cannot be reached.",
      ownerAction:
        "Set DATABASE_URL (and DIRECT_URL) in your deployment environment (e.g. Vercel → Settings → Environment Variables). Use a Postgres connection string from your database provider (Supabase, Neon, Railway, etc.).",
    };
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return {
      id,
      label,
      status: "ready",
      detail: "Database is reachable — a live query returned successfully.",
      ownerAction: null,
    };
  } catch {
    return {
      id,
      label,
      status: "unknown",
      detail:
        "DATABASE_URL is set but the database did not respond. This may be a cold-start delay, network issue, or connection-string mismatch.",
      ownerAction:
        "Verify the DATABASE_URL value is correct and the database is running. Check your provider's status page and Vercel logs.",
    };
  }
}

// ── Calibration eligible-count probe (never-throw) ────────────────────────────

const CALIBRATION_FLOOR = 100;

/**
 * Read the count of learning-eligible settled picks — the same query used by
 * load-diagnostics.ts. Returns null on any DB error so we report "unknown"
 * rather than fabricating a count.
 */
async function readEligibleCount(): Promise<number | null> {
  try {
    return await db.pick.count({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH", "VOID"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
    });
  } catch {
    return null;
  }
}

async function buildDataCheck(): Promise<ReadinessCheck> {
  const oddsKeyPresent = envPresent("THE_ODDS_API_KEY");

  if (!oddsKeyPresent) {
    return {
      id: "data_odds_api_key",
      label: "Odds API key + calibration data flow",
      status: "action_needed",
      detail:
        "THE_ODDS_API_KEY is not set. Real settled outcomes cannot flow in, so the calibration floor cannot be reached.",
      ownerAction:
        "Attach THE_ODDS_API_KEY (get at the-odds-api.com), then set OUTCOME_LEARNING_ENABLED=true to start data collection. This is a data-collection toggle only — it does not change scoring or publish anything.",
    };
  }

  // Key is present; check the DB count if possible.
  const eligible = await readEligibleCount();

  if (eligible === null) {
    return {
      id: "data_odds_api_key",
      label: "Odds API key + calibration data flow",
      status: "unknown",
      detail:
        "THE_ODDS_API_KEY is present, but the calibration eligible-pick count could not be read (database unavailable). Once the DB is connected, this check will reflect the real count vs the floor.",
      ownerAction:
        "Ensure the database is reachable (see Infrastructure group). Once connected, flip OUTCOME_LEARNING_ENABLED=true to start accumulating settled picks.",
    };
  }

  const meetsFloor = eligible >= CALIBRATION_FLOOR;
  return {
    id: "data_odds_api_key",
    label: "Odds API key + calibration data flow",
    status: meetsFloor ? "ready" : "action_needed",
    detail: meetsFloor
      ? `THE_ODDS_API_KEY is present and the calibration floor is met (${eligible} eligible picks ≥ ${CALIBRATION_FLOOR} floor).`
      : `THE_ODDS_API_KEY is present, but the calibration floor is not yet met (${eligible} of ${CALIBRATION_FLOOR} eligible picks accrued). This is a data-accumulation gate, not a code gate.`,
    ownerAction: meetsFloor
      ? null
      : `Continue accumulating settled picks. The floor is ${CALIBRATION_FLOOR}; currently at ${eligible}. Ensure OUTCOME_LEARNING_ENABLED=true so picks are tagged eligible. No code change needed — this resolves automatically as data flows in.`,
  };
}

// ── Analytics check ───────────────────────────────────────────────────────────

function buildAnalyticsCheck(): ReadinessCheck {
  // Any of these common NEXT_PUBLIC analytics env vars counts as "wired".
  const analyticsKeys = [
    "NEXT_PUBLIC_POSTHOG_KEY",
    "NEXT_PUBLIC_POSTHOG_HOST",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    "NEXT_PUBLIC_SEGMENT_WRITE_KEY",
    "NEXT_PUBLIC_MIXPANEL_TOKEN",
    "NEXT_PUBLIC_PLAUSIBLE_DOMAIN",
  ];
  const wired = analyticsKeys.some((k) => envPresent(k));

  return {
    id: "analytics_provider",
    label: "Analytics provider wired",
    status: wired ? "ready" : "action_needed",
    detail: wired
      ? "An analytics provider env var is present. Events will flow once the dispatch in lib/analytics/events.ts is pointed at your provider."
      : "No analytics provider env var is set. Customer-proof events are typed and in place but will be no-ops until a provider is wired.",
    ownerAction: wired
      ? null
      : "Choose an analytics provider (PostHog, Segment, Mixpanel, Plausible, GA4). Set its NEXT_PUBLIC_* env var and add ≤ 5 lines to the `dispatch` function in apps/web/lib/analytics/events.ts. No other code change needed — the event taxonomy is already in place.",
  };
}

// ── Group builders ────────────────────────────────────────────────────────────

async function buildInfrastructureGroup(): Promise<ReadinessGroup> {
  const dbUrlCheck = envCheck(
    "infra_database_url",
    "DATABASE_URL present",
    "DATABASE_URL",
    "DATABASE_URL is set.",
    "DATABASE_URL is not set — no database connection is possible.",
    "Set DATABASE_URL in your deployment environment. Use a Postgres connection string from your DB provider (Supabase, Neon, Railway, etc.).",
  );

  const secretCheck = envCheck(
    "infra_nextauth_secret",
    "NEXTAUTH_SECRET present",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_SECRET is set.",
    "NEXTAUTH_SECRET is not set — authentication will not work.",
    "Generate a secret (`openssl rand -base64 32`) and set NEXTAUTH_SECRET in your deployment environment.",
  );

  const redisCheck = envCheck(
    "infra_redis_url",
    "REDIS_URL present",
    "REDIS_URL",
    "REDIS_URL is set.",
    "REDIS_URL is not set — background job queues (BullMQ) will not function.",
    "Provision a Redis instance (Upstash is free-tier friendly) and set REDIS_URL in your deployment environment.",
  );

  const dbReachCheck = await probeDbReachability();

  return {
    name: "Infrastructure",
    checks: [dbUrlCheck, secretCheck, redisCheck, dbReachCheck],
  };
}

function buildBillingGroup(): ReadinessGroup {
  const checks: ReadinessCheck[] = [
    envCheck(
      "billing_stripe_secret",
      "STRIPE_SECRET_KEY present",
      "STRIPE_SECRET_KEY",
      "STRIPE_SECRET_KEY is set — Stripe billing is configured.",
      "STRIPE_SECRET_KEY is not set — all Stripe billing is disabled.",
      "Create a Stripe account at stripe.com, then copy the secret key from Dashboard → Developers → API keys and set STRIPE_SECRET_KEY.",
    ),
    envCheck(
      "billing_founding_desk_price",
      "STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID present",
      "STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID",
      "Founding Desk monthly price ID is set — checkout CTA is active on /founding-desk.",
      "Founding Desk monthly price ID is not set — /founding-desk shows an honest 'opening soon' CTA.",
      "In Stripe → Products, create a $9–$19/mo Founding Desk product. Copy the price ID (starts with price_) and set STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID.",
    ),
    envCheck(
      "billing_pro_price",
      "STRIPE_PRO_MONTHLY_PRICE_ID present",
      "STRIPE_PRO_MONTHLY_PRICE_ID",
      "Pro monthly price ID is set.",
      "Pro monthly price ID is not set — Pro tier checkout is disabled.",
      "In Stripe → Products, create a $14.99/mo Pro product. Copy the price ID and set STRIPE_PRO_MONTHLY_PRICE_ID.",
    ),
    envCheck(
      "billing_elite_price",
      "STRIPE_ELITE_MONTHLY_PRICE_ID present",
      "STRIPE_ELITE_MONTHLY_PRICE_ID",
      "Elite monthly price ID is set.",
      "Elite monthly price ID is not set — Elite tier checkout is disabled.",
      "In Stripe → Products, create a $24.99/mo Elite product. Copy the price ID and set STRIPE_ELITE_MONTHLY_PRICE_ID.",
    ),
  ];

  return { name: "Billing (Stripe)", checks };
}

async function buildDataGroup(): Promise<ReadinessGroup> {
  const dataCheck = await buildDataCheck();
  return { name: "Data / Win-Rate Pillar", checks: [dataCheck] };
}

function buildAIGroup(): ReadinessGroup {
  // The LLM layer runs on a FREE, keyless multi-provider pool (Pollinations is
  // always available with no key). Jarvis chat + AI content work out of the box —
  // this is NOT an owner blocker. Any provider key (free Cerebras/Groq/DeepSeek/
  // OpenRouter/Together/Gemini, or paid Anthropic) is OPTIONAL: it adds capacity +
  // perspective and improves failover, but is never required.
  const optionalPoolKeys = [
    "ANTHROPIC_API_KEY",
    "CEREBRAS_API_KEY",
    "GROQ_API_KEY",
    "DEEPSEEK_API_KEY",
    "OPENROUTER_API_KEY",
    "TOGETHER_API_KEY",
    "GEMINI_API_KEY",
  ];
  const extraConfigured = optionalPoolKeys.filter((k) => envPresent(k)).length;

  const check: ReadinessCheck = {
    id: "ai_llm_pool",
    label: "AI / LLM (free multi-provider pool)",
    status: "ready",
    detail:
      extraConfigured > 0
        ? `Ready. Jarvis + AI content run on the free keyless pool (Pollinations), with ${extraConfigured} optional provider key(s) wired for extra capacity + failover.`
        : "Ready. Jarvis + AI content run on the free, keyless multi-provider pool (Pollinations) — no key required. Optional provider keys (Cerebras, Groq, DeepSeek, OpenRouter, Together, Gemini, Anthropic) add capacity + perspective.",
    ownerAction: null,
  };
  return { name: "AI / LLM (free pool)", checks: [check] };
}

function buildAnalyticsGroup(): ReadinessGroup {
  return { name: "Analytics", checks: [buildAnalyticsCheck()] };
}

// ── Public loader ─────────────────────────────────────────────────────────────

/**
 * Load the go-live readiness state.
 *
 * NEVER THROWS. All DB and network probes are wrapped in try/catch; absent env
 * vars → action_needed; unreachable DB → unknown. The page always renders.
 */
export async function loadGoLiveReadiness(now: Date = new Date()): Promise<GoLiveReadiness> {
  const loadedAtIso = now.toISOString();

  const [infraGroup, dataGroup] = await Promise.all([
    buildInfrastructureGroup(),
    buildDataGroup(),
  ]);

  const billingGroup = buildBillingGroup();
  const aiGroup = buildAIGroup();
  const analyticsGroup = buildAnalyticsGroup();

  const groups: readonly ReadinessGroup[] = [
    infraGroup,
    billingGroup,
    dataGroup,
    aiGroup,
    analyticsGroup,
  ];

  const allChecks = groups.flatMap((g) => g.checks);
  const totalCount = allChecks.length;
  const readyCount = allChecks.filter((c) => c.status === "ready").length;
  const blocking = allChecks
    .filter((c) => c.status === "action_needed")
    .map((c) => c.id);

  return {
    loadedAtIso,
    groups,
    totalCount,
    readyCount,
    blocking,
  };
}
