import type {
  BoundFactor,
  CapturedEvidence,
  EvidenceAudience,
  EvidenceRecord,
  PickEvidenceEnvelope,
  PickEvidenceProjection,
  PublicationState,
} from "./types";

function visibleEvidence(record: EvidenceRecord, audience: EvidenceAudience): boolean {
  if (record.state === "NOT_CAPTURED" || audience === "COCKPIT") return true;
  return record.rights === "PUBLIC_DERIVED";
}

function projectFactor(factor: BoundFactor, visibleIds: ReadonlySet<string>, audience: EvidenceAudience): BoundFactor {
  if (audience === "COCKPIT") return factor;
  return { ...factor, evidenceIds: factor.evidenceIds.filter((id) => visibleIds.has(id)) };
}

function capturedEvidence(record: EvidenceRecord): record is CapturedEvidence {
  return record.state === "CAPTURED";
}

function projectPublication(
  publication: PublicationState,
  visibleIds: ReadonlySet<string>,
  audience: EvidenceAudience,
): PublicationState {
  if (audience === "COCKPIT") return publication;
  return {
    ...publication,
    unboundFactors: audience === "PUBLIC" ? [] : publication.unboundFactors,
    blockedEvidenceIds: publication.blockedEvidenceIds.filter((id) => visibleIds.has(id)),
  };
}

export function projectPickEvidenceEnvelope(
  envelope: PickEvidenceEnvelope,
  audience: EvidenceAudience,
): PickEvidenceProjection {
  const evidence = envelope.evidence.filter((record) => visibleEvidence(record, audience));
  const visibleIds = new Set(evidence.filter(capturedEvidence).map((record) => record.id));
  const externalWithhold = audience !== "COCKPIT" && envelope.publication.status === "WITHHELD";
  const selection =
    envelope.decision.kind === "PUBLISHED" && !externalWithhold
      ? envelope.decision.selection
      : null;
  const publicRepresentation = externalWithhold
    ? "Decision withheld: required evidence is incomplete or not safe for public display."
    : envelope.model.publicRepresentation;
  return {
    audience,
    digest: envelope.digest,
    publication: projectPublication(envelope.publication, visibleIds, audience),
    decision: {
      kind: envelope.decision.kind,
      selection,
      publicRepresentation,
      rawInternalOutput: audience === "COCKPIT" ? envelope.model.rawInternalOutput : null,
      reason: externalWithhold ? "Required evidence did not clear the public policy." : envelope.decision.reason,
      boundary: envelope.decision.boundary,
      reversalCondition: envelope.decision.reversalCondition,
    },
    evidence,
    // PUBLIC projections carry NO factors — the factor trail is a paid surface
    // and stripping it here, inside the projection itself, is what prevents the
    // #103-class leak: no caller discipline is ever relied on (verification
    // finding M3, 2026-07-16).
    factors:
      audience === "PUBLIC"
        ? []
        : envelope.factors.map((factor) => projectFactor(factor, visibleIds, audience)),
  };
}
