import { describe, expect, it, vi } from "vitest";

vi.mock("@sports/db", () => ({ db: {} }));

import {
  playerGameStatRegRowsProbe,
  resolveFootballStatsSeasonFromDb,
  type RegRowsClient,
} from "@/lib/nflverse/reg-rows-probe";

/**
 * C-95: the nflverse display season advances to 2026 once REG rows land. The
 * probe reads the one table the weekly-stats ingestion writes.
 */
function clientWithRegSeasons(seasons: readonly number[]) {
  const findFirst = vi.fn(async (args: { where: { season: number; seasonType: "REG" } }) =>
    seasons.includes(args.where.season) ? { id: `row-${args.where.season}` } : null,
  );
  const client: RegRowsClient = { playerGameStat: { findFirst } };
  return { client, findFirst };
}

describe("playerGameStatRegRowsProbe", () => {
  it("asks for one REG row of the season and answers by presence", async () => {
    const { client, findFirst } = clientWithRegSeasons([2026]);
    const probe = playerGameStatRegRowsProbe(client);
    expect(await probe(2026)).toBe(true);
    expect(await probe(2025)).toBe(false);
    expect(findFirst).toHaveBeenCalledWith({
      where: { season: 2026, seasonType: "REG" },
      select: { id: true },
    });
  });
});

describe("resolveFootballStatsSeasonFromDb", () => {
  const SEP_2026 = new Date("2026-09-15T12:00:00Z");

  it("advances the display season to 2026 the moment 2026 REG rows are stored", async () => {
    const { client } = clientWithRegSeasons([2026, 2025]);
    const res = await resolveFootballStatsSeasonFromDb(SEP_2026, client);
    expect(res.season).toBe(2026);
    expect(res.probed).toEqual([2026]);
  });

  it("stays on 2025 while the store holds only 2025 REG rows", async () => {
    const { client } = clientWithRegSeasons([2025]);
    const res = await resolveFootballStatsSeasonFromDb(SEP_2026, client);
    expect(res.season).toBe(2025);
    expect(res.probed).toEqual([2026, 2025]);
  });
});
