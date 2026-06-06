import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadNflverseEdgeSignals,
  resetEdgeSignalsCacheForTests,
} from "@/lib/nflverse/edge-signals";

interface Seed {
  id: string;
  name: string;
  pprPerGame: number;
  targetShare: number;
  separation: number;
  yac: number;
  airSharePct: number;
  ngsTargets: number;
}

const SEEDS: readonly Seed[] = [
  // High underlying signal, low production -> buy-low.
  { id: "00-wr1", name: "Buy Low Larry", pprPerGame: 8, targetShare: 0.3, separation: 4.0, yac: 1.5, airSharePct: 35, ngsTargets: 110 },
  // Low underlying signal, high production -> sell-high (regression risk).
  { id: "00-wr2", name: "Sell High Sam", pprPerGame: 22, targetShare: 0.28, separation: 2.0, yac: -0.5, airSharePct: 15, ngsTargets: 100 },
  { id: "00-wr3", name: "Middle Mike", pprPerGame: 15, targetShare: 0.22, separation: 3.0, yac: 0.5, airSharePct: 25, ngsTargets: 90 },
  { id: "00-wr4", name: "Average Andy", pprPerGame: 15, targetShare: 0.22, separation: 3.0, yac: 0.5, airSharePct: 25, ngsTargets: 90 },
];

const STATS_HEADER =
  "player_id,player_name,player_display_name,position,recent_team,season,week,season_type,target_share,fantasy_points_ppr";

function buildStats(): string {
  const rows: string[] = [STATS_HEADER];
  for (const seed of SEEDS) {
    for (let week = 1; week <= 4; week++) {
      rows.push(
        [seed.id, "", seed.name, "WR", "PIT", "2024", String(week), "REG", String(seed.targetShare), String(seed.pprPerGame)].join(","),
      );
    }
  }
  return rows.join("\n");
}

const NGS_HEADER =
  "season,season_type,week,player_display_name,player_position,team_abbr,avg_separation,percent_share_of_intended_air_yards,receptions,targets,avg_yac_above_expectation,player_gsis_id";

function buildNgs(): string {
  const rows: string[] = [NGS_HEADER];
  for (const seed of SEEDS) {
    rows.push(
      ["2024", "REG", "0", seed.name, "WR", "PIT", String(seed.separation), String(seed.airSharePct), "60", String(seed.ngsTargets), String(seed.yac), seed.id].join(","),
    );
  }
  return rows.join("\n");
}

function gz(csv: string): Response {
  const body = gzipSync(Buffer.from(csv));
  return new Response(body, { status: 200, headers: { "content-length": String(body.length) } });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  const stats = buildStats();
  const ngs = buildNgs();
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("player_stats.csv.gz")) return gz(stats);
    if (url.includes("ngs_receiving.csv.gz")) return gz(ngs);
    return new Response("missing", { status: 404 });
  });
}

describe("nflverse edge signals (buy-low / sell-high fusion)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetEdgeSignalsCacheForTests();
  });

  it("flags high-underlying/low-output as buy-low and the inverse as sell-high", async () => {
    const edge = await loadNflverseEdgeSignals({ season: 2024, fetcher: mockFetch(), cacheTtlMs: 0 });

    expect(edge.status).toBe("live");
    expect(edge.season).toBe(2024);
    expect(edge.qualifiedPlayers).toBe(4);
    expect(edge.canPublishPicks).toBe(false);

    expect(edge.buyLow[0]?.playerName).toBe("Buy Low Larry");
    expect(edge.buyLow[0]?.label).toBe("buy-low");
    expect(edge.buyLow[0]?.gap).toBeGreaterThan(0.75);

    expect(edge.sellHigh[0]?.playerName).toBe("Sell High Sam");
    expect(edge.sellHigh[0]?.label).toBe("sell-high");
    expect(edge.sellHigh[0]?.gap).toBeLessThan(-0.75);
  });

  it("returns an empty boundary state when sources fail", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));
    const edge = await loadNflverseEdgeSignals({ season: 2024, fetcher, cacheTtlMs: 0 });
    expect(edge.status).toBe("source-error");
    expect(edge.buyLow).toHaveLength(0);
    expect(edge.sellHigh).toHaveLength(0);
    expect(edge.canPublishPicks).toBe(false);
  });

  it("serves the edge-signals API without publishing picks", async () => {
    vi.stubGlobal("fetch", mockFetch());
    vi.resetModules();
    const mod = await import("@/app/api/nflverse/edge-signals/route");
    const response = (await mod.GET()) as Response;
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body["success"]).toBe(true);
    expect((body["data"] as Record<string, unknown>)["canPublishPicks"]).toBe(false);
  });
});
