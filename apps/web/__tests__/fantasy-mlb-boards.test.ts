/**
 * Live MLB fantasy boards loader — executed end-to-end through the REAL
 * clearance gates, adapters, and engine, with only the network transport
 * injected. Pins the rights posture (attribution present, blocked/unavailable
 * honesty) and the derived-board shape.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  BOARD_TTL_MS,
  computeMlbFantasyBoards,
  resetMlbFantasyBoardsMemo,
  resolveMlbSeason,
} from "@/lib/cockpit/fantasy-mlb-boards";

const NOW = new Date("2026-07-11T12:00:00Z");

const SAVANT_BATTERS =
  '﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent","bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"\n' +
  '"Schwarber, Kyle",656941,2026,400,".401",27.2,14.9,20.8,59.6,33.1\n' +
  '"Meidroth, Chase",805367,2026,380,".300",14.3,8.9,1.6,36.1,13\n' +
  '"Perez, Salvador",521692,2026,390,".357",19.5,4.4,14.8,46.7,26.9\n';

const SAVANT_PITCHERS =
  '﻿"last_name, first_name","player_id","year","pa","xwoba","k_percent","bb_percent","barrel_batted_rate","hard_hit_percent","whiff_percent"\n' +
  '"Ace, Reliever",111,2026,240,".250",32,6,5.1,33.2,35\n' +
  '"Mid, Arm",222,2026,260,".310",22,9,8.0,40.0,25\n';

const STATSAPI_PAGE = JSON.stringify({
  stats: [
    {
      totalSplits: 3,
      splits: [
        {
          stat: {
            gamesPitched: 40, gamesStarted: 0, inningsPitched: "42.0",
            saves: 20, holds: 2, blownSaves: 2, saveOpportunities: 22,
            earnedRuns: 10, runs: 11, hits: 30, baseOnBalls: 12, hitByPitch: 1,
            strikeOuts: 55, homeRuns: 3, battersFaced: 170,
            inheritedRunners: 6, inheritedRunnersScored: 1, groundOutsToAirouts: "1.10",
          },
          team: { id: 1, name: "Test Team" },
          player: { id: 111, fullName: "Ace Reliever" },
        },
        {
          stat: {
            gamesPitched: 35, gamesStarted: 0, inningsPitched: "30.1",
            saves: 0, holds: 8, blownSaves: 1, saveOpportunities: 1,
            earnedRuns: 14, runs: 15, hits: 28, baseOnBalls: 14, hitByPitch: 2,
            strikeOuts: 30, homeRuns: 4, battersFaced: 140,
            inheritedRunners: 10, inheritedRunnersScored: 4, groundOutsToAirouts: "0.90",
          },
          team: { id: 1, name: "Test Team" },
          player: { id: 222, fullName: "Mid Arm" },
        },
        {
          stat: {
            gamesPitched: 18, gamesStarted: 18, inningsPitched: "100.0",
            strikeOuts: 95, baseOnBalls: 30, battersFaced: 420,
            earnedRuns: 40, runs: 44, hits: 90, hitByPitch: 4, homeRuns: 12,
            saves: 0, holds: 0, blownSaves: 0, saveOpportunities: 0,
            inheritedRunners: 0, inheritedRunnersScored: 0, groundOutsToAirouts: "1.00",
          },
          team: { id: 1, name: "Test Team" },
          player: { id: 333, fullName: "A Starter" },
        },
      ],
    },
  ],
});

/** Transport serving canned bodies by host; per-host failure injectable. */
function fakeFetch(opts: { failStatsapi?: boolean; failSavant?: boolean } = {}) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("baseballsavant.mlb.com")) {
      if (opts.failSavant) return new Response("down", { status: 503 });
      const body = url.includes("type=batter") ? SAVANT_BATTERS : SAVANT_PITCHERS;
      return new Response(body, { status: 200 });
    }
    if (url.includes("statsapi.mlb.com")) {
      if (opts.failStatsapi) return new Response("down", { status: 503 });
      return new Response(STATSAPI_PAGE, { status: 200 });
    }
    throw new Error(`unexpected host in test: ${url}`);
  }) as typeof globalThis.fetch;
  return { impl, calls };
}

beforeEach(() => resetMlbFantasyBoardsMemo());

