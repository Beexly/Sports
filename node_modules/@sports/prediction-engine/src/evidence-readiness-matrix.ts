import type { EvidenceActivationStatus, EvidenceRecord, SignalCategory } from "@sports/types";
import type { LogitPoolResult } from "./edge-lab/logit-pool.js";

/**
 * The exact "the model adds information beyond the market" verdict string
 * from edge-lab/logit-pool.ts's LogitPoolResult.verdict (read from source,
 * not guessed) — trueEv activation reads this artifact's value for equality,
 * it never re-derives it. Typed against LogitPoolResult so a future rename
 * of that union in logit-pool.ts fails this file's typecheck instead of
 * silently going stale.
 */
const LOGIT_POOL_ADDS_INFORMATION_VERDICT: LogitPoolResult["verdict"] = "MODEL_ADDS_INFORMATION";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type EvidenceFactorKey =
  | "market.odds"
  | "market.lineMovement"
  | "schedule.rest"
  | "schedule.density"
  | "team.pace"
  | "team.divisionContext"
  | "player.availability"
  | "official.tendencies"
  | "venue.environment"
  | "venue.history"
  | "milestone.context"
  | "model.independentFairProbability"
  | "model.trueEv";

export type EvidenceMatrixStatus =
  | "ACTIVE"
  | "SHADOW_READY"
  | "SHADOW_COLLECTING"
  | "BLOCKED"
  | "ABSENT";

export type FailureHorizon = "TWO_WEEKS" | "TWO_MONTHS" | "SEASON";

export interface EvidenceFactorDefinition {
  readonly key: EvidenceFactorKey;
  readonly label: string;
  readonly sourceCategories: readonly SignalCategory[];
  readonly minTrustLevel: number;
  readonly minSampleSize: number;
  readonly maxAgeMs: number;
  readonly requiredForPublicPick: boolean;
  readonly canContributeWhenActive: boolean;
  readonly activationRequirement: string;
  readonly failureHorizon: FailureHorizon;
  readonly failureMode: string;
}

export interface EvidenceMatrixRow {
  readonly key: EvidenceFactorKey;
  readonly label: string;
  readonly status: EvidenceMatrixStatus;
  readonly canContributeToScore: boolean;
  readonly evidenceCount: number;
  readonly bestSourceName: string | null;
  readonly bestTrustLevel: number;
  readonly bestSampleSize: number | null;
  readonly ageMinutes: number | null;
  readonly blockers: readonly string[];
  readonly action: string;
  readonly failureHorizon: FailureHorizon;
  readonly failureMode: string;
}

export interface EvidenceReadinessMatrix {
  readonly generatedAt: Date;
  readonly rows: readonly EvidenceMatrixRow[];
  readonly integrityScore: number;
  readonly activeContributingFactors: number;
  readonly shadowReadyFactors: number;
  readonly blockedCriticalFactors: readonly EvidenceFactorKey[];
  readonly nextBestActions: readonly string[];
}

