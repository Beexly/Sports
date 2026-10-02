/**
 * Game-keyed weather capture — the WRITER the weather surface never had.
 *
 * The NWS read path (`loadNflGameWeather` in `game-weather.ts`) fetches honest
 * per-venue conditions, but nothing ever keyed them to a game: the observation
 * bundle's `weather` surface reads `game_signals` rows in the WEATHER /
 * VENUE_ENVIRONMENT categories, and prod has zero rows in them. So the engine
 * reasons about outdoor games with no environment data at all.
 *
 * This module is the pure projection: upcoming games + venue weather in,
 * `game_signals` upsert rows out. The cron route
 * (`/api/cron/game-weather-capture`) does the fetching and the writing; this
 * stays synchronous and testable.
 *
 * HONESTY RULES, enforced here rather than hoped for at the call site:
 * - Dome / retractable-roof teams and unknown venues are SKIPPED with a
 *   reason, not written with null weather. A null-weather row would read as
 *   "measured calm" downstream; no row reads as "unknown", which is the truth.
 * - Only metrics the NWS actually returned (finite numbers) become rows. A
 *   venue whose wind fetch failed does not get a wind row.
 * - `signalValue` is the NWS number verbatim. No "wind impact score" is
 *   invented here; the lean math lives in `contextObservations`, in shadow
 *   until calibrated.
 * - `expiresAt` is the game's commence time: a pregame snapshot must not
 *   outlive kickoff.
 */

import type { NflGameWeather, NflVenue } from "./game-weather";
import { OUTDOOR_NFL_VENUES } from "./game-weather";

export interface CapturableGame {
  readonly gameId: string;
  /** GSE team abbreviation, e.g. "GB". Resolved by the caller. */
  readonly homeTeamAbbr: string;
  readonly commenceTime: Date | string;
}

export type WeatherSignalKey = "wind_mph" | "temp_f" | "precip_pct";

export interface WeatherSignalRow {
  readonly gameId: string;
  readonly sourceCategory: "WEATHER";
  readonly sourceName: "nws";
  readonly signalKey: WeatherSignalKey;
  /** The NWS number verbatim — never a derived score. */
  readonly signalValue: number;
  /** ISO timestamp of game commencement; the snapshot expires at kickoff. */
  readonly expiresAt: string;
  /** NWS origin trust, matching the `open-meteo` trust in universal-wiring. */
  readonly trustLevel: number;
}

export interface WeatherSkip {
  readonly gameId: string;
  readonly homeTeamAbbr: string;
  readonly reason: string;
}

export interface WeatherProjection {
  readonly rows: readonly WeatherSignalRow[];
  readonly skipped: readonly WeatherSkip[];
}

/** Trust for a direct NWS reading. Same 0.88 the universal wiring assigns. */
export const NWS_TRUST = 0.88;

/**
 * Map a home-team abbreviation to its outdoor venue.
 *
 * Some venue entries cover a shared stadium ("NYJ/NYG" → MetLife), so the
 * lookup splits on "/". Returns null for domes, retractable roofs, and teams
 * the venue list does not know — all of which are skipped, never defaulted.
 */
export function venueForTeam(
  teamAbbr: string,
  venues: readonly NflVenue[] = OUTDOOR_NFL_VENUES,
): NflVenue | null {
  const needle = teamAbbr.trim().toUpperCase();
  if (!needle) return null;
  for (const v of venues) {
    const teams = v.team.split("/").map((t) => t.trim().toUpperCase());
    if (teams.includes(needle)) return v;
  }
  return null;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Project games + venue weather into `game_signals` rows.
 *
 * Pure: no fetch, no clock, no database. Every skip is reported with its
 * reason so a game that stops receiving weather is visible rather than
 * silently absent.
 */
export function projectWeatherSignals(
  games: readonly CapturableGame[],
  weather: NflGameWeather,
  venues: readonly NflVenue[] = OUTDOOR_NFL_VENUES,
): WeatherProjection {
  const rows: WeatherSignalRow[] = [];
  const skipped: WeatherSkip[] = [];

  // Index venue readings by every team abbreviation they cover ("NYJ" and "NYG"
  // both reach MetLife). A venue whose NWS fetch failed is indexed anyway — its
  // metrics are null and produce a game-level skip below, which keeps the
  // venue failure visible per game instead of silent.
  const byTeam = new Map<string, (typeof weather.venues)[number]>();
  for (const vw of weather.venues) {
    for (const t of vw.team.split("/").map((s) => s.trim().toUpperCase())) {
      if (t && !byTeam.has(t)) byTeam.set(t, vw);
    }
  }

  for (const game of games) {
    const abbr = game.homeTeamAbbr.trim().toUpperCase();
    const venue = venueForTeam(abbr, venues);
    if (!venue) {
      skipped.push({
        gameId: game.gameId,
        homeTeamAbbr: abbr,
        reason: "no outdoor venue: dome, retractable roof, or unknown team",
      });
      continue;
    }
    const vw = byTeam.get(abbr);
    if (!vw || vw.status !== "ok") {
      skipped.push({
        gameId: game.gameId,
        homeTeamAbbr: abbr,
        reason: `NWS fetch failed for ${venue.stadium}: ${vw?.error ?? "no venue reading"}`,
      });
      continue;
    }

    let expiresAt: string;
    try {
      expiresAt = toIso(game.commenceTime);
      if (!Number.isFinite(Date.parse(expiresAt))) throw new Error("bad commenceTime");
    } catch {
      skipped.push({
        gameId: game.gameId,
        homeTeamAbbr: abbr,
        reason: "unparsable commenceTime; cannot set expiresAt",
      });
      continue;
    }

    const metrics: ReadonlyArray<readonly [WeatherSignalKey, number | null]> = [
      ["wind_mph", vw.windMph],
      ["temp_f", vw.tempF],
      ["precip_pct", vw.precipPct],
    ];
    let emitted = 0;
    for (const [signalKey, metric] of metrics) {
      if (metric === null || !Number.isFinite(metric)) continue;
      rows.push({
        gameId: game.gameId,
        sourceCategory: "WEATHER",
        sourceName: "nws",
        signalKey,
        signalValue: metric,
        expiresAt,
        trustLevel: NWS_TRUST,
      });
      emitted += 1;
    }
    if (emitted === 0) {
      skipped.push({
        gameId: game.gameId,
        homeTeamAbbr: abbr,
        reason: `NWS returned no finite metrics for ${venue.stadium}`,
      });
    }
  }

  return { rows, skipped };
}
