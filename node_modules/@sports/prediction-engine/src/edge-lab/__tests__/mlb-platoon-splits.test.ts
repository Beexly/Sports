import { describe, expect, it } from "vitest";
import { loadMlbPlatoonSplitsPriorSeason, mlbPlatoonSplitsUrl } from "../loaders/mlb-platoon-splits.js";
import { mlbSeasonEndIso } from "../loaders/mlb-season-boundaries.js";

/**
 * Fixture JSON payloads are trimmed-down real MLB Stats API statSplits
 * responses, verified live 2026-07-16 against:
 *   https://statsapi.mlb.com/api/v1/people/665742/stats?stats=statSplits&sitCodes=vl,vr&season=2023&group=hitting  (Juan Soto)
 *   https://statsapi.mlb.com/api/v1/people/605483/stats?stats=statSplits&sitCodes=vl,vr&season=2023&group=pitching (Blake Snell)
 *   https://statsapi.mlb.com/api/v1/people/458681/stats?stats=statSplits&sitCodes=vl,vr&season=2023&group=pitching (Lance Lynn, traded White Sox -> Dodgers)
 *
 * Real, verified quirks reproduced here:
 *  - `stat.ops` is a QUOTED JSON STRING (e.g. "\".813\"" in the raw JSON,
 *    i.e. the JS value ".813"), while `stat.plateAppearances`/`battersFaced`
 *    are real JSON numbers.
 *  - The pitching stat block has NO `plateAppearances` key at all — only
 *    `battersFaced`.
 *  - A mid-season-traded player's statSplits response carries one entry per
 *    (team, split-code) stint PLUS one team-LESS entry per split code that
 *    is the season-combined total (battersFaced sums the per-team entries
 *    exactly: 144 + 257 = 401 for `vl`, 129 + 278 = 407 for `vr`).
 */
function sotoHittingPayload() {
  return {
    stats: [
      {
        type: { displayName: "statSplits" },
        group: { displayName: "hitting" },
        splits: [
          {
            season: "2023",
            stat: { ops: ".813", plateAppearances: 207 },
            team: { id: 135, name: "San Diego Padres" },
            player: { id: 665742, fullName: "Juan Soto" },
            split: { code: "vl", description: "vs Left" },
          },
          {
            season: "2023",
            stat: { ops: ".980", plateAppearances: 501 },
            team: { id: 135, name: "San Diego Padres" },
            player: { id: 665742, fullName: "Juan Soto" },
            split: { code: "vr", description: "vs Right" },
          },
        ],
      },
    ],
  };
}

function snellPitchingPayload() {
  return {
    stats: [
      {
        type: { displayName: "statSplits" },
        group: { displayName: "pitching" },
        splits: [
          {
            season: "2023",
            stat: { ops: ".650", battersFaced: 125 },
            team: { id: 135, name: "San Diego Padres" },
            player: { id: 605483, fullName: "Blake Snell" },
            split: { code: "vl", description: "vs Left" },
          },
          {
            season: "2023",
            stat: { ops: ".565", battersFaced: 617 },
            team: { id: 135, name: "San Diego Padres" },
            player: { id: 605483, fullName: "Blake Snell" },
            split: { code: "vr", description: "vs Right" },
          },
        ],
      },
    ],
  };
}

/** Lance Lynn, 2023, group=pitching — six real entries: vl/vr per team
 * (White Sox, Dodgers) plus vl/vr team-less season-combined aggregates. */
function lynnTradedPitchingPayload() {
  return {
    stats: [
      {
        type: { displayName: "statSplits" },
        group: { displayName: "pitching" },
        splits: [
          {
            season: "2023",
            stat: { ops: ".678", battersFaced: 144 },
            team: { id: 119, name: "Los Angeles Dodgers" },
            split: { code: "vl", description: "vs Left" },
          },
          {
            season: "2023",
            stat: { ops: "1.037", battersFaced: 257 },
            team: { id: 145, name: "Chicago White Sox" },
            split: { code: "vl", description: "vs Left" },
          },
          {
            // Season-combined aggregate: no `team` field at all.
            season: "2023",
            stat: { ops: ".909", battersFaced: 401 },
            split: { code: "vl", description: "vs Left" },
          },
          {
            season: "2023",
            stat: { ops: ".859", battersFaced: 129 },
            team: { id: 119, name: "Los Angeles Dodgers" },
            split: { code: "vr", description: "vs Right" },
          },
          {
            season: "2023",
            stat: { ops: ".652", battersFaced: 278 },
            team: { id: 145, name: "Chicago White Sox" },
            split: { code: "vr", description: "vs Right" },
          },
          {
            season: "2023",
            stat: { ops: ".719", battersFaced: 407 },
            split: { code: "vr", description: "vs Right" },
          },
        ],
      },
    ],
  };
}

function emptySplitsPayload() {
  return { stats: [{ type: { displayName: "statSplits" }, group: { displayName: "hitting" }, splits: [] }] };
}

describe("mlbPlatoonSplitsUrl", () => {
  it("builds the statSplits URL with sitCodes vl,vr and the given group", () => {
    expect(mlbPlatoonSplitsUrl(665742, 2023, "hitting")).toBe(
      "https://statsapi.mlb.com/api/v1/people/665742/stats?stats=statSplits&sitCodes=vl,vr&season=2023&group=hitting",
    );
    expect(mlbPlatoonSplitsUrl(605483, 2023, "pitching")).toBe(
      "https://statsapi.mlb.com/api/v1/people/605483/stats?stats=statSplits&sitCodes=vl,vr&season=2023&group=pitching",
    );
  });
});

