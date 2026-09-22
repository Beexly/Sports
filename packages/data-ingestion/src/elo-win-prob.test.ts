/**
 * Tests for ./elo-win-prob (arXiv:1909.03555v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADAPT the benchmark methodology (not the 2019 numbers) if a GSE batch job is identified that
 * exceeds the 2-hour/8-vCPU-hour trigger; additionally benchmark cold-start-aware inference cost
 * (serialized XGBoost/ONNX payload, p50/p99 latency vs provisioned-concurrency cost) for live
 * endpoints.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./elo-win-prob";

describe("Elo win prob (arXiv:1807.07580v2)", () => {
  it("expected score symmetric at equal ratings", () => {
    expect(mod.expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
    expect(mod.expectedScore(1500, 1500, 0)).toBeNull();
  });
  it("home advantage lifts home prob", () => {
    expect(mod.winProb(1500, 1500, 65)!).toBeGreaterThan(0.5);
    expect(mod.winProb(1500, 1500, 0)).toBeCloseTo(0.5, 10);
  });
  it("update moves winner up, loser down, zero-sum", () => {
    const t = mod.applyGame(mod.emptyTable(), "KC", "BUF", 27, 24)!;
    expect(t.ratings["KC"]!).toBeGreaterThan(1500);
    expect(t.ratings["BUF"]!).toBeLessThan(1500);
    expect(t.ratings["KC"]! + t.ratings["BUF"]!).toBeCloseTo(3000, 8);
    expect(t.gamesPlayed["KC"]).toBe(1);
  });
  it("tie splits", () => {
    const t = mod.applyGame(mod.emptyTable(), "KC", "BUF", 20, 20)!;
    // home tie underperforms the home edge -> home rating falls below away
    expect(t.ratings["KC"]!).toBeLessThan(t.ratings["BUF"]!);
  });
  it("null on malformed", () => {
    expect(mod.applyGame(mod.emptyTable(), "KC", "KC", 1, 2)).toBeNull();
    expect(mod.eloUpdate(1500, 2, 1)).toBeNull();
  });
});
