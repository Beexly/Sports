import { describe, expect, it } from "vitest";
import { resolveHomography } from "./cv-homography-source.js";
import { DegenerateCorrespondencesError } from "./cv-homography.js";
import type { VideoFrame } from "./cv-detector-contract.js";
import type { Homography } from "./cv-movement-primitive.js";

/** Blank frame: no yard lines detectable → DLT path is degenerate. */
function blankFrame(): VideoFrame {
  return {
    index: 0,
    t: 0,
    pixels: Array.from({ length: 40 }, () => new Array(64).fill(128)),
    width: 64,
    height: 40,
  };
}

const SEED_H: Homography = {
  h11: 0.1, h12: 0, h13: 0,
  h21: 0, h22: 0.1, h23: 0,
  h31: 0, h32: 0, h33: 1,
};

const ANCHOR = { losYard: 25, losImageX: 32, side: "own" as const };

describe("cv-homography-source", () => {
  it("provided homography wins without touching detection", () => {
    const r = resolveHomography(blankFrame(), { homography: SEED_H });
    expect(r.method).toBe("provided");
    expect(r.homography).toBe(SEED_H);
  });

  it("no source at all → throws", () => {
    expect(() => resolveHomography(blankFrame(), {})).toThrow(
      /no homography and no deriveFromLandmarks/,
    );
  });

  it("degenerate landmarks + hand seed → hand-seed-fallback (no crash)", () => {
    const r = resolveHomography(blankFrame(), {
      deriveFromLandmarks: {
        losAnchor: ANCHOR,
        fallbackHomography: SEED_H,
      },
    });
    expect(r.method).toBe("hand-seed-fallback");
    expect(r.homography).toBe(SEED_H);
    expect(r.detail).toMatch(/hand-seeded fallback/);
  });

  it("degenerate landmarks + no hand seed → rethrows DegenerateCorrespondencesError", () => {
    expect(() =>
      resolveHomography(blankFrame(), {
        deriveFromLandmarks: { losAnchor: ANCHOR },
      }),
    ).toThrow(DegenerateCorrespondencesError);
  });
});
