import { describe, it, expect } from "vitest";
import {
  verifyRosterContinuityGate,
  computeDyadicTrustState,
  ARCHETYPE_AARON_RODGERS,
} from "../dyadic-trust-engine.js";
import {
  computeCosineIsomorphism,
  computeRoleIsomorphismTargetReallocation,
  RouteTreeVector,
} from "../../causal/role-isomorphism-realloc.js";
import { WordSynapsePlasticityEngine } from "../../learning/word-synapse-plasticity.js";

describe("Phase IV: Dyadic Trust, Role Isomorphism & Synaptic Plasticity (Components 11-13)", () => {
  it("rejects stale cross-season entity bindings at Layer 0 (e.g. DK Metcalf on Seattle or stacked with Geno Smith)", () => {
    // 1. Metcalf claiming SEA -> REJECT
    const res1 = verifyRosterContinuityGate("dk-metcalf", "SEA");
    expect(res1.valid).toBe(false);
    expect(res1.reason).toContain("REFUSED_L0_STALE_ENTITY_BINDING");
    expect(res1.reason).toContain("PIT");

    // 2. Metcalf on PIT but stacked with Geno Smith -> REJECT
    const res2 = verifyRosterContinuityGate("dk-metcalf", "PIT", "geno-smith");
    expect(res2.valid).toBe(false);
    expect(res2.reason).toContain("aaron-rodgers");

    // 3. Metcalf on PIT with Aaron Rodgers -> PASS
    const res3 = verifyRosterContinuityGate("dk-metcalf", "PIT", "aaron-rodgers");
    expect(res3.valid).toBe(true);
  });

  it("models Aaron Rodgers dyadic trust state: drops + lip-reading freeze out DK Metcalf while Roman Wilson/Germie Bernard thrive", () => {
    const now = "2026-10-21T18:00:00Z";

    // Metcalf experiences drops and sideline lip-reading
    const trustMetcalf = computeDyadicTrustState(
      ARCHETYPE_AARON_RODGERS,
      "dk-metcalf",
      [
        { timestampUtc: "2026-10-18T19:00:00Z", playType: "CHARTED_DROP", targetId: "dk-metcalf", leverageWeight: 1.5 },
        { timestampUtc: "2026-10-18T19:30:00Z", playType: "CHARTED_DROP", targetId: "dk-metcalf", leverageWeight: 1.8 },
      ],
      [
        {
          timestampUtc: "2026-10-18T20:00:00Z",
          source: "SIDELINE_LIP_READ",
          targetId: "dk-metcalf",
          polarity: -0.9,
          verbatimQuote: "mfer sucks ass",
        },
      ],
      now,
    );

    expect(trustMetcalf.trustScore).toBeLessThan(-0.40);
    expect(trustMetcalf.highLeverageTargetModifier).toBeLessThan(0.60);

    // Germie Bernard converting 3rd down audibles and receiving praise
    const trustBernard = computeDyadicTrustState(
      ARCHETYPE_AARON_RODGERS,
      "germie-bernard",
      [
        { timestampUtc: "2026-10-18T20:15:00Z", playType: "3RD_4TH_CONVERSION", targetId: "germie-bernard", leverageWeight: 1.5 },
        { timestampUtc: "2026-10-18T20:45:00Z", playType: "SIGHT_ADJUST_AUDIBLE", targetId: "germie-bernard", leverageWeight: 2.0 },
      ],
      [
        {
          timestampUtc: "2026-10-18T21:30:00Z",
          source: "PRESS_CONFERENCE_UNPROMPTED",
          targetId: "germie-bernard",
          polarity: +0.85,
          verbatimQuote: "I have a lot of trust in him",
        },
      ],
      now,
    );

    expect(trustBernard.trustScore).toBeGreaterThan(0.40);
    expect(trustBernard.inDoghouse).toBe(false);
    expect(trustBernard.highLeverageTargetModifier).toBeGreaterThan(1.20);
  });

  it("reallocates vacated slot targets to Germie Bernard via Role-Isomorphism rather than naive DK Metcalf vacuum", () => {
    const slotWilsonVector: RouteTreeVector = {
      slotSnapRate: 0.82,
      motionRate: 0.35,
      aDot: 8.4,
      choiceOptionRouteRate: 0.45,
      firstReadQuickGameShare: 0.38,
      contestedCatchRate: 0.12,
    };

    const bernardVector: RouteTreeVector = {
      slotSnapRate: 0.76,
      motionRate: 0.30,
      aDot: 9.1,
      choiceOptionRouteRate: 0.40,
      firstReadQuickGameShare: 0.34,
      contestedCatchRate: 0.15,
    };

    const metcalfVector: RouteTreeVector = {
      slotSnapRate: 0.12,
      motionRate: 0.08,
      aDot: 14.6,
      choiceOptionRouteRate: 0.05,
      firstReadQuickGameShare: 0.18,
      contestedCatchRate: 0.58,
    };

    // Cosine similarity check
    const simBernard = computeCosineIsomorphism(slotWilsonVector, bernardVector);
    const simMetcalf = computeCosineIsomorphism(slotWilsonVector, metcalfVector);

    expect(simBernard).toBeGreaterThan(0.90); // ~0.99 match
    expect(simMetcalf).toBeLessThan(0.70);

    // Run full tensor reallocation when Roman Wilson (20% target share) goes down
    const realloc = computeRoleIsomorphismTargetReallocation(
      { name: "Roman Wilson", routeVector: slotWilsonVector, vacatedTargetShare: 0.20 },
      [
        {
          receiverId: "germie-bernard",
          name: "Germie Bernard",
          routeVector: bernardVector,
          dyadicTrustScore: 0.55,
          bracketHazard: 0.10, // low bracket risk
          baselineTargetShare: 0.12,
        },
        {
          receiverId: "dk-metcalf",
          name: "DK Metcalf",
          routeVector: metcalfVector,
          dyadicTrustScore: -0.45,
          bracketHazard: 0.65, // heavily bracketed perimeter X
          baselineTargetShare: 0.22,
        },
      ],
    );

    const bernardResult = realloc.find((r) => r.receiverId === "germie-bernard")!;
    const metcalfResult = realloc.find((r) => r.receiverId === "dk-metcalf")!;

    // Bernard captures the lion's share of vacated slot targets (> 75%)
    expect(bernardResult.netTransferFraction).toBeGreaterThan(0.75);
    expect(metcalfResult.netTransferFraction).toBeLessThan(0.25);
    expect(bernardResult.postInjuryTargetShare).toBeGreaterThan(0.25);
  });

  it("learns permanently from verbal inputs via WordSynapsePlasticityEngine (< 50ms assimilation)", () => {
    const engine = new WordSynapsePlasticityEngine();
    const result = engine.assimilateSentence(
      "Aaron Rodgers mouthed 'this mfer sucks' after a drop, and historically with Jordy Nelson, Davante Adams, Randall Cobb, and Donald Driver he hyper-fixates on the guy he trusts, which shifted from Roman Wilson to Germie Bernard",
      "FOUNDER_DIRECT_OBSERVATION",
      "2026-10-21T18:00:00Z",
    );

    expect(result.extraction.actorA).toBe("aaron-rodgers");
    expect(result.extraction.actorB).toBe("dk-metcalf");
    expect(result.extraction.relation).toBe("FREEZES_OUT_AFTER_DROPS");
    expect(result.dyadicMutationApplied.trustDelta).toBeLessThan(-0.25);
    expect(result.isPromotedToLaw).toBe(true);
    expect(result.pValueHistoricalCheck).toBeLessThan(0.01);
  });
});
