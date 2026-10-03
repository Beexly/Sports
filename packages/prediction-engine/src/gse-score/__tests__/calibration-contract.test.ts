import { describe, expect, it } from "vitest";
import {
  assessCalibrationContract,
  type CalibrationContractInput,
  type CalibrationContractStatus,
} from "../calibration-contract.js";

function sufficientSample(overrides: Partial<CalibrationContractInput> = {}): CalibrationContractInput {
  return {
    baselineBrierScore: 0.25,
    brierScore: 0.2,
    driftScore: 0.02,
    expectedCalibrationError: 0.03,
    sampleCount: 250,
    ...overrides,
  };
}

const noProbabilityClaims: readonly CalibrationContractStatus[] = [
  "INSUFFICIENT_SAMPLE",
  "BLOCKED",
  "DRIFTING",
  "WATCH",
];

describe("assessCalibrationContract", () => {
  it("returns INSUFFICIENT_SAMPLE before later gates when sampleCount is below the required floor", () => {
    const result = assessCalibrationContract({
      expectedCalibrationError: undefined,
      sampleCount: 249,
    });

    expect(result.status).toBe("INSUFFICIENT_SAMPLE");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.scoreModifier).toBe(-18);
    expect(result.reasons).toEqual(["Calibration sample 249 is below required 250."]);
  });

  it("honors a custom minSampleCount for the insufficient-sample gate", () => {
    const result = assessCalibrationContract({
      minSampleCount: 10,
      sampleCount: 9,
    });

    expect(result.status).toBe("INSUFFICIENT_SAMPLE");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.reasons).toEqual(["Calibration sample 9 is below required 10."]);
  });

  it("blocks when expected calibration error is missing after the sample floor is met", () => {
    const result = assessCalibrationContract({
      driftScore: 0.9,
      sampleCount: 250,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.scoreModifier).toBe(-25);
    expect(result.reasons).toEqual(["Expected calibration error is missing."]);
  });

  it("blocks when expected calibration error is not finite", () => {
    const nanResult = assessCalibrationContract(sufficientSample({ expectedCalibrationError: Number.NaN }));
    const infiniteResult = assessCalibrationContract(
      sufficientSample({ expectedCalibrationError: Number.POSITIVE_INFINITY }),
    );

    expect(nanResult.status).toBe("BLOCKED");
    expect(nanResult.probabilityClaimsAllowed).toBe(false);
    expect(infiniteResult.status).toBe("BLOCKED");
    expect(infiniteResult.probabilityClaimsAllowed).toBe(false);
  });

  it("returns DRIFTING when drift exceeds the max after ECE is present", () => {
    const result = assessCalibrationContract(
      sufficientSample({
        driftScore: 0.1001,
        expectedCalibrationError: 0.2,
      }),
    );

    expect(result.status).toBe("DRIFTING");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.scoreModifier).toBe(-22);
    expect(result.reasons).toEqual(["Calibration drift 0.1001 exceeds 0.1."]);
  });

  it("treats missing drift as zero so the default max does not fire", () => {
    const result = assessCalibrationContract(
      sufficientSample({
        driftScore: undefined,
      }),
    );

    expect(result.status).toBe("VALIDATED");
    expect(result.probabilityClaimsAllowed).toBe(true);
  });

  it("returns WATCH when ECE exceeds the local max after drift is inside bounds", () => {
    const result = assessCalibrationContract(
      sufficientSample({
        driftScore: 0.1,
        expectedCalibrationError: 0.0601,
      }),
    );

    expect(result.status).toBe("WATCH");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.scoreModifier).toBe(-12);
    expect(result.reasons).toEqual(["ECE 0.0601 exceeds 0.06."]);
  });

  it("returns WATCH when Brier is worse than baseline after ECE and drift pass", () => {
    const result = assessCalibrationContract(
      sufficientSample({
        baselineBrierScore: 0.21,
        brierScore: 0.2101,
        expectedCalibrationError: 0.06,
      }),
    );

    expect(result.status).toBe("WATCH");
    expect(result.probabilityClaimsAllowed).toBe(false);
    expect(result.scoreModifier).toBe(-10);
    expect(result.reasons).toEqual(["Brier score is worse than baseline."]);
  });

  it("does not watch when only one of Brier or baseline is present", () => {
    const missingBaseline = assessCalibrationContract(sufficientSample({ baselineBrierScore: undefined, brierScore: 0.9 }));
    const missingBrier = assessCalibrationContract(sufficientSample({ baselineBrierScore: 0.1, brierScore: undefined }));
    const equalBrier = assessCalibrationContract(sufficientSample({ baselineBrierScore: 0.2, brierScore: 0.2 }));

    expect(missingBaseline.status).toBe("VALIDATED");
    expect(missingBrier.status).toBe("VALIDATED");
    expect(equalBrier.status).toBe("VALIDATED");
  });

  it("returns VALIDATED only when sample, ECE, drift, and baseline checks pass", () => {
    const result = assessCalibrationContract(sufficientSample());

    expect(result.status).toBe("VALIDATED");
    expect(result.probabilityClaimsAllowed).toBe(true);
    expect(result.scoreModifier).toBe(8);
    expect(result.reasons).toEqual([
      "Calibration sample, ECE, drift, and baseline checks are within local thresholds.",
    ]);
  });

  it("allows probability claims only for VALIDATED", () => {
    const byStatus: Record<CalibrationContractStatus, ReturnType<typeof assessCalibrationContract>> = {
      BLOCKED: assessCalibrationContract({ sampleCount: 250 }),
      DRIFTING: assessCalibrationContract(sufficientSample({ driftScore: 0.2 })),
      INSUFFICIENT_SAMPLE: assessCalibrationContract({ sampleCount: 0 }),
      VALIDATED: assessCalibrationContract(sufficientSample()),
      WATCH: assessCalibrationContract(sufficientSample({ expectedCalibrationError: 0.2 })),
    };

    expect(byStatus.VALIDATED.probabilityClaimsAllowed).toBe(true);
    for (const status of noProbabilityClaims) {
      expect(byStatus[status].status).toBe(status);
      expect(byStatus[status].probabilityClaimsAllowed).toBe(false);
    }
  });
});
