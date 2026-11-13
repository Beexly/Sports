import { describe, expect, it } from "vitest";
import {
  buildContextMask,
  buildUniversalAndSecondOrderCognitiveSignals,
  describeMissingRouterInputs,
  maskToArray,
  MASK_WORDS,
  MAX_ABS_DELTA_LOG_ODDS,
  MIN_SAMPLE,
  routePreProjectionWithUniversalAndOmnisciencePriors,
  routeFullFourStage,
  SIGNAL_FAMILIES,
  stageA,
  stageC,
  stageD,
  toVectorLiteral,
  trustWeightForTier,
  TRUST_WEIGHTS,
  LIVE_LITERATURE_VIEW,
  type Queryable,
} from "./mcp-cognitive-router.js";

describe("context mask", () => {
  it("sets the bit for a fired family", () => {
    const m = buildContextMask([{ family: 1, displacement: 0.4, n: 100 }]);
    expect(m[0]).toBe(2);
  });

  it("does not set a bit on zero displacement", () => {
    expect(buildContextMask([{ family: 1, displacement: 0, n: 100 }])[0]).toBe(0);
  });

  it("does not set a bit on a thin sample", () => {
    expect(buildContextMask([{ family: 1, displacement: 0.4, n: MIN_SAMPLE - 1 }])[0]).toBe(0);
  });

  it("spans words — family 32 lands in word 1, not word 0", () => {
    const m = buildContextMask([{ family: 32, displacement: 1, n: 50 }]);
    expect(m[0]).toBe(0);
    expect(m[1]).toBe(1);
  });

  it("rejects an out-of-range family", () => {
    expect(() => buildContextMask([{ family: SIGNAL_FAMILIES, displacement: 1, n: 50 }])).toThrow();
    expect(() => buildContextMask([{ family: -1, displacement: 1, n: 50 }])).toThrow();
  });

  it("emits exactly nine words", () => {
    expect(maskToArray(buildContextMask([]))).toHaveLength(MASK_WORDS);
  });

  it("keeps the top bit addressable", () => {
    // family 31 is the top bit of word 0. Postgres int is signed 32-bit, so it stores as
    // -2147483648 — that is the correct two's-complement pattern and bitwise AND still
    // works. What must not happen is the bit vanishing.
    const arr = maskToArray(buildContextMask([{ family: 31, displacement: 1, n: 50 }]));
    expect(arr[0]).toBe(-2147483648);
    expect((arr[0]! & -2147483648) !== 0).toBe(true);
  });
});

describe("vector literal", () => {
  it("formats for pgvector", () => {
    expect(toVectorLiteral([0.1, -0.2])).toBe("[0.1,-0.2]");
  });
});

