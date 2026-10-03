import { describe, expect, it } from "vitest";
import { summarizeFreeSpineOddsPath } from "@/lib/ops/free-spine-odds-path";

describe("summarizeFreeSpineOddsPath", () => {
  it("returns null when counts unknown", () => {
    expect(summarizeFreeSpineOddsPath({ criticalGaps: null, requireSpend: null, freeCovered: null })).toBeNull();
  });

  it("names paid single-path when requireSpend equals criticalGaps (prod odds case)", () => {
    const s = summarizeFreeSpineOddsPath({
      criticalGaps: 7,
      requireSpend: 7,
      freeCovered: 59,
    });
    expect(s?.paidSinglePath).toBe(true);
    expect(s?.primaryOddsSource).toBe("the-odds-api");
    expect(s?.freeOddsCandidatesGated).toBe(true);
    expect(s?.operatorHint).toMatch(/ABSENT/i);
    expect(s?.operatorHint).toMatch(/never invent/i);
  });

  it("uses generic dual-path copy when gaps are mixed", () => {
    const s = summarizeFreeSpineOddsPath({
      criticalGaps: 4,
      requireSpend: 1,
      freeCovered: 50,
    });
    expect(s?.paidSinglePath).toBe(false);
    expect(s?.operatorHint).toMatch(/dual-path/i);
    expect(s?.operatorHint).not.toMatch(/single-cleared via the-odds-api/);
  });

  it("reports clear when both counts zero", () => {
    const s = summarizeFreeSpineOddsPath({
      criticalGaps: 0,
      requireSpend: 0,
      freeCovered: 68,
    });
    expect(s?.paidSinglePath).toBe(false);
    expect(s?.criticalGaps).toBe(0);
  });
});
