import { describe, expect, it } from "vitest";
import {
  PHASE_C_BASELINE,
  NON_BOOK_METHODOLOGY,
  parseTuple,
  recordPhaseCRemeasure,
  formatAgentReport,
} from "../remeasure.js";

describe("phase-c remeasure", () => {
  it("parses baseline tuple", () => {
    const t = parseTuple(PHASE_C_BASELINE.tuple);
    expect(t).not.toBeNull();
    expect(t!.fields.fiveB).toBe(0);
  });

  it("refuses when not measured", () => {
    const r = recordPhaseCRemeasure({
      path: "odds_api",
      oddsKeyPaid: null,
      cronRefreshOk: null,
      gateScriptRan: false,
      measuredAt: null,
      measuredTuple: null,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.stillUnverified).toBe(true);
    expect(r.code).toBe("not_measured");
  });

  it("odds path refuses without paid key", () => {
    const r = recordPhaseCRemeasure({
      path: "odds_api",
      oddsKeyPaid: false,
      cronRefreshOk: true,
      gateScriptRan: true,
      measuredAt: "2026-07-29T00:00:00.000Z",
      measuredTuple: "900|360|280|0|(5b)=1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("odds_key_unpaid");
  });

  it("records non-book path without claimable official 5b", () => {
    const r = recordPhaseCRemeasure({
      path: "non_book_gamma_model",
      oddsKeyPaid: false,
      cronRefreshOk: true,
      gateScriptRan: true,
      measuredAt: "2026-07-29T00:00:00.000Z",
      measuredTuple: "890|355|285|0|(5b)=0",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.claimableAsOfficial5b).toBe(false);
    expect(r.delta.f1).toBe(2);
  });

  it("official path claimable when paid + measured", () => {
    const r = recordPhaseCRemeasure({
      path: "odds_api",
      oddsKeyPaid: true,
      cronRefreshOk: true,
      gateScriptRan: true,
      measuredAt: "2026-07-29T00:00:00.000Z",
      measuredTuple: "900|360|280|1|(5b)=2",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.claimableAsOfficial5b).toBe(true);
    expect(r.delta.fiveB).toBe(2);
    expect(formatAgentReport(r)).toContain("CLAIMABLE_OFFICIAL_5B=true");
  });

  it("non-book methodology never replaces official", () => {
    expect(NON_BOOK_METHODOLOGY.replacesOfficial5b).toBe(false);
    expect(NON_BOOK_METHODOLOGY.requiresOddsApi).toBe(false);
  });
});
