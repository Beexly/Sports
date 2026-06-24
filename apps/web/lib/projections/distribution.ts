import type { MondrianConformalInterval, PlayerRatePosterior } from "@sports/prediction-engine";

export interface ProjectionDistributionInput {
  readonly playerId: string;
  readonly label: string;
  readonly position: string;
  readonly mean: number;
  readonly posterior?: PlayerRatePosterior;
  readonly conformalInterval?: Pick<MondrianConformalInterval, "lower" | "upper" | "alpha">;
  readonly fallbackFloor?: number;
  readonly fallbackCeiling?: number;
  readonly spikeThreshold?: number;
  readonly bustThreshold?: number;
}

export interface ProjectionDistribution {
  readonly playerId: string;
  readonly label: string;
  readonly position: string;
  readonly point: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly stdev: number;
  readonly spikeThreshold: number;
  readonly bustThreshold: number;
  readonly spikeProbability: number;
  readonly bustRisk: number;
  readonly upsideValue: number;
  readonly downsideRisk: number;
  readonly convexityScore: number;
  readonly posteriorWeight: number | null;
  readonly intervalAlpha: number | null;
  readonly source: "posterior-conformal" | "conformal" | "posterior" | "fallback-band";
  readonly priced: false;
  readonly status: "shadow";
}

export interface ProjectionDistributionBoard {
  readonly generatedAt: string;
  readonly players: readonly ProjectionDistribution[];
  readonly portfolioFloor: number;
  readonly portfolioPoint: number;
  readonly portfolioCeiling: number;
  readonly averageSpikeProbability: number;
  readonly averageBustRisk: number;
  readonly convexityScore: number;
  readonly priced: false;
  readonly status: "shadow";
  readonly draftOnly: true;
}

export interface DistributionBoardOptions {
  readonly generatedAt?: string;
}

const NORMAL_90_Z = 1.645;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function normalCdf(x: number, mean: number, stdev: number): number {
  return 0.5 * (1 + erf((x - mean) / (Math.max(stdev, 0.001) * Math.SQRT2)));
}

function zForAlpha(alpha: number | null): number {
  if (alpha == null) return NORMAL_90_Z;
  if (alpha <= 0.1) return 1.645;
  if (alpha <= 0.2) return 1.282;
  if (alpha <= 0.32) return 1;
  return 0.674;
}

function sourceFor(input: ProjectionDistributionInput): ProjectionDistribution["source"] {
  if (input.posterior && input.conformalInterval) return "posterior-conformal";
  if (input.conformalInterval) return "conformal";
  if (input.posterior) return "posterior";
  return "fallback-band";
}

function posteriorStdev(posterior: PlayerRatePosterior | undefined): number {
  if (!posterior?.posteriorVariance) return 0;
  return Math.sqrt(Math.max(0, posterior.posteriorVariance));
}

function fallbackStdev(input: ProjectionDistributionInput): number {
  if (input.fallbackFloor != null && input.fallbackCeiling != null) {
    return Math.max(0.25, (input.fallbackCeiling - input.fallbackFloor) / (2 * NORMAL_90_Z));
  }
  return Math.max(1, Math.abs(input.mean) * 0.22);
}

export function buildProjectionDistribution(input: ProjectionDistributionInput): ProjectionDistribution {
  const interval = input.conformalInterval;
  const intervalAlpha = interval?.alpha ?? null;
  const intervalZ = zForAlpha(intervalAlpha);
  const intervalStdev =
    interval == null ? 0 : Math.max(0.25, (interval.upper - interval.lower) / (2 * intervalZ));
  const stdev = Math.max(intervalStdev, posteriorStdev(input.posterior), fallbackStdev(input));
  const computedFloor = Math.max(0, input.mean - NORMAL_90_Z * stdev);
  const computedCeiling = input.mean + NORMAL_90_Z * stdev;
  const floor = Math.max(0, interval?.lower ?? input.fallbackFloor ?? computedFloor);
  const ceiling = Math.max(floor, interval?.upper ?? input.fallbackCeiling ?? computedCeiling);
  const spikeThreshold = input.spikeThreshold ?? ceiling;
  const bustThreshold = input.bustThreshold ?? floor;
  const spikeProbability = clamp(1 - normalCdf(spikeThreshold, input.mean, stdev), 0, 1);
  const bustRisk = clamp(normalCdf(bustThreshold, input.mean, stdev), 0, 1);
  const upsideValue = Math.max(0, ceiling - input.mean);
  const downsideRisk = Math.max(0, input.mean - floor);
  const convexityScore = spikeProbability * upsideValue - bustRisk * downsideRisk;

  return {
    playerId: input.playerId,
    label: input.label,
    position: input.position,
    point: round(input.mean),
    floor: round(floor),
    ceiling: round(ceiling),
    stdev: round(stdev),
    spikeThreshold: round(spikeThreshold),
    bustThreshold: round(bustThreshold),
    spikeProbability: round(spikeProbability),
    bustRisk: round(bustRisk),
    upsideValue: round(upsideValue),
    downsideRisk: round(downsideRisk),
    convexityScore: round(convexityScore),
    posteriorWeight: input.posterior?.shrinkageWeight ?? null,
    intervalAlpha,
    source: sourceFor(input),
    priced: false,
    status: "shadow",
  };
}

export function buildProjectionDistributionBoard(
  inputs: readonly ProjectionDistributionInput[],
  options: DistributionBoardOptions = {},
): ProjectionDistributionBoard {
  const players = inputs.map(buildProjectionDistribution);
  const count = players.length || 1;
  const sum = (field: keyof Pick<ProjectionDistribution, "floor" | "point" | "ceiling" | "convexityScore">) =>
    players.reduce((total, player) => total + player[field], 0);
  const avg = (field: keyof Pick<ProjectionDistribution, "spikeProbability" | "bustRisk">) =>
    players.reduce((total, player) => total + player[field], 0) / count;

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    players,
    portfolioFloor: round(sum("floor")),
    portfolioPoint: round(sum("point")),
    portfolioCeiling: round(sum("ceiling")),
    averageSpikeProbability: round(avg("spikeProbability")),
    averageBustRisk: round(avg("bustRisk")),
    convexityScore: round(sum("convexityScore")),
    priced: false,
    status: "shadow",
    draftOnly: true,
  };
}
