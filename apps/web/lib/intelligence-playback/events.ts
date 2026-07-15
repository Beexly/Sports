import type {
  CapturedEvidence,
  ContradictionState,
  FreshnessState,
  HealthState,
  IntelligenceEvent,
  IntelligenceLifecycleState,
  MarketState,
  PickEvidenceEnvelope,
  RightsState,
  SourceTier,
} from "./types";

const CORROBORATING_EVIDENCE_KINDS: ReadonlySet<CapturedEvidence["kind"]> = new Set([
  "SOURCE_SNAPSHOT",
  "GAME_SIGNAL",
]);

const UNKNOWN_MARKET = (kind: string): MarketState => ({
  kind,
  offeredPrice: null,
  offeredPoint: null,
  bookCoverage: null,
  dispersion: null,
  movement: null,
  capturedAt: null,
});

function capturedEvidence(envelope: PickEvidenceEnvelope): readonly CapturedEvidence[] {
  return envelope.evidence.filter((record): record is CapturedEvidence => record.state === "CAPTURED");
}

function uniqueValue<T extends string>(values: readonly T[], unknown: T): T {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] ?? unknown : unknown;
}

function earliest(values: readonly (string | null)[], fallback: string): string {
  const present = values.filter((value): value is string => value !== null).sort();
  return present[0] ?? fallback;
}

interface EventPhase {
  readonly state: IntelligenceLifecycleState;
  readonly act: IntelligenceEvent["act"];
  readonly eventTime: string;
  readonly effectiveTime: string | null;
  readonly accessibleText: string;
  readonly includeEvidence: boolean;
  readonly includeModel: boolean;
  readonly includeSettlement: boolean;
  readonly includeCalibration: boolean;
}

function eventForPhase(
  envelope: PickEvidenceEnvelope,
  evidence: readonly CapturedEvidence[],
  phase: EventPhase,
  sequence: number,
): IntelligenceEvent {
  const activeEvidence = phase.includeEvidence ? evidence : [];
  const supportingEvidenceIds = activeEvidence
    .filter((record) => record.disposition === "SUPPORTING")
    .map((record) => record.id);
  const weakeningEvidenceIds = activeEvidence
    .filter((record) => record.disposition === "WEAKENING" || record.disposition === "CONTRADICTED")
    .map((record) => record.id);
  const notSettled = { state: "NOT_CAPTURED", reason: "This lifecycle step predates settlement." } as const;
  const notCalibrated = { state: "NOT_CAPTURED", reason: "This lifecycle step predates recalibration." } as const;
  return {
    id: `${envelope.envelopeId}:${phase.state}:${sequence}`,
    sequence,
    state: phase.state,
    act: phase.act,
    eventTime: phase.eventTime,
    effectiveTime: phase.effectiveTime,
    evidenceIds: activeEvidence.map((record) => record.id),
    sourceIds: [...new Set(activeEvidence.map((record) => record.sourceId))].sort(),
    sourceTier: uniqueValue<SourceTier>(activeEvidence.map((record) => record.sourceTier), "UNKNOWN"),
    rights: uniqueValue<RightsState>(activeEvidence.map((record) => record.rights), "UNKNOWN"),
    health: uniqueValue<HealthState>(activeEvidence.map((record) => record.health), "UNKNOWN"),
    freshness: uniqueValue<FreshnessState>(activeEvidence.map((record) => record.freshness), "UNKNOWN"),
    contradiction: uniqueValue<ContradictionState>(activeEvidence.map((record) => record.contradiction), "UNKNOWN"),
    market: phase.includeEvidence ? envelope.market : UNKNOWN_MARKET(envelope.market.kind),
    modelVersion: envelope.model.version,
    rawInternalOutput: phase.includeModel ? envelope.model.rawInternalOutput : null,
    publicRepresentation: phase.includeModel ? envelope.model.publicRepresentation : phase.accessibleText,
    uncertainty: phase.includeModel ? envelope.model.uncertainty : "Unknown until evidence is scored.",
    disagreement: phase.includeModel ? envelope.model.disagreement : null,
    decisionBoundary: envelope.decision.boundary,
    boundaryCrossed: phase.includeModel ? envelope.decision.boundary.crossed : null,
    supportingEvidenceIds,
    weakeningEvidenceIds,
    reversalCondition: envelope.decision.reversalCondition,
    settlement: phase.includeSettlement ? envelope.settlement : notSettled,
    clv: phase.includeSettlement ? envelope.clv : notSettled,
    calibration: phase.includeCalibration ? envelope.calibration : notCalibrated,
    accessibleText: phase.accessibleText,
  };
}

