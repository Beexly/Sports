import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isThreeWayMoneylineSport } from "@sports/prediction-engine";
import {
  picksToMarketAnchoredCalibrationSamples,
  resolveMarketAnchoredCalibrationP,
  type PickForLiveCal,
} from "@/lib/calibration/live-calibration-p";
import {
  threeWayMoneylineExclusion,
  toProvenPathPickRow,
  toProvenPathPickRowsReport,
} from "@/lib/calibration/proven-path-rows";
import {
  buildDurableMetricsFromSamples,
  picksToCalibrationSamples,
  type PickRowForCal,
} from "@/lib/ops/compute-live-calibration-metrics";

/**
 * v5.2.8 Phase 2 (founder decision 2026-09-05): the eligibility floors are
 * measured on the market-anchored probability. Picks without one are excluded
 * and counted (no_market_probability), never scored on confidence/100. A
 * MONEYLINE pick on a three-way moneyline sport is excluded structurally
 * (three_way_market): the two-way de-vig drops the draw mass and the engine
 * refuses to publish it, so its receipt cannot be a calibration claim.
 */

const settled = new Date("2026-09-01T00:00:00Z");

function pick(overrides: Partial<PickForLiveCal> & Pick<PickForLiveCal, "result">): PickForLiveCal {
  return {
    confidence: 70,
    pickType: "MONEYLINE",
    factorBreakdown: {},
    proofReceipt: null,
    modelVersion: "v5.2.7",
    settledAt: settled,
    sportKey: "baseball_mlb",
    ...overrides,
  };
}

describe("three-way moneyline exclusion uses the engine's helper", () => {
  it("scopes to MONEYLINE on a three-way sport; spreads and totals on the same sport stay", () => {
    expect(isThreeWayMoneylineSport("soccer_usa_mls")).toBe(true);
    expect(threeWayMoneylineExclusion({ pickType: "MONEYLINE", sportKey: "soccer_usa_mls" })).toBe("three_way_market");
    expect(threeWayMoneylineExclusion({ pickType: "SPREAD", sportKey: "soccer_usa_mls" })).toBeNull();
    expect(threeWayMoneylineExclusion({ pickType: "TOTAL", sportKey: "soccer_usa_mls" })).toBeNull();
    expect(threeWayMoneylineExclusion({ pickType: "MONEYLINE", sportKey: "baseball_mlb" })).toBeNull();
    // Unknown sport: no exclusion is invented.
    expect(threeWayMoneylineExclusion({ pickType: "MONEYLINE", sportKey: null })).toBeNull();
  });

  it("(a) a soccer moneyline WITH a receipt is excluded from the eligibility sample and counted", () => {
    const out = picksToMarketAnchoredCalibrationSamples([
      pick({ result: "WIN", sportKey: "soccer_usa_mls", proofReceipt: { marketFairProb: 0.72 } }),
      pick({ result: "LOSS", sportKey: "soccer_usa_mls", proofReceipt: { marketFairProb: 0.66 } }),
      pick({ result: "WIN", sportKey: "baseball_mlb", proofReceipt: { marketFairProb: 0.61 } }),
    ]);
    expect(out.included).toBe(1);
    expect(out.excluded).toEqual({ three_way_market: 2, no_market_probability: 0, non_moneyline_market: 0 });
    expect(out.samples).toEqual([
      { p: 0.61, y: 1, sportKey: "baseball_mlb", modelVersion: "v5.2.7", pickType: "MONEYLINE" },
    ]);
    expect(out.bySource).toEqual({ proof_receipt: 1 });
  });

  it("(a) the shared row builder drops the soccer moneyline from the bake-off rows and counts it", () => {
    const soccerMl = {
      confidence: 68,
      result: "WIN" as const,
      pickType: "MONEYLINE",
      factorBreakdown: { marketFairProb: 0.7 },
      proofReceipt: { marketFairProb: 0.7 },
      game: { sport: { key: "soccer_usa_mls", name: "MLS" } },
    };
    expect(toProvenPathPickRow(soccerMl)).toBeNull();
    const report = toProvenPathPickRowsReport([
      soccerMl,
      { ...soccerMl, pickType: "SPREAD" },
      { ...soccerMl, game: { sport: { key: "baseball_mlb", name: "MLB" } } },
    ]);
    expect(report.rows).toHaveLength(2);
    expect(report.rows.map((r) => r.groupKey)).toEqual(["soccer_usa_mls|SPREAD", "baseball_mlb|MONEYLINE"]);
    expect(report.excluded).toEqual({ three_way_market: 1, no_market_probability: 0, non_moneyline_market: 0 });
  });
});

