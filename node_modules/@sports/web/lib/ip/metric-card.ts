import { buildIpSourceRightsEnvelope, type IpSourceRightsEnvelope } from "./source-rights-envelope";

export interface IpMetricCard {
  readonly metricId: string;
  readonly publicName: string;
  readonly status: "shadow" | "review_ready" | "approved";
  readonly sourceRights: readonly IpSourceRightsEnvelope[];
  readonly publicExposure: "none" | "drivers" | "grade" | "score_band" | "api_limited";
  readonly protectedComponents: readonly string[];
}

export function buildIpMetricCard(input: {
  readonly metricId: string;
  readonly publicName: string;
  readonly sourceIds: readonly string[];
  readonly protectedComponents: readonly string[];
  readonly publicExposure?: IpMetricCard["publicExposure"];
}): IpMetricCard {
  return {
    metricId: input.metricId,
    protectedComponents: input.protectedComponents,
    publicExposure: input.publicExposure ?? "drivers",
    publicName: input.publicName,
    sourceRights: input.sourceIds.map(buildIpSourceRightsEnvelope).filter((entry): entry is IpSourceRightsEnvelope => entry !== null),
    status: "shadow",
  };
}