export function buildIntelligenceEvents(envelope: PickEvidenceEnvelope): readonly IntelligenceEvent[] {
  const evidence = capturedEvidence(envelope);
  const observedAt = earliest(evidence.map((record) => record.fetchedAt), envelope.createdAt);
  const effectiveAt = earliest(evidence.map((record) => record.effectiveAt), observedAt);
  const sourceCount = new Set(
    evidence
      .filter((record) => CORROBORATING_EVIDENCE_KINDS.has(record.kind))
      .map((record) => record.sourceId),
  ).size;
  const phases: EventPhase[] = [
    {
      state: "UNKNOWN", act: "OPEN", eventTime: envelope.createdAt, effectiveTime: null,
      accessibleText: "The decision opened with no evaluated evidence.", includeEvidence: false,
      includeModel: false, includeSettlement: false, includeCalibration: false,
    },
  ];
  if (evidence.length > 0) {
    phases.push({
      state: "OBSERVED", act: "EVIDENCE_ARRIVES", eventTime: observedAt, effectiveTime: effectiveAt,
      accessibleText: `${evidence.length} evidence record${evidence.length === 1 ? " was" : "s were"} observed.`,
      includeEvidence: true, includeModel: false, includeSettlement: false, includeCalibration: false,
    });
  }
  if (sourceCount >= 2) {
    phases.push({
      state: "CORROBORATED", act: "EVIDENCE_ARRIVES", eventTime: observedAt, effectiveTime: effectiveAt,
      accessibleText: `Evidence was corroborated across ${sourceCount} sources.`, includeEvidence: true,
      includeModel: false, includeSettlement: false, includeCalibration: false,
    });
  }
  phases.push({
    state: "SCORED", act: "VIEW_CHANGES", eventTime: envelope.decision.decidedAt, effectiveTime: envelope.market.capturedAt,
    accessibleText: `The model scored the decision boundary. ${envelope.model.publicRepresentation}`,
    includeEvidence: true, includeModel: true, includeSettlement: false, includeCalibration: false,
  });
  phases.push({
    state: envelope.decision.kind, act: "PUBLISH_OR_PASS", eventTime: envelope.decision.decidedAt,
    effectiveTime: envelope.market.capturedAt, accessibleText: envelope.model.publicRepresentation,
    includeEvidence: true, includeModel: true, includeSettlement: false, includeCalibration: false,
  });
  if (envelope.settlement.state === "CAPTURED") {
    phases.push({
      state: "SETTLED", act: "AFTER_CLOSE", eventTime: envelope.settlement.value.settledAt,
      effectiveTime: envelope.settlement.value.settledAt,
      accessibleText: `The decision settled ${envelope.settlement.value.result}.`, includeEvidence: true,
      includeModel: true, includeSettlement: true, includeCalibration: false,
    });
  }
  if (envelope.settlement.state === "CAPTURED" && envelope.calibration.state === "CAPTURED") {
    phases.push({
      state: "RECALIBRATED", act: "AFTER_CLOSE", eventTime: envelope.calibration.value.recordedAt,
      effectiveTime: envelope.calibration.value.recordedAt,
      accessibleText: envelope.calibration.value.effect, includeEvidence: true,
      includeModel: true, includeSettlement: true, includeCalibration: true,
    });
  }
  return phases.map((phase, sequence) => eventForPhase(envelope, evidence, phase, sequence));
}
