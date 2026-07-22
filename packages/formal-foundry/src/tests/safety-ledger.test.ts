import { describe, expect, it } from "vitest";
import { SafetyLedger } from "../safety-ledger.js";

describe("SafetyLedger", () => {
  it("records an entry with an auto-stamped timestamp", () => {
    const ledger = new SafetyLedger();
    ledger.record({
      pr: "test-pr",
      invariantsChecked: ["TypeOK"],
      ctiCount: 0,
      status: "PASSED",
      verifier: "Apalache+IC3",
    });
    const log = ledger.getLog();
    expect(log).toHaveLength(1);
    expect(log[0]!.pr).toBe("test-pr");
    expect(log[0]!.timestamp).toBeTruthy();
    expect(() => new Date(log[0]!.timestamp).toISOString()).not.toThrow();
  });

  it("summary() aggregates passed count and CTI total across entries", () => {
    const ledger = new SafetyLedger();
    ledger.record({ pr: "a", invariantsChecked: [], ctiCount: 0, status: "PASSED", verifier: "Owner" });
    ledger.record({ pr: "b", invariantsChecked: [], ctiCount: 2, status: "REJECTED", verifier: "Apalache+IC3" });
    ledger.record({ pr: "c", invariantsChecked: [], ctiCount: 1, status: "PASSED", verifier: "Lifting" });
    const summary = ledger.summary();
    expect(summary).toContain("Proof-gated changes: 2");
    expect(summary).toContain("CTIs recorded: 3");
    expect(summary).toContain("Total entries: 3");
  });

  it("clear() empties the log", () => {
    const ledger = new SafetyLedger();
    ledger.record({ pr: "a", invariantsChecked: [], ctiCount: 0, status: "PASSED", verifier: "Owner" });
    expect(ledger.getLog()).toHaveLength(1);
    ledger.clear();
    expect(ledger.getLog()).toHaveLength(0);
  });

  it("record() is silent (no console I/O side effect — fixed defect)", () => {
    const ledger = new SafetyLedger();
    const originalLog = console.log;
    let called = false;
    console.log = (() => {
      called = true;
    }) as typeof console.log;
    try {
      ledger.record({ pr: "silent-check", invariantsChecked: [], ctiCount: 0, status: "PASSED", verifier: "Owner" });
    } finally {
      console.log = originalLog;
    }
    expect(called).toBe(false);
  });
});
