export type PartnerCategory =
  | "creator_tool"
  | "sports_data_api"
  | "fantasy_tool"
  | "sports_cards"
  | "sportsbook_dfs"
  | "cloud_ai_devtool"
  | "local_regional"
  | "podcast_creator_collab";

export interface PartnerFitInput {
  readonly category: PartnerCategory;
  readonly audienceFit: number;
  readonly contentFit: number;
  readonly complianceRisk: number;
  readonly revenuePotential: number;
  readonly productionEase: number;
  readonly brandTrustFit: number;
}

export interface PartnerFitResult {
  readonly score: number;
  readonly grade: "AVOID" | "WATCH" | "TEST" | "PURSUE" | "PRIORITY";
  readonly recommendedMotion: "affiliate" | "sponsor" | "content_collab" | "api_beta" | "local_sponsor" | "legal_review_first" | "avoid";
  readonly reasons: readonly string[];
}

export function scorePartnerFit(input: PartnerFitInput): PartnerFitResult {
  const audienceFit = clamp01(input.audienceFit);
  const contentFit = clamp01(input.contentFit);
  const complianceRisk = clamp01(input.complianceRisk);
  const revenuePotential = clamp01(input.revenuePotential);
  const productionEase = clamp01(input.productionEase);
  const brandTrustFit = clamp01(input.brandTrustFit);
  const score = roundScore(
    (audienceFit * 0.2 + contentFit * 0.18 + revenuePotential * 0.18 + productionEase * 0.12 + brandTrustFit * 0.17 - complianceRisk * 0.25) * 100,
  );
  const reasons: string[] = [];
  if (input.category === "sportsbook_dfs" && complianceRisk >= 0.6) reasons.push("Sportsbook/DFS category requires legal and compliance review first.");
  if (input.category === "sports_data_api") reasons.push("Sports data/API category has strong native GSE fit when rights are clear.");
  if (input.category === "creator_tool" || input.category === "local_regional") reasons.push("Lower-risk first-lane partner category.");
  if (brandTrustFit < 0.45) reasons.push("Brand trust fit is weak for GSE positioning.");
  return { grade: gradePartner(score), recommendedMotion: recommendMotion(input.category, complianceRisk, score), reasons, score };
}

function recommendMotion(category: PartnerCategory, complianceRisk: number, score: number): PartnerFitResult["recommendedMotion"] {
  if (score < 25) return "avoid";
  if (category === "sportsbook_dfs" && complianceRisk >= 0.6) return "legal_review_first";
  if (category === "sports_data_api") return "api_beta";
  if (category === "local_regional") return "local_sponsor";
  if (category === "podcast_creator_collab") return "content_collab";
  if (category === "creator_tool" || category === "fantasy_tool" || category === "sports_cards") return "affiliate";
  return "sponsor";
}

function gradePartner(score: number): PartnerFitResult["grade"] {
  if (score < 25) return "AVOID";
  if (score < 45) return "WATCH";
  if (score < 65) return "TEST";
  if (score < 82) return "PURSUE";
  return "PRIORITY";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}