describe("(b) no market probability: excluded, never scored on confidence/100", () => {
  it("a MONEYLINE pick with neither factor-breakdown fair nor receipt is counted, not scored", () => {
    const out = picksToMarketAnchoredCalibrationSamples([
      pick({ result: "WIN", confidence: 70, factorBreakdown: {}, proofReceipt: null }),
      pick({ result: "LOSS", confidence: 64, factorBreakdown: null, proofReceipt: { marketFairProb: 0.5 } }),
    ]);
    expect(out.included).toBe(0);
    expect(out.samples).toEqual([]);
    expect(out.excluded).toEqual({ three_way_market: 0, no_market_probability: 2, non_moneyline_market: 0 });
    expect(out.bySource).toEqual({});
  });

  it("resolution order: receipt (publish-time) first, factor breakdown only without a receipt, then the injected resolver", () => {
    // The factor breakdown is refreshed every ingestion cycle until settlement
    // and merged again after it (backfillIndependentTrueProb); the receipt is
    // minted once before kickoff. When both exist the receipt wins, so a
    // post-publish drift of the factor breakdown (0.61 -> 0.57 here) never
    // reaches the floors.
    const both = pick({ result: "WIN", factorBreakdown: { marketFairProb: 0.57 }, proofReceipt: { marketFairProb: 0.61 } });
    expect(resolveMarketAnchoredCalibrationP(both)).toEqual({ p: 0.61, source: "proof_receipt" });
    // The post-settlement backfill copies a market fair into independentEdge,
    // which extractProvenPathProbs reads first; the receipt still wins.
    const backfilled = pick({
      result: "WIN",
      factorBreakdown: { marketFairProb: 0.57, independentEdge: { trueProb: 0.7, marketFairProb: 0.58 } },
      proofReceipt: { marketFairProb: 0.61 },
    });
    expect(resolveMarketAnchoredCalibrationP(backfilled)).toEqual({ p: 0.61, source: "proof_receipt" });

    const receiptOnly = pick({ result: "WIN", factorBreakdown: { marketFairProb: null }, proofReceipt: { marketFairProb: 0.61 } });
    expect(resolveMarketAnchoredCalibrationP(receiptOnly)).toEqual({ p: 0.61, source: "proof_receipt" });

    // Rows that predate receipts: the factor-breakdown market fair is the only value left.
    const fbOnly = pick({ result: "WIN", factorBreakdown: { marketFairProb: 0.57 }, proofReceipt: null });
    expect(resolveMarketAnchoredCalibrationP(fbOnly)).toEqual({ p: 0.57, source: "factor_breakdown" });
    // A synthetic 0.5 on the receipt does not count as a receipt.
    const syntheticReceipt = pick({ result: "WIN", factorBreakdown: { marketFairProb: 0.57 }, proofReceipt: { marketFairProb: 0.5 } });
    expect(resolveMarketAnchoredCalibrationP(syntheticReceipt)).toEqual({ p: 0.57, source: "factor_breakdown" });

    const none = pick({ result: "WIN", factorBreakdown: {}, proofReceipt: null });
    expect(resolveMarketAnchoredCalibrationP(none)).toBeNull();
    expect(resolveMarketAnchoredCalibrationP(none, () => 0.58)).toEqual({ p: 0.58, source: "resolver" });
    // The resolver cannot smuggle in the synthetic coin flip or an out-of-range value.
    expect(resolveMarketAnchoredCalibrationP(none, () => 0.5)).toBeNull();
    expect(resolveMarketAnchoredCalibrationP(none, () => 1)).toBeNull();
  });

  it("the WP-28 resolver hook fills a receipt-less pick and is reported as its own source", () => {
    const out = picksToMarketAnchoredCalibrationSamples(
      [
        pick({ result: "WIN", proofReceipt: { marketFairProb: 0.63 } }),
        pick({ result: "LOSS", proofReceipt: null, modelVersion: "v5.2.1" }),
      ],
      { resolveMarketP: (p) => (p.modelVersion === "v5.2.1" ? 0.55 : null) },
    );
    expect(out.included).toBe(2);
    expect(out.excluded.no_market_probability).toBe(0);
    expect(out.bySource).toEqual({ proof_receipt: 1, resolver: 1 });
    expect(out.samples[1]).toEqual({ p: 0.55, y: 0, sportKey: "baseball_mlb", modelVersion: "v5.2.1", pickType: "MONEYLINE" });
  });

  it("pSources: every receipted pick is proof_receipt; factor_breakdown counts only receipt-less rows", () => {
    const out = picksToMarketAnchoredCalibrationSamples([
      pick({ result: "WIN", factorBreakdown: { marketFairProb: 0.59 }, proofReceipt: { marketFairProb: 0.62 } }),
      pick({ result: "LOSS", factorBreakdown: { marketFairProb: 0.59 }, proofReceipt: { marketFairProb: 0.6 } }),
      pick({ result: "WIN", factorBreakdown: { marketFairProb: 0.57 }, proofReceipt: null }),
    ]);
    expect(out.bySource).toEqual({ proof_receipt: 2, factor_breakdown: 1 });
    expect(out.samples.map((s) => s.p)).toEqual([0.62, 0.6, 0.57]);
    expect(out.notes[0]).toMatch(/Order: proof receipt marketFairProb .* then factor-breakdown market fair only when no receipt exists/);
  });

  it("the shared eligibility builder never falls back to confidence for a MONEYLINE pick", () => {
    const rows: PickRowForCal[] = [
      { confidence: 80, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: "MONEYLINE", sportKey: "baseball_mlb" },
    ];
    const built = picksToCalibrationSamples(rows);
    expect(built.samples).toEqual([]);
    expect(built.exclusions).toEqual({ three_way_market: 0, no_market_probability: 1, non_moneyline_market: 0 });
    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      taggedSamples: built.taggedSamples,
      exclusions: built.exclusions,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
    });
    expect(payload.status).toBe("collecting");
    expect(payload.n).toBe(0);
    expect(payload.pBasis).toBe("market_anchored");
    expect(payload.exclusions).toEqual({ three_way_market: 0, no_market_probability: 1, non_moneyline_market: 0 });
  });
});

