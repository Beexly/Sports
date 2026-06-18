/**
 * Pricing Phases — the named, milestone-gated price ladder.
 *
 * GSE's pricing follows the same doctrine as the readiness gates: the price only
 * rises when *proof* justifies it, and every step-up ships added value. The full
 * ladder is named AHEAD OF TIME so the escalation is documented, predictable, and
 * defensible — research shows documented transition policies cut pricing-change
 * escalations ~25% and value-paired increases lift retention ~26%.
 *
 * The current phase is operator-advanced via the PRICING_PHASE env var and defaults
 * to the safest/lowest (FOUNDING) — exactly like the readiness gates default off.
 * Advancing a phase is a deliberate human action taken only when the named proof
 * milestone is met AND the added value has shipped (never automatic).
 *
 * GRANDFATHER GUARANTEE (load-bearing, on-brand): a subscriber keeps the price of
 * the phase they joined in for as long as they stay subscribed — no forced
 * migration. Founding members keep Founding pricing for life. Grandfathering
 * eliminates the 10–15% churn spike that un-grandfathered increases cause
 * (ProfitWell), and retaining a customer costs 5–7× less than acquiring one.
 * Enforcement lives at the Stripe subscription (its price persists); this module
 * is the single source of truth for what NEW subscribers pay at each phase.
 *
 * Pure module — no DB, no env writes, fully unit-testable.
 */

export type BillingInterval = "month" | "year";
export type PricingPhaseId = "FOUNDING" | "PROVEN" | "ESTABLISHED" | "AUTHORITY";

export interface TierPrice {
  /** Recurring monthly price in USD. */
  readonly monthly: number;
  /** Total billed once per year in USD (the annual-plan price). */
  readonly annual: number;
}

export interface PricingPhase {
  readonly id: PricingPhaseId;
  readonly name: string;
  /** Ladder position (0 = entry). Prices must be non-decreasing as order rises. */
  readonly order: number;
  /** Plain-English milestone that unlocks this phase. */
  readonly trigger: string;
  /**
   * Structured proof thresholds, tied to GSE's real instrumentation
   * (canonical settled picks, published calibration, closing-line-value beat rate).
   * Used to CHECK readiness for a human-approved phase advance — never to auto-advance.
   */
  readonly triggerMetrics: {
    readonly minCanonicalSettledPicks: number | null;
    readonly requiresPublishedCalibration: boolean;
    /** Minimum closing-line-value beat-close rate (0–1). 0.524 = the vig break-even line. */
    readonly minBeatCloseRate: number | null;
  };
  readonly pro: TierPrice;
  readonly elite: TierPrice;
  /** The added value that must SHIP before advancing to this phase (no fabricated value). */
  readonly addedValue: string;
}

/**
 * The ladder. Prices are deliberately non-decreasing — proof earns the increase.
 * Annual is ~37–45% below 12× monthly across every phase (the LTV/retention lever).
 */
export const PRICING_PHASES: readonly PricingPhase[] = [
  {
    id: "FOUNDING",
    name: "Founding",
    order: 0,
    trigger:
      "Bootstrap — no public track record yet. The lowest price GSE will ever offer.",
    triggerMetrics: {
      minCanonicalSettledPicks: null,
      requiresPublishedCalibration: false,
      minBeatCloseRate: null,
    },
    pro: { monthly: 14.99, annual: 99 },
    elite: { monthly: 24.99, annual: 179 },
    addedValue:
      "Founding-member rate, locked for the life of your subscription. You back us before the record exists; we never raise your price.",
  },
  {
    id: "PROVEN",
    name: "Proven",
    order: 1,
    trigger:
      "≥100 canonical settled picks AND a published calibration curve (Brier computed, discrimination trending up).",
    triggerMetrics: {
      minCanonicalSettledPicks: 100,
      requiresPublishedCalibration: true,
      minBeatCloseRate: null,
    },
    pro: { monthly: 19.99, annual: 149 },
    elite: { monthly: 29.99, annual: 229 },
    addedValue:
      "The public calibration report and verified settled record go live — the number now exists and is defensible.",
  },
  {
    id: "ESTABLISHED",
    name: "Established",
    order: 2,
    trigger:
      "≥500 settled picks AND a verified closing-line-value beat rate ≥52.4% (the market break-even line) over a meaningful sample.",
    triggerMetrics: {
      minCanonicalSettledPicks: 500,
      requiresPublishedCalibration: true,
      minBeatCloseRate: 0.524,
    },
    pro: { monthly: 29.99, annual: 219 },
    elite: { monthly: 49.99, annual: 349 },
    addedValue:
      "Verified market-beating CLV, plus Elite substance shipped: advanced calibration/CLV analytics, early access to the slate, and an evidence-grounded ask-the-model chat.",
  },
  {
    id: "AUTHORITY",
    name: "Authority",
    order: 3,
    trigger:
      "Multi-season verified positive ROI and category authority — pricing power earned, not claimed.",
    triggerMetrics: {
      minCanonicalSettledPicks: 2000,
      requiresPublishedCalibration: true,
      minBeatCloseRate: 0.55,
    },
    pro: { monthly: 39.99, annual: 299 },
    elite: { monthly: 69.99, annual: 499 },
    addedValue:
      "A multi-season public record competitors can't match. Category-leading proof commands a category-leading price.",
  },
] as const;

