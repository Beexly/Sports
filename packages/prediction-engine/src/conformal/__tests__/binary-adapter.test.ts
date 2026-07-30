/**
 * Unit tests for binary Mondrian adapter + taxonomy / residual invariants.
 *
 * Each test names the invariant it protects so a later "cleanup" cannot remove
 * a safety check without tripping over its reason (OMNIBUS quality law).
 */

import { describe, it, expect } from "vitest";
import {
  nonconformityBinary,
  fitBinaryMondrian,
  binaryConformalLookup,
  adaptiveBinaryConformal,
} from "../binary-adapter.js";
import {
  assignMondrianCategory,
  parentCategory,
  restBucket,
} from "../sports-taxonomy.js";
import { MondrianResidualManager } from "../mondrian.js";
import { brierDecomposition } from "../../probability-calibration.js";
import type {
  TestGameContext,
  TestBinaryPick,
  ShadowContract,
} from "./binary-adapter.types.js";

const ctxHomeFav: TestGameContext = {
  isHome: true,
  isFavorite: true,
  restDays: 6,
};

const ctxAwayDog: TestGameContext = {
  isHome: false,
  isFavorite: false,
  restDays: 10,
};

function assertShadow(x: ShadowContract): void {
  expect(x.priced).toBe(false);
  expect(x.status).toBe("shadow");
}

// ── Taxonomy hierarchy ──────────────────────────────────────────

describe("Mondrian taxonomy hierarchy", () => {
  it("assignMondrianCategory level-1 is home|favorite axes only", () => {
    // Protects: primary Mondrian key stays two-axis and sample-efficient
    const cat = assignMondrianCategory(
      { isHome: true, isFavorite: false, restDays: 5 },
      1,
    );
    expect(cat).toBe("home|underdog");
  });

  it("level-2 includes rest bucket", () => {
    // Protects: finer partition only when explicitly requested
    const cat = assignMondrianCategory(
      { isHome: false, isFavorite: true, restDays: 2 },
      2,
    );
    expect(cat).toBe("away|favorite|rest_short");
  });

  it("parentCategory walks the hierarchy toward global", () => {
    // Protects: hierarchical fallback chain used by MondrianResidualManager
    expect(parentCategory("home|favorite|rest_long")).toBe("home|favorite");
    expect(parentCategory("home|favorite")).toBe("home");
    expect(parentCategory("home")).toBeNull();
  });

  it("restBucket boundaries match design thresholds", () => {
    // Protects: rest axis cut-points (≤3 short, ≤7 normal, else long)
    expect(restBucket(3)).toBe("rest_short");
    expect(restBucket(4)).toBe("rest_normal");
    expect(restBucket(7)).toBe("rest_normal");
    expect(restBucket(8)).toBe("rest_long");
  });
});

// ── Residual manager + (n+1) quantile ───────────────────────────

describe("MondrianResidualManager hierarchical fallback", () => {
  it("falls back to parent when leaf is below minSamples", () => {
    // Protects: sparse-leaf conditional validity via parent category
    const mgr = new MondrianResidualManager({ minSamples: 3, useGlobalFallback: true });
    mgr.add("home|favorite", 0.2);
    mgr.addMany("home", [0.1, 0.15, 0.25, 0.3]);
    const result = mgr.quantile("home|favorite", 0.9);
    expect(result.usedFallback).toBe(true);
    expect(result.category).toBe("home");
    expect(result.sampleSize).toBeGreaterThanOrEqual(3);
    expect(result.fallbackChain).toContain("home|favorite");
    expect(result.fallbackChain).toContain("home");
  });

  it("returns honest zero when every store is empty", () => {
    // Protects: never invent a quantile from no data
    const mgr = new MondrianResidualManager({ minSamples: 10, useGlobalFallback: false });
    const result = mgr.quantile("home|favorite", 0.9);
    expect(result.quantile).toBe(0);
    expect(result.sampleSize).toBe(0);
  });

  it("finiteSampleQuantile uses (n+1) rank", () => {
    // Protects: split-conformal finite-sample correction (never under-cover vs n-rank)
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("home", [0.1, 0.2, 0.3, 0.9]);
    // n=4, p=0.8 → ceil((4+1)*0.8)=4 → 4th order statistic = 0.9
    const q = mgr.quantile("home", 0.8);
    expect(q.quantile).toBe(0.9);
  });
});

// ── Binary adapter ──────────────────────────────────────────────

describe("binary conformal adapter (shadow)", () => {
  it("nonconformityBinary is |p-y| and clamps bad input", () => {
    // Protects: score geometry and maximal nonconformity on non-finite p
    expect(nonconformityBinary(0.7, 1)).toBeCloseTo(0.3);
    expect(nonconformityBinary(0.7, 0)).toBeCloseTo(0.7);
    expect(nonconformityBinary(1, 1)).toBe(0);
    expect(nonconformityBinary(Number.NaN, 1)).toBe(1);
  });

  it("fit + lookup returns shadow markers and width = 2*quantile", () => {
    // Protects: never prices; interval geometry stays 2× residual quantile
    const samples: TestBinaryPick[] = Array.from({ length: 20 }, (_, i) => ({
      sampleId: `s${i}`,
      p: 0.55 + (i % 5) * 0.05,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
      ctx: i % 2 === 0 ? ctxHomeFav : ctxAwayDog,
    }));
    const fit = fitBinaryMondrian(samples, { minSamples: 5, level: 1 });
    assertShadow(fit);
    expect(fit.sampleSize).toBe(20);

    const lookup = binaryConformalLookup(fit, ctxHomeFav, 0.8);
    assertShadow(lookup);
    expect(lookup.width).toBeCloseTo(2 * lookup.quantile);
    expect(lookup.sampleSize).toBeGreaterThan(0);
  });

  it("adaptiveBinaryConformal keeps shadow markers on a short stream", () => {
    // Protects: ACI-style path never flips priced/status
    const samples: TestBinaryPick[] = Array.from({ length: 40 }, (_, i) => ({
      sampleId: `a${i}`,
      p: 0.6,
      y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
      ctx: ctxHomeFav,
    }));
    const intervals = adaptiveBinaryConformal(samples, 0.8, 0.05);
    expect(intervals).toHaveLength(40);
    for (const row of intervals) assertShadow(row);
  });
});

// ── Murphy identity pin ─────────────────────────────────────────

describe("brierDecomposition Murphy diagnostic", () => {
  it("exact identity when forecasts are constant within bins", () => {
    // Protects: within-bin variance caveat — identity holds when bins are pure
    const samples = [
      ...Array.from({ length: 50 }, () => ({ p: 0.25, y: 0 as const })),
      ...Array.from({ length: 50 }, () => ({ p: 0.25, y: 1 as const })),
      ...Array.from({ length: 50 }, () => ({ p: 0.75, y: 0 as const })),
      ...Array.from({ length: 50 }, () => ({ p: 0.75, y: 1 as const })),
    ];
    const d = brierDecomposition(samples, 4);
    const reconstructed = d.reliability - d.resolution + d.uncertainty;
    expect(Math.abs(d.brier - reconstructed)).toBeLessThan(1e-3);
    expect(d.sampleSize).toBe(200);
  });
});