export const EVIDENCE_FACTOR_DEFINITIONS: readonly EvidenceFactorDefinition[] = [
  {
    key: "market.odds",
    label: "Market board",
    sourceCategories: ["ODDS"],
    minTrustLevel: 0.75,
    minSampleSize: 1,
    maxAgeMs: 30 * MIN,
    requiredForPublicPick: true,
    canContributeWhenActive: true,
    activationRequirement: "Live odds source with current bookmaker coverage.",
    failureHorizon: "TWO_WEEKS",
    failureMode: "Refresh drift or provider quota exhaustion makes every downstream signal stale.",
  },
  {
    key: "market.lineMovement",
    label: "Line movement",
    sourceCategories: ["MARKET_SENTIMENT", "ODDS"],
    minTrustLevel: 0.75,
    minSampleSize: 2,
    maxAgeMs: 2 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Opening and current prices from the same market family.",
    failureHorizon: "TWO_WEEKS",
    failureMode: "Opening-line gaps make movement look sharper than it is.",
  },
  {
    key: "schedule.rest",
    label: "Rest state",
    sourceCategories: ["SCHEDULE"],
    minTrustLevel: 0.8,
    minSampleSize: 1,
    maxAgeMs: 7 * DAY,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Schedule adapter identifies rest days and back-to-back state.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "Postponements and neutral-site games corrupt rest calculations if not reconciled.",
  },
  {
    key: "schedule.density",
    label: "Schedule density",
    sourceCategories: ["SCHEDULE"],
    minTrustLevel: 0.8,
    minSampleSize: 3,
    maxAgeMs: 7 * DAY,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Recent team game log supports seven-day density.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "Compressed slates create false fatigue if travel and minutes are ignored.",
  },
  {
    key: "team.pace",
    label: "Pace profile",
    sourceCategories: ["PACE", "TEAM_RATES"],
    minTrustLevel: 0.75,
    minSampleSize: 8,
    maxAgeMs: 3 * DAY,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Team-rate source has enough recent possessions / plays / shots context.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "Early-season and injury-skewed pace samples overfit the last few games.",
  },
  {
    key: "team.divisionContext",
    label: "Division context",
    sourceCategories: ["DIVISION_CONTEXT", "STANDINGS"],
    minTrustLevel: 0.75,
    minSampleSize: 1,
    maxAgeMs: 2 * DAY,
    requiredForPublicPick: false,
    canContributeWhenActive: false,
    activationRequirement: "Standings source and division metadata reconciled.",
    failureHorizon: "SEASON",
    failureMode: "Motivation narratives become noisy unless tied to standings math and timing.",
  },
  {
    key: "player.availability",
    label: "Player availability",
    sourceCategories: ["PLAYER_AVAILABILITY", "INJURIES"],
    minTrustLevel: 0.85,
    minSampleSize: 1,
    maxAgeMs: 6 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Official or licensed injury/lineup feed with update timestamp.",
    failureHorizon: "TWO_WEEKS",
    failureMode: "Late scratches and ambiguous statuses can flip a pick after publication.",
  },
  {
    key: "official.tendencies",
    label: "Officials",
    sourceCategories: ["OFFICIALS"],
    minTrustLevel: 0.85,
    minSampleSize: 20,
    maxAgeMs: 24 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Official assignment plus historical same-sport tendency sample.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "Small crews and playoff assignments create selection bias.",
  },
  {
    key: "venue.environment",
    label: "Venue environment",
    sourceCategories: ["VENUE_ENVIRONMENT", "WEATHER"],
    minTrustLevel: 0.8,
    minSampleSize: 1,
    maxAgeMs: 6 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Venue, weather, surface, roof/park state, and game-time forecast aligned.",
    failureHorizon: "TWO_WEEKS",
    failureMode: "Roof decisions and wind shifts can invalidate totals logic quickly.",
  },
  {
    key: "venue.history",
    label: "Venue history",
    sourceCategories: ["VENUE_ENVIRONMENT"],
    minTrustLevel: 0.75,
    minSampleSize: 30,
    maxAgeMs: 30 * DAY,
    requiredForPublicPick: false,
    canContributeWhenActive: true,
    activationRequirement: "Venue-specific outcomes linked to sport and market type.",
    failureHorizon: "SEASON",
    failureMode: "Roster, rule, or park changes can make old venue priors decay silently.",
  },
  {
    key: "milestone.context",
    label: "Milestone context",
    sourceCategories: ["MILESTONES"],
    minTrustLevel: 0.8,
    minSampleSize: 1,
    maxAgeMs: 24 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: false,
    activationRequirement: "Milestone source must cite team/player context without narrative inflation.",
    failureHorizon: "SEASON",
    failureMode: "Human-story data becomes bias if it is not proven predictive in shadow mode.",
  },
  {
    key: "model.independentFairProbability",
    label: "Independent fair probability",
    sourceCategories: ["RATINGS", "TEAM_RATES", "PLAYER_AVAILABILITY", "PACE"],
    minTrustLevel: 0.85,
    minSampleSize: 30,
    maxAgeMs: 24 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: false,
    activationRequirement: "Non-market model probability validated against settled outcomes.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "Market-derived probability masquerades as independent EV.",
  },
  {
    key: "model.trueEv",
    label: "True EV",
    sourceCategories: ["RATINGS", "TEAM_RATES", "PLAYER_AVAILABILITY", "PACE"],
    minTrustLevel: 0.85,
    minSampleSize: 100,
    maxAgeMs: 24 * HOUR,
    requiredForPublicPick: false,
    canContributeWhenActive: false,
    activationRequirement: "Independent fair probability is active and calibrated first.",
    failureHorizon: "TWO_MONTHS",
    failureMode: "EV math becomes false precision without an independent probability source.",
  },
];

