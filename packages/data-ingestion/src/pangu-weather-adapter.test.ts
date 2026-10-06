/**
 * Tests for ./pangu-weather-adapter (arXiv:2211.02556, lane=weather).
 *
 * ACCEPTANCE GATE: ADAPT: the two transferable ideas (multi-lead-time greedy chaining; RQE tail auditing) are
 * concrete, implementable, and map to real GSE subsystems (projection chaining, weather-adjusted
 * totals). Not ADOPT: GSE will not train a weather model — the 3DEST architecture and ERA5
 * pipeline stay in the literature, not the repo.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./pangu-weather-adapter";

describe("Pangu-Weather adapter (arXiv:2211.02556)", () => {
  it("skill decays with lead", () => {
    expect(mod.skillDecay(168)!).toBeLessThan(mod.skillDecay(6)!);
    expect(mod.skillDecay(0)).toBeCloseTo(0.95, 10);
    expect(mod.skillDecay(-1)).toBeNull();
  });
  it("spread grows with lead", () => {
    expect(mod.expectedSpread(1, 168)!).toBeGreaterThan(mod.expectedSpread(1, 6)!);
    expect(mod.expectedSpread(1, 0)).toBeCloseTo(1, 10);
  });
  it("blend shifts to climo at long leads", () => {
    const short = mod.blendWithClimo(70, 65, 6)!;
    const long = mod.blendWithClimo(70, 65, 1000)!;
    expect(Math.abs(short - 70)).toBeLessThan(Math.abs(long - 70));
    expect(long).toBeCloseTo(65, 0);
  });
  it("forecast age", () => {
    const now = Date.now();
    expect(mod.forecastAgeH(new Date(now - 3600000).toISOString(), now)).toBeCloseTo(1, 5);
    expect(mod.forecastAgeH("nope", now)).toBeNull();
  });
  it("isPanguField rejects malformed", () => {
    expect(mod.isPanguField({ variable: "t2m" })).toBe(false);
  });
});