describe("loadMlbPlatoonSplitsPriorSeason", () => {
  it("fetches targetSeason - 1 for both hitting and pitching by default", async () => {
    const requested: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      requested.push(String(url));
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;

    await loadMlbPlatoonSplitsPriorSeason({ targetSeasons: [2024], personIds: [665742], fetcher });

    expect(requested).toEqual([
      mlbPlatoonSplitsUrl(665742, 2023, "hitting"),
      mlbPlatoonSplitsUrl(665742, 2023, "pitching"),
    ]);
    expect(requested.some((u) => u.includes("season=2024"))).toBe(false);
  });

  it("maps a single-team hitter's OPS (string) and plateAppearances (number) correctly", async () => {
    const fetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === mlbPlatoonSplitsUrl(665742, 2023, "hitting")) {
        return { ok: true, status: 200, json: async () => sotoHittingPayload() } as Response;
      }
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;

    const rows = await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2024],
      personIds: [665742],
      groups: ["hitting"],
      fetcher,
    });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.personId).toBe(665742);
    expect(row?.targetSeason).toBe(2024);
    expect(row?.sourceSeason).toBe(2023);
    expect(row?.group).toBe("hitting");
    expect(row?.opsVsL).toBeCloseTo(0.813, 6);
    expect(row?.opsVsR).toBeCloseTo(0.98, 6);
    expect(row?.paVsL).toBe(207);
    expect(row?.paVsR).toBe(501);
  });

  it("maps a pitcher's split via `battersFaced` (not `plateAppearances`)", async () => {
    const fetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === mlbPlatoonSplitsUrl(605483, 2023, "pitching")) {
        return { ok: true, status: 200, json: async () => snellPitchingPayload() } as Response;
      }
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;

    const rows = await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2024],
      personIds: [605483],
      groups: ["pitching"],
      fetcher,
    });
    const row = rows.find((r) => r.group === "pitching");
    expect(row?.opsVsL).toBeCloseTo(0.65, 6);
    expect(row?.paVsL).toBe(125);
    expect(row?.opsVsR).toBeCloseTo(0.565, 6);
    expect(row?.paVsR).toBe(617);
  });

  it("prefers the team-less season-combined aggregate over per-team stint entries for a traded player", async () => {
    const fetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === mlbPlatoonSplitsUrl(458681, 2023, "pitching")) {
        return { ok: true, status: 200, json: async () => lynnTradedPitchingPayload() } as Response;
      }
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;

    const rows = await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2024],
      personIds: [458681],
      groups: ["pitching"],
      fetcher,
    });
    const row = rows.find((r) => r.group === "pitching");
    // The combined aggregate (battersFaced 401 / 407), NOT either team stint.
    expect(row?.paVsL).toBe(401);
    expect(row?.opsVsL).toBeCloseTo(0.909, 6);
    expect(row?.paVsR).toBe(407);
    expect(row?.opsVsR).toBeCloseTo(0.719, 6);
  });

  it("still emits a record (all-null) for a player with no splits data that season, for honest skip counting downstream", async () => {
    const fetcher = (async () =>
      ({ ok: true, status: 200, json: async () => emptySplitsPayload() }) as Response) as typeof fetch;

    const rows = await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2024],
      personIds: [999999],
      groups: ["hitting"],
      fetcher,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.opsVsL).toBeNull();
    expect(rows[0]?.opsVsR).toBeNull();
    expect(rows[0]?.paVsL).toBeNull();
    expect(rows[0]?.paVsR).toBeNull();
  });

  it("stamps observedAt at the prior season's conservative close", async () => {
    const fetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === mlbPlatoonSplitsUrl(665742, 2023, "hitting")) {
        return { ok: true, status: 200, json: async () => sotoHittingPayload() } as Response;
      }
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;
    const rows = await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2024],
      personIds: [665742],
      groups: ["hitting"],
      fetcher,
    });
    expect(rows[0]?.observedAt).toBe(mlbSeasonEndIso(2023));
    expect(Date.parse(rows[0]!.observedAt)).toBeLessThan(Date.parse("2024-03-01T00:00:00.000Z"));
  });

  it("issues one request per (personId, targetSeason, group)", async () => {
    const requested: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      requested.push(String(url));
      return { ok: true, status: 200, json: async () => emptySplitsPayload() } as Response;
    }) as typeof fetch;

    await loadMlbPlatoonSplitsPriorSeason({
      targetSeasons: [2023, 2024],
      personIds: [1, 2],
      groups: ["hitting", "pitching"],
      fetcher,
    });
    // 2 seasons * 2 personIds * 2 groups = 8 requests.
    expect(requested).toHaveLength(8);
  });

  it("throws on a non-ok fetch response", async () => {
    const failingFetcher = (async () =>
      ({ ok: false, status: 500, json: async () => ({}) }) as Response) as typeof fetch;
    await expect(
      loadMlbPlatoonSplitsPriorSeason({ targetSeasons: [2024], personIds: [665742], fetcher: failingFetcher }),
    ).rejects.toThrow(/500/);
  });
});
