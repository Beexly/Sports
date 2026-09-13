/**
 * Rest and travel — the oldest real edge in football, and one of the few that is
 * pure fact: who played more recently, and who had to fly across the country to
 * get here.
 *
 * This is a corroboration signal under `../gate-contract`. It cannot add
 * conviction, change a line, or move a probability. It can only say whether the
 * schedule backs the side the engine took, or argues against it — or say
 * nothing at all, which is what it does whenever the data is not there.
 *
 * WHAT IT READS
 *   - Days of rest for BOTH teams, from each team's previous kickoff in the
 *     `games` table (injected, so this module is unit-testable and holds no
 *     Prisma import).
 *   - Short week: 4 days or fewer, i.e. the Thursday game after a Sunday.
 *   - Off a bye: 13 days or more.
 *   - Great-circle miles from the away team's own stadium to the venue.
 *   - Time zones crossed, and specifically the west-to-east body-clock penalty:
 *     a 1pm ET kickoff is 10am body time for a team that flew in from Seattle.
 *
 * ABSENT DATA IS NEVER EVIDENCE. A missing previous game, a missing stadium, a
 * sport that is not the NFL, or a side we cannot name all return `null`. Rest is
 * never defaulted to 0 and never defaulted to 7 — an unknown schedule is
 * unknown, and an unknown signal does not vote.
 *
 * TOTALS GET NOTHING. For an over/under we return `null` on purpose. Rest and
 * travel tell you which TEAM is compromised; they do not tell you whether the
 * scoreboard lands above or below a number. A tired team can grind the clock to
 * an under or get run off the field into an over, and we have no measured basis
 * here to pick between those. Saying nothing is the honest read.
 */

import type {
  GateCandidate,
  SignalFn,
  SignalRead,
  SignalVerdict,
} from "../gate-contract";

export type RestTravelDeps = {
  /** Previous completed game kickoff for a team before `before`. Null when unknown. */
  readonly previousGameKickoff: (teamName: string, before: Date) => Promise<Date | null>;
};

/** One NFL home venue. */
export type NflStadium = {
  /** Display label used in copy, e.g. "Las Vegas". */
  readonly short: string;
  /** True when `short` is a plural nickname, so the copy reads "Rams are", not "Rams is". */
  readonly plural: boolean;
  readonly lat: number;
  readonly lon: number;
  /** IANA zone of the venue. */
  readonly tz: string;
};

/**
 * Static NFL home-venue table, keyed by the team's full name exactly as it is
 * stored in `games.homeTeamName` / `games.awayTeamName`.
 *
 * Source: each club's current home stadium, coordinates rounded to 3 decimals
 * (about 110 m — far finer than a travel band needs) and the IANA zone the venue
 * actually observes. Arizona is America/Phoenix (no DST); Indianapolis observes
 * Eastern. The Giants and Jets share MetLife; the Rams and Chargers share SoFi,
 * so those pairs carry identical coordinates on purpose.
 *
 * This table is a fact table, not a model input. If a club relocates, correct the
 * row — never interpolate a missing one.
 */
