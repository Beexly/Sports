import { describe, it, expect } from "vitest";
import { buildLeagueTwin } from "./league-twin";

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
