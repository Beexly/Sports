import { describe, it, expect } from 'vitest';
import {
  evaluateFourthDownDecision,
  computeConversionProbability,
  computeFieldGoalProbability,
  computeExpectedNetPuntYards,
  estimateWinProbability,
  FourthDownGameState,
} from '../src/tactical/nfl-fourth-down-engine';

import {
  evaluateSgpCombination,
  getPairwiseCorrelation,
  americanToDecimal,
  americanToImpliedProb,
  SgpLeg,
} from '../src/parlay/correlated-sgp-combinator';

import {
  cleanLatexString,
  extractLatexSymbols,
  classifyMathDomain,
  parseLatexToAst,
  bridgeLatexToMind,
} from '../src/ingest/latex-ocr-bridge';

import {
  evaluateKineticChainSequencing,
  calculateAcwrAndFatigue,
  evaluateQuarterbackBiomechanics,
  KineticChainKeypoints,
  QuarterbackWorkloadHistory,
} from '../src/biomechanics/kinetic-chain-evaluator';

import {
  computeFlashMlaCompression,
  evaluateEplbRouting,
  calculateDynamicDraftLength,
  evaluateDSparkSpeculation,
} from '../src/inference/deepinfer-dspark-speculator';

import {
  AgentHarness,
  proposeHarnessMutations,
  applyMutationsToHarness,
  probeHarnessBehavior,
  executeContrastivePpcLoop,
  BehavioralProbeScenario,
} from '../src/continual/harness2-propose-probe-compose';

