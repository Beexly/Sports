/**
 * Tests for ./sustainable-throughput-bench (arXiv:1802.08496v2, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADOPT the sustainable-throughput methodology as GSE's serving evaluation standard iff: (a)
 * sustainable QPS >= 2x peak expected game-day QPS; (b) under single-key skew, p99 <= 50 ms up to
 * >=50% of sustainable QPS; (c) spike recovery within 60 seconds. REJECT the absolute 2018 engine
 * numbers as decision inputs -- methodology only.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./sustainable-throughput-bench";

describe("sustainable throughput bench (arXiv:1802.08496v2)", () => {
  const samples = [
    { qps: 100, p99Ms: 20 },
    { qps: 200, p99Ms: 30 },
    { qps: 300, p99Ms: 45 },
    { qps: 400, p99Ms: 80 },
    { qps: 500, p99Ms: 200 },
  ];
  it("knee at 400 -> sustainable 360", () => {
    expect(mod.sustainableThroughput(samples, 50)).toBeCloseTo(360, 10);
    expect(mod.sustainableThroughput(samples.slice(0, 3), 50)).toBeNull();
    expect(mod.sustainableThroughput([], 50)).toBeNull();
  });
  it("skew gate", () => {
    const skew = [
      { qps: 100, p99Ms: 25 },
      { qps: 180, p99Ms: 48 },
      { qps: 300, p99Ms: 90 },
    ];
    expect(mod.skewGateHolds(skew, 360, 0.5, 50)).toBe(true);
    expect(mod.skewGateHolds([{ qps: 100, p99Ms: 60 }], 360, 0.5, 50)).toBe(false);
    expect(mod.skewGateHolds([], 360, 0.5, 50)).toBeNull();
  });
  it("spike recovery", () => {
    const tl = [
      { tSec: 0, p99Ms: 200 },
      { tSec: 30, p99Ms: 100 },
      { tSec: 45, p99Ms: 40 },
    ];
    expect(mod.spikeRecovered(tl, 0, 50, 60)).toBe(true);
    expect(mod.spikeRecovered(tl, 0, 50, 10)).toBe(false);
    expect(mod.spikeRecovered([], 0)).toBeNull();
  });
  it("verdict", () => {
    const v = mod.servingEvalVerdict(samples, [{ qps: 100, p99Ms: 25 }], [{ tSec: 61, p99Ms: 40 }], 100, 60);
    expect(v.sustainableQps).toBeCloseTo(360, 10);
    expect(v.qpsHeadroom2x).toBe(true);
  });
  it("rejects malformed samples", () => {
    expect(mod.sustainableThroughput([{ qps: "fast", p99Ms: 1 }], 50)).toBeNull();
  });
});
