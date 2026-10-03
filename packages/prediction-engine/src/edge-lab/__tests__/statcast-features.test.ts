import { describe, expect, it } from "vitest";
import {
  baseballSavantLeaderboardUrl,
  loadStatcastPriorSeasonFeatures,
} from "../loaders/statcast-features.js";
import { mlbSeasonEndIso } from "../loaders/mlb-season-boundaries.js";

/**
 * Fixture CSV rows mirror the real Baseball Savant custom-leaderboard CSV
 * export shape, verified live 2026-07-16 against:
 *   https://baseballsavant.mlb.com/leaderboard/custom?year=2023&type=batter&filter=&min=1&selections=barrel_batted_rate,xwoba,hard_hit_percent,k_percent,bb_percent&csv=true
 *   https://baseballsavant.mlb.com/leaderboard/custom?year=2023&type=pitcher&filter=&min=1&selections=barrel_batted_rate,xwoba,hard_hit_percent,k_percent,bb_percent&csv=true
 *
 * - "Nootbaar, Lars" (player_id 663457) is a real, fully-populated 2023
 *   batter row.
 * - "McCoy, Mason" (player_id 669200) is a real 2023 batter row with BLANK
 *   barrel_batted_rate and hard_hit_percent cells (too few batted-ball
 *   events to compute those two rates) while xwoba/k_percent/bb_percent are
 *   still populated — the real missing-field-tolerance case.
 * - "Alcantara, Sandy" (player_id 645261) is a real, fully-populated 2023
 *   pitcher row (xwoba here reads as xwOBA ALLOWED).
 *
 * The leading UTF-8 BOM on the header's first cell and the header's own
 * embedded comma (`"last_name, first_name"`) are reproduced verbatim — both
 * are real quirks of the live export that a naive parser would mishandle.
 */
const BOM = "﻿";

function battersCsv(): string {
  return [
    `${BOM}"last_name, first_name","player_id","year","barrel_batted_rate","xwoba","hard_hit_percent","k_percent","bb_percent"`,
    `"Nootbaar, Lars",663457,2023,8.8,".357",37.8,19.7,14.3`,
    `"McCoy, Mason",669200,2023,,".000",,100,0`,
  ].join("\n");
}

function pitchersCsv(): string {
  return [
    `${BOM}"last_name, first_name","player_id","year","barrel_batted_rate","xwoba","hard_hit_percent","k_percent","bb_percent"`,
    `"Alcantara, Sandy",645261,2023,7,".319",40.6,19.8,6.3`,
  ].join("\n");
}

function fixtureFetcher(): typeof fetch {
  return (async (url: string | URL | Request) => {
    const urlStr = String(url);
    if (urlStr === baseballSavantLeaderboardUrl(2023, "batter")) {
      return { ok: true, status: 200, text: async () => battersCsv() } as Response;
    }
    if (urlStr === baseballSavantLeaderboardUrl(2023, "pitcher")) {
      return { ok: true, status: 200, text: async () => pitchersCsv() } as Response;
    }
    throw new Error(`unexpected fetch url in test: ${urlStr}`);
  }) as typeof fetch;
}

describe("baseballSavantLeaderboardUrl", () => {
  it("builds the custom leaderboard CSV export URL with the expected params", () => {
    const url = baseballSavantLeaderboardUrl(2023, "batter", 1);
    expect(url).toContain("https://baseballsavant.mlb.com/leaderboard/custom?");
    expect(url).toContain("year=2023");
    expect(url).toContain("type=batter");
    expect(url).toContain("min=1");
    expect(url).toContain("csv=true");
    expect(url).toContain("selections=barrel_batted_rate%2Cxwoba%2Chard_hit_percent%2Ck_percent%2Cbb_percent");
  });

  it("defaults min to 1 (broad coverage, not Savant's qualified default)", () => {
    expect(baseballSavantLeaderboardUrl(2023, "pitcher")).toContain("min=1");
  });
});

