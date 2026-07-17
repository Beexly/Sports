/**
 * Deterministic, share-safe differences between canonical intelligence events.
 * The ledger reports only stored transitions and explicitly refuses causal
 * attribution, so every playback consumer can explain change without inventing it.
 */
import type {
  ContradictionState,
  IntelligenceEvent,
  IntelligenceLifecycleState,
} from "./types";

export type BoundaryTransition =
  | "BECAME_CROSSED"
  | "BECAME_NOT_CROSSED"
  | "RETREATED"
  | "UNCHANGED"
  | "UNKNOWN";

export type ContradictionTransition = "APPEARED" | "RESOLVED" | "UNCHANGED" | "UNKNOWN";

export interface EpistemicDelta {
  readonly schemaVersion: "epistemic-delta/v1";
  readonly id: string;
  readonly sequence: number;
  readonly fromState: IntelligenceLifecycleState | null;
  readonly toState: IntelligenceLifecycleState;
  readonly eventId: string;
  readonly evidenceAdded: readonly string[];
  readonly evidenceRemoved: readonly string[];
  readonly sourcesAdded: readonly string[];
  readonly supportingAdded: readonly string[];
  readonly weakeningAdded: readonly string[];
  readonly boundaryTransition: BoundaryTransition;
  readonly contradictionTransition: ContradictionTransition;
  readonly representationChanged: boolean;
  readonly marketDelta: {
    readonly offeredPrice: number | null;
    readonly offeredPoint: number | null;
    readonly bookCoverage: number | null;
    readonly movement: number | null;
  };
  readonly causalScope: "OBSERVED_TRANSITION_ONLY";
  readonly citations: readonly string[];
  readonly summary: string;
}

export interface DecisionChangeCertificate {
  readonly schemaVersion: "decision-change-certificate/v1";
  readonly certificateId: string;
  readonly envelopeDigest: string;
  readonly status: "ANSWERED" | "REFUSED";
  readonly decisionState: "PUBLISHED" | "PASSED" | null;
  readonly causalScope: "OBSERVED_TRANSITION_ONLY";
  readonly citations: readonly string[];
  readonly missingData: readonly string[];
  readonly answer: string;
}

function difference(current: readonly string[], previous: readonly string[]): readonly string[] {
  const previousSet = new Set(previous);
  return [...new Set(current.filter((value) => !previousSet.has(value)))].sort();
}

function numericDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || current === previous) return null;
  const delta = current - previous;
  return Number.isFinite(delta) ? delta : null;
}

function boundaryTransition(
  current: boolean | null,
  previous: boolean | null,
): BoundaryTransition {
  if (current === null) return "UNKNOWN";
  if (previous === null) return current ? "BECAME_CROSSED" : "BECAME_NOT_CROSSED";
  if (current === previous) return "UNCHANGED";
  return current ? "BECAME_CROSSED" : "RETREATED";
}

function contradictionTransition(
  current: ContradictionState,
  previous: ContradictionState,
): ContradictionTransition {
  if (current === "UNKNOWN" || previous === "UNKNOWN") return "UNKNOWN";
  if (current === previous) return "UNCHANGED";
  return current === "PRESENT" ? "APPEARED" : "RESOLVED";
}

function describeDelta(delta: Omit<EpistemicDelta, "summary">): string {
  const changes: string[] = [];
  if (delta.evidenceAdded.length > 0) changes.push(`${delta.evidenceAdded.length} evidence ID${delta.evidenceAdded.length === 1 ? " entered" : "s entered"}`);
  if (delta.evidenceRemoved.length > 0) changes.push(`${delta.evidenceRemoved.length} evidence ID${delta.evidenceRemoved.length === 1 ? " left" : "s left"}`);
  if (delta.weakeningAdded.length > 0) changes.push(`${delta.weakeningAdded.length} weakening record${delta.weakeningAdded.length === 1 ? " appeared" : "s appeared"}`);
  if (delta.contradictionTransition === "APPEARED") changes.push("a contradiction appeared");
  if (delta.contradictionTransition === "RESOLVED") changes.push("the recorded contradiction resolved");
  if (delta.boundaryTransition === "BECAME_CROSSED") changes.push("the decision boundary became crossed");
  if (delta.boundaryTransition === "BECAME_NOT_CROSSED") changes.push("the decision boundary became not crossed");
  if (delta.boundaryTransition === "RETREATED") changes.push("the decision boundary retreated");
  if (delta.marketDelta.offeredPoint !== null) changes.push(`the offered point changed by ${delta.marketDelta.offeredPoint}`);
  if (delta.marketDelta.offeredPrice !== null) changes.push(`the offered price changed by ${delta.marketDelta.offeredPrice}`);
  if (delta.representationChanged) changes.push("the share-safe decision representation changed");
  const observed = changes.length > 0
    ? changes.join("; ")
    : `the lifecycle advanced to ${delta.toState} with no new stored evidence ID`;
  return `${observed}. This records an observed transition; causality is not inferred.`;
}

