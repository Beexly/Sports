import { describe, it, expect, afterEach } from "vitest";
import { buildLeagueTwin } from "./league-twin";
import { registerProjectionsProvider } from "@/lib/integrations/projections";
import type { Player } from "./players";

describe("league twin", () => {
  const twin = buildLeagueTwin();

  it("builds a node per rostered player with normalized encodings", () => {
    expect(twin.nodes.length).toBeGreaterThan(8);
    for (const n of twin.nodes) {
      expect(n.brightness).toBeGreaterThanOrEqual(0);
      expect(n.brightness).toBeLessThanOrEqual(1);
      expect(n.size).toBeGreaterThan(0);
      expect(n.size).toBeLessThanOrEqual(1);
      expect(n.halo).toBeGreaterThanOrEqual(0);
      expect(n.halo).toBeLessThanOrEqual(1);
      expect(n.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("the brightest node is the highest projection", () => {
    const brightest = [...twin.nodes].sort((a, b) => b.brightness - a.brightness)[0]!;
    const topProj = [...twin.nodes].sort((a, b) => b.player.proj - a.player.proj)[0]!;
    expect(brightest.player.id).toBe(topProj.player.id);
  });

  it("current week is the bye your roster is most exposed to", () => {
    const byes = twin.nodes.map((n) => n.player.bye);
    const counts = new Map<number, number>();
    for (const b of byes) counts.set(b, (counts.get(b) ?? 0) + 1);
    const maxCount = Math.max(...counts.values());
    expect(counts.get(twin.currentWeek)).toBe(maxCount);
    // byeExposure equals nodes on that bye
    expect(twin.byeExposure).toBe(byes.filter((b) => b === twin.currentWeek).length);
  });

  it("flags injury/down-trend as a shock and up-trend as positive", () => {
    for (const n of twin.nodes) {
      if (n.player.injury === "out") expect(n.shock).toBe("critical");
      else if (n.player.injury === "questionable" || n.player.trend === "down") expect(n.shock).toBe("caution");
      else if (n.player.trend === "up") expect(n.shock).toBe("positive");
    }
  });

  it("ties connect only same-team players (your stacks)", () => {
    for (const t of twin.ties) {
      const a = twin.nodes.find((n) => n.player.id === t.a)!;
      const b = twin.nodes.find((n) => n.player.id === t.b)!;
      expect(a.player.team).toBe(b.player.team);
    }
    expect(twin.stackCount).toBe(twin.ties.length);
  });

  it("totals are coherent", () => {
    expect(twin.totalProj).toBeGreaterThan(0);
    expect(twin.riskCount).toBe(twin.nodes.filter((n) => n.shock === "caution" || n.shock === "critical").length);
  });
});

describe("league twin — LIVE pool (illustrative default ids absent)", () => {
  afterEach(() => registerProjectionsProvider(null));

  function mk(id: string, pos: Player["pos"], proj: number, extra: Partial<Player> = {}): Player {
    return {
      id, name: id, pos, team: "ATL", bye: 12, proj, floor: proj - 40, ceiling: proj + 60,
      usage: 0.5, schemeFit: 0.6, role: "role", trend: "flat", injury: "healthy", note: "", ...extra,
    };
  }

  // A live feed whose ids differ from the illustrative DEFAULT_ROSTER_IDS.
  const livePool: Player[] = [
    mk("live-qb-1", "QB", 400, { team: "KC" }), mk("live-qb-2", "QB", 350, { team: "BUF" }),
    mk("live-rb-1", "RB", 320, { team: "KC" }), mk("live-rb-2", "RB", 300, { team: "SF" }),
    mk("live-rb-3", "RB", 280, { team: "DET" }), mk("live-rb-4", "RB", 260, { team: "GB" }),
    mk("live-wr-1", "WR", 310, { team: "KC" }), mk("live-wr-2", "WR", 290, { team: "MIA" }),
    mk("live-wr-3", "WR", 270, { team: "CIN" }), mk("live-wr-4", "WR", 250, { team: "SF" }),
    mk("live-wr-5", "WR", 230, { team: "DAL" }),
    mk("live-te-1", "TE", 240, { team: "KC" }), mk("live-te-2", "TE", 200, { team: "DET" }),
  ];

  it("draws a labelled sample roster from the live pool instead of emptying the galaxy", () => {
    // DEFAULT_ROSTER_IDS don't resolve in this pool → without the fallback nodes=[] .
    const twin = buildLeagueTwin(undefined, livePool);
    expect(twin.nodes.length).toBeGreaterThan(0);
    expect(twin.totalProj).toBeGreaterThan(0);
    // every node is a REAL player from the live pool — never invented
    expect(twin.nodes.every((n) => livePool.some((p) => p.id === n.player.id))).toBe(true);
  });

  it("under a registered + keyed live feed reports illustrative=false with a non-empty galaxy", () => {
    registerProjectionsProvider({ name: "Acme", live: true, list: () => [], players: () => livePool });
    const prev = process.env.PROJECTIONS_PROVIDER;
    process.env.PROJECTIONS_PROVIDER = "acme";
    try {
      const twin = buildLeagueTwin();
      expect(twin.illustrative).toBe(false);
      expect(twin.nodes.length).toBeGreaterThan(0);
      expect(twin.nodes.every((n) => livePool.some((p) => p.id === n.player.id))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.PROJECTIONS_PROVIDER;
      else process.env.PROJECTIONS_PROVIDER = prev;
    }
  });
});
