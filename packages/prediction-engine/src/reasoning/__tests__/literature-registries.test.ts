import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  evaluateKellyUncertainty,
  aggregatePredictionMarketBeliefs,
  aggregateMultiBookConsensus,
  ensembleOutOfFold,
  extractVoronoiPocketControl,
} from "../literature-registries.js";

describe("Literature Mathematical Registries Suite (EQ-BETTING, MOD-BETTING, EQ-KAGGLE, MOD-KAGGLE)", () => {
  it("EQ-BETTING-003: Kelly Fractional Growth with Parameter Uncertainty penalizes stake by model variance", () => {
    // Zero variance (classic Kelly): b=1.0 (even money), p=0.55 -> (1*0.55 - 0.45)/1 = 0.10 (10%)
    const classic = evaluateKellyUncertainty({
      netDecimalOdds: 1.0,
      estimatedProbability: 0.55,
      modelVariance: 0.0,
    });
    assert.ok(Math.abs(classic.optimalStakeFraction - 0.10) < 1e-4, "Zero variance must equal classic Kelly");
    assert.equal(classic.variancePenalty, 0, "Variance penalty should be 0");

    // High parameter uncertainty (sigma_p^2 = 0.04): shrinks optimal stake fraction
    const uncertain = evaluateKellyUncertainty({
      netDecimalOdds: 1.0,
      estimatedProbability: 0.55,
      modelVariance: 0.04,
      riskAversionGamma: 1.0,
    });
    assert.ok(uncertain.optimalStakeFraction < classic.optimalStakeFraction, "Uncertainty must shrink stake");
    assert.ok(Math.abs(uncertain.optimalStakeFraction - 0.06) < 1e-4, "Stake should be 0.10 - 0.04 = 0.06");

    // Extreme uncertainty suppresses bet to 0.0 (pass discipline)
    const severe = evaluateKellyUncertainty({
      netDecimalOdds: 1.0,
      estimatedProbability: 0.55,
      modelVariance: 0.15,
      riskAversionGamma: 1.0,
    });
    assert.equal(severe.optimalStakeFraction, 0.0, "Severe variance must reduce stake to 0.0");
  });

  it("EQ-BETTING-004 & MOD-BETTING-002: Information-Theoretic Multi-Book Consensus Aggregator solves log-odds consensus", () => {
    // Two symmetric books at 0.60 and 0.40 equal weight -> 0.50
    const symmetric = aggregatePredictionMarketBeliefs([
      { probability: 0.60, weight: 1.0 },
      { probability: 0.40, weight: 1.0 },
    ]);
    assert.ok(Math.abs(symmetric - 0.50) < 1e-4, "Symmetric log-odds must yield 0.50");

    // Multi-book consensus with sharp bookmaker weighting
    const consensus = aggregateMultiBookConsensus([
      { bookmaker: "Pinnacle", marketProbability: 0.58 }, // Sharp weight 1.5
      { bookmaker: "Circa", marketProbability: 0.57 },    // Sharp weight 1.4
      { bookmaker: "DraftKings", marketProbability: 0.52 }, // Retail weight 0.8
    ]);
    assert.ok(consensus.fairProbability > 0.55, "Consensus must anchor toward sharp books");
    assert.ok(consensus.fairProbability < 0.58, "Consensus must bound between books");
    assert.ok(consensus.dispersion > 0, "Dispersion must be positive across differing books");
    assert.ok(consensus.consensusEntropy > 0, "Shannon entropy must be positive");
  });

  it("EQ-KAGGLE-001: Out-of-Fold Ensembling blends predictions with non-negative simplex weights", () => {
    const actuals = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1];
    // Model A: sharp predictor (low error)
    const modelA = [0.85, 0.15, 0.80, 0.90, 0.20, 0.75, 0.25, 0.10, 0.95, 0.80];
    // Model B: noisy predictor (higher error)
    const modelB = [0.60, 0.45, 0.55, 0.60, 0.40, 0.50, 0.55, 0.40, 0.65, 0.50];

    const ensemble = ensembleOutOfFold(actuals, [
      { modelName: "XGBoost_Tracking", outOfFoldPredictions: modelA },
      { modelName: "Linear_Baseline", outOfFoldPredictions: modelB },
    ]);

    assert.ok(ensemble.weights["XGBoost_Tracking"] > ensemble.weights["Linear_Baseline"], "Better model must receive higher weight");
    assert.ok(Math.abs(ensemble.weights["XGBoost_Tracking"] + ensemble.weights["Linear_Baseline"] - 1.0) < 1e-4, "Weights must sum to 1.0");
    assert.ok(ensemble.ensembleBrier < 0.15, "Ensemble Brier must be competitive");
  });

  it("MOD-KAGGLE-001: Voronoi Pocket Control computes pocket radius and trench protection score", () => {
    const qb = { id: "QB_1", x: 25.0, y: 26.6 };
    // 5 OL blockers shielding in front of QB
    const ol = [
      { id: "LT", x: 27.0, y: 29.0 },
      { id: "LG", x: 27.5, y: 27.5 },
      { id: "C",  x: 28.0, y: 26.6 },
      { id: "RG", x: 27.5, y: 25.7 },
      { id: "RT", x: 27.0, y: 24.2 },
    ];
    // 4 DL rushers attempting to penetrate
    const dl = [
      { id: "EDGE_L", x: 29.0, y: 31.0 },
      { id: "DT_1",   x: 30.0, y: 28.0 },
      { id: "DT_2",   x: 30.0, y: 25.0 },
      { id: "EDGE_R", x: 29.0, y: 22.0 },
    ];

    const pocket = extractVoronoiPocketControl(qb, ol, dl);

    assert.ok(pocket.pocketIntegrityRadiusYards > 4.0, "DL should be at least 4 yards away");
    assert.ok(pocket.nearestRusherId != null, "Must identify nearest rusher");
    assert.ok(pocket.trenchControlScore > 0.5, "Clean pocket must yield trench control score > 0.5");
  });
});
