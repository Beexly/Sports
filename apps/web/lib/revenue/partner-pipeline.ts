import type { RevenueMotion, RevenuePartnerCategory } from "./partner-types";

export type PartnerPipelineStage = "research" | "qualified" | "outreach_ready" | "contacted" | "review" | "approved" | "rejected";

export interface PartnerPipelineEntry {
  readonly partnerId: string;
  readonly category: RevenuePartnerCategory;
  readonly stage: PartnerPipelineStage;
  readonly recommendedMotion: RevenueMotion;
  readonly nextAction: string;
}

export function nextPartnerPipelineAction(stage: PartnerPipelineStage): string {
  switch (stage) {
    case "research":
      return "Score partner fit and source-rights risk before outreach.";
    case "qualified":
      return "Draft manual outreach with disclosure and no performance claims.";
    case "outreach_ready":
      return "Send one human-reviewed message and log response.";
    case "contacted":
      return "Wait for response or move to review when terms are available.";
    case "review":
      return "Run offer eligibility, disclosure, and responsible-gaming checks.";
    case "approved":
      return "Use only approved surfaces and manual-review placements.";
    case "rejected":
      return "Do not place links or sponsor copy.";
  }
}