describe("Stage C spectral orthogonalization & Stage D James-Stein Jacobian coupling", () => {
  it("attenuates redundant same-cluster premises in stageC", () => {
    const premises = [
      { id: "p1", premise: "A1", cluster: "trench", similarity: 0.92, rawLogOddsDelta: 0.15 },
      { id: "p2", premise: "A2", cluster: "trench", similarity: 0.90, rawLogOddsDelta: 0.14 },
      { id: "p3", premise: "B1", cluster: "motion", similarity: 0.85, rawLogOddsDelta: 0.12 },
      { id: "p4", premise: "C1", cluster: "coverage", similarity: 0.80, rawLogOddsDelta: 0.10 },
    ];
    const out = stageC(premises, { limit: 3, clusterRedundancyGamma: 1.0 });
    expect(out).toHaveLength(3);
    // p1 (trench rank 0 -> 0.92) and p3 (motion rank 0 -> 0.85) and p4 (coverage rank 0 -> 0.80)
    // beat p2 (trench rank 1 -> 0.90 / sqrt(2) = 0.636)
    expect(out.map((r) => r.id)).toEqual(["p1", "p3", "p4"]);
  });

  it("applies positive-part James-Stein shrinkage and clamps |Δ log-odds| <= 0.35 in stageD", () => {
    const spectral = stageC([
      { id: "p1", premise: "A1", cluster: "c1", similarity: 0.95, rawLogOddsDelta: 0.22, verificationTier: "MSVH_S1_EXACT" },
      { id: "p2", premise: "B1", cluster: "c2", similarity: 0.92, rawLogOddsDelta: 0.20, verificationTier: "MSVH_S1_EXACT" },
      { id: "p3", premise: "C1", cluster: "c3", similarity: 0.90, rawLogOddsDelta: 0.18, verificationTier: "MSVH_S1_EXACT" },
    ]);
    const res = stageD(spectral, { noiseVarianceSigma2: 0.0025, tauHatCoach: 0.55 });
    expect(res.jamesSteinShrinkageFactor).toBeGreaterThan(0);
    expect(res.jamesSteinShrinkageFactor).toBeLessThan(1);
    expect(res.clamped).toBe(true);
    expect(res.clampedTotalLogOddsDelta).toBe(MAX_ABS_DELTA_LOG_ODDS);
    expect(res.tauHatCoachPriorBonus).toBeCloseTo((0.55 - 0.42) * 0.12, 5);
  });

  it("clamps a quarantined equation to zero log-odds until a backtest passes", () => {
    const spectral = stageC([
      {
        id: "ramanujan",
        premise: "continued fraction",
        cluster: "physics",
        similarity: 0.99,
        rawLogOddsDelta: 0.3,
        verificationStatus: "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST",
      },
      { id: "p2", premise: "B1", cluster: "c2", similarity: 0.9, rawLogOddsDelta: 0.05, verificationTier: "CITABLE_VERIFIED" },
      { id: "p3", premise: "C1", cluster: "c3", similarity: 0.8, rawLogOddsDelta: 0.04, verificationTier: "CITABLE_VERIFIED" },
    ]);
    const quarantined = spectral.find((p) => p.id === "ramanujan");
    expect(quarantined?.quarantined).toBe(true);
    expect(quarantined?.spectralScore).toBe(0);
    const res = stageD(spectral, { noiseVarianceSigma2: 0.0025, tauHatCoach: 0.42 });
    expect(res.selectedPremises.find((p) => p.id === "ramanujan")?.shrunkLogOddsDelta).toBe(0);
  });

  it("wires Universal 360 + 2nd/3rd-Order Non-Stationary + 8-Step 5-API Cascade priors into Stage 2 Pre-Projection routing", () => {
    // Only the families whose inputs are supplied are emitted. The previous
    // version substituted hand-set defaults (0.58, -0.26, 0.14, -0.35, 0.12,
    // 0.11, 0.18, 0.15, 0.72) and emitted all seven regardless, so an
    // unmeasured family moved the router exactly as if it had been measured.
    const signals = buildUniversalAndSecondOrderCognitiveSignals({
      trenchWeakLinkCollapseProb: 0.64,
      qbTraumaCompressionSec: -0.32,
      gsiBiomechanicalEfficiencyLossPct: 0.14,
      sampleSizeByField: {
        trenchWeakLinkCollapseProb: 120,
        qbTraumaCompressionSec: 85,
        gsiBiomechanicalEfficiencyLossPct: 95,
      },
    });
    expect(signals.length).toBe(3);
    // The sample sizes are the measured ones supplied by the caller — the old
    // hardcoded n = 65..140 constants are gone.
    expect(signals.map((s) => s.n).sort((a, b) => a - b)).toEqual([85, 95, 120]);
    expect(signals.map((s) => s.family).sort((a, b) => a - b)).toEqual([12, 48, 176]);

    // With no inputs at all, nothing is emitted and every family is reported.
    expect(buildUniversalAndSecondOrderCognitiveSignals({})).toEqual([]);
    const missing = describeMissingRouterInputs({});
    expect(missing.length).toBe(9);
    expect(missing.map((m) => m.field)).toContain("trenchWeakLinkCollapseProb");

    const out = routePreProjectionWithUniversalAndOmnisciencePriors([], {
      trenchWeakLinkCollapseProb: 0.64,
      qbTraumaCompressionSec: -0.32,
      gsiBiomechanicalEfficiencyLossPct: 0.14,
      openAlexOrthopedicSnapCap: 0.72,
      sampleSizeByField: {
        trenchWeakLinkCollapseProb: 120,
        qbTraumaCompressionSec: 85,
        gsiBiomechanicalEfficiencyLossPct: 95,
      },
    });
    expect(out.reverse8Step5ApiCascadeActive).toBe(true);
    expect(out.injectedSignalsCount).toBe(3);
    expect(Math.abs(out.routerResult.clampedTotalLogOddsDelta)).toBeLessThanOrEqual(
      MAX_ABS_DELTA_LOG_ODDS,
    );
    expect(out.pressureDisruptionHazardDelta).toBeGreaterThan(0);
    expect(out.secondHalfTutFatigueDecayRate).toBeGreaterThan(0.05);
    expect(out.gsiSnapShareCap).toBeCloseTo(0.72, 5);
    // causalUnschemedEpaDelta was not supplied, so this delta is null, not a
    // number computed from a substituted 0.14.
    expect(out.passEfficiencyPriorDelta).toBeNull();
    expect(out.missingInputs.map((m) => m.field)).toContain("causalUnschemedEpaDelta");
  });
});

