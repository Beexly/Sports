/**
 * Weather normalization for fair cross-weather team comparisons.
 *
 * Research source: arXiv:1807.05059 — "Cyber-Physical System for Energy
 * Efficient Stadium Operation" (only the transferable part is ported: the
 * degree-day normalization + median-bootstrap inference recipe; the paper's
 * control-strategy content does not transfer and is not adopted).
 *
 * Defines GSE weather-severity indices analogous to heating degree-days:
 * Cold-Degree-Days below 40F, Wind-Exposure = sum max(wind - 12, 0), and
 * precipitation flags. Team efficiency metrics are normalized by a fitted
 * weather-severity index and compared via weather-normalized medians with
 * bootstrap percentile 95% CIs instead of raw means. Feature-selection rule
 * for surface/field-condition models: lead with air temperature; treat
 * solar/humidity/wind/precip as secondary.
 *
 * ACCEPTANCE GATE: ADOPT weather-normalized medians in the team-rating
 * pipeline only if normalization changes >= 10% of team-season EPA rankings
 * by >= 2 places (weather confounding is material) AND bootstrap CIs are
 * tighter than raw-mean CIs on average. REJECT if rankings barely move.
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface GameWeather {
  /** Kickoff air temperature in Fahrenheit. */
  tempF: number;
  /** Sustained wind in mph. */
  windMph: number;
  /** Precipitation in inches during the game window. */
  precipIn: number;
}

export interface SeverityWeights {
  cold: number;
  wind: number;
  precip: number;
}

export const DEFAULT_SEVERITY_WEIGHTS: SeverityWeights = {
  cold: 0.02,
  wind: 0.03,
  precip: 1.5,
};

/** Cold-Degree-Days: max(base - tempF, 0), default base 40F. */
export function coldDegreeDays(tempF: number, base = 40): number {
  return Math.max(0, base - tempF);
}

/** Wind-Exposure: max(windMph - threshold, 0), default threshold 12 mph. */
export function windExposure(windMph: number, threshold = 12): number {
  return Math.max(0, windMph - threshold);
}

/** Precipitation flag severity: raw inches (0 when dry). */
export function precipSeverity(precipIn: number): number {
  return Math.max(0, precipIn);
}

/**
 * Combined weather-severity index for one game: a weighted sum of the
 * cold/wind/precip components. Higher = worse conditions for offense.
 */
export function weatherSeverityIndex(
  w: GameWeather,
  weights: SeverityWeights = DEFAULT_SEVERITY_WEIGHTS,
): number {
  return (
    weights.cold * coldDegreeDays(w.tempF) +
    weights.wind * windExposure(w.windMph) +
    weights.precip * precipSeverity(w.precipIn)
  );
}

/**
 * Normalize per-game efficiency values (e.g. EPA/play) by weather severity:
 * normalized = value / exp(-severity). Severe-weather games are scaled up
 * (dividing by the sub-unitary weather factor recovers the fair-weather
 * equivalent), so cross-weather comparisons are not confounded by conditions.
 */
export function normalizeByWeather(
  values: readonly number[],
  weather: readonly GameWeather[],
  weights: SeverityWeights = DEFAULT_SEVERITY_WEIGHTS,
): number[] {
  if (values.length !== weather.length) {
    throw new Error("normalizeByWeather: length mismatch");
  }
  return values.map((v, i) => v / Math.exp(-weatherSeverityIndex(weather[i] as GameWeather, weights)));
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/** Tiny seeded PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MedianCI {
  median: number;
  lo: number;
  hi: number;
  width: number;
}

/**
 * Weather-normalized median with a bootstrap percentile 95% CI
 * (10k replicates default, per the paper's recipe).
 */
export function weatherNormalizedMedianCI(
  values: readonly number[],
  weather: readonly GameWeather[],
  opts: { replicates?: number; seed?: number; weights?: SeverityWeights } = {},
): MedianCI {
  if (values.length === 0) throw new Error("weatherNormalizedMedianCI: no values");
  const normed = normalizeByWeather(values, weather, opts.weights);
  const med = median(normed);
  const replicates = opts.replicates ?? 10000;
  const rand = mulberry32(opts.seed ?? 1234);
  const boots = new Array<number>(replicates);
  for (let r = 0; r < replicates; r++) {
    const sample = new Array<number>(normed.length);
    for (let i = 0; i < normed.length; i++) {
      sample[i] = normed[Math.floor(rand() * normed.length)] ?? 0;
    }
    boots[r] = median(sample);
  }
  boots.sort((a, b) => a - b);
  const lo = boots[Math.floor(0.025 * replicates)] ?? 0;
  const hi = boots[Math.min(replicates - 1, Math.ceil(0.975 * replicates))] ?? 0;
  return { median: med, lo, hi, width: hi - lo };
}

/**
 * Gate diagnostic: fraction of team-season rankings that move by >= 2
 * places when switching from raw means to weather-normalized medians.
 * Returns 1 when fewer than 2 teams are supplied.
 */
export function rankingMoveFraction(
  rawMeans: Record<string, number>,
  normedMedians: Record<string, number>,
): number {
  const rankOf = (vals: Record<string, number>): Map<string, number> => {
    const ordered = Object.entries(vals).sort((a, b) => b[1] - a[1]);
    return new Map(ordered.map(([t], i) => [t, i]));
  };
  const r1 = rankOf(rawMeans);
  const r2 = rankOf(normedMedians);
  const teams = [...r1.keys()].filter((t) => r2.has(t));
  if (teams.length < 2) return 1;
  const moved = teams.filter((t) => Math.abs((r1.get(t) ?? 0) - (r2.get(t) ?? 0)) >= 2);
  return moved.length / teams.length;
}
