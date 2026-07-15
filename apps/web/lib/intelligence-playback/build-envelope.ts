import { canonicalJson } from "./canonical-json";
import type {
  BoundFactor,
  CapturedEvidence,
  EvidenceKind,
  EvidenceRecord,
  FactorInput,
  PickEvidenceEnvelope,
  PickEvidenceEnvelopeInput,
  PublicationState,
} from "./types";

export type EvidenceHash = (payload: string) => string;

const REQUIRED_EVIDENCE: Readonly<Record<PickEvidenceEnvelopeInput["decision"]["kind"], readonly EvidenceKind[]>> = {
  PUBLISHED: ["ODDS_SNAPSHOT", "SOURCE_SNAPSHOT", "PICK_SIGNAL_SNAPSHOT", "GATE_DECISION", "PROOF_RECEIPT"],
  PASSED: ["ODDS_SNAPSHOT", "SOURCE_SNAPSHOT", "GATE_DECISION"],
};

const FACTOR_EVIDENCE_KINDS: ReadonlySet<EvidenceKind> = new Set([
  "ODDS_SNAPSHOT",
  "SOURCE_SNAPSHOT",
  "GAME_SIGNAL",
  "PICK_SIGNAL_SNAPSHOT",
]);

function isCaptured(record: EvidenceRecord): record is CapturedEvidence {
  return record.state === "CAPTURED";
}

function evidenceSortKey(record: EvidenceRecord): string {
  return record.state === "CAPTURED"
    ? `${record.kind}:${record.id}`
    : `${record.kind}:not-captured:${record.label}`;
}

function bindFactor(factor: FactorInput, bindableIds: ReadonlySet<string>): BoundFactor {
  if (factor.state === "INACTIVE") return { ...factor, evidenceIds: [], binding: "NOT_APPLICABLE" };
  const evidenceIds = [...new Set(factor.evidenceIds)].sort();
  const binding =
    factor.state === "ACTIVE" && evidenceIds.length > 0 && evidenceIds.every((id) => bindableIds.has(id))
      ? "BOUND"
      : "NOT_CAPTURED";
  return { ...factor, evidenceIds, binding };
}

function blocksPublication(record: CapturedEvidence): boolean {
  return (
    record.rights === "UNKNOWN" ||
    record.health === "UNHEALTHY" ||
    record.health === "UNKNOWN" ||
    record.freshness === "STALE" ||
    record.freshness === "UNKNOWN" ||
    record.contradiction === "PRESENT"
  );
}

function knownAtOrBefore(value: string, boundary: string): boolean {
  const timestamp = Date.parse(value);
  const boundaryTimestamp = Date.parse(boundary);
  return Number.isFinite(timestamp) && Number.isFinite(boundaryTimestamp) && timestamp <= boundaryTimestamp;
}

