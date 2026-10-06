import { describe, expect, it } from "vitest";

import type { GateCandidate } from "../gate-contract";
import {
  createRestTravelSignal,
  evaluateRestTravel,
  greatCircleMiles,
  NFL_STADIUMS,
  restDaysBetween,
  stadiumFor,
  zonesCrossedEastward,
  type NflStadium,
  type RestTravelDeps,
} from "./rest-travel";

/** Sunday 2026-09-13, 1:00pm ET (EDT = UTC-4). */
const SUNDAY_1PM_ET = new Date("2026-09-13T17:00:00Z");
/** Sunday 2026-09-13, 8:20pm ET. */
const SUNDAY_820PM_ET = new Date("2026-09-14T00:20:00Z");
/** Thursday 2026-09-17, 8:15pm ET. */
const THURSDAY_815PM_ET = new Date("2026-09-18T00:15:00Z");

function mustStadium(teamName: string): NflStadium {
  const found = stadiumFor(teamName);
  if (found === null) throw new Error(`missing stadium for ${teamName}`);
  return found;
}

function daysBefore(at: Date, days: number): Date {
  return new Date(at.getTime() - days * 86_400_000);
}

/** Fake loader: a fixed rest map per team. No network, no database, no clock. */
function deps(restByTeam: Readonly<Record<string, number | null>>): RestTravelDeps {
  return {
    previousGameKickoff: (teamName: string, before: Date): Promise<Date | null> => {
      const rest = restByTeam[teamName];
      if (rest === undefined || rest === null) return Promise.resolve(null);
      return Promise.resolve(daysBefore(before, rest));
    },
  };
}

function candidate(overrides: Partial<GateCandidate> = {}): GateCandidate {
  return {
    gameId: "g-1",
    sportKey: "americanfootball_nfl",
    homeTeamName: "Miami Dolphins",
    awayTeamName: "Seattle Seahawks",
    commenceTime: SUNDAY_1PM_ET,
    pickType: "MONEYLINE",
    selection: "Seattle Seahawks",
    side: "away",
    line: null,
    ...overrides,
  };
}

describe("NFL stadium table", () => {
  it("covers all 32 clubs under their full stored names", () => {
    expect(Object.keys(NFL_STADIUMS)).toHaveLength(32);
    expect(stadiumFor("Las Vegas Raiders")?.tz).toBe("America/Los_Angeles");
    expect(stadiumFor("Washington Commanders")?.short).toBe("Washington");
    expect(stadiumFor("Portland Pioneers")).toBeNull();
  });

  it("puts Seattle roughly 2,700 miles from Miami", () => {
    const miles = greatCircleMiles(
      mustStadium("Seattle Seahawks"),
      mustStadium("Miami Dolphins"),
    );
    expect(miles).toBeGreaterThan(2500);
    expect(miles).toBeLessThan(2900);
  });

  it("reads three zones crossed flying Seattle to Miami", () => {
    expect(
      zonesCrossedEastward("America/Los_Angeles", "America/New_York", SUNDAY_1PM_ET),
    ).toBe(3);
    expect(zonesCrossedEastward("America/New_York", "America/Chicago", SUNDAY_1PM_ET)).toBe(-1);
    expect(zonesCrossedEastward("Mars/Olympus", "America/New_York", SUNDAY_1PM_ET)).toBeNull();
  });

  it("refuses a previous kickoff that is not actually before this one", () => {
    expect(restDaysBetween(daysBefore(SUNDAY_1PM_ET, 7), SUNDAY_1PM_ET)).toBe(7);
    expect(restDaysBetween(new Date(SUNDAY_1PM_ET.getTime() + 1), SUNDAY_1PM_ET)).toBeNull();
  });
});

describe("createRestTravelSignal — silence when the data is not there", () => {
  it("says nothing about a sport that is not the NFL", async () => {
    const signal = createRestTravelSignal(deps({}));
    expect(await signal(candidate({ sportKey: "baseball_mlb" }))).toBeNull();
  });

  it("says nothing when the side cannot be named", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": 7 }),
    );
    expect(await signal(candidate({ side: null }))).toBeNull();
  });

  it("says nothing about a total", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": 7 }),
    );
    expect(await signal(candidate({ pickType: "TOTAL", side: "over", line: 44.5 }))).toBeNull();
    expect(await signal(candidate({ pickType: "TOTAL", side: "under", line: 44.5 }))).toBeNull();
  });

  it("says nothing when a team's previous game is unknown, rather than assuming a week", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": null }),
    );
    expect(await signal(candidate())).toBeNull();

    const otherSideMissing = createRestTravelSignal(deps({ "Seattle Seahawks": 7 }));
    expect(await otherSideMissing(candidate())).toBeNull();
  });

  it("says nothing when a stadium is missing from the table", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Portland Pioneers": 7 }),
    );
    expect(
      await signal(candidate({ awayTeamName: "Portland Pioneers", selection: "Portland Pioneers" })),
    ).toBeNull();
  });
});