const DEFINITIONS_BY_KEY = new Map(
  EVIDENCE_FACTOR_DEFINITIONS.map((definition) => [definition.key, definition])
);

/**
 * The edge-lab honesty-engine artifact (handoff §2 P1) that gates
 * model.trueEv activation. Absent by default (zero behavior change for
 * existing callers — trueEv stays blocked by fiat, as before). When
 * supplied, trueEv's fiat blocker lifts iff logitPoolVerdict equals the
 * REAL "adds information" verdict string from edge-lab/logit-pool.ts AND
 * tunedTau is a real (non-null) tuned threshold from edge-lab/selective-gate.ts's
 * tuneTau — a FIRE_NOTHING verdict or a null tau (honest "fire nothing")
 * both keep it blocked.
 */
export interface EdgeLabVerdictInput {
  readonly logitPoolVerdict: string;
  readonly tunedTau: number | null;
}

export interface BuildEvidenceReadinessMatrixInput {
  readonly evidence: readonly EvidenceRecord[];
  readonly now?: Date;
  readonly edgeLabVerdict?: EdgeLabVerdictInput;
}

export function getEvidenceFactorDefinition(
  key: EvidenceFactorKey
): EvidenceFactorDefinition {
  const definition = DEFINITIONS_BY_KEY.get(key);
  if (!definition) {
    throw new Error(`Unknown evidence factor: ${key}`);
  }
  return definition;
}

export function buildEvidenceReadinessMatrix(
  input: BuildEvidenceReadinessMatrixInput
): EvidenceReadinessMatrix {
  const now = input.now ?? new Date();
  const rows = EVIDENCE_FACTOR_DEFINITIONS.map((definition) =>
    evaluateFactor(definition, input.evidence, now, input.edgeLabVerdict)
  );
  const integrityScore = computeIntegrityScore(rows);
  const blockedCriticalFactors = rows
    .filter((row) => {
      const definition = getEvidenceFactorDefinition(row.key);
      return definition.requiredForPublicPick && row.status !== "ACTIVE";
    })
    .map((row) => row.key);

  return {
    generatedAt: now,
    rows,
    integrityScore,
    activeContributingFactors: rows.filter((row) => row.canContributeToScore).length,
    shadowReadyFactors: rows.filter((row) => row.status === "SHADOW_READY").length,
    blockedCriticalFactors,
    nextBestActions: buildNextBestActions(rows),
  };
}

