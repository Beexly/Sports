/**
 * Venue facts the slate can sign without calling a kernel whose other inputs
 * are missing.
 *
 * Elevation is a USGS point reading. The fatigue kernel also wants arrival
 * days and a defensive snap pace. Those are not measured, so that kernel is
 * not called. Below 4,000 feet the kernel itself says there is no altitude
 * effect, and this vote abstains rather than emitting 0.
 *
 * Surface is grass versus synthetic from the 2025 public-record table. The
 * turf kernel wants slit-film versus monofilament, plus a ball carrier's
 * weight, age, yards per carry, and touches. None of those are on the slate,
 * so that kernel is not called. Same surface says nothing home-relative.
 * A mismatch means the visitor is not on the surface they play at home.
 */
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { nflWeekOf } from "./nfl-week.js";
import { ESPN_NEUTRAL_SITE_PAIRS } from "./priors/espn-nfl-2026-w4.js";
import { NFL_VENUE_ELEVATION_FT } from "./priors/nfl-venue-elevation.js";
import { NFL_VENUE_SURFACE } from "./priors/nfl-venue-surface.js";

const HIGH_ALTITUDE_FT = 4000;

function label(team: unknown): string | null {
  if (typeof team === "string") return team;
  if (team && typeof team === "object") {
    const row = team as { abbreviation?: unknown; name?: unknown };
    if (typeof row.abbreviation === "string" && row.abbreviation.trim() !== "") return row.abbreviation;
    if (typeof row.name === "string") return row.name;
  }
  return null;
}

function neutralThisWeek(homeAbbr: string, awayAbbr: string, commenceTime: Date | undefined): boolean {
  if (!(commenceTime instanceof Date) || Number.isNaN(commenceTime.getTime())) return false;
  const week = nflWeekOf(commenceTime);
  if (week == null || week.season !== 2026 || week.week !== 4) return false;
  const pair = [homeAbbr, awayAbbr].sort().join("|");
  return ESPN_NEUTRAL_SITE_PAIRS.some((p) => [...p].sort().join("|") === pair);
}

export function elevationAboveThreshold(input: {
  homeTeam: unknown;
  awayTeam: unknown;
  commenceTime?: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  const homeAbbr = nflTeamAbbr(label(input.homeTeam));
  const awayAbbr = nflTeamAbbr(label(input.awayTeam));
  if (homeAbbr == null || awayAbbr == null) return null;
  if (neutralThisWeek(homeAbbr, awayAbbr, input.commenceTime)) return null;
  const feet = NFL_VENUE_ELEVATION_FT[homeAbbr];
  if (feet == null || feet < HIGH_ALTITUDE_FT) return null;
  return {
    value: Number(((feet - HIGH_ALTITUDE_FT) / 1000).toFixed(4)),
    metadata: {
      basis: "usgs feet above 4000, fatigue kernel not called",
      feet,
      thresholdFeet: HIGH_ALTITUDE_FT,
      arrivalDaysNotMeasured: true,
      snapPaceNotMeasured: true,
    },
  };
}

export function surfaceAcclimationMismatch(input: {
  homeTeam: unknown;
  awayTeam: unknown;
  commenceTime?: Date;
}): { value: number; metadata: Record<string, unknown> } | null {
  const homeAbbr = nflTeamAbbr(label(input.homeTeam));
  const awayAbbr = nflTeamAbbr(label(input.awayTeam));
  if (homeAbbr == null || awayAbbr == null) return null;
  if (neutralThisWeek(homeAbbr, awayAbbr, input.commenceTime)) return null;
  const home = NFL_VENUE_SURFACE[homeAbbr];
  const away = NFL_VENUE_SURFACE[awayAbbr];
  if (home == null || away == null) return null;
  if (home.surface === away.surface) return null;
  return {
    value: 1,
    metadata: {
      basis: "visitor home surface differs from the venue surface; turf kernel not called",
      venueSurface: home.surface,
      visitorHomeSurface: away.surface,
      asOf: home.asOf,
      slitFilmNotMeasured: true,
    },
  };
}
