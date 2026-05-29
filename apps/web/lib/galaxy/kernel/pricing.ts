/**
 * Galaxy Pricing Registry — typed source of truth for plans and feature matrix.
 *
 * The pricing page consumes PLANS and FEATURE_MATRIX from here.
 * LEGACY_PLANS / LEGACY_FEATURE_MATRIX remain exported for one cycle
 * so rollback is a single import line swap.
 */

export type PlanId = "FREE" | "PRO" | "ELITE";

export interface PlanFeature {
  readonly label: string;
  readonly included: boolean;
}

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly price: number;
  readonly period: "month" | null;
  readonly description: string;
  readonly badge: string | null;
  readonly cta: string;
  readonly ctaHref: string;
  readonly features: ReadonlyArray<PlanFeature>;
}

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    period: null,
    description: "One signal a day — sample the discipline before committing.",
    badge: null,
    cta: "Start free",
    ctaHref: "/auth/signin",
    features: [
      { label: "1 signal per day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Pick type (spread / ML / total)", included: true },
      { label: "Confidence rating on every signal", included: false },
      { label: "Highest-Edge-Index signals", included: false },
      { label: "Full factor trail & reasoning", included: false },
      { label: "Line-movement alerts", included: false },
      { label: "Email + push notifications", included: false },
      { label: "All 7 sports", included: false },
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 19,
    period: "month",
    description: "Every published signal, with the confidence rating and factor trail attached.",
    badge: "Where most start",
    cta: "Subscribe to Pro",
    ctaHref: "/auth/signin?plan=pro",
    features: [
      { label: "Every signal, every day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Pick type (spread / ML / total)", included: true },
      { label: "Confidence rating on every signal", included: true },
      { label: "Highest-Edge-Index signals", included: true },
      { label: "Full factor trail & reasoning", included: true },
      { label: "Line-movement alerts", included: true },
      { label: "Email + push notifications", included: false },
      { label: "All 7 sports", included: true },
    ],
  },
  {
    id: "ELITE",
    name: "Elite",
    price: 49,
    period: "month",
    description: "Pro plus real-time alerts on every published signal — built for live slates.",
    badge: "All signals, all alerts",
    cta: "Subscribe to Elite",
    ctaHref: "/auth/signin?plan=elite",
    features: [
      { label: "Every signal, every day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Pick type (spread / ML / total)", included: true },
      { label: "Confidence rating on every signal", included: true },
      { label: "Highest-Edge-Index signals", included: true },
      { label: "Full factor trail & reasoning", included: true },
      { label: "Line-movement alerts", included: true },
      { label: "Email + push notifications", included: true },
      { label: "All 7 sports", included: true },
    ],
  },
] as const;

export type FeatureValue = string | boolean;

export interface FeatureRow {
  readonly group?: string;
  readonly label: string;
  readonly free: FeatureValue;
  readonly pro: FeatureValue;
  readonly elite: FeatureValue;
}

export const FEATURE_MATRIX: ReadonlyArray<FeatureRow> = [
  // ── Picks & Signals ──────────────────────────────
  { group: "Picks & Signals", label: "Published picks per day", free: "1", pro: "Unlimited", elite: "Unlimited" },
  { label: "Sports covered", free: "Sampler", pro: "All 7", elite: "All 7" },
  { label: "Spread / Moneyline / Total picks", free: true, pro: true, elite: true },
  { label: "Confidence score (0–100)", free: false, pro: true, elite: true },
  { label: "Full 10-factor trail", free: false, pro: true, elite: true },
  { label: "Edge Index score", free: false, pro: true, elite: true },
  { label: "Featured / high-conviction picks", free: false, pro: true, elite: true },
  { label: "Board passes list (what we skipped)", free: true, pro: true, elite: true },
  // ── Market Intelligence ──────────────────────────
  { group: "Market Intelligence", label: "Today's Board (daily brief)", free: true, pro: true, elite: true },
  { label: "Market Gravity surface", free: "Preview", pro: true, elite: true },
  { label: "Line movement alerts", free: false, pro: true, elite: true },
  { label: "Book disagreement signals", free: false, pro: true, elite: true },
  { label: "Steam move detection", free: false, pro: false, elite: "Coming" },
  { label: "Props Intelligence surface", free: false, pro: "Beta", elite: "Beta" },
  // ── Research & Brain ─────────────────────────────
  { group: "Research & Brain", label: "Research Brain Q&A", free: "3/day", pro: "20/day", elite: "Unlimited" },
  { label: "Evidence Vault citations", free: false, pro: true, elite: true },
  { label: "Rumor Radar (weak signals)", free: "Preview", pro: true, elite: true },
  { label: "Fantasy War Room", free: "Preview", pro: true, elite: true },
  { label: "Intelligence glossary", free: true, pro: true, elite: true },
  // ── Galaxy Academy ───────────────────────────────
  { group: "Galaxy Academy", label: "Foundation Track (basics)", free: true, pro: true, elite: true },
  { label: "Advanced Tracks (5 modules)", free: false, pro: true, elite: true },
  { label: "Decision simulator", free: false, pro: true, elite: true },
  // ── Decision-Quality Tools ───────────────────────
  { group: "Decision-Quality Tools", label: "Post-Bet Autopsy", free: true, pro: true, elite: true },
  { label: "Parlay MRI", free: true, pro: true, elite: true },
  { label: "Market Mirage", free: false, pro: true, elite: true },
  { label: "Roster Shock", free: false, pro: true, elite: true },
  { label: "Coaching Edge", free: false, pro: true, elite: true },
  { label: "Betting Brain profile", free: true, pro: true, elite: true },
  // ── Reports ─────────────────────────────────────
  { group: "Reports", label: "Orbit Reports (weekly)", free: false, pro: true, elite: true },
  { label: "Edge Reports (signal-triggered)", free: false, pro: true, elite: true },
  { label: "Market Mirage Reports", free: false, pro: true, elite: true },
  { label: "Signal Reports (monthly per sport)", free: false, pro: true, elite: true },
  { label: "Season Previews", free: false, pro: true, elite: true },
  { label: "No-Bet Reports", free: true, pro: true, elite: true },
  // ── Alerts ──────────────────────────────────────
  { group: "Alerts & Notifications", label: "Daily briefing email", free: false, pro: false, elite: true },
  { label: "Pick published push", free: false, pro: false, elite: true },
  { label: "Roster shock alert", free: false, pro: false, elite: true },
  { label: "Command Center summary", free: false, pro: true, elite: true },
  // ── Platform ─────────────────────────────────────
  { group: "Platform", label: "Galaxy Orbit View", free: true, pro: true, elite: true },
  { label: "Shareable pick artifacts", free: true, pro: true, elite: true },
  { label: "API access (developer)", free: false, pro: false, elite: "Coming" },
] as const;

/** @deprecated — use PLANS from kernel. Kept for one-cycle rollback. */
export const LEGACY_PLANS = PLANS;

/** @deprecated — use FEATURE_MATRIX from kernel. Kept for one-cycle rollback. */
export const LEGACY_FEATURE_MATRIX = FEATURE_MATRIX;

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
