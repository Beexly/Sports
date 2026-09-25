/**
 * Shared NGS feature contract.
 *
 * This is the single normalization seam between persisted nflverse NextGenStat
 * rows and every model consumer. It is pure: no database, network, or writes.
 * Raw source readings are retained for audit while the model receives bounded
 * directional values in the common [-1, 1] scale.
 */

const NGS_NFL_TEAM_ALIASES: Readonly<Record<string, string>> = {
  ARI: "ARI", ATL: "ATL", BAL: "BAL", BUF: "BUF", CAR: "CAR", CHI: "CHI",
  CIN: "CIN", CLE: "CLE", DAL: "DAL", DEN: "DEN", DET: "DET", GB: "GB",
  HOU: "HOU", IND: "IND", JAX: "JAX", KC: "KC", LV: "LV", LAC: "LAC",
  LA: "LAR", LAR: "LAR", MIA: "MIA", MIN: "MIN", NE: "NE", NO: "NO",
  NYG: "NYG", NYJ: "NYJ", PHI: "PHI", PIT: "PIT", SEA: "SEA", SF: "SF",
  TB: "TB", TEN: "TEN", WAS: "WAS", WSH: "WAS", WFT: "WAS",
};

const NGS_NFL_CANONICAL_KEYS = new Set(Object.values(NGS_NFL_TEAM_ALIASES));

/**
 * Normalize an NFL source abbreviation to the NGS ledger's canonical key.
 * This is intentionally allowlisted: a typo or unknown team is a null, never a
 * blind pass-through. The reader also accepts full team names through the
 * existing Kalshi resolver before applying this same canonicalization.
 */
export function canonicalizeNgsTeamKey(
  value: string | null | undefined,
): string | null {
  const key = value?.trim().toUpperCase();
  if (!key) return null;
  const canonical = NGS_NFL_TEAM_ALIASES[key];
  return canonical && NGS_NFL_CANONICAL_KEYS.has(canonical) ? canonical : null;
}

/** All source spellings to include when reading a canonical team key. */
export function ngsTeamKeyAliases(
  canonical: string | null | undefined,
): readonly string[] {
  const normalized = canonicalizeNgsTeamKey(canonical);
  if (!normalized) return [];
  return Object.keys(NGS_NFL_TEAM_ALIASES).filter(
    (alias) => NGS_NFL_TEAM_ALIASES[alias] === normalized,
  );
}

export const NGS_FEATURE_SOURCE = "nflverse" as const;
export const NGS_FEATURE_CATEGORY = "RATINGS" as const;

export const NGS_FEATURE_WEIGHTS = {
  cpoe: 1.5,
  separation: 1.25,
  yacAboveExpectation: 1.25,
  ryoePerAttempt: 0.75,
  timeToThrow: 0.5,
  cushion: 0.75,
} as const;

export const NGS_FEATURE_CONFIDENCE = {
  cpoe: 0.85,
  separation: 0.8,
  yacAboveExpectation: 0.8,
  ryoePerAttempt: 0.75,
  timeToThrow: 0.65,
  cushion: 0.65,
} as const;

export type NgsFeatureKey =
  | "ngs.cpoe"
  | "ngs.separation"
  | "ngs.yac_above_expectation"
  | "ngs.ryoe_per_attempt"
  | "ngs.time_to_throw"
  | "ngs.cushion";

export const NGS_FEATURE_KEYS: readonly NgsFeatureKey[] = [
  "ngs.cpoe",
  "ngs.separation",
  "ngs.yac_above_expectation",
  "ngs.ryoe_per_attempt",
  "ngs.time_to_throw",
  "ngs.cushion",
];

export const NGS_TEAM_SIGNAL_KEY = "ngs.team_score" as const;
export const NGS_TEAM_WEIGHT = 2.5 as const;
export const NGS_TEAM_CONFIDENCE = 0.7 as const;
export const NGS_TEAM_MAX_SCORE = 5 as const;
/** The scorer omits the factor when the directed score is not above this floor. */
export const NGS_TEAM_MIN_CONTRIBUTION = 0.01 as const;
/** Canonical ledger grain: latest-season rollup, not a per-week raw row. */
export const NGS_SIGNAL_WEEK = 0 as const;

export interface NgsTeamContextSignal {
  /** Normalized team NGS reading in [-1, 1]. */
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: string;
  readonly season: number;
}

/**
 * Validate the shared team-signal contract before it reaches the scorer.
 * Explicit reference times reject future-dated captures; an omitted reference
 * keeps the helper useful for direct callers that do not have a game clock.
 */
