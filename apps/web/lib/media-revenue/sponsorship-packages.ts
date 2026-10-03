export interface SponsorshipPackage {
  readonly id: string;
  readonly name: string;
  readonly monthlyPriceUsd: number | null;
  readonly bestFor: readonly string[];
  readonly deliverables: readonly string[];
  readonly sponsorCannotControl: readonly string[];
  readonly complianceRequirements: readonly string[];
}

export const SPONSOR_CANNOT_CONTROL = [
  "picks",
  "model outputs",
  "no-bet decisions",
  "loss autopsies",
  "calibration claims",
  "editorial conclusions",
] as const;

const STANDARD_COMPLIANCE = [
  "Sponsor or affiliate disclosure near every mention.",
  "Terms URL required for any regulated offer.",
  "No audience, ROI, or performance promise without evidence.",
  "Sponsor cannot review or alter model conclusions.",
] as const;

export const SPONSORSHIP_PACKAGES: readonly SponsorshipPackage[] = [
  {
    bestFor: ["Local businesses", "early supporters", "low-risk brand support"],
    complianceRequirements: STANDARD_COMPLIANCE,
    deliverables: ["Name mention in one newsletter/month", "Static partner listing after approval", "Manual-review sponsor note"],
    id: "founding_supporter",
    monthlyPriceUsd: 150,
    name: "Founding Supporter",
    sponsorCannotControl: SPONSOR_CANNOT_CONTROL,
  },
  {
    bestFor: ["Creator tools", "AI/dev tools", "workflow products"],
    complianceRequirements: STANDARD_COMPLIANCE,
    deliverables: ["One GSE Lab sponsor mention/month", "One approved tool/workflow note", "Partner page listing"],
    id: "gse_builder_sponsor",
    monthlyPriceUsd: 300,
    name: "GSE Builder Sponsor",
    sponsorCannotControl: SPONSOR_CANNOT_CONTROL,
  },
  {
    bestFor: ["Newsletter sponsors", "podcast-ready partners", "sports data tools"],
    complianceRequirements: STANDARD_COMPLIANCE,
    deliverables: ["Board Meeting sponsor slot", "Newsletter sponsor block", "Partner CTA after manual review"],
    id: "board_meeting_sponsor",
    monthlyPriceUsd: 750,
    name: "Board Meeting Sponsor",
    sponsorCannotControl: SPONSOR_CANNOT_CONTROL,
  },
  {
    bestFor: ["Category leaders", "sports data/API partners", "cloud or AI platforms"],
    complianceRequirements: STANDARD_COMPLIANCE,
    deliverables: ["Category exclusivity subject to review", "Monthly deep-dive segment", "Media kit inclusion", "Partner page feature"],
    id: "category_sponsor",
    monthlyPriceUsd: 1500,
    name: "Category Sponsor",
    sponsorCannotControl: SPONSOR_CANNOT_CONTROL,
  },
  {
    bestFor: ["Creator tools", "fantasy tools", "sports cards and collectibles"],
    complianceRequirements: STANDARD_COMPLIANCE,
    deliverables: ["Disclosed affiliate link placeholder", "Tool review only after evidence-based review", "No fixed placement commitment"],
    id: "affiliate_only",
    monthlyPriceUsd: null,
    name: "Affiliate-only",
    sponsorCannotControl: SPONSOR_CANNOT_CONTROL,
  },
] as const;
