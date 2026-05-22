/**
 * Intelligence Graph v0.
 *
 * Pure typed read-model helpers over existing game, pick, and signal data.
 * No database writes, no model scoring, no hidden claims. These primitives
 * power later Game Rooms, Studio, and B2B widgets while respecting bootstrap
 * and public-claim gates at the projection boundary.
 */

export type UserLens = "FANTASY" | "FAN" | "BETTOR" | "CREATOR" | "ANALYST";

export interface IntelligenceGameInput {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly sport: string;
  readonly commenceTime: Date | string;
  readonly status?: string | null;
  readonly currentEdgeIndex?: number | null;
  readonly bookmakerCoverageMax?: number | null;
  readonly dataQualityScore?: number | null;
  readonly lineMovementSpread?: number | null;
  readonly lineMovementTotal?: number | null;
  readonly isBootstrap?: boolean;
}

export interface IntelligencePickInput {
  readonly id: string;
  readonly selection: string;
  readonly market: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly isPublished: boolean;
  readonly isBootstrap: boolean;
  readonly result?: string | null;
  readonly generatedAt: Date | string;
}

export interface IntelligenceSignalInput {
  readonly sourceCategory: string;
  readonly sourceName: string;
  readonly signalKey: string;
  readonly fetchedAt: Date | string;
  readonly expiresAt?: Date | string | null;
  readonly trustLevel?: number | null;
  readonly isBootstrap?: boolean;
}

export interface EvidenceHealth {
  readonly score: number;
  readonly sourceCount: number;
  readonly averageTrust: number;
  readonly staleCount: number;
  readonly bootstrapCount: number;
  readonly status: "STRONG" | "WATCH" | "THIN";
}

export interface MarketPulse {
  readonly edgeIndex: number | null;
  readonly bookmakerCoverage: number;
  readonly lineMovementSpread: number | null;
  readonly lineMovementTotal: number | null;
  readonly publishedPickCount: number;
  readonly gatedByBootstrap: boolean;
}

export interface SlateWeather {
  readonly sport: string;
  readonly gameCount: number;
  readonly averageEvidenceScore: number;
  readonly bootstrapGameCount: number;
}

export interface GameIntelligenceNode {
  readonly id: string;
  readonly matchup: string;
  readonly sport: string;
  readonly commenceTime: string;
  readonly marketPulse: MarketPulse;
  readonly evidenceHealth: EvidenceHealth;
  readonly picks: readonly IntelligencePickInput[];
}

export interface MonetizationSurface {
  readonly lens: UserLens;
  readonly canShowFactorBreakdown: boolean;
  readonly canShowConfidence: boolean;
  readonly canShowEdgeIndex: boolean;
  readonly visibleSummary: string;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function computeEvidenceHealth(
  signals: readonly IntelligenceSignalInput[] = [],
  now: Date = new Date()
): EvidenceHealth {
  if (signals.length === 0) {
    return {
      score: 0,
      sourceCount: 0,
      averageTrust: 0,
      staleCount: 0,
      bootstrapCount: 0,
      status: "THIN",
    };
  }

  const sourceCount = new Set(signals.map((signal) => `${signal.sourceCategory}:${signal.sourceName}`)).size;
  const staleCount = signals.filter((signal) => {
    const expiresAt = asDate(signal.expiresAt);
    return expiresAt !== null && expiresAt.getTime() < now.getTime();
  }).length;
  const bootstrapCount = signals.filter((signal) => signal.isBootstrap === true).length;
  const averageTrust =
    signals.reduce((sum, signal) => sum + Math.max(0, Math.min(1, signal.trustLevel ?? 1)), 0) /
    signals.length;

  const sourceScore = Math.min(1, sourceCount / 4);
  const freshnessScore = 1 - staleCount / signals.length;
  const canonicalScore = 1 - bootstrapCount / signals.length;
  const score = clamp100((averageTrust * 0.45 + sourceScore * 0.25 + freshnessScore * 0.2 + canonicalScore * 0.1) * 100);

  return {
    score,
    sourceCount,
    averageTrust: round(averageTrust),
    staleCount,
    bootstrapCount,
    status: score >= 80 ? "STRONG" : score >= 55 ? "WATCH" : "THIN",
  };
}

export function buildMarketPulse(
  game: IntelligenceGameInput,
  picks: readonly IntelligencePickInput[] = []
): MarketPulse {
  const publishedCanonical = picks.filter((pick) => pick.isPublished && !pick.isBootstrap);
  return {
    edgeIndex: game.currentEdgeIndex ?? null,
    bookmakerCoverage: game.bookmakerCoverageMax ?? 0,
    lineMovementSpread: game.lineMovementSpread ?? null,
    lineMovementTotal: game.lineMovementTotal ?? null,
    publishedPickCount: publishedCanonical.length,
    gatedByBootstrap: game.isBootstrap === true || picks.some((pick) => pick.isBootstrap),
  };
}

export function buildGameIntelligenceNode(input: {
  readonly game: IntelligenceGameInput;
  readonly picks?: readonly IntelligencePickInput[];
  readonly signals?: readonly IntelligenceSignalInput[];
  readonly now?: Date;
}): GameIntelligenceNode {
  const picks = input.picks ?? [];
  const commenceTime = asDate(input.game.commenceTime)?.toISOString() ?? new Date(0).toISOString();
  return {
    id: input.game.id,
    matchup: `${input.game.awayTeamName} @ ${input.game.homeTeamName}`,
    sport: input.game.sport,
    commenceTime,
    marketPulse: buildMarketPulse(input.game, picks),
    evidenceHealth: computeEvidenceHealth(input.signals ?? [], input.now),
    picks,
  };
}

export function buildSlateWeather(nodes: readonly GameIntelligenceNode[]): SlateWeather[] {
  const bySport = new Map<string, GameIntelligenceNode[]>();
  for (const node of nodes) {
    bySport.set(node.sport, [...(bySport.get(node.sport) ?? []), node]);
  }

  return Array.from(bySport.entries()).map(([sport, sportNodes]) => ({
    sport,
    gameCount: sportNodes.length,
    averageEvidenceScore: round(
      sportNodes.reduce((sum, node) => sum + node.evidenceHealth.score, 0) / sportNodes.length
    ),
    bootstrapGameCount: sportNodes.filter((node) => node.marketPulse.gatedByBootstrap).length,
  }));
}

export function projectForLens(node: GameIntelligenceNode, lens: UserLens): MonetizationSurface {
  const canShowConfidence = lens === "BETTOR" || lens === "ANALYST";
  const canShowFactorBreakdown = lens === "ANALYST";
  return {
    lens,
    canShowFactorBreakdown,
    canShowConfidence,
    canShowEdgeIndex: true,
    visibleSummary:
      lens === "FAN"
        ? `${node.matchup} has ${node.evidenceHealth.status.toLowerCase()} evidence health.`
        : `${node.matchup}: Edge Index ${node.marketPulse.edgeIndex ?? "N/A"}, evidence ${node.evidenceHealth.score}/100.`,
  };
}