function evaluateFactor(
  definition: EvidenceFactorDefinition,
  evidence: readonly EvidenceRecord[],
  now: Date,
  edgeLabVerdict?: EdgeLabVerdictInput
): EvidenceMatrixRow {
  const matching = evidence.filter((record) =>
    definition.sourceCategories.includes(record.sourceCategory)
  );
  if (matching.length === 0) {
    return buildAbsentRow(definition);
  }

  const ranked = [...matching].sort((a, b) => rankEvidence(b, now) - rankEvidence(a, now));
  const best = ranked[0]!;
  const blockers = factorBlockers(definition, best, now, edgeLabVerdict);
  const status = deriveStatus(definition, best, blockers);
  const canContributeToScore =
    status === "ACTIVE" && definition.canContributeWhenActive;

  return {
    key: definition.key,
    label: definition.label,
    status,
    canContributeToScore,
    evidenceCount: matching.length,
    bestSourceName: best.sourceName,
    bestTrustLevel: normalizeTrust(best.trustLevel),
    bestSampleSize: best.sampleSize ?? null,
    ageMinutes: Math.max(0, Math.round((now.getTime() - best.fetchedAt.getTime()) / MIN)),
    blockers,
    action: actionForStatus(definition, status, blockers),
    failureHorizon: definition.failureHorizon,
    failureMode: definition.failureMode,
  };
}

function buildAbsentRow(definition: EvidenceFactorDefinition): EvidenceMatrixRow {
  return {
    key: definition.key,
    label: definition.label,
    status: "ABSENT",
    canContributeToScore: false,
    evidenceCount: 0,
    bestSourceName: null,
    bestTrustLevel: 0,
    bestSampleSize: null,
    ageMinutes: null,
    blockers: [`No source evidence for ${definition.sourceCategories.join(" or ")}.`],
    action: definition.activationRequirement,
    failureHorizon: definition.failureHorizon,
    failureMode: definition.failureMode,
  };
}

function rankEvidence(record: EvidenceRecord, now: Date): number {
  const trust = normalizeTrust(record.trustLevel) * 100;
  const ageMinutes = Math.max(0, (now.getTime() - record.fetchedAt.getTime()) / MIN);
  const freshnessBonus =
    record.freshnessStatus === "FRESH"
      ? 40
      : record.freshnessStatus === "AGING"
        ? 15
        : 0;
  const activationBonus =
    record.activationStatus === "ACTIVE"
      ? 30
      : record.activationStatus === "SHADOW_ONLY"
        ? 10
        : 0;
  return trust + freshnessBonus + activationBonus - Math.min(ageMinutes / 10, 30);
}

function factorBlockers(
  definition: EvidenceFactorDefinition,
  record: EvidenceRecord,
  now: Date,
  edgeLabVerdict?: EdgeLabVerdictInput
): readonly string[] {
  const blockers: string[] = [];
  const trust = normalizeTrust(record.trustLevel);
  const sampleSize = record.sampleSize ?? 0;
  const ageMs = Math.max(0, now.getTime() - record.fetchedAt.getTime());

  if (record.isBootstrap) {
    blockers.push("Bootstrap evidence cannot activate scoring.");
  }
  if (record.freshnessStatus === "MISSING") {
    blockers.push("Evidence freshness is missing.");
  }
  if (record.freshnessStatus === "STALE" || ageMs > definition.maxAgeMs) {
    blockers.push("Evidence is stale for this factor's decision window.");
  }
  if (trust < definition.minTrustLevel) {
    blockers.push(
      `Trust ${trust.toFixed(2)} is below required ${definition.minTrustLevel.toFixed(2)}.`
    );
  }
  if (sampleSize < definition.minSampleSize) {
    blockers.push(
      `Sample size ${sampleSize} is below required ${definition.minSampleSize}.`
    );
  }
  if (record.activationStatus !== "ACTIVE" && record.activationStatus !== "SHADOW_ONLY") {
    blockers.push(blockedActivationReason(record.activationStatus));
  }
  if (definition.key === "model.trueEv") {
    // FIX 7: was an unconditional block by fiat. Now conditional on the
    // edge-lab honesty-engine artifact (handoff §2 P1): trueEv only clears
    // this specific blocker when the logit-pool β test found the model adds
    // real information beyond the market AND the selective gate actually
    // tuned a firing threshold (tau !== null — "fire nothing" stays
    // blocked). Absent artifact -> same fiat message as before, zero
    // behavior change for existing callers.
    const artifactActive =
      edgeLabVerdict !== undefined &&
      edgeLabVerdict.logitPoolVerdict === LOGIT_POOL_ADDS_INFORMATION_VERDICT &&
      edgeLabVerdict.tunedTau !== null;
    if (!artifactActive) {
      blockers.push("True EV stays blocked until independent fair probability is active.");
    }
  }

  return blockers;
}

