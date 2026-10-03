import { findFableSourceRegistryEntry, type FableSourceRegistryEntry, type FableUseStatus } from "@/lib/fable/source-registry";

import type {
  ApiV1PayloadRightsDecision,
  ApiV1PayloadRightsReport,
  ApiV1PayloadUse,
} from "./types";

type PayloadRightsInput = {
  readonly sourceIds: readonly string[];
  readonly intendedUse: ApiV1PayloadUse;
  readonly includesRawVendorPayload?: boolean;
  readonly includesPersonalData?: boolean;
};

function statusForUse(entry: FableSourceRegistryEntry, use: ApiV1PayloadUse): FableUseStatus {
  if (use === "commercial_display" || use === "public_display") return entry.display_status;
  if (use === "derived_feature") return entry.derived_feature_status;
  if (use === "raw_storage") return entry.storage_status;
  if (use === "partner_sharing") return entry.partner_sharing_status;
  if (entry.allowed_use.includes("model training")) return "allowed";
  if (entry.prohibited_use.includes("model training")) return "blocked";
  return "conditional";
}

function blockersForStatus(sourceId: string, status: FableUseStatus, intendedUse: ApiV1PayloadUse): readonly string[] {
  if (status === "allowed") return [];
  if (status === "conditional") {
    return [`${sourceId} is conditional for ${intendedUse}; owner/legal approval is required before API exposure.`];
  }
  if (status === "unknown") {
    return [`${sourceId} has unknown rights for ${intendedUse}; API exposure fails closed.`];
  }
  return [`${sourceId} is blocked for ${intendedUse}.`];
}

function decisionForSource(
  sourceId: string,
  intendedUse: ApiV1PayloadUse,
  includesRawVendorPayload: boolean
): ApiV1PayloadRightsDecision {
  const entry = findFableSourceRegistryEntry(sourceId);
  if (entry === null) {
    return {
      allowed: false,
      attributionRequired: false,
      attributionText: null,
      blockers: [`Unknown source '${sourceId}' cannot be exposed through API v1.`],
      sourceId,
      sourceName: null,
      status: "unknown",
    };
  }

  const status = statusForUse(entry, intendedUse);
  const blockers = [...blockersForStatus(sourceId, status, intendedUse)];
  if (includesRawVendorPayload && entry.storage_status !== "allowed") {
    blockers.push(`${sourceId} cannot include raw vendor payload because storage is ${entry.storage_status}.`);
  }

  return {
    allowed: blockers.length === 0,
    attributionRequired: entry.attribution_required,
    attributionText: entry.attribution_text,
    blockers,
    sourceId,
    sourceName: entry.source_name,
    status,
  };
}

export function evaluateApiV1PayloadRights(input: PayloadRightsInput): ApiV1PayloadRightsReport {
  const blockers: string[] = [];
  if (input.sourceIds.length === 0) {
    blockers.push("API v1 payloads must declare at least one source id.");
  }
  if (input.includesPersonalData) {
    blockers.push("API v1 shadow seam does not expose personal data.");
  }

  const uniqueSourceIds = [...new Set(input.sourceIds)];
  const sourceDecisions = uniqueSourceIds.map((sourceId) =>
    decisionForSource(sourceId, input.intendedUse, input.includesRawVendorPayload ?? false)
  );

  sourceDecisions.forEach((decision) => blockers.push(...decision.blockers));

  const attributions = sourceDecisions
    .flatMap((decision) =>
      decision.attributionRequired && decision.attributionText !== null ? [decision.attributionText] : []
    );

  return {
    allowed: blockers.length === 0,
    attributions,
    blockers,
    intendedUse: input.intendedUse,
    sourceDecisions,
  };
}
