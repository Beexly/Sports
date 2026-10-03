import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";

import { block, pass, warn, type FenceInput, type FencePlugin } from "./fence-types";

const FENCE_ID = "source-rights";

export const sourceRightsFence: FencePlugin = {
  description: "Requires every declared source to clear the requested surface use.",
  evaluate(input) {
    const sourceIds = metadataStringArray(input, "sourceIds");
    if (sourceIds.length === 0) {
      return block(FENCE_ID, ["No source ids were declared."], ["Add sourceIds metadata before review."]);
    }

    const reasons: string[] = [];
    const warnings: string[] = [];
    for (const sourceId of sourceIds) {
      const entry = getSourceRightsEntry(sourceId);
      if (entry === undefined) {
        reasons.push(`${sourceId} is missing from the source-rights registry.`);
        continue;
      }
      if (input.surface === "api" && !entry.derived_analytics_allowed) {
        reasons.push(`${sourceId} does not allow derived API/intelligence exposure.`);
      }
      if (input.surface === "content" && !entry.commercial_display_allowed && !entry.derived_analytics_allowed) {
        reasons.push(`${sourceId} does not allow commercial display or derived analytics.`);
      }
      if (input.surface === "model" && !entry.model_training_allowed) {
        reasons.push(`${sourceId} does not allow model training.`);
      }
      if (entry.attribution_required && entry.attribution_text !== null) {
        warnings.push(`${sourceId} attribution required: ${entry.attribution_text}`);
      }
    }

    if (reasons.length > 0) {
      return block(FENCE_ID, reasons, ["Switch to cleared/open inputs or obtain permission before this surface is used."]);
    }
    if (warnings.length > 0) return warn(FENCE_ID, warnings, ["Carry attribution text into the final output."]);
    return pass(FENCE_ID);
  },
  id: FENCE_ID,
};

function metadataStringArray(input: FenceInput, key: string): readonly string[] {
  const value = input.metadata[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}
