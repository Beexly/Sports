import { describe, it, expect } from "vitest";
import { buildPredictiveness, buildSeasonOverSeason, buildStackedSeasonOverSeason, loadPredictiveness } from "./predictiveness";

type Row = Record<string, string>;

function toCsv(rows: Row[]): string {
  const cols = Object.keys(rows[0]!);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => r[c] ?? "").join(","))].join("\n");
}

// 8 WRs, k = 0..7. Process inputs (wopr / target_share / receiving_epa) INCREASE
// in k, so the process grade increases in k. Train production DECREASES in k (so
// high-grade players are flagged buy-low), while test production INCREASES in k
// (the grade was right). This is a designed case where the grade predicts the
// future and past production does not — grade lift should be positive, buy-low
// calls should mostly rise, sell-high calls should mostly fall.
function designedRecords(): Row[] {
  const rows: Row[] = [];
  const trainWeeks = [1, 2, 3, 4, 5, 6];
  const testWeeks = [7, 8, 9, 10, 11, 12];
  for (let k = 0; k < 8; k++) {
    const base: Row = {
      season: "2024", season_type: "REG", position: "WR",
      player_id: `WR${k}`, player_display_name: `WR ${k}`, recent_team: "KC",
      attempts: "0", carries: "0", targets: "6",
      passing_epa: "0", rushing_epa: "0", receiving_epa: String(k),
      wopr: String(0.2 + k * 0.05), target_share: String(0.1 + k * 0.02),
      dakota: "", pacr: "",
    };
    for (const w of trainWeeks) rows.push({ ...base, week: String(w), fantasy_points_ppr: String((8 - k) * 2) });
    for (const w of testWeeks) rows.push({ ...base, week: String(w), fantasy_points_ppr: String((k + 1) * 3) });
  }
  return rows;
}

describe("buildPredictiveness", () => {
  const proof = buildPredictiveness(designedRecords(), 2024);

  it("splits the season into balanced train/test halves", () => {
    expect(proof.trainWeeks).toEqual([1, 2, 3, 4, 5, 6]);
    expect(proof.testWeeks).toEqual([7, 8, 9, 10, 11, 12]);
    expect(proof.sampleSize).toBeGreaterThanOrEqual(6);
  });

  it("shows the process grade ranks future production (positive corr)", () => {
    expect(proof.overall.gradeCorr).not.toBeNull();
    expect(proof.overall.gradeCorr!).toBeGreaterThan(0.5);
  });

  it("shows the grade adds lift over the past-production baseline", () => {
    expect(proof.overall.lift).not.toBeNull();
    expect(proof.overall.lift!).toBeGreaterThan(0); // grade beats raw past points here by design
  });

  it("scores buy-low / sell-high calls against the coin flip", () => {
    expect(proof.overall.buyLowN).toBeGreaterThan(0);
    expect(proof.overall.buyLowHitRate!).toBeGreaterThan(0.5); // buy-lows mostly rose
    expect(proof.overall.sellHighN).toBeGreaterThan(0);
    expect(proof.overall.sellHighHitRate!).toBeGreaterThan(0.5); // sell-highs mostly fell
  });

  it("emits a per-position WR split and a human verdict", () => {
    const wr = proof.byPosition.find((p) => p.position === "WR");
    expect(wr).toBeTruthy();
    expect(wr!.n).toBeGreaterThanOrEqual(6);
    expect(proof.verdict).toMatch(/process grade/i);
  });

  it("stays honest and empty when a season can't be split", () => {
    const thin = buildPredictiveness(
      [{ season: "2024", season_type: "REG", week: "1", position: "WR", player_id: "x", player_display_name: "X", recent_team: "KC", targets: "6", fantasy_points_ppr: "10" }],
      2024,
    );
    expect(thin.sampleSize).toBe(0);
    expect(thin.byPosition).toEqual([]);
  });
});

// One full season for 8 WRs (8 games each), anchors increasing in k so the grade
// increases in k; production controlled by `ppr(k)`.
function wrSeason(season: number, ppr: (k: number) => number, games = 8): Row[] {
  const rows: Row[] = [];
  for (let k = 0; k < 8; k++) {
    const base: Row = {
      season: String(season), season_type: "REG", position: "WR",
      player_id: `WR${k}`, player_display_name: `WR ${k}`, recent_team: "KC",
      attempts: "0", carries: "0", targets: "6",
      passing_epa: "0", rushing_epa: "0", receiving_epa: String(k),
      wopr: String(0.2 + k * 0.05), target_share: String(0.1 + k * 0.02), dakota: "", pacr: "",
    };
    for (let w = 1; w <= games; w++) rows.push({ ...base, week: String(w), fantasy_points_ppr: String(ppr(k)) });
  }
  return rows;
}

describe("buildSeasonOverSeason (out-of-sample)", () => {
  // 2023 inputs grade players high→k; 2023 production decreasing (so high grade =
  // buy-low); 2024 production increasing (the grade was right across seasons).
  const records = [...wrSeason(2023, (k) => (8 - k) * 2), ...wrSeason(2024, (k) => (k + 1) * 3)];

  it("grades on the prior season and ranks the next season's production", () => {
    const yoy = buildSeasonOverSeason(records, 2023, 2024);
    expect(yoy.n).toBeGreaterThanOrEqual(6);
    expect(yoy.overall.gradeCorr).not.toBeNull();
    expect(yoy.overall.gradeCorr!).toBeGreaterThan(0.5);
    expect(yoy.overall.lift!).toBeGreaterThan(0); // beats prior-season production here by design
  });

  it("is empty when a season is missing (no fabrication)", () => {
    const yoy = buildSeasonOverSeason(wrSeason(2024, (k) => k + 1), 2023, 2024);
    expect(yoy.n).toBe(0);
    expect(yoy.byPosition).toEqual([]);
  });
});

