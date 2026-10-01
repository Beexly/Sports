/**
 * cv-jersey-ocr.ts — K2: jersey-digit OCR re-ID for long-gap reappearances.
 *
 * When a tracklet dies in a pile and a new one is born later, motion
 * continuity can't bridge the gap. Jersey digits are the fail-closed
 * re-ID: read the digits from the sharpest torso crops (Laplacian-variance
 * ranking), and stitch only on an exact match against the dead tracklet's
 * known number (and the roster). Blur below threshold, unreadable digits,
 * or any mismatch → NO stitch, never a guess.
 *
 * The OCR engine itself is injectable (build-time choice, e.g. PaddleOCR);
 * this module owns the gating, ranking, and provenance. Pure logic —
 * no weights, no network.
 */

import type { BoundingBox, VideoFrame } from "./cv-detector-contract.js";

/** Grayscale crop. */
export interface ImageCrop {
  readonly pixels: readonly (readonly number[])[];
  readonly width: number;
  readonly height: number;
}

/** Injectable digit reader (PaddleOCR or equivalent at build time). */
export interface JerseyOcrEngine {
  /**
   * Read jersey digits from a torso crop. Returns the digit string
   * (e.g. "12") or null when unreadable. Must never guess — null on
   * low confidence.
   */
  readDigits(crop: ImageCrop): string | null;
}

export interface TrackletCrop {
  readonly crop: ImageCrop;
  /** Timestamp of the source frame, seconds. */
  readonly t: number;
}

/**
 * Sharpness via Laplacian variance (higher = sharper). Standard
 * focus measure; the sharpest frames survive motion blur.
 */
export function laplacianVariance(crop: ImageCrop): number {
  const { pixels, width, height } = crop;
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const lap =
        (pixels[y - 1]?.[x] ?? 0) +
        (pixels[y]?.[x - 1] ?? 0) +
        (pixels[y]?.[x + 1] ?? 0) +
        (pixels[y + 1]?.[x] ?? 0) -
        4 * (pixels[y]?.[x] ?? 0);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/**
 * Extract the torso region (jersey-digit zone) from a detection bbox:
 * central 50% of width, 25–70% of height. Returns null if the bbox is
 * too small to hold digits.
 */
export function torsoRegion(frame: VideoFrame, bbox: BoundingBox): ImageCrop | null {
  const x0 = Math.floor(bbox.x + bbox.width * 0.25);
  const x1 = Math.ceil(bbox.x + bbox.width * 0.75);
  const y0 = Math.floor(bbox.y + bbox.height * 0.25);
  const y1 = Math.ceil(bbox.y + bbox.height * 0.7);
  const width = x1 - x0;
  const height = y1 - y0;
  if (width < 8 || height < 8) return null;
  const pixels: number[][] = [];
  for (let y = y0; y < y1; y++) {
    const row: number[] = [];
    for (let x = x0; x < x1; x++) {
      row.push(frame.pixels[y]?.[x] ?? 0);
    }
    pixels.push(row);
  }
  return { pixels, width, height };
}

export interface DeadTrackletInfo {
  readonly id: string;
  /** Known jersey number, or null if never observed. */
  readonly jerseyNumber: string | null;
}

export interface ReidentifyOptions {
  /** Crops below this Laplacian variance are skipped (fail-closed). */
  sharpnessThreshold?: number;
  /** How many of the sharpest crops to attempt. Default 3. */
  topK?: number;
  /** Valid roster numbers; digits outside are rejected. Optional. */
  rosterNumbers?: ReadonlySet<string>;
}

export interface JerseyStitchProvenance {
  readonly method: "jersey-ocr";
  readonly digits: string;
  readonly cropSharpness: number;
  readonly cropT: number;
  readonly deadTrackletId: string;
  readonly newTrackletId: string;
}

/**
 * Attempt to re-identify a new tracklet as a dead one via jersey digits.
 * Returns stitch provenance on an exact, gated match; null otherwise.
 * Fail-closed: blur, unreadable digits, roster rejection, number mismatch,
 * or an unknown dead number all yield null — never a guess.
 */
export function reidentifyAfterGap(
  dead: DeadTrackletInfo,
  newTrackletId: string,
  crops: readonly TrackletCrop[],
  engine: JerseyOcrEngine,
  options: ReidentifyOptions = {},
): JerseyStitchProvenance | null {
  const sharpnessThreshold = options.sharpnessThreshold ?? 100;
  const topK = options.topK ?? 3;
  const roster = options.rosterNumbers;

  if (dead.jerseyNumber == null) return null; // nothing to match against
  if (crops.length === 0) return null;

  const ranked = crops
    .map((c) => ({ ...c, sharpness: laplacianVariance(c.crop) }))
    .sort((a, b) => b.sharpness - a.sharpness)
    .slice(0, topK);

  for (const c of ranked) {
    if (c.sharpness < sharpnessThreshold) continue; // fail-closed on blur
    const digits = engine.readDigits(c.crop);
    if (digits == null) continue;
    if (roster != null && !roster.has(digits)) continue;
    if (digits !== dead.jerseyNumber) continue;
    return {
      method: "jersey-ocr",
      digits,
      cropSharpness: c.sharpness,
      cropT: c.t,
      deadTrackletId: dead.id,
      newTrackletId,
    };
  }
  return null;
}
