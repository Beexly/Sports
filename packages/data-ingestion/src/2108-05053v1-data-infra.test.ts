/**
 * Tests for ./2108-05053v1-data-infra (arXiv:2108.05053v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADOPT the monitoring doctrine iff: the injected-fault test detects the corruption within one
 * materialization cycle with >=95% precision on named feature sets (no false naming of clean
 * features), AND the PSI skew monitor on the 2024 season produces <=1 false alert per month of
 * simulated operation.
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2108-05053v1-data-infra";

describe("data-infra feed hygiene (arXiv:2108.05053v1)", () => {
  it("normalizes feed records", () => {
    const r = mod.normalizeFeedRecord({ a: " 5 ", b: " x ", c: null, d: "", e: "  " })!;
    expect(r.record).toEqual({ a: 5, b: "x" });
    expect(r.dropped.sort()).toEqual(["c", "d", "e"]);
    expect(mod.normalizeFeedRecord(null as unknown as Record<string, unknown>)).toBeNull();
    expect(mod.normalizeFeedRecord([] as unknown as Record<string, unknown>)).toBeNull();
  });

  it("validates required fields", () => {
    expect(mod.validateRequired({ a: 1 }, ["a", "b"])).toEqual(["b"]);
    expect(mod.validateRequired({ a: 1, b: "" }, ["a", "b"])).toEqual(["b"]);
    expect(mod.validateRequired({ a: 1 }, ["a"])).toEqual([]);
  });

  it("dedupes by key keeping the first", () => {
    const rows = [{ id: "a", v: 1 }, { id: "a", v: 2 }, { id: "b", v: 3 }];
    const r = mod.dedupeByKey(rows, (row) => row.id)!;
    expect(r.rows).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 3 },
    ]);
    expect(r.duplicates).toBe(1);
  });
});
