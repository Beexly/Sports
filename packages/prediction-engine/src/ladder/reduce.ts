import {
  PRICING_RUNGS,
  RUNG_REQUIREMENTS,
  type BettingProofRecordedEvent,
  type BettingProofRecordedPayload,
  type EarnedPricingRung,
  type FantasyProofRecordedEvent,
  type FantasyProofRecordedPayload,
  type LadderDerivation,
  type LadderEvent,
  type LadderState,
  type LadderTrack,
  type PricingRung,
} from "@sports/types";

export { RUNG_REQUIREMENTS } from "@sports/types";

const EARNED_RUNGS: readonly EarnedPricingRung[] = ["PROVEN", "ESTABLISHED", "AUTHORITY"] as const;

interface TrackEvidence {
  canonicalSettledCount: number;
  canonicalSettledEventId: string | null;
  bootstrapSettledCount: number;
  validCalibration: boolean;
  calibrationEventId: string | null;
  fantasyProofs: FantasyProofRecordedEvent[];
  bettingProofs: BettingProofRecordedEvent[];
}

interface TrackRungEvidence {
  rung: PricingRung;
  sourceEventIds: readonly string[];
  estimatorKeys: readonly string[];
}

const RUNG_RANK: Readonly<Record<PricingRung, number>> = {
  FOUNDING: 0,
  PROVEN: 1,
  ESTABLISHED: 2,
  AUTHORITY: 3,
};

export function reduceLadder(events: readonly LadderEvent[]): LadderState {
  const evidenceByTrack: Record<LadderTrack, TrackEvidence> = {
    fantasy: emptyTrackEvidence(),
    betting: emptyTrackEvidence(),
  };

  for (const event of sortedEvents(events)) {
    applyEvent(evidenceByTrack, event);
  }

  const fantasy = resolveFantasyRung(evidenceByTrack.fantasy);
  const betting = resolveBettingRung(evidenceByTrack.betting);
  const canPublishProjections = RUNG_RANK[fantasy.rung] >= RUNG_RANK.PROVEN;
  const performanceStatsEnabled = RUNG_RANK[betting.rung] >= RUNG_RANK.PROVEN;

  return {
    currentRung: lowerRung(fantasy.rung, betting.rung),
    trackRungs: {
      fantasy: fantasy.rung,
      betting: betting.rung,
    },
    settledSamples: {
      canonical: {
        fantasy: evidenceByTrack.fantasy.canonicalSettledCount,
        betting: evidenceByTrack.betting.canonicalSettledCount,
      },
      bootstrap: {
        fantasy: evidenceByTrack.fantasy.bootstrapSettledCount,
        betting: evidenceByTrack.betting.bootstrapSettledCount,
      },
    },
    validCalibration: {
      fantasy: evidenceByTrack.fantasy.validCalibration,
      betting: evidenceByTrack.betting.validCalibration,
    },
    surfaceEligibility: {
      canPublishProjections,
      performanceStatsEnabled,
    },
    pricedEstimators: betting.estimatorKeys,
    derivations: deriveEvents({
      fantasy,
      betting,
      canPublishProjections,
      performanceStatsEnabled,
    }),
  };
}

function emptyTrackEvidence(): TrackEvidence {
  return {
    canonicalSettledCount: 0,
    canonicalSettledEventId: null,
    bootstrapSettledCount: 0,
    validCalibration: false,
    calibrationEventId: null,
    fantasyProofs: [],
    bettingProofs: [],
  };
}

function sortedEvents(events: readonly LadderEvent[]): LadderEvent[] {
  return [...events].sort((left, right) => {
    const byTime = left.occurredAt.localeCompare(right.occurredAt);
    if (byTime !== 0) {
      return byTime;
    }

    return left.id.localeCompare(right.id);
  });
}

function applyEvent(evidenceByTrack: Record<LadderTrack, TrackEvidence>, event: LadderEvent): void {
  if (event.type === "SETTLED_SAMPLE_REACHED") {
    const trackEvidence = evidenceByTrack[event.payload.track];
    if (event.payload.sample === "canonical" && event.payload.settledCount > trackEvidence.canonicalSettledCount) {
      trackEvidence.canonicalSettledCount = event.payload.settledCount;
      trackEvidence.canonicalSettledEventId = event.id;
    }

    if (event.payload.sample === "bootstrap" && event.payload.settledCount > trackEvidence.bootstrapSettledCount) {
      trackEvidence.bootstrapSettledCount = event.payload.settledCount;
    }
    return;
  }

  if (event.type === "CALIBRATION_PUBLISHED") {
    const trackEvidence = evidenceByTrack[event.payload.track];
    const hasFrozenModelVersion = event.payload.frozenModelVersion === event.modelVersion;
    if (event.payload.proposalStatus === "IMPLEMENTED" && hasFrozenModelVersion) {
      trackEvidence.validCalibration = true;
      trackEvidence.calibrationEventId = event.id;
    }
    return;
  }

  if (event.type === "FANTASY_PROOF_RECORDED") {
    evidenceByTrack.fantasy.fantasyProofs.push(event);
    return;
  }

  evidenceByTrack.betting.bettingProofs.push(event);
}

