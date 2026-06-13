import { describe, it, expect } from "vitest";
import { SCHEME_SCENARIOS, applyScheme } from "./scheme";
import { PLAYERS } from "./players";

// A minimal pool with players on every team used by the scenarios so the tests
// run deterministically without requiring nflverse network access.
const TEST_POOL = SCHEME_SCENARIOS.flatMap((s, i) => [
  { id: `${s.team}-qb-${i}`, name: `QB ${s.team}`, pos: "QB" as const, team: s.team, bye: 7, proj: 350, floor: 280, ceiling: 430, usage: 0, schemeFit: 0.8, role: "starter", trend: "flat" as const, injury: "healthy" as const, note: "" },
  { id: `${s.team}-rb-${i}`, name: `RB ${s.team}`, pos: "RB" as const, team: s.team, bye: 7, proj: 250, floor: 180, ceiling: 320, usage: 0.7, schemeFit: 0.75, role: "Bell-cow back", trend: "flat" as const, injury: "healthy" as const, note: "" },
  { id: `${s.team}-wr-${i}`, name: `WR ${s.team}`, pos: "WR" as const, team: s.team, bye: 7, proj: 270, floor: 200, ceiling: 340, usage: 0.65, schemeFit: 0.72, role: "WR1", trend: "flat" as const, injury: "healthy" as const, note: "" },
  { id: `${s.team}-te-${i}`, name: `TE ${s.team}`, pos: "TE" as const, team: s.team, bye: 7, proj: 180, floor: 120, ceiling: 240, usage: 0.5, schemeFit: 0.7, role: "TE1", trend: "flat" as const, injury: "healthy" as const, note: "" },
]);

describe("scheme intelligence", () => {
  it("every scenario targets a team with rostered players and yields a cascade", () => {
    for (const s of SCHEME_SCENARIOS) {
      expect(TEST_POOL.some((p) => p.team === s.team)).toBe(true);
      const c = applyScheme(s, TEST_POOL);
      expect(c.impacts.length).toBeGreaterThan(0);
      expect(c.gainers + c.faders).toBe(c.impacts.length);
    }
  });

  it("wide-zone install lifts the lead back and trims receivers", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "wide-zone")!, TEST_POOL);
    const rb = c.impacts.find((i) => i.player.pos === "RB" && i.player.usage >= 0.6);
    const wr = c.impacts.find((i) => i.player.pos === "WR");
    expect(rb?.direction).toBe("up");
    if (wr) expect(wr.direction).toBe("down");
  });

  it("air-raid lifts the QB and the slot, fades the early-down back", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "air-raid")!, TEST_POOL);
    const qb = c.impacts.find((i) => i.player.pos === "QB");
    expect(qb?.direction).toBe("up");
    const earlyDownRB = c.impacts.find((i) => i.player.pos === "RB" && !/pass-?catch|receiv/i.test(i.player.role));
    if (earlyDownRB) expect(earlyDownRB.direction).toBe("down");
  });

  it("consolidation boosts exactly one WR (the alpha) and fades the rest", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "consolidation")!, TEST_POOL);
    const wrUp = c.impacts.filter((i) => i.player.pos === "WR" && i.direction === "up");
    expect(wrUp.length).toBe(1);
  });

  it("confidence tracks the source tier (insider > aggregator)", () => {
    const insider = applyScheme(SCHEME_SCENARIOS.find((s) => s.tier === "Insider")!, TEST_POOL);
    const rumor = applyScheme(SCHEME_SCENARIOS.find((s) => s.tier === "Aggregator")!, TEST_POOL);
    expect(insider.confidence).toBeGreaterThan(rumor.confidence);
  });

  it("impacts are sorted by magnitude", () => {
    const c = applyScheme(SCHEME_SCENARIOS[0]!, TEST_POOL);
    for (let i = 1; i < c.impacts.length; i++) {
      expect(Math.abs(c.impacts[i - 1]!.deltaPct)).toBeGreaterThanOrEqual(Math.abs(c.impacts[i]!.deltaPct));
    }
  });
});
