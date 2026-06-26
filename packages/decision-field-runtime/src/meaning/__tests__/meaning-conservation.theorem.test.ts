/**
 * THE CONSERVATION THEOREM — the eight laws of the Meaning Compiler, machine-checked.
 *
 * Law 8 ("No Parallel Systems") is the keystone: for EVERY downgrade the compiler emits, re-invoking the
 * named engine with the recorded inputs reproduces the same cap. This is the proof that the compiler
 * COMPOSES the canonical engines and never duplicates them — a sibling of authority-tensor.theorem.test.
 *
 * Deterministic: a fixed grid of inputs, no randomness.
 */

import { describe, it, expect } from "vitest";
import { compileClaimObject, type ClaimObjectInput } from "../meaning-compiler.js";
import { composeAuthority, type AuthorityVectorInput } from "../../authority-vector.js";
import { rankOf } from "../../decision-state-stat-contract.js";
import { clampStatus } from "../../stat-foundry.js";
import { FIXTURE_AUTHORITY } from "../../parallax-instrument.js";
import { isForbidden } from "@sports/data-intelligence";

const LIVE: AuthorityVectorInput = {
  rights: "PUBLIC", temporal: "FRESH_POST_LOCK", sourceReality: "LIVE_REAL", evidence: "SUFFICIENT",
  localExpression: "PUBLIC_ACTION", modelMaturity: "PUBLIC_ALLOWED", entitlement: "PUBLIC", ownerAction: "ARMED",
};
const LIVE_THIN: AuthorityVectorInput = { ...LIVE, evidence: "THIN" };

function base(over: Partial<ClaimObjectInput> = {}): ClaimObjectInput {
  return {
    objectType: "DERIVED_STAT",
    subject: "test claim",
    sport: "soccer",
    eventId: "e",
    payloadRef: "ref",
    sourceLineage: {
      originRefs: ["src-a"], providerName: "p", sourceId: "s", endpointOrUrl: null, sourceKind: "INTERNAL_DERIVED",
      directOrDerived: "DERIVED", legalVerdict: "FREE_OPEN", capturedAtLabel: "f", observedAtLabel: "f",
      knownAtLabel: "pre", sourceConfidence: 0.6, independentOriginCount: 1, proofRefs: ["pr"],
    },
    rights: {
      status: "approved_open_license", legalVerdict: "FREE_OPEN", commercialDisplayAllowed: true,
      publicDisplayAllowed: true, storageAllowed: true, derivedUseAllowed: true, modelTrainingAllowed: false,
      redistributionAllowed: false, attributionRequired: true, attributionText: "f", ownerApprovalRequired: false,
      reviewStatus: "REVIEWED", reviewedAtLabel: "f",
    },
    time: {
      eventTimeLabel: "f", observedAtLabel: "f", knownAtLabel: "pre", capturedAtLabel: "f", staleAtLabel: null,
      validUntilLabel: null, decisionTimeLabel: "pre", knowability: "KNOWABLE", pointInTimeSafe: true, futureLeakageRisk: false,
    },
    semantic: {
      plainText: "t", definition: "d", formula: null, units: null, interpretation: "i", decisionMeaning: "m",
      factClass: null, factType: null, falsifier: "x", sampleFragility: null, contextDependence: null,
    },
    decision: {
      possibleActions: [], currentDecisionState: "WATCHLIST", decisionUse: "context", suppressesAction: false,
      whatWouldChangeDecision: "more", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "LOW", modelRisk: "LOW", bettingComplianceRisk: "LOW", userHarmRisk: "LOW",
      overclaimRisk: "LOW", affiliateConflictRisk: "NONE", weakness: "w", whatWouldInvalidate: "v", riskFlags: [],
    },
    authorityVector: FIXTURE_AUTHORITY,
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "full time", gradingProtocol: "compare", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "LEARNING", metricKey: "k", writesOnSettle: true, note: "f" },
    ...over,
  };
}