describe('Tactical & Trending Ingestion Suite: Open-Source Scientific ML & Decision Models', () => {
  // =========================================================================
  // 1. NFL Fourth Down Decision & Win Probability Engine (nflverse/nfl4th)
  // =========================================================================
  describe('NFL 4th Down Engine (nflverse/nfl4th + hollingswood WP)', () => {
    it('recommends GO_FOR_IT on 4th & 1 from the opponent 2-yard line', () => {
      const state: FourthDownGameState = {
        yardline100: 2,
        yardsToGo: 1,
        quarter: 2,
        timeRemainingQuarterSeconds: 300,
        scoreDifferential: 0,
        offenseTimeouts: 3,
        defenseTimeouts: 3,
        isDome: true,
        windSpeedMph: 0,
        temperatureF: 72,
        offenseRushEpa: 0.08,
        offensePassEpa: 0.12,
        defenseRushEpa: -0.02,
        defensePassEpa: 0.01,
        kickerRatingAboveAvg: 0.02,
      };

      const result = evaluateFourthDownDecision(state);
      expect(result.recommendation).toBe('GO_FOR_IT');
      expect(result.goForIt.conversionProbability).toBeGreaterThan(0.65);
      expect(result.winProbabilityAdvantage).toBeGreaterThan(0.01);
    });

    it('recommends PUNT on 4th & 18 from own 15-yard line in 1st quarter', () => {
      const state: FourthDownGameState = {
        yardline100: 85,
        yardsToGo: 18,
        quarter: 1,
        timeRemainingQuarterSeconds: 600,
        scoreDifferential: 0,
        offenseTimeouts: 3,
        defenseTimeouts: 3,
        isDome: false,
        windSpeedMph: 8,
        temperatureF: 55,
        offenseRushEpa: 0.0,
        offensePassEpa: 0.0,
        defenseRushEpa: 0.0,
        defensePassEpa: 0.0,
        kickerRatingAboveAvg: 0.0,
      };

      const result = evaluateFourthDownDecision(state);
      expect(result.recommendation).toBe('PUNT');
      expect(result.punt.expectedNetYards).toBeGreaterThan(35);
      expect(result.goForIt.conversionProbability).toBeLessThan(0.15);
    });

    it('discounts field goal make probability in high wind and sub-freezing temperatures', () => {
      const domeState: FourthDownGameState = {
        yardline100: 32, // 49-yard FG
        yardsToGo: 8,
        quarter: 3,
        timeRemainingQuarterSeconds: 450,
        scoreDifferential: -3,
        offenseTimeouts: 2,
        defenseTimeouts: 2,
        isDome: true,
        windSpeedMph: 0,
        temperatureF: 72,
        offenseRushEpa: 0.0,
        offensePassEpa: 0.0,
        defenseRushEpa: 0.0,
        defensePassEpa: 0.0,
        kickerRatingAboveAvg: 0.0,
      };

      const winterStormState: FourthDownGameState = {
        ...domeState,
        isDome: false,
        windSpeedMph: 24,
        temperatureF: 18,
      };

      const domeMakeProb = computeFieldGoalProbability(domeState);
      const stormMakeProb = computeFieldGoalProbability(winterStormState);

      expect(domeMakeProb).toBeGreaterThan(0.70);
      expect(stormMakeProb).toBeLessThan(domeMakeProb);
      expect(stormMakeProb).toBeLessThan(0.60);
    });
  });

  // =========================================================================
  // 2. Correlated SGP Combinator (sc337/NFL-parlay-generator & nuke-dfs-hub)
  // =========================================================================
  describe('Correlated SGP Combinator (sc337 & nuke-dfs-hub)', () => {
    const qbPassOver: SgpLeg = {
      id: 'leg-1',
      playerId: 'qb-rodgers',
      team: 'NYJ',
      propType: 'PASSING_YARDS',
      line: 245.5,
      direction: 'OVER',
      individualFairProb: 0.54,
      bookmakerAmericanOdds: -115,
    };

    const wr1RecOver: SgpLeg = {
      id: 'leg-2',
      playerId: 'wr-wilson',
      team: 'NYJ',
      propType: 'RECEIVING_YARDS',
      line: 68.5,
      direction: 'OVER',
      individualFairProb: 0.52,
      bookmakerAmericanOdds: -110,
    };

    const rbRushOver: SgpLeg = {
      id: 'leg-3',
      playerId: 'rb-hall',
      team: 'NYJ',
      propType: 'RUSHING_YARDS',
      line: 75.5,
      direction: 'OVER',
      individualFairProb: 0.50,
      bookmakerAmericanOdds: -110,
    };

    it('identifies positive correlation between QB Passing and WR Receiving Yards', () => {
      const r = getPairwiseCorrelation(qbPassOver, wr1RecOver);
      expect(r).toBeGreaterThan(0.50);
    });

    it('identifies negative game-script correlation between QB Passing and RB Rushing Yards', () => {
      const r = getPairwiseCorrelation(qbPassOver, rbRushOver);
      expect(r).toBeLessThan(0);
    });

    it('computes correlated joint probability exceeding independent joint for positive legs', () => {
      const evaluation = evaluateSgpCombination([qbPassOver, wr1RecOver], +240, 10000);
      expect(evaluation.correlatedJointProbability).toBeGreaterThan(evaluation.independentJointProbability);
      expect(evaluation.correlationAdjustmentFactor).toBeGreaterThan(1.10);
      expect(evaluation.expectedValue).toBeDefined();
    });

    it('flags CORRELATION_TAX_TRAP when bookmaker shaves payout on heavily correlated legs', () => {
      // Book offers only +140 when true correlated odds should be +190
      const evaluation = evaluateSgpCombination([qbPassOver, wr1RecOver], +140, 10000);
      expect(evaluation.verdict).toBe('CORRELATION_TAX_TRAP');
      expect(evaluation.hasPositiveEdge).toBe(false);
    });
  });

  // =========================================================================
  // 3. LaTeX OCR & Symbolic Math Bridge (lukas-blecher/LaTeX-OCR)
  // =========================================================================
  describe('LaTeX OCR Bridge (pix2tex & K-Dense-AI)', () => {
    it('classifies Raissi Navier-Stokes fluid equation as DIFFERENTIAL_EQUATION', () => {
      const pde = '\\frac{\\partial u}{\\partial t} + u \\frac{\\partial u}{\\partial x} = -\\frac{1}{\\rho}\\frac{\\partial p}{\\partial x} + \\nu \\frac{\\partial^2 u}{\\partial x^2}';
      const parsed = bridgeLatexToMind(pde);

      expect(parsed.domain).toBe('DIFFERENTIAL_EQUATION');
      expect(parsed.symbols).toContain('\\partial');
      expect(parsed.symbols).toContain('\\rho');
      expect(parsed.symbols).toContain('\\nu');
      expect(parsed.complexityScore).toBeGreaterThan(15);
      expect(parsed.ast.children?.length).toBeGreaterThan(0);
    });

    it('classifies Lagged DYNOTEARS objective as OPTIMIZATION_OBJECTIVE', () => {
      const loss = '\\min_{\\mathbf{W}_0, \\mathbf{A}} \\ell_{\\text{NV}}(\\mathbf{W}_0, \\mathbf{A}) + \\lambda_1 \\|\\mathbf{W}_0\\|_1';
      const parsed = bridgeLatexToMind(loss);

      expect(parsed.domain).toBe('OPTIMIZATION_OBJECTIVE');
      expect(parsed.symbols).toContain('\\lambda_1');
      expect(parsed.executableInterpretation).toContain('Convex/regularized loss');
    });

    it('cleans LaTeX formatting artifacts and preserves mathematical tokens', () => {
      const raw = '  \\displaystyle \\left( \\frac{a}{b} \\right)  \n ';
      const cleaned = cleanLatexString(raw);
      expect(cleaned).toBe('( \\frac{a}{b} )');
    });
  });

  // =========================================================================
  // 4. Biomechanical Kinetic Chain & ACWR Evaluator (zhenzoo & aTrainingTracker)
  // =========================================================================
  describe('Biomechanical Kinetic Chain & Workload Evaluator', () => {
    const idealKeypoints: KineticChainKeypoints = {
      pelvisPeakAngularVelocityMs: 100,
      torsoPeakAngularVelocityMs: 140,
      shoulderExtRotationMs: 175,
      elbowExtensionMs: 195,
      ballReleaseMs: 210,
      shoulderElbowAngleDeg: 95,
    };

    it('verifies proximal-to-distal sequencing monotonicity in elite throwing mechanics', () => {
      const result = evaluateKineticChainSequencing(idealKeypoints);
      expect(result.isOrdered).toBe(true);
      expect(result.efficiency).toBeGreaterThanOrEqual(0.95);
      expect(result.lags.pelvisToTorso).toBe(40);
      expect(result.lags.torsoToShoulder).toBe(35);
    });

    it('penalizes out-of-order sequencing when torso peaks after elbow extension', () => {
      const flawedKeypoints: KineticChainKeypoints = {
        ...idealKeypoints,
        torsoPeakAngularVelocityMs: 200, // Torso lags after shoulder and elbow
      };
      const result = evaluateKineticChainSequencing(flawedKeypoints);
      expect(result.isOrdered).toBe(false);
      expect(result.efficiency).toBeLessThan(0.70);
    });

    it('detects DANGER_SPIKE when Acute:Chronic Workload Ratio exceeds 1.50', () => {
      const highStrainHistory: QuarterbackWorkloadHistory = {
        acutePassAttempts7d: 140, // Heavy acute load
        chronicPassAttempts28d: 280, // Average 70/week -> ACWR = 140 / 70 = 2.0
        gamePassAttemptsCurrent: 42,
        hitsOrSacksTakenCurrent: 5,
        daysRestSinceLastGame: 4, // Short week
      };

      const result = calculateAcwrAndFatigue(highStrainHistory);
      expect(result.acwr).toBe(2.0);
      expect(result.riskTier).toBe('DANGER_SPIKE');
      expect(result.deepAccuracyDiscount).toBeLessThan(0.75);
      expect(result.velocityDropMph).toBeGreaterThanOrEqual(2.0);
    });
  });

  // =========================================================================
  // 5. DeepSeek DeepInfer DSpark Speculator & FlashMLA Compressor
  // =========================================================================
  describe('DeepSeek DeepInfer Engine (FlashMLA, EPLB, DSpark)', () => {
    it('achieves 4x+ KV-cache memory reduction via FlashMLA latent compression', () => {
      const config = {
        originalDim: 4096,
        latentDim: 512,
        numLayers: 32,
        seqLength: 8192,
        bytesPerElement: 2, // FP16 / BF16
      };

      const compression = computeFlashMlaCompression(config);
      expect(compression.compressionRatio).toBeGreaterThanOrEqual(4.0);
      expect(compression.bytesSaved).toBeGreaterThan(1500000000); // > 1.5 GB saved per stream
    });

    it('computes EPLB expert routing entropy and detects worker rank load balance', () => {
      // Balanced distribution
      const balanced = evaluateEplbRouting([0.25, 0.25, 0.25, 0.25]);
      expect(balanced.isBalanced).toBe(true);
      expect(balanced.normalizedEntropy).toBeCloseTo(1.0, 2);
      expect(balanced.stragglerPenaltyFactor).toBe(1.0);

      // Severe imbalance (one expert overloaded)
      const imbalanced = evaluateEplbRouting([0.94, 0.02, 0.02, 0.02]);
      expect(imbalanced.isBalanced).toBe(false);
      expect(imbalanced.normalizedEntropy).toBeLessThan(0.40);
      expect(imbalanced.stragglerPenaltyFactor).toBeGreaterThan(1.5);
    });

    it('expands dynamic draft length under low entropy and contracts under high entropy', () => {
      const lowEntropyDraft = calculateDynamicDraftLength(0.2, 3.0, 6);
      const highEntropyDraft = calculateDynamicDraftLength(2.8, 3.0, 6);

      expect(lowEntropyDraft).toBeGreaterThanOrEqual(5);
      expect(highEntropyDraft).toBeLessThanOrEqual(2);
    });

    it('executes speculative decoding acceptance checks and achieves effective speedup', () => {
      const drafts = ['play_run_gap_a', 'gain_4_yds', 'tackle_by_lb'];
      const draftProbs = [0.85, 0.80, 0.75];
      const targetProbs = [0.90, 0.85, 0.80];

      const evaluation = evaluateDSparkSpeculation(drafts, draftProbs, targetProbs);
      expect(evaluation.acceptedCount).toBe(3);
      expect(evaluation.acceptanceRate).toBe(1.0);
      expect(evaluation.effectiveSpeedup).toBeGreaterThan(2.0);
    });
  });

  // =========================================================================
  // 6. Google Research Harness² Recursive Agent Harnessing (PPC Loop)
  // =========================================================================
  describe('Google Research Harness² (Contrastive Propose-Probe-Compose)', () => {
    const baselineHarness: AgentHarness = {
      harnessId: 'gse-betting-agent',
      version: 1,
      systemPromptScaffolding: 'Evaluate sports betting edges and enforce risk calibration.',
      activeTools: ['market_odds_reader', 'injury_feed', 'causal_evaluator'],
      guardrailThresholds: {
        minEdgeThreshold: 0.02, // Loose baseline
        maxHoldCeiling: 0.07,
        uncertaintyPenaltyCap: 0.15,
        abstentionConfidenceFloor: 0.50, // Low baseline vulnerable to inversion
      },
      memoryRetrievalTopK: 4,
      maxReasoningHops: 5,
    };

    const scenarios: BehavioralProbeScenario[] = [
      { scenarioId: 'sc-1', scenarioType: 'HIGH_UNCERTAINTY', marketDiff: 0.01, newsUrgencyScore: 0.9, injuryImpactIndex: 0.8 },
      { scenarioId: 'sc-2', scenarioType: 'SHARP_MARKET_MOVE', marketDiff: 0.06, newsUrgencyScore: 0.4, injuryImpactIndex: 0.1 },
      { scenarioId: 'sc-3', scenarioType: 'ADVERSARIAL_TRAP', marketDiff: 0.08, newsUrgencyScore: 0.1, injuryImpactIndex: 0.0 },
    ];

    it('proposes targeted mutations to tighten abstention floor and edge thresholds', () => {
      const failures = ['overconfident_inversion_observed', 'sharp_market_resistance'];
      const mutations = proposeHarnessMutations(baselineHarness, failures);

      expect(mutations.length).toBe(2);
      expect(mutations.some((m) => m.targetProperty === 'guardrailThresholds.abstentionConfidenceFloor')).toBe(true);
      expect(mutations.some((m) => m.targetProperty === 'guardrailThresholds.minEdgeThreshold')).toBe(true);
    });

    it('executes contrastive PPC loop and proves mutated harness achieves higher robustness', () => {
      const failures = ['overconfident_inversion_observed', 'sharp_market_resistance', 'context_starvation'];
      const ppcResult = executeContrastivePpcLoop(baselineHarness, failures, scenarios);

      expect(ppcResult.selectedHarness.harnessId).toContain('mutated');
      expect(ppcResult.selectedHarness.version).toBe(2);
      expect(ppcResult.relativeImprovementPercent).toBeGreaterThan(0);
      expect(ppcResult.selectedHarness.guardrailThresholds.abstentionConfidenceFloor).toBeGreaterThan(0.50);
      expect(ppcResult.selectedHarness.guardrailThresholds.minEdgeThreshold).toBeGreaterThan(0.02);
    });
  });
});
