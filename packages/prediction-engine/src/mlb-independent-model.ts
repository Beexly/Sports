export const MLB_INDEPENDENT_MODEL_ENABLED = false as const;
export const MLB_INDEPENDENT_MODEL_MODE = "shadow" as const;
export const MLB_INDEPENDENT_MODEL_VERSION = "mlb-independent-shadow-v0" as const;

export type MlbModelTarget = "home-win" | "away-win" | "over" | "under";

export type MlbRoofStatus = "open" | "closed" | "unknown";
export type MlbLineupStatus = "confirmed" | "projected";
export type MlbPrecipitationType = "none" | "rain" | "snow" | "unknown";

export interface MlbPitcherInput {
  readonly starterId: string;
  readonly sourceId: string;
  readonly restDays: number;
  readonly runsAllowedPerNine: number;
  readonly inningsPerStart: number;
  readonly starts: number;
  readonly asOf: string;
}

export interface MlbParkInput {
  readonly parkId: string;
  readonly sourceId: string;
  readonly runsPerGameFactor: number;
  readonly handednessFactor: number;
  readonly roofStatus: MlbRoofStatus;
  readonly sampleSize: number;
  readonly asOf: string;
}

export interface MlbLineupInput {
  readonly playerIds: readonly string[];
  readonly sourceId: string;
  readonly status: MlbLineupStatus;
  readonly projectedShare: number;
  readonly asOf: string;
}

export interface MlbWeatherInput {
  readonly sourceId: string;
  readonly temperatureF: number;
  readonly windSpeedMph: number;
  readonly outwardWindMph: number;
  readonly precipitationProbability: number;
  readonly precipitationType: MlbPrecipitationType;
  readonly asOf: string;
}

export interface MlbTeamRatingInput {
  readonly teamId: string;
  readonly sourceId: string;
  readonly offenseRating: number;
  readonly defenseRating: number;
  readonly gamesUsed: number;
  readonly asOf: string;
}

export interface MlbIndependentModelInput {
  readonly gameId: string;
  readonly target: MlbModelTarget;
  readonly pitcher: {
    readonly home: MlbPitcherInput;
    readonly away: MlbPitcherInput;
  };
  readonly park: MlbParkInput;
  readonly lineup: {
    readonly home: MlbLineupInput;
    readonly away: MlbLineupInput;
  };
  readonly weather: MlbWeatherInput;
  readonly teamRatings: {
    readonly home: MlbTeamRatingInput;
    readonly away: MlbTeamRatingInput;
  };
  readonly totalLine?: number;
}

export interface MlbIndependentModelResult {
  readonly target: MlbModelTarget;
  readonly modelVersion: typeof MLB_INDEPENDENT_MODEL_VERSION;
  readonly mode: typeof MLB_INDEPENDENT_MODEL_MODE;
  readonly enabled: typeof MLB_INDEPENDENT_MODEL_ENABLED;
  readonly status: "shadow";
  readonly modelProb: number | null;
  readonly expectedHomeRuns: number | null;
  readonly expectedAwayRuns: number | null;
  readonly expectedTotalRuns: number | null;
  readonly runDistribution: readonly number[] | null;
  readonly publishable: false;
  readonly reason: "MODEL_DISABLED";
}

export function getMlbIndependentModelProb(
  input: MlbIndependentModelInput,
): MlbIndependentModelResult {
  void input;
  return {
    target: input.target,
    modelVersion: MLB_INDEPENDENT_MODEL_VERSION,
    mode: MLB_INDEPENDENT_MODEL_MODE,
    enabled: MLB_INDEPENDENT_MODEL_ENABLED,
    status: "shadow",
    modelProb: null,
    expectedHomeRuns: null,
    expectedAwayRuns: null,
    expectedTotalRuns: null,
    runDistribution: null,
    publishable: false,
    reason: "MODEL_DISABLED",
  };
}
