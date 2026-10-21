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
    // THE DATA IS NOW DETERMINISTIC.
    //
    // This test was titled "flows through falsifyBind deterministically"
    // -- and it was NOT deterministic. The rows were generated with
    // `Math.random() > 0.5 ? 0.6 : -0.4`, so the verdict flipped
    // between runs: measured, the same command on the same seed
    // failed 3 times out of 5 and passed 2 times out of 5.
    //
    // A flaky test is a gate that cries wolf. It trains its readers
    // to re-run it, and the re-run habit outlives the flakiness.
    //
    // `falsifyBind` was already given `seed: 7`, so the SEED was
    // there -- it just never reached the half of the pipeline that
    // needed it, because the data was random before it got there.
    //
    // A 24-bit LCG, the same generator the other verifiers in this
    // repository use, so the rows are reproducible.
    let state = 7 >>> 0;
    const rand = (): number => {
      state = (Math.imul(state, 1664525) + 12345) >>> 0;
      return (state >>> 8) / 16777216;
    };
    const synthetic = Array.from({ length: 120 }, (_, i) => ({
      season: 2024,
      week: (i % 17) + 1,
      playerId: `P${i % 20}`,
      yacAboveExpected: rand() > 0.5 ? 0.6 : -0.4,
    }));
    const rows = convertYacoeToBacktestRows(synthetic);
    const result = falsifyBind(rows, { minN: 50, seed: 7 });

    // THE REAL VERDICT SET.
    //
    // The old assertion allowed ["PASS", "KILLED", "STARVED"]. The
    // actual type is `"SURVIVOR" | "KILLED" | "STARVED" | "PARKED"` --
    // "PASS" is not a verdict at all, and "SURVIVOR" -- the verdict
    // the pipeline actually produces on a passing bind -- was missing
    // from the allowed set. So the assertion was wrong in BOTH
    // directions: it permitted a verdict that cannot occur, and
    // forbade one that does.
    expect(["SURVIVOR", "KILLED", "STARVED", "PARKED"]).toContain(
      result.overall.verdict,
    );
    expect(typeof result.overall.reason).toBe("string");
  });

  it("documents named constants", () => {
    expect(PRIOR_SEASON_KNOWN_AT_WEEK).toBe(18);
    expect(MARKET_PROXY).toBe(0.5);
    expect(SIGN_DIRECTION).toBe("+");
  });
});