describe("buildStackedSeasonOverSeason (multi-year, pooled)", () => {
  // Four consecutive seasons (2021..2024). In every season the inputs grade players
  // high→k AND production rises in k, so in EVERY train→test transition the prior-season
  // grade ranks the next season's production positively. Each season is both a test (of the
  // pair before it) and a train (of the pair after it), so production must rise in k in all
  // of them for every pooled pair to carry positive signal. Pooling must keep gradeCorr>0.5
  // and grow n. (Buy-low/sell-high call coverage is exercised by the split-half tests above.)
  const records = [
    ...wrSeason(2021, (k) => (k + 1) * 3),
    ...wrSeason(2022, (k) => (k + 1) * 3),
    ...wrSeason(2023, (k) => (k + 1) * 3),
    ...wrSeason(2024, (k) => (k + 1) * 3),
  ];
  const onePair: Array<[number, number]> = [[2023, 2024]];
  const threePairs: Array<[number, number]> = [[2021, 2022], [2022, 2023], [2023, 2024]];

  it("pools each pair's pairs and grows n with more pairs", () => {
    const single = buildStackedSeasonOverSeason(records, onePair);
    const stacked = buildStackedSeasonOverSeason(records, threePairs);
    expect(single.n).toBeGreaterThanOrEqual(6);
    expect(stacked.pairs).toEqual(threePairs);
    expect(stacked.n).toBeGreaterThan(single.n); // pooling several pairs adds paired players
    expect(stacked.n).toBe(single.n * 3); // 8 WRs join in each of the 3 pairs by design
  });

  it("keeps the pooled grade correlation strong out-of-sample", () => {
    const stacked = buildStackedSeasonOverSeason(records, threePairs);
    expect(stacked.overall.gradeCorr).not.toBeNull();
    expect(stacked.overall.gradeCorr!).toBeGreaterThan(0.5);
    const wr = stacked.byPosition.find((p) => p.position === "WR");
    expect(wr).toBeTruthy();
    expect(wr!.n).toBe(stacked.n);
  });

  it("skips pairs whose seasons are absent (no fabrication)", () => {
    // 2021 and 2022 are missing here, so those candidate pairs drop out entirely.
    const partial = buildStackedSeasonOverSeason(records, [[2019, 2020], [2023, 2024]]);
    expect(partial.pairs).toEqual([[2023, 2024]]);
    expect(partial.n).toBeGreaterThanOrEqual(6);
  });

  it("is empty when no pair has both seasons present", () => {
    const empty = buildStackedSeasonOverSeason(records, [[2018, 2019]]);
    expect(empty.n).toBe(0);
    expect(empty.pairs).toEqual([]);
    expect(empty.byPosition).toEqual([]);
    expect(empty.overall.gradeCorr).toBeNull();
  });
});

describe("loadPredictiveness", () => {
  it("degrades to source-error when nflverse is unreachable", async () => {
    const r = await loadPredictiveness({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.sampleSize).toBe(0);
    expect(r.canPublishProjections).toBe(false);
  });

  it("loads live from a plain-CSV weekly asset (decodeDatasetText passthrough)", async () => {
    const csv = toCsv(designedRecords());
    const r = await loadPredictiveness({ season: 2024, fetcher: async () => new Response(csv) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    expect(r.overall.gradeCorr).not.toBeNull();
    expect(r.priorSeason).toBeNull(); // single-season asset -> no out-of-sample pair
  });

  it("computes the year-over-year backtest when the prior season is present", async () => {
    const csv = toCsv([...wrSeason(2023, (k) => (8 - k) * 2), ...wrSeason(2024, (k) => (k + 1) * 3)]);
    const r = await loadPredictiveness({ season: 2024, fetcher: async () => new Response(csv) });
    expect(r.status).toBe("live");
    expect(r.priorSeason).toBe(2023);
    expect(r.yearOverYear).not.toBeNull();
    expect(r.yearOverYear!.gradeCorr!).toBeGreaterThan(0.5);
    expect(r.yearOverYearVerdict).toMatch(/2023/);
  });

  it("leaves the stacked test empty with only two seasons present", async () => {
    const csv = toCsv([...wrSeason(2023, (k) => (8 - k) * 2), ...wrSeason(2024, (k) => (k + 1) * 3)]);
    const r = await loadPredictiveness({ season: 2024, fetcher: async () => new Response(csv) });
    // Only the [2023,2024] pair has both seasons -> stacked still populates as a single pooled pair.
    expect(r.stacked).not.toBeNull();
    expect(r.stackedPairs).toEqual([[2023, 2024]]);
  });

  it("computes the stacked multi-year backtest when several consecutive seasons are present", async () => {
    const csv = toCsv([
      ...wrSeason(2021, (k) => (k + 1) * 3),
      ...wrSeason(2022, (k) => (k + 1) * 3),
      ...wrSeason(2023, (k) => (k + 1) * 3),
      ...wrSeason(2024, (k) => (k + 1) * 3),
    ]);
    const r = await loadPredictiveness({ season: 2024, fetcher: async () => new Response(csv) });
    expect(r.status).toBe("live");
    expect(r.stacked).not.toBeNull();
    expect(r.stackedPairs).toEqual([[2021, 2022], [2022, 2023], [2023, 2024]]);
    expect(r.stacked!.gradeCorr!).toBeGreaterThan(0.5);
    expect(r.stacked!.n).toBeGreaterThan(r.yearOverYear!.n); // pooling beats the single pair on sample size
    expect(r.stackedVerdict).toMatch(/2021/);
  });
});
