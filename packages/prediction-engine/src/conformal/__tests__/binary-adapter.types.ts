/**
 * Shared TypeScript types for conformal / Mondrian / binary-adapter tests.
 *
 * Keeps fixtures and assertions typed without leaking into the production barrel.
 * Import only from test files.
 */

import type { SportsGameContext } from "../sports-taxonomy.js";
import type {
  BinaryPickSample,
  BinaryConformalFit,
  BinaryConformalLookup,
  AdaptiveBinaryInterval,
} from "../binary-adapter.js";
import type { QuantileLookupResult } from "../mondrian.js";
import type { BrierDecomposition, CalibrationSample } from "../../probability-calibration.js";

/** Fixture context for taxonomy tests. */
export type TestGameContext = SportsGameContext;

/** One settled binary pick used in adapter fixtures. */
export type TestBinaryPick = BinaryPickSample;

/** Expected shape of fitBinaryMondrian output in assertions. */
export type TestBinaryFit = BinaryConformalFit;

/** Expected shape of binaryConformalLookup output. */
export type TestBinaryLookup = BinaryConformalLookup;

/** Expected shape of adaptiveBinaryConformal rows. */
export type TestAdaptiveInterval = AdaptiveBinaryInterval;

/** Quantile lookup assertion helper. */
export type TestQuantileResult = QuantileLookupResult;

/** Murphy decomposition pin. */
export type TestBrierDecomposition = BrierDecomposition;

/** Calibration sample for Murphy identity tests. */
export type TestCalibrationSample = CalibrationSample;

/** Shadow contract every conformal test return must satisfy. */
export interface ShadowContract {
  readonly priced: false;
  readonly status: "shadow";
}

/** Assert helper input for hierarchical fallback expectations. */
export interface FallbackExpectation {
  readonly usedFallback: boolean;
  readonly category: string;
  readonly minSampleSize: number;
  readonly chainContains?: readonly string[];
}

/** Options for building synthetic binary streams. */
export interface SyntheticBinaryStreamOptions {
  readonly n: number;
  readonly p: number;
  readonly ctx: TestGameContext;
  readonly idPrefix?: string;
}
