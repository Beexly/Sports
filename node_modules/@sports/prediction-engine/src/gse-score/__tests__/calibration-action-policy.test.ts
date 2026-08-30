import { describe, expect, it } from "vitest";
import {
  calibrationActionCap,
  calibrationRequiresHardPass,
  calibrationRiskSeverity,
} from "../calibration-action-policy.js";
import type { CalibrationContractResult, CalibrationContractStatus } from "../calibration-contract.js";

const STATUS_POLICY: readonly {
  readonly cap: number;
  readonly hardPass: boolean;
  readonly severity: number;
  readonly status: CalibrationContractStatus;
}[] = [
  { cap: 100, hardPass: false, severity: 0, status: "VALIDATED" },
  { cap: 54, hardPass: false, severity: 0.65, status: "WATCH" },
  { cap: 54, hardPass: false, severity: 0.8, status: "INSUFFICIENT_SAMPLE" },
  { cap: 24, hardPass: true, severity: 1, status: "DRIFTING" },
  { cap: 24, hardPass: true, severity: 1, status: "BLOCKED" },
];

describe("calibration action policy", () => {
  it("maps every calibration status to cap, hard-pass, and risk severity", () => {
    for (const row of STATUS_POLICY) {
      expect(calibrationActionCap(row.status)).toBe(row.cap);
      expect(calibrationRequiresHardPass(row.status)).toBe(row.hardPass);
      expect(calibrationRiskSeverity(row.status)).toBe(row.severity);
    }
  });

  it("throws from the assertNever default when the status is not in the union", () => {
    const invalidStatus = "NOT_A_STATUS" as unknown as CalibrationContractResult["status"];

    expect(() => calibrationActionCap(invalidStatus)).toThrow("Unexpected calibration status: NOT_A_STATUS");
    expect(() => calibrationRequiresHardPass(invalidStatus)).toThrow(
      "Unexpected calibration status: NOT_A_STATUS",
    );
    expect(() => calibrationRiskSeverity(invalidStatus)).toThrow("Unexpected calibration status: NOT_A_STATUS");
  });
});
