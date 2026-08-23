/**
 * Value Architecture — the customer-facing value ladder.
 *
 * This is the plain-English "why each plan exists and why the next one costs
 * more" layer. It does NOT set prices (the proof-gated `pricing-phases.ts` is the
 * single source of truth for Pro/Elite prices — referenced here so there is no
 * price drift) and it does NOT grant entitlements (server-enforced via
 * `packages/types` getEntitlements). It is the marketing/clarity model the
 * pricing page and upgrade surfaces read from.
 *
 * Doctrine:
 *   - Galaxy sells a sports-intelligence operating system, not "more picks."
 *   - Free proves integrity WITHOUT leaking the paid product.
 *   - Every higher tier is clearly, plainly more valuable than the one below.
 *   - No hype, no guaranteed-outcome language, no tout phrasing (enforced by test).
 *
 * Pure module — no DB, no env, fully unit-testable.
 */

import { getPricingPhase } from "./pricing-phases";

export type ValueTierId = "FREE" | "PRO" | "ELITE" | "OPERATOR";
export type ValueTierStatus = "live" | "waitlist" | "hidden";

export interface ValueTierPrice {
  /** Monthly USD, or null for free / waitlist-target display. */
  readonly monthly: number | null;
  /** Annual USD, or null. */
  readonly annual: number | null;
  /** Short qualifier, e.g. "founding rate" or "target — waitlist". */
  readonly note: string;
}

export interface ValueTier {
  readonly id: ValueTierId;
  /** Marketing name shown on cards, e.g. "Edge Board". */
  readonly name: string;
  /** Ladder position (0 = Free). */
  readonly order: number;
  /** One-line plain-English promise. */
  readonly promise: string;
  /** Who this plan is for. */
  readonly forWho: string;
  readonly status: ValueTierStatus;
  readonly ctaLabel: string;
  readonly price: ValueTierPrice;
  /** What this tier unlocks, in customer language. */
  readonly unlocks: readonly string[];
  /** What stays gated at this tier (visible-but-locked / lives in a higher tier). */
  readonly gated: readonly string[];
  /** Why the tier ABOVE this one exists — null for the top tier. */
  readonly whyNextTier: string | null;
}

/** The positioning line — what Galaxy is, in one breath. */
export const POSITIONING =
  "Galaxy is a sports-intelligence operating system: it helps you understand what " +
  "matters today, why it matters, what changed, what the market is doing, what the " +
  "model believes, how confident it is, when the data is too noisy, and when the " +
  "smartest decision is No-Bet.";

/** The emotional value — what the customer feels. Protected, not pressured. */
export const EMOTIONAL_VALUE =
  "You feel less exposed to hype, noise, stale data, and forced action.";

const founding = getPricingPhase("FOUNDING");

export const VALUE_TIERS: readonly ValueTier[] = [
  {
    id: "FREE",
    name: "Signal Preview",
    order: 0,
    promise: "Understand how Galaxy thinks.",
    forWho: "Curious fans deciding whether Galaxy earns their trust.",
    status: "live",
    ctaLabel: "Preview the system",
    price: { monthly: 0, annual: 0, note: "free forever" },
    unlocks: [
      "How Galaxy works: the methodology preview",
      "Glossary and education (how to read confidence, movement, and No-Bet)",
      "Responsible-gaming framing, up front",
      "Free tools, Academy, and transparent process while the public board builds with proof",
      "The Edge Index on every free pick (calibrated confidence unlocks with Pro)",
      "No-Bet examples: when passing is the smarter call",
      "Public proof snippets: the receipts behind the claims",
      "Plain-English explainers for every major feature",
    ],
    gated: [
      "The full reasoning and factor trail behind each signal",
      "Line-movement history and props depth",
      "The tools - Trend Lab, Parlay MRI, optimizer, and tracker",
      "Alerts",
    ],
    whyNextTier:
      "Pro opens the full reasoning and factor trail behind every signal, line-movement intel, and the tools - the depth, not just the call.",
  },
  {
    id: "PRO",
    name: "Edge Board",
    order: 1,
    promise: "Read today's board with confidence.",
    forWho: "Serious fans and bettors who want daily clarity they can act on.",
    status: "live",
    ctaLabel: "Read the board",
    price: { monthly: founding.pro.monthly, annual: founding.pro.annual, note: "founding rate, locked for life" },
    unlocks: [
      "Today's full daily board: every signal, risk, and No-Bet call",
      "Core signal detail and the factor trail behind it",
      "Confidence reasoning: how strong, stable, and supported a signal is",
      "Board filters",
      "Recent edge history",
      "Full No-Bet reasoning (volatility, staleness, overpricing)",
      "Proof ledger access",
      "Parlay MRI: where a parlay is fragile, not just its payout",
      "Basic alerts where available",
    ],
    gated: [
      "Galaxy Twin / Edge Map market layers",
      "Deeper market-movement context",
      "Saved watchlists and advanced filters",
      "Calibration reports and CLV tracking",
      "Premium Academy and briefings",
    ],
    whyNextTier:
      "Elite adds the alerts and the ledger: real-time email and push the moment a signal posts, plus the closing-line-value tracker that grades every entry price. You act sooner and see whether the timing paid.",
  },
  {
    id: "ELITE",
    name: "Galaxy IQ",
    order: 2,
    promise: "Understand the market behind the board.",
    forWho: "Bettors who want to read the market, not just the day's signals.",
    status: "live",
    ctaLabel: "Understand the market",
    price: { monthly: founding.elite.monthly, annual: founding.elite.annual, note: "founding rate, locked for life" },
    unlocks: [
      "Everything in Pro",
      "Galaxy Twin / Edge Map: the live market and signal environment, visualized",
      "Deeper market-movement context and Market Gravity",
      "Sharper props intelligence where the data supports it",
      "Advanced filters and saved watchlists",
      "Calibration reports: how confidence has matched real outcomes",
      "Closing-line-value (CLV) tracking where available",
      "Premium Academy modules and briefings",
      "Richer alerts",
    ],
    gated: [
      "Operator workflow tools: exports, scenario analysis, automation, exposure tracking",
    ],
    // Operator is hidden from public surfaces (owner decision); Elite is the top
    // public tier, so it does not tease a higher tier.
    whyNextTier: null,
  },
  {
    id: "OPERATOR",
    name: "Command",
    order: 3,
    promise: "Run a serious workflow.",
    forWho: "Power users running a full sports-intelligence workflow.",
    // Hidden from public surfaces per owner decision — kept in config for
    // internal planning; not shown on /pricing and not a billable tier.
    status: "hidden",
    ctaLabel: "Join the waitlist",
    price: { monthly: 79, annual: 699, note: "target pricing: waitlist; launches when the workflow infrastructure is real" },
    unlocks: [
      "Exports and board history",
      "Scenario analysis",
      "Custom alerts and advanced automation",
      "Portfolio / exposure tracking",
      "Deeper data-freshness tools",
      "Priority support",
    ],
    gated: [],
    whyNextTier: null,
  },
] as const;

export function getValueTier(id: ValueTierId): ValueTier {
  const tier = VALUE_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown value tier: ${id}`);
  return tier;
}

/** The live (billable) tiers, in ladder order. Excludes waitlist tiers. */
export function getLiveValueTiers(): readonly ValueTier[] {
  return VALUE_TIERS.filter((t) => t.status === "live");
}
