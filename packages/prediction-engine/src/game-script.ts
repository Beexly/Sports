import { clamp } from "./scoring.js";

export type GameScriptSide = "home" | "away";
export type GameScriptCheckpoint = "pregame" | "q1" | "half" | "q3" | "final";
export type PaceLabel = "slow" | "neutral" | "fast";
export type ScriptLabel = "leading" | "balanced" | "trailing";

export interface GameScriptAssumptions {
  readonly spreadToWinProbStdev: number;
  readonly neutralPassRate: number;
  readonly neutralPlaysPerTeam: number;
  readonly neutralSecondsPerPlay: number;
  readonly passRateSensitivity: number;
  readonly paceTotalSensitivity: number;
}

export interface TeamScriptInput {
  readonly side: GameScriptSide;
  readonly teamId?: string;
  readonly neutralPassRate?: number;
  readonly neutralPlaysPerTeam?: number;
  readonly neutralSecondsPerPlay?: number;
}

export interface GameScriptInput {
  readonly gameId: string;
  readonly totalPoints: number;
  readonly homeSpread: number;
  readonly home?: Omit<TeamScriptInput, "side">;
  readonly away?: Omit<TeamScriptInput, "side">;
  readonly assumptions?: Partial<GameScriptAssumptions>;
}

export interface WinProbabilityPathPoint {
  readonly checkpoint: GameScriptCheckpoint;
  readonly gameShare: number;
  readonly projectedHomeMargin: number;
  readonly homeWinProbability: number;
  readonly awayWinProbability: number;
}

export interface TeamGameScriptProjection {
  readonly side: GameScriptSide;
  readonly teamId: string | null;
  readonly averageWinProbability: number;
  readonly expectedPassRate: number;
  readonly expectedRunRate: number;
  readonly expectedPlays: number;
  readonly secondsPerPlay: number;
  readonly paceLabel: PaceLabel;
  readonly scriptLabel: ScriptLabel;
}

export interface GameScriptProjection {
  readonly gameId: string;
  readonly winProbabilityPath: readonly WinProbabilityPathPoint[];
  readonly home: TeamGameScriptProjection;
  readonly away: TeamGameScriptProjection;
  readonly totalProjectedPlays: number;
  readonly priced: false;
  readonly status: "shadow";
}

export const DEFAULT_GAME_SCRIPT_ASSUMPTIONS: GameScriptAssumptions = {
  spreadToWinProbStdev: 13.86,
  neutralPassRate: 0.56,
  neutralPlaysPerTeam: 64,
  neutralSecondsPerPlay: 28.5,
  passRateSensitivity: 0.22,
  paceTotalSensitivity: 0.35,
};