const PHASE_BY_ID: Record<PricingPhaseId, PricingPhase> = Object.fromEntries(
  PRICING_PHASES.map((p) => [p.id, p]),
) as Record<PricingPhaseId, PricingPhase>;

// ─────────────────────────────────────────────────────────────────────────────
// Orthogonal STANDARD-rate layer (Elite-first restructure)
//
// This sits ALONGSIDE the proof-gated FOUNDING ladder above — it does not mutate
// it. FOUNDING stays the live default and existing founding subscribers are
// grandfathered for life (their Stripe price persists; this module never migrates
// them). The standard layer only changes what NEW subscribers are quoted, and only
// once the owner flips PRICING_MODE to "standard" (default is "founding", so
// nothing changes for live users until that deliberate human action).
// ─────────────────────────────────────────────────────────────────────────────

/** Which rate card NEW subscribers are quoted. Owner-gated via PRICING_MODE. */
export type PricingMode = "founding" | "standard";

/**
 * Standard (non-founding) rate card. Pro rises and Elite becomes the flagship,
 * best-value tier under the Elite-first restructure. Pinned here as the single
 * source of truth for standard-mode quotes; only live once PRICING_MODE="standard".
 */
export const STANDARD_RATES: { readonly pro: TierPrice; readonly elite: TierPrice } = {
  pro: { monthly: 24.99, annual: 149 },
  elite: { monthly: 39.99, annual: 199 },
} as const;

/** Apex add-on — a separate, one-time purchase that sits ABOVE Elite (not a tier). */
export interface ApexAddOnPricing {
  /** Price for a single Apex pick, in USD. */
  readonly perPick: number;
  /** Price for a 5-pack of Apex picks, in USD. */
  readonly fivePack: number;
}

export const APEX_ADDON: ApexAddOnPricing = { perPick: 9.99, fivePack: 49.99 };

/**
 * Current rate mode — operator-advanced via PRICING_MODE, defaulting to the safest
 * (FOUNDING). An unrecognized value falls back to "founding" rather than guessing up.
 */
export function getCurrentPricingMode(): PricingMode {
  return process.env["PRICING_MODE"] === "standard" ? "standard" : "founding";
}

/**
 * The Pro/Elite rates a NEW subscriber is quoted right now. STANDARD_RATES under
 * standard mode; the live FOUNDING phase's pro/elite otherwise. Grandfathered
 * subscribers are unaffected — enforcement is at the Stripe subscription.
 */
export function getNewSubscriberRates(): { readonly pro: TierPrice; readonly elite: TierPrice } {
  if (getCurrentPricingMode() === "standard") {
    return STANDARD_RATES;
  }
  const founding = PHASE_BY_ID.FOUNDING;
  return { pro: founding.pro, elite: founding.elite };
}

function isPhaseId(value: string | undefined): value is PricingPhaseId {
  return value === "FOUNDING" || value === "PROVEN" || value === "ESTABLISHED" || value === "AUTHORITY";
}

/**
 * Current phase id — operator-advanced via PRICING_PHASE, defaulting to the safest
 * (FOUNDING). An unrecognized value falls back to FOUNDING rather than guessing up.
 */
export function getCurrentPricingPhaseId(): PricingPhaseId {
  const raw = process.env["PRICING_PHASE"];
  return isPhaseId(raw) ? raw : "FOUNDING";
}

export function getCurrentPricingPhase(): PricingPhase {
  return PHASE_BY_ID[getCurrentPricingPhaseId()];
}

export function getPricingPhase(id: PricingPhaseId): PricingPhase {
  return PHASE_BY_ID[id];
}

/** Percent saved by paying annually vs 12× the monthly price (0–100, rounded). */
export function annualSavingsPct(price: TierPrice): number {
  const monthlyTotal = price.monthly * 12;
  if (monthlyTotal <= 0) return 0;
  return Math.round((1 - price.annual / monthlyTotal) * 100);
}

/** Effective monthly cost of the annual plan, rounded to cents. */
export function annualMonthlyEquivalent(price: TierPrice): number {
  return Math.round((price.annual / 12) * 100) / 100;
}

export const GRANDFATHER_GUARANTEE =
  "Your price is locked for the life of your subscription. When prices rise for new members, yours never does.";