export const NFL_STADIUMS: Readonly<Record<string, NflStadium>> = Object.freeze({
  "Arizona Cardinals": { short: "Arizona", plural: false, lat: 33.528, lon: -112.263, tz: "America/Phoenix" },
  "Atlanta Falcons": { short: "Atlanta", plural: false, lat: 33.755, lon: -84.401, tz: "America/New_York" },
  "Baltimore Ravens": { short: "Baltimore", plural: false, lat: 39.278, lon: -76.623, tz: "America/New_York" },
  "Buffalo Bills": { short: "Buffalo", plural: false, lat: 42.774, lon: -78.787, tz: "America/New_York" },
  "Carolina Panthers": { short: "Carolina", plural: false, lat: 35.226, lon: -80.853, tz: "America/New_York" },
  "Chicago Bears": { short: "Chicago", plural: false, lat: 41.862, lon: -87.617, tz: "America/Chicago" },
  "Cincinnati Bengals": { short: "Cincinnati", plural: false, lat: 39.095, lon: -84.516, tz: "America/New_York" },
  "Cleveland Browns": { short: "Cleveland", plural: false, lat: 41.506, lon: -81.699, tz: "America/New_York" },
  "Dallas Cowboys": { short: "Dallas", plural: false, lat: 32.748, lon: -97.093, tz: "America/Chicago" },
  "Denver Broncos": { short: "Denver", plural: false, lat: 39.744, lon: -105.02, tz: "America/Denver" },
  "Detroit Lions": { short: "Detroit", plural: false, lat: 42.34, lon: -83.046, tz: "America/New_York" },
  "Green Bay Packers": { short: "Green Bay", plural: false, lat: 44.501, lon: -88.062, tz: "America/Chicago" },
  "Houston Texans": { short: "Houston", plural: false, lat: 29.685, lon: -95.411, tz: "America/Chicago" },
  "Indianapolis Colts": { short: "Indianapolis", plural: false, lat: 39.76, lon: -86.164, tz: "America/Indiana/Indianapolis" },
  "Jacksonville Jaguars": { short: "Jacksonville", plural: false, lat: 30.324, lon: -81.637, tz: "America/New_York" },
  "Kansas City Chiefs": { short: "Kansas City", plural: false, lat: 39.049, lon: -94.484, tz: "America/Chicago" },
  "Las Vegas Raiders": { short: "Las Vegas", plural: false, lat: 36.091, lon: -115.184, tz: "America/Los_Angeles" },
  "Los Angeles Chargers": { short: "the Chargers", plural: true, lat: 33.953, lon: -118.339, tz: "America/Los_Angeles" },
  "Los Angeles Rams": { short: "the Rams", plural: true, lat: 33.953, lon: -118.339, tz: "America/Los_Angeles" },
  "Miami Dolphins": { short: "Miami", plural: false, lat: 25.958, lon: -80.239, tz: "America/New_York" },
  "Minnesota Vikings": { short: "Minnesota", plural: false, lat: 44.974, lon: -93.258, tz: "America/Chicago" },
  "New England Patriots": { short: "New England", plural: false, lat: 42.091, lon: -71.264, tz: "America/New_York" },
  "New Orleans Saints": { short: "New Orleans", plural: false, lat: 29.951, lon: -90.081, tz: "America/Chicago" },
  "New York Giants": { short: "the Giants", plural: true, lat: 40.814, lon: -74.074, tz: "America/New_York" },
  "New York Jets": { short: "the Jets", plural: true, lat: 40.814, lon: -74.074, tz: "America/New_York" },
  "Philadelphia Eagles": { short: "Philadelphia", plural: false, lat: 39.901, lon: -75.167, tz: "America/New_York" },
  "Pittsburgh Steelers": { short: "Pittsburgh", plural: false, lat: 40.447, lon: -80.016, tz: "America/New_York" },
  "San Francisco 49ers": { short: "San Francisco", plural: false, lat: 37.403, lon: -121.97, tz: "America/Los_Angeles" },
  "Seattle Seahawks": { short: "Seattle", plural: false, lat: 47.595, lon: -122.332, tz: "America/Los_Angeles" },
  "Tampa Bay Buccaneers": { short: "Tampa Bay", plural: false, lat: 27.976, lon: -82.503, tz: "America/New_York" },
  "Tennessee Titans": { short: "Tennessee", plural: false, lat: 36.166, lon: -86.771, tz: "America/Chicago" },
  "Washington Commanders": { short: "Washington", plural: false, lat: 38.908, lon: -76.864, tz: "America/New_York" },
});

/** The sport keys this signal will speak about. Anything else is silence. */
const NFL_SPORT_KEYS: ReadonlySet<string> = new Set(["americanfootball_nfl", "nfl"]);

/** 4 days or fewer between kickoffs — the Thursday game after a Sunday. */
export const SHORT_WEEK_DAYS = 4;
/** 13 days or more — a bye week, however the calendar fell. */
export const BYE_WEEK_DAYS = 13;
/** A standard week of preparation: not short, not a bye. */
const NORMAL_REST_MIN = 6;
const NORMAL_REST_MAX = 12;
/** Zones crossed eastward before the body clock argument is worth making. */
export const ZONES_FOR_BODY_CLOCK = 2;
/** Kickoffs before this hour, Eastern, are "early" for a visiting western team. */
export const EARLY_KICKOFF_ET_HOUR = 16;
/** Rest gap, in days, that counts as a real edge rather than schedule noise. */
export const REST_EDGE_DAYS = 3;

const EARTH_RADIUS_MILES = 3958.7613;
const MS_PER_DAY = 86_400_000;

export function stadiumFor(teamName: string): NflStadium | null {
  return NFL_STADIUMS[teamName] ?? null;
}

/** Great-circle distance in miles. Haversine — a band, not navigation. */
export function greatCircleMiles(
  from: { readonly lat: number; readonly lon: number },
  to: { readonly lat: number; readonly lon: number },
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Minutes that `timeZone` sits ahead of UTC at `at` (negative for the Americas),
 * DST included because it is read off the real zone. Null when the zone is not
 * one the runtime knows — an unreadable zone is unknown, not zero.
 */
export function utcOffsetMinutes(timeZone: string, at: Date): number | null {
  if (Number.isNaN(at.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const read = (type: string): number => {
      const found = parts.find((p) => p.type === type);
      return found ? Number(found.value) : Number.NaN;
    };
    const year = read("year");
    const month = read("month");
    const day = read("day");
    const rawHour = read("hour");
    const minute = read("minute");
    const second = read("second");
    if ([year, month, day, rawHour, minute, second].some((n) => Number.isNaN(n))) return null;
    const hour = rawHour === 24 ? 0 : rawHour;
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - at.getTime()) / 60_000);
  } catch {
    return null;
  }
}

