import { describe, it, expect, vi } from "vitest";
import {
  evaluatePublicRoiPolicy,
  loadPublicRoiPolicy,
  unitsForPick,
} from "@/lib/performance/public-roi-policy";

/**
 * The public units/ROI policy: honest, gated, and deterministic. It only claims
 * profit when the BCa lower bound clears break-even (0 units) — the same
 * discipline as the Wilson-gated CLV policy.
 */

describe("unitsForPick", () => {
  it("pays the decimal profit on a win at the actual price", () => {
    expect(unitsForPick("WIN", -110)).toBeCloseTo(0.9091, 3); // risk 1.1 to win 1
    expect(unitsForPick("WIN", 100)).toBeCloseTo(1, 6);
    expect(unitsForPick("WIN", 150)).toBeCloseTo(1.5, 6);
  });
  it("loses the stake on a loss, zero on settled no-action", () => {
    expect(unitsForPick("LOSS", -110)).toBe(-1);
    expect(unitsForPick("PUSH", -110)).toBe(0);
    expect(unitsForPick("VOID", 200)).toBe(0);
  });

  it("EXCLUDES PENDING entirely — an unresolved bet is not a settled 0 (hostile-quant fix)", () => {
    // Counting PENDING as 0 would inflate n past the publication gate and
    // inject variance-shrinking zeros into the CI via any future caller.
    expect(unitsForPick("PENDING", -110)).toBeNull();
    expect(unitsForPick("PENDING", null)).toBeNull();
  });
  it("excludes a pick with no usable entry price", () => {
    expect(unitsForPick("WIN", null)).toBeNull();
    expect(unitsForPick("WIN", 0)).toBeNull();
  });
});

