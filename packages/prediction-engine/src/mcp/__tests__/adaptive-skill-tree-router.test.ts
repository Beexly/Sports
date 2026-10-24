import { describe, it, expect } from "vitest";
import {
  validateLayer0Fundamentals,
  computeEvciForConnector,
  executeAdaptiveEscalationLadder,
  REGISTERED_MCP_CONNECTORS,
  FullEscalationQuery,
} from "../adaptive-skill-tree-router.js";
import { CausalADMG } from "../../causal/do-calculus-id.js";

describe("Adaptive Skill-Tree & VoI Connector Router", () => {
  describe("Layer 0: Fundamental Sanity & Role Invariants", () => {
    it("fails closed when player is on IR or inactive on 53-man roster", () => {
      const result = validateLayer0Fundamentals({
        team: "SEA",
        opponent: "DEN",
        isRosterActive: false,
        isOnIR: true,
        isElevatedFromIRWithoutClearance: true,
        projectedSnapShare: 0.75,
        impliedTeamTotal: 21.5,
        isDomeOrIndoor: false,
        hasStableCoaching: true,
        offensiveLineHealthPct: 1.0,
      });

      expect(result.passed).toBe(false);
      expect(result.blocksPositiveDelta).toBe(true);
      expect(result.violations.length).toBeGreaterThanOrEqual(2);
      expect(result.violations.some((v) => v.includes("not active"))).toBe(true);
    });

    it("fails closed when snap share is below the 25% floor", () => {
      const result = validateLayer0Fundamentals({
        team: "DEN",
        opponent: "SEA",
        isRosterActive: true,
        isOnIR: false,
        isElevatedFromIRWithoutClearance: false,
        projectedSnapShare: 0.15,
        minSnapShareFloor: 0.25,
        impliedTeamTotal: 19.0,
        isDomeOrIndoor: false,
        hasStableCoaching: true,
        offensiveLineHealthPct: 0.95,
      });

      expect(result.passed).toBe(false);
      expect(result.blocksPositiveDelta).toBe(true);
      expect(result.violations.some((v) => v.includes("below hard floor"))).toBe(true);
    });

    it("passes when all role invariants and snap floors are satisfied", () => {
      const result = validateLayer0Fundamentals({
        team: "SEA",
        opponent: "DEN",
        isRosterActive: true,
        isOnIR: false,
        isElevatedFromIRWithoutClearance: false,
        projectedSnapShare: 0.82,
        impliedTeamTotal: 23.5,
        isDomeOrIndoor: false,
        hasStableCoaching: true,
        offensiveLineHealthPct: 0.9,
      });

      expect(result.passed).toBe(true);
      expect(result.blocksPositiveDelta).toBe(false);
      expect(result.violations.length).toBe(0);
      expect(result.invariantsChecked).toBe(4);
    });
  });

  describe("Value-of-Information (VoI) Dynamic Connector Routing", () => {
    it("bypasses weather connector in dome games via fast-path resolution", () => {
      const weatherConnector = REGISTERED_MCP_CONNECTORS.find((c) => c.capabilityType === "WEATHER")!;
      const cleanGraph: CausalADMG = {
        nodes: ["X", "Y"],
        directed: [["X", "Y"]],
        bidirected: [],
      };

      const evci = computeEvciForConnector(
        weatherConnector,
        cleanGraph,
        { ok: true, formulaClass: "OBSERVATIONAL_MARGINAL", formula: {} as any },
        {
          team: "DET",
          opponent: "MIN",
          isRosterActive: true,
          isOnIR: false,
          isElevatedFromIRWithoutClearance: false,
          projectedSnapShare: 0.8,
          impliedTeamTotal: 27.0,
          isDomeOrIndoor: true, // Ford Field dome
          hasStableCoaching: true,
          offensiveLineHealthPct: 1.0,
        },
      );

      expect(evci.recommendation).toBe("BYPASS_FAST_PATH");
      expect(evci.expectedKlDivergence).toBeLessThan(0.01);
    });

    it("escalates to deep dispatch when a connector provides ID-enabling edges for a hedge", () => {
      const trenchConnector = REGISTERED_MCP_CONNECTORS.find((c) => c.connectorId === "ebhattad/nfl-mcp")!;
      // Bow-arc graph with latent confounding
      const hedgeGraph: CausalADMG = {
        nodes: ["X", "Y", "OLCAI"],
        directed: [["X", "Y"], ["X", "OLCAI"], ["OLCAI", "Y"]],
        bidirected: [["X", "Y"]],
      };

      const evci = computeEvciForConnector(
        trenchConnector,
        hedgeGraph,
        {
          ok: false,
          code: "FAIL_HEDGE",
          hedge: { forestFull: ["X", "Y"], forestSub: ["Y"] },
          enablingEdges: [["X", "OLCAI"]],
        },
        {
          team: "DEN",
          opponent: "SEA",
          isRosterActive: true,
          isOnIR: false,
          isElevatedFromIRWithoutClearance: false,
          projectedSnapShare: 0.85,
          impliedTeamTotal: 20.0,
          isDomeOrIndoor: false,
          hasStableCoaching: true,
          offensiveLineHealthPct: 0.65, // degraded trench
        },
      );

      expect(evci.isIdEnabling).toBe(true);
      expect(evci.recommendation).toBe("DISPATCH_DEEP");
      expect(evci.evciScore).toBeGreaterThan(1.0);
    });
  });

  describe("Full 6-Layer Escalation Ladder", () => {
    it("halts at Layer 0 if fundamental role invariants are broken", () => {
      const query: FullEscalationQuery = {
        queryId: "Q-TEST-001",
        layer0: {
          team: "MIA",
          opponent: "BUF",
          isRosterActive: false, // inactive
          isOnIR: false,
          isElevatedFromIRWithoutClearance: false,
          projectedSnapShare: 0.7,
          impliedTeamTotal: 17.0,
          isDomeOrIndoor: false,
          hasStableCoaching: true,
          offensiveLineHealthPct: 0.8,
        },
        layer1: {
          gameId: "2026_07_MIA_BUF",
          marketType: "PLAYER_PROP",
          side: "OVER",
          marketPriceAmerican: -110,
          booksQuoting: 5,
          crossBookSpreadStdDev: 0.25,
          bookQuotes: [-110, -112, -108],
          vigFreeMarketProb: 0.51,
          decisionTimestampUtc: new Date().toISOString(),
        },
        layer4: {
          graph: { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [] },
          treatment: "X",
          outcome: "Y",
        },
        layer5: {
          itcrInput: {
            trace: {
              traceId: "TR-01",
              claimId: "CLM-01",
              targetNodeId: "Y",
              nodes: [
                {
                  nodeId: "N1",
                  layer: "L4",
                  statement: "Causal edge X->Y",
                  validityProbability: 0.95,
                  ancestorNodeIds: [],
                },
              ],
            },
            calibrationScores: [0.05, 0.08, 0.12, 0.09, 0.11, 0.07, 0.06, 0.1, 0.12, 0.08,
                               0.05, 0.09, 0.07, 0.11, 0.08, 0.06, 0.07, 0.09, 0.1, 0.08],
          },
          pointEstimate: 0.58,
          vigFreeMarketProb: 0.51,
          confScores: [0.08, 0.09, 0.1, 0.07, 0.08],
          eValuePoint: 2.1,
          eValueCiLower: 1.6,
        },
      };

      const res = executeAdaptiveEscalationLadder(query);
      expect(res.success).toBe(false);
      expect(res.terminalLayerReached).toBe("L0_FUNDAMENTAL_SANITY");
      expect(res.haltedReason).toContain("Layer 0 Fundamental Sanity failed");
    });

    it("completes all 6 layers when all invariants, identifiability, and conformal gates pass", () => {
      const query: FullEscalationQuery = {
        queryId: "Q-TEST-002",
        layer0: {
          team: "KC",
          opponent: "LAC",
          isRosterActive: true,
          isOnIR: false,
          isElevatedFromIRWithoutClearance: false,
          projectedSnapShare: 0.88,
          impliedTeamTotal: 26.5,
          isDomeOrIndoor: true,
          hasStableCoaching: true,
          offensiveLineHealthPct: 0.95,
        },
        layer1: {
          gameId: "2026_07_KC_LAC",
          marketType: "SPREAD",
          side: "KC -3.5",
          marketPriceAmerican: -110,
          booksQuoting: 8,
          crossBookSpreadStdDev: 0.15,
          bookQuotes: [-110, -110, -112, -108],
          vigFreeMarketProb: 0.5238,
          decisionTimestampUtc: new Date().toISOString(),
        },
        layer2: {
          premises: [
            {
              premiseId: "P-KC-01",
              affectedQuantity: "spread",
              direction: "FAVORS_HOME",
              probability: 0.65,
              weight: 1.0,
            },
          ],
          hasPlayCallerChange: false,
          hasCviShellRetreat: false,
          hypoxicAgeAltitudeTaxes: 0.0,
        },
        layer3: {
          passRushWinRateAdvantage: 0.08,
          interiorOlAttritionPenalty: 0.0,
          receiverSeparationOverExpected: 0.35,
          trackingSampleFrames: 1400,
          homographyConfidence: 0.94,
        },
        layer4: {
          graph: {
            nodes: ["X", "M", "Y"],
            directed: [["X", "M"], ["M", "Y"]],
            bidirected: [],
          },
          treatment: "X",
          outcome: "Y",
          crossEquationJacobianDelta: 0.02,
        },
        layer5: {
          itcrInput: {
            trace: {
              conclusion_node_id: "N2",
              nodes: [
                {
                  id: "N1",
                  layer: "L2",
                  validity: 0.98,
                  parents: [],
                },
                {
                  id: "N2",
                  layer: "L4",
                  validity: 0.96,
                  parents: ["N1"],
                },
              ],
            },
            calibration_scores: [0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13,
                                0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13],
          },
          pointEstimate: 0.58,
          vigFreeMarketProb: 0.5238,
          absoluteResiduals: [0.04, 0.05, 0.03, 0.04, 0.05],
          eValuePoint: 2.4,
          eValueCiLower: 1.8,
        },
      };

      const res = executeAdaptiveEscalationLadder(query);
      expect(res.success).toBe(true);
      expect(res.terminalLayerReached).toBe("L5_CONFORMAL_COPULA_KELLY");
      expect(res.layerResults["L0_FUNDAMENTAL_SANITY"]?.passed).toBe(true);
      expect(res.layerResults["L1_MARKET_MICROSTRUCTURE"]?.passed).toBe(true);
      expect(res.layerResults["L4_SCIENTIFIC_CAUSAL_SYNTHESIS"]?.passed).toBe(true);
      expect(res.layerResults["L5_CONFORMAL_COPULA_KELLY"]?.passed).toBe(true);
      expect(res.finalInterventionalProb).toBeCloseTo(0.60, 2);
      expect(res.recommendedStakeFraction).toBeGreaterThan(0.0);
    });
  });
});
