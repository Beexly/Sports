import { describe, it, expect } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";

import {
  PICKS_H1_CUTOFF,
  HOLDOUT_DEFS,
  RE_GRADED_MODEL_VERSIONS,
  isPicksH1,
  isNflH2,
  selectPicksH1,
  selectNflH2,
  splitEras,
  isFootballSport,
  parsePicksH1Export,
  loadPicksH1,
  exportSearchPaths,
} from "../holdout";
import type { HoldoutPickRow } from "../types";

const FIXTURE_PATH = path.join(__dirname, "..", "..", "fixtures", "picks-h1.json");

function fixtureRows(): HoldoutPickRow[] {
  const raw = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
  return [...parsePicksH1Export(raw).rows];
}

function row(over: Partial<HoldoutPickRow>): HoldoutPickRow {
  return {
    id: "t",
    sport: "NFL",
    market: "MONEYLINE",
    outcome: 1,
    marketFairProb: 0.6,
    modelProb: 0.65,
    confidence: 65,
    modelVersion: "v5.2.7",
    generatedAt: "2026-09-01T00:00:00.000Z",
    isFounder: false,
    isPublished: true,
    isSettled: true,
    season: 2025,
    ...over,
  };
}

describe("frozen holdout constants", () => {
  it("PICKS-H1 cutoff is 2026-08-01 and is never silently edited", () => {
    // The plan freezes this date. Changing it invalidates every prior scorecard.
    expect(PICKS_H1_CUTOFF).toBe("2026-08-01T00:00:00.000Z");
    expect(HOLDOUT_DEFS["PICKS-H1"].cutoff).toBe(PICKS_H1_CUTOFF);
  });

  it("NFL-H2 seasons are exactly 2020–2025 with discover ≤2019 and live 2026", () => {
    expect([...HOLDOUT_DEFS["NFL-H2"].seasons]).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
    expect(HOLDOUT_DEFS["NFL-H2"].discoverMaxSeason).toBe(2019);
    expect(HOLDOUT_DEFS["NFL-H2"].liveSeason).toBe(2026);
  });

  it("re-graded versions span v5.0.0 → v5.2.7", () => {
    expect(RE_GRADED_MODEL_VERSIONS[0]).toBe("v5.0.0");
    expect(RE_GRADED_MODEL_VERSIONS[RE_GRADED_MODEL_VERSIONS.length - 1]).toBe("v5.2.7");
    expect(RE_GRADED_MODEL_VERSIONS).toContain("v5.2.7");
  });
});

describe("PICKS-H1 membership", () => {
  it("admits a settled published non-founder pick at/after the cutoff", () => {
    expect(isPicksH1(row({}))).toBe(true);
    expect(isPicksH1(row({ generatedAt: PICKS_H1_CUTOFF }))).toBe(true);
  });

  it("excludes pre-cutoff rows — hand count on the fixture", () => {
    // fx-exclude-early is generatedAt 2026-07-15 < cutoff.
    const rows = fixtureRows();
    const early = rows.find((r) => r.id === "fx-exclude-early")!;
    expect(isPicksH1(early)).toBe(false);
    // Membership count on the committed fixture (hand-counted):
    // 32 in-window scored rows + fx-held (null modelProb, still holdout)
    // minus founder / unpublished / unsettled / pre-cutoff / market=0.5 edge.
    const selected = selectPicksH1(rows);
    // founder, unpub, pending, early excluded → 38 − 4 = 34? Let's assert the
    // exact hand count from the fixture file:
    // rows total 38; exclude: founder(1) unpub(1) pending(1) early(1) = 34.
    expect(rows.length).toBe(38);
    expect(selected.length).toBe(34);
    expect(selected.map((r) => r.id)).not.toContain("fx-exclude-founder");
    expect(selected.map((r) => r.id)).not.toContain("fx-exclude-unpub");
    expect(selected.map((r) => r.id)).not.toContain("fx-exclude-pending");
    expect(selected.map((r) => r.id)).not.toContain("fx-exclude-early");
    expect(selected.map((r) => r.id)).toContain("fx-held");
  });

  it("excludes founder rows, unpublished rows, and unsettled rows structurally", () => {
    expect(isPicksH1(row({ isFounder: true }))).toBe(false);
    expect(isPicksH1(row({ isPublished: false }))).toBe(false);
    expect(isPicksH1(row({ isSettled: false }))).toBe(false);
  });

  it("excludes a non-interior marketFairProb (synthetic 0.5 is kept; 0 and 1 are not)", () => {
    // marketFairProb must be in (0,1). A stored 0.5 is a real (if weak) price.
    expect(isPicksH1(row({ marketFairProb: 0.5 }))).toBe(true);
    // Out-of-range values are rejected at parse; membership also guards.
    expect(isPicksH1(row({ marketFairProb: 1 }))).toBe(false);
    expect(isPicksH1(row({ marketFairProb: 0 }))).toBe(false);
  });
});

