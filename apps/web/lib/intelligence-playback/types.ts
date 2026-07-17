export type EvidenceKind =
  | "ODDS_SNAPSHOT"
  | "SOURCE_SNAPSHOT"
  | "GAME_SIGNAL"
  | "PICK_SIGNAL_SNAPSHOT"
  | "GATE_DECISION"
  | "PROOF_RECEIPT";

export type EvidenceDisposition = "SUPPORTING" | "WEAKENING" | "CONTRADICTED" | "CONTEXT";
export type SourceTier = "TIER_1" | "TIER_2" | "INTERNAL" | "UNKNOWN";
export type RightsState = "PUBLIC_DERIVED" | "INTERNAL_ONLY" | "UNKNOWN";
export type HealthState = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
export type FreshnessState = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type ContradictionState = "NONE" | "PRESENT" | "UNKNOWN";

export interface CapturedEvidence {
  readonly state: "CAPTURED";
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly label: string;
  readonly sourceId: string;
  readonly sourceTier: SourceTier;
  readonly rights: RightsState;
  readonly health: HealthState;
  readonly fetchedAt: string;
  readonly effectiveAt: string | null;
  readonly expiresAt: string | null;
  readonly freshness: FreshnessState;
  readonly contradiction: ContradictionState;
  readonly disposition: EvidenceDisposition;
  readonly summary: string;
}

export interface NotCapturedEvidence {
  readonly state: "NOT_CAPTURED";
  readonly kind: EvidenceKind;
  readonly label: string;
  readonly reason: string;
}

export type EvidenceRecord = CapturedEvidence | NotCapturedEvidence;

export interface FactorInput {
  readonly key: string;
  readonly label: string;
  readonly state: "ACTIVE" | "INACTIVE" | "UNKNOWN";
  readonly disposition: EvidenceDisposition | "UNKNOWN";
  readonly evidenceIds: readonly string[];
}

export interface BoundFactor extends FactorInput {
  readonly binding: "BOUND" | "NOT_CAPTURED" | "NOT_APPLICABLE";
}

export interface DecisionBoundary {
  readonly metric: string;
  readonly observedValue: number | null;
  readonly threshold: number | null;
  readonly crossed: boolean | null;
}

interface DecisionBase {
  readonly gateDecisionId: string | null;
  readonly decidedAt: string;
  readonly reason: string;
  readonly reasonCode: string;
  readonly boundary: DecisionBoundary;
  readonly reversalCondition: string;
}

export interface PublishedDecision extends DecisionBase {
  readonly kind: "PUBLISHED";
  readonly pickId: string;
  readonly selection: string;
}

export interface PassedDecision extends DecisionBase {
  readonly kind: "PASSED";
}

export type EvidenceDecision = PublishedDecision | PassedDecision;

export interface MarketState {
  readonly kind: string;
  readonly offeredPrice: number | null;
  readonly offeredPoint: number | null;
  readonly bookCoverage: number | null;
  readonly dispersion: number | null;
  readonly movement: number | null;
  readonly capturedAt: string | null;
}

export interface ModelState {
  readonly version: string;
  readonly rawInternalOutput: string | null;
  readonly publicRepresentation: string;
  readonly uncertainty: string;
  readonly disagreement: string | null;
}

export type Capture<T> =
  | { readonly state: "CAPTURED"; readonly value: T }
  | { readonly state: "NOT_CAPTURED"; readonly reason: string };

export interface ProofReceiptState {
  readonly id: string;
  readonly contentHash: string;
  readonly frozenAt: string;
}

export interface SettlementState {
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly settledAt: string;
}

export interface ClvState {
  readonly kind: "POINTS" | "PROBABILITY";
  readonly value: number;
  readonly verdict: "BEAT_CLOSE" | "MATCHED_CLOSE" | "LOST_TO_CLOSE";
  readonly capturedAt: string;
}

export interface CalibrationState {
  readonly effect: string;
  readonly recordedAt: string;
}

export interface PickEvidenceEnvelopeInput {
  readonly envelopeId: string;
  readonly createdAt: string;
  readonly game: {
    readonly id: string;
    readonly sport: string;
    readonly matchup: string;
    readonly commenceTime: string;
  };
  readonly decision: EvidenceDecision;
  readonly market: MarketState;
  readonly model: ModelState;
  readonly evidence: readonly EvidenceRecord[];
  readonly factors: readonly FactorInput[];
  readonly receipt: Capture<ProofReceiptState>;
  readonly settlement: Capture<SettlementState>;
  readonly clv: Capture<ClvState>;
  readonly calibration: Capture<CalibrationState>;
}

export interface PublicationState {
  readonly status: "ELIGIBLE" | "WITHHELD";
  readonly requiredKinds: readonly EvidenceKind[];
  readonly missingKinds: readonly EvidenceKind[];
  readonly unboundFactors: readonly string[];
  readonly blockedEvidenceIds: readonly string[];
  readonly reasonCodes: readonly string[];
}

export interface PickEvidenceEnvelope extends PickEvidenceEnvelopeInput {
  readonly schemaVersion: "pick-evidence-envelope/v1";
  readonly factors: readonly BoundFactor[];
  readonly publication: PublicationState;
  readonly digest: string;
}

export type EvidenceAudience = "PUBLIC" | "PAID" | "COCKPIT";

export interface PickEvidenceProjection {
  readonly audience: EvidenceAudience;
  readonly digest: string;
  readonly publication: PublicationState;
  readonly decision: {
    readonly kind: EvidenceDecision["kind"];
    readonly selection: string | null;
    readonly publicRepresentation: string;
    readonly rawInternalOutput: string | null;
    readonly reason: string;
    readonly boundary: DecisionBoundary;
    readonly reversalCondition: string;
  };
  readonly evidence: readonly EvidenceRecord[];
  readonly factors: readonly BoundFactor[];
}

export type IntelligenceLifecycleState =
  | "UNKNOWN"
  | "OBSERVED"
  | "CORROBORATED"
  | "SCORED"
  | "PUBLISHED"
  | "PASSED"
  | "SETTLED"
  | "RECALIBRATED";

export interface IntelligenceEvent {
  readonly id: string;
  readonly sequence: number;
  readonly state: IntelligenceLifecycleState;
  readonly act: "OPEN" | "EVIDENCE_ARRIVES" | "VIEW_CHANGES" | "PUBLISH_OR_PASS" | "AFTER_CLOSE";
  readonly eventTime: string;
  readonly effectiveTime: string | null;
  readonly evidenceIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly sourceTier: SourceTier;
  readonly rights: RightsState;
  readonly health: HealthState;
  readonly freshness: FreshnessState;
  readonly contradiction: ContradictionState;
  readonly market: MarketState;
  readonly modelVersion: string;
  readonly rawInternalOutput: string | null;
  readonly publicRepresentation: string;
  readonly uncertainty: string;
  readonly disagreement: string | null;
  readonly decisionBoundary: DecisionBoundary;
  readonly boundaryCrossed: boolean | null;
  readonly supportingEvidenceIds: readonly string[];
  readonly weakeningEvidenceIds: readonly string[];
  readonly reversalCondition: string;
  readonly settlement: Capture<SettlementState>;
  readonly clv: Capture<ClvState>;
  readonly calibration: Capture<CalibrationState>;
  readonly accessibleText: string;
}
