/**
 * Revenue-state LOADER (Workstream M1 — cockpit revenue nervous system).
 *
 * WHAT THIS IS
 * The never-throw server boundary that assembles the RevenueState consumed by
 * `/cockpit/revenue`.  It attempts a READ-ONLY Stripe subscription count when
 * STRIPE_SECRET_KEY is present, and fills the full lane/activation config
 * statically from the committed doctrine in revenue-operating-system.md.
 *
 * WHY IT IS SAFE
 * - READ-ONLY: never writes, never mutates a subscription, never charges.
 * - NEVER THROWS. Any Stripe error / unconfigured key → honest null with a note.
 * - NEVER FABRICATES. `paidSubscribers` and `mrr` are either real Stripe counts
 *   or explicitly `null` (not 0 dressed as a metric).
 * - Lane status is static doctrine — it is honestly "not_started" for most lanes
 *   today; that truthfulness is itself decision-support.
 * - Owner activation list reports only env-var presence (never the key value).
 *
 * HONESTY (non-negotiable)
 * - `paidSubscribers: null`  ≠  `paidSubscribers: 0`.  null means unknown; 0 means
 *   confirmed zero.  We only return 0 when Stripe confirms it.
 * - MRR is derived only from real Stripe subscription plan amounts — never invented.
 * - `dataMode: "live"` only when Stripe returned a real response.
 */

import Stripe from "stripe";

// ── Data-mode label ─────────────────────────────────────────────────────────

export type RevenueDataMode = "live" | "unavailable";

// ── Revenue lane ─────────────────────────────────────────────────────────────

export type LaneStatus =
  | "not_started"
  | "scaffolding"
  | "in_progress"
  | "active"
  | "paused";

export interface RevenueLane {
  /** Priority rank from the doctrine (1 = highest). */
  readonly priority: number;
  readonly name: string;
  readonly status: LaneStatus;
  /** Which internal agent owns this lane. */
  readonly ownerAgent: string;
  readonly nextAction: string;
  /** The owner credential or external step blocking launch.  null if not blocked. */
  readonly blockedOn: string | null;
}

// ── Owner activation item ─────────────────────────────────────────────────────

export interface ActivationItem {
  /** The env var name (never printed as a value). */
  readonly key: string;
  /** True iff the env var is present and non-empty in process.env. */
  readonly present: boolean;
  /** Plain-English explanation of what this key unlocks. */
  readonly why: string;
}

// ── Subscription snapshot ─────────────────────────────────────────────────────

export interface SubscriptionSnapshot {
  /**
   * Count of active Stripe subscriptions. null when Stripe is unreachable or
   * unconfigured — never silently coerced to 0.
   */
  readonly paidSubscribers: number | null;
  /**
   * Monthly Recurring Revenue in USD derived from real Stripe plan amounts.
   * null when Stripe is unconfigured or we cannot compute it honestly.
   */
  readonly mrr: number | null;
  /**
   * ARR run-rate in USD (mrr × 12).  null whenever mrr is null.
   */
  readonly arr: number | null;
  /**
   * ISO timestamp of the Stripe read, or null when unavailable.
   */
  readonly readAtIso: string | null;
}

// ── RevenueState ─────────────────────────────────────────────────────────────

export interface RevenueState {
  readonly dataMode: RevenueDataMode;
  /** ISO timestamp the loader ran. */
  readonly loadedAtIso: string;
  /** Plain-language provenance note (esp. why Stripe is unavailable). */
  readonly note: string;
  readonly subscriptions: SubscriptionSnapshot;
  readonly lanes: readonly RevenueLane[];
  readonly activation: readonly ActivationItem[];
}

// ── Static lane doctrine ──────────────────────────────────────────────────────
// Source: docs/revenue/revenue-operating-system.md, "Revenue lanes & priority order"
// Status is HONESTLY "not_started" for most lanes today — that is correct.

