import { evaluateApiV1PayloadRights } from "@/lib/api/v1/payload-rights";
import type { ApiV1PayloadUse } from "@/lib/api/v1/types";

export interface ApiV1PayloadField {
  readonly path: string;
  readonly value: unknown;
  readonly sourceIds: readonly string[];
  readonly rawVendorPayload?: boolean;
}

export interface ApiV1PayloadFilterResult {
  readonly ok: boolean;
  readonly payload: Record<string, unknown>;
  readonly blockedFields: readonly string[];
  readonly blockers: readonly string[];
}

export function filterApiV1PayloadFields(fields: readonly ApiV1PayloadField[], intendedUse: ApiV1PayloadUse): ApiV1PayloadFilterResult {
  const payload: Record<string, unknown> = {};
  const blockedFields: string[] = [];
  const blockers: string[] = [];

  for (const field of fields) {
    const decision = evaluateApiV1PayloadRights({
      includesRawVendorPayload: field.rawVendorPayload === true,
      intendedUse,
      sourceIds: field.sourceIds,
    });
    if (!decision.allowed) {
      blockedFields.push(field.path);
      blockers.push(...decision.blockers.map((blocker) => `${field.path}: ${blocker}`));
      continue;
    }
    payload[field.path] = field.value;
  }

  return { blockedFields, blockers, ok: blockedFields.length === 0, payload };
}
