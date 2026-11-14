import { describe, expect, it } from "vitest";
import {
  buildContextMask,
  MASK_WORDS,
  MAX_ABS_DELTA_LOG_ODDS,
} from "../mcp-cognitive-router.js";
import {
  buildFoundryCorpusRouterSignals,
  evaluateFoundrySovereignCorpusPrior,
  evaluateSovereignStageCDCoupling,
  FOUNDRY_SITUATIONAL_FAMILIES,
  loadCalibratedCorpusWeightsReceipt,
  loadFoundrySovereignCorpusManifest,
  loadMotifSweepSummary,
  loadShardBCatalogSummary,
  shrinkPositivePartJamesStein,
} from "../foundry-sovereign-corpus-bridge.js";

describe("foundry-sovereign-corpus-bridge", () => {
  it("loads Sovereign + Shard B manifest and builds valid 9-word 288-bit cognitive router signals", () => {
    const manifest = loadFoundrySovereignCorpusManifest();
    expect(manifest.counts.sovereign_books_loaded).toBeGreaterThanOrEqual(84);
    expect(manifest.counts.sovereign_primitives_routed).toBeGreaterThanOrEqual(726);
    expect(manifest.counts.gcp_shard_b_docs_routed).toBeGreaterThanOrEqual(2859);

    for (const fam of FOUNDRY_SITUATIONAL_FAMILIES) {
      const info = manifest.six_situational_families[fam];
      expect(info.all_finite_non_nan).toBe(true);
      expect(Math.abs(info.bounded_james_stein_log_odds_weight)).toBeLessThanOrEqual(
        MAX_ABS_DELTA_LOG_ODDS,
      );
    }

    const signals = buildFoundryCorpusRouterSignals(
      {
        pressure: 0.12,
        weather: -0.08,
        qbSkillScript: 0.1,
      },
      manifest,
    );
    expect(signals).toHaveLength(3);
    const mask = buildContextMask(signals);
    expect(mask).toHaveLength(MASK_WORDS);
  });

  it("enforces strict |Delta log-odds| <= 0.35 saturation, James-Stein shrinkage, and veto damping", () => {
    expect(shrinkPositivePartJamesStein(Number.NaN, 50)).toBe(0);
    expect(shrinkPositivePartJamesStein(0.25, 0)).toBe(0);
    expect(Math.abs(shrinkPositivePartJamesStein(5.0, 5000))).toBeLessThanOrEqual(
      MAX_ABS_DELTA_LOG_ODDS,
    );

    const lowVeto = evaluateFoundrySovereignCorpusPrior({
      familyDisplacements: {
        pressure: 0.8,
        weather: 0.7,
        restFatigue: 0.6,
        coveragePersonnel: 0.5,
        qbSkillScript: 0.9,
        marketMicrostructure: 0.4,
      },
      collinearCrossLayerVetoesTriggered: 0,
    });
    expect(lowVeto.allFiniteNonNan).toBe(true);
    expect(Math.abs(lowVeto.totalDeltaLogOdds)).toBeLessThanOrEqual(MAX_ABS_DELTA_LOG_ODDS);
    expect(lowVeto.activeBitCount).toBe(6);

    const highVeto = evaluateFoundrySovereignCorpusPrior({
      familyDisplacements: {
        pressure: 0.15,
        qbSkillScript: 0.12,
      },
      collinearCrossLayerVetoesTriggered: 3,
    });
    const noVetoSmall = evaluateFoundrySovereignCorpusPrior({
      familyDisplacements: {
        pressure: 0.15,
        qbSkillScript: 0.12,
      },
      collinearCrossLayerVetoesTriggered: 0,
    });
    expect(Math.abs(highVeto.totalDeltaLogOdds)).toBeLessThan(
      Math.abs(noVetoSmall.totalDeltaLogOdds),
    );
    expect(highVeto.vetoDampingFactor).toBeLessThan(1);
  });

  it("reads Shard B compiled catalog summary cleanly without failing", () => {
    const catalog = loadShardBCatalogSummary();
    expect(catalog).not.toBeNull();
    expect(catalog?.total_markdown_files).toBeGreaterThanOrEqual(7846);
    expect(catalog?.total_extracted_equations).toBeGreaterThanOrEqual(26700);
  });

  it("composes Sovereign priors and derived kernels through Stage C spectral orthogonalization and Stage D Jacobian/James-Stein coupling", () => {
    const coupled = evaluateSovereignStageCDCoupling({
      familyDisplacements: {
        pressure: 0.14,
        weather: -0.09,
        coveragePersonnel: 0.18,
        qbSkillScript: 0.11,
      },
      additionalPremises: [
        {
          id: "derived.split_field.poach_solo_3x1",
          premise: "[DERIVED KERNEL] Poach/Solo 3x1 split-field quarters check",
          cluster: "foundry.coveragePersonnel",
          similarity: 0.72,
          verificationTier: "COMPUTED",
          verificationStatus: "GATED_EXPERIMENT_CANDIDATE",
          backtestPassed: true,
          jacobianSensitivity: 0.9,
          rawLogOddsDelta: 0.045,
        },
        {
          id: "quarantined.unverified.hypothesis",
          premise: "Unverified narrative hypothesis",
          cluster: "narrative.untested",
          similarity: 0.95,
          verificationTier: "CITABLE_VERIFIED",
          verificationStatus: "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST",
          backtestPassed: false,
          jacobianSensitivity: 1.5,
          rawLogOddsDelta: 0.34,
        },
        {
          id: "untrusted.null.tier",
          premise: "Premise missing verificationTier",
          cluster: "untrusted.cluster",
          similarity: 0.88,
          verificationTier: null,
          rawLogOddsDelta: 0.3,
        },
      ],
      collinearCrossLayerVetoesTriggered: 1,
      tauHatCoach: 0.58,
      sampleHorizonT: 24,
    });

    expect(coupled.allFiniteNonNan).toBe(true);
    expect(coupled.activeBitCount).toBe(4);
    expect(coupled.marchenkoPasturShrinkage).toBeGreaterThan(0);
    expect(coupled.marchenkoPasturShrinkage).toBeLessThanOrEqual(1);
    expect(Math.abs(coupled.stageDResult.clampedTotalLogOddsDelta)).toBeLessThanOrEqual(
      MAX_ABS_DELTA_LOG_ODDS,
    );

    const quarantinedRow = coupled.stageDResult.selectedPremises.find(
      (p) => p.id === "quarantined.unverified.hypothesis",
    );
    expect(quarantinedRow?.quarantined).toBe(true);
    expect(quarantinedRow?.shrunkLogOddsDelta).toBe(0);

    const untrustedRow = coupled.stageDResult.selectedPremises.find(
      (p) => p.id === "untrusted.null.tier",
    );
    expect(untrustedRow?.shrunkLogOddsDelta).toBe(0);

    const splitFieldRow = coupled.stageDResult.selectedPremises.find(
      (p) => p.id === "derived.split_field.poach_solo_3x1",
    );
    expect(splitFieldRow?.clusterRank).toBe(1);
    expect(splitFieldRow!.spectralScore).toBeLessThan(0.72);

    const extremeCoupled = evaluateSovereignStageCDCoupling({
      familyDisplacements: {
        pressure: 50,
        weather: 50,
        restFatigue: 50,
        coveragePersonnel: 50,
        qbSkillScript: 50,
        marketMicrostructure: 50,
      },
      additionalPremises: [
        {
          id: "nan.guard.premise",
          premise: "NaN guard test",
          cluster: "nan.guard",
          similarity: Number.NaN,
          verificationTier: "CITABLE_VERIFIED",
          rawLogOddsDelta: Number.POSITIVE_INFINITY,
        },
      ],
      tauHatCoach: Number.NaN,
    });
    expect(extremeCoupled.allFiniteNonNan).toBe(true);
    expect(extremeCoupled.stageDResult.clampedTotalLogOddsDelta).toBe(MAX_ABS_DELTA_LOG_ODDS);
    expect(extremeCoupled.stageDResult.clamped).toBe(true);
  });

  it("loads Wave 15 OOF empirical-Bayes calibration receipt and Motif 9,944 sweep governance summary", () => {
    const manifest = loadFoundrySovereignCorpusManifest();
    expect(manifest.counts.sovereign_books_loaded).toBeGreaterThanOrEqual(1064);
    expect(manifest.counts.sovereign_primitives_routed).toBeGreaterThanOrEqual(14667);
    expect(manifest.counts.gcp_shard_b_docs_routed).toBeGreaterThanOrEqual(8143);
    expect(manifest.counts.rules_rlvr_lessons_routed).toBeGreaterThanOrEqual(200);
    expect(manifest.counts.active_mask_bits_set).toBeGreaterThanOrEqual(276);

    const calReceipt = loadCalibratedCorpusWeightsReceipt();
    expect(calReceipt).not.toBeNull();
    expect(calReceipt!.chronological_oof_baseline.n_rows).toBeGreaterThanOrEqual(4823);
    expect(calReceipt!.chronological_oof_baseline.brier_oof).toBeLessThan(
      calReceipt!.chronological_oof_baseline.brier_raw,
    );
    expect(calReceipt!.chronological_oof_baseline.ece_oof).toBeLessThan(0.03);
    expect(calReceipt!.calibrationVerified).toBe(false);
    for (const fam of FOUNDRY_SITUATIONAL_FAMILIES) {
      const famPrior = calReceipt!.empirical_bayes_six_family_priors[fam];
      expect(famPrior.all_finite_non_nan).toBe(true);
      expect(Math.abs(famPrior.bounded_eb_log_odds_prior)).toBeLessThanOrEqual(
        MAX_ABS_DELTA_LOG_ODDS,
      );
    }

    const sweepSummary = loadMotifSweepSummary();
    expect(sweepSummary).not.toBeNull();
    expect(sweepSummary!.totalRecords).toBeGreaterThanOrEqual(9944);
    expect(sweepSummary!.igForYouCount).toBe(2720);
    expect(sweepSummary!.xForYouCount).toBe(5609);
    expect(sweepSummary!.xAnalyticsCount).toBe(1615);
    expect(sweepSummary!.excludedKillOrWithdrawnCount).toBe(12);
    expect(sweepSummary!.adoptCount).toBe(36);
    expect(sweepSummary!.watchOrSkippedQuarantinedCount).toBeGreaterThanOrEqual(0);
    expect(sweepSummary!.allFeedsLoaded).toBe(true);
    expect(sweepSummary!.learnOnlyOrContextOnlyCount).toBeGreaterThan(0);
    expect(sweepSummary!.cached).toBe(true);
    // Repeated calls hit process-level caches for both sweep summary and 10.4 MB Shard-B summary
    expect(loadMotifSweepSummary()).toBe(sweepSummary);
    const shardSummary = loadShardBCatalogSummary();
    expect(shardSummary).not.toBeNull();
    expect(loadShardBCatalogSummary()).toBe(shardSummary);
  });
});
