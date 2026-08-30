import type { CalibrationContractResult } from "./calibration-contract.js";

export function calibrationActionCap(status: CalibrationContractResult["status"]): number {
  switch (status) {
    case "VALIDATED":
      return 100;
    case "WATCH":
    case "INSUFFICIENT_SAMPLE":
      return 54;
    case "DRIFTING":
    case "BLOCKED":
      return 24;
    default:
      return assertNever(status);
  }
}

export function calibrationRequiresHardPass(status: CalibrationContractResult["status"]): boolean {
  switch (status) {
    case "DRIFTING":
    case "BLOCKED":
      return true;
    case "VALIDATED":
    case "WATCH":
    case "INSUFFICIENT_SAMPLE":
      return false;
    default:
      return assertNever(status);
  }
}

export function calibrationRiskSeverity(status: CalibrationContractResult["status"]): number {
  switch (status) {
    case "DRIFTING":
    case "BLOCKED":
      return 1;
    case "INSUFFICIENT_SAMPLE":
      return 0.8;
    case "WATCH":
      return 0.65;
    case "VALIDATED":
      return 0;
    default:
      return assertNever(status);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected calibration status: ${value}`);
}