export function isUsableNgsContextSignal(
  signal: NgsTeamContextSignal | null | undefined,
  referenceAtMs?: number,
): signal is NgsTeamContextSignal {
  if (!signal) return false;
  if (!Number.isFinite(signal.value) || signal.value < -1 || signal.value > 1) return false;
  if (!Number.isFinite(signal.weight) || signal.weight <= 0) return false;
  if (!Number.isFinite(signal.confidence) || signal.confidence <= 0 || signal.confidence > 1) return false;
  if (!Number.isInteger(signal.season)) return false;
  const captured = Date.parse(signal.capturedAt);
  if (!Number.isFinite(captured)) return false;
  if (referenceAtMs !== undefined) {
    if (!Number.isFinite(referenceAtMs) || captured > referenceAtMs) return false;
  }
  return true;
}

/** Resolve an explicit replay reference, or the current instant when omitted. */
export function ngsReferenceAtMs(referenceAt?: string): number | null {
  if (referenceAt === undefined) return Date.now();
  const parsed = Date.parse(referenceAt);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Apply the same 14-day half-life used by the scorer to one signal row. */
export function ngsEffectiveWeight(
  signal: NgsTeamContextSignal | null | undefined,
  referenceAtMs: number,
): number {
  if (!isUsableNgsContextSignal(signal, referenceAtMs) || !signal) return 0;
  const captured = Date.parse(signal.capturedAt);
  const ageDays = Math.max(0, (referenceAtMs - captured) / 86_400_000);
  return signal.weight * Math.min(1, signal.confidence) * Math.pow(0.5, ageDays / 14);
}

/**
 * One shared usability gate for scoring and immutable snapshot recording.
 * A pair is usable only when both sides survive validation and freshness
 * decay, and the differential is large enough to contribute a real edge.
 */
export function isUsableNgsContextPair(
  home: NgsTeamContextSignal | null | undefined,
  away: NgsTeamContextSignal | null | undefined,
  referenceAt?: string,
): boolean {
  const contribution = ngsTeamContributionScore(home, away, referenceAt);
  return contribution !== null && Math.abs(contribution) > NGS_TEAM_MIN_CONTRIBUTION;
}

/**
 * The exact signed home-minus-away score used by the game-context scorer after
 * freshness decay and the ±5 cap. Returning null means the pair is not valid.
 * The scorer may flip this sign for an away pick; snapshot auditing uses its
 * magnitude, so the same contribution gate is shared by both consumers.
 */
export function ngsTeamContributionScore(
  home: NgsTeamContextSignal | null | undefined,
  away: NgsTeamContextSignal | null | undefined,
  referenceAt?: string,
): number | null {
  const referenceAtMs = ngsReferenceAtMs(referenceAt);
  if (referenceAtMs === null || !home || !away) return null;
  const homeEffective = ngsEffectiveWeight(home, referenceAtMs);
  const awayEffective = ngsEffectiveWeight(away, referenceAtMs);
  if (homeEffective <= 0 || awayEffective <= 0) return null;
  const differential = home.value - away.value;
  const contribution = differential * ((homeEffective + awayEffective) / 2);
  return Math.max(
    -NGS_TEAM_MAX_SCORE,
    Math.min(NGS_TEAM_MAX_SCORE, contribution),
  );
}

/** True when a team aggregate has at least one finite source feature. */
export function hasNgsTeamValue(input: NgsTeamFeatureInput): boolean {
  return Object.values(input).some((value) => finite(value) !== null);
}

export interface NgsFeatureInput {
  readonly cpoe?: number | null;
  readonly avgSeparation?: number | null;
  readonly avgYacAboveExpectation?: number | null;
  readonly rushYardsOverExpectedPerAtt?: number | null;
  readonly avgTimeToThrow?: number | null;
  readonly avgCushion?: number | null;
}

export interface NgsFeature {
  readonly key: NgsFeatureKey;
  readonly raw: number;
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly sourceId: typeof NGS_FEATURE_SOURCE;
  readonly category: typeof NGS_FEATURE_CATEGORY;
  readonly label: string;
}

export interface NgsLedgerSignalRow {
  readonly key: NgsFeatureKey | typeof NGS_TEAM_SIGNAL_KEY;
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: string;
}

export interface NgsTeamFeatureInput {
  readonly cpoe?: number | null;
  readonly separation?: number | null;
  readonly yacAboveExpectation?: number | null;
  readonly ryoePerAttempt?: number | null;
  readonly timeToThrow?: number | null;
  readonly cushion?: number | null;
}

export interface NgsTeamComparison {
  readonly home: number;
  readonly away: number;
  readonly homeMinusAway: number;
  readonly available: boolean;
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(raw: number, scale: number): number {
  return clamp(raw / scale, -1, 1);
}

function push(
  out: NgsFeature[],
  key: NgsFeatureKey,
  rawValue: number | null | undefined,
  scale: number,
  weight: number,
  confidence: number,
  label: string,
  inverse = false,
): void {
  const raw = finite(rawValue);
  if (raw === null) return;
  out.push({
    key,
    raw,
    value: normalize(inverse ? -raw : raw, scale),
    weight,
    confidence,
    sourceId: NGS_FEATURE_SOURCE,
    category: NGS_FEATURE_CATEGORY,
    label,
  });
}

export function normalizeNgsFeatures(input: NgsFeatureInput): readonly NgsFeature[] {
  const out: NgsFeature[] = [];
  push(out, "ngs.cpoe", input.cpoe, 5, NGS_FEATURE_WEIGHTS.cpoe, NGS_FEATURE_CONFIDENCE.cpoe, "completion percentage above expectation");
  push(out, "ngs.separation", input.avgSeparation, 5, NGS_FEATURE_WEIGHTS.separation, NGS_FEATURE_CONFIDENCE.separation, "average receiver separation");
  push(out, "ngs.yac_above_expectation", input.avgYacAboveExpectation, 3, NGS_FEATURE_WEIGHTS.yacAboveExpectation, NGS_FEATURE_CONFIDENCE.yacAboveExpectation, "yards after catch above expectation");
  push(out, "ngs.ryoe_per_attempt", input.rushYardsOverExpectedPerAtt, 2, NGS_FEATURE_WEIGHTS.ryoePerAttempt, NGS_FEATURE_CONFIDENCE.ryoePerAttempt, "rush yards over expected per attempt");
  push(out, "ngs.time_to_throw", input.avgTimeToThrow, 5, NGS_FEATURE_WEIGHTS.timeToThrow, NGS_FEATURE_CONFIDENCE.timeToThrow, "average time to throw", true);
  push(out, "ngs.cushion", input.avgCushion, 5, NGS_FEATURE_WEIGHTS.cushion, NGS_FEATURE_CONFIDENCE.cushion, "average receiver cushion");
  return out;
}

export function ngsFeaturesToLedgerSignals(
  input: NgsFeatureInput,
  capturedAt: string,
): readonly NgsLedgerSignalRow[] {
  return normalizeNgsFeatures(input).map((feature) => ({
    key: feature.key,
    value: feature.value,
    weight: feature.weight,
    confidence: feature.confidence,
    capturedAt,
  }));
}

export function ngsTeamScore(input: NgsTeamFeatureInput): number {
  const values: { value: number; weight: number }[] = [];
  const add = (raw: number | null | undefined, scale: number, weight: number, inverse = false): void => {
    const n = finite(raw);
    if (n !== null) values.push({ value: normalize(inverse ? -n : n, scale), weight });
  };
  add(input.cpoe, 5, NGS_FEATURE_WEIGHTS.cpoe);
  add(input.separation, 5, NGS_FEATURE_WEIGHTS.separation);
  add(input.yacAboveExpectation, 3, NGS_FEATURE_WEIGHTS.yacAboveExpectation);
  add(input.ryoePerAttempt, 2, NGS_FEATURE_WEIGHTS.ryoePerAttempt);
  add(input.timeToThrow, 5, NGS_FEATURE_WEIGHTS.timeToThrow, true);
  add(input.cushion, 5, NGS_FEATURE_WEIGHTS.cushion);
  const total = values.reduce((sum, row) => sum + row.weight, 0);
  if (total === 0) return 0;
  return values.reduce((sum, row) => sum + row.value * row.weight, 0) / total;
}

export function ngsTeamComparisonToLedgerSignal(
  comparison: NgsTeamComparison,
  capturedAt: string,
): NgsLedgerSignalRow | null {
  if (!comparison.available) return null;
  return {
    key: NGS_TEAM_SIGNAL_KEY,
    value: comparison.homeMinusAway,
    weight: NGS_TEAM_WEIGHT,
    confidence: NGS_TEAM_CONFIDENCE,
    capturedAt,
  };
}

export function compareNgsTeams(
  home: NgsTeamFeatureInput,
  away: NgsTeamFeatureInput,
): NgsTeamComparison {
  const h = ngsTeamScore(home);
  const a = ngsTeamScore(away);
  const available = Object.values(home).some((v) => finite(v) !== null) || Object.values(away).some((v) => finite(v) !== null);
  return { home: h, away: a, homeMinusAway: clamp(h - a, -1, 1), available };
}