describe("loadStatcastPriorSeasonFeatures", () => {
  it("fetches targetSeason - 1 (never the target season itself) for both batter and pitcher", async () => {
    const requested: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      requested.push(String(url));
      return { ok: true, status: 200, text: async () => battersCsv() } as Response;
    }) as typeof fetch;

    await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher });

    expect(requested).toEqual([
      baseballSavantLeaderboardUrl(2023, "batter"),
      baseballSavantLeaderboardUrl(2023, "pitcher"),
    ]);
    // Never requests the target season's own leaderboard.
    expect(requested.some((u) => u.includes("year=2024"))).toBe(false);
  });

  it("maps a fully-populated batter row with correct scale and prior-season framing", async () => {
    const rows = await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher: fixtureFetcher() });
    const row = rows.find((r) => r.mlbamId === 663457);
    expect(row).toBeDefined();
    expect(row?.playerType).toBe("batter");
    expect(row?.targetSeason).toBe(2024);
    expect(row?.sourceSeason).toBe(2023);
    expect(row?.barrelRate).toBeCloseTo(8.8, 6);
    expect(row?.xwoba).toBeCloseTo(0.357, 6);
    expect(row?.hardHitPercent).toBeCloseTo(37.8, 6);
    expect(row?.kPercent).toBeCloseTo(19.7, 6);
    expect(row?.bbPercent).toBeCloseTo(14.3, 6);
  });

  it("maps a fully-populated pitcher row (xwoba = xwOBA allowed)", async () => {
    const rows = await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher: fixtureFetcher() });
    const row = rows.find((r) => r.mlbamId === 645261);
    expect(row).toBeDefined();
    expect(row?.playerType).toBe("pitcher");
    expect(row?.barrelRate).toBeCloseTo(7, 6);
    expect(row?.xwoba).toBeCloseTo(0.319, 6);
  });

  it("tolerates blank cells as null on a per-field basis, not a per-row basis", async () => {
    const rows = await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher: fixtureFetcher() });
    const row = rows.find((r) => r.mlbamId === 669200);
    expect(row).toBeDefined();
    // Blank cells -> null, never 0 or NaN.
    expect(row?.barrelRate).toBeNull();
    expect(row?.hardHitPercent).toBeNull();
    // Populated cells on the SAME row still come through.
    expect(row?.xwoba).toBeCloseTo(0, 6);
    expect(row?.kPercent).toBeCloseTo(100, 6);
    expect(row?.bbPercent).toBeCloseTo(0, 6);
  });

  it("stamps observedAt at the prior season's conservative close, not the target season", async () => {
    const rows = await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher: fixtureFetcher() });
    const row = rows.find((r) => r.mlbamId === 663457);
    expect(row?.observedAt).toBe(mlbSeasonEndIso(2023));
    expect(row?.observedAt).toBe("2023-11-15T00:00:00.000Z");
    // Well before any plausible 2024 Opening Day.
    expect(Date.parse(row!.observedAt)).toBeLessThan(Date.parse("2024-03-01T00:00:00.000Z"));
  });

  it("handles multiple target seasons, each pinned to its own prior season", async () => {
    const requested: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      requested.push(String(url));
      return { ok: true, status: 200, text: async () => battersCsv() } as Response;
    }) as typeof fetch;

    await loadStatcastPriorSeasonFeatures({ targetSeasons: [2023, 2024], fetcher });
    expect(requested).toEqual([
      baseballSavantLeaderboardUrl(2022, "batter"),
      baseballSavantLeaderboardUrl(2022, "pitcher"),
      baseballSavantLeaderboardUrl(2023, "batter"),
      baseballSavantLeaderboardUrl(2023, "pitcher"),
    ]);
  });

  it("throws on a non-ok fetch response", async () => {
    const failingFetcher = (async () =>
      ({ ok: false, status: 503, text: async () => "" }) as Response) as typeof fetch;
    await expect(
      loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher: failingFetcher }),
    ).rejects.toThrow(/503/);
  });

  it("skips rows with a missing/non-numeric player_id rather than throwing", async () => {
    const batterCsvWithBadRow = [
      `${BOM}"last_name, first_name","player_id","year","barrel_batted_rate","xwoba","hard_hit_percent","k_percent","bb_percent"`,
      `"Nootbaar, Lars",663457,2023,8.8,".357",37.8,19.7,14.3`,
      `"Bad Row",,2023,1,".1",1,1,1`,
    ].join("\n");
    const fetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      const text = urlStr === baseballSavantLeaderboardUrl(2023, "batter") ? batterCsvWithBadRow : pitchersCsv();
      return { ok: true, status: 200, text: async () => text } as Response;
    }) as typeof fetch;
    const rows = await loadStatcastPriorSeasonFeatures({ targetSeasons: [2024], fetcher });
    // 1 valid batter row (the bad row with no player_id is dropped) + 1 pitcher row.
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.playerType === "batter")?.mlbamId).toBe(663457);
    expect(rows.find((r) => r.playerType === "pitcher")?.mlbamId).toBe(645261);
  });
});
