/**
 * The Meaning Compiler — compileClaimObject correctness.
 *
 * The bar: the compiler is downgrade-only and every cap comes from a named engine. A fixture claim
 * cannot exceed INFO_ONLY; an unsourced / forbidden / future / competitor claim is capped or refused;
 * the authority meet binds the ceiling; nothing is hand-set; and off fixtures the ceiling lifts.
 */

import { describe, it, expect } from "vitest";
import {
  compileClaimObject,
  validateClaimObject,
  downgradeClaim,
  authorityForClaim,
  type ClaimObjectInput,
} from "../meaning-compiler.js";
import { FIXTURE_AUTHORITY } from "../../parallax-instrument.js";
import type { AuthorityVectorInput } from "../../authority-vector.js";

const LIVE_AUTHORITY: AuthorityVectorInput = {
  rights: "PUBLIC", temporal: "FRESH_POST_LOCK", sourceReality: "LIVE_REAL", evidence: "SUFFICIENT",
  localExpression: "PUBLIC_ACTION", modelMaturity: "PUBLIC_ALLOWED", entitlement: "PUBLIC", ownerAction: "ARMED",
};

function mkInput(over: Partial<ClaimObjectInput> = {}): ClaimObjectInput {
  return {
    objectType: "DERIVED_STAT",
    subject: "Possession Mirage Index — Ecuador vs Germany",
    sport: "soccer",
    eventId: "fixture-soccer-ecu-ger-2026",
    payloadRef: "match-derived-stats:possession_mirage_index",
    sourceLineage: {
      originRefs: ["the-odds-api", "xg-model(fixture)"],
      providerName: "GSE internal (fixture)",
      sourceId: "internal-derived",
      endpointOrUrl: null,
      sourceKind: "INTERNAL_DERIVED",
      directOrDerived: "DERIVED",
      legalVerdict: "FREE_OPEN",
      capturedAtLabel: "fixture",
      observedAtLabel: "fixture",
      knownAtLabel: "pre-match",
      sourceConfidence: 0.6,
      independentOriginCount: 2,
      proofRefs: ["stat-passport:possession_mirage_index"],
    },
    rights: {
      status: "approved_open_license",
      legalVerdict: "FREE_OPEN",
      commercialDisplayAllowed: true,
      publicDisplayAllowed: true,
      storageAllowed: true,
      derivedUseAllowed: true,
      modelTrainingAllowed: false,
      redistributionAllowed: false,
      attributionRequired: true,
      attributionText: "fixture",
      ownerApprovalRequired: false,
      reviewStatus: "REVIEWED",
      reviewedAtLabel: "fixture",
    },
    time: {
      eventTimeLabel: "fixture", observedAtLabel: "fixture", knownAtLabel: "pre-match", capturedAtLabel: "fixture",
      staleAtLabel: null, validUntilLabel: null, decisionTimeLabel: "pre-match", knowability: "KNOWABLE",
      pointInTimeSafe: true, futureLeakageRisk: false,
    },
    semantic: {
      plainText: "ball dominance without threat", definition: "possession% minus xG share% for the dominant side",
      formula: "poss% − xGshare%", units: "pp", interpretation: "fade the sterile, ball-dominant side",
      decisionMeaning: "context for a team-total read", factClass: null, factType: null,
      falsifier: "if xG share tracks possession, the mirage is zero", sampleFragility: 1, contextDependence: "n=1",
    },
    decision: {
      possibleActions: ["watch the team-total market"], currentDecisionState: "WATCHLIST",
      decisionUse: "context only — never an action on one match", suppressesAction: false,
      whatWouldChangeDecision: "a larger sample or a moved line", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "MEDIUM", modelRisk: "MEDIUM", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "MEDIUM", affiliateConflictRisk: "NONE",
      weakness: "single match; provider xG variance", whatWouldInvalidate: "xG share tracking possession",
      riskFlags: ["n=1"],
    },
    authorityVector: FIXTURE_AUTHORITY,
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "at full-time", gradingProtocol: "compare team-total outcome vs the mirage read", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "LEARNING", metricKey: "possession_mirage_index", writesOnSettle: true, note: "fixture" },
    ...over,
  };
}

describe("compileClaimObject — fixture ceiling", () => {
  it("a fully fixture-safe claim caps at INFO_ONLY, lifecycle FIXTURE, watermarked, not publicSafe", () => {
    const c = compileClaimObject(mkInput());
    expect(c.publicExpression).toBe("INFO_ONLY");
    expect(c.lifecycle).toBe("FIXTURE");
    expect(c.fixtureWatermarked).toBe(true);
    expect(c.publicSafe).toBe(false);
    // the cap came from the authority meet binding at SOURCE_REALITY (fixture), not a hand-set number
    expect(authorityForClaim(c).bindingLayers).toContain("SOURCE_REALITY");
    expect(validateClaimObject(c).ok).toBe(true);
  });
});

