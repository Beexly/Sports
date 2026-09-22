/**
 * Tests for ./lst-bench-infra (arXiv:2305.01120v3, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADOPT the maintenance doctrine iff: (i) the no-maintenance run shows S_DR > 0.1 (confirming the
 * degradation mechanism applies to GSE's workload - if no degradation appears at GSE's scale, the
 * doctrine is REJECTED as over-engineering), AND (ii) post-Optimize latency recovers to within 10%
 * of the fresh-table baseline.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./lst-bench-infra";

describe("LST-Bench infra (arXiv:2305.01120v3)", () => {
  const runs = [
    { engine: "delta", workload: "write", rows: 1000000, seconds: 100, costUsd: 5 },
    { engine: "iceberg", workload: "write", rows: 1000000, seconds: 80, costUsd: 8 },
    { engine: "hudi", workload: "write", rows: 1000000, seconds: 120, costUsd: 4 },
    { engine: "delta", workload: "read", rows: 1000000, seconds: 20, costUsd: 1 },
  ];
  it("throughput + cost", () => {
    expect(mod.throughput(runs[0] as never)).toBeCloseTo(10000, 10);
    expect(mod.costPerMillion(runs[0] as never)).toBeCloseTo(5, 10);
    expect(mod.throughput({ engine: "x" } as never)).toBeNull();
  });
  it("pareto frontier", () => {
    const f = mod.paretoFrontier(runs);
    expect(f.length).toBeGreaterThan(0);
    expect(f.length).toBeLessThan(runs.length + 1);
    expect(mod.paretoFrontier([])).toEqual([]);
  });
  it("winner by workload", () => {
    const w = mod.winnerByWorkload(runs);
    expect(w.write!.engine).toBe("iceberg");
    expect(w.read!.engine).toBe("delta");
    expect(w.merge).toBeNull();
  });
  it("isBenchRun rejects malformed", () => {
    expect(mod.isBenchRun({ engine: "delta", workload: "write", rows: 0, seconds: 1, costUsd: 1 })).toBe(false);
  });
});