function deriveStatus(
  definition: EvidenceFactorDefinition,
  record: EvidenceRecord,
  blockers: readonly string[]
): EvidenceMatrixStatus {
  if (blockers.length > 0) return "BLOCKED";
  if (record.activationStatus === "ACTIVE") return "ACTIVE";
  if (record.activationStatus === "SHADOW_ONLY") {
    return definition.canContributeWhenActive ? "SHADOW_READY" : "SHADOW_COLLECTING";
  }
  return "BLOCKED";
}

function blockedActivationReason(status: EvidenceActivationStatus): string {
  switch (status) {
    case "BLOCKED_MISSING_SOURCE":
      return "Activation is blocked by a missing source adapter.";
    case "BLOCKED_STALE":
      return "Activation is blocked by stale evidence.";
    case "BLOCKED_LOW_TRUST":
      return "Activation is blocked by low-trust evidence.";
    case "BLOCKED_SMALL_SAMPLE":
      return "Activation is blocked by insufficient sample size.";
    case "ACTIVE":
    case "SHADOW_ONLY":
      return "";
  }
}

function actionForStatus(
  definition: EvidenceFactorDefinition,
  status: EvidenceMatrixStatus,
  blockers: readonly string[]
): string {
  if (status === "ACTIVE") {
    return definition.canContributeWhenActive
      ? "Eligible for scoring and audit contribution."
      : "Active for context only; keep out of scoring until calibration proposal approves weight.";
  }
  if (status === "SHADOW_READY") {
    return "Keep collecting shadow outcomes; prepare calibration proposal after the minimum window.";
  }
  if (status === "SHADOW_COLLECTING") {
    return "Use as explanation context only; prove predictive value before weight discussions.";
  }
  if (blockers.length > 0) return blockers[0]!;
  return definition.activationRequirement;
}

function computeIntegrityScore(rows: readonly EvidenceMatrixRow[]): number {
  if (rows.length === 0) return 0;
  const weighted = rows.map((row) => {
    const definition = getEvidenceFactorDefinition(row.key);
    const weight = definition.requiredForPublicPick ? 3 : 1;
    return { score: rowScore(row), weight };
  });
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  const totalScore = weighted.reduce((sum, row) => sum + row.score * row.weight, 0);
  return Math.round(totalScore / totalWeight);
}

function rowScore(row: EvidenceMatrixRow): number {
  switch (row.status) {
    case "ACTIVE":
      return 100;
    case "SHADOW_READY":
      return 78;
    case "SHADOW_COLLECTING":
      return 58;
    case "BLOCKED":
      return 28;
    case "ABSENT":
      return 0;
  }
}

function buildNextBestActions(rows: readonly EvidenceMatrixRow[]): readonly string[] {
  const critical = rows.filter((row) => {
    const definition = getEvidenceFactorDefinition(row.key);
    return definition.requiredForPublicPick && row.status !== "ACTIVE";
  });
  if (critical.length > 0) {
    return critical.map((row) => `${row.label}: ${row.action}`);
  }

  return rows
    .filter((row) => row.status === "BLOCKED" || row.status === "ABSENT")
    .slice(0, 5)
    .map((row) => `${row.label}: ${row.action}`);
}

function normalizeTrust(raw: number): number {
  if (raw > 1) return Math.max(0, Math.min(1, raw / 100));
  return Math.max(0, Math.min(1, raw));
}
