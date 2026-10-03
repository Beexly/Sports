export const LADDER_TRACKS = ["fantasy", "betting"] as const;
export type LadderTrack = (typeof LADDER_TRACKS)[number];

export const PRICING_RUNGS = ["FOUNDING", "PROVEN", "ESTABLISHED", "AUTHORITY"] as const;
export type PricingRung = (typeof PRICING_RUNGS)[number];
export type EarnedPricingRung = Exclude<PricingRung, "FOUNDING">;

export const RUNG_REQUIREMENTS = {
  fantasy: {
    FOUNDING: {
      settledSamples: 0,
      minPositionSamples: 0,
      maxMeanAbsoluteError: Number.POSITIVE_INFINITY,
      minIntervalCoverage: 0,
      minRankCorrelation: Number.NEGATIVE_INFINITY,
      requiresFrozenCalibration: false,
    },
    PROVEN: {
      settledSamples: 100,
      minPositionSamples: 25,
      maxMeanAbsoluteError: 4,
      minIntervalCoverage: 0.75,
      minRankCorrelation: 0.25,
      requiresFrozenCalibration: true,
    },
    ESTABLISHED: {
      settledSamples: 500,
      minPositionSamples: 75,
      maxMeanAbsoluteError: 3.5,
      minIntervalCoverage: 0.78,
      minRankCorrelation: 0.3,
      requiresFrozenCalibration: true,
    },
    AUTHORITY: {
      settledSamples: 2000,
      minPositionSamples: 200,
      maxMeanAbsoluteError: 3,
      minIntervalCoverage: 0.8,
      minRankCorrelation: 0.35,
      requiresFrozenCalibration: true,
    },
  },
  betting: {
    FOUNDING: {
      settledSamples: 0,
      minClvBeatRate: 0,
      maxBrierScore: Number.POSITIVE_INFINITY,
      maxLogLoss: Number.POSITIVE_INFINITY,
      requiresFrozenCalibration: false,
    },
    PROVEN: {
      settledSamples: 100,
      minClvBeatRate: 0.524,
      maxBrierScore: 0.24,
      maxLogLoss: 0.7,
      requiresFrozenCalibration: true,
    },
    ESTABLISHED: {
      settledSamples: 500,
      minClvBeatRate: 0.524,
      maxBrierScore: 0.235,
      maxLogLoss: 0.68,
      requiresFrozenCalibration: true,
    },
    AUTHORITY: {
      settledSamples: 2000,
      minClvBeatRate: 0.55,
      maxBrierScore: 0.225,
      maxLogLoss: 0.65,
      requiresFrozenCalibration: true,
    },
  },
} as const;

export type LadderSampleKind = "canonical" | "bootstrap";
export type LadderCalibrationProposalStatus = "DRAFT" | "ACKNOWLEDGED" | "IMPLEMENTED" | "REJECTED";

export type LadderEventType =
  | "SETTLED_SAMPLE_REACHED"
  | "FANTASY_PROOF_RECORDED"
  | "BETTING_PROOF_RECORDED"
  | "CALIBRATION_PUBLISHED";

export interface LadderEventBase<Type extends LadderEventType, Payload> {
  readonly id: string;
  readonly type: Type;
  readonly occurredAt: string;
  readonly modelVersion: string;
  readonly sourceEventId?: string | null;
  readonly payload: Payload;
}

export interface SettledSampleReachedPayload {
  readonly track: LadderTrack;
  readonly sample: LadderSampleKind;
  readonly settledCount: number;
  readonly threshold: number;
}

export interface FantasyPositionProof {
  readonly position: string;
  readonly sampleSize: number;
  readonly meanAbsoluteError: number;
  readonly intervalCoverage: number;
  readonly rankCorrelation: number;
}

export interface FantasyProofRecordedPayload {
  readonly track: "fantasy";
  readonly estimatorKey: string;
  readonly proofWindow: string;
  readonly positions: readonly FantasyPositionProof[];
}

export interface BettingProofRecordedPayload {
  readonly track: "betting";
  readonly estimatorKey: string;
  readonly proofWindow: string;
  readonly sampleSize: number;
  readonly clvBeatRate: number;
  readonly brierScore: number;
  readonly logLoss: number;
}

export interface CalibrationPublishedPayload {
  readonly track: LadderTrack;
  readonly proposalStatus: LadderCalibrationProposalStatus;
  readonly calibrationProposalId: string;
  readonly frozenModelVersion: string | null;
}

export type SettledSampleReachedEvent = LadderEventBase<
  "SETTLED_SAMPLE_REACHED",
  SettledSampleReachedPayload
>;
export type FantasyProofRecordedEvent = LadderEventBase<
  "FANTASY_PROOF_RECORDED",
  FantasyProofRecordedPayload
>;
export type BettingProofRecordedEvent = LadderEventBase<
  "BETTING_PROOF_RECORDED",
  BettingProofRecordedPayload
>;
export type CalibrationPublishedEvent = LadderEventBase<
  "CALIBRATION_PUBLISHED",
  CalibrationPublishedPayload
>;

export type LadderEvent =
  | SettledSampleReachedEvent
  | FantasyProofRecordedEvent
  | BettingProofRecordedEvent
  | CalibrationPublishedEvent;

export type LadderDerivedEventType =
  | "RUNG_ADVANCED"
  | "ESTIMATOR_PRICED"
  | "PROJECTIONS_PUBLISH_ENABLED"
  | "PERFORMANCE_STATS_ENABLED";

export interface LadderDerivation {
  readonly type: LadderDerivedEventType;
  readonly track: LadderTrack;
  readonly rung: PricingRung;
  readonly estimatorKey?: string;
  readonly sourceEventIds: readonly string[];
}

export interface LadderTrackCounts {
  readonly fantasy: number;
  readonly betting: number;
}

export interface LadderState {
  readonly currentRung: PricingRung;
  readonly trackRungs: Readonly<Record<LadderTrack, PricingRung>>;
  readonly settledSamples: {
    readonly canonical: LadderTrackCounts;
    readonly bootstrap: LadderTrackCounts;
  };
  readonly validCalibration: Readonly<Record<LadderTrack, boolean>>;
  readonly surfaceEligibility: {
    readonly canPublishProjections: boolean;
    readonly performanceStatsEnabled: boolean;
  };
  readonly pricedEstimators: readonly string[];
  readonly derivations: readonly LadderDerivation[];
}