function publicationState(
  input: PickEvidenceEnvelopeInput,
  evidence: readonly EvidenceRecord[],
  factors: readonly BoundFactor[],
): PublicationState {
  const requiredKinds = REQUIRED_EVIDENCE[input.decision.kind];
  const captured = evidence.filter(isCaptured);
  const capturedKinds = new Set(captured.map((record) => record.kind));
  if (input.decision.kind === "PUBLISHED" && input.receipt.state !== "CAPTURED") {
    capturedKinds.delete("PROOF_RECEIPT");
  }
  const missingKinds = requiredKinds.filter((kind) => !capturedKinds.has(kind));
  const unboundFactors = factors
    .filter((factor) => factor.state === "ACTIVE" && factor.binding !== "BOUND")
    .map((factor) => factor.key)
    .sort();
  const activeFactorEvidenceIds = new Set(
    factors
      .filter((factor) => factor.state === "ACTIVE")
      .flatMap((factor) => factor.evidenceIds),
  );
  const policyBlockedEvidenceIds = captured
    .filter(
      (record) =>
        (requiredKinds.includes(record.kind) || activeFactorEvidenceIds.has(record.id)) &&
        blocksPublication(record),
    )
    .map((record) => record.id)
    .sort();
  const temporalBlockedEvidenceIds = captured
    .filter((record) => !knownAtOrBefore(record.fetchedAt, input.decision.decidedAt))
    .map((record) => record.id)
    .sort();
  const blockedEvidenceIds = [...new Set([
    ...policyBlockedEvidenceIds,
    ...temporalBlockedEvidenceIds,
  ])].sort();
  const evidenceIdCollision = new Set(captured.map((record) => record.id)).size !== captured.length;
  const gateIds = captured.filter((record) => record.kind === "GATE_DECISION").map((record) => record.id);
  const gateBindingMismatch = gateIds.length > 0 && (
    input.decision.gateDecisionId === null ||
    gateIds.length !== 1 ||
    gateIds[0] !== input.decision.gateDecisionId
  );
  const receiptIds = captured.filter((record) => record.kind === "PROOF_RECEIPT").map((record) => record.id);
  const receiptBindingMismatch = input.decision.kind === "PUBLISHED" && input.receipt.state === "CAPTURED" && (
    receiptIds.length !== 1 || receiptIds[0] !== input.receipt.value.id
  );
  const receiptTimeInvalid = input.receipt.state === "CAPTURED" &&
    !knownAtOrBefore(input.receipt.value.frozenAt, input.decision.decidedAt);
  const reasonCodes: string[] = [];
  if (missingKinds.length > 0) reasonCodes.push("REQUIRED_EVIDENCE_MISSING");
  if (unboundFactors.length > 0) reasonCodes.push("ACTIVE_FACTOR_UNBOUND");
  if (policyBlockedEvidenceIds.length > 0) reasonCodes.push("EVIDENCE_POLICY_BLOCKED");
  if (evidenceIdCollision) reasonCodes.push("EVIDENCE_ID_COLLISION");
  if (gateBindingMismatch || receiptBindingMismatch) reasonCodes.push("EVIDENCE_BINDING_MISMATCH");
  if (temporalBlockedEvidenceIds.length > 0 || receiptTimeInvalid) reasonCodes.push("EVIDENCE_TIME_INVALID");
  const marketComplete =
    input.market.kind !== "UNKNOWN" &&
    input.market.kind.trim().length > 0 &&
    input.market.capturedAt !== null &&
    knownAtOrBefore(input.market.capturedAt, input.decision.decidedAt) &&
    (input.market.offeredPrice !== null || input.market.offeredPoint !== null) &&
    input.market.bookCoverage !== null &&
    input.market.bookCoverage > 0;
  const boundaryComplete =
    input.decision.boundary.observedValue !== null &&
    input.decision.boundary.threshold !== null &&
    input.decision.boundary.crossed !== null;
  const boundaryMismatch =
    boundaryComplete &&
    ((input.decision.kind === "PUBLISHED" && input.decision.boundary.crossed !== true) ||
      (input.decision.kind === "PASSED" && input.decision.boundary.crossed !== false));
  if (!marketComplete) reasonCodes.push("MARKET_CONTEXT_INCOMPLETE");
  if (!boundaryComplete) reasonCodes.push("DECISION_BOUNDARY_INCOMPLETE");
  if (boundaryMismatch) reasonCodes.push("DECISION_BOUNDARY_MISMATCH");
  return {
    status: reasonCodes.length === 0 ? "ELIGIBLE" : "WITHHELD",
    requiredKinds,
    missingKinds,
    unboundFactors,
    blockedEvidenceIds,
    reasonCodes,
  };
}

export function buildPickEvidenceEnvelope(
  input: PickEvidenceEnvelopeInput,
  hash: EvidenceHash,
): PickEvidenceEnvelope {
  const evidence = [...input.evidence].sort((left, right) => evidenceSortKey(left).localeCompare(evidenceSortKey(right)));
  const bindableIds = new Set(
    evidence
      .filter(isCaptured)
      .filter((record) => FACTOR_EVIDENCE_KINDS.has(record.kind))
      .map((record) => record.id),
  );
  const factors = input.factors
    .map((factor) => bindFactor(factor, bindableIds))
    .sort((left, right) => left.key.localeCompare(right.key));
  const publication = publicationState(input, evidence, factors);
  const committed = {
    ...input,
    schemaVersion: "pick-evidence-envelope/v1" as const,
    evidence,
    factors,
    publication,
  };
  return { ...committed, digest: hash(canonicalJson(committed)) };
}
