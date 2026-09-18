import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IndependentEdgeSummary } from "@sports/types";
import {
  REFUSAL_CENSUS_PRODUCTION_NEEDS,
  REFUSAL_CENSUS_REQUIRED_COLUMNS,
  REFUSAL_CENSUS_SQL,
  REFUSAL_CENSUS_UNPERSISTED_FAMILIES,
  censusRefusals,
  eventsFromPickRow,
  type ProductionPickRow,
} from "../refusal-census.js";

const pkgRoot = join(__dirname, "../../.."); // CommonJS: import.meta is not allowed under this package's tsconfig.
const tsxBin = join(pkgRoot, "../../node_modules/.bin/tsx");
const runner = "src/edge-lab/run-refusal-census.ts";

function edge(partial: Partial<IndependentEdgeSummary> = {}): IndependentEdgeSummary {
  return {
    decision: "PASS",
    agreement: "SOLO",
    marketFairProb: 0.62,
    trueProb: 0.44,
    rawEdge: -0.18,
    shrunkEdge: -0.12,
    expectedClv: -0.08,
    conviction: 40,
    sources: ["elo"],
    priced: false,
    rationale: "test",
    trueProbBasis: "as_of_mint",
    ...partial,
  };
}

function row(partial: Partial<ProductionPickRow> & Pick<ProductionPickRow, "id">): ProductionPickRow {
  return {
    sport: "americanfootball_nfl",
    weekKey: "2026-W03",
    ...partial,
  };
}

describe("refusal census mill", () => {
  it("names the production columns and SQL it needs", () => {
    expect(REFUSAL_CENSUS_SQL).toContain("p.id");
    expect(REFUSAL_CENSUS_SQL).toContain("s.key AS sport");
    expect(REFUSAL_CENSUS_SQL).toContain('"weekKey"');
    expect(REFUSAL_CENSUS_SQL).toContain('"factorBreakdown"');
    expect(REFUSAL_CENSUS_SQL).toContain('"isPublished"');
    expect(REFUSAL_CENSUS_SQL).toContain("p.result::text");
    expect(REFUSAL_CENSUS_SQL).toContain('"gateStatus"');
    expect(REFUSAL_CENSUS_SQL).toContain('"gateReasonCode"');
    expect(REFUSAL_CENSUS_SQL).toContain("FROM picks p");
    expect(REFUSAL_CENSUS_SQL).toContain("gate_decisions");
    expect(REFUSAL_CENSUS_SQL).toContain('g."mergedIntoGameId" IS NULL');
    for (const col of REFUSAL_CENSUS_REQUIRED_COLUMNS) {
      expect(REFUSAL_CENSUS_SQL).toContain(col === "id" ? "p.id" : col);
    }
    expect(REFUSAL_CENSUS_PRODUCTION_NEEDS.missingInput).toMatch(/not columns on picks/);
    expect(REFUSAL_CENSUS_PRODUCTION_NEEDS.callerList).toMatch(/ranking-prob\.ts/);
    expect(REFUSAL_CENSUS_PRODUCTION_NEEDS.callerList).toMatch(/No trainer calls the throwing form/);
  });

  it("counts PASS, adverse edge, leaked trueProb, and published-PASS separately", () => {
    const rows: ProductionPickRow[] = [
      row({
        id: "a",
        isPublished: true,
        factorBreakdown: { independentEdge: edge() },
      }),
      row({
        id: "b",
        sport: "basketball_nba",
        weekKey: "2026-W04",
        factorBreakdown: {
          independentEdge: edge({
            decision: "SPEAK",
            expectedClv: 0.04,
            trueProbBasis: "post_settlement_backfill",
            trueProb: 0.7,
          }),
        },
      }),
      row({
        id: "c",
        factorBreakdown: { independentEdge: edge({ decision: "LEAN", expectedClv: 0.02 }) },
      }),
    ];
    const table = censusRefusals(rows);
    expect(table.nRows).toBe(3);
    expect(table.dbQueried).toBe(false);
    expect(table.priced).toBe(false);
    expect(table.byFamily.independent_edge_pass).toBe(1);
    expect(table.byFamily.published_pass).toBe(1);
    expect(table.byFamily.adverse_edge).toBe(1);
    expect(table.byFamily.trueprob_basis).toBe(1);
    const nflPass = table.cells.find(
      (c) => c.family === "independent_edge_pass" && c.sport === "americanfootball_nfl" && c.weekKey === "2026-W03",
    );
    expect(nflPass?.n).toBe(1);
    expect(table.inputCoverage.observed.trueprob_basis).toBe(3);
    expect(table.inputCoverage.unobservedFamilies).toEqual(
      expect.arrayContaining([...REFUSAL_CENSUS_UNPERSISTED_FAMILIES]),
    );
  });

  it("counts shadow unlicensed math when the caller attached the flags", () => {
    const ev = eventsFromPickRow(
      row({
        id: "shadow",
        cqrLicensed: false,
        jackknifeLicensed: false,
        jackknifeRefusedBound: "upper",
        ivapWidth: 1,
        conformalLicensed: false,
        devigOk: false,
        gateStatus: "GATED",
        gateReasonCode: "WIDTH_EXCEEDED",
      }),
    );
    expect(ev.map((e) => e.family).sort()).toEqual([
      "conformal_unlicensed",
      "cqr_unlicensed",
      "devig_refused",
      "gate_gated",
      "ivap_empty",
      "jackknife_plus_unlicensed",
    ]);
    expect(ev.find((e) => e.family === "jackknife_plus_unlicensed")?.reason).toBe(
      "refusedBound=upper",
    );
  });

  it("replica-shaped rows do not report unpersisted families as a 0% rate", () => {
    const table = censusRefusals([
      row({
        id: "sql",
        isPublished: true,
        result: "WIN",
        gateStatus: null,
        gateReasonCode: null,
        factorBreakdown: { independentEdge: edge({ decision: "LEAN", expectedClv: 0.02 }) },
      }),
    ]);
    expect(table.byFamily.cqr_unlicensed).toBe(0);
    expect(table.inputCoverage.observed.cqr_unlicensed).toBe(0);
    expect(table.inputCoverage.unobservedFamilies).toContain("cqr_unlicensed");
    expect(table.inputCoverage.unobservedFamilies).toContain("jackknife_plus_unlicensed");
    expect(table.inputCoverage.unobservedFamilies).toContain("ivap_empty");
    expect(table.inputCoverage.observed.independent_edge_pass).toBe(1);
    expect(table.inputCoverage.unobservedFamilies).not.toContain("independent_edge_pass");
  });

  it("silence (no independentEdge) is not a pass and not a refusal", () => {
    const ev = eventsFromPickRow(row({ id: "quiet" }));
    expect(ev).toEqual([]);
  });

  it("zero rows is nRows=0, not a clean-production story", () => {
    const table = censusRefusals([]);
    expect(table.nRows).toBe(0);
    expect(table.nEvents).toBe(0);
    expect(table.cells).toEqual([]);
    expect(table.inputCoverage.unobservedFamilies).toHaveLength(10);
  });

  it("throws when id/sport/weekKey are missing", () => {
    expect(() => eventsFromPickRow({ id: "", sport: "nfl", weekKey: "2026-W03" })).toThrow(
      /id, sport, weekKey/,
    );
  });
});

