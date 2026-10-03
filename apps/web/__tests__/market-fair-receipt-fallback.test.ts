import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  receiptMarketFairProb,
  toProvenPathPickRow,
} from "@/lib/calibration/proven-path-rows";
import {
  resolveLiveCalibrationP,
  picksToHonestCalibrationSamples,
  INDEPENDENT_EVIDENCE_SHRINK,
  MARKET_ANCHOR_INDEP_WEIGHT,
} from "@/lib/calibration/live-calibration-p";

/**
 * 2026-09-05: the live bake-off's market score covered 34% of the sample because
 * marketFairProb lived only inside factorBreakdown (since v5.2.1) and the signal
 * slate had nulled it on book-priced moneyline rows. The immutable proof receipt
 * carries the same lock-time value for every book-priced pick; the loaders now
 * read it as a fallback. Synthetic 0.5 is still rejected.
 */

describe("receiptMarketFairProb", () => {
  it("returns a real lock-time fair and rejects null, out-of-range and the synthetic coin flip", () => {
    expect(receiptMarketFairProb({ marketFairProb: 0.62 })).toBeCloseTo(0.62, 9);
    expect(receiptMarketFairProb(null)).toBeNull();
    expect(receiptMarketFairProb(undefined)).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: null })).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: 0 })).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: 1 })).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: 0.5 })).toBeNull();
    expect(receiptMarketFairProb({ marketFairProb: Number.NaN })).toBeNull();
  });
});

describe("toProvenPathPickRow falls back to the receipt", () => {
  const base = { confidence: 68, result: "WIN" as const, pickType: "MONEYLINE", game: { sport: { key: "americanfootball_ncaaf" } } };

  it("uses the receipt when the factor breakdown was nulled by the signal slate", () => {
    const row = toProvenPathPickRow({
      ...base,
      factorBreakdown: { marketFairProb: null, independentEdge: { trueProb: 0.68, marketFairProb: null, priced: true } },
      proofReceipt: { marketFairProb: 0.61 },
    });
    expect(row?.marketP).toBeCloseTo(0.61, 9);
    expect(row?.pIndependent).toBeCloseTo(0.68, 9);
  });

  it("prefers the factor breakdown when both exist", () => {
    const row = toProvenPathPickRow({
      ...base,
      factorBreakdown: { marketFairProb: 0.57 },
      proofReceipt: { marketFairProb: 0.61 },
    });
    expect(row?.marketP).toBeCloseTo(0.57, 9);
  });

  it("stays null with neither (never invents a book)", () => {
    const row = toProvenPathPickRow({ ...base, factorBreakdown: { marketFairProb: null }, proofReceipt: null });
    expect(row?.marketP).toBeNull();
    const row2 = toProvenPathPickRow({ ...base, factorBreakdown: {}, proofReceipt: { marketFairProb: 0.5 } });
    expect(row2?.marketP).toBeNull();
  });
});

describe("resolveLiveCalibrationP reads the receipt fair", () => {
  it("scores the receipt market fair when no independent exists", () => {
    const r = resolveLiveCalibrationP({
      confidence: 71,
      pickType: "MONEYLINE",
      factorBreakdown: {},
      proofReceipt: { marketFairProb: 0.63 },
    });
    expect(r?.source).toBe("marketFairProb");
    expect(r?.p).toBeCloseTo(0.63, 9);
  });

  it("market-anchors the shrunk independent against the receipt fair", () => {
    const r = resolveLiveCalibrationP({
      confidence: 68,
      pickType: "MONEYLINE",
      factorBreakdown: { independentEdge: { trueProb: 0.68, priced: true, marketFairProb: null } },
      proofReceipt: { marketFairProb: 0.6 },
    });
    const shrunk = 0.5 + (0.68 - 0.5) * INDEPENDENT_EVIDENCE_SHRINK;
    expect(r?.source).toBe("blend_indep_market");
    expect(r?.p).toBeCloseTo(MARKET_ANCHOR_INDEP_WEIGHT * shrunk + (1 - MARKET_ANCHOR_INDEP_WEIGHT) * 0.6, 9);
  });

  it("keeps SPREAD without any fair p excluded, receipt or not", () => {
    expect(resolveLiveCalibrationP({ confidence: 70, pickType: "SPREAD", factorBreakdown: {}, proofReceipt: null })).toBeNull();
    // A spread receipt with a real fair is a probability claim on the chosen side and counts.
    expect(resolveLiveCalibrationP({ confidence: 70, pickType: "SPREAD", factorBreakdown: {}, proofReceipt: { marketFairProb: 0.52 } })?.source).toBe("marketFairProb");
  });

  it("threads the receipt through the sample builder", () => {
    const out = picksToHonestCalibrationSamples([
      { confidence: 71, result: "WIN", pickType: "MONEYLINE", factorBreakdown: {}, proofReceipt: { marketFairProb: 0.63 }, modelVersion: "v5.2.7", settledAt: new Date("2026-09-01T00:00:00Z") },
      { confidence: 71, result: "LOSS", pickType: "TOTAL", factorBreakdown: {}, proofReceipt: null, modelVersion: "v5.2.7", settledAt: new Date("2026-09-01T00:00:00Z") },
    ]);
    expect(out.included).toBe(1);
    expect(out.excludedNonProb).toBe(1);
    expect(out.bySource).toEqual({ marketFairProb: 1, excluded_non_prob_market: 1 });
    expect(out.samples[0]).toEqual({ p: 0.63, y: 1 });
  });
});

describe("every canonical loader selects the receipt", () => {
  const root = resolve(__dirname, "..");
  for (const rel of [
    "lib/ops/proven-path-seed.ts",
    "lib/ops/calibration-eligibility-durable.ts",
    "app/api/cron/calibration-metrics/route.ts",
  ]) {
    it(`${rel} selects proofReceipt.marketFairProb`, () => {
      const src = readFileSync(resolve(root, rel), "utf8");
      expect(src).toMatch(/proofReceipt:\s*\{\s*select:\s*\{\s*marketFairProb:\s*true\s*\}\s*\}/);
    });
  }
});
