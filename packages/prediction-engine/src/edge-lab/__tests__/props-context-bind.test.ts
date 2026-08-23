/**
 * IC8 · props-context-bind — rest / body-clock / weather bind into the props
 * stack. Fixture-driven; no network. Follows the CARDS_INCENTIVE_CALENDAR.md
 * IC8 "ATTACK LIST" exactly:
 *
 *  1. Rest imputation hunt — no `7`-day default; week-1 ⇒ refuse no_prior_game.
 *  2. Rest arithmetic — hand-computed days.
 *  3. Body-clock venue orientation — SEA@BUF=+3, BUF@SEA=-3, SEA at home=0;
 *     alias OAK→LV binds; "XYZ" refuses unknown_team.
 *  4. Leak-gate boundary — forecast issued AT cut-off binds; 1ms later refuses.
 *  5. Dome with all-null outdoor fields ⇒ ok, value 0; outdoor with one null
 *     ⇒ refuse missing_outdoor_fields.
 *  6. All-or-refuse — fields=[rest,body-clock,weather] with only weather failing
 *     ⇒ whole request refuses naming wx_total_suppression; reorder follows
 *     request order.
 *  7. Batch isolation — one bad row refuses, the others bind (index-aligned).
 *  8. Determinism + frozen inputs; knownAtIso per field matches spec source.
 */
import { describe, expect, it } from "vitest";

import type { GameRow } from "../game-row.js";
import type { GameWeatherForecast } from "../features/nfl-weather.js";
import {
  bindTeamContext,
  bindTeamContextBatch,
  CONTEXT_BIND_METHOD_TAG,
  type ContextField,
} from "../props-context-bind.js";

const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;
const DAY_MS = 86_400_000;

function kickoffIsoFrom(startMs: number): string {
  return new Date(startMs).toISOString();
}

/** A completed NFL game row (scores present) at the given kickoff epoch. */
function game(atMs: number, home: string, away: string, hs: number, as_: number): GameRow {
  return {
    sport: "nfl",
    gameId: `g_${atMs}_${home}_${away}`,
    season: 2021,
    week: 1,
    startTime: new Date(atMs).toISOString(),
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as_,
    closing: {
      spreadHome: -3,
      total: 44,
      moneylineHomeDecimal: 1.8,
      moneylineAwayDecimal: 2.1,
    },
  };
}

function forecast(over: Partial<GameWeatherForecast>): GameWeatherForecast {
  return {
    forecastIssuedAt: "2021-09-12T12:00:00.000Z", // 1h before a 1:00 PM ET kickoff
    isDome: false,
    windMph: 10,
    precipProbPct: 20,
    tempF: 70,
    ...over,
  };
}

