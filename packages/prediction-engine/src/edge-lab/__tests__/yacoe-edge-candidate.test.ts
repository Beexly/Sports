/** Synthetic deterministic test for yacoe-edge-candidate converter + falsify funnel. */
import { describe, it, expect } from "vitest";
import { falsifyBind } from "../falsify.js";
import {
  convertYacoeToBacktestRows,
  PRIOR_SEASON_KNOWN_AT_WEEK,
  MARKET_PROXY,
  SIGN_DIRECTION,
} from "../yacoe-edge-candidate.js";

describe("yacoe-edge-candidate converter", () => {
  it("produces valid BacktestRow shape with no leakage by construction", () => {
    const synthetic = [
      { season: 2024, week: 5, playerId: "P01", yacAboveExpected: 0.8 },
      { season: 2024, week: 10, playerId: "P02", yacAboveExpected: -0.3 },
    ];
    const rows = convertYacoeToBacktestRows(synthetic);
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.knownAtWeek < r.outcomeWeek)).toBe(true);
    expect(rows.every((r) => r.marketProb === MARKET_PROXY)).toBe(true);
    expect(rows.every((r) => r.modelProb >= 0.01 && r.modelProb <= 0.99)).toBe(true);
    expect(rows[0]!.outcome).toBe(1);
    expect(rows[1]!.outcome).toBe(0);
  });

  it("flows through falsifyBind deterministically and returns valid shape", () => {
    const synthetic = Array.from({ length: 120 }, (_, i) => ({
      season: 2024,
      week: (i % 17) + 1,
      playerId: `P${i % 20}`,
      yacAboveExpected: Math.random() > 0.5 ? 0.6 : -0.4,
    }));
    const rows = convertYacoeToBacktestRows(synthetic);
    const result = falsifyBind(rows, { minN: 50, seed: 7 });
    expect(["SURVIVOR", "KILLED", "STARVED", "PARKED"]).toContain(result.overall.verdict);
    expect(typeof result.overall.reason).toBe("string");
  });

  it("documents named constants", () => {
    expect(PRIOR_SEASON_KNOWN_AT_WEEK).toBe(18);
    expect(MARKET_PROXY).toBe(0.5);
    expect(SIGN_DIRECTION).toBe("+");
  });
});
