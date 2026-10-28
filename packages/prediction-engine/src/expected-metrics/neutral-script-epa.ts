import { predictWinProbability, type WinProbabilityModel } from "./win-probability.js";
import { type NeutralScriptPlay, attachOwnEpa } from "./nflverse-pbp-mapper.js";
import { type DrivePlay } from "./drives.js";

/**
 * GSE v1 Neutral-Script EPA (SHADOW).
 *
 * Filtered (not weighted) expected points added per play, restricted to plays where the game
 * script is neutral. Neutral is defined as a fitted own win probability between 20% and 80%
 * (inclusive). Clock-killing plays (kneels and spikes) are excluded from the denominator.
 *
 * Lower EPA allowed is better for defenses. This is emitted in the offense's frame.
 *
 * Required floor: >= 100 neutral qualifying plays per team-window.
 */

export interface NeutralScriptEpaGrain {
  readonly plays: number;
  readonly value: number; // For offense, it's EPA/play. For defense allowed, it's EPA allowed/play.
}

export interface NeutralScriptEpaTeamOutput {
  readonly offense?: NeutralScriptEpaGrain;
  readonly defenseAllowed?: NeutralScriptEpaGrain;
}

export interface NeutralScriptEpaDiagnostics {
  readonly clockPlaysExcluded: number;
  readonly unratableWpExcluded: number;
  readonly unratableEpaExcluded: number;
  readonly belowFloorWindows: number;
}

export interface NeutralScriptEpaOutput {
  readonly seasonToDate: ReadonlyMap<string, NeutralScriptEpaTeamOutput>;
  readonly last4Weeks: ReadonlyMap<string, NeutralScriptEpaTeamOutput>;
  readonly last8Weeks: ReadonlyMap<string, NeutralScriptEpaTeamOutput>;
  readonly diagnostics: NeutralScriptEpaDiagnostics;
}

const FLOOR_PLAYS = 100;

export function attachOwnNeutralEpa(
  plays: readonly NeutralScriptPlay[],
  epaByPlayId: ReadonlyMap<string, number>
): NeutralScriptPlay[] {
  return attachOwnEpa(plays as unknown as DrivePlay[], epaByPlayId) as unknown as NeutralScriptPlay[];
}

