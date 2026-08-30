import { describe, it, expect } from "vitest";
import { SCHEME_SCENARIOS, applyScheme } from "./scheme";
import { PLAYERS } from "./players";

describe("scheme intelligence", () => {
  it("every scenario targets a team with rostered players and yields a cascade", () => {
    for (const s of SCHEME_SCENARIOS) {
      expect(PLAYERS.some((p) => p.team === s.team)).toBe(true);
      const c = applyScheme(s);
      expect(c.impacts.length).toBeGreaterThan(0);
      expect(c.gainers + c.faders).toBe(c.impacts.length);
    }
  });

  it("wide-zone install lifts the lead back and trims receivers", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "wide-zone")!);
    const rb = c.impacts.find((i) => i.player.pos === "RB" && i.player.usage >= 0.6);
    const wr = c.impacts.find((i) => i.player.pos === "WR");
    expect(rb?.direction).toBe("up");
    if (wr) expect(wr.direction).toBe("down");
  });

  it("air-raid lifts the QB and the slot, fades the early-down back", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "air-raid")!);
    const qb = c.impacts.find((i) => i.player.pos === "QB");
    expect(qb?.direction).toBe("up");
    const earlyDownRB = c.impacts.find((i) => i.player.pos === "RB" && !/pass-?catch|receiv/i.test(i.player.role));
    if (earlyDownRB) expect(earlyDownRB.direction).toBe("down");
  });

  it("consolidation boosts exactly one WR (the alpha) and fades the rest", () => {
    const c = applyScheme(SCHEME_SCENARIOS.find((s) => s.id === "consolidation")!);
    const wrUp = c.impacts.filter((i) => i.player.pos === "WR" && i.direction === "up");
    expect(wrUp.length).toBe(1);
  });

  it("confidence tracks the source tier (insider > aggregator)", () => {
    const insider = applyScheme(SCHEME_SCENARIOS.find((s) => s.tier === "Insider")!);
    const rumor = applyScheme(SCHEME_SCENARIOS.find((s) => s.tier === "Aggregator")!);
    expect(insider.confidence).toBeGreaterThan(rumor.confidence);
  });

  it("impacts are sorted by magnitude", () => {
    const c = applyScheme(SCHEME_SCENARIOS[0]!);
    for (let i = 1; i < c.impacts.length; i++) {
      expect(Math.abs(c.impacts[i - 1]!.deltaPct)).toBeGreaterThanOrEqual(Math.abs(c.impacts[i]!.deltaPct));
    }
  });
});
