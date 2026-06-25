/**
 * DECISION FIELD RUNTIME — Galileo Field fixtures.
 *
 * Field 001 — one deterministic scenario that exercises the entire organism:
 *   • A WR's role steps up (route rate + target share rise), knowable before the decision.
 *   • A receiving prop moves at two books at DIFFERENT first-seen times (a source race).
 *   • Sleeper add/drop is still quiet (the crowd hasn't reacted).
 *   • There is NO timestamped fantasy projection snapshot (the fantasy-late claim is BLOCKED).
 *   • A fantasy-vs-reality disagreement registers as a contradiction signal (not noise).
 *   • A prior box-score-trap ghost resembles but does not clear the 0.5 suppress bar.
 *   • An injury update arrives AFTER the decision time (future leakage → excluded).
 *   • A weather fact is knowable but changes nothing (an over-observation).
 * Expected: a WATCH card (not an ADD), proven, with a Why-not and a receipt.
 */

import { type TemporalFact, type FactType, type LegalVerdict, entityRef } from "@sports/data-intelligence";
import type { RegimeInputs } from "@sports/engine";
import type { DecisionFieldInput, SubjectInput } from "./run-decision-field-frame.js";

const DELL = entityRef("player", "dell");
const DECISION_TIME = "2026-09-14T17:00:00Z";

interface FactSeed {
  readonly factId: string;
  readonly factType: FactType;
  readonly value: unknown;
  readonly sourceId: string;
  readonly endpointId: string;
  readonly observedAt: string;
  readonly firstSeenByGseAt: string;
  readonly confidence: number;
  readonly rightsStatus: LegalVerdict;
}

function mkFact(s: FactSeed): TemporalFact {
  return {
    factId: s.factId,
    entityIds: [DELL],
    factType: s.factType,
    value: s.value,
    sourceId: s.sourceId,
    endpointId: s.endpointId,
    observedAt: s.observedAt,
    fetchedAt: s.firstSeenByGseAt,
    firstSeenByGseAt: s.firstSeenByGseAt,
    sourcePayloadHash: `hash:${s.factId}`,
    confidence: s.confidence,
    rightsStatus: s.rightsStatus,
  };
}

const FIELD_001_FACTS: readonly TemporalFact[] = [
  mkFact({ factId: "f_route", factType: "route_rate", value: { routeRate: 0.82 }, sourceId: "nflverse", endpointId: "nflverse:pbp", observedAt: "2026-09-14T15:00:00Z", firstSeenByGseAt: "2026-09-14T15:30:00Z", confidence: 0.9, rightsStatus: "FREE_OPEN" }),
  mkFact({ factId: "f_targets", factType: "target_share", value: { targetShare: 0.27 }, sourceId: "nflverse", endpointId: "nflverse:pbp", observedAt: "2026-09-14T15:00:00Z", firstSeenByGseAt: "2026-09-14T15:30:00Z", confidence: 0.88, rightsStatus: "FREE_OPEN" }),
  // Two market observers race: the_odds_api saw the prop move first (16:03), sportsgameodds lagged (16:07).
  mkFact({ factId: "f_propA", factType: "player_prop", value: { line: 58.5 }, sourceId: "the_odds_api", endpointId: "oddsapi:props", observedAt: "2026-09-14T16:03:00Z", firstSeenByGseAt: "2026-09-14T16:03:00Z", confidence: 0.85, rightsStatus: "LICENSED" }),
  mkFact({ factId: "f_propB", factType: "player_prop", value: { line: 59.5 }, sourceId: "sportsgameodds", endpointId: "sgo:props", observedAt: "2026-09-14T16:07:00Z", firstSeenByGseAt: "2026-09-14T16:07:00Z", confidence: 0.8, rightsStatus: "LICENSED" }),
  // Fantasy crowd clock: still quiet (a strengthener, NOT a projection snapshot).
  mkFact({ factId: "f_adddrop", factType: "add_drop_velocity", value: { addPct: 0.02 }, sourceId: "sleeper", endpointId: "sleeper:trending", observedAt: "2026-09-14T14:00:00Z", firstSeenByGseAt: "2026-09-14T14:30:00Z", confidence: 0.7, rightsStatus: "FREE_CAUTION" }),
  // Knowable but changes nothing → an over-observation.
  mkFact({ factId: "f_weather", factType: "weather", value: { windMph: 5 }, sourceId: "nws", endpointId: "nws:forecast", observedAt: "2026-09-14T13:00:00Z", firstSeenByGseAt: "2026-09-14T13:30:00Z", confidence: 0.95, rightsStatus: "FREE_OPEN" }),
  // Arrives AFTER the decision → future leakage, excluded by the light cone.
  mkFact({ factId: "f_future_injury", factType: "injury_report", value: { status: "questionable" }, sourceId: "nflverse", endpointId: "nflverse:injuries", observedAt: "2026-09-14T18:00:00Z", firstSeenByGseAt: "2026-09-14T18:30:00Z", confidence: 0.8, rightsStatus: "FREE_OPEN" }),
];

