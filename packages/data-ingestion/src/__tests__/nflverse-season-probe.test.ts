import { describe, expect, it, vi } from "vitest";
import {
  resolveFootballStatsSeason,
  resolveFootballStatsSeasonAsync,
} from "../nflverse-season.js";

/**
 * C-95: the display season advances to 2026 once REG rows land. The sync
 * resolver already knew how to do that when handed a probe; nothing in
 * production handed it one. These pin the async resolver that does.
 */
const SEP_2026 = new Date(Date.UTC(2026, 8, 15));

function probeFor(seasonsWithRows: readonly number[]) {
  return vi.fn(async (season: number) => seasonsWithRows.includes(season));
}

describe("resolveFootballStatsSeasonAsync", () => {
  it("September 2026 with 2026 REG rows resolves 2026, and the sync default alone never does", async () => {
    // The gap this closes: with no probe the sync resolver returns the floor.
    expect(resolveFootballStatsSeason(SEP_2026).season).toBe(2025);

    const probe = probeFor([2026, 2025]);
    const res = await resolveFootballStatsSeasonAsync(SEP_2026, probe);
    expect(res.season).toBe(2026);
    expect(res.reason).toMatch(/Labelled current season 2026 has REG source rows/);
    // Short-circuits at the first season with rows: the floor is never probed.
    expect(probe).toHaveBeenCalledTimes(1);
    expect(res.probed).toEqual([2026]);
    expect(res.probeErrors).toEqual([]);
  });

  it("September 2026 with only 2025 REG rows stays on the completed floor", async () => {
    const probe = probeFor([2025]);
    const res = await resolveFootballStatsSeasonAsync(SEP_2026, probe);
    expect(res.season).toBe(2025);
    expect(res.reason).toMatch(/Labelled current 2026 has no REG rows yet; using completed season 2025/);
    expect(res.probed).toEqual([2026, 2025]);
  });

  it("walks back at most three seasons past the floor before reporting the floor with an empty state", async () => {
    const res = await resolveFootballStatsSeasonAsync(SEP_2026, probeFor([]));
    expect(res.season).toBe(2025);
    expect(res.reason).toMatch(/No REG rows found in probe window/);
    expect(res.probed).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it("before September the labelled season is the floor, so it is probed once", async () => {
    const aug = new Date(Date.UTC(2026, 7, 6));
    const probe = probeFor([2025]);
    const res = await resolveFootballStatsSeasonAsync(aug, probe);
    expect(res.season).toBe(2025);
    expect(res.probed).toEqual([2025]);
  });

  it("a probe that throws counts as 'no rows' for that season, is reported, and never advances the season", async () => {
    const probe = vi.fn(async (season: number) => {
      if (season === 2026) throw new Error("connection reset");
      return season === 2025;
    });
    const res = await resolveFootballStatsSeasonAsync(SEP_2026, probe);
    expect(res.season).toBe(2025);
    expect(res.probeErrors).toEqual(["2026: connection reset"]);
  });

  it("agrees with the sync resolver for every probe answer set (same precedence, same wording)", async () => {
    for (const rows of [[2026], [2025], [2026, 2025], [2024], [2023], []]) {
      const sync = resolveFootballStatsSeason(SEP_2026, (s) => rows.includes(s));
      const asyncRes = await resolveFootballStatsSeasonAsync(SEP_2026, probeFor(rows));
      expect(asyncRes.season).toBe(sync.season);
      expect(asyncRes.reason).toBe(sync.reason);
    }
  });
});