describe("WP-2 purge: missing input => 0 displacement, never a made-up number", () => {
  it("does not fire a family whose displacement has no measured sample size", () => {
    // The old code invented n = 120 here and fired family 12 anyway.
    expect(
      buildUniversalAndSecondOrderCognitiveSignals({ trenchWeakLinkCollapseProb: 0.64 }),
    ).toEqual([]);
  });

  it("does not fire a family whose sample size is below MIN_SAMPLE", () => {
    expect(
      buildUniversalAndSecondOrderCognitiveSignals({
        trenchWeakLinkCollapseProb: 0.64,
        sampleSizeByField: { trenchWeakLinkCollapseProb: MIN_SAMPLE - 1 },
      }),
    ).toEqual([]);
  });

  it("fires exactly at MIN_SAMPLE with the caller's measured N", () => {
    const signals = buildUniversalAndSecondOrderCognitiveSignals({
      qbTraumaCompressionSec: -0.26,
      sampleSizeByField: { qbTraumaCompressionSec: MIN_SAMPLE },
    });
    expect(signals).toEqual([{ family: 48, displacement: -0.26, n: MIN_SAMPLE }]);
  });

  it("reports missing sample sizes in the reasoning trace", () => {
    const missing = describeMissingRouterInputs({ trenchWeakLinkCollapseProb: 0.64 });
    const entry = missing.find((m) => m.field === "trenchWeakLinkCollapseProb");
    expect(entry?.reason).toContain("sample size not supplied");
    const thin = describeMissingRouterInputs({
      qbTraumaCompressionSec: -0.3,
      sampleSizeByField: { qbTraumaCompressionSec: 12 },
    });
    expect(thin.find((m) => m.field === "qbTraumaCompressionSec")?.reason).toContain("below MIN_SAMPLE");
  });

  it("yields exactly 0 total displacement and 0 coach prior with no inputs", () => {
    const out = routePreProjectionWithUniversalAndOmnisciencePriors([], {});
    expect(out.injectedSignalsCount).toBe(0);
    expect(out.routerResult.clampedTotalLogOddsDelta).toBe(0);
    expect(out.routerResult.tauHatCoachPriorBonus).toBe(0);
    expect(out.snapTransitionPriorDelta).toBe(0);
    expect(out.passEfficiencyPriorDelta).toBeNull();
    expect(out.pressureDisruptionHazardDelta).toBeNull();
  });

  it("stageA returns nothing on an empty mask and never queries (no backfill)", async () => {
    const db: Queryable = {
      query: async () => {
        throw new Error("stageA must not query the database when no family fired");
      },
    };
    expect(await stageA(db, buildContextMask([]))).toEqual([]);
  });

  it("stageD contributes 0 when the effect size is missing", () => {
    const spectral = stageC([
      { id: "p1", premise: "A", cluster: "c1", similarity: 0.9, verificationTier: "MSVH_S1_EXACT" },
    ]);
    const res = stageD(spectral);
    expect(res.selectedPremises[0]!.shrunkLogOddsDelta).toBe(0);
    expect(res.clampedTotalLogOddsDelta).toBe(0);
  });
});

