/**
 * Tests for the schedule/identity loader. Fake SqlClient only — no network,
 * no real database.
 */
import { describe, expect, it } from "vitest";
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import { isMissing, isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { loadGameIdentity, nflWeekFromKickoff } from "./schedule.js";

const GAME_ID = "cmt4fewrc00jbeat5nq9eauqo";

function fakeDb(rows: readonly unknown[]): SqlClient {
  return { query: async () => ({ rows: [...rows], rowCount: rows.length }) };
}

function recordingDb(rows: readonly unknown[]): {
  db: SqlClient;
  calls: { text: string; values: readonly unknown[] | undefined }[];
} {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const db: SqlClient = {
    query: async (text, values) => {
      calls.push({ text, values });
      return { rows: [...rows], rowCount: rows.length };
    },
  };
  return { db, calls };
}

/** Tonight's verified row shape: WSH @ NYG, 2026-11-13 01:15 UTC, week 10. */
function gameRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: GAME_ID,
    homeTeamName: "New York Giants",
    awayTeamName: "Washington Commanders",
    commenceTime: "2026-11-13 01:15:00",
    updatedAt: "2026-11-12 21:32:21.725",
    sportKey: "americanfootball_nfl",
    leagueKey: null,
    ...overrides,
  };
}

describe("loadGameIdentity", () => {
  it("happy path: returns REAL with canonical codes, kickoff, season and week", async () => {
    const ev = await loadGameIdentity(fakeDb([gameRow()]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (!isPresent(ev)) return;
    expect(ev.status).toBe("REAL");
    expect(ev.source).toBe("games");
    expect(ev.value.gameId).toBe(GAME_ID);
    expect(ev.value.homeTeam).toBe("NYG");
    expect(ev.value.awayTeam).toBe("WSH");
    expect(ev.value.commenceTime).toBe("2026-11-13T01:15:00.000Z");
    expect(ev.value.sport).toBe("americanfootball_nfl");
    expect(ev.value.league).toBe("NFL");
    expect(ev.value.season).toBe(2026);
    expect(ev.value.week).toBe(10);
    // asOf comes from the row's updatedAt when present.
    expect(ev.asOf).toBe("2026-11-12T21:32:21.725Z");
  });

  it("venue is always MISSING — the games table has no venue column", async () => {
    const ev = await loadGameIdentity(fakeDb([gameRow()]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (!isPresent(ev)) return;
    expect(isMissing(ev.value.venue)).toBe(true);
    if (isMissing(ev.value.venue)) {
      expect(ev.value.venue.reason).toBe("games table has no venue column");
    }
  });

  it("empty result set: returns MISSING with a reason, never throws", async () => {
    const ev = await loadGameIdentity(fakeDb([]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) expect(ev.reason).toContain("no games row");
  });

  it("NULL commenceTime: returns MISSING (no invented kickoff)", async () => {
    const ev = await loadGameIdentity(fakeDb([gameRow({ commenceTime: null })]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) expect(ev.reason).toContain("commenceTime");
  });

  it("unknown team name: returns MISSING rather than throwing or guessing", async () => {
    const ev = await loadGameIdentity(
      fakeDb([gameRow({ homeTeamName: "Springfield Isotopes" })]),
      GAME_ID,
    );
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) expect(ev.reason.toLowerCase()).toContain("unknown team");
  });

  it("unknown away team name also returns MISSING", async () => {
    const ev = await loadGameIdentity(
      fakeDb([gameRow({ awayTeamName: "Gotham Rogues" })]),
      GAME_ID,
    );
    expect(isMissing(ev)).toBe(true);
  });

  it("NULL updatedAt: asOf falls back to commenceTime", async () => {
    const ev = await loadGameIdentity(fakeDb([gameRow({ updatedAt: null })]), GAME_ID);
    expect(isPresent(ev)).toBe(true);
    if (isPresent(ev)) expect(ev.asOf).toBe("2026-11-13T01:15:00.000Z");
  });

  it("accepts Date objects as well as Postgres timestamp strings", async () => {
    const ev = await loadGameIdentity(
      fakeDb([
        gameRow({
          commenceTime: new Date("2026-11-13T01:15:00Z"),
          updatedAt: new Date("2026-11-12T21:32:21.725Z"),
        }),
      ]),
      GAME_ID,
    );
    expect(isPresent(ev)).toBe(true);
    if (isPresent(ev)) {
      expect(ev.value.commenceTime).toBe("2026-11-13T01:15:00.000Z");
      expect(ev.asOf).toBe("2026-11-12T21:32:21.725Z");
    }
  });

  it("queries by parameterised id, SELECT only", async () => {
    const { db, calls } = recordingDb([gameRow()]);
    await loadGameIdentity(db, GAME_ID);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.values).toEqual([GAME_ID]);
    expect(call?.text.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    expect(call?.text).toContain("games");
  });

  it("missing sport label: returns MISSING instead of an opaque sportId", async () => {
    const ev = await loadGameIdentity(fakeDb([gameRow({ sportKey: null })]), GAME_ID);
    expect(isMissing(ev)).toBe(true);
  });

  it("kickoff outside the regular season: refuses to invent a week", async () => {
    const ev = await loadGameIdentity(
      fakeDb([gameRow({ commenceTime: "2026-08-15 17:00:00" })]),
      GAME_ID,
    );
    expect(isMissing(ev)).toBe(true);
    if (isMissing(ev)) expect(ev.reason).toContain("week");
  });
});

describe("nflWeekFromKickoff", () => {
  it("matches the verified 2026 week-10 Thursday night game", () => {
    expect(nflWeekFromKickoff(new Date("2026-11-13T01:15:00Z"))).toBe(10);
  });

  it("week 1 opens on the Thursday after Labor Day (2026-09-10)", () => {
    expect(nflWeekFromKickoff(new Date("2026-09-10T20:20:00Z"))).toBe(1);
    // The Monday night game of week 1 lands in the same week bucket.
    expect(nflWeekFromKickoff(new Date("2026-09-15T00:20:00Z"))).toBe(1);
  });

  it("returns null for preseason and playoff dates", () => {
    expect(nflWeekFromKickoff(new Date("2026-08-15T17:00:00Z"))).toBeNull();
    expect(nflWeekFromKickoff(new Date("2027-01-10T20:00:00Z"))).toBeNull();
  });
});
