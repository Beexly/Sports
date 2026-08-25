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

  /**
   * Deterministic for real. This case used `Math.random()` under a title
   * promising determinism, and asserted `["PASS","KILLED","STARVED"]` — but
   * `overall.verdict` is `"SURVIVOR" | "KILLED" | "STARVED" | "PARKED"`
   * (falsify.ts:23), so the list both omitted two reachable values and
   * included "PASS", which `overall` can never take. The run that drew enough
   * positives to survive the funnel therefore failed CI at random.
   *
   * Seeded now, so the verdict is a fixed point that can be asserted exactly —
   * which is what makes this a test rather than a shape check.
   */
  it("flows through falsifyBind deterministically and returns valid shape", () => {
    // mulberry32 — tiny, seeded, no dependency. Same seed, same rows, forever.
    let seedState = 0x9e3779b9;
    const rand = (): number => {
      seedState = (seedState + 0x6d2b79f5) | 0;
      let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const synthetic = Array.from({ length: 120 }, (_, i) => ({
      season: 2024,
      week: (i % 17) + 1,
      playerId: `P${i % 20}`,
      yacAboveExpected: rand() > 0.5 ? 0.6 : -0.4,
    }));
    const rows = convertYacoeToBacktestRows(synthetic);
    const result = falsifyBind(rows, { minN: 50, seed: 7 });

    // The full reachable domain, so a future verdict rename fails loudly here
    // instead of silently widening what this test tolerates.
    expect(["SURVIVOR", "KILLED", "STARVED", "PARKED"]).toContain(result.overall.verdict);
    expect(typeof result.overall.reason).toBe("string");
    expect(result.overall.reason.length).toBeGreaterThan(0);

    // Determinism asserted, not just claimed: same input twice, same verdict.
    const again = falsifyBind(convertYacoeToBacktestRows(synthetic), { minN: 50, seed: 7 });
    expect(again.overall.verdict).toBe(result.overall.verdict);
    expect(again.overall.reason).toBe(result.overall.reason);
  });

  it("documents named constants", () => {
    expect(PRIOR_SEASON_KNOWN_AT_WEEK).toBe(18);
    expect(MARKET_PROXY).toBe(0.5);
    expect(SIGN_DIRECTION).toBe("+");
  });
});