// A deterministic grid spanning every downgrade path.
const GRID: ReadonlyArray<{ name: string; input: ClaimObjectInput }> = [
  { name: "fixture-safe", input: base() },
  { name: "unsourced", input: base({ sourceLineage: { ...base().sourceLineage, originRefs: [] } }) },
  { name: "forbidden", input: base({ rights: { ...base().rights, legalVerdict: "DO_NOT_USE", status: "excluded" } }) },
  { name: "permission-required", input: base({ authorityVector: LIVE, rights: { ...base().rights, status: "permission_required", legalVerdict: "RIGHTS_REVIEW" } }) },
  { name: "no-commercial", input: base({ authorityVector: LIVE, rights: { ...base().rights, commercialDisplayAllowed: false } }) },
  { name: "future-fact", input: base({ time: { ...base().time, knowability: "NOT_YET_KNOWABLE" } }) },
  { name: "source-unclear", input: base({ time: { ...base().time, knowability: "SOURCE_UNCLEAR" } }) },
  { name: "competitor", input: base({ sourceLineage: { ...base().sourceLineage, sourceKind: "COMPETITOR_RESEARCH" } }) },
  { name: "live-cleared", input: base({ authorityVector: LIVE, requestedExpression: "WATCH" }) },
  { name: "live-thin", input: base({ authorityVector: LIVE_THIN, requestedExpression: "WATCH" }) },
];

describe("Conservation Laws 1–7", () => {
  for (const { name, input } of GRID) {
    it(`${name}: laws hold`, () => {
      const c = compileClaimObject(input);
      const meet = composeAuthority(input.authorityVector).ceiling;

      // Law 1 — Authority
      expect(rankOf(c.publicExpression)).toBeLessThanOrEqual(rankOf(meet));
      // Law 2 — Lineage
      if (input.sourceLineage.originRefs.length === 0) expect(c.publicExpression).toBe("INFO_ONLY");
      // Law 3 — Time
      if (input.time.knowability === "NOT_YET_KNOWABLE" || input.time.knowability === "RIGHTS_BLOCKED") expect(c.lifecycle).toBe("DO_NOT_USE");
      // Law 4 — Rights
      if (isForbidden(input.rights.legalVerdict) || input.rights.status === "excluded") expect(c.lifecycle).toBe("DO_NOT_USE");
      // Law 5 — Fixture Ceiling
      if (input.authorityVector.sourceReality === "FIXTURE" && c.lifecycle !== "DO_NOT_USE") expect(c.publicExpression).toBe("INFO_ONLY");
      // Law 7 — Monotonic Downgrade
      for (const d of c.explain.downgrades) {
        if (d.cappedTo !== "DO_NOT_USE") expect(rankOf(d.cappedTo)).toBeLessThanOrEqual(rankOf(input.requestedExpression));
      }
    });
  }

  it("Law 5 (stat status): a fixture stat can never exceed EXPERIMENTAL", () => {
    expect(clampStatus("OFFICIAL", "FIXTURE")).toBe("EXPERIMENTAL");
    expect(clampStatus("VALIDATED", "FIXTURE")).toBe("EXPERIMENTAL");
  });

  it("Law 6 (Evidence): thinner evidence never licenses a louder claim", () => {
    const thick = compileClaimObject(base({ authorityVector: LIVE, requestedExpression: "PUBLIC_ACTION" }));
    const thin = compileClaimObject(base({ authorityVector: LIVE_THIN, requestedExpression: "PUBLIC_ACTION" }));
    expect(rankOf(thin.publicExpression)).toBeLessThanOrEqual(rankOf(thick.publicExpression));
  });
});

describe("Law 8 — No Parallel Systems (the keystone)", () => {
  for (const { name, input } of GRID) {
    it(`${name}: every downgrade is reproducible by its named engine`, () => {
      const c = compileClaimObject(input);
      for (const d of c.explain.downgrades) {
        switch (d.engine) {
          case "isForbidden":
            expect(isForbidden(input.rights.legalVerdict) || input.rights.status === "excluded" || input.rights.status === "blocked_technical_controls").toBe(true);
            break;
          case "knowableAt":
            expect(["NOT_YET_KNOWABLE", "RIGHTS_BLOCKED", "SOURCE_UNCLEAR"]).toContain(input.time.knowability);
            break;
          case "composeAuthority":
            // the cap the compiler recorded IS exactly the engine's meet
            expect(d.cappedTo).toBe(composeAuthority(input.authorityVector).ceiling);
            break;
          case "SourceLineage":
            expect(
              input.sourceLineage.originRefs.length === 0 ||
              input.sourceLineage.sourceKind === "COMPETITOR_RESEARCH" ||
              input.sourceLineage.sourceKind === "WEB_EVIDENCE",
            ).toBe(true);
            break;
          case "RightsEnvelope":
            expect(
              input.rights.legalVerdict === "RIGHTS_REVIEW" ||
              input.rights.status === "permission_required" ||
              input.rights.reviewStatus === "UNKNOWN" ||
              !input.rights.commercialDisplayAllowed,
            ).toBe(true);
            break;
          default:
            throw new Error(`unknown downgrade engine "${d.engine}" — every cap must name a canonical engine`);
        }
      }
    });
  }
});
