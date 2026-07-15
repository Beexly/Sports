export type MarketPointUnit = "SPREAD_POINTS" | "TOTAL_POINTS";

export interface CanonicalAmericanOdds {
  readonly kind: "AMERICAN_ODDS";
  readonly raw: number;
  readonly normalized: number;
  readonly display: string;
}

export interface CanonicalMarketPoint {
  readonly kind: MarketPointUnit;
  readonly sport: string;
  readonly raw: number;
  readonly normalized: number;
  readonly tick: 0.25 | 0.5;
  readonly display: string;
}

export interface MarketPointConsensus {
  readonly kind: "POINT_CONSENSUS";
  readonly unit: MarketPointUnit;
  readonly sport: string;
  readonly rawValues: readonly number[];
  readonly normalizedValues: readonly number[];
  readonly rejectedValues: readonly number[];
  readonly reference: number;
  readonly executable: number;
  readonly display: string;
}

export interface AmericanOddsConsensus {
  readonly kind: "AMERICAN_ODDS_CONSENSUS";
  readonly rawValues: readonly number[];
  readonly normalizedValues: readonly number[];
  readonly rejectedValues: readonly number[];
  readonly referenceImpliedProbability: number;
  readonly executable: number;
  readonly display: string;
}

export interface CanonicalMarketPointDelta {
  readonly kind: "MARKET_POINT_DELTA";
  readonly unit: MarketPointUnit;
  readonly sport: string;
  readonly opening: number;
  readonly current: number;
  readonly normalized: number;
  readonly display: string;
}

const MAX_SUPPORTED_AMERICAN_ODDS = 5_000;
const EPSILON = 1e-6;

interface PointPolicy {
  readonly tick: 0.25 | 0.5;
  readonly maxSpread: number;
  readonly maxTotal: number;
}

function pointPolicy(sport: string): PointPolicy | null {
  const key = sport.trim().toLowerCase();
  if (key.includes("soccer") || key === "mls") {
    return { tick: 0.25, maxSpread: 20, maxTotal: 20 };
  }
  if (key.includes("baseball") || key === "mlb") {
    return { tick: 0.5, maxSpread: 20, maxTotal: 50 };
  }
  if (key.includes("icehockey") || key.includes("hockey") || key === "nhl") {
    return { tick: 0.5, maxSpread: 10, maxTotal: 20 };
  }
  if (key.includes("basketball") || key === "nba" || key === "ncaab") {
    return { tick: 0.5, maxSpread: 100, maxTotal: 400 };
  }
  if (key.includes("americanfootball") || key === "nfl" || key === "ncaaf") {
    return { tick: 0.5, maxSpread: 100, maxTotal: 200 };
  }
  return null;
}

