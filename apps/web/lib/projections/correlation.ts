export type CopulaRole = "QB" | "RB" | "WR" | "TE" | "LEG";

export type CopulaLinkKind = "qb-catcher" | "game-stack" | "same-team";

export type GaussianCopulaMarginal = {
  readonly id: string;
  readonly label: string;
  readonly role: CopulaRole;
  readonly mean: number;
  readonly stdev: number;
  readonly team?: string;
  readonly gameId?: string;
  readonly groupId?: string;
};

export type GaussianCopulaLink = {
  readonly sourceId: string;
  readonly targetId: string;
  readonly rho: number;
  readonly kind: CopulaLinkKind;
  readonly reason: string;
};

export type GaussianCopulaSummary = {
  readonly status: "shadow";
  readonly priced: false;
  readonly mean: number;
  readonly independentStdDev: number;
  readonly correlatedStdDev: number;
  readonly varianceLift: number;
  readonly spikeProbability: number | null;
  readonly matrix: readonly (readonly number[])[];
  readonly links: readonly GaussianCopulaLink[];
};

const NORMAL_90_Z = 1.6448536269514722;

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clampRho(value: number): number {
  return Math.max(-0.95, Math.min(0.95, value));
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x));
  return sign * y;
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

export function stdevFromInterval(lower: number, upper: number, fallbackMean: number): number {
  const width = upper - lower;
  if (Number.isFinite(width) && width > 0) return Math.max(0.1, width / (2 * NORMAL_90_Z));
  return Math.max(0.1, Math.abs(fallbackMean) * 0.25);
}

export function buildGaussianCopulaMatrix(
  marginals: readonly GaussianCopulaMarginal[],
  links: readonly GaussianCopulaLink[],
): readonly (readonly number[])[] {
  const matrix: number[][] = marginals.map((_, row) => marginals.map((__, col) => (row === col ? 1 : 0)));
  const index = new Map(marginals.map((marginal, i) => [marginal.id, i]));
  for (const link of links) {
    const source = index.get(link.sourceId);
    const target = index.get(link.targetId);
    if (source === undefined || target === undefined || source === target) continue;
    const rho = clampRho(link.rho);
    const current = matrix[source]![target]!;
    const next = Math.abs(rho) > Math.abs(current) ? rho : current;
    matrix[source]![target] = next;
    matrix[target]![source] = next;
  }
  return matrix.map((row) => row.map((value) => round(value)));
}

export function buildFantasyCopulaLinks(
  marginals: readonly GaussianCopulaMarginal[],
): readonly GaussianCopulaLink[] {
  const links: GaussianCopulaLink[] = [];
  for (const qb of marginals.filter((marginal) => marginal.role === "QB")) {
    for (const catcher of marginals.filter((marginal) => marginal.role === "WR" || marginal.role === "TE")) {
      if (qb.team && qb.team === catcher.team) {
        links.push({
          sourceId: qb.id,
          targetId: catcher.id,
          rho: 0.35,
          kind: "qb-catcher",
          reason: "QB and pass-catcher share touchdown and yardage spike weeks.",
        });
      }
    }
  }
  return links;
}

export function buildParlayCopulaLinks(
  marginals: readonly GaussianCopulaMarginal[],
): readonly GaussianCopulaLink[] {
  const links: GaussianCopulaLink[] = [];
  for (let i = 0; i < marginals.length; i++) {
    for (let j = i + 1; j < marginals.length; j++) {
      const left = marginals[i]!;
      const right = marginals[j]!;
      const sameGame = Boolean(left.groupId && left.groupId === right.groupId);
      if (!sameGame) continue;
      links.push({
        sourceId: left.id,
        targetId: right.id,
        rho: 0.25,
        kind: "game-stack",
        reason: "Same-game legs share pace, injury, weather, and game-script shocks.",
      });
    }
  }
  return links;
}

export function summarizeGaussianCopulaPortfolio(
  marginals: readonly GaussianCopulaMarginal[],
  links: readonly GaussianCopulaLink[],
  spikeThreshold?: number,
): GaussianCopulaSummary {
  const matrix = buildGaussianCopulaMatrix(marginals, links);
  const mean = marginals.reduce((sum, marginal) => sum + marginal.mean, 0);
  const independentVariance = marginals.reduce((sum, marginal) => sum + marginal.stdev ** 2, 0);
  let correlatedVariance = independentVariance;
  for (let i = 0; i < marginals.length; i++) {
    for (let j = i + 1; j < marginals.length; j++) {
      correlatedVariance += 2 * matrix[i]![j]! * marginals[i]!.stdev * marginals[j]!.stdev;
    }
  }
  const independentStdDev = Math.sqrt(Math.max(0, independentVariance));
  const correlatedStdDev = Math.sqrt(Math.max(0, correlatedVariance));
  const threshold = spikeThreshold ?? null;
  const spikeProbability =
    threshold === null || correlatedStdDev === 0
      ? null
      : round(1 - normalCdf((threshold - mean) / correlatedStdDev));

  return {
    status: "shadow",
    priced: false,
    mean: round(mean),
    independentStdDev: round(independentStdDev),
    correlatedStdDev: round(correlatedStdDev),
    varianceLift: independentStdDev === 0 ? 0 : round(correlatedStdDev / independentStdDev - 1),
    spikeProbability,
    matrix,
    links,
  };
}