describe("compileClaimObject — downgrades each name their engine", () => {
  it("an unsourced claim caps at INFO_ONLY via SourceLineage", () => {
    const c = compileClaimObject(mkInput({ sourceLineage: { ...mkInput().sourceLineage, originRefs: [] } }));
    expect(c.explain.downgrades.some((d) => d.stage === "lineage" && d.engine === "SourceLineage")).toBe(true);
    expect(c.publicExpression).toBe("INFO_ONLY");
  });

  it("a forbidden-rights claim is refused (DO_NOT_USE) via isForbidden", () => {
    const c = compileClaimObject(mkInput({ rights: { ...mkInput().rights, legalVerdict: "DO_NOT_USE", status: "excluded" } }));
    expect(c.lifecycle).toBe("DO_NOT_USE");
    expect(c.publicSafe).toBe(false);
    expect(c.explain.downgrades.some((d) => d.stage === "rights" && d.engine === "isForbidden" && d.cappedTo === "DO_NOT_USE")).toBe(true);
    expect(c.explain.canBeShownPublicly).toBe(false);
    // the explanation names the REFUSING engine, not just the downstream authority cap
    expect(c.explain.authorityStory).toMatch(/refused at the rights layer.*isForbidden/i);
  });

  it("a future fact is refused via knowableAt (no future leakage)", () => {
    const c = compileClaimObject(mkInput({ time: { ...mkInput().time, knowability: "NOT_YET_KNOWABLE" } }));
    expect(c.lifecycle).toBe("DO_NOT_USE");
    expect(c.explain.downgrades.some((d) => d.stage === "time" && d.engine === "knowableAt")).toBe(true);
  });

  it("competitor research can never become production fact", () => {
    const c = compileClaimObject(mkInput({ sourceLineage: { ...mkInput().sourceLineage, sourceKind: "COMPETITOR_RESEARCH" } }));
    expect(c.publicExpression).toBe("INFO_ONLY");
    expect(c.explain.downgrades.some((d) => /competitor/i.test(d.reason))).toBe(true);
  });

  it("web evidence without rights promotion caps at INFO_ONLY", () => {
    const c = compileClaimObject(mkInput({
      sourceLineage: { ...mkInput().sourceLineage, sourceKind: "WEB_EVIDENCE" },
      rights: { ...mkInput().rights, derivedUseAllowed: false, status: "permission_required" },
    }));
    expect(c.publicExpression).toBe("INFO_ONLY");
  });
});

describe("compileClaimObject — the ceiling lifts off fixtures (not hard-capped)", () => {
  it("a fully-live, fully-cleared claim requesting WATCH clears to WATCH and is publicSafe", () => {
    const c = compileClaimObject(mkInput({ authorityVector: LIVE_AUTHORITY, requestedExpression: "WATCH" }));
    expect(c.publicExpression).toBe("WATCH");
    expect(c.fixtureWatermarked).toBe(false);
    expect(c.publicSafe).toBe(true);
    expect(c.lifecycle).not.toBe("FIXTURE");
  });
});

describe("validate + downgrade + determinism", () => {
  it("validateClaimObject catches an over-strength tampered claim", () => {
    const c = compileClaimObject(mkInput());
    const tampered = { ...c, publicExpression: "PUBLIC_ACTION" as const };
    expect(validateClaimObject(tampered).ok).toBe(false);
  });

  it("downgradeClaim only lowers and records; never raises", () => {
    const c = compileClaimObject(mkInput({ authorityVector: LIVE_AUTHORITY, requestedExpression: "ACTION" }));
    const d = downgradeClaim(c, { engine: "manual", reason: "owner hold", toCeiling: "WATCH" });
    expect(d.publicExpression).toBe("WATCH");
    expect(d.explain.downgrades.length).toBe(c.explain.downgrades.length + 1);
    // raising is a no-op
    const r = downgradeClaim(c, { engine: "x", reason: "y", toCeiling: "PUBLIC_ACTION" });
    expect(r.publicExpression).toBe(c.publicExpression);
  });

  it("is deterministic: same input → same id and expression", () => {
    expect(compileClaimObject(mkInput()).claimObjectId).toBe(compileClaimObject(mkInput()).claimObjectId);
    expect(compileClaimObject(mkInput()).publicExpression).toBe(compileClaimObject(mkInput()).publicExpression);
  });

  it("explain answers all ten core-law questions (non-empty)", () => {
    const e = compileClaimObject(mkInput()).explain;
    for (const v of [e.whatAmI, e.whereFrom, e.whenKnowable, e.allowedToMean, e.decisionItChanges, e.weaknesses, e.authorityStory, e.afterResult, e.whatWouldStrengthen]) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
    expect(typeof e.canBeShownPublicly).toBe("boolean");
  });
});
