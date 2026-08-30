import { describe, it, expect } from "vitest";
import { MondrianResidualManager } from "../conformal/mondrian.js";

describe("MondrianResidualManager", () => {
  it("size() is 0 for a category that has never been added", () => {
    const mgr = new MondrianResidualManager();
    expect(mgr.size("home|favorite")).toBe(0);
  });

  it("add() stores the absolute value of the residual", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.add("home|favorite", -0.4);
    const q = mgr.quantile("home|favorite", 1);
    expect(q.quantile).toBeCloseTo(0.4, 10);
  });

  it("addMany batches residuals into the same category", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("home|favorite", [0.1, 0.2, 0.3]);
    expect(mgr.size("home|favorite")).toBe(3);
  });

  it("categories() returns a sorted list of every category that has data", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1, useGlobalFallback: false });
    mgr.add("zeta", 1);
    mgr.add("alpha", 1);
    expect(mgr.categories()).toEqual(["alpha", "zeta"]);
  });

  it("quantile lookup on an unfilled category falls back to the global bucket", () => {
    const mgr = new MondrianResidualManager({ minSamples: 5 });
    mgr.addMany("away|underdog", [1, 1, 1, 1, 1, 1, 1, 1]); // fills "*"
    const q = mgr.quantile("home|favorite", 0.9); // never directly added
    expect(q.usedFallback).toBe(true);
    expect(q.category).toBe("*");
    expect(q.sampleSize).toBe(8);
  });

  it("quantile lookup falls back hierarchically through parent categories before the global bucket", () => {
    const mgr = new MondrianResidualManager({ minSamples: 3 });
    mgr.addMany("home", [0.1, 0.2, 0.3, 0.4, 0.5]); // enough for "home" alone
    const q = mgr.quantile("home|favorite|rest_long", 0.5);
    expect(q.usedFallback).toBe(true);
    expect(q.category).toBe("home");
    expect(q.fallbackChain).toEqual(["home|favorite|rest_long", "home|favorite", "home"]);
  });

  it("uses the leaf category directly when it has enough samples (no fallback)", () => {
    const mgr = new MondrianResidualManager({ minSamples: 2 });
    mgr.addMany("home|favorite", [0.1, 0.2, 0.3]);
    const q = mgr.quantile("home|favorite", 0.5);
    expect(q.usedFallback).toBe(false);
    expect(q.category).toBe("home|favorite");
    expect(q.fallbackChain).toEqual(["home|favorite"]);
  });

  it("returns sampleSize 0 and quantile 0 when useGlobalFallback is false and no category has data", () => {
    const mgr = new MondrianResidualManager({ minSamples: 5, useGlobalFallback: false });
    const q = mgr.quantile("nowhere", 0.9);
    expect(q.sampleSize).toBe(0);
    expect(q.quantile).toBe(0);
    expect(q.usedFallback).toBe(false);
  });

  it("quantile() never throws or returns NaN for a non-finite probability", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("cat", [0.1, 0.2, 0.3]);
    const q = mgr.quantile("cat", NaN);
    expect(Number.isFinite(q.quantile)).toBe(true);
  });

  it("finite-sample quantile respects the (n+1) split-conformal correction (probability=1 returns the max)", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("cat", [0.1, 0.5, 0.9]);
    const q = mgr.quantile("cat", 1);
    expect(q.quantile).toBeCloseTo(0.9, 10);
  });

  it("snapshot() reports residual counts per category, including the global bucket", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.add("home", 0.1);
    mgr.add("away", 0.2);
    const snap = mgr.snapshot();
    expect(snap.get("home")).toBe(1);
    expect(snap.get("away")).toBe(1);
    expect(snap.get("*")).toBe(2);
  });

  it("quantile is monotone non-decreasing in probability for a fixed category", () => {
    const mgr = new MondrianResidualManager({ minSamples: 1 });
    mgr.addMany("cat", [0.05, 0.1, 0.2, 0.4, 0.8, 1.0]);
    let prev = -Infinity;
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9, 1.0]) {
      const q = mgr.quantile("cat", p).quantile;
      expect(q).toBeGreaterThanOrEqual(prev);
      prev = q;
    }
  });
});
