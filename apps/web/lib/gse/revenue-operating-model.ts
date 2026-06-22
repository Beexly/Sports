/**
 * GSE revenue operating model data contract.
 * Defines unit economics, milestone gates, pricing ladder,
 * and the proof-gated revenue unlock framework.
 *
 * This is the single source of truth for pricing phases.
 * See also: apps/web/lib/pricing/pricing-phases.ts
 */

// ── Operating model types ─────────────────────────────────────────────────────

export type TrustTier = "FOUNDING" | "PROVEN" | "ESTABLISHED" | "AUTHORITY";

export type PricingCurrency = "USD";

export interface TrustTierDefinition {
  tier: TrustTier;
  label: string;
  description: string;
  milestoneGates: MilestoneGate[];
  proMonthlyUsd: number;
  proAnnualUsd: number;
  eliteMonthlyUsd: number;
  eliteAnnualUsd: number;
  foundingMembersGrandfathered: boolean;
  unlocksCapabilities: string[];
  unlocksRevenuelines: string[];
}

export interface MilestoneGate {
  id: string;
  description: string;
  requiresVerification: boolean;
  verificationMethod: string;
}

export interface UnitEconomics {
  stage: TrustTier;
  targetLtvCacRatio: number;
  targetPaybackMonths: number;
  estimatedCacUsd: number | null;
  estimatedLtvUsd: number | null;
  churnRiskFactors: string[];
  retentionDrivers: string[];
}

export interface ArrProjection {
  tier: TrustTier;
  targetArrRangeLow: number;
  targetArrRangeHigh: number;
  primaryLevers: string[];
  assumptions: string[];
  sourceNote: string;
}

// ── Trust tier definitions ─────────────────────────────────────────────────────

export const TRUST_TIER_DEFINITIONS: ReadonlyArray<TrustTierDefinition> = [
  {
    tier: "FOUNDING",
    label: "Founding",
    description:
      "Launch phase. Product is live; track record is being built. Founding members get access at founding price, grandfathered forever.",
    milestoneGates: [],
    proMonthlyUsd: 14.99,
    proAnnualUsd: 99,
    eliteMonthlyUsd: 24.99,
    eliteAnnualUsd: 179,
    foundingMembersGrandfathered: true,
    unlocksCapabilities: [
      "All picks published",
      "Confidence scores for Pro+",
      "Factor trail for Pro+",
      "Line movement data for Pro+",
      "Real-time alerts for Elite",
    ],
    unlocksRevenuelines: ["freemium_subscription", "lifetime_founding_member"],
  },
  {
    tier: "PROVEN",
    label: "Proven",
    description:
      "Reached after publishing ≥100 settled picks with a full public calibration report. Price steps up for new subscribers only.",
    milestoneGates: [
      {
        id: "min_100_settled_picks",
        description: "At least 100 picks settled and tracked in the calibration DB",
        requiresVerification: true,
        verificationMethod: "Auto-computed from db.calibrationResult count; displayed on public dashboard",
      },
      {
        id: "calibration_published",
        description: "Full calibration report (MAE, RMSE, win rate) published on public dashboard",
        requiresVerification: true,
        verificationMethod: "Manual publication with timestamp on public page",
      },
    ],
    proMonthlyUsd: 19.99,
    proAnnualUsd: 149,
    eliteMonthlyUsd: 34.99,
    eliteAnnualUsd: 249,
    foundingMembersGrandfathered: true,
    unlocksCapabilities: [
      "Public calibration dashboard",
      "Historical pick archive",
      "CLV tracking dashboard",
    ],
    unlocksRevenuelines: [
      "freemium_subscription",
      "draft_day_trial_convert",
      "content_tools_bundle",
      "creator_partnerships",
    ],
  },
  {
    tier: "ESTABLISHED",
    label: "Established",
    description:
      "Reached after ≥500 settled picks with verified CLV ≥52.4% equivalent win rate. Demonstrates durable edge.",
    milestoneGates: [
      {
        id: "min_500_settled_picks",
        description: "At least 500 picks settled and tracked",
        requiresVerification: true,
        verificationMethod: "Auto-computed from calibration DB",
      },
      {
        id: "verified_clv",
        description: "Verified positive CLV (≥52.4% equivalent win rate against closing line)",
        requiresVerification: true,
        verificationMethod: "CLV computed from licensed odds data; third-party verifiable",
      },
    ],
    proMonthlyUsd: 24.99,
    proAnnualUsd: 199,
    eliteMonthlyUsd: 44.99,
    eliteAnnualUsd: 329,
    foundingMembersGrandfathered: true,
    unlocksCapabilities: [
      "Full performance database export",
      "Bettor profiling tools",
      "Advanced signal analytics",
    ],
    unlocksRevenuelines: [
      "freemium_subscription",
      "seasonal_draft_kit",
      "newsletter_daily_intel",
      "premium_community",
      "white_label_reports",
    ],
  },
  {
    tier: "AUTHORITY",
    label: "Authority",
    description:
      "Reached after multiple seasons of verified positive ROI, publicly documented and third-party referenced.",
    milestoneGates: [
      {
        id: "multi_season_roi",
        description: "Positive ROI documented across 2+ full seasons",
        requiresVerification: true,
        verificationMethod:
          "Full season-by-season P&L published; ideally third-party verified by sports analytics publication",
      },
    ],
    proMonthlyUsd: 34.99,
    proAnnualUsd: 279,
    eliteMonthlyUsd: 59.99,
    eliteAnnualUsd: 449,
    foundingMembersGrandfathered: true,
    unlocksCapabilities: [
      "Full platform access",
      "API access for data subscribers",
      "B2B licensing",
      "Enterprise partnerships",
    ],
    unlocksRevenuelines: [
      "freemium_subscription",
      "data_api_b2b",
      "sportsbook_affiliate",
      "sponsorships",
      "podcast_content_ad",
    ],
  },
] as const;

