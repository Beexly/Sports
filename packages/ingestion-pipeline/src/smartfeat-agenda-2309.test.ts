import { describe, expect, it } from "vitest";
import {
  buildAgenda, validateOperators, applyOperator, SAFE_OPERATORS, MAX_GENERATED_FEATURES,
  GSE_SMARTFEAT_ENABLED,
} from "./smartfeat-agenda-2309.js";

describe("smartfeat agenda", () => {
  it("builds a versioned agenda", () => {
    const a = buildAgenda("v1", "binary", "gbm-2025", [{ name: "epa", dtype: "float", domainNote: "play EPA" }]);
    expect(a.version).toBe("v1");
    expect(a.columns).toHaveLength(1);
  });
  it("rejects non-whitelisted operators", () => {
    const r = validateOperators(["zscore", "exec_sql"], 2);
    expect(r.ok).toBe(false);
    expect(r.rejected).toEqual(["exec_sql"]);
  });
  it("enforces the 30-feature cap", () => {
    expect(validateOperators(SAFE_OPERATORS, MAX_GENERATED_FEATURES + 1).ok).toBe(false);
    expect(validateOperators(SAFE_OPERATORS, 8).ok).toBe(true);
  });
  it("applies diff and ratio as pure transforms", () => {
    const rows = [{ epa: 1 }, { epa: 3 }, { epa: 2 }];
    const d = applyOperator("diff", rows, "epa");
    expect(d[1]?.["epa_diff"]).toBe(2);
    const r = applyOperator("ratio", [{ a: 4, b: 2 }, { a: 1, b: 0 }], "a", "b");
    expect(r[0]?.["a_div_b"]).toBe(2);
    expect(r[1]?.["a_div_b"]).toBe(0); // divide-by-zero -> 0, never NaN
  });
  it("handles empty input", () => {
    expect(applyOperator("zscore", [], "epa")).toEqual([]);
  });
  it("stays off until the log-loss gate clears", () => {
    expect(GSE_SMARTFEAT_ENABLED).toBe(false);
  });
});

