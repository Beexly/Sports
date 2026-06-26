/**
 * SerpApi Google Sports adapter — parsing + recipes + cost + allowed-use. No network, no key.
 *
 * The bar: team-sport / spotlight / standings / athlete payloads parse; kgmids and highlights extract;
 * recipes cap at WATCH and forbid settlement/production-truth/betting uses; cost is deterministic; every
 * output carries the SERPAPI_GOOGLE_SPORTS source type.
 */

import { describe, it, expect } from "vitest";
import {
  parseSportsResults,
  extractKgEntities,
  extractHighlights,
  extractStandings,
  extractGameSpotlight,
  buildQueryRecipe,
  estimateSerpApiCost,
  validateAllowedUse,
  SERPAPI_GOOGLE_SPORTS_SOURCE_TYPE,
  SERPAPI_FIXTURE_SOCCER_LIVE,
  SERPAPI_FIXTURE_STANDINGS,
} from "../serpapi-google-sports.js";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

describe("parsing fixture payloads (no network)", () => {
  it("parses a live soccer spotlight", () => {
    const r = parseSportsResults(SERPAPI_FIXTURE_SOCCER_LIVE, "Ecuador vs Germany");
    expect(r.resultType).toBe("LIVE_GAME");
    expect(r.spotlight?.score).toBe("2 - 1");
    expect(r.spotlight?.teams).toContain("Ecuador");
    expect(r.sourceType).toBe(SERPAPI_GOOGLE_SPORTS_SOURCE_TYPE);
  });
  it("extracts kgmids (teams + venue) — the entity-resolution gem", () => {
    const kg = extractKgEntities(SERPAPI_FIXTURE_SOCCER_LIVE);
    expect(kg.some((e) => e.entityType === "TEAM" && e.kgmid.startsWith("/m/"))).toBe(true);
    expect(kg.some((e) => e.entityType === "VENUE")).toBe(true);
  });
  it("extracts highlights into link candidates", () => {
    const hl = extractHighlights(SERPAPI_FIXTURE_SOCCER_LIVE);
    expect(hl.length).toBeGreaterThan(0);
    expect(hl[0]!.link).toMatch(/^https?:/);
  });
  it("parses a standings one-box", () => {
    const r = parseSportsResults(SERPAPI_FIXTURE_STANDINGS, "AL East standings");
    expect(r.resultType).toBe("STANDINGS");
    expect(extractStandings(SERPAPI_FIXTURE_STANDINGS)?.rows.length).toBe(2);
    expect(extractGameSpotlight(SERPAPI_FIXTURE_STANDINGS)).toBeNull();
  });
});

describe("query recipes — public observer only, never settlement", () => {
  it("a recipe caps at WATCH, is owner-gated, and runs FIXTURE_ONLY", () => {
    const recipe = buildQueryRecipe({ recipeId: "r1", queryTemplate: "{team} standings", sport: "soccer", expectedResultType: "STANDINGS", purpose: "STANDINGS_CHECK" });
    expect(recipe.authorityCeiling).toBe("WATCH");
    expect(recipe.ownerApprovalRequired).toBe(true);
    expect(recipe.runMode).toBe("FIXTURE_ONLY");
    expect(validateAllowedUse(recipe).ok).toBe(true);
  });
  it("a recipe whose use implies settlement/production-truth is rejected", () => {
    const bad = { ...buildQueryRecipe({ recipeId: "r2", queryTemplate: "x", sport: "soccer", expectedResultType: "OTHER", purpose: "PUBLIC_OBSERVER" }), allowedUse: ["use as official settlement"] };
    expect(validateAllowedUse(bad).ok).toBe(false);
  });
  it("cost is deterministic and non-negative", () => {
    expect(estimateSerpApiCost(10)).toBe(estimateSerpApiCost(10));
    expect(estimateSerpApiCost(-5)).toBe(0);
  });
});

describe("no live network / no key leakage in this module", () => {
  it("the source contains no fetch/axios/http call and reads no API key", () => {
    const dir = resolve(process.cwd(), ".");
    void dir;
    // resolve relative to this test file so it is cwd-independent (CI runs from the package dir)
    const here = readdirSync(resolve(__dirname, ".."));
    expect(here).toContain("serpapi-google-sports.ts");
    const src = readFileSync(resolve(__dirname, "..", "serpapi-google-sports.ts"), "utf8");
    expect(src).not.toMatch(/fetch\(|axios|https?\.request|api_key|apiKey|process\.env/);
  });
});