describe("(c) bySport and byModelVersion slices", () => {
  // Hit rate sits 0.05 under each forecast level so the pooled ECE is a
  // realistic interior value (production: 0.044), not the boundary 0.
  function fixture(): PickRowForCal[] {
    const rows: PickRowForCal[] = [];
    const sports = ["baseball_mlb", "americanfootball_nfl", "americanfootball_ncaaf"];
    const versions = ["v5.2.6", "v5.2.7"];
    for (let i = 0; i < 90; i++) {
      const p = [0.6, 0.7, 0.8][i % 3]!;
      const idx = Math.floor(i / 3);
      rows.push({
        confidence: 70,
        result: idx / 30 < p - 0.05 ? "WIN" : "LOSS",
        modelVersion: versions[i % 2]!,
        settledAt: new Date(settled.getTime() + i * 3_600_000),
        pickType: "MONEYLINE",
        proofReceipt: { marketFairProb: p },
        sportKey: sports[i % 3]!,
      });
    }
    // Two rows the floors must not see: a soccer moneyline and a receipt-less pick.
    rows.push({ confidence: 66, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: "MONEYLINE", proofReceipt: { marketFairProb: 0.7 }, sportKey: "soccer_usa_mls" });
    rows.push({ confidence: 66, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: "MONEYLINE", proofReceipt: null, sportKey: "baseball_mlb" });
    return rows;
  }

  it("slice n sums to the pooled n; slices use the same metric functions as the pooled row", () => {
    const built = picksToCalibrationSamples(fixture());
    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      taggedSamples: built.taggedSamples,
      exclusions: built.exclusions,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
    });
    expect(payload.status).toBe("ok");
    expect(payload.n).toBe(90);
    expect(payload.exclusions).toEqual({ three_way_market: 1, no_market_probability: 1, non_moneyline_market: 0 });

    const bySport = payload.bySport ?? [];
    const byModelVersion = payload.byModelVersion ?? [];
    expect(bySport.map((s) => s.key).sort()).toEqual(["americanfootball_ncaaf", "americanfootball_nfl", "baseball_mlb"]);
    expect(byModelVersion.map((s) => s.key).sort()).toEqual(["v5.2.6", "v5.2.7"]);
    expect(bySport.reduce((a, s) => a + s.n, 0)).toBe(payload.n);
    expect(byModelVersion.reduce((a, s) => a + s.n, 0)).toBe(payload.n);
    expect(bySport.some((s) => s.key === "soccer_usa_mls")).toBe(false);

    for (const slice of [...bySport, ...byModelVersion]) {
      expect(slice.n).toBeGreaterThan(0);
      expect(Number.isFinite(slice.brier)).toBe(true);
      expect(Number.isFinite(slice.ece)).toBe(true);
      expect(Number.isFinite(slice.murphyRel)).toBe(true);
      expect(slice.hitRate).toBeGreaterThanOrEqual(0);
      expect(slice.hitRate).toBeLessThanOrEqual(1);
      expect(slice.meanP).toBeGreaterThan(0);
      expect(slice.meanP).toBeLessThan(1);
    }
    // A single-sport sample: the slice IS the pooled row.
    const mlbOnly = picksToCalibrationSamples(fixture().filter((r) => r.sportKey === "baseball_mlb" && r.proofReceipt));
    const mlbPayload = buildDurableMetricsFromSamples({ ...mlbOnly, samples: mlbOnly.samples, taggedSamples: mlbOnly.taggedSamples });
    expect(mlbPayload.bySport).toHaveLength(1);
    expect(mlbPayload.bySport?.[0]?.brier).toBe(mlbPayload.overall?.brier);
    expect(mlbPayload.bySport?.[0]?.ece).toBe(mlbPayload.overall?.ece);
    expect(mlbPayload.bySport?.[0]?.murphyRel).toBe(mlbPayload.overall?.murphy.reliability);
  });

  it("the pooled artifact carries seeded bootstrap intervals that contain the point estimate", () => {
    const built = picksToCalibrationSamples(fixture());
    const a = buildDurableMetricsFromSamples({ ...built, samples: built.samples, taggedSamples: built.taggedSamples });
    const b = buildDurableMetricsFromSamples({ ...built, samples: built.samples, taggedSamples: built.taggedSamples });
    expect(a.brierCi95).not.toBeNull();
    expect(a.eceCi95).not.toBeNull();
    expect(a.brierCi95?.lo).toBeLessThanOrEqual(a.overall!.brier);
    expect(a.brierCi95?.hi).toBeGreaterThanOrEqual(a.overall!.brier);
    expect(a.eceCi95?.lo).toBeLessThanOrEqual(a.overall!.ece);
    expect(a.eceCi95?.hi).toBeGreaterThanOrEqual(a.overall!.ece);
    expect(a.brierCi95).toEqual(b.brierCi95);
    expect(a.eceCi95).toEqual(b.eceCi95);
  });
});

