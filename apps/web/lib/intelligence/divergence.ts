import type {
  AvailabilityRoleProjection,
  GameScriptProjection,
  MarketAnchoredPlayerProjection,
  TeamGameScriptProjection,
} from "@sports/prediction-engine";
import type { OpportunityTransferRow, RoleRedistribution } from "./opportunity-transfer";
import type { ReceivingOpportunityRow } from "./receiving-opportunity";

export type DivergenceSource =
  | "market-anchor"
  | "prop-anchor"
  | "regression-breakout"
  | "role-migration"
  | "game-script"
  | "availability";
export type DivergenceSubject = "player" | "team" | "game";
export type DivergenceDirection = "positive" | "negative" | "neutral";
export type DivergenceSeverity = "low" | "medium" | "high";
export type DivergenceRoute =
  | "betting-candidate-shadow"
  | "fantasy-buy-low"
  | "fantasy-sell-high"
  | "content-draft";

export interface DivergenceSignalInput {
  readonly source: DivergenceSource;
  readonly subjectType: DivergenceSubject;
  readonly subjectId: string;
  readonly label: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly rawScore: number;
  readonly confidence?: number;
  readonly reason: string;
}

export interface StandardizedDivergenceSignal extends DivergenceSignalInput {
  readonly standardizedScore: number;
  readonly direction: DivergenceDirection;
  readonly severity: DivergenceSeverity;
  readonly routes: readonly DivergenceRoute[];
  readonly priced: false;
  readonly status: "shadow";
}

export interface DivergenceBoard {
  readonly generatedAt: string;
  readonly signals: readonly StandardizedDivergenceSignal[];
  readonly bettingCandidates: readonly StandardizedDivergenceSignal[];
  readonly fantasyBuyLow: readonly StandardizedDivergenceSignal[];
  readonly fantasySellHigh: readonly StandardizedDivergenceSignal[];
  readonly contentDraftQueue: readonly StandardizedDivergenceSignal[];
  readonly priced: false;
  readonly status: "shadow";
  readonly draftOnly: true;
}

export interface DivergenceOptions {
  readonly minRouteScore?: number;
  readonly highSeverityScore?: number;
}

