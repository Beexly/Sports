/**
 * IANA timezone for each NFL club's home city. Offset is computed at kickoff
 * so daylight saving is not a hardcoded guess. Arizona does not observe it.
 */
export const NFL_TEAM_TIMEZONE: Readonly<Record<string, string>> = {
  ATL: "America/New_York",
  BAL: "America/New_York",
  BUF: "America/New_York",
  CAR: "America/New_York",
  CIN: "America/New_York",
  CLE: "America/New_York",
  DET: "America/Detroit",
  IND: "America/Indiana/Indianapolis",
  JAX: "America/New_York",
  MIA: "America/New_York",
  NE: "America/New_York",
  NYG: "America/New_York",
  NYJ: "America/New_York",
  PHI: "America/New_York",
  PIT: "America/New_York",
  TB: "America/New_York",
  WAS: "America/New_York",
  CHI: "America/Chicago",
  DAL: "America/Chicago",
  GB: "America/Chicago",
  HOU: "America/Chicago",
  KC: "America/Chicago",
  MIN: "America/Chicago",
  NO: "America/Chicago",
  TEN: "America/Chicago",
  DEN: "America/Denver",
  ARI: "America/Phoenix",
  LA: "America/Los_Angeles",
  LAC: "America/Los_Angeles",
  LV: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  SF: "America/Los_Angeles",
};

/** Hours east of UTC at `at`. America/New_York in October is -4, not -5. */
export function tzOffsetHours(zone: string, at: Date): number | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    const match = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(name ?? "");
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    if (!Number.isFinite(hours)) return null;
    return hours + (hours < 0 ? -minutes : minutes) / 60;
  } catch {
    return null;
  }
}

export function localHour24(zone: string, at: Date): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .find((p) => p.type === "hour")?.value;
    const n = Number(hour);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
