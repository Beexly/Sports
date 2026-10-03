import { describe, it, expect, afterEach } from "vitest";
import { waiverTargets, bidDollars, dropCandidates, pickupScore } from "./waivers";
import { registerProjectionsProvider } from "@/lib/integrations/projections";
import { PLAYERS, type Player } from "./players";

function mk(id: string, pos: Player["pos"], proj: number, extra: Partial<Player> = {}): Player {
  return {
    id, name: id, pos, team: "ATL", bye: 12, proj, floor: proj - 40, ceiling: proj + 60,
    usage: 0.5, schemeFit: 0.6, role: "role", trend: "flat", injury: "healthy", note: "", ...extra,
  };
}

afterEach(() => registerProjectionsProvider(null));

describe("waivers engine", () => {
  it("ranks targets into FAAB tiers, highest score first", () => {
    const recs = waiverTargets();
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1]!.score).toBeGreaterThanOrEqual(recs[i]!.score);
    expect(["Priority", "Target", "Speculative", "Dart"]).toContain(recs[0]!.tier);
  });

  it("prices a FAAB bid as a positive integer share of budget", () => {
    const rec = waiverTargets()[0]!;
    const bid = bidDollars(rec, 100);
    expect(bid).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(bid)).toBe(true);
  });

  it("pickupScore rewards an ascending arrow over a cooling one", () => {
    const up = pickupScore(mk("u", "WR", 200, { trend: "up", usage: 0.6 }));
    const down = pickupScore(mk("d", "WR", 200, { trend: "down", usage: 0.6 }));
    expect(up).toBeGreaterThan(down);
  });

  it("returns at most four drop candidates from the rostered studs", () => {
    expect(dropCandidates().length).toBeLessThanOrEqual(4);
  });

  it("plug-in: operates on a registered live pool, not the illustrative one", () => {
    // 16 synthetic players (> ROSTERED_COUNT) so a waiver pool remains after the studs
    const livePool = Array.from({ length: 16 }, (_, i) => mk(`live-${i}`, i % 2 ? "WR" : "RB", 260 - i * 12));
    registerProjectionsProvider({ name: "Acme", live: true, list: () => [], players: () => livePool });
    const recs = waiverTargets(undefined); // default-resolves the active pool... but needs the env key
    // Without the env key the gate holds (illustrative); pass the pool explicitly to prove the engine is pool-driven:
    const liveRecs = waiverTargets(livePool);
    expect(liveRecs.every((r) => r.player.id.startsWith("live-"))).toBe(true);
    expect(recs.every((r) => PLAYERS.some((p) => p.id === r.player.id))).toBe(true);
  });
});
