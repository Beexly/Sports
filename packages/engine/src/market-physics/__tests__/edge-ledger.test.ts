import { describe, it, expect } from "vitest";
import {
  evaluateLedgerStatus,
  promote,
  requiredFieldsComplete,
  type EdgeCandidate,
} from "../edge-ledger.js";

function candidate(over: Partial<EdgeCandidate> = {}): EdgeCandidate {
  return {
    candidateId: "rush-under-high-line",
    hypothesis: "RB rushing UNDER on lines ≥70 beats break-even",
    structuralReason: "public over-bets star RB rush lines; books shade up",
    market: "player_rush_yds",
    dataWindow: "2023-2025 wks 1-8",
    sampleSize: 144,
    seasonsCovered: 3,
    clv: "pass",
    settlement: "pass",
    oos: "pass",
    fdr: "pass",
    liquidityNote: "rush props lower limits",
    liquidityChecked: true,
    dataQualityClean: true,
    futureContamination: false,
    ...over,
  };
}

describe("evaluateLedgerStatus — ACTIVE eligibility", () => {
  it("permits ACTIVE only when every gate clears", () => {
    const v = evaluateLedgerStatus(candidate());
    expect(v.maxStatus).toBe("ACTIVE");
    expect(v.activeBlockers).toHaveLength(0);
    expect(promote(candidate(), "ACTIVE").allowed).toBe(true);
  });
});

describe("the unforgettable rules — none of these can be ACTIVE", () => {
  it("CLV-only cannot be ACTIVE", () => {
    const c = candidate({ settlement: "not_run", oos: "not_run", fdr: "not_run" });
    const v = evaluateLedgerStatus(c);
    expect(v.maxStatus).not.toBe("ACTIVE");
    expect(v.activeBlockers).toContain("settlement-not-proven");
    expect(promote(c, "ACTIVE").allowed).toBe(false);
  });

  it("FDR-only without OOS cannot be ACTIVE", () => {
    const c = candidate({ oos: "not_run", settlement: "not_run" });
    expect(evaluateLedgerStatus(c).maxStatus).not.toBe("ACTIVE");
    expect(evaluateLedgerStatus(c).activeBlockers).toContain("oos-not-proven");
  });

  it("OOS without settlement cannot be ACTIVE (but is SHADOW_READY)", () => {
    const c = candidate({ settlement: "not_run" });
    const v = evaluateLedgerStatus(c);
    expect(v.maxStatus).toBe("SHADOW_READY");
    expect(v.activeBlockers).toContain("settlement-not-proven");
  });

  it("one-season-only cannot be ACTIVE", () => {
    const c = candidate({ seasonsCovered: 1 });
    const v = evaluateLedgerStatus(c);
    expect(v.maxStatus).not.toBe("ACTIVE");
    expect(v.activeBlockers).toContain("seasons<2");
  });

  it("an unchecked liquidity gate blocks ACTIVE", () => {
    const c = candidate({ liquidityChecked: false });
    expect(evaluateLedgerStatus(c).maxStatus).toBe("SHADOW_READY");
    expect(evaluateLedgerStatus(c).activeBlockers).toContain("liquidity-unchecked");
  });

  it("a thin sample blocks ACTIVE", () => {
    expect(evaluateLedgerStatus(candidate({ sampleSize: 40 })).activeBlockers).toContain("sample<100");
  });
});

describe("rejection + re-run rules", () => {
  it("settlement-negative is REJECTED", () => {
    const v = evaluateLedgerStatus(candidate({ settlement: "fail" }));
    expect(v.maxStatus).toBe("REJECTED");
    expect(v.rejected).toBe(true);
  });

  it("OOS-fail and FDR-fail are REJECTED", () => {
    expect(evaluateLedgerStatus(candidate({ oos: "fail" })).maxStatus).toBe("REJECTED");
    expect(evaluateLedgerStatus(candidate({ fdr: "fail" })).maxStatus).toBe("REJECTED");
  });

  it("future contamination forces REJECTED + re-run", () => {
    const v = evaluateLedgerStatus(candidate({ futureContamination: true }));
    expect(v.maxStatus).toBe("REJECTED");
    expect(v.needsRerun).toBe(true);
  });

  it("a data-quality bug caps at WATCHLIST and forces re-run", () => {
    const v = evaluateLedgerStatus(candidate({ dataQualityClean: false }));
    expect(v.maxStatus).toBe("WATCHLIST");
    expect(v.needsRerun).toBe(true);
  });

  it("missing required fields is REJECTED", () => {
    expect(requiredFieldsComplete(candidate({ structuralReason: "" }))).toBe(false);
    expect(evaluateLedgerStatus(candidate({ structuralReason: "  " })).maxStatus).toBe("REJECTED");
  });
});

describe("promote() never exceeds the permitted status", () => {
  it("grants at/below max and denies above", () => {
    const c = candidate({ settlement: "not_run" }); // SHADOW_READY max
    expect(promote(c, "SHADOW_READY").allowed).toBe(true);
    expect(promote(c, "SHADOW_COLLECTING").allowed).toBe(true);
    const denied = promote(c, "ACTIVE");
    expect(denied.allowed).toBe(false);
    expect(denied.grantedStatus).toBe("SHADOW_READY");
  });
});
