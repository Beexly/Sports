/**
 * Feature gating — the coherent map of "what each plan unlocks, in customer
 * language, and how it locks for everyone below it."
 *
 * This is a presentation/intent layer. Hard entitlement enforcement stays
 * server-side in `packages/types` getEntitlements + the page/API guards; this
 * config drives the pricing page, the locked-state components, and upgrade CTAs
 * so the customer always sees the VALUE of what's gated without the paid product
 * leaking into Free.
 *
 * Doctrine: Free shows locked value clearly; it never exposes the full product.
 * No hype, no guaranteed-outcome language (enforced by test).
 *
 * Pure module — no DB, no env, fully unit-testable.
 */

import type { ValueTierId } from "./value-architecture";

/** Build/readiness status of the underlying capability. */
export type FeatureStatus = "live" | "demo" | "preview" | "waitlist" | "planned" | "disabled";
/** How the feature appears to a user BELOW its minimum tier. */
export type LockBehavior = "open" | "teaser" | "blurred" | "hidden";

export interface FeatureGate {
  readonly key: string;
  readonly displayName: string;
  /** Plain-English, grounded, no hype. What it does and why it helps. */
  readonly customerExplanation: string;
  readonly internalNote: string;
  /** The lowest tier that FULLY unlocks this feature. */
  readonly minTier: ValueTierId;
  readonly status: FeatureStatus;
  /** Does Free get a teaser/sample/preview of this? */
  readonly freePreview: boolean;
  /** How it renders for users below minTier. */
  readonly lockBehaviorForFree: LockBehavior;
  /** Which tier a lock upsells to (null when it's open to all). */
  readonly upgradeCtaTier: ValueTierId | null;
}

const TIER_ORDER: Record<ValueTierId, number> = { FREE: 0, PRO: 1, ELITE: 2, OPERATOR: 3 };