describe("WP-2 trust weights and live-view persistence", () => {
  it("maps tiers to the contract weights and unknown/absent tiers to 0", () => {
    expect(TRUST_WEIGHTS.CITABLE_VERIFIED).toBe(1.0);
    expect(TRUST_WEIGHTS.MSVH_S1_EXACT).toBe(1.0);
    expect(TRUST_WEIGHTS.COMPUTED).toBe(0.5);
    expect(TRUST_WEIGHTS.RESEARCH_HYPOTHESIS).toBe(0.0);
    expect(trustWeightForTier(undefined)).toBe(0);
    expect(trustWeightForTier(null)).toBe(0);
    expect(trustWeightForTier("SOMETHING_ELSE")).toBe(0);
  });

  it("weights stageD contributions by trust tier", () => {
    const mk = (tier: string | undefined) =>
      stageD(
        stageC([
          { id: "p1", premise: "A", cluster: "c1", similarity: 0.9, rawLogOddsDelta: 0.2, verificationTier: tier },
        ]),
      ).selectedPremises[0]!.shrunkLogOddsDelta;
    const full = mk("MSVH_S1_EXACT");
    expect(full).toBeCloseTo(0.2 * 0.9, 6);
    expect(mk("CITABLE_VERIFIED")).toBeCloseTo(full, 6);
    expect(mk("COMPUTED")).toBeCloseTo(full * 0.5, 6);
    expect(mk("RESEARCH_HYPOTHESIS")).toBe(0);
    expect(mk(undefined)).toBe(0);
  });

  it("routeFullFourStage reads the live lit view and persists retrieval + activations", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const premiseId = "e2647e1f-76bb-46a8-9289-13975b920b2d";
    const maskArr = maskToArray(buildContextMask([{ family: 12, displacement: 0.2, n: 100 }]));
    const db: Queryable = {
      query: async <R extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        if (sql.includes("SELECT id FROM")) {
          expect(sql).toContain(LIVE_LITERATURE_VIEW);
          return { rows: [{ id: premiseId }] as R[] };
        }
        if (sql.includes("SELECT id, premise, cluster")) {
          expect(sql).toContain(LIVE_LITERATURE_VIEW);
          return {
            rows: [
              {
                id: premiseId,
                premise: "trench collapse",
                cluster: "trench",
                similarity: 0.9,
                verification_tier: "MSVH_S1_EXACT",
                context_mask: maskArr,
              },
            ] as R[],
          };
        }
        if (sql.includes("INSERT INTO lit.retrieval_event")) {
          return { rows: [{ id: "evt-1" }] as R[] };
        }
        return { rows: [] as R[] };
      },
    };
    const res = await routeFullFourStage(
      db,
      [{ family: 12, displacement: 0.2, n: 100 }],
      [0.1, 0.2],
      { gameId: "game-1", queryText: "trench weak link" },
    );
    expect(res.retrievalEventId).toBe("evt-1");
    expect(Math.abs(res.clampedTotalLogOddsDelta)).toBeLessThanOrEqual(MAX_ABS_DELTA_LOG_ODDS);
    // The premise's delta is the measured driving displacement (0.2), trust 1.0.
    expect(res.selectedPremises[0]!.shrunkLogOddsDelta).toBeCloseTo(0.2 * 0.9, 6);

    const retrieval = calls.find((c) => c.sql.includes("INSERT INTO lit.retrieval_event"));
    expect(retrieval).toBeDefined();
    expect(retrieval!.params![2]).toBe("f12"); // signal_key
    expect(retrieval!.params![8]).toBe(1); // hit_count
    const activations = calls.filter((c) => c.sql.includes("INSERT INTO lit.activation"));
    expect(activations).toHaveLength(1);
    expect(activations[0]!.params![1]).toBe(premiseId);
    expect(activations[0]!.params![3]).toBe(1); // rank
  });

  it("routeFullFourStage with no firing signals persists a zero-hit retrieval and moves nothing", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const db: Queryable = {
      query: async <R extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        if (sql.includes("INSERT INTO lit.retrieval_event")) return { rows: [{ id: "evt-0" }] as R[] };
        if (sql.includes("SELECT")) throw new Error("no retrieval may run without a firing family");
        return { rows: [] as R[] };
      },
    };
    const res = await routeFullFourStage(db, [], [0.1, 0.2]);
    expect(res.clampedTotalLogOddsDelta).toBe(0);
    expect(res.selectedPremises).toHaveLength(0);
    const retrieval = calls.find((c) => c.sql.includes("INSERT INTO lit.retrieval_event"));
    expect(retrieval!.params![2]).toBe("none");
    expect(retrieval!.params![8]).toBe(0);
    expect(calls.some((c) => c.sql.includes("INSERT INTO lit.activation"))).toBe(false);
  });

  it("live view admits unmasked premises only when a family fires, driven by the aggregate measured context", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const premiseId = "7d37487e-96c7-4f9d-bce8-489f1e099596";
    const db: Queryable = {
      query: async <R extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        if (sql.includes("SELECT id FROM")) {
          // Firing mask + live view => unmasked premises are eligible.
          expect(sql).toContain("context_mask IS NULL");
          return { rows: [{ id: premiseId }] as R[] };
        }
        if (sql.includes("SELECT id, premise, cluster")) {
          return {
            rows: [
              {
                id: premiseId,
                premise: "unmasked literature premise",
                cluster: "coverage",
                similarity: 0.8,
                verification_tier: "MSVH_S1_EXACT",
                context_mask: null,
              },
            ] as R[],
          };
        }
        if (sql.includes("INSERT INTO lit.retrieval_event")) return { rows: [{ id: "evt-2" }] as R[] };
        return { rows: [] as R[] };
      },
    };
    const res = await routeFullFourStage(
      db,
      [
        { family: 12, displacement: 0.1, n: 100 },
        { family: 48, displacement: -0.05, n: 100 },
      ],
      [0.1, 0.2],
    );
    // Aggregate measured context = 0.1 + (-0.05) = 0.05; trust 1.0; sim 0.8.
    expect(res.selectedPremises[0]!.shrunkLogOddsDelta).toBeCloseTo(0.05 * 0.8, 6);
    expect(calls.some((c) => c.sql.includes("INSERT INTO lit.activation"))).toBe(true);
  });

  it("stageA on the public view never admits unmasked rows", async () => {
    const calls: string[] = [];
    const db: Queryable = {
      query: async <R extends Record<string, unknown>>(sql: string) => {
        calls.push(sql);
        return { rows: [] as R[] };
      },
    };
    await stageA(db, buildContextMask([{ family: 12, displacement: 0.2, n: 100 }]));
    expect(calls[0]).not.toContain("context_mask IS NULL");
  });
});
