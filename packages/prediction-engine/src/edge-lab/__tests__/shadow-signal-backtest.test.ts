/** Tests for the ShadowSignal -> BacktestRow bridge (C-67 audit rank #2). */
import { describe, expect, it } from "vitest";
import {
  SHADOW_SIGNAL_BACKTEST_METHOD_TAG,
  convertShadowSignalsToBacktestRows,
  type ShadowSignalInput,
} from "../shadow-signal-backtest.js";
import { falsifyBind } from "../falsify.js";

function row(overrides: Partial<ShadowSignalInput> & { evaluatedAt: Date; settledAt: Date }): ShadowSignalInput {
  return {
    gameId: "game-1",
    modelVersion: "test_v1",
    shadowProb: 0.6,
    marketProb: 0.5,
    outcome: 1,
    ...overrides,
  };
}

describe("convertShadowSignalsToBacktestRows", () => {
  it("preserves real chronological order exactly via global rank", () => {
    const rows: ShadowSignalInput[] = [
      row({
        gameId: "g1",
        evaluatedAt: new Date("2026-01-01T00:00:00Z"),
        settledAt: new Date("2026-01-02T00:00:00Z"),
      }),
      row({
        gameId: "g2",
        evaluatedAt: new Date("2026-01-05T00:00:00Z"),
        settledAt: new Date("2026-01-06T00:00:00Z"),
      }),
    ];
    const res = convertShadowSignalsToBacktestRows(rows);
    expect(res.rows).toHaveLength(2);
    // g1's evaluatedAt/settledAt both precede g2's — every rank for g1 must be
    // strictly less than every rank for g2.
    expect(res.rows[0]!.knownAtWeek).toBeLessThan(res.rows[0]!.outcomeWeek);
    expect(res.rows[0]!.outcomeWeek).toBeLessThan(res.rows[1]!.knownAtWeek);
    expect(res.rows[1]!.knownAtWeek).toBeLessThan(res.rows[1]!.outcomeWeek);
  });

  it("never assigns rank 0 — ranks are 1-indexed", () => {
    const res = convertShadowSignalsToBacktestRows([
      row({ evaluatedAt: new Date("2026-01-01T00:00:00Z"), settledAt: new Date("2026-01-02T00:00:00Z") }),
    ]);
    expect(res.rows[0]!.knownAtWeek).toBeGreaterThanOrEqual(1);
    expect(res.rows[0]!.outcomeWeek).toBeGreaterThanOrEqual(1);
  });

  it("season is the real settlement year, not invented", () => {
    const res = convertShadowSignalsToBacktestRows([
      row({ evaluatedAt: new Date("2026-12-31T00:00:00Z"), settledAt: new Date("2027-01-02T00:00:00Z") }),
    ]);
    expect(res.rows[0]!.season).toBe(2027);
  });

  it("drops malformed rows (out-of-range prob, invalid date) rather than coercing them", () => {
    const res = convertShadowSignalsToBacktestRows([
      row({ shadowProb: 1.5, evaluatedAt: new Date("2026-01-01Z"), settledAt: new Date("2026-01-02Z") }), // invalid prob
      row({ marketProb: -0.1, evaluatedAt: new Date("2026-01-01Z"), settledAt: new Date("2026-01-02Z") }), // invalid prob
      row({ evaluatedAt: new Date("not-a-date"), settledAt: new Date("2026-01-02Z") }), // invalid date
      row({ evaluatedAt: new Date("2026-01-01T00:00:00Z"), settledAt: new Date("2026-01-02T00:00:00Z") }), // valid
    ]);
    expect(res.rows).toHaveLength(1);
    expect(res.droppedMalformed).toBe(3);
  });

  it("reports exact-timestamp collisions without silently absorbing them", () => {
    const same = new Date("2026-01-01T00:00:00Z");
    const res = convertShadowSignalsToBacktestRows([row({ evaluatedAt: same, settledAt: same })]);
    expect(res.exactTimestampCollisions).toBe(1);
    expect(res.rows[0]!.knownAtWeek).toBe(res.rows[0]!.outcomeWeek);
  });

  it("empty input returns empty output with zero drops/collisions", () => {
    const res = convertShadowSignalsToBacktestRows([]);
    expect(res.rows).toEqual([]);
    expect(res.droppedMalformed).toBe(0);
    expect(res.exactTimestampCollisions).toBe(0);
  });

  it("maps shadowProb -> modelProb and marketProb -> marketProb directly, outcome passed through", () => {
    const res = convertShadowSignalsToBacktestRows([
      row({
        shadowProb: 0.73,
        marketProb: 0.61,
        outcome: 0,
        evaluatedAt: new Date("2026-01-01Z"),
        settledAt: new Date("2026-01-02Z"),
      }),
    ]);
    expect(res.rows[0]!.modelProb).toBe(0.73);
    expect(res.rows[0]!.marketProb).toBe(0.61);
    expect(res.rows[0]!.outcome).toBe(0);
  });
});

describe("end-to-end: converted rows are valid falsifyBind input", () => {
  it("a genuinely predictive shadow signal (shadowProb tracks outcome, real timestamps) survives", () => {
    const rows: ShadowSignalInput[] = [];
    let t = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 220; i++) {
      const outcome = i % 4 === 0 ? 0 : 1;
      const evaluatedAt = new Date(t);
      const settledAt = new Date(t + 3 * 60 * 60 * 1000); // settles 3h later
      rows.push(
        row({
          gameId: `g${i}`,
          shadowProb: outcome === 1 ? 0.75 : 0.25,
          marketProb: 0.5,
          outcome,
          evaluatedAt,
          settledAt,
        }),
      );
      t += 24 * 60 * 60 * 1000; // next game a day later
    }
    const converted = convertShadowSignalsToBacktestRows(rows);
    expect(converted.droppedMalformed).toBe(0);
    expect(converted.exactTimestampCollisions).toBe(0);

    const result = falsifyBind(converted.rows, { minN: 100, seed: 7 });
    expect(result.leakage.verdict).toBe("PASS"); // real chronological ordering, never inverted
    expect(result.marketDataCoverage.allDefaulted).toBe(false); // real marketProb throughout
    expect(result.overall.verdict).toBe("SURVIVOR");
  });

  it("a genuinely non-predictive shadow signal (shadowProb independent of outcome) is killed", () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const rows: ShadowSignalInput[] = [];
    let t = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 220; i++) {
      const outcome = rnd() > 0.5 ? 1 : 0;
      rows.push(
        row({
          gameId: `g${i}`,
          shadowProb: 0.2 + rnd() * 0.6, // independent of outcome
          marketProb: 0.5,
          outcome,
          evaluatedAt: new Date(t),
          settledAt: new Date(t + 3 * 60 * 60 * 1000),
        }),
      );
      t += 24 * 60 * 60 * 1000;
    }
    const converted = convertShadowSignalsToBacktestRows(rows);
    const result = falsifyBind(converted.rows, { minN: 100, seed: 7 });
    expect(result.overall.verdict).toBe("KILLED");
  });
});

describe("method tag", () => {
  it("is exported and stable", () => {
    expect(SHADOW_SIGNAL_BACKTEST_METHOD_TAG).toBe("shadow_signal_backtest_v1");
  });
});