// ── Unit economics ────────────────────────────────────────────────────────────

export const UNIT_ECONOMICS: ReadonlyArray<UnitEconomics> = [
  {
    stage: "FOUNDING",
    targetLtvCacRatio: 3,
    targetPaybackMonths: 6,
    estimatedCacUsd: 30,
    estimatedLtvUsd: 90,
    churnRiskFactors: [
      "No track record yet — trust must be earned",
      "Off-season churn for NFL-only subscribers",
      "Competition from established platforms",
    ],
    retentionDrivers: [
      "Founding member grandfathering (price lock creates anchor)",
      "War Room draft feature drives seasonal engagement spike",
      "Transparency / trust ladder builds loyalty vs. competitors",
    ],
  },
  {
    stage: "PROVEN",
    targetLtvCacRatio: 4,
    targetPaybackMonths: 4,
    estimatedCacUsd: 25,
    estimatedLtvUsd: 100,
    churnRiskFactors: [
      "Pick quality must sustain to justify price step-up for new users",
      "Seasonal engagement requires year-round product value",
    ],
    retentionDrivers: [
      "Published calibration record builds organic credibility",
      "Creator partnerships drive word-of-mouth acquisition",
      "Draft day trial → annual convert cycle drives cohort retention",
    ],
  },
  {
    stage: "ESTABLISHED",
    targetLtvCacRatio: 5,
    targetPaybackMonths: 3,
    estimatedCacUsd: 20,
    estimatedLtvUsd: 100,
    churnRiskFactors: [
      "Brand risk if CLV slips below threshold",
      "Competitor response once GSE is visibly successful",
    ],
    retentionDrivers: [
      "Deep league memory makes switching cost high",
      "Historical Regret Engine creates personalized engagement",
      "Multi-sport expansion increases year-round engagement",
    ],
  },
  {
    stage: "AUTHORITY",
    targetLtvCacRatio: 8,
    targetPaybackMonths: 2,
    estimatedCacUsd: null,
    estimatedLtvUsd: null,
    churnRiskFactors: [
      "Scale ops without losing quality",
      "Regulatory exposure increases at scale (sportsbook affiliate compliance)",
    ],
    retentionDrivers: [
      "Multi-year track record creates switching cost",
      "B2B API customers have long contracts",
      "Voice Jarvis creates habitual daily usage",
    ],
  },
] as const;

// ── ARR projections ────────────────────────────────────────────────────────────

export const ARR_PROJECTIONS: ReadonlyArray<ArrProjection> = [
  {
    tier: "FOUNDING",
    targetArrRangeLow: 0,
    targetArrRangeHigh: 10000,
    primaryLevers: ["Founding member signups", "Free trial converts"],
    assumptions: ["<100 paying users initially", "Organic discovery only"],
    sourceNote: "Internal estimate — source gap: no external validation",
  },
  {
    tier: "PROVEN",
    targetArrRangeLow: 10000,
    targetArrRangeHigh: 100000,
    primaryLevers: ["Free-to-Pro conversion", "Draft day trial converts", "Creator partnerships"],
    assumptions: ["500–1,000 paying users", "$14.99/mo average", "<25% churn/yr"],
    sourceNote: "Internal estimate — source gap: no external validation",
  },
  {
    tier: "ESTABLISHED",
    targetArrRangeLow: 100000,
    targetArrRangeHigh: 1000000,
    primaryLevers: ["Subscription growth", "Seasonal kit upsells", "Newsletter"],
    assumptions: ["2,000–8,000 paying users", "$19.99/mo average"],
    sourceNote: "Internal estimate — source gap: no external validation",
  },
  {
    tier: "AUTHORITY",
    targetArrRangeLow: 1000000,
    targetArrRangeHigh: 10000000,
    primaryLevers: ["B2B API", "Sponsorships", "Multi-sport expansion"],
    assumptions: ["10,000+ paying subscribers", "B2B contracts at $500–$5000/mo per client"],
    sourceNote: "Internal estimate — source gap: no external validation",
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function currentTierDefinition(tier: TrustTier): TrustTierDefinition {
  return TRUST_TIER_DEFINITIONS.find((t) => t.tier === tier) as TrustTierDefinition;
}

export function isMilestoneUnlocked(
  tier: TrustTier,
  gateId: string,
  verified: boolean
): boolean {
  const tierDef = currentTierDefinition(tier);
  const gate = tierDef.milestoneGates.find((g) => g.id === gateId);
  if (!gate) return false;
  if (gate.requiresVerification && !verified) return false;
  return true;
}

export function proAnnualSavings(tier: TrustTier): number {
  const def = currentTierDefinition(tier);
  return Math.round(def.proMonthlyUsd * 12 - def.proAnnualUsd);
}

export function eliteAnnualSavings(tier: TrustTier): number {
  const def = currentTierDefinition(tier);
  return Math.round(def.eliteMonthlyUsd * 12 - def.eliteAnnualUsd);
}
