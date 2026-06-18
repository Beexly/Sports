/**
 * Sponsor pipeline — Workstream M2.
 *
 * Honest-empty today: no sponsors in the pipeline yet.
 * Add entries via outreach; never fabricate a sponsor.
 *
 * Pipeline stages follow the standard B2B sales flow:
 *   lead → contacted → interested → proposal_sent → active | declined
 */

export type SponsorStage =
  | "lead"
  | "contacted"
  | "interested"
  | "proposal_sent"
  | "active"
  | "declined";

/**
 * Sponsor placement types — the inventory we offer.
 * These are structural definitions only; no prices are fabricated.
 */
export type SponsorPlacementType =
  | "newsletter_single"      // single newsletter issue
  | "newsletter_monthly"     // recurring monthly newsletter slot
  | "desk_weekly"            // weekly Galaxy Desk slot
  | "desk_monthly_founding"  // founding sponsor — monthly Desk
  | "category_exclusive";    // category sponsor — exclusive by vertical

/**
 * Sponsor categories Galaxy accepts.
 * Sportsbooks and casinos are NOT in the safe-to-onboard list.
 */
export type SponsorCategory =
  | "sports_bar"
  | "fantasy_tools"
  | "apparel"
  | "training_equipment"
  | "ticketing"
  | "sports_podcast"
  | "sports_newsletter"
  | "creator_tools"
  | "local_houston"
  | "nutrition_recovery"
  | "sports_media"
  | "analytics_software"
  | "other";

export type Sponsor = {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  category: SponsorCategory;
  /** Which placement types they are interested in */
  placementTypes: readonly SponsorPlacementType[];
  stage: SponsorStage;
  /** ISO date string when this entry was created */
  createdAt: string;
  /** ISO date string of most recent stage change */
  updatedAt: string;
  notes: string | null;
  /** Monthly budget estimate in USD — null until discussed */
  estimatedMonthlyUsd: number | null;
};

/**
 * The in-memory sponsor pipeline.
 *
 * HONESTY RULE: This list is empty at launch because no sponsors are in the
 * pipeline yet. Add entries here (or wire to a DB) as real outreach progresses.
 * Never fabricate a sponsor entry.
 */
const SPONSORS: readonly Sponsor[] = [];
// No sponsors in the pipeline yet — add via outreach.

export type SponsorPipelineSummary = {
  total: number;
  byStage: Record<SponsorStage, number>;
  sponsors: readonly Sponsor[];
  note: string;
};

/**
 * Load the sponsor pipeline for cockpit display.
 * Returns a summary with stage counts and the honest-empty note.
 */
export function loadSponsorPipeline(): SponsorPipelineSummary {
  const byStage: Record<SponsorStage, number> = {
    lead: 0,
    contacted: 0,
    interested: 0,
    proposal_sent: 0,
    active: 0,
    declined: 0,
  };

  for (const s of SPONSORS) {
    byStage[s.stage]++;
  }

  return {
    total: SPONSORS.length,
    byStage,
    sponsors: SPONSORS,
    note:
      SPONSORS.length === 0
        ? "No sponsors in the pipeline yet. Add entries here as real outreach progresses. Never fabricate a sponsor."
        : `${SPONSORS.length} sponsor(s) in the pipeline.`,
  };
}

/** Human-readable labels for each stage */
export const STAGE_LABELS: Record<SponsorStage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  interested: "Interested",
  proposal_sent: "Proposal Sent",
  active: "Active",
  declined: "Declined",
};

/** All defined stages in pipeline order */
export const PIPELINE_STAGES: readonly SponsorStage[] = [
  "lead",
  "contacted",
  "interested",
  "proposal_sent",
  "active",
  "declined",
];

/**
 * Sponsor pricing tiers (from revenue doctrine).
 * These are the published rate ranges — actual deal prices depend on
 * negotiation and what the sponsor signs.
 */
export const SPONSOR_PRICING_TIERS = [
  {
    name: "Newsletter Single",
    type: "newsletter_single" as SponsorPlacementType,
    rangeUsdPerMonth: "$50–$150",
    description: "Dedicated placement in one Galaxy Desk Note newsletter issue.",
  },
  {
    name: "Weekly Desk Slot",
    type: "desk_weekly" as SponsorPlacementType,
    rangeUsdPerMonth: "$100–$250",
    description: "Recurring placement in the weekly Galaxy Desk brief format.",
  },
  {
    name: "Monthly Founding Sponsor",
    type: "desk_monthly_founding" as SponsorPlacementType,
    rangeUsdPerMonth: "$250–$500",
    description:
      "Founding-sponsor placement across the monthly Desk content cadence.",
  },
  {
    name: "Category Exclusive",
    type: "category_exclusive" as SponsorPlacementType,
    rangeUsdPerMonth: "$500–$1,500",
    description:
      "Exclusive category sponsorship — one brand per vertical across all placements.",
  },
] as const;