describe("byMarket: the pooled floors sample is two-way moneyline only and the artifact says so", () => {
  // Receipt mints are pickType-agnostic (process-sport.ts) and the SPREAD /
  // TOTAL scorers write their cover fair as marketFairProb. Scope decision
  // (2026-09-05, delegated by the founder): cover probabilities sit near 0.5,
  // so their Brier is near 0.25 by construction and pooling them into a 0.22
  // Brier floor would make the floor unreachable regardless of skill. They are
  // excluded from the pooled floors sample as non_moneyline_market and counted;
  // their calibration is reported per market on the bake-off surface.
  function mixed(): PickRowForCal[] {
    const rows: PickRowForCal[] = [];
    for (let i = 0; i < 12; i++) {
      rows.push({
        confidence: 70,
        result: i % 4 === 0 ? "LOSS" : "WIN",
        modelVersion: "v5.2.7",
        settledAt: new Date(settled.getTime() + i * 3_600_000),
        pickType: "MONEYLINE",
        proofReceipt: { marketFairProb: 0.72 },
        sportKey: "baseball_mlb",
      });
    }
    // Receipted spreads: cover fair 0.55 (a -122 / +100 style price) is a real market p.
    for (let i = 0; i < 6; i++) {
      rows.push({
        confidence: 60,
        result: i % 2 === 0 ? "WIN" : "LOSS",
        modelVersion: "v5.2.7",
        settledAt: new Date(settled.getTime() + (20 + i) * 3_600_000),
        pickType: "SPREAD",
        proofReceipt: { marketFairProb: 0.55 },
        sportKey: "americanfootball_nfl",
      });
    }
    // A receipted total with a real cover fair.
    rows.push({ confidence: 58, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: "TOTAL", proofReceipt: { marketFairProb: 0.53 }, sportKey: "americanfootball_nfl" });
    // A -110 / -110 spread: cover fair exactly 0.5 is the synthetic coin flip, excluded by price, not by market.
    rows.push({ confidence: 60, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: "SPREAD", proofReceipt: { marketFairProb: 0.5 }, sportKey: "americanfootball_nfl" });
    return rows;
  }

  it("keeps only two-way moneylines in the pooled floors sample and counts the rest by market", () => {
    const built = picksToCalibrationSamples(mixed());
    expect(built.samples).toHaveLength(12);
    // 6 spreads, 1 total and the -110/-110 spread are excluded by market before
    // any price rule runs, so no_market_probability stays 0.
    expect(built.exclusions).toEqual({ three_way_market: 0, no_market_probability: 0, non_moneyline_market: 8 });
    expect(built.taggedSamples.map((s) => s.pickType)).toEqual(Array<string>(12).fill("MONEYLINE"));

    const payload = buildDurableMetricsFromSamples({
      samples: built.samples,
      taggedSamples: built.taggedSamples,
      exclusions: built.exclusions,
      modelVersions: built.modelVersions,
      settledFrom: built.settledFrom,
      settledTo: built.settledTo,
    });
    expect(payload.n).toBe(12);
    const byMarket = payload.byMarket ?? [];
    expect(byMarket.map((s) => [s.key, s.n])).toEqual([["MONEYLINE", 12]]);
    expect(byMarket.reduce((a, s) => a + s.n, 0)).toBe(payload.n);

    // The pooled row IS the moneyline-only number the founder approved: a
    // moneyline-only build of the same rows gives identical metrics.
    const mlOnly = picksToCalibrationSamples(mixed().filter((r) => r.pickType === "MONEYLINE"));
    const mlPayload = buildDurableMetricsFromSamples({ ...mlOnly, samples: mlOnly.samples, taggedSamples: mlOnly.taggedSamples });
    expect(payload.overall?.brier).toBe(mlPayload.overall?.brier);
    expect(payload.overall?.ece).toBe(mlPayload.overall?.ece);
    expect(payload.overall?.murphy.reliability).toBe(mlPayload.overall?.murphy.reliability);
    expect(payload.exclusions.non_moneyline_market).toBe(8);

    // The notes say so in words, on both builders, with the count.
    const composition = /pooled floors sample is two-way MONEYLINE only/;
    expect(built.notes?.some((n) => composition.test(n))).toBe(true);
    expect(payload.notes?.some((n) => composition.test(n))).toBe(true);
    expect(built.notes?.some((n) => /non_moneyline_market 8/.test(n))).toBe(true);
    // The interval caveat travels with the intervals.
    expect(payload.notes?.some((n) => /ECE is bounded at zero/.test(n))).toBe(true);
  });

  it("a pick with no pickType cannot be verified as a two-way moneyline and is excluded, fail closed", () => {
    // Production writes the PickType enum on every row; a missing value is a
    // data defect, not a market. Under the moneyline-only scope it is counted
    // as non_moneyline_market rather than scored against the floors.
    const built = picksToCalibrationSamples([
      { confidence: 70, result: "WIN", modelVersion: "v5.2.7", settledAt: settled, pickType: null, proofReceipt: { marketFairProb: 0.66 }, sportKey: "baseball_mlb" },
    ]);
    expect(built.samples).toHaveLength(0);
    expect(built.exclusions).toEqual({ three_way_market: 0, no_market_probability: 0, non_moneyline_market: 1 });
    const payload = buildDurableMetricsFromSamples({ ...built, samples: built.samples, taggedSamples: built.taggedSamples });
    expect(payload.n).toBe(0);
    expect(payload.byMarket ?? []).toEqual([]);
  });
});