describe("createRestTravelSignal — CONTRADICTS", () => {
  it("holds our side when it is on a short week and the opponent is not", async () => {
    const signal = createRestTravelSignal(
      deps({ "Carolina Panthers": 4, "Chicago Bears": 7 }),
    );
    const read = await signal(
      candidate({
        homeTeamName: "Chicago Bears",
        awayTeamName: "Carolina Panthers",
        commenceTime: THURSDAY_815PM_ET,
        selection: "Carolina Panthers",
        side: "away",
      }),
    );
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.reason).toBe(
      "Carolina is on a short week (4 days) and Chicago is not (7).",
    );
    expect(read?.basis).toBe("team schedule (games table) + static NFL stadium table");
    expect(read?.completeness).toBe(1);
  });

  it("holds our side when it flies west-to-east across 3 zones into a 1pm ET kickoff", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": 7 }),
    );
    const read = await signal(candidate());
    expect(read?.verdict).toBe("CONTRADICTS");
    expect(read?.reason).toContain("3 time zones");
    expect(read?.reason).toContain("1pm ET kickoff");
    expect(read?.reason).toContain("10am on their body clock");
    expect(read?.key).toBe("rest-travel");
  });
});

describe("createRestTravelSignal — CONFIRMS", () => {
  it("backs our side when it is off a bye and the opponent is not", async () => {
    const signal = createRestTravelSignal(deps({ "Miami Dolphins": 7, "Buffalo Bills": 14 }));
    const read = await signal(
      candidate({ awayTeamName: "Buffalo Bills", selection: "Buffalo Bills", side: "away" }),
    );
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.reason).toBe("Buffalo is off a bye (14 days) and Miami played 7 days ago.");
  });

  it("backs our side when it has three or more extra days of rest", async () => {
    const signal = createRestTravelSignal(deps({ "Miami Dolphins": 7, "Buffalo Bills": 10 }));
    const read = await signal(
      candidate({ awayTeamName: "Buffalo Bills", selection: "Buffalo Bills", side: "away" }),
    );
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.reason).toBe("Buffalo has had 10 days off to Miami's 7.");
  });

  it("backs our side when it is home and the opponent is the one crossing zones early", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": 7 }),
    );
    const read = await signal(candidate({ side: "home", selection: "Miami Dolphins" }));
    expect(read?.verdict).toBe("CONFIRMS");
    expect(read?.reason).toContain("Seattle has to fly");
    expect(read?.reason).toContain("and Miami is at home");
    expect(read?.completeness).toBe(1);
  });
});

describe("createRestTravelSignal — NEUTRAL", () => {
  it("is a wash when both teams are level and nobody travels far", async () => {
    const signal = createRestTravelSignal(deps({ "Chicago Bears": 7, "Dallas Cowboys": 7 }));
    const read = await signal(
      candidate({
        homeTeamName: "Chicago Bears",
        awayTeamName: "Dallas Cowboys",
        selection: "Dallas Cowboys",
        side: "away",
      }),
    );
    expect(read?.verdict).toBe("NEUTRAL");
    expect(read?.reason).toBe(
      "Both teams are on normal rest (7 and 7 days) and nobody is fighting the clock.",
    );
  });

  it("does not fire the body clock on a night kickoff", async () => {
    const signal = createRestTravelSignal(
      deps({ "Miami Dolphins": 7, "Seattle Seahawks": 7 }),
    );
    const read = await signal(candidate({ commenceTime: SUNDAY_820PM_ET }));
    expect(read?.verdict).toBe("NEUTRAL");
  });

  it("names a two-day gap without leaning on it", () => {
    const read = evaluateRestTravel({
      ourTeam: mustStadium("Buffalo Bills"),
      opponent: mustStadium("Miami Dolphins"),
      weAreHome: false,
      ourRestDays: 9,
      opponentRestDays: 7,
      travel: { miles: 1200, zonesEastward: 0, kickoffHourEt: 13 },
    });
    expect(read.verdict).toBe("NEUTRAL");
    expect(read.reason).toBe("Buffalo has 9 days to Miami's 7 — not enough of a gap to lean on.");
  });
});

describe("completeness", () => {
  it("is 0.5 when rest is known but travel could not be computed", () => {
    const read = evaluateRestTravel({
      ourTeam: mustStadium("Buffalo Bills"),
      opponent: mustStadium("Miami Dolphins"),
      weAreHome: false,
      ourRestDays: 4,
      opponentRestDays: 7,
      travel: null,
    });
    expect(read.verdict).toBe("CONTRADICTS");
    expect(read.completeness).toBe(0.5);
  });

  it("never claims a travel verdict on partial data", () => {
    const read = evaluateRestTravel({
      ourTeam: mustStadium("Seattle Seahawks"),
      opponent: mustStadium("Miami Dolphins"),
      weAreHome: false,
      ourRestDays: 7,
      opponentRestDays: 7,
      travel: null,
    });
    expect(read.verdict).toBe("NEUTRAL");
    expect(read.completeness).toBe(0.5);
  });
});

describe("the disadvantage is checked before the advantage", () => {
  it("still holds a bye team that has to fly east for an early kickoff", () => {
    const read = evaluateRestTravel({
      ourTeam: mustStadium("Seattle Seahawks"),
      opponent: mustStadium("Miami Dolphins"),
      weAreHome: false,
      ourRestDays: 14,
      opponentRestDays: 7,
      travel: { miles: 2724, zonesEastward: 3, kickoffHourEt: 13 },
    });
    expect(read.verdict).toBe("CONTRADICTS");
  });

  it("uses plural verbs for the shared-market clubs", () => {
    const read = evaluateRestTravel({
      ourTeam: mustStadium("New York Jets"),
      opponent: mustStadium("Miami Dolphins"),
      weAreHome: false,
      ourRestDays: 4,
      opponentRestDays: 7,
      travel: { miles: 1090, zonesEastward: 0, kickoffHourEt: 13 },
    });
    expect(read.reason).toBe("the Jets are on a short week (4 days) and Miami is not (7).");
  });
});
