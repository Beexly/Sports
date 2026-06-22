/**
 * Revenue intelligence data contract for Galaxy Sports Edge.
 * Documents proven revenue models, competitor pricing, affiliate risk map,
 * and GSE-specific revenue roadmap.
 *
 * All competitor pricing labeled as public-page estimates.
 * Do not fabricate revenue figures or user counts.
 */

// ── Revenue model types ──────────────────────────────────────────────────────

export type RevenueModelId =
  | "freemium_subscription"
  | "seasonal_draft_kit"
  | "annual_sport_plan"
  | "draft_day_trial_convert"
  | "lifetime_founding_member"
  | "premium_community"
  | "newsletter_daily_intel"
  | "content_tools_bundle"
  | "sportsbook_affiliate"
  | "data_api_b2b"
  | "white_label_reports"
  | "premium_concierge"
  | "sponsorships"
  | "podcast_content_ad"
  | "creator_partnerships";

export type AffiliateStructure = "cpa" | "revshare" | "hybrid" | "none";
export type RegulatoryRisk = "low" | "medium" | "high" | "critical";
export type RevenueStage = "seed" | "early" | "growth" | "mature";

export interface RevenueModel {
  id: RevenueModelId;
  name: string;
  mechanics: string;
  whoUsesIt: string[];
  upsides: string[];
  risks: string[];
  affiliateStructure: AffiliateStructure;
  regulatoryRisk: RegulatoryRisk;
  gseRelevance: "core" | "secondary" | "future" | "excluded";
  gseNote: string;
}

export interface CompetitorPricing {
  name: string;
  monthlyUsd: number | null;
  annualUsd: number | null;
  seasonalUsd: number | null;
  lifetimeUsd: number | null;
  hasFree: boolean;
  freeFeatures: string;
  paidGates: string;
  sourceNote: string;
}

export interface SportsbookAffiliateProgram {
  operator: string;
  structure: AffiliateStructure;
  cpaCapped: string;
  revsharePercent: string;
  complianceFlags: string[];
  gseVerdict: "viable" | "review_required" | "excluded";
}

export interface GseRevenuePhase {
  phase: RevenueStage;
  milestoneTrigger: string;
  primaryRevenue: RevenueModelId[];
  targetArr: string;
  unitEconomics: string;
  risks: string[];
}

// ── Revenue models catalog ───────────────────────────────────────────────────

