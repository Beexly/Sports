import { evaluateSourceRightsUses } from "./source-rights-evaluator";
import { sourceAttributionFor } from "./source-attribution";
import type { SourceRightsUse } from "./source-rights-types";

export interface SourceRightsAudit {
  readonly ok: boolean;
  readonly use: SourceRightsUse;
  readonly sourceIds: readonly string[];
  readonly blockedSourceIds: readonly string[];
  readonly conditionalSourceIds: readonly string[];
  readonly attributions: readonly string[];
  readonly reasons: readonly string[];
}

export function auditSourceRights(sourceIds: readonly string[], use: SourceRightsUse): SourceRightsAudit {
  const decisions = evaluateSourceRightsUses(sourceIds, use);
  return {
    attributions: sourceAttributionFor(sourceIds),
    blockedSourceIds: decisions.filter((decision) => decision.status === "blocked" || decision.status === "unknown").map((decision) => decision.sourceId),
    conditionalSourceIds: decisions.filter((decision) => decision.status === "conditional").map((decision) => decision.sourceId),
    ok: decisions.length > 0 && decisions.every((decision) => decision.allowed),
    reasons: decisions.flatMap((decision) => decision.reasons),
    sourceIds: [...new Set(sourceIds)],
    use,
  };
}
