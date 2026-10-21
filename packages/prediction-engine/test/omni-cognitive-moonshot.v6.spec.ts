/**
 * @file omni-cognitive-moonshot.v6.spec.ts
 * Phase V Master Verification Matrix (Falsification Probes T17-T24).
 *
 * Verifies:
 * - T17: Equation-to-AST & L1-L4 Vault Gate (Pillar 1)
 * - T18: Zero-Ghost-Roster Firewall Gate 38 (Pillar 2)
 * - T19: Hawkes Self-Excitation, Drop Inhibition & Role Isomorphism (Pillar 3)
 * - T20: Zero-Audio Sideline Lip-Reading & CMA Coachspeak Filter (Pillar 4)
 * - T21: Orthogonal In-Place TTT & Sub-200ms ReHarness Revision (Pillar 5)
 * - T22: Schedule Invariance, Shared Wiener Twins & Sign-Shuffle Control (Pillar 6)
 * - T23: Causal POMDP PWLC Alpha-Vector Invariance (Pillar 6)
 * - T24: Zero-Shot Cross-Sport & B2B Causal Beam Transfer (Pillar 7)
 */

import { describe, expect, it } from "vitest";

import {
  evaluateSymbolicAST,
  evaluateJacobianAnalytical,
  evaluateJacobianFiniteDiff,
  compileLatexToSymbolicAST,
  OmniVaultHarvester,
} from "../src/ingest/omni-vault-harvester.js";
import {
  verifyRosterContinuityGate,
  CANONICAL_2026_ROSTER_BINDINGS,
} from "../src/behavioral/dyadic-trust-engine.js";
import {
  MultivariateMarkedHawkesEngine,
  MarkedEvent,
  CoverageShellContext,
} from "../src/behavioral/network-hawkes-dyads.js";
import {
  computeRoleIsomorphismTargetReallocation,
  RouteTreeVector,
  ReceiverCandidate,
} from "../src/causal/role-isomorphism-realloc.js";
import {
  AvHubertSidelineAffectEngine,
  BroadcastVideoCutaway,
  FacialActionUnits,
} from "../src/perception/av-hubert-sideline-affect.js";
import {
  applyOrthogonalInPlaceTTTUpdate,
  verifySubspaceOrthogonality,
  TttReHarnessMemorySubstrate,
} from "../src/learning/ttt-reharness-memory.js";
import {
  ContinuousTimeCausalPfn,
  CausalPomdpSimulator,
} from "../src/causal/continuous-time-cpfn.js";
import {
  CausalBeamTransferEngine,
} from "../src/causal/causal-beam-transfer.js";

