import { brierScore } from "./brier";
import { expectedCalibrationError, maximumCalibrationError, confidenceBuckets } from "./ece";
import { isDisplaySafe } from "./display-safety";
export function buildCalibrationReport(samples: readonly { readonly probability: number; readonly outcome: 0 | 1 }[], displaySafe: boolean) { return { sampleSize: samples.length, displaySafe: isDisplaySafe({ sampleSize: samples.length, displaySafe }), brier: brierScore(samples), ece: expectedCalibrationError(samples), maxCalibrationError: maximumCalibrationError(samples), buckets: confidenceBuckets(samples) }; }