export function computeNeutralScriptEpa(
  plays: readonly NeutralScriptPlay[],
  wpModel: WinProbabilityModel | null,
  targetWeek: number
): NeutralScriptEpaOutput {
  const emptyResult: NeutralScriptEpaOutput = {
    seasonToDate: new Map(),
    last4Weeks: new Map(),
    last8Weeks: new Map(),
    diagnostics: {
      clockPlaysExcluded: 0,
      unratableWpExcluded: 0,
      unratableEpaExcluded: 0,
      belowFloorWindows: 0,
    },
  };

  if (!wpModel) {
    return emptyResult;
  }

  let clockPlaysExcluded = 0;
  let unratableWpExcluded = 0;
  let unratableEpaExcluded = 0;

  const pointInTimePlays = plays.filter(p => p.week < targetWeek);

  const distinctWeeks = Array.from(new Set(pointInTimePlays.map(p => p.week))).sort((a, b) => b - a);
  const last4Distinct = new Set(distinctWeeks.slice(0, 4));
  const last8Distinct = new Set(distinctWeeks.slice(0, 8));

  const teamData = new Map<string, {
    stdOffEpa: number, stdOffPlays: number, stdDefEpa: number, stdDefPlays: number,
    l4OffEpa: number, l4OffPlays: number, l4DefEpa: number, l4DefPlays: number,
    l8OffEpa: number, l8OffPlays: number, l8DefEpa: number, l8DefPlays: number,
  }>();

  for (const p of pointInTimePlays) {
    const wp = predictWinProbability(wpModel, p);

    if (!Number.isFinite(wp)) {
      unratableWpExcluded++;
      continue;
    }

    if (wp < 0.20 || wp > 0.80) {
      continue;
    }

    if (p.qb_kneel === "1" || p.qb_spike === "1") {
      clockPlaysExcluded++;
      continue;
    }

    if (p.epa === null || !Number.isFinite(p.epa)) {
      unratableEpaExcluded++;
      continue;
    }

    const inL4 = last4Distinct.has(p.week);
    const inL8 = last8Distinct.has(p.week);

    for (const role of ["off", "def"] as const) {
      const team = role === "off" ? p.posteam : p.defteam;
      let td = teamData.get(team);
      if (!td) {
        td = {
          stdOffEpa: 0, stdOffPlays: 0, stdDefEpa: 0, stdDefPlays: 0,
          l4OffEpa: 0, l4OffPlays: 0, l4DefEpa: 0, l4DefPlays: 0,
          l8OffEpa: 0, l8OffPlays: 0, l8DefEpa: 0, l8DefPlays: 0,
        };
        teamData.set(team, td);
      }

      if (role === "off") {
        td.stdOffEpa += p.epa;
        td.stdOffPlays++;
        if (inL4) { td.l4OffEpa += p.epa; td.l4OffPlays++; }
        if (inL8) { td.l8OffEpa += p.epa; td.l8OffPlays++; }
      } else {
        td.stdDefEpa += p.epa;
        td.stdDefPlays++;
        if (inL4) { td.l4DefEpa += p.epa; td.l4DefPlays++; }
        if (inL8) { td.l8DefEpa += p.epa; td.l8DefPlays++; }
      }
    }
  }

  let belowFloorWindows = 0;
  const stdMap = new Map<string, NeutralScriptEpaTeamOutput>();
  const l4Map = new Map<string, NeutralScriptEpaTeamOutput>();
  const l8Map = new Map<string, NeutralScriptEpaTeamOutput>();

  function emitGrains(offPlays: number, offEpa: number, defPlays: number, defEpa: number): NeutralScriptEpaTeamOutput | null {
    const offPass = offPlays >= FLOOR_PLAYS;
    const defPass = defPlays >= FLOOR_PLAYS;

    // Add to below floor diagnostics
    // We count it if they are present in teamData but below floor?
    // Let's just say if the grain is below floor, we count it.
    // Wait, what if they have 0 plays? Does that count as a "below-floor window"?
    // The instructions: "a team grain is emitted in a window only with >= 100 neutral qualifying plays... Below-floor grains are ABSENT from emission (never emitted as 0) and counted in diagnostics."
    // So if a grain has < 100 plays, we count it. Wait, only if it has SOME plays or even 0?
    // Let's only count if it's < FLOOR_PLAYS. If a team exists in teamData, it had at least one qualifying play across ANY window.
    // If it has 0 plays in L4, do we count it?
    // "counted in diagnostics". Let's count every grain check that is below floor.
    if (!offPass) belowFloorWindows++;
    if (!defPass) belowFloorWindows++;

    if (!offPass && !defPass) return null;

    return {
      ...(offPass ? { offense: { plays: offPlays, value: offEpa / offPlays } } : {}),
      ...(defPass ? { defenseAllowed: { plays: defPlays, value: defEpa / defPlays } } : {}),
    };
  }

  for (const [team, td] of teamData.entries()) {
    const std = emitGrains(td.stdOffPlays, td.stdOffEpa, td.stdDefPlays, td.stdDefEpa);
    if (std) stdMap.set(team, std);

    const l4 = emitGrains(td.l4OffPlays, td.l4OffEpa, td.l4DefPlays, td.l4DefEpa);
    if (l4) l4Map.set(team, l4);

    const l8 = emitGrains(td.l8OffPlays, td.l8OffEpa, td.l8DefPlays, td.l8DefEpa);
    if (l8) l8Map.set(team, l8);
  }

  return {
    seasonToDate: stdMap,
    last4Weeks: l4Map,
    last8Weeks: l8Map,
    diagnostics: {
      clockPlaysExcluded,
      unratableWpExcluded,
      unratableEpaExcluded,
      belowFloorWindows,
    },
  };
}
