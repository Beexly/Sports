import { buildIntelligenceEvents } from "./events";
import { projectPickEvidenceEnvelope } from "./project";
import type {
  CapturedEvidence,
  ContradictionState,
  EvidenceAudience,
  FreshnessState,
  HealthState,
  IntelligenceEvent,
  MarketState,
  PickEvidenceEnvelope,
  RightsState,
  SourceTier,
} from "./types";

function uniqueValue<T extends string>(values: readonly T[], unknown: T): T {
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] ?? unknown : unknown;
}

function hiddenMarket(market: MarketState): MarketState {
  return {
    kind: market.kind,
    offeredPrice: null,
    offeredPoint: null,
    bookCoverage: null,
    dispersion: null,
    movement: null,
    capturedAt: null,
  };
}

function marketForAudience(market: MarketState, audience: EvidenceAudience, withheld: boolean): MarketState {
  if (withheld) return hiddenMarket(market);
  // Allowlist form: only the two entitled audiences receive the full market, so
  // a runtime-invalid audience value degrades to the PUBLIC (stripped) shape.
  if (audience === "PAID" || audience === "COCKPIT") return market;
  return { ...market, dispersion: null, movement: null };
}

export function projectIntelligenceEvents(
  envelope: PickEvidenceEnvelope,
  audience: EvidenceAudience,
): readonly IntelligenceEvent[] {
  const projection = projectPickEvidenceEnvelope(envelope, audience);
  const visibleEvidence = projection.evidence.filter(
    (record): record is CapturedEvidence => record.state === "CAPTURED",
  );
  const evidenceById = new Map(visibleEvidence.map((record) => [record.id, record]));
  const externalWithhold = audience !== "COCKPIT" && envelope.publication.status === "WITHHELD";
  return buildIntelligenceEvents(envelope).map((event) => {
    const evidence = event.evidenceIds
      .map((id) => evidenceById.get(id))
      .filter((record): record is CapturedEvidence => record !== undefined);
    const evidenceIds = evidence.map((record) => record.id);
    const allowedIds = new Set(evidenceIds);
    const replaceDecisionText =
      externalWithhold && (event.state === "SCORED" || event.state === "PUBLISHED" || event.state === "PASSED");
    return {
      ...event,
      evidenceIds,
      sourceIds: [...new Set(evidence.map((record) => record.sourceId))].sort(),
      sourceTier: uniqueValue<SourceTier>(evidence.map((record) => record.sourceTier), "UNKNOWN"),
      rights: uniqueValue<RightsState>(evidence.map((record) => record.rights), "UNKNOWN"),
      health: uniqueValue<HealthState>(evidence.map((record) => record.health), "UNKNOWN"),
      freshness: uniqueValue<FreshnessState>(evidence.map((record) => record.freshness), "UNKNOWN"),
      contradiction: uniqueValue<ContradictionState>(evidence.map((record) => record.contradiction), "UNKNOWN"),
      market: marketForAudience(event.market, audience, externalWithhold),
      rawInternalOutput: audience === "COCKPIT" ? event.rawInternalOutput : null,
      disagreement: audience === "PUBLIC" ? null : event.disagreement,
      publicRepresentation: replaceDecisionText
        ? projection.decision.publicRepresentation
        : event.publicRepresentation,
      decisionBoundary: externalWithhold
        ? { ...event.decisionBoundary, observedValue: null, threshold: null, crossed: null }
        : event.decisionBoundary,
      boundaryCrossed: externalWithhold ? null : event.boundaryCrossed,
      supportingEvidenceIds: event.supportingEvidenceIds.filter((id) => allowedIds.has(id)),
      weakeningEvidenceIds: event.weakeningEvidenceIds.filter((id) => allowedIds.has(id)),
      accessibleText: replaceDecisionText ? projection.decision.publicRepresentation : event.accessibleText,
    };
  });
}
