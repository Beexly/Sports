/**
 * Tests for ./2011-01324v2-data-infra (arXiv:2011.01324v2, lane=data_infra).
 *
 * ACCEPTANCE GATE: ADAPT the event-level WPA + bootstrap-uncertainty design if, on the 2024 test window: (a) the
 * XGBoost WP model beats logistic regression on log loss by >= 0.01 with a calibrated reliability
 * curve (max bin deviation <= 3pp); and (b) player WPA split-half correlation >= 0.35 and its
 * correlation with EPA/play < 0.90 (independence margin).
 */
import { describe, expect, it } from "vitest";
import * as mod from "./2011-01324v2-data-infra";

describe("data-infra feed hygiene (arXiv:2011.01324v2)", () => {
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
