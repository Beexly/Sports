/**
 * Tests for ./2609-07559v1-feed-schema (arXiv:2609.07559v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADAPT if: (a) the paper's 163-assertion consistency audit passes on a fresh clone/run on GSE's lab VM, AND (b) the held-out gate matrix (sqrt 5/5; raw-linear fails dose-response) reproduces from the released captures; REJECT if either fails. For the sports-copy port: adopt only if GSE-calibrated gates all pass held-out on GSE's own intervention capture with the attacker-gain cap <= ~6 points on a 100-point scale.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2609-07559v1-feed-schema";

describe("2609-07559v1 Scoring Without the Engine: Validating a", () => {
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