describe("evaluatePublicRoiPolicy", () => {
  const canonicalWins = (win: number, loss: number): number[] => [
    ...Array(win).fill(unitsForPick("WIN", -110) as number),
    ...Array(loss).fill(-1),
  ];

  it("gates when the performance flag is off", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(60, 40) });
    expect(p.canExposeRoi).toBe(false);
    expect(p.roiPerBet).toBeNull();
    expect(p.primaryReason).toBe("GATE_OFF_PERFORMANCE_STATS");
  });

  it("gates when the sample is too small", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(5, 3) });
    expect(p.canExposeRoi).toBe(false);
    expect(p.primaryReason).toBe("INSUFFICIENT_GRADED_SAMPLE");
  });

  it("is HONEST: a break-even-ish record does NOT claim profit (lower bound below 0)", () => {
    // ~52.4% wins at -110 is roughly break-even; the BCa lower bound stays below 0.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(53, 47) });
    expect(p.canExposeRoi).toBe(true);
    expect(p.clearsProfit).toBe(false);
    expect(p.roiCiLow!).toBeLessThan(0);
    expect(p.publicMessage).toMatch(/includes break-even/);
  });

  it("claims profit only when BOTH methods' lower bounds clear break-even (strong record)", () => {
    // A clearly-winning record over a big sample: both the BCa and studentized
    // lower bounds should clear 0, so the corroborated profit claim holds.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(p.canExposeRoi).toBe(true);
    expect(p.clearsProfit).toBe(true);
    expect(p.roiCiLow!).toBeGreaterThan(0);
    expect(p.roiCiLowStudentized!).toBeGreaterThan(0); // the independent cross-check agrees
    expect(p.publicMessage).toMatch(/two distinct interval methods/);
  });

  it("surfaces the studentized cross-check band alongside the BCa band", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(120, 90) });
    expect(p.canExposeRoi).toBe(true);
    expect(Number.isFinite(p.roiCiLowStudentized!)).toBe(true);
    expect(Number.isFinite(p.roiCiHighStudentized!)).toBe(true);
    // Both second-order methods should agree closely on a large, well-behaved
    // sample (same point, comparable width) — a sanity check on corroboration.
    expect(p.roiCiHighStudentized!).toBeGreaterThan(p.roiCiLowStudentized!);
    expect(p.operatorMessage).toMatch(/stud=\[/);
  });

  it("is HONEST under corroboration: BCa-only optimism does not by itself claim profit", () => {
    // clearsProfit is the AND of two methods, so it can never be true unless the
    // studentized lower bound also clears 0. Assert the field is exactly that AND.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(53, 47) });
    const bothClear = p.roiCiLow! > 0 && p.roiCiLowStudentized! > 0;
    expect(p.clearsProfit).toBe(bothClear);
    expect(p.clearsProfit).toBe(false);
  });

  it("gates the studentized band too (null when not allowed)", () => {
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(60, 40) });
    expect(p.roiCiLowStudentized).toBeNull();
    expect(p.roiCiHighStudentized).toBeNull();
  });

  it("is deterministic: same returns -> identical published bands (both methods)", () => {
    const returns = canonicalWins(120, 90);
    const a = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    const b = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
    expect(a.roiCiLow).toBe(b.roiCiLow);
    expect(a.roiCiHigh).toBe(b.roiCiHigh);
    expect(a.roiCiLowStudentized).toBe(b.roiCiLowStudentized);
    expect(a.roiCiHighStudentized).toBe(b.roiCiHighStudentized);
  });

  it("LOPSIDED-LEDGER GUARD (hostile-quant HIGH finding): 24W/1L at the n=25 gate cannot claim profit", () => {
    // A hot opening record right at minGraded: ~36% of bootstrap-t resamples are
    // all-win degenerates, so the studentized lower bound is honestly -Infinity
    // ("cannot bound the downside from this ledger"). The policy must surface
    // null (never an Infinity, never a fabricated finite bound) and the profit
    // gate must NOT fire even though the BCa lower bound alone clears 0.
    const hot = [...Array(24).fill(unitsForPick("WIN", -110) as number), -1];
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: hot });
    expect(p.canExposeRoi).toBe(true);
    expect(p.roiCiLowStudentized).toBeNull(); // non-finite bound surfaced as null
    expect(p.clearsProfit).toBe(false); // the gate held
    expect(p.operatorMessage).toContain("stud=[n/a"); // never prints "Infinity"
    expect(p.publicMessage).toMatch(/includes break-even|don't yet claim/);
  });

  it("FREEZE the subset property: clearsProfit implies the BCa-only gate would also have claimed", () => {
    // The corroboration gate must remain strictly conservative vs BCa-alone —
    // it may only remove claims, never add them. Grid over ledger shapes.
    const grids: Array<[number, number]> = [
      [400, 200], [120, 90], [53, 47], [30, 10], [24, 1], [200, 100], [60, 40],
    ];
    for (const [w, l] of grids) {
      const returns = [...Array(w).fill(unitsForPick("WIN", -110) as number), ...Array(l).fill(-1)];
      const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns });
      if (p.clearsProfit) {
        expect(p.roiCiLow!).toBeGreaterThan(0); // BCa lower bound (rounded) must clear too
      }
    }
  });

  it("WORST-CASE tier (empirical-Bernstein): additive, strictly stricter, fires only on strong records", () => {
    // Strong 400/200 record: corroborated profit AND clears the finite-sample
    // worst-case bound -> the strongest statement the platform can make.
    const strong = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(strong.clearsProfit).toBe(true);
    expect(strong.roiCiLowWorstCase).not.toBeNull();
    expect(strong.clearsProfitWorstCase).toBe(true);
    // The worst-case lower bound is strictly below the bootstrap lower bounds
    // (it is the widest band) — pin the ordering so a refactor can't invert it.
    expect(strong.roiCiLowWorstCase!).toBeLessThan(strong.roiCiLow!);

    // Modest 120/90: bootstrap-corroborated profit may hold, but the worst-case
    // tier must be at most as permissive (subset property of the tiers).
    const modest = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(120, 90) });
    if (modest.clearsProfitWorstCase) expect(modest.clearsProfit).toBe(true);

    // Thin 53/47: neither tier fires.
    const thin = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(53, 47) });
    expect(thin.clearsProfitWorstCase).toBe(false);

    // Gated -> both null/false.
    const gated = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(gated.roiCiLowWorstCase).toBeNull();
    expect(gated.clearsProfitWorstCase).toBe(false);
  });

  it("K11 ANYTIME tier: additive evidence beside the bands, never part of the gate", () => {
    // Strong 400/200 record: the sequential test should also have rejected
    // no-edge, and the public message earns the continuous-checking sentence.
    const strong = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(strong.anytimeEvidence).not.toBeNull();
    expect(strong.anytimeEvidence!.everSignificant).toBe(true);
    expect(strong.anytimeEvidence!.firstSignificantAtN).not.toBeNull();
    expect(strong.anytimeEvidence!.lowerBound).toBeGreaterThanOrEqual(-1);
    expect(strong.publicMessage).toContain("checked continuously");

    // Thin 53/47 in a REALISTIC (interleaved) settlement order: no sequential
    // rejection, no sentence — and the clearsProfit gate is UNCHANGED by the
    // tier's existence. (Order matters to the sequential tier by design: the
    // wins-first canonicalWins fixture would present a fictitious 53-0 opening
    // streak, which IS legitimately overwhelming sequential evidence — a
    // ~1e-15 event under true break-even — so an interleaved fixture is the
    // honest analog of a real ledger here.)
    const win = unitsForPick("WIN", -110) as number;
    const interleavedThin: number[] = [];
    for (let i = 0; i < 100; i++) interleavedThin.push(i % 2 === 0 && interleavedThin.filter((x) => x > 0).length < 53 ? win : -1);
    // pad to exactly 53 wins / 47 losses
    while (interleavedThin.filter((x) => x > 0).length < 53) interleavedThin[interleavedThin.lastIndexOf(-1)] = win;
    const thin = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: interleavedThin });
    expect(thin.anytimeEvidence).not.toBeNull();
    expect(thin.anytimeEvidence!.everSignificant).toBe(false);
    expect(thin.publicMessage).not.toContain("checked continuously");
    expect(thin.clearsProfit).toBe(false);

    // Gated -> null, like every other tier.
    const gated = evaluatePublicRoiPolicy({ canExposePerformanceStats: false, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(gated.anytimeEvidence).toBeNull();
  });

  it("K11 ORDER REGRESSION: the loader sorts by settledAt ascending (sequential validity is earned at the data layer)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await loadPublicRoiPolicy(
      { pick: { findMany } },
      { canExposePerformanceStats: true, minGradedForPublic: 25 },
    );
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]![0] as { orderBy?: unknown };
    // TOTAL order: settledAt is stamped once per GAME (settle-sport), so
    // multi-pick games tie systematically — the id tiebreaker is what makes
    // the published anytime numbers bit-reproducible across loads.
    expect(args.orderBy).toEqual([{ settledAt: "asc" }, { id: "asc" }]);
  });

  it("gate/display consistency: a profit claim never displays a '+0.00' lower bound", () => {
    // The gate evaluates ROUNDED bounds, so whenever clearsProfit is true the
    // displayed 2-decimal lower bounds are visibly positive.
    const p = evaluatePublicRoiPolicy({ canExposePerformanceStats: true, minGradedForPublic: 25, returns: canonicalWins(400, 200) });
    expect(p.clearsProfit).toBe(true);
    expect(p.roiCiLow!).toBeGreaterThanOrEqual(0.01);
    expect(p.roiCiLowStudentized!).toBeGreaterThanOrEqual(0.01);
  });
});
