import { describe, expect, it } from "vitest";
import {
  buildContextMask,
  MASK_WORDS,
  MAX_ABS_DELTA_LOG_ODDS,
} from "../mcp-cognitive-router.js";
import {
  buildFoundryCorpusRouterSignals,
  evaluateFoundrySovereignCorpusPrior,
  FOUNDRY_SITUATIONAL_FAMILIES,
  loadFoundrySovereignCorpusManifest,
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
    expect(catalog?.total_markdown_files).toBeGreaterThanOrEqual(6310);
    expect(catalog?.total_extracted_equations).toBeGreaterThanOrEqual(27000);
  });
});
