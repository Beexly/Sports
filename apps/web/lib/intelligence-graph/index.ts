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

/**
 * Project a game-intelligence node through a user lens.
 *
 * Each lens gets a genuinely DIFFERENT summary. Before 2026-09-12, BETTOR,
 * CREATOR and ANALYST all produced the identical string (only FAN differed),
 * which made the lens switcher look broken. Now:
 *
 *   FAN      plain English, no jargon, no numbers
 *   BETTOR   the Edge Index and what it means for the bet
 *   CREATOR  the story angle: what changed and why it matters
 *   ANALYST  every number we have, in one line
 *
 * `canShowConfidence` and `canShowFactorBreakdown` still gate the deeper
 * panels; this function only controls the one-line summary.
 */
export function projectForLens(node: GameIntelligenceNode, lens: UserLens): MonetizationSurface {
  const canShowConfidence = lens === "BETTOR" || lens === "ANALYST";
  const canShowFactorBreakdown = lens === "ANALYST";
  const ei = node.marketPulse.edgeIndex;
  const ev = node.evidenceHealth;
  const books = node.marketPulse.bookmakerCoverage;
  const lineMove =
    node.marketPulse.lineMovementSpread != null
      ? `spread moved ${node.marketPulse.lineMovementSpread > 0 ? "+" : ""}${node.marketPulse.lineMovementSpread}`
      : node.marketPulse.lineMovementTotal != null
        ? `total moved ${node.marketPulse.lineMovementTotal > 0 ? "+" : ""}${node.marketPulse.lineMovementTotal}`
        : null;

  let visibleSummary: string;
  switch (lens) {
    case "FAN":
      visibleSummary =
        ev.status === "STRONG"
          ? `${node.matchup}: our sources are solid on this one.`
          : ev.status === "WATCH"
            ? `${node.matchup}: a few sources are getting stale. We are watching it.`
            : `${node.matchup}: not enough fresh data yet to say anything honest.`;
      break;
    case "BETTOR":
      visibleSummary =
        ei != null
          ? `${node.matchup}: Edge Index ${ei}. ${books} book${books === 1 ? "" : "s"} pricing this. ${
              ei >= 70
                ? "The market and our number disagree — that is the gap."
                : ei >= 40
                  ? "Some disagreement, nothing screaming."
                  : "Market and our number are close. Thin edge."
            }`
          : `${node.matchup}: no Edge Index yet — the market is not priced enough to compare.`;
      break;
    case "CREATOR":
      visibleSummary =
        `${node.matchup}: evidence ${ev.score}/100 (${ev.status.toLowerCase()}). ` +
        (lineMove
          ? `${lineMove} — that is the hook.`
          : ei != null && ei >= 60
            ? "Edge Index is high enough to write about."
            : "Quiet game. Angle is the matchup, not the number.");
      break;
    case "ANALYST":
    default:
      visibleSummary =
        `${node.matchup}: Edge Index ${ei ?? "N/A"}, evidence ${ev.score}/100 (${ev.status}). ` +
        `${books} book${books === 1 ? "" : "s"}, ${ev.staleCount} stale, ${ev.bootstrapCount} bootstrap.` +
        (lineMove ? ` ${lineMove}.` : "") +
        ` Published picks: ${node.marketPulse.publishedPickCount}.`;
      break;
  }

  return {
    lens,
    canShowFactorBreakdown,
    canShowConfidence,
    canShowEdgeIndex: true,
    visibleSummary,
  };
}
