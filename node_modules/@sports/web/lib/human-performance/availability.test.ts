import { describe, it, expect } from "vitest";
import {
  computeAvailabilityModifier,
  availabilityOutputBehavior,
  loadAvailabilityModifier,
  loadRosterAvailability,
  type AvailabilityInputs,
} from "./availability";
import { MAX_BAND_WIDEN } from "./types";

const base: AvailabilityInputs = { playerId: "p1", injuryStatus: "None" };

describe("computeAvailabilityModifier — conservative & capped", () => {
  it("clears to play with no widening when there are no signals", () => {
    const m = computeAvailabilityModifier(base);
    expect(m.bandWidenPct).toBe(0);
    expect(m.recommendation).toBe("play");
    expect(m.drivers).toHaveLength(0);
  });

  it("sends an official OUT to no-bet", () => {
    const m = computeAvailabilityModifier({ ...base, injuryStatus: "Out", primaryInjury: "Knee" });
    expect(m.recommendation).toBe("no-bet");
    expect(m.tier).toBe("official");
    expect(m.drivers[0]?.note).toContain("OUT");
  });

  it("sends a Doubtful designation to watchlist (band >= threshold)", () => {
    const m = computeAvailabilityModifier({ ...base, injuryStatus: "Doubtful" });
    expect(m.bandWidenPct).toBeCloseTo(0.4, 3);
    expect(m.recommendation).toBe("watchlist");
  });

  it("forces watchlist on conflicting sources even when the band is small", () => {
    const m = computeAvailabilityModifier({ ...base, conflictingSources: true });
    expect(m.bandWidenPct).toBeLessThan(0.35);
    expect(m.recommendation).toBe("watchlist");
  });

  it("never widens more than the cap, even with everything stacked", () => {
    const m = computeAvailabilityModifier({
      ...base,
      injuryStatus: "Doubtful",
      daysRest: 1,
      windMph: 100,
      precipPct: 100,
      tempF: -50,
      roleVolatility: 1,
      marketMovedOnNews: true,
      conflictingSources: true,
    });
    expect(m.bandWidenPct).toBe(MAX_BAND_WIDEN);
  });

  it("never narrows: extra rest + clear conditions stay at zero, not negative", () => {
    const m = computeAvailabilityModifier({ ...base, daysRest: 14, controlledRoof: true, windMph: 50 });
    expect(m.bandWidenPct).toBe(0);
    expect(m.recommendation).toBe("play");
  });

  it("suppresses weather stress in a controlled-roof venue", () => {
    const m = computeAvailabilityModifier({ ...base, injuryStatus: "Questionable", controlledRoof: true, windMph: 40, precipPct: 90 });
    expect(m.drivers.find((d) => d.key === "surfaceWeatherStress")).toBeUndefined();
  });

  it("stacks Questionable + open-air storm + short rest into watchlist", () => {
    const m = computeAvailabilityModifier({ ...base, injuryStatus: "Questionable", windMph: 30, precipPct: 80, daysRest: 4 });
    expect(m.recommendation).toBe("watchlist");
    expect(m.drivers.map((d) => d.key)).toEqual(
      expect.arrayContaining(["injuryStatus", "surfaceWeatherStress", "workloadFatigue"]),
    );
  });
});

describe("availabilityOutputBehavior — mandatory disclosure contract", () => {
  it("emits a complete contract whose verdict matches the modifier", () => {
    const m = computeAvailabilityModifier({ ...base, injuryStatus: "Questionable", windMph: 25 });
    const b = availabilityOutputBehavior(m, "Marcus Vale");
    expect(b).not.toBeNull();
    expect(b?.verdict).toBe(m.recommendation);
    expect(b?.whatChanged).toContain("Marcus Vale");
    expect(b?.whatCouldBreakTheRead.length).toBeGreaterThan(0);
    expect(b?.confidenceLabel).toBeTypeOf("string");
  });

  it("reports the clear, no-flags case honestly", () => {
    const m = computeAvailabilityModifier(base);
    const b = availabilityOutputBehavior(m, "Clean Player");
    expect(b?.verdict).toBe("play");
    expect(b?.whatChanged).toContain("No public availability");
  });
});

describe("loadAvailabilityModifier — orchestration", () => {
  it("degrades to source-error when the injury feed is unreachable", async () => {
    const r = await loadAvailabilityModifier({ player: "Test Player", fetcher: async () => { throw new Error("network down"); } });
    expect(r.status).toBe("source-error");
    expect(r.modifier).toBeNull();
  });

  it("returns an empty (non-error) result for a blank player name without fetching", async () => {
    const r = await loadAvailabilityModifier({ player: "  ", fetcher: async () => { throw new Error("should not fetch"); } });
    expect(r.status).toBe("ok");
    expect(r.modifier).toBeNull();
    expect(r.error).toContain("player name");
  });
});

describe("loadRosterAvailability — batch", () => {
  it("returns ok with no rows for an empty roster, without fetching", async () => {
    const r = await loadRosterAvailability({ players: [], fetcher: async () => { throw new Error("should not fetch"); } });
    expect(r.status).toBe("ok");
    expect(r.rows).toEqual([]);
  });

  it("degrades to source-error when the injury feed is unreachable", async () => {
    const r = await loadRosterAvailability({ players: [{ name: "Some Player", team: "KC" }], fetcher: async () => { throw new Error("down") } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
  });
});