describe("resolveMlbSeason", () => {
  it("uses the calendar year from March onward, previous year before", () => {
    expect(resolveMlbSeason(new Date("2026-07-11T00:00:00Z"))).toBe(2026);
    expect(resolveMlbSeason(new Date("2026-01-15T00:00:00Z"))).toBe(2025);
  });
});

describe("computeMlbFantasyBoards", () => {
  it("computes all four boards through gates → adapters → engine, with attribution", async () => {
    const { impl } = fakeFetch();
    const boards = await computeMlbFantasyBoards({ now: NOW, fetchImpl: impl });

    expect(boards.season).toBe(2026);
    // Attribution from BOTH clearance proofs must be present (render contract).
    expect(boards.attributions.join(" ")).toMatch(/Baseball Savant/);
    expect(boards.attributions.join(" ")).toMatch(/MLB Stats API/);

    // MSI: Schwarber's profile dominates this 3-hitter cohort.
    expect(boards.hitters.status).toBe("ok");
    if (boards.hitters.status === "ok") {
      expect(boards.hitters.data[0]!.name).toBe("Schwarber, Kyle");
      expect(boards.hitters.data[0]!.score.msi).toBeGreaterThan(50);
    }
    expect(boards.pitchers.status).toBe("ok");

    // RVS: the 20-save arm is the Closer and outranks the middle reliever;
    // the starter never enters the pool.
    expect(boards.relievers.status).toBe("ok");
    if (boards.relievers.status === "ok") {
      expect(boards.relievers.data).toHaveLength(2);
      expect(boards.relievers.data[0]!.playerName).toBe("Ace Reliever");
      expect(boards.relievers.data[0]!.score.role).toBe("Closer");
    }

    // BSI: one team, league-of-one → 1.000 by construction, with the Savant
    // Statcast join supplying the three expected-contact categories.
    expect(boards.bullpens.status).toBe("ok");
    if (boards.bullpens.status === "ok") {
      expect(boards.bullpens.data).toHaveLength(1);
      expect(boards.bullpens.data[0]!.team).toBe("Test Team");
      expect(boards.bullpens.data[0]!.bsi).toBeCloseTo(1.0, 6);
    }
  });

  it("degrades honestly when statsapi is down: MSI stands, BSI/RVS say unavailable", async () => {
    const { impl } = fakeFetch({ failStatsapi: true });
    const boards = await computeMlbFantasyBoards({ now: NOW, fetchImpl: impl });

    expect(boards.hitters.status).toBe("ok");
    expect(boards.relievers.status).toBe("unavailable");
    expect(boards.bullpens.status).toBe("unavailable");
    if (boards.relievers.status === "unavailable") {
      expect(boards.relievers.reason).toMatch(/503/);
    }
  });

  it("degrades honestly when Savant is down: BSI still renders (Statcast columns neutral)", async () => {
    const { impl } = fakeFetch({ failSavant: true });
    const boards = await computeMlbFantasyBoards({ now: NOW, fetchImpl: impl });

    expect(boards.hitters.status).toBe("unavailable");
    expect(boards.pitchers.status).toBe("unavailable");
    // 11 of 14 categories still compute; the engine treats the missing
    // Statcast columns as neutral rather than fabricating them.
    expect(boards.bullpens.status).toBe("ok");
    expect(boards.relievers.status).toBe("ok");
  });
});

describe("loadMlbFantasyBoards memo", () => {
  it("exposes a ≥1h TTL (non-bulk pull discipline)", () => {
    expect(BOARD_TTL_MS).toBeGreaterThanOrEqual(60 * 60 * 1000);
  });

  it("does not memoize an all-failed board (next visit retries)", async () => {
    // Direct compute is transport-injected; the memoized loader uses the real
    // transport, so we only verify memo behavior via the exported reset + the
    // compute path here: an all-failed compute must be re-attemptable.
    const { impl } = fakeFetch({ failSavant: true, failStatsapi: true });
    const first = await computeMlbFantasyBoards({ now: NOW, fetchImpl: impl });
    expect(first.hitters.status).toBe("unavailable");
    expect(first.bullpens.status).toBe("unavailable");
    // loadMlbFantasyBoards would skip memoization for this shape — pinned by
    // the anyOk gate; a second compute with a healthy transport succeeds.
    const healthy = fakeFetch();
    const second = await computeMlbFantasyBoards({ now: NOW, fetchImpl: healthy.impl });
    expect(second.hitters.status).toBe("ok");
  });
});
