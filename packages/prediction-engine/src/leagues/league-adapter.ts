import type { GameContextBitmaskInput, League } from "../mcp/bitmask-schema.js";

export type { League };

export interface LeagueContextAdapter<TRaw> {
  readonly league: League;
  toBitmaskInput(raw: TRaw): GameContextBitmaskInput;
}

export interface NfLRaw {
  readonly gameId: string;
  readonly bitmask: GameContextBitmaskInput;
}

export interface NbaRaw {
  readonly gameId: string;
  readonly temperatureF: number;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly rimProtectorOut: boolean;
  readonly backToBack: boolean;
}

export interface NhlRaw {
  readonly gameId: string;
  readonly temperatureF: number;
  readonly startingGoalieConfirmed: boolean;
  readonly topPairOut: boolean;
}

export interface CfbRaw {
  readonly gameId: string;
  readonly temperatureF: number;
  readonly windSpeedMph: number;
  readonly portalCohesionLow: boolean;
  readonly ultraFastTempo: boolean;
}

function shell(partial: Partial<GameContextBitmaskInput> & Pick<GameContextBitmaskInput, "gameId" | "league">): GameContextBitmaskInput {
  return {
    temperatureF: 70,
    windSpeedMph: 5,
    precipitationRateMmHr: 0,
    altitudeFt: 0,
    surfaceTractionCoeff: 0.9,
    isDome: false,
    daysRestHome: 2,
    daysRestAway: 2,
    timeZoneShiftHours: 0,
    homeInteriorOlOutCount: 0,
    awayInteriorOlOutCount: 0,
    homeIlb1Out: false,
    homeIlb2Out: false,
    awayIlb1Out: false,
    awayIlb2Out: false,
    homeProjectedSackRate: 0.08,
    awayProjectedSackRate: 0.08,
    homeCb1Out: false,
    awayCb1Out: false,
    homeNickelCbActive: false,
    awayNickelCbActive: false,
    totalSteamMovePts: 0,
    spreadLineAbs: 1,
    homeRookieRouteRampInflection: false,
    awayRookieRouteRampInflection: false,
    qbRushPropHookInDangerZone: false,
    ...partial,
  };
}

export const nflAdapter: LeagueContextAdapter<NfLRaw> = {
  league: "NFL",
  toBitmaskInput(raw) {
    return raw.bitmask;
  },
};

export const nbaAdapter: LeagueContextAdapter<NbaRaw> = {
  league: "NBA",
  toBitmaskInput(raw) {
    return shell({
      gameId: raw.gameId,
      league: "NBA",
      temperatureF: raw.temperatureF,
      daysRestHome: raw.backToBack ? 1 : raw.restDaysHome,
      daysRestAway: raw.restDaysAway,
      homeIlb1Out: raw.rimProtectorOut,
    });
  },
};

export const nhlAdapter: LeagueContextAdapter<NhlRaw> = {
  league: "NHL",
  toBitmaskInput(raw) {
    return shell({
      gameId: raw.gameId,
      league: "NHL",
      temperatureF: raw.temperatureF,
      homeCb1Out: !raw.startingGoalieConfirmed,
      homeIlb1Out: raw.topPairOut,
    });
  },
};

export const cfbAdapter: LeagueContextAdapter<CfbRaw> = {
  league: "CFB",
  toBitmaskInput(raw) {
    return shell({
      gameId: raw.gameId,
      league: "CFB",
      temperatureF: raw.temperatureF,
      windSpeedMph: raw.windSpeedMph,
      homeInteriorOlOutCount: raw.portalCohesionLow ? 2 : 0,
      awayRookieRouteRampInflection: raw.ultraFastTempo,
    });
  },
};

export const LEAGUE_ADAPTERS = {
  NFL: nflAdapter,
  NBA: nbaAdapter,
  NHL: nhlAdapter,
  CFB: cfbAdapter,
} as const;