export const FEATURE_GATES: readonly FeatureGate[] = [
  // ── Education & trust (open to Free) ─────────────────────────────────────
  {
    key: "methodology",
    displayName: "How Galaxy thinks",
    customerExplanation: "The methodology preview: how signals, confidence, and No-Bet are built, before you pay anything.",
    internalNote: "Static educational content. Always open.",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "open", upgradeCtaTier: null,
  },
  {
    key: "academy-basics",
    displayName: "Academy: basics",
    customerExplanation: "Education on reading confidence, line movement, and why No-Bet matters.",
    internalNote: "Academy course floor, basic modules.",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "open", upgradeCtaTier: null,
  },
  {
    key: "no-bet-examples",
    displayName: "No-Bet examples",
    customerExplanation: "Examples of when passing is the smarter decision: restraint as a skill, not a loss.",
    internalNote: "Sample No-Bet cards, no full reasoning.",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "open", upgradeCtaTier: null,
  },
  {
    key: "proof-ledger-preview",
    displayName: "Proof ledger: preview",
    customerExplanation: "Public proof snippets: the receipts behind Galaxy's claims, with source and freshness.",
    internalNote: "Public subset of /proof.",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "open", upgradeCtaTier: null,
  },
  {
    key: "board-preview",
    displayName: "Board preview",
    customerExplanation: "A limited view of today's board so you can see the shape of a Galaxy day. Paid rows stay gated.",
    internalNote: "Partial board; locked rows visible as teasers.",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "sample-signal",
    displayName: "Every pick, free",
    customerExplanation: "Every pick is free, with no daily limit and the open, honest verified record. Pro adds the confidence score, the full factor trail, line movement, and the tools.",
    internalNote: "Picks de-paywalled (dailyPickLimit=null, canSeePremiumPicks=true for FREE). Confidence remains a Pro feature for FREE until the calibrated-honest display ships (Thread 2 / Step 3).",
    minTier: "FREE", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },

  // ── Pro — the daily board ────────────────────────────────────────────────
  {
    key: "daily-board-full",
    displayName: "Today's full board",
    customerExplanation: "The daily command board: every signal, risk, confidence, and No-Bet call in one place.",
    internalNote: "Full board, Pro-gated.",
    minTier: "PRO", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "signal-reasoning",
    displayName: "Signal reasoning",
    customerExplanation: "The factor trail behind each signal: what's driving it and how stable it is.",
    internalNote: "Full factor breakdown.",
    minTier: "PRO", status: "live", freePreview: false, lockBehaviorForFree: "blurred", upgradeCtaTier: "PRO",
  },
  {
    key: "confidence",
    displayName: "Confidence",
    customerExplanation: "Galaxy's estimate of how strong, stable, and supported a signal is. An estimate, never a promise.",
    internalNote: "Confidence score. Free gets it on its 2 free (tier:FREE) picks; Pro+ gets it on the full board.",
    minTier: "PRO", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "no-bet-reasoning",
    displayName: "No-Bet reasoning",
    customerExplanation: "Some boards are too noisy, stale, or overpriced. Galaxy tells you when passing is the smarter call, and why.",
    internalNote: "Full No-Bet reasoning (volatility, staleness, overpricing).",
    minTier: "PRO", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "proof-ledger-full",
    displayName: "Proof ledger: full",
    customerExplanation: "The full proof ledger with source freshness and what would change each claim.",
    internalNote: "Full /proof depth.",
    minTier: "PRO", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "parlay-mri",
    displayName: "Parlay MRI",
    customerExplanation: "Shows where a parlay is fragile instead of pretending every leg is equal.",
    internalNote: "Parlay genome / dependency analysis.",
    minTier: "PRO", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "PRO",
  },
  {
    key: "board-filters",
    displayName: "Board filters",
    customerExplanation: "Filter the board by sport, signal strength, and risk so you see your slice fast.",
    internalNote: "Core filters.",
    minTier: "PRO", status: "live", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "PRO",
  },
  {
    key: "alerts-basic",
    displayName: "Basic alerts",
    customerExplanation: "Get notified when the board changes in ways that matter, where available.",
    internalNote: "Basic alerts; readiness varies.",
    minTier: "PRO", status: "planned", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "PRO",
  },

  // ── Elite — the market behind the board ──────────────────────────────────
  {
    key: "galaxy-twin",
    displayName: "Galaxy Twin / Edge Map",
    customerExplanation: "A visual map of how the game, market, and signal environment are changing.",
    internalNote: "Galaxy Twin layers. Owner set live; underlying data labeled demo/live per surface.",
    minTier: "ELITE", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "ELITE",
  },
  {
    key: "market-gravity",
    displayName: "Market Gravity",
    customerExplanation: "See where price movement, public pressure, and model disagreement are pulling a game.",
    internalNote: "marketGravityIndex on the fair board.",
    minTier: "ELITE", status: "live", freePreview: false, lockBehaviorForFree: "blurred", upgradeCtaTier: "ELITE",
  },
  {
    key: "market-movement",
    displayName: "Deeper market movement",
    customerExplanation: "How the market's price has moved across the window, and how fast, context the board alone can't give.",
    internalNote: "Line Death Clock + drift context.",
    minTier: "ELITE", status: "live", freePreview: false, lockBehaviorForFree: "blurred", upgradeCtaTier: "ELITE",
  },
  {
    key: "props-depth",
    displayName: "Props depth",
    customerExplanation: "Sharper props intelligence where the data genuinely supports it.",
    internalNote: "Props depth; preview until data depth confirmed.",
    minTier: "ELITE", status: "preview", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "ELITE",
  },
  {
    key: "watchlists",
    displayName: "Saved watchlists",
    customerExplanation: "Save games and signals to follow across the week.",
    internalNote: "Persistence layer planned.",
    minTier: "ELITE", status: "planned", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "ELITE",
  },
  {
    key: "calibration-report",
    displayName: "Calibration reports",
    customerExplanation: "How well Galaxy's confidence has matched real outcomes over time, the honesty check on the number.",
    internalNote: "Calibration depth for Elite.",
    minTier: "ELITE", status: "live", freePreview: true, lockBehaviorForFree: "teaser", upgradeCtaTier: "ELITE",
  },
  {
    key: "clv-tracking",
    displayName: "CLV tracking",
    customerExplanation: "Did your number beat the market by close? CLV helps measure whether your process is improving.",
    internalNote: "CLV only where data supports it; preview otherwise.",
    minTier: "ELITE", status: "preview", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "ELITE",
  },
  {
    key: "academy-advanced",
    displayName: "Academy: advanced",
    customerExplanation: "Deeper modules on reading the market, managing variance, and decision discipline.",
    internalNote: "Advanced Academy.",
    minTier: "ELITE", status: "live", freePreview: false, lockBehaviorForFree: "teaser", upgradeCtaTier: "ELITE",
  },
  {
    key: "alerts-rich",
    displayName: "Richer alerts",
    customerExplanation: "More of the alerts that matter, tuned to what you follow.",
    internalNote: "Richer alerts; planned.",
    minTier: "ELITE", status: "planned", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "ELITE",
  },

  // ── Operator — workflow (waitlist) ───────────────────────────────────────
  {
    key: "exports",
    displayName: "Exports",
    customerExplanation: "Export the board and your history into your own workflow.",
    internalNote: "Operator; not built — waitlist.",
    minTier: "OPERATOR", status: "waitlist", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "OPERATOR",
  },
  {
    key: "scenario-analysis",
    displayName: "Scenario analysis",
    customerExplanation: "Model what-if scenarios across the board before you commit.",
    internalNote: "Operator; not built — waitlist.",
    minTier: "OPERATOR", status: "waitlist", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "OPERATOR",
  },
  {
    key: "exposure-tracking",
    displayName: "Exposure tracking",
    customerExplanation: "Track portfolio exposure and where your risk is concentrated.",
    internalNote: "Operator; not built — waitlist.",
    minTier: "OPERATOR", status: "waitlist", freePreview: false, lockBehaviorForFree: "hidden", upgradeCtaTier: "OPERATOR",
  },
] as const;

export function getFeature(key: string): FeatureGate | undefined {
  return FEATURE_GATES.find((f) => f.key === key);
}

/** True when `tier` fully unlocks the feature. */
export function isFeatureUnlocked(tier: ValueTierId, key: string): boolean {
  const f = getFeature(key);
  if (!f) return false;
  return TIER_ORDER[tier] >= TIER_ORDER[f.minTier];
}

/** Features fully unlocked at a tier, in registry order. */
export function featuresForTier(tier: ValueTierId): readonly FeatureGate[] {
  return FEATURE_GATES.filter((f) => TIER_ORDER[tier] >= TIER_ORDER[f.minTier]);
}

/** Features a Free user can see in SOME form (open or a teaser/preview). */
export function freeVisibleFeatures(): readonly FeatureGate[] {
  return FEATURE_GATES.filter((f) => f.minTier === "FREE" || f.freePreview);
}
