import { scorePartnerFit } from "@/lib/media-revenue/partner-fit";
import type { PartnerCategory as MediaPartnerCategory } from "@/lib/media-revenue/partner-fit";
import type { RevenuePartnerCategory } from "./partner-types";

export interface RevenuePartnerScoreInput {
  readonly category: RevenuePartnerCategory;
  readonly audienceFit: number;
  readonly contentFit: number;
  readonly complianceRisk: number;
  readonly revenuePotential: number;
  readonly productionEase: number;
  readonly brandTrustFit: number;
}

const CATEGORY_TO_MEDIA: Readonly<Record<RevenuePartnerCategory, MediaPartnerCategory>> = {
  ai_tool: "cloud_ai_devtool",
  cloud_tool: "cloud_ai_devtool",
  creator_tool: "creator_tool",
  dfs: "sportsbook_dfs",
  fantasy_tool: "fantasy_tool",
  general_sponsor: "local_regional",
  local_sponsor: "local_regional",
  newsletter_tool: "creator_tool",
  podcast_tool: "podcast_creator_collab",
  sportsbook: "sportsbook_dfs",
  sports_cards: "sports_cards",
  sports_data: "sports_data_api",
};

export function scoreRevenuePartner(input: RevenuePartnerScoreInput) {
  return scorePartnerFit({ ...input, category: CATEGORY_TO_MEDIA[input.category] });
}