describe("every canonical loader runs the market-anchored sample and the three-way exclusion", () => {
  const root = resolve(__dirname, "..");
  const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

  it("calibration-eligibility-durable.ts selects the sport key and feeds the shared builder", () => {
    const src = read("lib/ops/calibration-eligibility-durable.ts");
    // The game select carries the sport key (this exclusion) and, since WP-28,
    // the two team names the odds-table resolver needs for the pick's side.
    expect(src).toMatch(/game:\s*\{\s*select:\s*\{[^}]*homeTeamName:\s*true,\s*awayTeamName:\s*true,\s*sport:\s*\{\s*select:\s*\{\s*key:\s*true\s*\}\s*\}/);
    expect(src).toMatch(/sportKey:\s*pick\.game\?\.sport\?\.key/);
    expect(src).toMatch(/taggedSamples:\s*built\.taggedSamples/);
    expect(src).toMatch(/exclusions:\s*built\.exclusions/);
  });

  it("the calibration-metrics cron scores the market-anchored sample, not the confidence hierarchy", () => {
    const src = read("app/api/cron/calibration-metrics/route.ts");
    expect(src).toMatch(/picksToMarketAnchoredCalibrationSamples\(/);
    expect(src).not.toMatch(/picksToHonestCalibrationSamples\(/);
    expect(src).toMatch(/sportKey:\s*pick\.game\?\.sport\?\.key/);
    expect(src).toMatch(/computeCalibrationBreakdowns\(taggedSamples\)/);
    // byMarket is written to the metrics.json file payload and the durable payload, and returned by the cron.
    expect(src.match(/byMarket:\s*breakdowns\.byMarket/g)).toHaveLength(2);
    expect(src).toMatch(/byMarket:\s*payload\.byMarket\s*\?\?\s*null/);
    // Ranking diagnostics are labelled as such, so the surface never shows two "calibration" pictures.
    expect(src).toMatch(/Ranking diagnostics, not the eligibility sample/);
  });

  it("compute-live-calibration-metrics.ts (shared by the ops seed) uses the market-anchored builder", () => {
    const src = read("lib/ops/compute-live-calibration-metrics.ts");
    expect(src).toMatch(/picksToMarketAnchoredCalibrationSamples\(/);
    expect(src).not.toMatch(/picksToHonestCalibrationSamples/);
  });

  it("proven-path-seed.ts builds rows through the exclusion-reporting row builder", () => {
    const src = read("lib/ops/proven-path-seed.ts");
    expect(src).toMatch(/toProvenPathPickRowsReport\(picks\)/);
    expect(src).toMatch(/exclusions:\s*excluded/);
  });

  it("public-surface-truth surfaces the slices, exclusions and intervals as plain fields", () => {
    const src = read("app/api/ops/public-surface-truth/route.ts");
    for (const field of ["pBasis", "exclusions", "bySport", "byModelVersion", "byMarket", "brierCi95", "eceCi95"]) {
      expect(src).toMatch(new RegExp(`${field}:\\s*calibrationMetricsArtifact\\?\\.${field}\\s*\\?\\?\\s*null`));
    }
    expect(src).toMatch(/provenPathExclusions:\s*surface\?\.exclusions\s*\?\?\s*null/);
  });
});