/**
 * Whole time zones crossed travelling from `fromTz` to `toTz` at `at`.
 * Positive means eastward (the body-clock direction that costs you). Null when
 * either zone cannot be read.
 */
export function zonesCrossedEastward(fromTz: string, toTz: string, at: Date): number | null {
  const from = utcOffsetMinutes(fromTz, at);
  const to = utcOffsetMinutes(toTz, at);
  if (from === null || to === null) return null;
  return Math.round((to - from) / 60);
}

/** Kickoff hour 0-23 in Eastern time. Null when it cannot be read. */
export function kickoffHourEastern(at: Date): number | null {
  if (Number.isNaN(at.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
    }).formatToParts(at);
    const found = parts.find((p) => p.type === "hour");
    if (!found) return null;
    const hour = Number(found.value);
    if (Number.isNaN(hour)) return null;
    return hour === 24 ? 0 : hour;
  } catch {
    return null;
  }
}

/** Whole days between a previous kickoff and this one. Null when it is not positive. */
export function restDaysBetween(previousKickoff: Date, kickoff: Date): number | null {
  const ms = kickoff.getTime() - previousKickoff.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / MS_PER_DAY);
}

/** The travel half of the read. Absent when the zones could not be resolved. */
export type TravelFacts = {
  /** Away team's own stadium to the venue. */
  readonly miles: number;
  /** Positive = the away team flew east. */
  readonly zonesEastward: number;
  /** Kickoff hour 0-23, Eastern. */
  readonly kickoffHourEt: number;
};

/** Everything the verdict is computed from, with no I/O left in it. */
export type RestTravelFacts = {
  readonly ourTeam: NflStadium;
  readonly opponent: NflStadium;
  /** True when the engine's side is the home team. */
  readonly weAreHome: boolean;
  readonly ourRestDays: number;
  readonly opponentRestDays: number;
  /** Null when travel could not be computed; the read is then partial, never invented. */
  readonly travel: TravelFacts | null;
};

const BASIS = "team schedule (games table) + static NFL stadium table";

function be(team: NflStadium): string {
  return team.plural ? "are" : "is";
}

function have(team: NflStadium): string {
  return team.plural ? "have" : "has";
}

