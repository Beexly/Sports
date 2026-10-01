import { describe, expect, it } from "vitest";
import {
  laplacianVariance,
  reidentifyAfterGap,
  torsoRegion,
  type ImageCrop,
  type JerseyOcrEngine,
  type TrackletCrop,
} from "./cv-jersey-ocr.js";
import type { VideoFrame } from "./cv-detector-contract.js";

/** 40×40 crop with high-contrast digit-like bars ("12"). */
function sharpDigitCrop(): ImageCrop {
  const W = 40;
  const H = 40;
  const pixels: number[][] = Array.from({ length: H }, () =>
    new Array(W).fill(100),
  );
  const bar = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) pixels[y]![x] = 255;
  };
  bar(8, 6, 11, 34); // "1"
  bar(20, 6, 30, 9); // "2" top
  bar(20, 18, 30, 21); // "2" mid
  bar(20, 31, 30, 34); // "2" bottom
  bar(27, 9, 30, 18);
  bar(20, 21, 23, 31);
  return { pixels, width: W, height: H };
}

/** 3×3 box blur (simulates motion blur). */
function blurCrop(crop: ImageCrop): ImageCrop {
  const { pixels, width, height } = crop;
  const out: number[][] = Array.from({ length: height }, () =>
    new Array(width).fill(0),
  );
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < width && yy < height) {
            s += pixels[yy]?.[xx] ?? 0;
            n++;
          }
        }
      }
      out[y]![x] = s / n;
    }
  }
  return { pixels: out, width, height };
}

function stubEngine(digits: string | null): JerseyOcrEngine {
  return { readDigits: () => digits };
}

const sharp = sharpDigitCrop();
const blurred = blurCrop(sharp);
const sharpVar = laplacianVariance(sharp);
const blurredVar = laplacianVariance(blurred);
// Threshold cleanly between the two.
const threshold = (sharpVar + blurredVar) / 2;

function mkCrops(): TrackletCrop[] {
  return [
    { crop: blurred, t: 1.0 },
    { crop: sharp, t: 2.0 },
  ];
}

describe("cv-jersey-ocr (K2 re-ID)", () => {
  it("sharpness orders: sharp >> blurred", () => {
    expect(sharpVar).toBeGreaterThan(blurredVar * 5);
  });

  it("exact digit match on a sharp crop → stitch with provenance", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: "12" },
      "mtrk-0007",
      mkCrops(),
      stubEngine("12"),
      { sharpnessThreshold: threshold, rosterNumbers: new Set(["12", "34"]) },
    );
    expect(prov).not.toBeNull();
    expect(prov?.method).toBe("jersey-ocr");
    expect(prov?.digits).toBe("12");
    expect(prov?.deadTrackletId).toBe("trk-0001");
    expect(prov?.newTrackletId).toBe("mtrk-0007");
    expect(prov?.cropT).toBe(2.0); // the sharp crop won
  });

  it("blur below threshold → no stitch (fail-closed, never guesses)", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: "12" },
      "mtrk-0007",
      [{ crop: blurred, t: 1.0 }],
      stubEngine("12"),
      { sharpnessThreshold: threshold },
    );
    expect(prov).toBeNull();
  });

  it("digit mismatch → no stitch", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: "12" },
      "mtrk-0007",
      mkCrops(),
      stubEngine("34"),
      { sharpnessThreshold: threshold, rosterNumbers: new Set(["12", "34"]) },
    );
    expect(prov).toBeNull();
  });

  it("unreadable digits (OCR null) → no stitch", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: "12" },
      "mtrk-0007",
      mkCrops(),
      stubEngine(null),
      { sharpnessThreshold: threshold },
    );
    expect(prov).toBeNull();
  });

  it("digits outside the roster → no stitch", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: "99" },
      "mtrk-0007",
      mkCrops(),
      stubEngine("99"),
      { sharpnessThreshold: threshold, rosterNumbers: new Set(["12", "34"]) },
    );
    expect(prov).toBeNull();
  });

  it("unknown dead-tracklet number → no stitch (fail-closed)", () => {
    const prov = reidentifyAfterGap(
      { id: "trk-0001", jerseyNumber: null },
      "mtrk-0007",
      mkCrops(),
      stubEngine("12"),
      { sharpnessThreshold: threshold },
    );
    expect(prov).toBeNull();
  });

  it("torsoRegion extracts the central digit zone", () => {
    const frame: VideoFrame = {
      index: 0,
      t: 0,
      pixels: Array.from({ length: 100 }, () => new Array(60).fill(128)),
      width: 60,
      height: 100,
    };
    const crop = torsoRegion(frame, { x: 10, y: 10, width: 40, height: 80 });
    expect(crop).not.toBeNull();
    // x: 10+10=20 .. 10+30=40 → 20 wide; y: 10+20=30 .. 10+56=66 → 36 tall.
    expect(crop?.width).toBe(20);
    expect(crop?.height).toBe(36);
    expect(torsoRegion(frame, { x: 0, y: 0, width: 4, height: 4 })).toBeNull();
  });
});
