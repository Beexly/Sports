import { getSourceRightsEntry } from "./source-rights-registry";
import type { SourceRightsUse, SourceRightsUseDecision } from "./source-rights-types";

export function evaluateSourceRightsUse(sourceId: string, use: SourceRightsUse): SourceRightsUseDecision {
  const entry = getSourceRightsEntry(sourceId);
  if (entry === undefined) {
    return {
      allowed: false,
      attributionRequired: false,
      attributionText: null,
      reasons: [`${sourceId} is missing from the source-rights registry.`],
      sourceId,
      status: "unknown",
    };
  }

  const allowed = allowedForUse(entry, use);
  const conditional = !allowed && ["vendor_candidate", "manual_research_only", "permission_required"].includes(entry.status);
  const status = allowed ? "allowed" : conditional ? "conditional" : "blocked";

  return {
    allowed,
    attributionRequired: entry.attribution_required,
    attributionText: entry.attribution_text,
    reasons: allowed ? [] : [`${sourceId} is ${entry.status} and does not clear ${use}.`],
    sourceId,
    status,
  };
}

export function evaluateSourceRightsUses(sourceIds: readonly string[], use: SourceRightsUse): readonly SourceRightsUseDecision[] {
  return [...new Set(sourceIds)].map((sourceId) => evaluateSourceRightsUse(sourceId, use));
}

function allowedForUse(entry: NonNullable<ReturnType<typeof getSourceRightsEntry>>, use: SourceRightsUse): boolean {
  switch (use) {
    case "automation":
      return entry.automation_allowed;
    case "commercial_display":
      return entry.commercial_display_allowed;
    case "storage":
      return entry.storage_allowed;
    case "derived_analytics":
    case "derived_api":
      return entry.derived_analytics_allowed;
    case "model_training":
      return entry.model_training_allowed;
    case "raw_api":
      return false;
    default:
      return assertNever(use);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled source rights use: ${value}`);
}