function hourLabel(hour24: number): string {
  const suffix = hour24 >= 12 ? "pm" : "am";
  const twelve = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${twelve}${suffix}`;
}

function bodyClockLabel(kickoffHourEt: number, zonesEastward: number): string {
  const raw = kickoffHourEt - zonesEastward;
  return hourLabel(((raw % 24) + 24) % 24);
}

function milesLabel(miles: number): string {
  return Math.round(miles).toLocaleString("en-US");
}

function isShortWeek(days: number): boolean {
  return days <= SHORT_WEEK_DAYS;
}

function isOffBye(days: number): boolean {
  return days >= BYE_WEEK_DAYS;
}

function isNormalRest(days: number): boolean {
  return days >= NORMAL_REST_MIN && days <= NORMAL_REST_MAX;
}

/** True when the away team flew east across enough zones into an early kickoff. */
function bodyClockPenalty(travel: TravelFacts | null): boolean {
  if (travel === null) return false;
  return (
    travel.zonesEastward >= ZONES_FOR_BODY_CLOCK &&
    travel.kickoffHourEt < EARLY_KICKOFF_ET_HOUR
  );
}

function read(verdict: SignalVerdict, reason: string, completeness: number): SignalRead {
  return { key: "rest-travel", verdict, reason, basis: BASIS, completeness };
}

/**
 * Pure verdict. Conjunctive and conservative: a disadvantage on our own side is
 * checked before any advantage, because this gate's only power is to withhold.
 */
export function evaluateRestTravel(facts: RestTravelFacts): SignalRead {
  const { ourTeam, opponent, weAreHome, ourRestDays, opponentRestDays, travel } = facts;
  // 1.0 only when both previous games AND the travel picture were real.
  const completeness = travel === null ? 0.5 : 1;
  const restGap = ourRestDays - opponentRestDays;
  const penalty = bodyClockPenalty(travel);

  // --- CONTRADICTS: our side is the one carrying the schedule burden. ---
  if (isShortWeek(ourRestDays) && !isShortWeek(opponentRestDays)) {
    return read(
      "CONTRADICTS",
      `${ourTeam.short} ${be(ourTeam)} on a short week (${ourRestDays} days) and ${opponent.short} ${be(opponent)} not (${opponentRestDays}).`,
      completeness,
    );
  }
  if (!weAreHome && penalty && travel !== null && isNormalRest(opponentRestDays)) {
    return read(
      "CONTRADICTS",
      `${ourTeam.short} ${have(ourTeam)} to fly ${milesLabel(travel.miles)} miles east across ${travel.zonesEastward} time zones for a ${hourLabel(travel.kickoffHourEt)} ET kickoff — that is ${bodyClockLabel(travel.kickoffHourEt, travel.zonesEastward)} on their body clock — while ${opponent.short} ${be(opponent)} home on a normal week.`,
      completeness,
    );
  }

  // --- CONFIRMS: our side is the one the schedule is helping. ---
  if (isOffBye(ourRestDays) && !isOffBye(opponentRestDays)) {
    return read(
      "CONFIRMS",
      `${ourTeam.short} ${be(ourTeam)} off a bye (${ourRestDays} days) and ${opponent.short} played ${opponentRestDays} days ago.`,
      completeness,
    );
  }
  if (restGap >= REST_EDGE_DAYS) {
    return read(
      "CONFIRMS",
      `${ourTeam.short} ${have(ourTeam)} had ${ourRestDays} days off to ${opponent.short}'s ${opponentRestDays}.`,
      completeness,
    );
  }
  if (weAreHome && penalty && travel !== null) {
    return read(
      "CONFIRMS",
      `${opponent.short} ${have(opponent)} to fly ${milesLabel(travel.miles)} miles east across ${travel.zonesEastward} time zones for a ${hourLabel(travel.kickoffHourEt)} ET kickoff — that is ${bodyClockLabel(travel.kickoffHourEt, travel.zonesEastward)} on their body clock — and ${ourTeam.short} ${be(ourTeam)} at home.`,
      completeness,
    );
  }

  // --- NEUTRAL: we looked, and the schedule is a wash. ---
  if (Math.abs(restGap) <= 1) {
    return read(
      "NEUTRAL",
      `Both teams are on normal rest (${ourRestDays} and ${opponentRestDays} days) and nobody is fighting the clock.`,
      completeness,
    );
  }
  return read(
    "NEUTRAL",
    `${ourTeam.short} ${have(ourTeam)} ${ourRestDays} days to ${opponent.short}'s ${opponentRestDays} — not enough of a gap to lean on.`,
    completeness,
  );
}

/**
 * Build the signal. The only dependency is a previous-kickoff loader, so this
 * module never imports Prisma and can be exercised in a unit test.
 */
export function createRestTravelSignal(deps: RestTravelDeps): SignalFn {
  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    if (!NFL_SPORT_KEYS.has(candidate.sportKey.toLowerCase())) return null;
    // Totals: see the file header. Rest and travel do not speak to a total in a
    // way we can defend, so we say nothing rather than guess.
    if (candidate.pickType === "TOTAL") return null;
    if (candidate.side !== "home" && candidate.side !== "away") return null;

    const home = stadiumFor(candidate.homeTeamName);
    const away = stadiumFor(candidate.awayTeamName);
    if (home === null || away === null) return null;

    const weAreHome = candidate.side === "home";
    const ourTeamName = weAreHome ? candidate.homeTeamName : candidate.awayTeamName;
    const opponentName = weAreHome ? candidate.awayTeamName : candidate.homeTeamName;
    const ourTeam = weAreHome ? home : away;
    const opponent = weAreHome ? away : home;

    const [ourPrevious, opponentPrevious] = await Promise.all([
      deps.previousGameKickoff(ourTeamName, candidate.commenceTime),
      deps.previousGameKickoff(opponentName, candidate.commenceTime),
    ]);
    if (ourPrevious === null || opponentPrevious === null) return null;

    const ourRestDays = restDaysBetween(ourPrevious, candidate.commenceTime);
    const opponentRestDays = restDaysBetween(opponentPrevious, candidate.commenceTime);
    // Never default a missing or nonsensical rest value to 0 or 7.
    if (ourRestDays === null || opponentRestDays === null) return null;

    const zonesEastward = zonesCrossedEastward(away.tz, home.tz, candidate.commenceTime);
    const kickoffHourEt = kickoffHourEastern(candidate.commenceTime);
    const travel: TravelFacts | null =
      zonesEastward === null || kickoffHourEt === null
        ? null
        : { miles: greatCircleMiles(away, home), zonesEastward, kickoffHourEt };

    return evaluateRestTravel({
      ourTeam,
      opponent,
      weAreHome,
      ourRestDays,
      opponentRestDays,
      travel,
    });
  };
}
