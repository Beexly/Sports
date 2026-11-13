/**
 * Tests for the injuries evidence loader.
 *
 * All network access is injected via a fake fetch — no real calls. The fake
 * pins the real ESPN injuries endpoint URL so a proxy substitution would fail
 * the assertion. The client's module-level cache is cleared before every test
 * so a cached success can never mask a failed-fetch case.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { clearInjuryCacheForTests } from "@sports/data-ingestion/src/espn-injuries-client.js";
import { loadInjuries } from "./injuries.js";

const FIXED_NOW = new Date("2026-11-12T15:00:00.000Z");
const ESPN_NFL_INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries";

/** Two-team payload: Rams (2 records) and Packers (1 record). */
const twoTeamPayload = {
  injuries: [
    {
      id: "14",
      displayName: "Los Angeles Rams",
      injuries: [
        {
          id: "inj-1",
          status: "Out",
          shortComment: "Knee",
          date: "2026-11-10T18:00:00.000Z",
          athlete: {
            displayName: "Matthew Stafford",
            position: { abbreviation: "QB" },
          },
        },
        {
          id: "inj-2",
          status: "Questionable",
          shortComment: "Hamstring",
          date: "2026-11-11T20:30:00.000Z",
          athlete: {
            displayName: "Puka Nacua",
            position: { abbreviation: "WR" },
          },
        },
      ],
    },
    {
      id: "9",
      displayName: "Green Bay Packers",
      injuries: [
        {
          id: "inj-3",
          status: "Questionable",
          shortComment: "Ankle",
          date: "2026-11-11T19:00:00.000Z",
          athlete: {
            displayName: "Jordan Love",
            position: { abbreviation: "QB" },
          },
        },
      ],
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeFetchReturning(body: unknown, status = 200): typeof fetch {
  return async () => jsonResponse(body, status);
}

beforeEach(() => {
  clearInjuryCacheForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadInjuries", () => {
  it("returns only the requested team's records as REAL when the payload has two teams", async () => {
    const spy = vi.fn(fakeFetchReturning(twoTeamPayload));
    const result = await loadInjuries("LAR", { fetchImpl: spy, now: FIXED_NOW });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.source).toBe("espn:injuries");
    expect(result.value).toHaveLength(2);
    expect(result.value.map((r) => r.playerName)).toEqual([
      "Matthew Stafford",
      "Puka Nacua",
    ]);
    expect(result.value.map((r) => r.team)).toEqual(["LAR", "LAR"]);
    expect(result.value.map((r) => r.reportStatus)).toEqual([
      "Out",
      "Questionable",
    ]);
    expect(result.value.map((r) => r.position)).toEqual(["QB", "WR"]);
    expect(result.value.map((r) => r.primaryInjury)).toEqual([
      "Knee",
      "Hamstring",
    ]);
    // The ESPN feed carries no practice participation field — honest null.
    expect(result.value.map((r) => r.practiceStatus)).toEqual([null, null]);
    // asOf is the newest record date, not the load time.
    expect(result.asOf).toBe("2026-11-11T20:30:00.000Z");
    // The real ESPN endpoint was used — no proxy substitution.
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toBe(ESPN_NFL_INJURIES_URL);
  });

  it("matches a feed alias through the canonical team code, not string equality", async () => {
    const result = await loadInjuries("LA", {
      fetchImpl: fakeFetchReturning(twoTeamPayload),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.value).toHaveLength(2);
    expect(result.value.every((r) => r.team === "LAR")).toBe(true);
  });

  it("returns MISSING for an empty injuries array — never an empty REAL array", async () => {
    const result = await loadInjuries("LAR", {
      fetchImpl: fakeFetchReturning({ injuries: [] }),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("no entry for LAR");
    expect(result.reason).toContain("cannot distinguish");
  });

  it("returns MISSING when the team entry exists but carries zero records", async () => {
    const result = await loadInjuries("LAR", {
      fetchImpl: fakeFetchReturning({
        injuries: [{ id: "14", displayName: "Los Angeles Rams", injuries: [] }],
      }),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("no entry for LAR");
  });

  it("returns MISSING on a 503 response — a failed fetch is not 'no injuries'", async () => {
    const result = await loadInjuries("LAR", {
      fetchImpl: fakeFetchReturning({}, 503),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("cannot distinguish");
  });

  it("returns MISSING for an unknown team string instead of guessing", async () => {
    const result = await loadInjuries("Springfield Isotopes", {
      fetchImpl: fakeFetchReturning(twoTeamPayload),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("unknown team");
  });

  it("returns MISSING for a known team absent from the payload", async () => {
    const result = await loadInjuries("SF", {
      fetchImpl: fakeFetchReturning(twoTeamPayload),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("no entry for SF");
  });

  it("falls back to the injected now for asOf when no record carries a date", async () => {
    const undated = {
      injuries: [
        {
          id: "14",
          displayName: "Los Angeles Rams",
          injuries: [
            {
              id: "inj-1",
              status: "Out",
              shortComment: "Knee",
              athlete: {
                displayName: "Matthew Stafford",
                position: { abbreviation: "QB" },
              },
            },
          ],
        },
      ],
    };
    const result = await loadInjuries("LAR", {
      fetchImpl: fakeFetchReturning(undated),
      now: FIXED_NOW,
    });

    expect(result.status).toBe("REAL");
    if (!isPresent(result)) throw new Error("expected REAL evidence");
    expect(result.asOf).toBe(FIXED_NOW.toISOString());
  });

  it("returns MISSING when the fetch itself throws", async () => {
    const throwingFetch: typeof fetch = async () => {
      throw new Error("socket hang up");
    };
    const result = await loadInjuries("LAR", {
      fetchImpl: throwingFetch,
      now: FIXED_NOW,
    });

    expect(result.status).toBe("MISSING");
    if (isPresent(result)) throw new Error("expected MISSING evidence");
    expect(result.reason).toContain("cannot distinguish");
  });
});
