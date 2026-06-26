/**
 * ACQUISITION PLAN — the portfolio actually drives the plan (not just a label).
 *
 * Proves the operator semantics: the selected portfolio constrains the candidates priced, the keys
 * required, and the fact classes / decision states unlocked; bad budget and unknown portfolio fail with
 * a nonzero exit code; nothing here reads env or network.
 */

import { describe, it, expect } from "vitest";
import type { BudgetCandidate } from "@sports/data-intelligence";
import { buildAcquisitionPlan, resolvePortfolio } from "../index.js";

const CANDIDATES: readonly BudgetCandidate[] = [
  { sourceId: "nflverse", costPerMonth: 0, priority: 0.9, recommendation: "EXPAND_EXISTING" },
  { sourceId: "sleeper", costPerMonth: 0, priority: 0.8, recommendation: "ADD_ADAPTER" },
  { sourceId: "the_odds_api", costPerMonth: 119, priority: 0.95, recommendation: "USE_NOW" },
  { sourceId: "sportsgameodds", costPerMonth: 99, priority: 0.7, recommendation: "PAID_EVALUATION" },
  { sourceId: "fantasydata", costPerMonth: 199, priority: 0.6, recommendation: "PAID_EVALUATION" },
  { sourceId: "draftkings_unofficial", costPerMonth: 0, priority: 0.1, recommendation: "DO_NOT_USE" },
];

describe("input validation → nonzero exit code", () => {
  it("rejects a NaN budget", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Bootstrap Free", budget: Number("abc"), candidates: CANDIDATES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.exitCode).toBe(2);
  });
  it("rejects a negative budget", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Bootstrap Free", budget: -50, candidates: CANDIDATES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.exitCode).toBe(2);
  });
  it("rejects an unknown portfolio", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Nonexistent Stack", budget: 100, candidates: CANDIDATES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.exitCode).toBe(2);
  });
});

describe("the portfolio constrains the candidates priced", () => {
  it("Market-Calibration Minimum prices ONLY its own sources (the plan == the portfolio)", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Market-Calibration Minimum", budget: 300, candidates: CANDIDATES });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const portfolioSources = new Set(r.portfolio.sourceIds);
    // Every candidate considered is in the portfolio; the forbidden/out-of-portfolio source is excluded.
    for (const s of r.candidateSourceIds) expect(portfolioSources.has(s)).toBe(true);
    expect(r.candidateSourceIds).not.toContain("fantasydata"); // not in this portfolio
    expect(r.candidateSourceIds).not.toContain("draftkings_unofficial");
    const planned = [...r.budget.selected.map((s) => s.sourceId), ...r.budget.deferred.map((d) => d.sourceId)];
    for (const s of planned) expect(portfolioSources.has(s)).toBe(true);
  });

  it("a different portfolio prices a different candidate set", () => {
    const market = buildAcquisitionPlan({ portfolioName: "Market-Calibration Minimum", budget: 300, candidates: CANDIDATES });
    const dfs = buildAcquisitionPlan({ portfolioName: "Fantasy/DFS Minimum", budget: 300, candidates: CANDIDATES });
    expect(market.ok && dfs.ok).toBe(true);
    if (!market.ok || !dfs.ok) return;
    expect(dfs.candidateSourceIds).toContain("fantasydata");
    expect(market.candidateSourceIds).not.toContain("fantasydata");
  });
});

describe("keys, fact classes, and decision states are portfolio-derived", () => {
  it("Bootstrap Free needs no required keys", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Bootstrap Free", budget: 0, candidates: CANDIDATES });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredKeys).toEqual([]);
  });

  it("Market-Calibration Minimum requires the two market keys (presence checked by the CLI, never read)", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Market-Calibration Minimum", budget: 300, candidates: CANDIDATES });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredKeys).toContain("THE_ODDS_API_KEY");
    expect(r.requiredKeys).toContain("SPORTSGAMEODDS_KEY");
    expect(r.requiredKeys).not.toContain("FANTASYDATA_KEY"); // not in this portfolio
  });

  it("reports fact classes + decision states the portfolio could catalogue", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Full Startup Stack", budget: 600, candidates: CANDIDATES });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.factClassesUnlocked.length).toBeGreaterThan(0);
    expect(r.factClassesUnlocked).toContain("market");
    // DFS states need a paid salary feed, which this stack includes → catalogue-able.
    expect(r.decisionStatesCatalogued).toContain("DFS_SALARY_LAG");
  });

  it("the bare free portfolio cannot catalogue a DFS state (no salary feed)", () => {
    const r = buildAcquisitionPlan({ portfolioName: "Bootstrap Free", budget: 0, candidates: CANDIDATES });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.decisionStatesCatalogued).not.toContain("DFS_SALARY_LAG");
  });
});

describe("resolvePortfolio is forgiving but deterministic", () => {
  it("matches by slug", () => {
    expect(resolvePortfolio("market-calibration-minimum")?.name).toBe("Market-Calibration Minimum");
    expect(resolvePortfolio("bootstrap free")?.name).toBe("Bootstrap Free");
  });
});