export const REVENUE_MODELS: ReadonlyArray<RevenueModel> = [
  {
    id: "freemium_subscription",
    name: "Freemium + Tiered Subscription",
    mechanics:
      "Free tier with limited picks/tools; paid tiers unlock depth, confidence scores, real-time alerts.",
    whoUsesIt: ["FantasyPros", "PFF", "Action Network", "OddsJam", "SportsLine"],
    upsides: ["Low CAC via organic free users", "High LTV on annual converts", "Compounding data flywheel"],
    risks: ["Free tier cannibalizes paid if gates are weak", "Churn spikes in off-season"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "core",
    gseNote: "GSE founding tiers: Free ($0), Pro ($14.99/mo), Elite ($24.99/mo). Annual discounts at $99/$179.",
  },
  {
    id: "seasonal_draft_kit",
    name: "Seasonal Draft Kit",
    mechanics: "One-time purchase unlocking all draft tools for a single season. Priced $19–$49.",
    whoUsesIt: ["Footballguys", "Draft Sharks", "4for4", "FantasyPros"],
    upsides: ["High conversion during draft season hype", "Low support overhead", "Easy upsell to annual"],
    risks: ["Single purchase = single relationship; no retention", "Seasonal revenue spikes create cash flow gaps"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "secondary",
    gseNote: "Offer as entry-point add-on; primary goal is converting to annual subscription.",
  },
  {
    id: "annual_sport_plan",
    name: "Annual Sport-Specific Plan",
    mechanics: "Full-season subscription for one sport (NFL, NBA, etc.) at a bundled rate.",
    whoUsesIt: ["RotoWire", "FantasyPros", "4for4", "PFF"],
    upsides: ["Higher commitment = lower churn", "Predictable ARR", "Sport focus allows deep positioning"],
    risks: ["Multi-sport users pay multiple plans; friction", "NFL-heavy = revenue concentrated in Sept–Jan"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "secondary",
    gseNote: "GSE starts NFL-first; multi-sport expansion in Phase 2.",
  },
  {
    id: "draft_day_trial_convert",
    name: "Draft Day Free Trial → Convert",
    mechanics: "Unlimited free access during draft weekend; convert to paid after experience.",
    whoUsesIt: ["Sleeper", "Fantasy Life", "FantasyPros"],
    upsides: ["Zero friction entry; viral word-of-mouth", "Draft experience is product's strongest moment"],
    risks: ["Must recapture user after trial ends", "Low-intent users inflate trial numbers"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "core",
    gseNote: "GSE War Room is primary draft-day hook. Full access during draft; paywall post-draft for ongoing intel.",
  },
  {
    id: "lifetime_founding_member",
    name: "Lifetime / Founding Member Offer",
    mechanics: "One-time payment for permanent access at founding price, grandfathered as tier scales.",
    whoUsesIt: ["Substack", "Beehiiv", "niche analytics tools"],
    upsides: ["Immediate cash injection", "Creates vocal early advocates", "Price anchor before rate increases"],
    risks: ["Long-term liability if product fails", "Discourages MRR predictability"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "core",
    gseNote: "GSE Founding tier is live. Grandfathered for life. Ladder: FOUNDING → PROVEN → ESTABLISHED → AUTHORITY.",
  },
  {
    id: "premium_community",
    name: "Premium Community (Discord/Slack)",
    mechanics: "Paid community access with Q&A, expert picks discussion, exclusive channels.",
    whoUsesIt: ["Action Network", "VSiN", "various Substack sports newsletters"],
    upsides: ["High retention via social bonds", "Community surfaces product feedback organically"],
    risks: ["Moderation burden scales with size", "Community health is fragile"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "secondary",
    gseNote: "Bundle with Elite tier. Discord as secondary channel; primary value is the tools, not the community.",
  },
  {
    id: "newsletter_daily_intel",
    name: "Newsletter / Daily Intelligence Subscription",
    mechanics: "Paid email newsletter delivering daily picks, analysis, or line movement alerts.",
    whoUsesIt: ["The Ringer", "Substack sports analysts", "Action Network"],
    upsides: ["High open rates for engaged sports audience", "Low infrastructure cost", "Direct-to-inbox retention"],
    risks: ["Newsletter fatigue; deliverability challenges in crowded inboxes"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "secondary",
    gseNote: "GSE alert system (Elite tier) covers this natively via push + email. Dedicated newsletter as growth channel.",
  },
  {
    id: "content_tools_bundle",
    name: "Content + Tools Bundle",
    mechanics: "Single plan covers editorial content (articles, analysis) and interactive tools.",
    whoUsesIt: ["RotoWire", "Footballguys", "PFF Fan", "SportsLine"],
    upsides: ["Maximizes perceived value per dollar", "Content drives SEO which feeds tool discovery"],
    risks: ["Content is expensive to produce at quality", "Tools and content have different churn drivers"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "core",
    gseNote: "GSE Decision OS bundles data signals + AI narratives + interactive tools by design.",
  },
  {
    id: "sportsbook_affiliate",
    name: "Sportsbook Affiliate Revenue",
    mechanics:
      "Commission paid by sportsbooks per depositing user (CPA) or share of net gaming revenue (RevShare). Many sports content sites use this as primary or secondary revenue.",
    whoUsesIt: ["Action Network", "Covers", "BettingPros", "OddsJam", "Dimers"],
    upsides: ["High CPAs ($100–$400/depositing user)", "RevShare can compound over user lifetime"],
    risks: [
      "Regulatory patchwork: varies by US state, requires compliance review",
      "Trust conflict: recommending books that pay you undermines pick credibility",
      "Affiliate status can be revoked unilaterally by operator",
      "Some states require media licensing to advertise gambling",
    ],
    affiliateStructure: "hybrid",
    regulatoryRisk: "high",
    gseRelevance: "future",
    gseNote:
      "Viable but trust-corrupting if primary. If pursued: full disclosure, separate affiliate disclosures, legal review per state. Never let affiliate relationship influence pick direction.",
  },
  {
    id: "data_api_b2b",
    name: "Sports Data API / B2B Licensing",
    mechanics: "License GSE's aggregated projections, calibration data, or signals to other operators via API.",
    whoUsesIt: ["PFF (data sales)", "RotoWire (data feeds)", "Sportradar"],
    upsides: ["High-margin recurring B2B revenue", "No user acquisition cost", "Moat if data is proprietary"],
    risks: [
      "Requires legal review of each data source's redistribution rights",
      "B2B sales cycle is long",
      "Cannibalization risk if buyer is a competitor",
    ],
    affiliateStructure: "none",
    regulatoryRisk: "medium",
    gseRelevance: "future",
    gseNote: "Phase 3+ opportunity once GSE has proven calibration history. Legal: cannot resell data we don't own rights to.",
  },
  {
    id: "white_label_reports",
    name: "White-Label Reports",
    mechanics: "GSE-generated weekly/seasonal reports sold to media, podcasters, or team orgs under their brand.",
    whoUsesIt: ["PFF", "numberFire (now Fanduel)", "various analytics boutiques"],
    upsides: ["Non-competing revenue", "Brand exposure via third-party distribution"],
    risks: ["Brand dilution if quality drops", "Operational overhead of customization"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "future",
    gseNote: "Consider post-PROVEN milestone when calibration history is publishable.",
  },
  {
    id: "premium_concierge",
    name: "Premium Concierge / Founder Desk",
    mechanics: "High-touch 1:1 service: personalized trade analysis, custom lineup builds, direct analyst access.",
    whoUsesIt: ["RotoViz (custom projections)", "boutique DFS coaching"],
    upsides: ["$500–$2000+/yr per user possible", "Qualitative feedback loop improves product"],
    risks: ["Doesn't scale without hiring analysts", "Time-intensive"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "secondary",
    gseNote: "Offer to first 20 Founding members as white-glove onboarding. Feeds product iteration, not a scale revenue line.",
  },
  {
    id: "sponsorships",
    name: "Sponsorships",
    mechanics: "Brand deals with sports-adjacent companies (apps, gear, supplements, finance) for placement in content.",
    whoUsesIt: ["Football guys podcast", "Fantasy Life app", "most sports YouTube channels"],
    upsides: ["Uncapped upside per deal", "Does not depend on user monetization"],
    risks: ["Manual sales effort", "Trust risk if sponsor is misaligned with brand values"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "future",
    gseNote: "Post-PROVEN milestone when audience size justifies inbound sponsor interest.",
  },
  {
    id: "podcast_content_ad",
    name: "Podcast / YouTube / Short-Form Content Ad Revenue",
    mechanics: "Programmatic and direct ad revenue from content distribution platforms.",
    whoUsesIt: ["Fantasy Football Today (CBS)", "The Ringer", "numberFire"],
    upsides: ["Passive revenue with audience scale", "Content doubles as top-of-funnel for subscriptions"],
    risks: ["Algorithm-dependent", "Revenue per 1K views/listens is low (~$3–$15 RPM)"],
    affiliateStructure: "none",
    regulatoryRisk: "low",
    gseRelevance: "future",
    gseNote: "Content strategy serves subscriber acquisition first; ad revenue is secondary.",
  },
  {
    id: "creator_partnerships",
    name: "Creator Partnerships",
    mechanics: "Revenue share or flat fee with fantasy/sports influencers who promote GSE to their audience.",
    whoUsesIt: ["Sleeper (creator program)", "Underdog Fantasy", "DraftKings"],
    upsides: ["Low CAC vs paid ads", "Authentic reach to target demographic"],
    risks: ["Creator quality inconsistency", "FTC disclosure requirements"],
    affiliateStructure: "revshare",
    regulatoryRisk: "medium",
    gseRelevance: "secondary",
    gseNote: "Affiliate-style creator program with FTC-compliant disclosure. Track by promo code.",
  },
] as const;

// ── Competitor pricing ───────────────────────────────────────────────────────

export const COMPETITOR_PRICING: ReadonlyArray<CompetitorPricing> = [
  {
    name: "FantasyPros",
    monthlyUsd: 6.99,
    annualUsd: 39.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: true,
    freeFeatures: "Rankings, basic news, limited tools",
    paidGates: "Expert consensus rankings, draft assistant tiers, Trade Analyzer, waiver analysis",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "Footballguys",
    monthlyUsd: null,
    annualUsd: null,
    seasonalUsd: 39.99,
    lifetimeUsd: null,
    hasFree: false,
    freeFeatures: "Limited articles",
    paidGates: "FBG Depth Charts, IDP tools, full rankings, Dodds/Berry columns",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "RotoWire",
    monthlyUsd: 9.99,
    annualUsd: 79.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: true,
    freeFeatures: "News feed, injury updates",
    paidGates: "DFS lineup optimizer, projections, premium articles",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "4for4",
    monthlyUsd: null,
    annualUsd: 49.99,
    seasonalUsd: 29.99,
    lifetimeUsd: null,
    hasFree: false,
    freeFeatures: "Sample projections",
    paidGates: "Weekly projections, DFS tools, Start/Sit, Trade Analyzer",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "Draft Sharks",
    monthlyUsd: null,
    annualUsd: null,
    seasonalUsd: 24.99,
    lifetimeUsd: null,
    hasFree: false,
    freeFeatures: "Limited rankings preview",
    paidGates: "Draft War Room, ADP tools, custom rankings",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "Action Network",
    monthlyUsd: 14.99,
    annualUsd: 99.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: true,
    freeFeatures: "Public picks, basic line data",
    paidGates: "Sharp money alerts, full historical line data, expert picks, CLV tracking",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "OddsJam",
    monthlyUsd: 19.99,
    annualUsd: 149.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: true,
    freeFeatures: "Basic odds comparison, limited positive EV",
    paidGates: "Full positive EV, arbitrage finder, live odds, model projections",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "PFF",
    monthlyUsd: 9.99,
    annualUsd: 79.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: true,
    freeFeatures: "News, basic grades",
    paidGates: "Full grades, projections, fantasy rankings, DFS lineup tools",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
  {
    name: "SportsLine",
    monthlyUsd: 9.99,
    annualUsd: 59.99,
    seasonalUsd: null,
    lifetimeUsd: null,
    hasFree: false,
    freeFeatures: "Teaser picks only",
    paidGates: "Full model picks, confidence scores, expert consensus, live picks",
    sourceNote: "Public pricing page estimate — verify before publishing",
  },
] as const;

// ── Sportsbook affiliate risk map ────────────────────────────────────────────

export const SPORTSBOOK_AFFILIATE_PROGRAMS: ReadonlyArray<SportsbookAffiliateProgram> = [
  {
    operator: "DraftKings Sportsbook",
    structure: "hybrid",
    cpaCapped: "$200–$400 per first depositor (varies by state)",
    revsharePercent: "20–25% NGR (net gaming revenue), tiered",
    complianceFlags: [
      "State-by-state licensing requirements for affiliates",
      "Must not target minors or problem gamblers",
      "FTC disclosure required in all promotional content",
      "Some states (CA, TX) prohibit or restrict sports betting entirely",
    ],
    gseVerdict: "review_required",
  },
  {
    operator: "FanDuel Sportsbook",
    structure: "hybrid",
    cpaCapped: "$200–$350 per first depositor",
    revsharePercent: "25–30% NGR",
    complianceFlags: [
      "Similar state restrictions as DraftKings",
      "Requires affiliate portal registration and approval",
      "Content must not imply guaranteed wins",
    ],
    gseVerdict: "review_required",
  },
  {
    operator: "BetMGM",
    structure: "cpa",
    cpaCapped: "$150–$300 per first depositor",
    revsharePercent: "Not standard",
    complianceFlags: [
      "MGM Resorts brand guidelines apply",
      "Affiliate agreements include clawback provisions",
    ],
    gseVerdict: "review_required",
  },
  {
    operator: "Caesars Sportsbook",
    structure: "cpa",
    cpaCapped: "$150–$250 per first depositor",
    revsharePercent: "Not standard",
    complianceFlags: ["Caesars rewards integration required", "State license verification"],
    gseVerdict: "review_required",
  },
] as const;

// ── GSE revenue phase roadmap ─────────────────────────────────────────────────

export const GSE_REVENUE_PHASES: ReadonlyArray<GseRevenuePhase> = [
  {
    phase: "seed",
    milestoneTrigger: "Launch — 0 paying users",
    primaryRevenue: ["freemium_subscription", "lifetime_founding_member"],
    targetArr: "$0 → $10K",
    unitEconomics: "CAC near $0 (organic). Goal: 100 Founding members at $0 (waitlist/beta).",
    risks: ["No validation of willingness to pay", "Product discovery before brand exists"],
  },
  {
    phase: "early",
    milestoneTrigger: "PROVEN: ≥100 settled picks + published calibration",
    primaryRevenue: ["freemium_subscription", "draft_day_trial_convert", "content_tools_bundle"],
    targetArr: "$10K → $100K",
    unitEconomics:
      "Target LTV/CAC ≥ 3:1. Pro converts at $14.99/mo; payback < 6 months at <$30 CAC.",
    risks: ["Credibility gap if calibration is poor", "Seasonal churn (off-season drops)"],
  },
  {
    phase: "growth",
    milestoneTrigger: "ESTABLISHED: ≥500 settled picks + CLV ≥52.4% verified",
    primaryRevenue: [
      "freemium_subscription",
      "seasonal_draft_kit",
      "newsletter_daily_intel",
      "creator_partnerships",
    ],
    targetArr: "$100K → $1M",
    unitEconomics:
      "NPS drives word-of-mouth. Creator partnerships at 20% rev-share. Draft kit upsells to annual.",
    risks: ["Ops burden with creator program", "Competition intensifies as GSE becomes visible"],
  },
  {
    phase: "mature",
    milestoneTrigger: "AUTHORITY: multi-season verified ROI",
    primaryRevenue: [
      "freemium_subscription",
      "data_api_b2b",
      "sportsbook_affiliate",
      "sponsorships",
      "white_label_reports",
    ],
    targetArr: "$1M+",
    unitEconomics:
      "B2B API at $500–$5000/mo per client. Affiliate only with full compliance review. Sponsorships at $5K–$50K/deal.",
    risks: [
      "Regulatory scrutiny increases at scale",
      "Trust erosion if affiliate conflicts emerge",
      "Team scaling required",
    ],
  },
] as const;

// ── Helper functions ─────────────────────────────────────────────────────────

export function coreRevenueModels(): RevenueModel[] {
  return REVENUE_MODELS.filter((m) => m.gseRelevance === "core") as RevenueModel[];
}

export function highRiskModels(): RevenueModel[] {
  return REVENUE_MODELS.filter(
    (m) => m.regulatoryRisk === "high" || m.regulatoryRisk === "critical"
  ) as RevenueModel[];
}

export function revenueModelsForStage(stage: RevenueStage): RevenueModelId[] {
  const phase = GSE_REVENUE_PHASES.find((p) => p.phase === stage);
  return phase ? [...phase.primaryRevenue] : [];
}

export function competitorPricingRange(): {
  minMonthly: number;
  maxMonthly: number;
  medianAnnual: number;
} {
  const monthlies = COMPETITOR_PRICING.filter((c) => c.monthlyUsd !== null).map(
    (c) => c.monthlyUsd as number
  );
  const annuals = COMPETITOR_PRICING.filter((c) => c.annualUsd !== null).map(
    (c) => c.annualUsd as number
  );
  annuals.sort((a, b) => a - b);
  return {
    minMonthly: Math.min(...monthlies),
    maxMonthly: Math.max(...monthlies),
    medianAnnual: annuals[Math.floor(annuals.length / 2)] ?? 0,
  };
}
