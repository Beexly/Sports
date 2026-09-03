import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEspnScoreboard } from "@/lib/data-sources/free-adapters/espn-scores";

/**
 * persistFreeScores must never overwrite a recorded final with a different one
 * (2026-09-03 automated review). A game the paid path already settled can
 * still match the revisit query through `resultFetched: false`; if ESPN then
 * reports a different score, that is a cross-path disagreement for a human,
 * not a last-write-wins clobber of the result picks were graded against.
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(async () => ({ count: 1 })),
  fetchScoresMultiSource: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { game: { findMany: mocks.findMany, updateMany: mocks.updateMany } },
}));
vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [{ key: "americanfootball_ncaaf", title: "NCAAF" }],
}));
vi.mock("@/lib/data-sources/multi-source-scores", () => ({
  fetchScoresMultiSource: mocks.fetchScoresMultiSource,
}));
vi.mock("@/lib/data-sources/free-adapters/henrygd-ncaa", () => ({
  fetchHenrygdScoreboard: vi.fn(async () => []),
  HENRYGD_PATHS: { cfb: "/cfb", mbb: "/mbb" },
}));
vi.mock("@/lib/data-sources/free-ingestion-run", () => ({
  recordFreeIngestionRun: vi.fn(async () => ({ id: "run-1" })),
}));
vi.mock("@/lib/scraping/clearance-engine", () => ({
  // ESPN storage is cleared for the test; henrygd stays denied (GSE-SEC-050).
  checkClearance: (req: { source_id: string }) => ({ allowed: req.source_id === "espn-public-api" }),
}));

import { persistFreeScores } from "@/lib/data-sources/free-score-persist";

const FIX = resolve(__dirname, "fixtures");
const espnGames = parseEspnScoreboard(
  JSON.parse(readFileSync(resolve(FIX, "espn-ncaaf-scoreboard.json"), "utf8")),
  "ncaaf",
);
// The fixture's Army–Navy final: Navy (home) 17, Army (away) 16, 2025-12-13T20:00Z.
const ARMY_NAVY = {
  id: "game-army-navy",
  homeTeamName: "Navy Midshipmen",
  awayTeamName: "Army Black Knights",
  commenceTime: new Date("2025-12-13T20:00:00.000Z"),
};

describe("persistFreeScores — recorded-final guard", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.updateMany.mockClear();
    mocks.fetchScoresMultiSource.mockResolvedValue({ games: espnGames, errors: [], attempted: [] });
  });

  it("refuses to overwrite a FINAL game whose recorded score differs from the free final", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.findMany.mockResolvedValue([{ ...ARMY_NAVY, homeScore: 24, awayScore: 21, status: "FINAL" }]);

    const result = await persistFreeScores({ sportKey: "americanfootball_ncaaf" });

    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(result.gamesUpdated).toBe(0);
    expect(result.sports[0]).toMatchObject({ ok: true, gamesMatched: 1, gamesUpdated: 0 });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SCORE_MISMATCH_CROSS_PATH game=game-army-navy"));
    warn.mockRestore();
  });

  it("re-stamps a FINAL game that already carries the same score (idempotent, sets resultFetched)", async () => {
    mocks.findMany.mockResolvedValue([{ ...ARMY_NAVY, homeScore: 17, awayScore: 16, status: "FINAL" }]);

    await persistFreeScores({ sportKey: "americanfootball_ncaaf" });

    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    const args = mocks.updateMany.mock.calls[0]?.[0] as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(args.data).toMatchObject({ homeScore: 17, awayScore: 16, status: "FINAL", resultFetched: true });
    // The where clause repeats the guard for the concurrent case: a row that
    // became FINAL with a different pair between read and write is untouched.
    expect(args.where).toMatchObject({
      id: "game-army-navy",
      OR: [
        { status: { not: "FINAL" } },
        { homeScore: null },
        { awayScore: null },
        { homeScore: 17, awayScore: 16 },
      ],
    });
  });

  it("stamps an unscored SCHEDULED game with the free final", async () => {
    mocks.findMany.mockResolvedValue([{ ...ARMY_NAVY, homeScore: null, awayScore: null, status: "SCHEDULED" }]);

    const result = await persistFreeScores({ sportKey: "americanfootball_ncaaf" });

    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
    expect(result.gamesUpdated).toBe(1);
  });
});
