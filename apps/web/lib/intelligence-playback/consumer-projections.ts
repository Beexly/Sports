/**
 * Read-only projections that let Twin, autopsy, Media Studio, and deterministic
 * explanations consume one canonical event stream without persisting parallel truth.
 */
import {
  buildDecisionChangeCertificate,
  buildEpistemicDeltaLedger,
  type DecisionChangeCertificate,
  type EpistemicDelta,
} from "./epistemic-deltas";
import type {
  Capture,
  ClvState,
  IntelligenceEvent,
  IntelligenceLifecycleState,
  PublicationState,
  SettlementState,
} from "./types";

export interface PlaybackConsumerInput {
  readonly gameId: string;
  readonly envelopeDigest: string;
  readonly publication: PublicationState;
  readonly events: readonly IntelligenceEvent[];
}

export interface TwinSelectedGameProjection {
  readonly schemaVersion: "twin-selected-game/v1";
  readonly selectedGameId: string;
  readonly envelopeDigest: string;
  readonly currentState: IntelligenceLifecycleState;
  readonly eventIds: readonly string[];
  readonly deltas: readonly EpistemicDelta[];
  readonly contradictionEventIds: readonly string[];
  readonly boundaryCrossingEventId: string | null;
  readonly accessibleTimeline: readonly string[];
}

export interface PostgameAutopsyProjection {
  readonly schemaVersion: "postgame-autopsy-projection/v1";
  readonly status: "READY" | "NOT_CAPTURED";
  readonly result: SettlementState["result"] | null;
  readonly clvState: Capture<ClvState>["state"];
  readonly calibrationState: IntelligenceEvent["calibration"]["state"];
  readonly learningState: string;
  readonly citations: readonly string[];
}

export interface MediaStudioScenePackage {
  readonly schemaVersion: "intelligence-scene-package/v1";
  readonly state: "DRAFT_ONLY";
  readonly envelopeDigest: string;
  readonly autoPublishAllowed: false;
  readonly scenes: readonly {
    readonly id: string;
    readonly kind: IntelligenceEvent["act"];
    readonly eventId: string;
    readonly script: string;
    readonly evidenceIds: readonly string[];
    readonly eventTime: string;
    readonly rights: IntelligenceEvent["rights"];
    readonly freshness: IntelligenceEvent["freshness"];
    readonly reviewStatus: "HUMAN_REVIEW_REQUIRED";
  }[];
  readonly exportPreflight: {
    readonly allowed: false;
    readonly blockers: readonly string[];
  };
}

export interface PlaybackConsumerBundle {
  readonly twin: TwinSelectedGameProjection;
  readonly autopsy: PostgameAutopsyProjection;
  readonly mediaStudio: MediaStudioScenePackage;
  readonly brain: DecisionChangeCertificate;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function buildTwinProjection(
  input: PlaybackConsumerInput,
  deltas: readonly EpistemicDelta[],
): TwinSelectedGameProjection {
  return {
    schemaVersion: "twin-selected-game/v1",
    selectedGameId: input.gameId,
    envelopeDigest: input.envelopeDigest,
    currentState: input.events[input.events.length - 1]?.state ?? "UNKNOWN",
    eventIds: input.events.map((event) => event.id),
    deltas,
    contradictionEventIds: input.events
      .filter((event) => event.contradiction === "PRESENT")
      .map((event) => event.id),
    boundaryCrossingEventId:
      deltas.find((delta) => delta.boundaryTransition === "BECAME_CROSSED")?.eventId ?? null,
    accessibleTimeline: input.events.map((event) => event.accessibleText),
  };
}

function buildAutopsy(events: readonly IntelligenceEvent[]): PostgameAutopsyProjection {
  const settled = [...events].reverse().find(
    (event) => event.state === "SETTLED" && event.settlement.state === "CAPTURED",
  );
  if (!settled || settled.settlement.state !== "CAPTURED") {
    return {
      schemaVersion: "postgame-autopsy-projection/v1",
      status: "NOT_CAPTURED",
      result: null,
      clvState: "NOT_CAPTURED",
      calibrationState: "NOT_CAPTURED",
      learningState: "Settlement evidence was not captured, so no autopsy was projected.",
      citations: [],
    };
  }
  return {
    schemaVersion: "postgame-autopsy-projection/v1",
    status: "READY",
    result: settled.settlement.value.result,
    clvState: settled.clv.state,
    calibrationState: settled.calibration.state,
    learningState: settled.calibration.state === "CAPTURED"
      ? settled.calibration.value.effect
      : settled.calibration.reason,
    citations: [settled.id],
  };
}

function buildScenePackage(input: PlaybackConsumerInput): MediaStudioScenePackage {
  const evidenceEvents = input.events.filter((event) => event.evidenceIds.length > 0);
  const blockers = unique([
    ...(input.publication.status === "WITHHELD" ? ["publication withheld"] : []),
    ...(evidenceEvents.some((event) => event.rights !== "PUBLIC_DERIVED") ? ["non-public evidence rights"] : []),
    ...(evidenceEvents.some((event) => event.freshness !== "FRESH") ? ["evidence is not fresh"] : []),
    ...(evidenceEvents.some((event) => event.health !== "HEALTHY") ? ["source health is not healthy"] : []),
    ...(evidenceEvents.some((event) => event.contradiction === "PRESENT") ? ["unresolved contradiction"] : []),
    "human reviewer required",
  ]);
  return {
    schemaVersion: "intelligence-scene-package/v1",
    state: "DRAFT_ONLY",
    envelopeDigest: input.envelopeDigest,
    autoPublishAllowed: false,
    scenes: input.events.map((event) => ({
      id: `${event.id}:scene`,
      kind: event.act,
      eventId: event.id,
      script: `${event.state}: ${event.accessibleText}`,
      evidenceIds: event.evidenceIds,
      eventTime: event.eventTime,
      rights: event.rights,
      freshness: event.freshness,
      reviewStatus: "HUMAN_REVIEW_REQUIRED",
    })),
    exportPreflight: { allowed: false, blockers },
  };
}

export function buildPlaybackConsumerBundle(input: PlaybackConsumerInput): PlaybackConsumerBundle {
  const deltas = buildEpistemicDeltaLedger(input.events);
  return {
    twin: buildTwinProjection(input, deltas),
    autopsy: buildAutopsy(input.events),
    mediaStudio: buildScenePackage(input),
    brain: buildDecisionChangeCertificate(input.envelopeDigest, input.events),
  };
}
