/**
 * cv-homography-source.ts — field-homography resolution for the pipeline.
 *
 * Chain: detect landmarks on the reference frame → guard (enough yard
 * lines, non-degenerate geometry) → label with the LOS anchor →
 * fitHomographyDLT → independent scale cross-check (Sloan px/yard from
 * 5-yard line spacing vs the fitted homography's local Jacobian).
 *
 * On DegenerateCorrespondencesError (too few / collinear / scale-mismatched
 * correspondences) the resolver falls back to a caller-provided hand-seeded
 * homography instead of dying — a broadcast pipeline must degrade, not crash,
 * when the field is temporarily unreadable. With no fallback, it rethrows.
 */

import type { VideoFrame } from "./cv-detector-contract.js";
import {
  calibrateYardScale,
  detectFieldLandmarks,
  labelYardLines,
  landmarksToCorrespondences,
  type LosAnchor,
} from "./cv-field-landmarks.js";
import {
  DegenerateCorrespondencesError,
  fitHomographyDLT,
  validateHomographyScale,
} from "./cv-homography.js";
import type { Homography } from "./cv-movement-primitive.js";

export interface LandmarkHomographyOptions {
  /** LOS anchor for yard-line labeling (required for the DLT path). */
  readonly losAnchor: LosAnchor;
  /** Scale cross-check tolerance, percent. Default 10. */
  readonly scaleTolerancePct?: number;
  /** Hand-seeded fallback when DLT is degenerate. */
  readonly fallbackHomography?: Homography;
}

export interface HomographySource {
  /** Precomputed homography — takes precedence, skips detection. */
  readonly homography?: Homography;
  /** Derive from field landmarks on the reference frame. */
  readonly deriveFromLandmarks?: LandmarkHomographyOptions;
}

export type HomographyMethod =
  | "provided"
  | "landmarks-dlt"
  | "hand-seed-fallback";

export interface HomographyResolution {
  readonly homography: Homography;
  readonly method: HomographyMethod;
  readonly detail: string;
}

/**
 * Resolve the pixels→meters field homography. Pure except for detection.
 * Throws DegenerateCorrespondencesError only when the DLT path fails AND
 * no hand-seeded fallback was provided.
 */
export function resolveHomography(
  referenceFrame: VideoFrame,
  source: HomographySource,
): HomographyResolution {
  if (source.homography != null) {
    return {
      homography: source.homography,
      method: "provided",
      detail: "caller-provided homography",
    };
  }
  const opts = source.deriveFromLandmarks;
  if (opts == null) {
    throw new Error(
      "resolveHomography: no homography and no deriveFromLandmarks options",
    );
  }
  const scaleTolerancePct = opts.scaleTolerancePct ?? 10;

  const useFallback = (reason: string | Error): HomographyResolution => {
    if (opts.fallbackHomography == null) {
      throw reason instanceof Error ? reason : new Error(String(reason));
    }
    return {
      homography: opts.fallbackHomography,
      method: "hand-seed-fallback",
      detail: `hand-seeded fallback (${reason instanceof Error ? reason.message : reason})`,
    };
  };

  try {
    // 1. Landmarks.
    const lm = detectFieldLandmarks(referenceFrame);
    // 2. Guard: need ≥2 yard lines for scale calibration and a fighting
    //    chance at 4+ correspondences.
    if (lm.yardLines.length < 2) {
      throw new DegenerateCorrespondencesError(
        "too-few",
        `only ${lm.yardLines.length} yard line(s) detected`,
      );
    }
    // 3. Label + correspondences (throws DegenerateCorrespondencesError
    //    on degenerate geometry, even on empty).
    const labeled = labelYardLines(lm, opts.losAnchor);
    const corr = landmarksToCorrespondences(labeled);
    // 4. Fit.
    const h = fitHomographyDLT(corr);
    // 5. Independent scale cross-check: Sloan px/yard from 5-yard spacing
    //    vs the fitted homography's local scale at frame center.
    const pxPerYard = calibrateYardScale(lm.yardLines);
    validateHomographyScale(
      h,
      pxPerYard,
      {
        xPx: referenceFrame.width / 2,
        yPx: referenceFrame.height / 2,
      },
      scaleTolerancePct,
    );
    return {
      homography: h,
      method: "landmarks-dlt",
      detail: `${corr.length} correspondences, scale ${pxPerYard.toFixed(1)} px/yd`,
    };
  } catch (err) {
    if (err instanceof DegenerateCorrespondencesError) {
      return useFallback(err);
    }
    throw err;
  }
}