const DELL_SUBJECT: SubjectInput = {
  entityId: DELL.id,
  subjectLabel: "Tank Dell",
  decisionState: "ROLE_UP_FANTASY_LATE",
  candidateShape: { marketFamily: "player_rec_yds", side: "OVER", structure: "role_rise", regime: "DerivativeStaleness" },
  ghostClusters: [
    {
      id: "ghost:td_spike",
      shape: { marketFamily: "player_rec_yds", side: "OVER", structure: "td_spike", regime: "PublicOverreaction" },
      failureReason: "public_overreaction",
      severity: 0.7,
      recencyWeight: 0.8,
    },
  ],
  tradability: {
    rawEdge: 0.03,
    vig: 0.01,
    spread: 0.005,
    latencyCost: 0.002,
    executeMin: 2,
    windowMin: 60,
    limitProxy: 0.5,
    correlationPenalty: 0.003,
    modelError: 0.005,
    dataQualityOk: true,
    publicationDelayCost: 0.002,
  },
  conservation: { channel: "targets", removed: 0.5, redistributed: 0.1, strategyShift: 0.05, efficiencyDecay: 0.05, opponentEffect: 0.05 },
  roleQuality: 0.7,
  normalizedProduction: 0.4,
  proofQuality: 0.7,
  rightsClearedForPublic: true,
  realityDelta: 0.7,
  marketVelocity: 0.5,
  fantasyAbsorptionGap: 0.7,
  deadlinePressure: 0.7,
  userContextWeight: 1,
  marketAlreadyCaughtUp: false,
  lockTime: "2026-09-14T17:05:00Z",
};

// Derivative-staleness regime: the main moved, derivatives slow to absorb; non-suppressing.
const FIELD_001_REGIME: RegimeInputs = {
  bookDispersion: 0.3,
  lineVelocity: 0.7,
  altCurvature: 0.1,
  liquidityProxy: 0.6,
  newsDensity: 0.2,
  publicAttention: 0.2,
  injuryUncertainty: 0.1,
  hoursToEvent: 3,
  absorptionSpeed: 0.2,
};

export const field001Input: DecisionFieldInput = {
  frameId: "field-001",
  week: "2026-W02",
  capturedAt: "2026-09-14T16:30:00Z",
  decisionTime: DECISION_TIME,
  facts: FIELD_001_FACTS,
  subjects: [DELL_SUBJECT],
  regimeInputs: FIELD_001_REGIME,
};

/** Determinism guard: strip the role-delta facts; the same scenario must downgrade/suppress. */
export const field001WithoutRoleInput: DecisionFieldInput = {
  ...field001Input,
  frameId: "field-001-no-role",
  facts: FIELD_001_FACTS.filter((f) => f.factType !== "route_rate" && f.factType !== "target_share"),
};

/**
 * Authority-gate proof: the SAME scenario, but declared as live, readiness-cleared, public-authorized.
 * This is the only way the card may reach the WATCH its evidence licenses — proving the default FIXTURE
 * run is held at INFO_ONLY by the data-mode gate, not by the evidence. (Illustrative inputs only — this
 * fixture asserts the GATE's behavior; it does not make any real data live.)
 */
export const field001LiveAuthorizedInput: DecisionFieldInput = {
  ...field001Input,
  frameId: "field-001-live",
  authority: {
    dataMode: "LIVE_REAL",
    modelAuthority: "PUBLIC_ALLOWED",
    readinessAuthorized: true,
    publicationAuthority: "PUBLIC",
  },
};