describe("Phase V Moonshot Master Verification Matrix (Probes T17-T24)", () => {
  // --------------------------------------------------------------------------
  // Probe T17: Equation-to-AST & L1-L4 Vault Gate
  // --------------------------------------------------------------------------
  describe("T17: Equation-to-AST & L1-L4 Vault Gate (Pillar 1)", () => {
    it("compiles aerodynamic drag equation into SymbolicExprNode and matches analytical Jacobian with finite diffs", () => {
      const latexEq = "F_D = 0.5 \\cdot \\rho \\cdot C_D \\cdot A \\cdot v^2";
      const ast = compileLatexToSymbolicAST(latexEq);

      const env = new Map<string, number>([
        ["air_density_kg_m3", 1.225],
        ["drag_coefficient", 0.30],
        ["frontal_area_m2", 0.045],
        ["relative_velocity_mps", 24.5],
      ]);

      const value = evaluateSymbolicAST(ast, env);
      expect(value).toBeGreaterThan(0);

      // Analytical derivative wrt velocity v:
      // d/dv [ 0.5 * rho * C_D * A * v^2 ] = rho * C_D * A * v
      const analyticalDeriv = evaluateJacobianAnalytical(ast, "relative_velocity_mps", env);
      const finiteDiffDeriv = evaluateJacobianFiniteDiff(ast, "relative_velocity_mps", env, 1e-6);

      // Parity check (+- 1e-6)
      const diff = Math.abs(analyticalDeriv - finiteDiffDeriv);
      expect(diff).toBeLessThan(1e-6);
    });

    it("enforces that unanchored or cross-domain equations are blocked from CITABLE_VERIFIED", () => {
      const harvester = new OmniVaultHarvester();

      const fakeRecord = {
        item_id: "CORRUPT_001",
        title: "Fabricated Claim",
        source_file: "source.txt",
        evidence_quote: "This quote does not exist in the source document at all.",
        mechanism_quote: "Neither does this mechanism quote.",
        evidence_span: { start_char: 10, end_char: 50 },
        numeric_claim: "0.22",
        parsed_float_magnitude: 0.22,
        applicable_context_fields: ["wind_speed_mph"],
      };

      const realSourceText = "This is legitimate source text about temperature and pressure.";
      const descriptor = harvester.harvestAndCompileFormula(
        fakeRecord,
        realSourceText,
        "F = m * a",
        "drag_force",
        ["wind_speed_mph"],
      );

      // L1 fails because quote is not in sourceText
      expect(descriptor.l1_l4_verdict.l1_provenance).toBe(false);
      expect(descriptor.status).not.toBe("CITABLE_VERIFIED");
      expect(descriptor.status).toBe("REJECTED_CORRUPT");
    });
  });

  // --------------------------------------------------------------------------
  // Probe T18: Zero-Ghost-Roster Firewall (Gate 38: G0_ENTITY_TEMPORAL_TRUTH)
  // --------------------------------------------------------------------------
  describe("T18: Zero-Ghost-Roster Firewall (Gate 38: G0_ENTITY_TEMPORAL_TRUTH)", () => {
    it("rejects stale cross-season entity bindings with REFUSED_L0_STALE_ENTITY_BINDING", () => {
      // Legacy fixture: DK Metcalf claimed on SEA with Geno Smith
      const staleCheck = verifyRosterContinuityGate("dk-metcalf", "SEA", "geno-smith");
      expect(staleCheck.valid).toBe(false);
      expect(staleCheck.reason).toContain("REFUSED_L0_STALE_ENTITY_BINDING");
      expect(staleCheck.reason).toContain("PIT");
    });

    it("admits live 2026 Pittsburgh Steelers bindings for Aaron Rodgers, DK Metcalf, and Germie Bernard", () => {
      const rodgersBernardCheck = verifyRosterContinuityGate("germie-bernard", "PIT", "aaron-rodgers");
      expect(rodgersBernardCheck.valid).toBe(true);

      const rodgersMetcalfCheck = verifyRosterContinuityGate("dk-metcalf", "PIT", "aaron-rodgers");
      expect(rodgersMetcalfCheck.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Probe T19: Hawkes Self-Excitation, Drop Inhibition & Role Isomorphism
  // --------------------------------------------------------------------------
  describe("T19: Hawkes Self-Excitation, Drop Inhibition & Role Isomorphism (Pillar 3)", () => {
    it("simulates Metcalf drop freeze, Bernard trust surge, and >75% role-isomorphic reallocation after Wilson IR", () => {
      const hawkes = new MultivariateMarkedHawkesEngine();
      const qbId = "aaron-rodgers";
      const nowUtc = "2026-10-18T18:00:00Z";

      // 1. History with 6 charted drops and negative sideline affect for Metcalf
      const metcalfHistory: MarkedEvent[] = [];
      for (let i = 0; i < 6; i++) {
        const evDate = new Date(Date.UTC(2026, 9, 18, 14, 10 + i * 5)).toISOString();
        metcalfHistory.push({
          timestampUtc: evDate,
          qbId,
          targetId: "dk-metcalf",
          outcome: "ChartedDrop",
          leverage3rd4th: 0.85,
          separationPhase1: 1.2,
          timeToPressureOl: 2.1,
          sightAdjust: false,
          sidelineAffectPolarity: -0.85, // visible contempt
        });
      }

      const metcalfState = hawkes.computeIntensity(qbId, "dk-metcalf", metcalfHistory, nowUtc);
      expect(metcalfState.continuousTrustScore).toBeLessThan(-0.25);
      expect(metcalfState.inDoghouse).toBe(true);

      // 2. History with conversions and film quiz pass for Germie Bernard
      const bernardHistory: MarkedEvent[] = [
        {
          timestampUtc: "2026-10-18T14:30:00Z",
          qbId,
          targetId: "germie-bernard",
          outcome: "FilmQuizPass",
          leverage3rd4th: 0.90,
          separationPhase1: 2.8,
          timeToPressureOl: 2.5,
          sightAdjust: true,
          sidelineAffectPolarity: +0.80,
        },
        {
          timestampUtc: "2026-10-18T15:15:00Z",
          qbId,
          targetId: "germie-bernard",
          outcome: "SightAdjustConv",
          leverage3rd4th: 0.95,
          separationPhase1: 3.1,
          timeToPressureOl: 2.4,
          sightAdjust: true,
          sidelineAffectPolarity: +0.90,
        },
        {
          timestampUtc: "2026-10-18T15:45:00Z",
          qbId,
          targetId: "germie-bernard",
          outcome: "3rdDownConv",
          leverage3rd4th: 1.0,
          separationPhase1: 2.5,
          timeToPressureOl: 2.2,
          sightAdjust: true,
          sidelineAffectPolarity: +0.95,
        },
        {
          timestampUtc: "2026-10-18T16:15:00Z",
          qbId,
          targetId: "germie-bernard",
          outcome: "SightAdjustConv",
          leverage3rd4th: 0.95,
          separationPhase1: 2.9,
          timeToPressureOl: 2.3,
          sightAdjust: true,
          sidelineAffectPolarity: +0.90,
        },
        {
          timestampUtc: "2026-10-18T16:45:00Z",
          qbId,
          targetId: "germie-bernard",
          outcome: "3rdDownConv",
          leverage3rd4th: 1.0,
          separationPhase1: 3.2,
          timeToPressureOl: 2.5,
          sightAdjust: true,
          sidelineAffectPolarity: +0.98, // game-winning OT touchdown
        },
      ];

      const bernardState = hawkes.computeIntensity(qbId, "germie-bernard", bernardHistory, nowUtc);
      expect(bernardState.continuousTrustScore).toBeGreaterThan(0.40);
      expect(bernardState.inDoghouse).toBe(false);

      // 3. Role Isomorphism Reallocation upon Roman Wilson IR exit
      const romanWilsonProfile = {
        name: "Roman Wilson",
        vacatedTargetShare: 0.20,
        routeVector: {
          slotSnapRate: 0.85,
          inlineTightSplitRate: 0.05,
          widePerimeterIsoRate: 0.05,
          motionRate: 0.35,
          aDot: 7.8,
          firstReadQuickGameShare: 0.65,
          choiceOptionRouteRate: 0.70,
          shallowCrossDragRate: 0.60,
          intermediateDigCurlRate: 0.50,
          seamPostRate: 0.20,
          verticalGoFadeRate: 0.05,
          contestedCatchRate: 0.10,
        },
      };

      const candidates: ReceiverCandidate[] = [
        {
          receiverId: "germie-bernard",
          name: "Germie Bernard",
          routeVector: {
            slotSnapRate: 0.84,
            inlineTightSplitRate: 0.05,
            widePerimeterIsoRate: 0.06,
            motionRate: 0.34,
            aDot: 7.9,
            firstReadQuickGameShare: 0.63,
            choiceOptionRouteRate: 0.68,
            shallowCrossDragRate: 0.58,
            intermediateDigCurlRate: 0.48,
            seamPostRate: 0.22,
            verticalGoFadeRate: 0.06,
            contestedCatchRate: 0.12,
          },
          dyadicTrustScore: +0.42,
          bracketHazard: 0.08,
          baselineTargetShare: 0.12,
        },
        {
          receiverId: "dk-metcalf",
          name: "DK Metcalf",
          routeVector: {
            slotSnapRate: 0.05,
            inlineTightSplitRate: 0.02,
            widePerimeterIsoRate: 0.88,
            motionRate: 0.05,
            aDot: 15.2,
            firstReadQuickGameShare: 0.15,
            choiceOptionRouteRate: 0.05,
            shallowCrossDragRate: 0.05,
            intermediateDigCurlRate: 0.25,
            seamPostRate: 0.30,
            verticalGoFadeRate: 0.65,
            contestedCatchRate: 0.45,
          },
          dyadicTrustScore: -0.38,
          bracketHazard: 0.55,
          baselineTargetShare: 0.25,
        },
        {
          receiverId: "mvs",
          name: "Marquez Valdes-Scantling",
          routeVector: {
            slotSnapRate: 0.10,
            inlineTightSplitRate: 0.02,
            widePerimeterIsoRate: 0.65,
            motionRate: 0.10,
            aDot: 17.5,
            firstReadQuickGameShare: 0.10,
            choiceOptionRouteRate: 0.05,
            shallowCrossDragRate: 0.05,
            intermediateDigCurlRate: 0.15,
            seamPostRate: 0.35,
            verticalGoFadeRate: 0.75,
            contestedCatchRate: 0.20,
          },
          dyadicTrustScore: +0.28,
          bracketHazard: 0.22,
          baselineTargetShare: 0.08,
        },
      ];

      const reallocation = computeRoleIsomorphismTargetReallocation(romanWilsonProfile, candidates, 1.25);
      const bernardTransfer = reallocation.find((r) => r.receiverId === "germie-bernard");
      expect(bernardTransfer).toBeDefined();
      expect(bernardTransfer!.netTransferFraction).toBeGreaterThan(0.75); // captures >75% (e.g. 76.4%)

      // 4. Coverage-shell deconfounding check (Soni et al., 2019)
      const deconf = hawkes.fitCoverageDeconfoundedPartialLikelihood(
        [...metcalfHistory, ...bernardHistory],
        [{ shellType: "COVER_2_4_6_ZONE", bracketedReceiverIds: ["dk-metcalf"] }],
      );
      expect(deconf.pValue).toBeLessThan(0.01);
      expect(deconf.eValuePoint).toBeGreaterThanOrEqual(1.35);
      expect(deconf.isCausallyIdentified).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Probe T20: Zero-Audio Sideline Lip-Reading & CMA Coachspeak Filter
  // --------------------------------------------------------------------------
  describe("T20: Zero-Audio Sideline Lip-Reading & CMA Coachspeak Filter (Pillar 4)", () => {
    it("decodes lip kinematics under zero acoustic audio and mutes podium coachspeak when deception >= 0.65", () => {
      const visionEngine = new AvHubertSidelineAffectEngine();

      const cutaway: BroadcastVideoCutaway = {
        fps: 60,
        frameCount: 120,
        roiMouthWidth: 96,
        roiMouthHeight: 96,
        homographyConfidence: 0.92,
        acousticSnrDb: -60.0, // muted/stadium roar -> zero audio
        visualKinematicsFrames: [],
      };

      const aus: FacialActionUnits = {
        au4_browLowerer: 0.70,
        au6_cheekRaiser: 0.10,
        au7_lidTightener: 0.65,
        au9_noseWrinkler: 0.85,
        au10_upperLipRaiser: 0.80,
        au12_lipCornerPuller: 0.15,
        au14_dimpler: 0.75, // unilateral dimple
        au23_24_lipTightenerPressor: 0.70,
        headShakeFrequency: 3.5,
        eyeAversionDurationMs: 4200,
      };

      // 1. Zero-audio visual speech decoding via UltraDub
      const decoded = visionEngine.decodeZeroAudioLipReading(cutaway, aus);
      expect(decoded.decodedText).toBe("he sucks");
      expect(decoded.visemeErrorRate).toBeLessThanOrEqual(0.02);

      // 2. Sideline visual affect
      const sidelineEmotion = visionEngine.classifyHeuEmotion(aus);
      expect(sidelineEmotion.dominantEmotion).toBe("Disgust_Contempt");
      expect(sidelineEmotion.valence).toBeLessThan(-0.5);

      const sidelineAffect = {
        valence: sidelineEmotion.valence,
        arousal: 0.85,
        dominance: 0.90,
        embeddingVector: [-0.85, 0.85, 0.90],
      };

      // 3. Post-game podium PR damage control ("I love DK, I will keep feeding him")
      const podiumAffect = {
        valence: +0.80,
        arousal: 0.35,
        dominance: 0.40,
        embeddingVector: [+0.80, 0.35, 0.40],
      };

      // 4. Cross-Modal Agreement
      const cma = visionEngine.computeCrossModalAgreement(
        "aaron-rodgers",
        "dk-metcalf",
        sidelineAffect,
        podiumAffect,
      );

      expect(cma.deceptionScore).toBeGreaterThanOrEqual(0.65);
      expect(cma.verdict).toBe("COACHSPEAK_MUTED");
      expect(cma.effectiveDiscourseImpulse).toBeLessThan(0); // sideline visual contempt wins
    });
  });

  // --------------------------------------------------------------------------
  // Probe T21: Orthogonal In-Place TTT & Sub-200ms ReHarness Revision
  // --------------------------------------------------------------------------
  describe("T21: Orthogonal In-Place TTT & Sub-200ms ReHarness Revision (Pillar 5)", () => {
    it("guarantees zero catastrophic forgetting on historical basis (<1e-14) and executes sub-200ms ReHarness revision", async () => {
      const substrate = new TttReHarnessMemorySubstrate(64);
      const basis = substrate.getHistoricalBasis();
      const currentWeights = substrate.getFastWeights();

      // Raw gradient attempting to adjust historical core features
      const rawGrad = new Float64Array(64);
      rawGrad[0] = 1.25; // on basis vector h1
      rawGrad[1] = -0.85; // on basis vector h2
      rawGrad[2] = 0.50; // orthogonal component

      const updatedWeights = applyOrthogonalInPlaceTTTUpdate(currentWeights, rawGrad, basis, 0.1);
      const delta = new Float64Array(64);
      for (let i = 0; i < 64; i++) {
        delta[i] = (updatedWeights[i] ?? 0) - (currentWeights[i] ?? 0);
      }

      // Projection of Delta onto historical basis H must vanish to machine precision (< 1e-14)
      const interference = verifySubspaceOrthogonality(delta, basis);
      expect(interference).toBeLessThan(1e-14);

      // External Interaction Regime (< 50ms assimilation)
      const inputSentence = "Aaron Rodgers pop-quizzes Germie Bernard in film room and targets him 5 times on slot drives.";
      const { triple, latencyMs: assimLatency } = await substrate.assimilateTripleInRealTime(inputSentence);
      expect(assimLatency).toBeLessThan(50);
      expect(triple.actor_target).toBe("germie-bernard");

      // Internal Consolidation Regime (< 200ms counterfactual natural experiment)
      const revision = await substrate.executeReHarnessSkillRevision(triple);
      expect(revision.execution_latency_ms).toBeLessThan(200);
      expect(revision.backtest_p_value).toBeLessThan(0.01);
      expect(revision.backtest_e_value).toBeGreaterThanOrEqual(1.35);
      expect(revision.promoted_to_active).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Probe T22: Schedule Invariance, Shared Wiener Twins & Sign-Shuffle Control
  // --------------------------------------------------------------------------
  describe("T22: Continuous-Time Causal PFN (CT-CPFN / M-DoT-PFN) (Pillar 6)", () => {
    it("achieves <= 0.16 bias under strong confounding (gamma=1.5) and passes Sign-Shuffle Control", () => {
      const cpfn = new ContinuousTimeCausalPfn(1.5);

      const irregularSchedule = {
        timestamps: [0.12, 0.45, 1.05, 1.88, 2.34, 3.12, 4.05],
      };

      const intervention = {
        targetVariable: "order_flow_steam",
        value: 1.0,
        onsetTime: 1.0,
        terminationTime: 2.0,
      };

      const result = cpfn.evaluateIntervention(irregularSchedule, intervention);

      // Naive observational regression overestimates by ~68%
      expect(result.naiveConfoundingBias).toBeGreaterThan(0.50);

      // CT-CPFN maintains bias <= 0.16
      expect(Math.abs(result.pfnEstimationBias)).toBeLessThanOrEqual(0.16);

      // Do-ablated twin baseline isolates drift
      expect(result.doAblatedTwinValue).toBeGreaterThan(0);

      // Sign-Shuffle Control residual <= 0.005
      expect(result.signShuffleResidual).toBeLessThanOrEqual(0.005);

      // Discretization schedule invariance gap <= 0.0003
      expect(result.scheduleInvarianceGap).toBeLessThanOrEqual(0.0003);
    });
  });

  // --------------------------------------------------------------------------
  // Probe T23: Causal POMDP PWLC Alpha-Vector Invariance
  // --------------------------------------------------------------------------
  describe("T23: Causal POMDP PWLC Alpha-Vector Invariance (Pillar 6)", () => {
    it("preserves piecewise linear and convex (PWLC) bounds across 12 drives under coordinator shift", () => {
      const simulator = new CausalPomdpSimulator();
      const alphaBounds = simulator.simulateDrivesWithCausalPpo(12, 0.85, "ZONE_TO_BLITZ_SCHEME");

      expect(alphaBounds.length).toBe(12);
      for (const b of alphaBounds) {
        expect(b.isPwlcConvex).toBe(true);
        expect(b.upperValueBound).toBeGreaterThan(b.lowerValueBound);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Probe T24: Zero-Shot Cross-Sport & B2B Causal Beam Transfer (CBST)
  // --------------------------------------------------------------------------
  describe("T24: Zero-Shot Cross-Sport & B2B Causal Beam Transfer (Pillar 7)", () => {
    it("transfers hypoxic fatigue beam sigma_2 and dyadic Hawkes beam sigma_3 zero-shot with E-value >= 1.35", () => {
      const beamEngine = new CausalBeamTransferEngine();

      // 1. Hypoxic Fatigue Beam sigma_2 (SWA-01) transferred to CFB and NBA
      const cfbTransfer = beamEngine.transferBeamZeroShot("BEAM_SIGMA_2", "CFB_MOUNTAIN_WEST");
      expect(cfbTransfer.transferStatus).toBe("ZERO_SHOT_VALIDATED");
      expect(cfbTransfer.targetEValuePoint).toBeGreaterThanOrEqual(1.35);
      expect(cfbTransfer.taskTransferSuccessRate).toBeGreaterThanOrEqual(0.94);

      const nbaTransfer = beamEngine.transferBeamZeroShot("BEAM_SIGMA_2", "NBA_DENVER_UTAH_B2B");
      expect(nbaTransfer.transferStatus).toBe("ZERO_SHOT_VALIDATED");
      expect(nbaTransfer.targetEValuePoint).toBeGreaterThanOrEqual(1.35);

      // 2. Dyadic Hawkes Beam sigma_3 transferred to GSE-Grid and GSE-Logistics
      const gridTransfer = beamEngine.transferBeamZeroShot("BEAM_SIGMA_3", "GSE_GRID_TRANSFORMER_CASCADE");
      expect(gridTransfer.transferStatus).toBe("ZERO_SHOT_VALIDATED");
      expect(gridTransfer.targetEValuePoint).toBeGreaterThanOrEqual(1.35);

      const logisticsTransfer = beamEngine.transferBeamZeroShot("BEAM_SIGMA_3", "GSE_LOGISTICS_PORT_REROUTE");
      expect(logisticsTransfer.transferStatus).toBe("ZERO_SHOT_VALIDATED");
      expect(logisticsTransfer.targetEValuePoint).toBeGreaterThanOrEqual(1.35);
    });
  });
});
