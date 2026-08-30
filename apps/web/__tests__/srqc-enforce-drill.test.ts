/**
 * Unit tests for the core (pure, exported) logic of
 * scripts/srqc-enforce-drill.ts, without spawning a process or setting
 * SRQC_DRILL / SRQC_ENFORCE in the real environment. See that file's doc
 * comment: this is a lab/staging-only drill script that does not touch any
 * DB, live traffic, or feature flag.
 */
import { describe, it, expect } from "vitest";
import {
  buildGe2DrillWindow,
  runSrqcEnforceDrill,
} from "../../../scripts/srqc-enforce-drill";
import { admitUnderSRQC } from "@/lib/ai-control-plane/srqc-projection";

describe("srqc-enforce-drill core logic", () => {
  it("buildGe2DrillWindow projects a GE2 (two-pending) violation", () => {
    const events = buildGe2DrillWindow();
    const result = admitUnderSRQC(events); // default SHADOW
    expect(
      result.violations.some((v) => v.pendingCountClass === "GE2"),
    ).toBe(true);
  });

  it("runSrqcEnforceDrill: ENFORCE refuses on the synthetic GE2 window", () => {
    const result = runSrqcEnforceDrill(new Date("2026-07-23T00:00:00.000Z"));
    expect(result.ge2Detected).toBe(true);
    expect(result.enforceRefused).toBe(true);
  });

  it("runSrqcEnforceDrill: default-mode (SHADOW) still admits on the same events", () => {
    const result = runSrqcEnforceDrill(new Date("2026-07-23T00:00:00.000Z"));
    expect(result.shadowStillAdmits).toBe(true);
  });

  it("runSrqcEnforceDrill: passes overall and reports the right shape", () => {
    const at = new Date("2026-07-23T00:00:00.000Z");
    const result = runSrqcEnforceDrill(at);
    expect(result).toEqual({
      kind: "srqc_enforce_drill",
      passed: true,
      at: at.toISOString(),
      ge2Detected: true,
      enforceRefused: true,
      shadowStillAdmits: true,
    });
  });

  it("never mutates process.env (env is passed as a synthetic object)", () => {
    const before = process.env.SRQC_ENFORCE;
    runSrqcEnforceDrill();
    expect(process.env.SRQC_ENFORCE).toBe(before);
  });
});
