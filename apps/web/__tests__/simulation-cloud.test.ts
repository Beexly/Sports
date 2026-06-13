import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cloudGeometry,
  WIDE_SPREAD_PP,
} from "@/lib/market/simulation-cloud-geometry";

/**
 * Simulation Cloud — distribution, not fake certainty. Pins the geometry's
 * honesty rules (real samples only, labeled zoom, null guards) and the
 * surface wiring.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("cloudGeometry", () => {
  it("renders one dot per real sample with the consensus inside the domain", () => {
    const geo = cloudGeometry([0.52, 0.55, 0.58], 0.55);
    expect(geo).not.toBeNull();
    expect(geo!.dots).toHaveLength(3);
    expect(geo!.spreadPp).toBeCloseTo(6, 1);
    for (const dot of geo!.dots) {
      expect(dot.leftPct).toBeGreaterThanOrEqual(0);
      expect(dot.leftPct).toBeLessThanOrEqual(100);
    }
    expect(geo!.consensusLeftPct).toBeGreaterThan(0);
    expect(geo!.consensusLeftPct).toBeLessThan(100);
    // The labeled domain brackets every sample — zoom can't hide a book.
    expect(geo!.loProb).toBeLessThanOrEqual(0.52);
    expect(geo!.hiProb).toBeGreaterThanOrEqual(0.58);
  });

  it("positions dots monotonically — order on screen is order in probability", () => {
    const geo = cloudGeometry([0.4, 0.5, 0.6], 0.5)!;
    const [a, b, c] = geo.dots;
    expect(a!.leftPct).toBeLessThan(b!.leftPct);
    expect(b!.leftPct).toBeLessThan(c!.leftPct);
  });

  it("refuses a cloud of one — that's a point wearing a costume", () => {
    expect(cloudGeometry([0.55], 0.55)).toBeNull();
    expect(cloudGeometry([], 0.5)).toBeNull();
  });

  it("filters degenerate samples instead of plotting them", () => {
    expect(cloudGeometry([0.55, NaN, 0], 0.55)).toBeNull(); // one real sample left
    const geo = cloudGeometry([0.52, 0.56, Infinity], 0.54);
    expect(geo).not.toBeNull();
    expect(geo!.dots).toHaveLength(2);
  });

  it("keeps tight clouds readable without faking dispersion", () => {
    const geo = cloudGeometry([0.549, 0.551], 0.55)!;
    // Domain widened to the minimum span, but the SPREAD stays the honest number.
    expect(geo.hiProb - geo.loProb).toBeGreaterThanOrEqual(0.0599);
    expect(geo.spreadPp).toBeCloseTo(0.2, 1);
  });

  it("clamps the domain to [0,1] for extreme favourites", () => {
    const geo = cloudGeometry([0.97, 0.99], 0.98)!;
    expect(geo.hiProb).toBeLessThanOrEqual(1);
    expect(geo.loProb).toBeGreaterThanOrEqual(0);
  });

  it("wide-spread threshold is a named constant, not a magic number", () => {
    expect(WIDE_SPREAD_PP).toBeGreaterThan(0);
  });
});

describe("Simulation Cloud surface wiring", () => {
  const component = read("components/observatory/simulation-cloud.tsx");
  const board = read("components/observatory/market-fair-board.tsx");

  it("the fair board mounts the cloud with per-book samples", () => {
    expect(board).toContain("SimulationCloud");
    expect(board).toContain("fairHomeProbsByBook");
  });

  it("labels the zoomed axis endpoints so the zoom cannot lie", () => {
    expect(component).toContain("loProb");
    expect(component).toContain("hiProb");
    expect(component).toContain("formatRatioAsPercent");
  });

  it("states what the dots are — real books, not simulated variance", () => {
    expect(component).toMatch(/one dot per book/i);
    expect(board).toMatch(/not a simulated variance/i);
  });
});