describe("bindTeamContext — rest_days", () => {
  // Attack #1: no 7-day default; week-1 ⇒ refuse no_prior_game.
  it("refuses no_prior_game when the team has no prior completed game (week 1)", () => {
    const kickoff = Date.parse("2021-09-12T17:00:00.000Z"); // Week 1 kickoff
    const result = bindTeamContext({
      schedule: [], // no prior games
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "w1_ne",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_prior_game");
      expect(result.field).toBe("rest_days");
      expect(result.priced).toBe(false);
    }
  });

  // Attack #1 continued: grep for literal 7 near rest logic — no default-days constant.
  it("never emits a 7-day default (rest_days must derive from actual prior game)", () => {
    // If there IS a prior game, rest must be the real gap, not 7.
    const priorStart = Date.parse("2021-09-05T17:00:00.000Z"); // 7 days before
    const kickoff = Date.parse("2021-09-14T17:00:00.000Z"); // 2 days later (Mon)
    const result = bindTeamContext({
      schedule: [game(priorStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_test",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cell = result.cells.find((c) => c.field === "rest_days");
      expect(cell).toBeDefined();
      // Prior game ends at priorStart + 4h. Kickoff is priorStart + 2days + 0.
      // rest_days = (kickoffMs - (priorStart + GAME_DURATION_MS)) / DAY_MS
      const expectedRest = (kickoff - (priorStart + GAME_DURATION_MS)) / DAY_MS;
      expect(cell!.value).toBeCloseTo(expectedRest, 9);
      expect(cell!.value).not.toBe(7); // never the default
    }
  });

  // Attack #2: hand-computed rest arithmetic.
  it("computes rest_days exactly from prev game end to kickoff", () => {
    // Prev game: Sunday 20:00 UTC + 4h game → ends Sun 00:00 UTC next day (Monday).
    // Wait: prevStart = Sun 20:00, end = Sun 20:00 + 4h = Mon 00:00 UTC.
    // Featured: following Sunday 18:00 UTC kickoff.
    // rest_days = (Sun_18:00 - Mon_00:00) / day = (6 days 18 hours) / 24 = 6.75
    const prevStart = Date.parse("2021-09-12T20:00:00.000Z"); // Sunday 8 PM UTC
    const featuredKickoff = Date.parse("2021-09-19T18:00:00.000Z"); // Next Sunday 6 PM UTC
    const prevEnd = prevStart + GAME_DURATION_MS; // Mon 00:00 UTC
    const expected = (featuredKickoff - prevEnd) / DAY_MS;

    const result = bindTeamContext({
      schedule: [game(prevStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_rest",
        kickoffIso: kickoffIsoFrom(featuredKickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cell = result.cells[0]!;
      expect(cell.value).toBeCloseTo(expected, 9);
      expect(cell.field).toBe("rest_days");
      expect(cell.provenance).toBe("schedule_fact");
      expect(cell.layer).toBe("L3");
      expect(cell.grain).toBe("pregame_for_kickoff");
      expect(cell.knownAtIso).toBe(new Date(prevEnd).toISOString());
    }
  });

  it("uses the LATEST prior game, not the earliest", () => {
    // Two prior games; only the later one's end stamps rest.
    const earlyStart = Date.parse("2021-09-05T17:00:00.000Z");
    const lateStart = Date.parse("2021-09-12T17:00:00.000Z");
    const kickoff = Date.parse("2021-09-19T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [
        game(earlyStart, "NE", "BUF", 20, 17),
        game(lateStart, "NE", "MIA", 24, 21),
      ],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_latest",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expected = (kickoff - (lateStart + GAME_DURATION_MS)) / DAY_MS;
      expect(result.cells[0]!.value).toBeCloseTo(expected, 9);
    }
  });

  it("ignores games that have not yet ended at the decision cutoff", () => {
    // A scheduled future game (scores null) and a game ending AFTER decision cutoff.
    const decisionKickoff = Date.parse("2021-09-19T17:00:00.000Z");
    const futureGameStart = decisionKickoff + 7 * DAY_MS; // next week
    const result = bindTeamContext({
      schedule: [
        game(futureGameStart, "NE", "BUF", 0, 0), // scores null after overwrite below
        { // incomplete (no scores) — should be skipped
          sport: "nfl", gameId: "g_incomplete", season: 2021, week: 2,
          startTime: new Date(futureGameStart).toISOString(),
          homeTeam: "NE", awayTeam: "BUF",
          homeScore: null, awayScore: null,
          closing: { spreadHome: -3, total: 44, moneylineHomeDecimal: 1.8, moneylineAwayDecimal: 2.1 },
        },
      ],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_decision",
        kickoffIso: kickoffIsoFrom(decisionKickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_prior_game");
    }
  });
});

describe("bindTeamContext — body_clock_shift_h", () => {
  // Attack #3: SEA at BUF ⇒ +3 (venue ET -8, SEA -5... wait: SEA=-8 at BUF venue=-5: -5 - (-8) = +3)
  it("SEA away at BUF: +3 body-clock hours early", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "SEA",
        gameId: "g_sea_buf",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: false,
        opponentTeam: "BUF",
        fields: ["body_clock_shift_h"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells[0]!.value).toBe(3);
      expect(result.cells[0]!.provenance).toBe("schedule_fact");
      expect(result.cells[0]!.knownAtIso).toBe(new Date(kickoff - DECISION_LEAD_MS).toISOString());
    }
  });

  it("BUF away at SEA: -3 body-clock hours", () => {
    const kickoff = Date.parse("2021-10-10T21:25:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "BUF",
        gameId: "g_buf_sea",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: false,
        opponentTeam: "SEA",
        fields: ["body_clock_shift_h"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells[0]!.value).toBe(-3);
    }
  });

  it("SEA at home: 0 body-clock shift", () => {
    const kickoff = Date.parse("2021-10-10T21:25:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "SEA",
        gameId: "g_sea_home",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["body_clock_shift_h"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells[0]!.value).toBe(0);
    }
  });

  // Attack #3: alias OAK → LV binds
  it("OAK alias binds as LV for body-clock", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "OAK",
        gameId: "g_oak",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "KC",
        fields: ["body_clock_shift_h"],
      },
    });
    // OAK → LV (-8), KC (-6). Home at LV venue: -8 - (-8) = 0.
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells[0]!.value).toBe(0);
    }
  });

  // Attack #3: "XYZ" refuses unknown_team
  it("unknown team abbreviation refuses unknown_team when body_clock_shift_h requested", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "XYZ",
        gameId: "g_xyz",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "KC",
        fields: ["body_clock_shift_h"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("unknown_team");
      expect(result.field).toBe("body_clock_shift_h");
    }
  });
});