const LANES: readonly RevenueLane[] = [
  {
    priority: 1,
    name: "Founding Desk",
    status: "scaffolding",
    ownerAgent: "BOBBY",
    nextAction:
      "Create the Stripe product + set STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID to activate the checkout CTA on /founding-desk.",
    blockedOn: "Stripe Founding Desk price ID (STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID)",
  },
  {
    priority: 2,
    name: "Ask Galaxy concierge",
    status: "scaffolding",
    ownerAgent: "SCOUT",
    nextAction:
      "Wire the /ask-galaxy intake form to the AskGalaxySubmission model; implement honest manual classification (action / caution / no-bet / insufficient data).",
    blockedOn: null,
  },
  {
    priority: 3,
    name: "Newsletter (Desk Note free / Premium Brief paid)",
    status: "not_started",
    ownerAgent: "FLARE",
    nextAction:
      "Choose an email provider (Resend, Buttondown, ConvertKit) and wire the single dispatch point in lib/analytics/events.ts.",
    blockedOn: "Email provider API key (owner creates account + sets env var)",
  },
  {
    priority: 4,
    name: "YouTube",
    status: "not_started",
    ownerAgent: "AVA",
    nextAction:
      "Publish the first Galaxy Desk brief as a YouTube script; the content factory (/cockpit/content-factory) generates derivative formats from one Desk brief.",
    blockedOn: "Owner YouTube channel (external account)",
  },
  {
    priority: 5,
    name: "TikTok / Instagram",
    status: "not_started",
    ownerAgent: "AVA",
    nextAction:
      "Publish 3 Shorts/Reels from the first Desk brief; test hook formats. DM/visual trust → funnel.",
    blockedOn: "Owner TikTok + Instagram accounts (external)",
  },
  {
    priority: 6,
    name: "Podcast (audio Desk)",
    status: "not_started",
    ownerAgent: "AVA",
    nextAction:
      "Record audio version of first Desk brief; choose a host (Transistor, Anchor). Creates sponsor inventory.",
    blockedOn: "Owner podcast host account (external)",
  },
  {
    priority: 7,
    name: "Digital products",
    status: "not_started",
    ownerAgent: "BOBBY",
    nextAction:
      "Define product set (No-Bet Journal $9, Market Mirage Playbook $19). Create Stripe one-time price IDs and a /shop scaffold.",
    blockedOn: "Stripe one-time price IDs (owner creates in Stripe)",
  },
  {
    priority: 8,
    name: "Sponsorships ($50–$1,500 safe-category tiers)",
    status: "not_started",
    ownerAgent: "BOBBY",
    nextAction:
      "Build /cockpit/sponsors pipeline (lead → contacted → interested → proposal → active). Sell niche trust, not fake reach.",
    blockedOn: null,
  },
  {
    priority: 9,
    name: "Merch (print-on-demand; phrase-test first)",
    status: "not_started",
    ownerAgent: "FLARE",
    nextAction:
      "Phrase-test the best lines from existing copy. Set up a Printful/Printify store once a phrase resonates.",
    blockedOn: "Owner POD account + phrase validation (external)",
  },
  {
    priority: 10,
    name: "Affiliates (compliance-first; sportsbook later)",
    status: "not_started",
    ownerAgent: "GAUGE",
    nextAction:
      "Build /cockpit/affiliate-registry with disclosure language, risk rating, and geo/state compliance. Safe-category affiliates first.",
    blockedOn: "Affiliate partner agreements + FTC disclosure review (owner action)",
  },
  {
    priority: 11,
    name: "Community (Desk Room / Signal Room)",
    status: "not_started",
    ownerAgent: "PULSE",
    nextAction:
      "Choose community platform (Discord, Circle, Slack). Wire responsible-language moderation before launch.",
    blockedOn: "Owner community platform account (external)",
  },
  {
    priority: 12,
    name: "B2B Game Night Packs ($99/mo)",
    status: "not_started",
    ownerAgent: "BOBBY",
    nextAction:
      "Build the B2B pack landing page + Stripe recurring price. Target bars, leagues, fantasy creators.",
    blockedOn: "Stripe B2B price ID + first outreach (owner action)",
  },
  {
    priority: 13,
    name: "White-label / data widgets",
    status: "not_started",
    ownerAgent: "VECTOR",
    nextAction:
      "Defer until consumer proof is established (≥ 500 settled picks + verified CLV ≥ 52.4%). Build the embeddable widget scaffold then.",
    blockedOn: "Consumer proof milestone (data-blocked)",
  },
];

// ── Owner activation checklist ────────────────────────────────────────────────
// Reports only env-var PRESENCE — never the key value.

function buildActivationList(): readonly ActivationItem[] {
  const check = (key: string): boolean => {
    const val = process.env[key];
    return typeof val === "string" && val.trim().length > 0;
  };

  return [
    {
      key: "STRIPE_SECRET_KEY",
      present: check("STRIPE_SECRET_KEY"),
      why: "Required for all subscription billing, MRR reads, and Founding Desk checkout. Create at stripe.com → Developers → API keys.",
    },
    {
      key: "STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID",
      present: check("STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID"),
      why: "Unlocks the Founding Desk checkout CTA on /founding-desk. Create a $9–$19/mo product in Stripe → Products, copy the price ID here.",
    },
    {
      key: "STRIPE_PRO_MONTHLY_PRICE_ID",
      present: check("STRIPE_PRO_MONTHLY_PRICE_ID"),
      why: "Required for Pro tier monthly checkout. Create in Stripe → Products.",
    },
    {
      key: "STRIPE_ELITE_MONTHLY_PRICE_ID",
      present: check("STRIPE_ELITE_MONTHLY_PRICE_ID"),
      why: "Required for Elite tier monthly checkout. Create in Stripe → Products.",
    },
    {
      key: "THE_ODDS_API_KEY",
      present: check("THE_ODDS_API_KEY"),
      why: "Required for real settled outcomes to flow in and accrue toward the calibration floor. Get at the-odds-api.com. Flip OUTCOME_LEARNING_ENABLED after attaching.",
    },
    {
      key: "ANTHROPIC_API_KEY",
      present: check("ANTHROPIC_API_KEY"),
      why: "Required for the AI content layer (AVA, content generation). Does not change scoring or make public claims. Get at console.anthropic.com.",
    },
    {
      key: "DATABASE_URL",
      present: check("DATABASE_URL"),
      why: "Required for all persistent data: picks, subscriptions, users, analytics. Set in Vercel environment variables.",
    },
  ];
}