describe("refusal-census runner", () => {
  it("--print-sql exits 0 and prints the named query", () => {
    const r = spawnSync(tsxBin, [runner, "--print-sql"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("FROM picks p");
    expect(r.stdout).toContain("gate_decisions");
  });

  it("--needs names the missing persisted flags", () => {
    const r = spawnSync(tsxBin, [runner, "--needs"], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const needs = JSON.parse(r.stdout) as typeof REFUSAL_CENSUS_PRODUCTION_NEEDS;
    expect(needs.notPersistedToday).toContain("cqr_unlicensed");
    expect(needs.env).toBe("READONLY_DATABASE_URL");
    expect(needs.missingInput).toMatch(/unobserved/);
  });

  it("--rows on a fixture exits 0 and reports per-reason counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "refusal-census-"));
    const file = join(dir, "rows.json");
    writeFileSync(
      file,
      JSON.stringify([
        row({
          id: "x",
          isPublished: true,
          factorBreakdown: { independentEdge: edge() },
        }),
      ]),
    );
    const r = spawnSync(tsxBin, [runner, "--rows", file], { cwd: pkgRoot, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const table = JSON.parse(r.stdout);
    expect(table.nRows).toBe(1);
    expect(table.byFamily.published_pass).toBe(1);
    expect(table.dbQueried).toBe(false);
    expect(table.inputCoverage.unobservedFamilies).toContain("cqr_unlicensed");
  });

  it("missing --rows file exits 2 and names the missing input", () => {
    const r = spawnSync(tsxBin, [runner, "--rows", "/no/such/file.json"], {
      cwd: pkgRoot,
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/missing input/);
  });
});