describe("NFL-H2 membership", () => {
  it("admits NFL seasons 2020–2025 only", () => {
    expect(isNflH2(row({ sport: "NFL", season: 2020 }))).toBe(true);
    expect(isNflH2(row({ sport: "NFL", season: 2025 }))).toBe(true);
    expect(isNflH2(row({ sport: "NFL", season: 2019 }))).toBe(false);
    expect(isNflH2(row({ sport: "NFL", season: 2026 }))).toBe(false);
    expect(isNflH2(row({ sport: "MLB", season: 2022 }))).toBe(false);
  });

  it("hand-count on the fixture: NFL rows with season in 2020–2025", () => {
    // Fixture NFL seasons are 2025 or 2026. Season 2025 NFL rows:
    // fx-001..003, 007..009, 013..015, 019..021, 025..027 = 15 scored
    // plus fx-exclude-early (NFL 2025, pre-PICKS-H1 cutoff) = 16.
    // NFL-H2 is a season window and does not apply the PICKS-H1 date filter.
    const rows = fixtureRows();
    const nflH2 = selectNflH2(rows);
    expect(nflH2.length).toBe(16);
    expect(nflH2.every((r) => r.sport === "NFL" && r.season === 2025)).toBe(true);
  });
});

describe("era split", () => {
  it("splits at discoverMaxSeason — hand: 2019→discover, 2020→validate", () => {
    const rows = [
      row({ id: "a", season: 2019 }),
      row({ id: "b", season: 2018 }),
      row({ id: "c", season: 2020 }),
      row({ id: "d", season: 2025 }),
    ];
    const { discover, validate } = splitEras(rows);
    expect(discover.map((r) => r.id)).toEqual(["a", "b"]);
    expect(validate.map((r) => r.id)).toEqual(["c", "d"]);
  });
});

describe("sport helpers", () => {
  it("football = NFL or NCAAF aliases; MLB is not football", () => {
    expect(isFootballSport("NFL")).toBe(true);
    expect(isFootballSport("nfl")).toBe(true);
    expect(isFootballSport("NCAAF")).toBe(true);
    expect(isFootballSport("MLB")).toBe(false);
    expect(isFootballSport("NBA")).toBe(false);
  });
});

describe("export loading", () => {
  it("loads the committed fixture from the default search path", () => {
    // Simulate repo root = packages/verifier/../.. by passing a root whose
    // packages/verifier/fixtures path resolves to the real fixture.
    const repoRoot = path.join(__dirname, "..", "..", "..", "..");
    const loaded = loadPicksH1(repoRoot);
    expect(loaded.export.holdoutId).toBe("PICKS-H1");
    expect(loaded.export.schemaVersion).toBe(1);
    expect(loaded.export.rows.length).toBe(38);
    expect(loaded.fromFixture).toBe(true);
  });

  it("search paths put the real export before the fixture", () => {
    const paths = exportSearchPaths("/repo");
    expect(paths[0]).toContain("picks-h1.json");
    expect(paths[paths.length - 1]).toContain(path.join("fixtures", "picks-h1.json"));
  });

  it("rejects a malformed export with a named error", () => {
    expect(() => parsePicksH1Export(null)).toThrow(/must be a JSON object/);
    expect(() => parsePicksH1Export({})).toThrow(/missing rows/);
    expect(() =>
      parsePicksH1Export({
        holdoutId: "PICKS-H1",
        rows: [{ id: "x", outcome: 2, marketFairProb: 0.5 }],
      }),
    ).toThrow(/outcome must be 0 or 1/);
  });
});
