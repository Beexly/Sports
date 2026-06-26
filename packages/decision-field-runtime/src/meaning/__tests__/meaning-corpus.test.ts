/**
 * The compiled corpus + the Galileo lenses + the page-factory contract.
 *
 * The bar: every proof object across three sports compiles into one grammar (nothing escapes the
 * compiler); the lenses are pure read-only projections; and a page may render only what its route
 * status + declared gates permit.
 */

import { describe, it, expect } from "vitest";
import { compileAllFixtures, compiledFixturesByType } from "../meaning-fixtures.js";
import { validateClaimObject } from "../meaning-compiler.js";
import { allLenses, authorityFlightRecorderLens } from "../meaning-lenses.js";
import { validatePageRender, maxExpressionForRoute } from "../page-factory-contract.js";
import { ROUTE_AUTHORITY_REGISTRY } from "../../route-authority-registry.js";
import { ALL_OBJECT_TYPES } from "../claim-object.js";

describe("compiled corpus — cross-domain, nothing escapes the compiler", () => {
  const corpus = compileAllFixtures();

  it("compiles a rich multi-sport corpus, all valid and fixture-only", () => {
    expect(corpus.length).toBeGreaterThan(40);
    for (const c of corpus) {
      expect(validateClaimObject(c).ok).toBe(true);
      // fixture corpus: everything is watermarked and capped at INFO_ONLY (or refused)
      expect(c.fixtureWatermarked).toBe(true);
      expect(c.publicExpression).toBe("INFO_ONLY");
      expect(c.publicSafe).toBe(false);
    }
  });

  it("spans many object types (one grammar for the whole institution)", () => {
    const byType = compiledFixturesByType();
    const present = Object.keys(byType);
    for (const t of ["DERIVED_STAT", "TREND", "PREDICTION", "ODDS_PRICE", "MARKET_STATE", "BONUS", "API_PROVIDER", "ALERT", "WEB_EVIDENCE"]) {
      expect(present).toContain(t);
    }
    // every present type is a known ObjectType
    for (const t of present) expect(ALL_OBJECT_TYPES).toContain(t as never);
  });

  it("every prediction has a trial, every trend a passport, every stat a passport", () => {
    const byType = compiledFixturesByType();
    for (const p of byType.PREDICTION ?? []) expect(p.autopsyHook.hasTrial).toBe(true);
    for (const t of byType.TREND ?? []) expect(t.sourceLineage.proofRefs.some((r) => /trend-passport/.test(r))).toBe(true);
    for (const s of byType.DERIVED_STAT ?? []) expect(s.sourceLineage.proofRefs.some((r) => /stat-passport/.test(r))).toBe(true);
  });
});

describe("Galileo lenses — pure read-only instruments", () => {
  const corpus = compileAllFixtures();

  it("all eight lenses render rows without mutating the corpus", () => {
    const snapshot = JSON.stringify(corpus);
    const lenses = allLenses(corpus);
    expect(lenses).toHaveLength(8);
    expect(JSON.stringify(corpus)).toBe(snapshot); // no mutation
    for (const l of lenses) {
      expect(l.title.length).toBeGreaterThan(0);
      for (const r of l.rows) expect(typeof r.headline).toBe("string");
    }
  });

  it("the flight recorder reports a binding layer for every row, and fixtures bind at INFO_ONLY", () => {
    const lens = authorityFlightRecorderLens(corpus);
    expect(lens.rows.length).toBeGreaterThan(0);
    for (const r of lens.rows) expect(r.headline).toMatch(/INFO_ONLY/);
  });
});

describe("page-factory contract — pages are enforced renderers", () => {
  it("maxExpressionForRoute: fixture/preview routes cannot exceed INFO_ONLY/WATCH; DO_NOT_PUBLISH renders nothing", () => {
    expect(maxExpressionForRoute("FIXTURE_ONLY")).toBe("INFO_ONLY");
    expect(maxExpressionForRoute("PREVIEW_ALLOWED")).toBe("WATCH");
    expect(maxExpressionForRoute("LIVE_ALLOWED")).toBe("PUBLIC_ACTION");
    expect(maxExpressionForRoute("DO_NOT_PUBLISH")).toBeNull();
  });

  it("a fixture-only route renders the fixture corpus cleanly", () => {
    const corpus = compileAllFixtures();
    const route = ROUTE_AUTHORITY_REGISTRY.find((r) => r.status === "FIXTURE_ONLY") ?? ROUTE_AUTHORITY_REGISTRY[0]!;
    const res = validatePageRender({ route: { ...route, status: "FIXTURE_ONLY" }, claims: corpus.filter((c) => c.lifecycle !== "DO_NOT_USE") });
    expect(res.ok).toBe(true);
    expect(res.renderedExpression).toBe("INFO_ONLY");
  });

  it("a DO_NOT_USE claim can never be rendered", () => {
    const corpus = compileAllFixtures();
    const refused = corpus.find((c) => c.lifecycle === "DO_NOT_USE");
    if (refused) {
      const route = ROUTE_AUTHORITY_REGISTRY[0]!;
      expect(validatePageRender({ route, claims: [refused] }).ok).toBe(false);
    }
  });

  it("a prediction route with a trial-less prediction fails the contract", () => {
    const route = ROUTE_AUTHORITY_REGISTRY.find((r) => r.requiresPredictionTrial);
    if (route) {
      const corpus = compileAllFixtures();
      const pred = corpus.find((c) => c.objectType === "PREDICTION");
      if (pred) {
        const trialless = { ...pred, autopsyHook: { ...pred.autopsyHook, hasTrial: false } };
        expect(validatePageRender({ route, claims: [trialless] }).ok).toBe(false);
      }
    }
  });
});