function validateEvents(events: readonly IntelligenceEvent[]): void {
  const ids = new Set<string>();
  events.forEach((event, index) => {
    if (event.sequence !== index) throw new Error(`Intelligence event sequence must be canonical at index ${index}`);
    if (ids.has(event.id)) throw new Error(`Duplicate intelligence event id: ${event.id}`);
    ids.add(event.id);
  });
}

export function buildEpistemicDeltaLedger(
  events: readonly IntelligenceEvent[],
): readonly EpistemicDelta[] {
  validateEvents(events);
  return events.map((event, index) => {
    const previous = events[index - 1];
    const deltaWithoutSummary: Omit<EpistemicDelta, "summary"> = {
      schemaVersion: "epistemic-delta/v1",
      id: `${event.id}:delta`,
      sequence: index,
      fromState: previous?.state ?? null,
      toState: event.state,
      eventId: event.id,
      evidenceAdded: difference(event.evidenceIds, previous?.evidenceIds ?? []),
      evidenceRemoved: difference(previous?.evidenceIds ?? [], event.evidenceIds),
      sourcesAdded: difference(event.sourceIds, previous?.sourceIds ?? []),
      supportingAdded: difference(event.supportingEvidenceIds, previous?.supportingEvidenceIds ?? []),
      weakeningAdded: difference(event.weakeningEvidenceIds, previous?.weakeningEvidenceIds ?? []),
      boundaryTransition: boundaryTransition(event.boundaryCrossed, previous?.boundaryCrossed ?? null),
      contradictionTransition: contradictionTransition(event.contradiction, previous?.contradiction ?? "UNKNOWN"),
      representationChanged: previous !== undefined && event.publicRepresentation !== previous.publicRepresentation,
      marketDelta: {
        offeredPrice: numericDelta(event.market.offeredPrice, previous?.market.offeredPrice ?? null),
        offeredPoint: numericDelta(event.market.offeredPoint, previous?.market.offeredPoint ?? null),
        bookCoverage: numericDelta(event.market.bookCoverage, previous?.market.bookCoverage ?? null),
        movement: numericDelta(event.market.movement, previous?.market.movement ?? null),
      },
      causalScope: "OBSERVED_TRANSITION_ONLY",
      citations: [event.id, ...event.evidenceIds].filter((value, citationIndex, values) => values.indexOf(value) === citationIndex),
    };
    return { ...deltaWithoutSummary, summary: describeDelta(deltaWithoutSummary) };
  });
}

export function buildDecisionChangeCertificate(
  envelopeDigest: string,
  events: readonly IntelligenceEvent[],
): DecisionChangeCertificate {
  const deltas = buildEpistemicDeltaLedger(events);
  const decision = [...events].reverse().find(
    (event): event is IntelligenceEvent & { readonly state: "PUBLISHED" | "PASSED" } =>
      event.state === "PUBLISHED" || event.state === "PASSED",
  );
  if (!decision) {
    const lastEventId = events.at(-1)?.id;
    return {
      schemaVersion: "decision-change-certificate/v1",
      certificateId: `${envelopeDigest}:decision-change/v1`,
      envelopeDigest,
      status: "REFUSED",
      decisionState: null,
      causalScope: "OBSERVED_TRANSITION_ONLY",
      citations: lastEventId ? [lastEventId] : [],
      missingData: ["publish-or-pass event"],
      answer: "A publish-or-pass decision was not captured, so the system refuses to explain a change.",
    };
  }
  const throughDecision = deltas.filter((delta) => delta.sequence <= decision.sequence);
  const evidenceCount = new Set(throughDecision.flatMap((delta) => delta.evidenceAdded)).size;
  const weakeningCount = new Set(throughDecision.flatMap((delta) => delta.weakeningAdded)).size;
  const boundary = decision.boundaryCrossed === null
    ? "The stored boundary state is unknown."
    : decision.boundaryCrossed
      ? "The stored boundary crossed."
      : "The stored boundary did not cross.";
  const missingData = [
    ...(decision.boundaryCrossed === null ? ["decision boundary"] : []),
    ...(evidenceCount === 0 ? ["evidence bindings"] : []),
  ];
  return {
    schemaVersion: "decision-change-certificate/v1",
    certificateId: `${envelopeDigest}:decision-change/v1`,
    envelopeDigest,
    status: "ANSWERED",
    decisionState: decision.state,
    causalScope: "OBSERVED_TRANSITION_ONLY",
    citations: [...new Set([...throughDecision.map((delta) => delta.eventId), decision.id])],
    missingData,
    // "Derived", not "recorded": these are read-time projections of a mutable
    // envelope — no append-only event log exists yet, so the copy must not
    // imply one (verification finding M5, 2026-07-16).
    answer: `The stored stream advanced to ${decision.state} across ${throughDecision.length} derived events. ${boundary} ${evidenceCount} evidence ID${evidenceCount === 1 ? " entered" : "s entered"}; ${weakeningCount} weakening ID${weakeningCount === 1 ? " was" : "s were"} derived. This is a read-time ledger projection; causality is not inferred.`,
  };
}