const BETTING_SOURCES = new Set<DivergenceSource>(["market-anchor", "prop-anchor", "game-script"]);

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdev(values: readonly number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function directionFor(score: number, minRouteScore: number): DivergenceDirection {
  if (score >= minRouteScore) return "positive";
  if (score <= -minRouteScore) return "negative";
  return "neutral";
}

function severityFor(score: number, minRouteScore: number, highSeverityScore: number): DivergenceSeverity {
  const abs = Math.abs(score);
  if (abs >= highSeverityScore) return "high";
  if (abs >= minRouteScore) return "medium";
  return "low";
}

function routesFor(signal: DivergenceSignalInput, score: number, direction: DivergenceDirection): readonly DivergenceRoute[] {
  if (direction === "neutral") return [];
  const routes: DivergenceRoute[] = ["content-draft"];
  if (BETTING_SOURCES.has(signal.source) && Math.abs(score) >= 1) routes.push("betting-candidate-shadow");
  if (signal.subjectType === "player" && direction === "positive") routes.push("fantasy-buy-low");
  if (signal.subjectType === "player" && direction === "negative") routes.push("fantasy-sell-high");
  return routes;
}

export function buildDivergenceBoard(
  inputs: readonly DivergenceSignalInput[],
  options: DivergenceOptions = {},
): DivergenceBoard {
  const minRouteScore = options.minRouteScore ?? 0.75;
  const highSeverityScore = options.highSeverityScore ?? 1.5;
  const sourceStats = new Map<DivergenceSource, { mean: number; stdev: number }>();

  for (const source of new Set(inputs.map((signal) => signal.source))) {
    const values = inputs.filter((signal) => signal.source === source).map((signal) => signal.rawScore);
    const avg = mean(values);
    sourceStats.set(source, { mean: avg, stdev: stdev(values, avg) });
  }

  const signals = inputs
    .map((input) => {
      const stats = sourceStats.get(input.source) ?? { mean: 0, stdev: 0 };
      const z = stats.stdev > 0 ? (input.rawScore - stats.mean) / stats.stdev : input.rawScore;
      const confidence = clamp(input.confidence ?? 0.65, 0, 1);
      const standardizedScore = round(z * confidence, 3);
      const direction = directionFor(standardizedScore, minRouteScore);
      const severity = severityFor(standardizedScore, minRouteScore, highSeverityScore);
      const signal: StandardizedDivergenceSignal = {
        ...input,
        confidence,
        standardizedScore,
        direction,
        severity,
        routes: routesFor(input, standardizedScore, direction),
        priced: false,
        status: "shadow",
      };
      return signal;
    })
    .sort((a, b) => Math.abs(b.standardizedScore) - Math.abs(a.standardizedScore));

  return {
    generatedAt: new Date().toISOString(),
    signals,
    bettingCandidates: signals.filter((signal) => signal.routes.includes("betting-candidate-shadow")),
    fantasyBuyLow: signals.filter((signal) => signal.routes.includes("fantasy-buy-low")),
    fantasySellHigh: signals.filter((signal) => signal.routes.includes("fantasy-sell-high")),
    contentDraftQueue: signals.filter((signal) => signal.routes.includes("content-draft")),
    priced: false,
    status: "shadow",
    draftOnly: true,
  };
}

export function divergenceFromMarketAnchor(
  player: MarketAnchoredPlayerProjection,
  label = player.playerId,
): DivergenceSignalInput {
  return {
    source: "market-anchor",
    subjectType: "player",
    subjectId: player.playerId,
    label,
    position: player.position,
    rawScore: player.divergence,
    confidence: player.status === "shadow" ? 0.7 : 0,
    reason: `Market-anchored derived fantasy points differ from the player's baseline by ${round(player.divergence, 2)}.`,
  };
}

export function divergenceFromReceivingOpportunity(row: ReceivingOpportunityRow): DivergenceSignalInput {
  return {
    source: "regression-breakout",
    subjectType: "player",
    subjectId: row.playerId,
    label: row.name,
    team: row.team,
    position: row.position,
    rawScore: (row.oppPct - row.prodPct) / 25 + row.regressionScore / 10,
    confidence: Math.min(0.9, 0.45 + row.games / 30),
    reason: `${row.signal}: opportunity percentile ${row.oppPct} vs production percentile ${row.prodPct}; ${row.note}`,
  };
}

export function divergenceFromOpportunityTransfer(
  row: OpportunityTransferRow,
  redistribution: RoleRedistribution,
): DivergenceSignalInput {
  const usage = redistribution.redistributedTargets + redistribution.redistributedCarries;
  return {
    source: "role-migration",
    subjectType: "player",
    subjectId: redistribution.playerName,
    label: redistribution.playerName,
    team: row.team,
    position: row.position,
    rawScore: usage * (0.5 + redistribution.transitionToLeadProb),
    confidence: row.confidence === "high" ? 0.85 : row.confidence === "medium" ? 0.65 : 0.45,
    reason: `${row.outPlayer} vacates ${round(row.vacatedTargets + row.vacatedCarries, 1)} uses; ${redistribution.playerName} receives ${round(usage, 1)} in the shadow redistribution.`,
  };
}

function scriptScore(team: TeamGameScriptProjection): number {
  const passPressure = (team.expectedPassRate - 0.56) * 7;
  const playPressure = (team.expectedPlays - 64) / 4;
  return passPressure + playPressure;
}

export function divergenceFromGameScript(
  projection: GameScriptProjection,
  side: "home" | "away",
): DivergenceSignalInput {
  const team = side === "home" ? projection.home : projection.away;
  return {
    source: "game-script",
    subjectType: "team",
    subjectId: team.teamId ?? `${projection.gameId}:${side}`,
    label: team.teamId ?? `${projection.gameId} ${side}`,
    team: team.teamId,
    rawScore: scriptScore(team),
    confidence: 0.62,
    reason: `${team.scriptLabel} script with ${team.expectedPassRate} pass rate and ${team.expectedPlays} projected plays.`,
  };
}

export function divergenceFromAvailabilityRole(
  projection: AvailabilityRoleProjection,
  label = projection.playerId,
): DivergenceSignalInput {
  return {
    source: "availability",
    subjectType: "player",
    subjectId: projection.playerId,
    label,
    rawScore: (projection.activeProbability - 0.78) * 3 + (projection.expectedSnapShare - 0.55),
    confidence: 0.72,
    reason: `P(active) ${projection.activeProbability}; expected snap share ${projection.expectedSnapShare}; role half-life ${projection.roleTenure.halfLifeWeeks} weeks.`,
  };
}