function normalizeToTick(raw: number, tick: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const normalized = Math.round(raw / tick) * tick;
  if (Math.abs(raw - normalized) > EPSILON) return null;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function formatQuarterIncrement(raw: number): string {
  const normalized = normalizeToTick(raw, 0.25);
  if (normalized === null) return "N/A";
  if (Number.isInteger(normalized)) return String(normalized);
  return normalized.toFixed(2).replace(/0$/, "");
}

export function normalizeAmericanOdds(raw: number | null | undefined): CanonicalAmericanOdds | null {
  if (raw == null || !Number.isFinite(raw) || !Number.isInteger(raw)) return null;
  const magnitude = Math.abs(raw);
  if (magnitude < 100 || magnitude > MAX_SUPPORTED_AMERICAN_ODDS) return null;
  return {
    kind: "AMERICAN_ODDS",
    raw,
    normalized: raw,
    display: raw > 0 ? `+${raw}` : String(raw),
  };
}

export function normalizeMarketPoint(
  kind: MarketPointUnit,
  sport: string,
  raw: number | null | undefined,
): CanonicalMarketPoint | null {
  if (raw == null) return null;
  const policy = pointPolicy(sport);
  if (!policy) return null;
  const normalized = normalizeToTick(raw, policy.tick);
  if (normalized === null) return null;
  if (kind === "SPREAD_POINTS") {
    if (Math.abs(normalized) > policy.maxSpread) return null;
  } else if (normalized < policy.tick || normalized > policy.maxTotal) {
    return null;
  }
  return {
    kind,
    sport,
    raw,
    normalized,
    tick: policy.tick,
    display:
      kind === "SPREAD_POINTS"
        ? formatSignedMarketPoint(normalized)
        : formatMarketPoint(normalized),
  };
}

function americanImpliedProbability(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

export function buildAmericanOddsConsensus(
  rawValues: readonly number[],
): AmericanOddsConsensus | null {
  const normalizedValues: number[] = [];
  const rejectedValues: number[] = [];
  for (const raw of rawValues) {
    const value = normalizeAmericanOdds(raw);
    if (value) normalizedValues.push(value.normalized);
    else rejectedValues.push(raw);
  }
  if (normalizedValues.length === 0) return null;

  const probabilities = normalizedValues
    .map(americanImpliedProbability)
    .sort((a, b) => a - b);
  const middle = Math.floor(probabilities.length / 2);
  const referenceImpliedProbability =
    probabilities.length % 2 === 1
      ? probabilities[middle]!
      : (probabilities[middle - 1]! + probabilities[middle]!) / 2;
  const frequency = new Map<number, number>();
  for (const value of normalizedValues) {
    frequency.set(value, (frequency.get(value) ?? 0) + 1);
  }
  const executable = [...frequency.keys()].sort((a, b) => {
    const distance =
      Math.abs(americanImpliedProbability(a) - referenceImpliedProbability) -
      Math.abs(americanImpliedProbability(b) - referenceImpliedProbability);
    if (Math.abs(distance) > EPSILON) return distance;
    const popularity = (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0);
    return popularity !== 0 ? popularity : a - b;
  })[0]!;

  return {
    kind: "AMERICAN_ODDS_CONSENSUS",
    rawValues: [...rawValues],
    normalizedValues,
    rejectedValues,
    referenceImpliedProbability,
    executable,
    display: formatAmericanOdds(executable),
  };
}

export function buildMarketPointConsensus(
  unit: MarketPointUnit,
  sport: string,
  rawValues: readonly number[],
): MarketPointConsensus | null {
  const normalizedValues: number[] = [];
  const rejectedValues: number[] = [];
  for (const raw of rawValues) {
    const value = normalizeMarketPoint(unit, sport, raw);
    if (value) normalizedValues.push(value.normalized);
    else rejectedValues.push(raw);
  }
  if (normalizedValues.length === 0) return null;

  const sorted = [...normalizedValues].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const reference =
    sorted.length % 2 === 1
      ? sorted[middle]!
      : (sorted[middle - 1]! + sorted[middle]!) / 2;
  const frequency = new Map<number, number>();
  for (const value of sorted) frequency.set(value, (frequency.get(value) ?? 0) + 1);
  const executable = [...frequency.keys()].sort((a, b) => {
    const distance = Math.abs(a - reference) - Math.abs(b - reference);
    if (Math.abs(distance) > EPSILON) return distance;
    const popularity = (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0);
    return popularity !== 0 ? popularity : a - b;
  })[0]!;

  return {
    kind: "POINT_CONSENSUS",
    unit,
    sport,
    rawValues: [...rawValues],
    normalizedValues,
    rejectedValues,
    reference,
    executable,
    display:
      unit === "SPREAD_POINTS"
        ? formatSignedMarketPoint(executable)
        : formatMarketPoint(executable),
  };
}

export function buildMarketPointDelta(
  unit: MarketPointUnit,
  sport: string,
  openingRaw: number | null | undefined,
  currentRaw: number | null | undefined,
): CanonicalMarketPointDelta | null {
  const opening = normalizeMarketPoint(unit, sport, openingRaw);
  const current = normalizeMarketPoint(unit, sport, currentRaw);
  if (!opening || !current) return null;
  const normalized = normalizeToTick(
    current.normalized - opening.normalized,
    Math.min(opening.tick, current.tick),
  );
  if (normalized === null) return null;
  return {
    kind: "MARKET_POINT_DELTA",
    unit,
    sport,
    opening: opening.normalized,
    current: current.normalized,
    normalized,
    display: formatMarketDelta(normalized),
  };
}

export function formatAmericanOdds(raw: number | null | undefined): string {
  return normalizeAmericanOdds(raw)?.display ?? "N/A";
}

export function formatCanonicalPickLine(
  pickType: string,
  sport: string,
  raw: number | null | undefined,
): string {
  if (pickType === "MONEYLINE") return formatAmericanOdds(raw);
  if (pickType === "SPREAD") {
    return normalizeMarketPoint("SPREAD_POINTS", sport, raw)?.display ?? "N/A";
  }
  if (pickType === "TOTAL") {
    return normalizeMarketPoint("TOTAL_POINTS", sport, raw)?.display ?? "N/A";
  }
  return "N/A";
}

export function formatMarketPoint(raw: number | null | undefined): string {
  if (raw == null) return "N/A";
  return formatQuarterIncrement(raw);
}

export function formatSignedMarketPoint(raw: number | null | undefined): string {
  if (raw == null) return "N/A";
  const display = formatQuarterIncrement(raw);
  if (display === "N/A") return display;
  if (display === "0") return "PK";
  return raw > 0 ? `+${display}` : display;
}

export function formatMarketDelta(raw: number | null | undefined): string {
  if (raw == null) return "N/A";
  const display = formatQuarterIncrement(raw);
  if (display === "N/A" || display === "0") return display;
  return raw > 0 ? `+${display}` : display;
}
