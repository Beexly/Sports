/**
 * THE AUTHORITY VECTOR — tests for the canonical 8-layer composition (PROJECT PARALLAX).
 *
 * The load-bearing proof is the CONTRACTION LEMMA: `composeAuthority(authorityVectorFromContext(ctx))`
 * equals the production `authorityCeiling(ctx)` for EVERY legacy context. This is what guarantees the
 * new 8-layer object never over-permits relative to today's gate — so adopting it is safe and the
 * production gate need not change (unfolding it is owner-gated).
 */

import { describe, it, expect } from "vitest";
import {
  composeAuthority,
  layerCeilings,
  authorityVectorFromContext,
  vectorIsPublicSafe,
  AUTHORITY_LAYER_ORDER,
  type AuthorityVectorInput,
} from "../authority-vector.js";
import { authorityCeiling, type AuthorityContext, type DataMode, type ModelAuthority, type PublicationAuthority } from "../decision-authority-gate.js";
import { rankOf } from "../decision-state-stat-contract.js";

const DATA_MODES: readonly DataMode[] = ["FIXTURE", "SHADOW_REAL", "LIVE_REAL"];
const MODELS: readonly ModelAuthority[] = ["UNPRICED", "PROCESS_ONLY", "PERSONALIZED_ALLOWED", "PUBLIC_ALLOWED"];
const PUBS: readonly PublicationAuthority[] = ["INTERNAL", "PERSONALIZED", "PUBLIC"];

function allContexts(): AuthorityContext[] {
  const out: AuthorityContext[] = [];
  for (const dataMode of DATA_MODES)
    for (const modelAuthority of MODELS)
      for (const readinessAuthorized of [true, false])
        for (const publicationAuthority of PUBS)
          out.push({ dataMode, modelAuthority, readinessAuthorized, publicationAuthority });
  return out;
}

describe("Contraction lemma — the 8-layer composition equals the production 4-term gate", () => {
  it("composeAuthority(fromContext(ctx)).ceiling === authorityCeiling(ctx) for ALL 72 contexts", () => {
    for (const ctx of allContexts()) {
      const composed = composeAuthority(authorityVectorFromContext(ctx)).ceiling;
      expect(composed).toBe(authorityCeiling(ctx));
    }
  });
});

describe("The meet + binding layer (the Authority Autopsy)", () => {
  it("the ceiling is the meet (≤ every layer) and binding layers equal the meet", () => {
    const v: AuthorityVectorInput = {
      rights: "PUBLIC",
      temporal: "FRESH_POST_LOCK",
      sourceReality: "FIXTURE", // ← binding: INFO_ONLY
      evidence: "SUFFICIENT",
      localExpression: "PUBLIC_ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    };
    const c = composeAuthority(v);
    expect(c.ceiling).toBe("INFO_ONLY");
    expect(c.bindingLayers).toEqual(["SOURCE_REALITY"]);
    const ceilings = layerCeilings(v);
    for (const layer of AUTHORITY_LAYER_ORDER) expect(rankOf(c.ceiling)).toBeLessThanOrEqual(rankOf(ceilings[layer]));
  });

  it("identifies multiple binding layers when several tie at the minimum", () => {
    const v: AuthorityVectorInput = {
      rights: "INTERNAL", // WATCH
      temporal: "PRE_LOCK", // WATCH
      sourceReality: "SHADOW_REAL", // WATCH
      evidence: "SUFFICIENT",
      localExpression: "ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    };
    const c = composeAuthority(v);
    expect(c.ceiling).toBe("WATCH");
    expect([...c.bindingLayers].sort()).toEqual(["RIGHTS", "SOURCE_REALITY", "TEMPORAL"]);
  });

  it("trace is the full ordered eight-layer record", () => {
    const c = composeAuthority(authorityVectorFromContext({ dataMode: "LIVE_REAL", modelAuthority: "PUBLIC_ALLOWED", readinessAuthorized: true, publicationAuthority: "PUBLIC" }));
    expect(c.trace.map((t) => t.layer)).toEqual([...AUTHORITY_LAYER_ORDER]);
    expect(c.ceiling).toBe("PUBLIC_ACTION");
  });
});

describe("GAP-1 made first-class — Rights and Evidence now bind directly", () => {
  it("blocked rights alone forces INFO_ONLY even with everything else maxed and LIVE", () => {
    const c = composeAuthority({
      rights: "BLOCKED",
      temporal: "FRESH_POST_LOCK",
      sourceReality: "LIVE_REAL",
      evidence: "SUFFICIENT",
      localExpression: "PUBLIC_ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    });
    expect(c.ceiling).toBe("INFO_ONLY");
    expect(c.bindingLayers).toContain("RIGHTS");
  });

  it("insufficient evidence alone forces INFO_ONLY (evidence is a meet term, not folded away)", () => {
    const c = composeAuthority({
      rights: "PUBLIC",
      temporal: "FRESH_POST_LOCK",
      sourceReality: "LIVE_REAL",
      evidence: "INSUFFICIENT",
      localExpression: "PUBLIC_ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    });
    expect(c.ceiling).toBe("INFO_ONLY");
    expect(c.bindingLayers).toContain("EVIDENCE");
  });
});

describe("Fail-closed + public-safety (A1/A4)", () => {
  it("FIXTURE source reality can never be public-safe, regardless of every other layer", () => {
    const v: AuthorityVectorInput = {
      rights: "PUBLIC",
      temporal: "FRESH_POST_LOCK",
      sourceReality: "FIXTURE",
      evidence: "SUFFICIENT",
      localExpression: "PUBLIC_ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    };
    expect(vectorIsPublicSafe(v)).toBe(false);
  });

  it("only the full LIVE + public conjunction is public-safe", () => {
    const v: AuthorityVectorInput = {
      rights: "PUBLIC",
      temporal: "FRESH_POST_LOCK",
      sourceReality: "LIVE_REAL",
      evidence: "SUFFICIENT",
      localExpression: "PUBLIC_ACTION",
      modelMaturity: "PUBLIC_ALLOWED",
      entitlement: "PUBLIC",
      ownerAction: "ARMED",
    };
    expect(vectorIsPublicSafe(v)).toBe(true);
    expect(vectorIsPublicSafe({ ...v, ownerAction: "HELD" })).toBe(true); // owner-action gates STRENGTH (caps at WATCH), publicSafe checks the public chain — still > INFO_ONLY here
    expect(vectorIsPublicSafe({ ...v, sourceReality: "SHADOW_REAL" })).toBe(false);
    expect(vectorIsPublicSafe({ ...v, rights: "INTERNAL" })).toBe(false);
  });
});
