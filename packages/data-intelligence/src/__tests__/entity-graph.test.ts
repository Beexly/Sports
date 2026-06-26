/**
 * Entity Graph — identity resolution via Google KGMID + provider aliases.
 *
 * The bar: a kgmid creates a DISCOVERED candidate; aliases resolve only with sport/league context;
 * conflicts are flagged (never auto-merged); only cross-verification reaches CANONICAL; a kgmid helps
 * identity but does not prove current truth (confidence stays sub-canonical until verified).
 */

import { describe, it, expect } from "vitest";
import {
  createEntityCandidateFromGoogleSports,
  linkProviderEntityToGseEntity,
  resolveEntityAlias,
  detectEntityConflict,
  crossVerifyEntity,
  entityPassportFor,
} from "../entity-graph.js";
import { extractKgEntities, SERPAPI_FIXTURE_SOCCER_LIVE } from "../serpapi-google-sports.js";

const kg = extractKgEntities(SERPAPI_FIXTURE_SOCCER_LIVE);
const germany = kg.find((e) => e.name === "Germany")!;

describe("kgmid creates a candidate, but never canonical truth by itself", () => {
  it("creates a DISCOVERED candidate anchored to the kgmid", () => {
    const p = createEntityCandidateFromGoogleSports(germany, { sport: "soccer", league: "FIFA World Cup" });
    expect(p.status).toBe("DISCOVERED");
    expect(p.googleKgmid).toBe(germany.kgmid);
    expect(p.confidence).toBeLessThan(0.9); // not canonical without verification
    expect(p.rightsStatus).toBe("review_required");
  });

  it("linking a provider id advances to ALIAS_ONLY and adds the alias", () => {
    const p = linkProviderEntityToGseEntity(createEntityCandidateFromGoogleSports(germany, { sport: "soccer" }), "the-odds-api", "GER", "Germany NT");
    expect(p.status).toBe("ALIAS_ONLY");
    expect(p.providerIds["the-odds-api"]).toBe("GER");
    expect(p.aliases).toContain("Germany NT");
  });
});

describe("alias resolution requires context; conflicts are flagged", () => {
  it("resolves only within matching sport/league, and refuses an ambiguous alias", () => {
    const a = createEntityCandidateFromGoogleSports(germany, { sport: "soccer" });
    const b = { ...createEntityCandidateFromGoogleSports({ name: "Germany", entityType: "TEAM", kgmid: "/m/zzz" }, { sport: "basketball" }) };
    // same alias "Germany" in two sports → unambiguous WITH context, ambiguous without
    expect(resolveEntityAlias([a, b], "Germany", { sport: "soccer" })?.sport).toBe("soccer");
    expect(resolveEntityAlias([a, b], "Germany", {})).toBeNull(); // ambiguous → refuse
  });

  it("detects an alias mapped to more than one entity", () => {
    const a = createEntityCandidateFromGoogleSports(germany, { sport: "soccer" });
    const b = createEntityCandidateFromGoogleSports({ name: "Germany", entityType: "TEAM", kgmid: "/m/zzz" }, { sport: "basketball" });
    const conflicts = detectEntityConflict([a, b]);
    expect(conflicts.some((c) => c.alias === "germany")).toBe(true);
  });
});

describe("cross-verification is the only path to canonical", () => {
  it("a confirming official name reaches CANONICAL; a mismatch is CONFLICTED", () => {
    const p = createEntityCandidateFromGoogleSports(germany, { sport: "soccer" });
    expect(crossVerifyEntity(p, { officialName: "Germany", lastVerifiedAt: "fixture" }).status).toBe("CANONICAL");
    expect(crossVerifyEntity(p, { officialName: "France", lastVerifiedAt: "fixture" }).status).toBe("CONFLICTED");
  });

  it("entityPassportFor finds by GSE id", () => {
    const p = createEntityCandidateFromGoogleSports(germany, { sport: "soccer" });
    expect(entityPassportFor([p], p.gseEntityId)).toBe(p);
  });
});