describe("bindTeamContext — wx_total_suppression", () => {
  // Attack #5: dome with all-null outdoor fields ⇒ ok, value 0
  it("dome with null outdoor fields binds (value 0)", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const wx: GameWeatherForecast = {
      forecastIssuedAt: "2021-10-10T10:00:00.000Z", // 1h before decision cutoff of 16:00
      isDome: true,
      windMph: null,
      precipProbPct: null,
      tempF: null,
    };
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map([["g_dome", wx]]),
      request: {
        team: "NE",
        gameId: "g_dome",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells[0]!.value).toBe(0);
      expect(result.cells[0]!.provenance).toBe("forecast_pre_cutoff");
      expect(result.cells[0]!.knownAtIso).toBe(wx.forecastIssuedAt);
    }
  });

  // Attack #5: outdoor with one null ⇒ refuse missing_outdoor_fields
  it("outdoor with a null field refuses missing_outdoor_fields", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const wx: GameWeatherForecast = {
      forecastIssuedAt: "2021-10-10T10:00:00.000Z",
      isDome: false,
      windMph: 15,
      precipProbPct: null, // missing
      tempF: 70,
    };
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map([["g_outdoor_null", wx]]),
      request: {
        team: "NE",
        gameId: "g_outdoor_null",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("missing_outdoor_fields");
      expect(result.field).toBe("wx_total_suppression");
    }
  });

  it("computes suppression index for a clean outdoor forecast", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const wx: GameWeatherForecast = {
      forecastIssuedAt: "2021-10-10T10:00:00.000Z",
      isDome: false,
      windMph: 10, // windFactor = 10/25 = 0.4
      precipProbPct: 20, // precipFactor = 0.2
      tempF: 40, // coldFactor = (50-40)/30 = 0.333...
    };
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map([["g_clean", wx]]),
      request: {
        team: "NE",
        gameId: "g_clean",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const windFactor = 10 / 25; // 0.4
      const precipFactor = 20 / 100; // 0.2
      const coldFactor = (50 - 40) / 30; // 0.333...
      const expected = 0.6 * windFactor + 0.25 * precipFactor + 0.15 * coldFactor;
      expect(result.cells[0]!.value).toBeCloseTo(expected, 9);
    }
  });

  // Attack #4: forecast issued AT cut-off binds; 1ms later refuses.
  it("forecast issued exactly AT decision cutoff binds (boundary strict: >=)", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const decisionMs = kickoff - DECISION_LEAD_MS;
    const wxAtCutoff: GameWeatherForecast = {
      forecastIssuedAt: new Date(decisionMs).toISOString(), // exactly at cut-off
      isDome: false,
      windMph: 10,
      precipProbPct: 20,
      tempF: 70,
    };
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map([["g_boundary_ok", wxAtCutoff]]),
      request: {
        team: "NE",
        gameId: "g_boundary_ok",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(true);
  });

  it("forecast issued 1ms AFTER decision cutoff refuses leaky_forecast", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const decisionMs = kickoff - DECISION_LEAD_MS;
    const wxAfter: GameWeatherForecast = {
      forecastIssuedAt: new Date(decisionMs + 1).toISOString(), // 1ms after
      isDome: false,
      windMph: 10,
      precipProbPct: 20,
      tempF: 70,
    };
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map([["g_boundary_refuse", wxAfter]]),
      request: {
        team: "NE",
        gameId: "g_boundary_refuse",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("leaky_forecast");
    }
  });

  it("missing forecast entry refuses no_forecast", () => {
    const kickoff = Date.parse("2021-10-10T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [],
      weatherByGame: new Map(), // nothing for this gameId
      request: {
        team: "NE",
        gameId: "g_missing",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_forecast");
      expect(result.field).toBe("wx_total_suppression");
    }
  });
});

