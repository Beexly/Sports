import { describe, it, expect } from "vitest";
import {
  loadThousandEquationMatrix,
  selectCandidatePremisesByContextMask,
} from "../thousand-equation-registry.js";
import { buildContextMask, MAX_ABS_DELTA_LOG_ODDS, routeInMemoryFourStage } from "../mcp-cognitive-router.js";

describe("Thousand-Equation In-Memory Matrix Registry", () => {
  it("loads 1,562 grounded equations with valid integrity counts and zero EQ-EXP placeholders", () => {
    const matrix = loadThousandEquationMatrix();
    expect(matrix.total_equations).toBeGreaterThanOrEqual(1520);
    expect(matrix.citable_verified_count).toBeGreaterThanOrEqual(1300);
    expect(matrix.computed_count).toBeGreaterThanOrEqual(200);
    expect(matrix.load_bearing_count).toBeGreaterThanOrEqual(1500);
    expect(matrix.equations.length).toBeGreaterThanOrEqual(1520);

    // Hard verification: zero synthetic placeholder equations
    const hasExpPlaceholder = matrix.equations.some((e: any) => e.id.startsWith("EQ-EXP-"));
    expect(hasExpPlaceholder).toBe(false);
  });

  it("selects and ranks candidate premises by active context mask bits", () => {
    // Mask with pressure (family 0) and weather (family 1) signals
    const mask = buildContextMask([
      { family: 0, displacement: 0.65, n: 80 },
      { family: 1, displacement: 0.45, n: 75 },
    ]);

    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 30 });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(30);

    // Verify all selected premises have valid premise properties
    for (const cand of candidates) {
      expect(cand.id).toBeTruthy();
      expect(cand.similarity).toBeGreaterThan(0);
      expect(typeof cand.rawLogOddsDelta).toBe("number");
      expect(cand.verificationStatus).toBeDefined();
    }
  });

  it("returns NOTHING when no family fired — the topK backfill is purged", () => {
    const mask = buildContextMask([]);
    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 25 });
    expect(candidates.length).toBe(0);
  });

  it("never backfills non-matching families up to topK", () => {
    const mask = buildContextMask([
      { family: 0, displacement: 0.65, n: 80 },
      { family: 1, displacement: 0.45, n: 75 },
    ]);
    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 500 });
    for (const cand of candidates) {
      expect([0, 1]).toContain(cand.signalFamilyIdx);
    }
  });

  it("zeroes a fired family with no measured displacement in live mode", () => {
    const mask = buildContextMask([
      { family: 0, displacement: 0.65, n: 80 },
      { family: 1, displacement: 0.45, n: 75 },
    ]);
    // Mask fires families 0 and 1, but only family 0 has a measured signal.
    const candidates = selectCandidatePremisesByContextMask(mask, {
      topK: 500,
      signals: [{ family: 0, displacement: 0.65, n: 80 }],
    });
    const fam1 = candidates.filter((c) => c.signalFamilyIdx === 1);
    expect(fam1.length).toBeGreaterThan(0);
    for (const cand of fam1) {
      expect(cand.rawLogOddsDelta).toBe(0);
    }
    const fam0 = candidates.filter((c) => c.signalFamilyIdx === 0);
    expect(fam0.some((c) => c.rawLogOddsDelta !== 0)).toBe(true);
  });

  it("maps matrix verification status onto trust tiers", () => {
    const mask = buildContextMask([{ family: 0, displacement: 0.65, n: 80 }]);
    const candidates = selectCandidatePremisesByContextMask(mask, { topK: 50 });
    expect(candidates.length).toBeGreaterThan(0);
    for (const cand of candidates) {
      expect(["CITABLE_VERIFIED", "COMPUTED", "RESEARCH_HYPOTHESIS"]).toContain(cand.verificationTier);
    }
  });

  it("wires >= 6,000 equations across EQ-SOV, EQ-SHARDB, and strict ADOPT EQ-SWEEP with <50ms 4-stage routing and stratified bit retrieval", () => {
    const matrix = loadThousandEquationMatrix();
    expect(matrix.total_equations).toBeGreaterThanOrEqual(6000);

    const sovEqs = matrix.equations.filter((e) => e.id.startsWith("EQ-SOV-"));
    const shardBEqs = matrix.equations.filter((e) => e.id.startsWith("EQ-SHARDB-"));
    const sweepEqs = matrix.equations.filter((e) => e.id.startsWith("EQ-SWEEP-"));
    expect(sovEqs.length).toBeGreaterThan(0);
    expect(shardBEqs.length).toBeGreaterThan(0);
    expect(sweepEqs.length).toBeGreaterThan(0);

    const killOrWithdrawn = sweepEqs.filter((e) =>
      /\b(KILL|WITHDRAWN)\b/i.test(String(e.sweepVerdict ?? "")),
    );
    expect(killOrWithdrawn).toHaveLength(0);

    const strictAdoptRe = /^\s*ADOPT(?:\s*[:(\[]|\s*$)/i;
    const loadBearingSweep = sweepEqs.filter((e) => e.load_bearing);
    expect(loadBearingSweep).toHaveLength(36);
    for (const eq of loadBearingSweep) {
      expect(eq.verificationStatus).toBe("CITABLE_VERIFIED");
      expect(strictAdoptRe.test(String(eq.sweepVerdict ?? ""))).toBe(true);
    }

    const nonAdoptSweep = sweepEqs.filter((e) => !strictAdoptRe.test(String(e.sweepVerdict ?? "")));
    expect(nonAdoptSweep.length).toBeGreaterThan(400);
    for (const eq of nonAdoptSweep) {
      expect(eq.verificationStatus).toBe("INFERENCE");
      expect(eq.load_bearing).toBe(false);
      expect(eq.rawLogOddsDelta).toBe(0);
    }

    // Verify no EQ-SWEEP-* parenthetical "(adopt ...)" note is mispromoted
    const parenAdopt = sweepEqs.find((e) => e.id === "EQ-SWEEP-X-263f2e1f-3192");
    if (parenAdopt) {
      expect(parenAdopt.verificationStatus).toBe("INFERENCE");
      expect(parenAdopt.load_bearing).toBe(false);
      expect(parenAdopt.rawLogOddsDelta).toBe(0);
    }

    // Verify stratified topK=250 retrieval lets core, EQ-SOV, EQ-SHARDB, and exact ADOPT EQ-SWEEP reach Stage C
    const allMask = new Uint32Array(9).fill(0xffffffff);
    const stratified = selectCandidatePremisesByContextMask(allMask, { topK: 250 });
    expect(stratified.length).toBe(250);
    expect(stratified.some((p) => p.id.startsWith("EQ-SOV-"))).toBe(true);
    expect(stratified.some((p) => p.id.startsWith("EQ-SHARDB-"))).toBe(true);
    expect(stratified.some((p) => p.id.startsWith("EQ-SWEEP-"))).toBe(true);

    const t0 = performance.now();
    const routed = routeInMemoryFourStage([
      { family: 12, displacement: 0.14, n: 120 },
      { family: 58, displacement: -0.09, n: 120 },
      { family: 196, displacement: 0.11, n: 120 },
    ]);
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(50);
    expect(Math.abs(routed.clampedTotalLogOddsDelta)).toBeLessThanOrEqual(MAX_ABS_DELTA_LOG_ODDS);
    expect(Number.isFinite(routed.clampedTotalLogOddsDelta)).toBe(true);
  });
});
