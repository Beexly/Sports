/**
 * Home-relative circadian vote. The away club is the visitor. A negative
 * spread adjustment for that visitor favors home, so the sign is flipped.
 * Travel miles are not measured and are not passed. Rest must be on the row.
 */
import { evalCircadianTravelFatigue } from "./signals-bridge.js";
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { NFL_TEAM_TIMEZONE, localHour24, tzOffsetHours } from "./nfl-team-timezone.js";
import { ESPN_NEUTRAL_SITE_PAIRS } from "./priors/espn-nfl-2026-w4.js";

function label(team: unknown): string | null {
  if (typeof team === "string") return team;
  if (team && typeof team === "object") {
    const row = team as { abbreviation?: unknown; name?: unknown };
    if (typeof row.abbreviation === "string" && row.abbreviation.trim() !== "") return row.abbreviation;
    if (typeof row.name === "string") return row.name;
  }
  return null;
}

function num(env: Record<string, string | undefined>, key: string): number | null {
  const raw = env[key];
  if (raw == null || raw.trim() === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

export function homeRelativeCircadian(input: {
  homeTeam: unknown;
  awayTeam: unknown;
  commenceTime: Date;
  env: Record<string, string | undefined>;
}): { value: number; metadata: Record<string, unknown> } | null {
  const homeAbbr = nflTeamAbbr(label(input.homeTeam));
  const awayAbbr = nflTeamAbbr(label(input.awayTeam));
  if (homeAbbr == null || awayAbbr == null) return null;
  const pair = [homeAbbr, awayAbbr].sort().join("|");
  if (ESPN_NEUTRAL_SITE_PAIRS.some((p) => [...p].sort().join("|") === pair)) return null;
  const homeZone = NFL_TEAM_TIMEZONE[homeAbbr];
  const awayZone = NFL_TEAM_TIMEZONE[awayAbbr];
  if (homeZone == null || awayZone == null) return null;
  const homeRest = num(input.env, "HOME_REST_DAYS");
  const awayRest = num(input.env, "AWAY_REST_DAYS");
  if (homeRest == null || awayRest == null) return null;
  const origin = tzOffsetHours(awayZone, input.commenceTime);
  const destination = tzOffsetHours(homeZone, input.commenceTime);
  const hour = localHour24(homeZone, input.commenceTime);
  if (origin == null || destination == null || hour == null) return null;
  const bridged = evalCircadianTravelFatigue({
    team: awayAbbr,
    isVisitor: true,
    originTimeZoneOffset: origin,
    destinationTimeZoneOffset: destination,
    localKickoffHour24: hour,
    daysOfRest: awayRest,
    opponentDaysOfRest: homeRest,
  });
  if (!bridged.ok) return null;
  return {
    value: Number((-bridged.data.netGameSpreadTiltPoints).toFixed(4)),
    metadata: {
      homeAbbr,
      awayAbbr,
      originOffset: origin,
      destinationOffset: destination,
      localKickoffHour: hour,
      visitorSpreadTilt: bridged.data.netGameSpreadTiltPoints,
      travelMilesNotMeasured: true,
      assumption: "home club plays in its home city, except the ESPN neutral-site pair for this week",
    },
  };
}