// ── Stripe read (READ-ONLY, never-throw) ──────────────────────────────────────

/**
 * Attempt a read-only Stripe subscription count and derive MRR.
 *
 * Uses a locally-constructed Stripe client with the env key so we can safely
 * catch "key not set" without importing the pre-built singleton (which would
 * throw at import time if the key is absent — that would bubble up as a crash
 * rather than a graceful degradation).
 *
 * Returns null on ANY error (key absent, network failure, rate-limit, etc.).
 * MRR is derived from real subscription plan amounts — never invented.
 */
async function readStripeSubscriptions(): Promise<{
  count: number;
  mrrCents: number;
} | null> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (typeof key !== "string" || key.trim().length === 0) {
    return null;
  }

  try {
    const client = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: true,
      // Aggressive timeout so a slow Stripe response doesn't hang the server render.
      timeout: 8000,
    });

    // Page through active subscriptions collecting count + plan amounts.
    // We cap at 1 000 subscriptions (100 pages × 10 items) to avoid an unbounded
    // loop in an internal dashboard that runs on every page load.
    let count = 0;
    let mrrCents = 0;
    let hasMore = true;
    let startingAfter: string | undefined;
    const PAGE_LIMIT = 10;
    const MAX_PAGES = 100;
    let page = 0;

    while (hasMore && page < MAX_PAGES) {
      const params: Stripe.SubscriptionListParams = {
        status: "active",
        limit: PAGE_LIMIT,
        expand: ["data.items.data.price"],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const list = await client.subscriptions.list(params);
      count += list.data.length;

      for (const sub of list.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price?.unit_amount) continue;
          if (price.recurring?.interval === "month") {
            mrrCents += price.unit_amount * (item.quantity ?? 1);
          } else if (price.recurring?.interval === "year") {
            // Annualize → monthly
            mrrCents += Math.round((price.unit_amount * (item.quantity ?? 1)) / 12);
          }
        }
      }

      hasMore = list.has_more;
      if (hasMore && list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1]!.id;
      }
      page++;
    }

    return { count, mrrCents };
  } catch {
    // Any error — network, bad key, rate-limit — degrades to null (honest unknown).
    return null;
  }
}

// ── Public loader ─────────────────────────────────────────────────────────────

/**
 * Load the revenue state from real sources.
 *
 * NEVER THROWS.  On any Stripe error / unconfigured key, subscriptions degrade to
 * `paidSubscribers: null` and `mrr: null`.  The lane config and activation checklist
 * are always returned (they are static doctrine).
 */
export async function loadRevenueState(now: Date = new Date()): Promise<RevenueState> {
  const loadedAtIso = now.toISOString();
  const activation = buildActivationList();
  const lanes = LANES;

  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  const stripeConfigured = typeof stripeKey === "string" && stripeKey.trim().length > 0;

  const stripeResult = await readStripeSubscriptions();

  let subscriptions: SubscriptionSnapshot;
  let dataMode: RevenueDataMode;
  let note: string;

  if (!stripeConfigured) {
    subscriptions = { paidSubscribers: null, mrr: null, arr: null, readAtIso: null };
    dataMode = "unavailable";
    note =
      "Stripe is not configured — attach STRIPE_SECRET_KEY (and the relevant price IDs) to go live. " +
      "MRR and subscriber counts will remain unknown until then. " +
      "All other revenue intelligence (lanes, activation checklist) is always available.";
  } else if (stripeResult === null) {
    subscriptions = { paidSubscribers: null, mrr: null, arr: null, readAtIso: loadedAtIso };
    dataMode = "unavailable";
    note =
      "Stripe is configured but the live read failed (network error, rate-limit, or key mismatch). " +
      "MRR and subscriber counts are unknown for this load — retry to resolve. " +
      "Lane and activation data are always available.";
  } else {
    const mrrUsd = stripeResult.mrrCents / 100;
    const arrUsd = mrrUsd * 12;
    subscriptions = {
      paidSubscribers: stripeResult.count,
      mrr: mrrUsd,
      arr: arrUsd,
      readAtIso: loadedAtIso,
    };
    dataMode = "live";
    note =
      stripeResult.count === 0
        ? "Stripe is connected and returned zero active subscriptions. This is an honest zero — the record is real and currently empty."
        : `Stripe read: ${stripeResult.count} active subscription(s). MRR and ARR are derived from real plan amounts.`;
  }

  return {
    dataMode,
    loadedAtIso,
    note,
    subscriptions,
    lanes,
    activation,
  };
}
