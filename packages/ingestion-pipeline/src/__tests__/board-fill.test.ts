import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * runBoardFillPipeline is the refreshOdds caller behind the board-fill cron
 * (4x/h), free-spine-health and the traffic heartbeat. C-109 review finding:
 * it passed no governor, so those paid refreshes ran outside the ledger
 * budget. refreshOdds now builds the default governor itself whenever the
 * caller does not inject one; this suite pins that board-fill never opts out
 * (`governor: null` is test-only) and that a governor-held sport surfaces in
 * the board-fill envelope instead of vanishing.
 */

const mocks = vi.hoisted(() => ({
  refreshOdds: vi.fn<(opts?: Record<string, unknown>) => Promise<unknown>>(),
  seedGamesFromEspn: vi.fn<(opts?: unknown) => Promise<unknown>>(),
  generateSignalSlate: vi.fn<(opts?: unknown) => Promise<unknown>>(),
}));

vi.mock("../refresh-odds.js", () => ({ refreshOdds: mocks.refreshOdds }));
vi.mock("../seed-games-from-espn.js", () => ({ seedGamesFromEspn: mocks.seedGamesFromEspn }));
vi.mock("../generate-signal-slate.js", () => ({ generateSignalSlate: mocks.generateSignalSlate }));
vi.mock("@sports/data-ingestion", () => ({
  oddsApiKeyPresence: () => ({ present: true, matchedEnv: "THE_ODDS_API_KEY" }),
  rundownApiKeyPresence: () => ({ present: false, matchedEnv: null }),
}));

import { runBoardFillPipeline } from "../board-fill.js";

function oddsEnvelope(results: Array<{ sport: string; ok: boolean; oddsInserted?: number; note?: string }>) {
  const okCount = results.filter((r) => r.ok).length;
  return {
    ok: okCount === results.length,
    elapsedMs: 5,
    okCount,
    totalCount: results.length,
    results,
    freeze: [],
  };
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  mocks.seedGamesFromEspn.mockResolvedValue({ upserted: 0, errors: [] });
  mocks.generateSignalSlate.mockResolvedValue({ picksUpserted: 0, gamesConsidered: 0 });
  mocks.refreshOdds.mockResolvedValue(oddsEnvelope([{ sport: "americanfootball_nfl", ok: true, oddsInserted: 12 }]));
});

describe("runBoardFillPipeline (C-109 governed odds refresh)", () => {
  it("calls refreshOdds with NO governor option, so the default ledger-backed governor paces the paid path", async () => {
    await runBoardFillPipeline({ logPrefix: "[t]" });

    expect(mocks.refreshOdds).toHaveBeenCalledTimes(1);
    const opts = mocks.refreshOdds.mock.calls[0]![0];
    expect(opts).toEqual({});
    // Never the test-only off switch.
    expect(Object.prototype.hasOwnProperty.call(opts, "governor")).toBe(false);
  });

  it("passes an explicit sport through and still leaves pacing to the default governor", async () => {
    await runBoardFillPipeline({ sport: "baseball_mlb", logPrefix: "[t]" });

    expect(mocks.refreshOdds).toHaveBeenCalledWith({ sport: "baseball_mlb" });
    expect(Object.prototype.hasOwnProperty.call(mocks.refreshOdds.mock.calls[0]![0], "governor")).toBe(false);
  });

  it("surfaces a governor-held sport in the envelope instead of dropping it", async () => {
    mocks.refreshOdds.mockResolvedValue(
      oddsEnvelope([
        { sport: "americanfootball_nfl", ok: true, oddsInserted: 12 },
        {
          sport: "basketball_nba",
          ok: true,
          oddsInserted: 0,
          note: "credit_governor_skip: no event within 48h on the free scoreboard",
        },
      ]),
    );

    const result = await runBoardFillPipeline({ logPrefix: "[t]" });

    expect(result.ok).toBe(true);
    expect(result.odds.results.map((r) => r.note ?? null)).toEqual([
      null,
      "credit_governor_skip: no event within 48h on the free scoreboard",
    ]);
    expect(result.note).toContain("odds ok=true sports=2/2");
  });

  it("seeds from ESPN before the odds refresh and asks the signal slate not to re-seed", async () => {
    await runBoardFillPipeline({ logPrefix: "[t]" });

    expect(mocks.seedGamesFromEspn.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.refreshOdds.mock.invocationCallOrder[0]!,
    );
    expect(mocks.generateSignalSlate).toHaveBeenCalledWith(
      expect.objectContaining({ skipSeed: true, logPrefix: "[t]:signal" }),
    );
  });
});