function resolveFantasyRung(evidence: TrackEvidence): TrackRungEvidence {
  let best: TrackRungEvidence = foundingEvidence();

  for (const rung of EARNED_RUNGS) {
    const requirement = RUNG_REQUIREMENTS.fantasy[rung];
    const proof = evidence.fantasyProofs.find((candidate) =>
      fantasyProofSatisfies(candidate.payload, requirement)
    );

    if (
      proof !== undefined &&
      evidence.canonicalSettledCount >= requirement.settledSamples &&
      calibrationSatisfied(evidence, requirement.requiresFrozenCalibration)
    ) {
      best = {
        rung,
        sourceEventIds: sourceEventIds(evidence.canonicalSettledEventId, evidence.calibrationEventId, proof.id),
        estimatorKeys: [proof.payload.estimatorKey],
      };
    }
  }

  return best;
}

function resolveBettingRung(evidence: TrackEvidence): TrackRungEvidence {
  let best: TrackRungEvidence = foundingEvidence();

  for (const rung of EARNED_RUNGS) {
    const requirement = RUNG_REQUIREMENTS.betting[rung];
    const proof = evidence.bettingProofs.find((candidate) =>
      bettingProofSatisfies(candidate.payload, requirement)
    );

    if (
      proof !== undefined &&
      evidence.canonicalSettledCount >= requirement.settledSamples &&
      calibrationSatisfied(evidence, requirement.requiresFrozenCalibration)
    ) {
      best = {
        rung,
        sourceEventIds: sourceEventIds(evidence.canonicalSettledEventId, evidence.calibrationEventId, proof.id),
        estimatorKeys: uniqueSorted([proof.payload.estimatorKey]),
      };
    }
  }

  return best;
}

function foundingEvidence(): TrackRungEvidence {
  return {
    rung: "FOUNDING",
    sourceEventIds: [],
    estimatorKeys: [],
  };
}

function calibrationSatisfied(evidence: TrackEvidence, requiresFrozenCalibration: boolean): boolean {
  return !requiresFrozenCalibration || evidence.validCalibration;
}

function fantasyProofSatisfies(
  payload: FantasyProofRecordedPayload,
  requirement: (typeof RUNG_REQUIREMENTS)["fantasy"][EarnedPricingRung]
): boolean {
  if (payload.positions.length === 0) {
    return false;
  }

  return payload.positions.every(
    (position) =>
      position.sampleSize >= requirement.minPositionSamples &&
      position.meanAbsoluteError <= requirement.maxMeanAbsoluteError &&
      position.intervalCoverage >= requirement.minIntervalCoverage &&
      position.rankCorrelation >= requirement.minRankCorrelation
  );
}

function bettingProofSatisfies(
  payload: BettingProofRecordedPayload,
  requirement: (typeof RUNG_REQUIREMENTS)["betting"][EarnedPricingRung]
): boolean {
  return (
    payload.sampleSize >= requirement.settledSamples &&
    payload.clvBeatRate >= requirement.minClvBeatRate &&
    payload.brierScore <= requirement.maxBrierScore &&
    payload.logLoss <= requirement.maxLogLoss
  );
}

function sourceEventIds(...ids: readonly (string | null)[]): readonly string[] {
  const result: string[] = [];
  for (const id of ids) {
    if (id !== null) {
      result.push(id);
    }
  }

  return result;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function lowerRung(left: PricingRung, right: PricingRung): PricingRung {
  const rank = Math.min(RUNG_RANK[left], RUNG_RANK[right]);
  return PRICING_RUNGS.find((rung) => RUNG_RANK[rung] === rank) ?? "FOUNDING";
}

function deriveEvents(input: {
  readonly fantasy: TrackRungEvidence;
  readonly betting: TrackRungEvidence;
  readonly canPublishProjections: boolean;
  readonly performanceStatsEnabled: boolean;
}): readonly LadderDerivation[] {
  const derivations: LadderDerivation[] = [];

  appendRungDerivation(derivations, "fantasy", input.fantasy);
  appendRungDerivation(derivations, "betting", input.betting);

  if (input.canPublishProjections) {
    derivations.push({
      type: "PROJECTIONS_PUBLISH_ENABLED",
      track: "fantasy",
      rung: input.fantasy.rung,
      sourceEventIds: input.fantasy.sourceEventIds,
    });
  }

  if (input.performanceStatsEnabled) {
    derivations.push({
      type: "PERFORMANCE_STATS_ENABLED",
      track: "betting",
      rung: input.betting.rung,
      sourceEventIds: input.betting.sourceEventIds,
    });
  }

  return derivations;
}

function appendRungDerivation(
  derivations: LadderDerivation[],
  track: LadderTrack,
  evidence: TrackRungEvidence
): void {
  if (evidence.rung === "FOUNDING") {
    return;
  }

  derivations.push({
    type: "RUNG_ADVANCED",
    track,
    rung: evidence.rung,
    sourceEventIds: evidence.sourceEventIds,
  });

  for (const estimatorKey of evidence.estimatorKeys) {
    derivations.push({
      type: "ESTIMATOR_PRICED",
      track,
      rung: evidence.rung,
      estimatorKey,
      sourceEventIds: evidence.sourceEventIds,
    });
  }
}
