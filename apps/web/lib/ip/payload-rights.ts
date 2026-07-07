import { auditSourceRights } from "@/lib/source-rights/source-rights-audit";
import type { SourceRightsUse } from "@/lib/source-rights/source-rights-types";

export type IpPayloadFieldKind = "derived_metric" | "public_driver" | "aggregate_summary" | "raw_source_value" | "protected_weight";

export interface IpPayloadField {
  readonly path: string;
  readonly kind: IpPayloadFieldKind;
  readonly sourceIds: readonly string[];
}

export interface IpPayloadRightsDecision {
  readonly ok: boolean;
  readonly approvedFields: readonly string[];
  readonly blockedFields: readonly string[];
  readonly reasons: readonly string[];
  readonly attributions: readonly string[];
}

export function evaluateIpPayloadRights(fields: readonly IpPayloadField[], use: SourceRightsUse = "derived_api"): IpPayloadRightsDecision {
  const approvedFields: string[] = [];
  const blockedFields: string[] = [];
  const reasons: string[] = [];
  const attributions: string[] = [];

  for (const field of fields) {
    if (field.kind === "protected_weight" || field.kind === "raw_source_value") {
      blockedFields.push(field.path);
      reasons.push(`${field.path} cannot expose ${field.kind}.`);
      continue;
    }
    const audit = auditSourceRights(field.sourceIds, use);
    attributions.push(...audit.attributions);
    if (!audit.ok) {
      blockedFields.push(field.path);
      reasons.push(...audit.reasons.map((reason) => `${field.path}: ${reason}`));
      continue;
    }
    approvedFields.push(field.path);
  }

  return {
    approvedFields,
    attributions: [...new Set(attributions)],
    blockedFields,
    ok: blockedFields.length === 0,
    reasons,
  };
}