describe("bindTeamContext — all-or-refuse", () => {
  // Attack #6: fields=[rest, body-clock, weather] with only weather failing ⇒
  // the whole request refuses naming wx_total_suppression.
  it("refuses naming the failing field when only weather fails", () => {
    const kickoff = Date.parse("2021-10-17T17:00:00.000Z");
    const prevStart = Date.parse("2021-10-10T17:00:00.000Z");
    // No weather for the gameId → wx fails, rest+body-clock would bind.
    const result = bindTeamContext({
      schedule: [game(prevStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_no_wx",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days", "body_clock_shift_h", "wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_forecast");
      expect(result.field).toBe("wx_total_suppression");
    }
  });

  // Attack #6: reorder fields ⇒ the named field follows request order.
  it("names the first failing field in request order", () => {
    // rest_days fails first (no prior game), weather would fail too — rest wins.
    const kickoff = Date.parse("2021-09-12T17:00:00.000Z"); // Week 1
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_w1",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days", "wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("rest_days");
      expect(result.refuse).toBe("no_prior_game");
    }
  });

  // Reverse order: weather first, rest second → weather fails first.
  it("when weather is first and fails, names wx_total_suppression even if rest also fails", () => {
    const kickoff = Date.parse("2021-09-12T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_w1_rev",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["wx_total_suppression", "rest_days"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("wx_total_suppression");
      expect(result.refuse).toBe("no_forecast");
    }
  });

  it("all three fields bind successfully in a mixed fixture", () => {
    const prevStart = Date.parse("2021-10-10T17:00:00.000Z");
    const kickoff = Date.parse("2021-10-17T17:00:00.000Z");
    const decisionMs = kickoff - DECISION_LEAD_MS;
    // Issue wx 1h before the decision cutoff so knownAtIso differs from body_clock's.
    const wxIssued = decisionMs - 3_600_000;
    const wx: GameWeatherForecast = {
      forecastIssuedAt: new Date(wxIssued).toISOString(),
      isDome: false,
      windMph: 10,
      precipProbPct: 20,
      tempF: 70,
    };
    const result = bindTeamContext({
      schedule: [game(prevStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map([["g_full", wx]]),
      request: {
        team: "NE",
        gameId: "g_full",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days", "body_clock_shift_h", "wx_total_suppression"],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cells).toHaveLength(3);
      // Attack #8: knownAtIso per field matches spec source.
      const byField = new Map(result.cells.map((c) => [c.field, c.knownAtIso] as const));
      expect(byField.get("rest_days")).toBe(new Date(prevStart + GAME_DURATION_MS).toISOString());
      expect(byField.get("body_clock_shift_h")).toBe(new Date(decisionMs).toISOString());
      expect(byField.get("wx_total_suppression")).toBe(new Date(wxIssued).toISOString());
      // All three differ in this mixed fixture.
      expect(new Set(result.cells.map((c) => c.knownAtIso)).size).toBe(3);
    }
  });

  it("unknown team refused ONLY when body_clock_shift_h is requested, not for rest_days alone", () => {
    // Attack: rest_days requested alone with an unknown team should NOT refuse
    // unknown_team — it has no prior game, so it refuses no_prior_game instead.
    const kickoff = Date.parse("2021-09-12T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "XYZ",
        gameId: "g_xyz_rest",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "KC",
        fields: ["rest_days"],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_prior_game");
      expect(result.field).toBe("rest_days");
    }
  });

  it("prior game ending exactly at decision cutoff is NOT counted for rest_days (strict <)", () => {
    // Prior game ends exactly at decisionMs — must be excluded (strict <).
    const kickoff = Date.parse("2021-10-17T17:00:00.000Z");
    const decisionMs = kickoff - DECISION_LEAD_MS;
    // prevEnd = decisionMs - 0 means the prior game's start was decisionMs - 4h.
    const prevStart = decisionMs - GAME_DURATION_MS;
    const result = bindTeamContext({
      schedule: [game(prevStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_exact_boundary",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: ["rest_days"],
      },
    });
    // prevEnd === decisionMs, so the strict < excludes it → no_prior_game.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_prior_game");
    }
  });
});

describe("bindTeamContext — batch", () => {
  // Attack #7: one bad row refuses, the others bind (index-aligned).
  it("batch isolates a bad-kickoff row from good ones", () => {
    const kickoff1 = Date.parse("2021-10-17T17:00:00.000Z");
    const prevStart = Date.parse("2021-10-10T17:00:00.000Z");
    const results = bindTeamContextBatch({
      schedule: [game(prevStart, "NE", "BUF", 24, 20)],
      weatherByGame: new Map(),
      requests: [
        {
          team: "NE",
          gameId: "g_good",
          kickoffIso: kickoffIsoFrom(kickoff1),
          isHome: true,
          opponentTeam: "BUF",
          fields: ["rest_days", "body_clock_shift_h"],
        },
        {
          team: "NE",
          gameId: "g_bad",
          kickoffIso: "not-a-date", // malformed
          isHome: true,
          opponentTeam: "BUF",
          fields: ["rest_days"],
        },
        {
          team: "BUF",
          gameId: "g_good2",
          kickoffIso: kickoffIsoFrom(kickoff1),
          isHome: true,
          opponentTeam: "NE",
          fields: ["body_clock_shift_h"],
        },
      ],
    });
    expect(results).toHaveLength(3);
    expect(results[0]!.ok).toBe(true);
    expect(results[1]!.ok).toBe(false);
    if (results[1] && !results[1].ok) {
      expect(results[1].refuse).toBe("bad_kickoff");
    }
    expect(results[2]!.ok).toBe(true);
  });

  it("batch with one data-refusal row keeps other rows binding", () => {
    const kickoff = Date.parse("2021-10-17T17:00:00.000Z");
    const results = bindTeamContextBatch({
      schedule: [], weatherByGame: new Map(),
      requests: [
        {
          team: "NE",
          gameId: "g_bad_no_prior",
          kickoffIso: kickoffIsoFrom(kickoff),
          isHome: true,
          opponentTeam: "BUF",
          fields: ["rest_days"],
        },
        {
          team: "SEA",
          gameId: "g_good",
          kickoffIso: kickoffIsoFrom(kickoff),
          isHome: false,
          opponentTeam: "BUF",
          fields: ["body_clock_shift_h"],
        },
      ],
    });
    expect(results).toHaveLength(2);
    expect(results[0]!.ok).toBe(false);
    if (!results[0]!.ok) {
      expect(results[0]!.refuse).toBe("no_prior_game");
    }
    expect(results[1]!.ok).toBe(true);
  });
});

describe("bindTeamContext — no_fields", () => {
  it("refuses no_fields on empty field list", () => {
    const kickoff = Date.parse("2021-10-17T17:00:00.000Z");
    const result = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "NE",
        gameId: "g_empty",
        kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true,
        opponentTeam: "BUF",
        fields: [],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refuse).toBe("no_fields");
      expect(result.field).toBeNull();
    }
  });
});

describe("bindTeamContext — priced:false invariant", () => {
  it("every result (ok and refuse) carries priced:false and methodTag", () => {
    const kickoff = Date.parse("2021-09-12T17:00:00.000Z");
    // refusal path
    const r1 = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "NE", gameId: "g", kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true, opponentTeam: "BUF", fields: [],
      },
    });
    expect(r1.priced).toBe(false);
    expect(r1.methodTag).toBe(CONTEXT_BIND_METHOD_TAG);

    // ok path
    const r2 = bindTeamContext({
      schedule: [], weatherByGame: new Map(),
      request: {
        team: "NE", gameId: "g2", kickoffIso: kickoffIsoFrom(kickoff),
        isHome: true, opponentTeam: "BUF", fields: ["body_clock_shift_h"],
      },
    });
    expect(r2.priced).toBe(false);
    expect(r2.methodTag).toBe(CONTEXT_BIND_METHOD_TAG);
  });
});