const CHECKPOINTS: ReadonlyArray<{ checkpoint: GameScriptCheckpoint; gameShare: number }> = [
  { checkpoint: "pregame", gameShare: 0 },
  { checkpoint: "q1", gameShare: 0.25 },
  { checkpoint: "half", gameShare: 0.5 },
  { checkpoint: "q3", gameShare: 0.75 },
  { checkpoint: "final", gameShare: 1 },
];

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function resolveAssumptions(assumptions?: Partial<GameScriptAssumptions>): GameScriptAssumptions {
  return {
    spreadToWinProbStdev:
      assumptions?.spreadToWinProbStdev ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.spreadToWinProbStdev,
    neutralPassRate: assumptions?.neutralPassRate ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.neutralPassRate,
    neutralPlaysPerTeam:
      assumptions?.neutralPlaysPerTeam ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.neutralPlaysPerTeam,
    neutralSecondsPerPlay:
      assumptions?.neutralSecondsPerPlay ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.neutralSecondsPerPlay,
    passRateSensitivity:
      assumptions?.passRateSensitivity ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.passRateSensitivity,
    paceTotalSensitivity:
      assumptions?.paceTotalSensitivity ?? DEFAULT_GAME_SCRIPT_ASSUMPTIONS.paceTotalSensitivity,
  };
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function buildVegasWinProbabilityPath(
  totalPoints: number,
  homeSpread: number,
  assumptions: GameScriptAssumptions = DEFAULT_GAME_SCRIPT_ASSUMPTIONS,
): readonly WinProbabilityPathPoint[] {
  const projectedFinalHomeMargin = -homeSpread;
  const totalVolatility = clamp(1 + (44 - totalPoints) / 120, 0.85, 1.15);

  return CHECKPOINTS.map(({ checkpoint, gameShare }) => {
    const projectedHomeMargin = projectedFinalHomeMargin * gameShare;
    const remainingVolatility = Math.sqrt(Math.max(0.08, 1 - gameShare));
    const stdev = assumptions.spreadToWinProbStdev * remainingVolatility * totalVolatility;
    const homeWinProbability =
      checkpoint === "pregame"
        ? normalCdf(projectedFinalHomeMargin / assumptions.spreadToWinProbStdev)
        : normalCdf(projectedFinalHomeMargin / stdev);
    return {
      checkpoint,
      gameShare,
      projectedHomeMargin: round(projectedHomeMargin, 2),
      homeWinProbability: round(clamp(homeWinProbability, 0.01, 0.99), 4),
      awayWinProbability: round(clamp(1 - homeWinProbability, 0.01, 0.99), 4),
    };
  });
}

function averageProbability(path: readonly WinProbabilityPathPoint[], side: GameScriptSide): number {
  const values = path.slice(0, -1).map((point) =>
    side === "home" ? point.homeWinProbability : point.awayWinProbability,
  );
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function teamDefaults(
  side: GameScriptSide,
  input: Omit<TeamScriptInput, "side"> | undefined,
  assumptions: GameScriptAssumptions,
): Required<TeamScriptInput> {
  return {
    side,
    teamId: input?.teamId ?? "",
    neutralPassRate: input?.neutralPassRate ?? assumptions.neutralPassRate,
    neutralPlaysPerTeam: input?.neutralPlaysPerTeam ?? assumptions.neutralPlaysPerTeam,
    neutralSecondsPerPlay: input?.neutralSecondsPerPlay ?? assumptions.neutralSecondsPerPlay,
  };
}

function labelScript(avgWinProb: number): ScriptLabel {
  if (avgWinProb >= 0.56) return "leading";
  if (avgWinProb <= 0.44) return "trailing";
  return "balanced";
}

function labelPace(secondsPerPlay: number): PaceLabel {
  if (secondsPerPlay <= 27) return "fast";
  if (secondsPerPlay >= 30) return "slow";
  return "neutral";
}

function projectTeamScript(
  team: Required<TeamScriptInput>,
  avgWinProb: number,
  totalPoints: number,
  assumptions: GameScriptAssumptions,
): TeamGameScriptProjection {
  const trailingPressure = 0.5 - avgWinProb;
  const totalPressure = (totalPoints - 44) / 100;
  const expectedPassRate = clamp(
    team.neutralPassRate + trailingPressure * assumptions.passRateSensitivity + totalPressure,
    0.42,
    0.72,
  );
  const runRate = 1 - expectedPassRate;
  const closenessBoost = (1 - Math.abs(avgWinProb - 0.5) * 2) * 2.5;
  const totalBoost = (totalPoints - 44) * assumptions.paceTotalSensitivity;
  const trailingPlayBoost = trailingPressure * 4;
  const expectedPlays = clamp(
    team.neutralPlaysPerTeam + totalBoost + closenessBoost + trailingPlayBoost,
    54,
    76,
  );
  const secondsPerPlay = clamp(
    team.neutralSecondsPerPlay - totalBoost * 0.18 - trailingPressure * 2,
    24,
    33,
  );

  return {
    side: team.side,
    teamId: team.teamId || null,
    averageWinProbability: round(avgWinProb, 4),
    expectedPassRate: round(expectedPassRate, 3),
    expectedRunRate: round(runRate, 3),
    expectedPlays: round(expectedPlays, 1),
    secondsPerPlay: round(secondsPerPlay, 1),
    paceLabel: labelPace(secondsPerPlay),
    scriptLabel: labelScript(avgWinProb),
  };
}

export function projectGameScript(input: GameScriptInput): GameScriptProjection {
  const assumptions = resolveAssumptions(input.assumptions);
  const path = buildVegasWinProbabilityPath(input.totalPoints, input.homeSpread, assumptions);
  const homeTeam = teamDefaults("home", input.home, assumptions);
  const awayTeam = teamDefaults("away", input.away, assumptions);
  const home = projectTeamScript(homeTeam, averageProbability(path, "home"), input.totalPoints, assumptions);
  const away = projectTeamScript(awayTeam, averageProbability(path, "away"), input.totalPoints, assumptions);

  return {
    gameId: input.gameId,
    winProbabilityPath: path,
    home,
    away,
    totalProjectedPlays: round(home.expectedPlays + away.expectedPlays, 1),
    priced: false,
    status: "shadow",
  };
}
