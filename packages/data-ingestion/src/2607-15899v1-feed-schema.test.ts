/**
 * Tests for ./2607-15899v1-feed-schema (arXiv:2607.15899v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADAPT if: (a) the continuitybench harness reproduces the treatment-vs-baseline CPR gap (treatment >=95%, baseline <=5%); (b) the retry-storm repro shows fixed-interval retries destabilizing and jittered backoff stabilizing; (c) judge calibration on 20 hand-labeled handoff cases reaches >=90% agreement. Adopt HPR as a standing gate only if a pilot shows >=1 anchor-loss event the parent would otherwise not have caught.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2607-15899v1-feed-schema";

describe("2607-15899v1 ContinuityBench: A Benchmark and Systems Study", () => {
  it("validateRecord accepts good rows and reports bad ones", () => {
    const spec = [
      { name: "spread", type: "number", required: true, min: -60, max: 60 },
      { name: "team", type: "string", required: true },
    ] as const;
    const ok = mod.validateRecord([...spec], { spread: -3.5, team: "KC" });
    expect(ok.ok).toBe(true);
    const bad = mod.validateRecord([...spec], { spread: -99, team: "KC" });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    const missing = mod.validateRecord([...spec], { spread: -3.5 });
    expect(missing.ok).toBe(false);
  });
  it("normalizeFeedFields renames via mapping", () => {
    const out = mod.normalizeFeedFields({ home_spread: -3 }, { home_spread: "spread" });
    expect(out).toEqual({ spread: -3 });
  });
  it("nullRate measures missingness", () => {
    expect(mod.nullRate([1, null, 2, undefined])).toBeCloseTo(0.5, 10);
    expect(mod.nullRate([])).toBeNull();
  });
  it("dedupeByKey keeps first occurrence order", () => {
    const rows = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "a", v: 3 }];
    expect(mod.dedupeByKey(rows, (r) => r.id)).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
  });
});
