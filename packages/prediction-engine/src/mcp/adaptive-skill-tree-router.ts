/**
 * @file adaptive-skill-tree-router.ts
 * Hierarchical Adaptive Compute & Skill-Tree Router (Component 7).
 *
 * Implements the "Claude Code for Causal World Modeling" paradigm:
 * 1. Six-Layer Reasoning Escalation Ladder (L0 to L5):
 *    - L0_FUNDAMENTAL_SANITY: Basic domain truths & role invariants (snap floors, active roster, team totals).
 *    - L1_MARKET_MICROSTRUCTURE: Real-time vig-free consensus & cross-book dispersion (Shin devig, BEAT snapshots).
 *    - L2_NON_STAT_SITUATIONAL: Qualitative & structural context outside box scores (play-caller changes, CVI shell retreat).
 *    - L3_SPATIO_TEMPORAL_TRACKING: Micro-matchup geometry & trench physics (OLCAI, QPTSR, WR separation).
 *    - L4_SCIENTIFIC_CAUSAL_SYNTHESIS: 50,000-formula MCP catalog & do-calculus ID/IDC with mediator expansion.
 *    - L5_CONFORMAL_COPULA_KELLY: Epistemic knowability, ITCR conformal stopping, Vine Copula & Slow Conformal Kelly.
 *
 * 2. Value-of-Information (VoI) Dynamic Connector Routing:
 *    Computes Expected Value of Causal Information (EVCI):
 *    EVCI(c | G) = E[KL(P(Y|do(X), G U {O_c}) || P(Y|do(X), G))] + lambda_hedge * 1[c in ID-EnablingEdges] - kappa_lat * latency(c)
 *
 *    - Fast-Path Fundamental Resolution: Bypasses expensive connectors when L0/L1 indicate invariant dome conditions.
 *    - Deep-Path Multi-Connector Escalation: Triggers mediator queries when runShpitserPearlID halts on FAIL_HEDGE
 *      or itcr-orca-gate.ts detects elevated nonconformity.
 */

import {
  CausalADMG,
  NodeId,
  runShpitserPearlID,
  runShpitserPearlIDC,
  findIDEnablingEdgesForHedge,
} from "../causal/do-calculus-id.js";
import {
  evaluateItcrTrace,
  ItcrGateInput,
  ItcrGateResult,
  MAX_TRACE_NONCONFORMITY,
} from "../calibration/itcr-orca-gate.js";
import {
  slowConformalKellyStake,
  frechetHoeffdingBounds,
} from "../calibration/conformal-copula-kelly.js";

// ---------------------------------------------------------------------------
// TYPES & ENUMS
// ---------------------------------------------------------------------------

export type ReasoningLayerId =
  | "L0_FUNDAMENTAL_SANITY"
  | "L1_MARKET_MICROSTRUCTURE"
  | "L2_NON_STAT_SITUATIONAL"
  | "L3_SPATIO_TEMPORAL_TRACKING"
  | "L4_SCIENTIFIC_CAUSAL_SYNTHESIS"
  | "L5_CONFORMAL_COPULA_KELLY";

export const REASONING_LAYERS: readonly ReasoningLayerId[] = [
  "L0_FUNDAMENTAL_SANITY",
  "L1_MARKET_MICROSTRUCTURE",
  "L2_NON_STAT_SITUATIONAL",
  "L3_SPATIO_TEMPORAL_TRACKING",
  "L4_SCIENTIFIC_CAUSAL_SYNTHESIS",
  "L5_CONFORMAL_COPULA_KELLY",
] as const;

export interface Layer0FundamentalInput {
  readonly playerId?: string;
  readonly playerName?: string;
  readonly position?: string;
  readonly team: string;
  readonly opponent: string;
  readonly isRosterActive: boolean;
  readonly isOnIR: boolean;
  readonly isElevatedFromIRWithoutClearance: boolean;
  readonly projectedSnapShare: number; // 0.0 to 1.0
  readonly minSnapShareFloor?: number; // default 0.25
  readonly impliedTeamTotal: number;
  readonly minImpliedTotalForVolume?: number; // e.g. 14.0
  readonly isDomeOrIndoor: boolean;
  readonly hasStableCoaching: boolean;
  readonly offensiveLineHealthPct: number; // 0.0 to 1.0 (1.0 = 100% healthy)
  readonly salaryRosterLocked?: boolean;
}

export interface Layer0ValidationResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly blocksPositiveDelta: boolean;
  readonly invariantsChecked: number;
}

export interface Layer1MarketInput {
  readonly gameId: string;
  readonly marketType: "SPREAD" | "TOTAL" | "MONEYLINE" | "PLAYER_PROP";
  readonly side: string;
  readonly marketPriceAmerican: number;
  readonly booksQuoting: number;
  readonly crossBookSpreadStdDev: number;
  readonly bookQuotes: readonly number[]; // American odds across books
  readonly vigFreeMarketProb: number;
  readonly decisionTimestampUtc: string;
}

export interface Layer2SituationalInput {
  readonly premises: readonly {
    readonly premiseId: string;
    readonly affectedQuantity: string;
    readonly direction: "FAVORS_HOME" | "FAVORS_AWAY" | "AGAINST_HOME" | "AGAINST_AWAY" | "NEUTRAL";
    readonly probability: number;
    readonly weight: number;
  }[];
  readonly hasPlayCallerChange: boolean;
  readonly hasCviShellRetreat: boolean;
  readonly hypoxicAgeAltitudeTaxes: number; // SWA-01 penalty in points
}

export interface Layer3TrackingInput {
  readonly passRushWinRateAdvantage: number;
  readonly interiorOlAttritionPenalty: number;
  readonly receiverSeparationOverExpected: number;
  readonly trackingSampleFrames: number;
  readonly homographyConfidence: number; // >= 0.85
}

export interface Layer4CausalSynthesisInput {
  readonly graph: CausalADMG;
  readonly treatment: NodeId;
  readonly outcome: NodeId;
  readonly conditionSet?: readonly NodeId[];
  readonly candidateMediators?: readonly NodeId[];
  readonly crossEquationJacobianDelta?: number;
  readonly steinBeliefShrinkageApplied?: boolean;
}

export interface Layer5ConformalInput {
  readonly itcrInput: ItcrGateInput;
  readonly pointEstimate: number;
  readonly vigFreeMarketProb: number;
  readonly absoluteResiduals: readonly number[];
  readonly eValuePoint: number;
  readonly eValueCiLower: number;
  readonly lambdaKelly?: number;
  readonly capitalScale?: number;
  readonly oddsB?: number;
  readonly kappaSigma?: number;
  readonly dBreak?: number;
  readonly alphaDown?: number;
}

export interface ConnectorDefinition {
  readonly connectorId: string;
  readonly name: string;
  readonly estimatedLatencyMs: number;
  readonly capabilityType: "TRACKING" | "WEATHER" | "PHYSICS" | "LITERATURE" | "ORDER_FLOW" | "TRENCH";
  readonly targetNodesProvided: readonly string[];
}

export interface EvciEvaluation {
  readonly connectorId: string;
  readonly evciScore: number;
  readonly expectedKlDivergence: number;
  readonly isIdEnabling: boolean;
  readonly latencyPenalty: number;
  readonly recommendation: "DISPATCH_DEEP" | "BYPASS_FAST_PATH" | "DEFER";
}

export interface EscalationLadderResult {
  readonly success: boolean;
  readonly terminalLayerReached: ReasoningLayerId;
  readonly layerResults: Partial<
    Record<
      ReasoningLayerId,
      {
        readonly passed: boolean;
        readonly summary: string;
        readonly details: Record<string, unknown>;
      }
    >
  >;
  readonly haltedReason?: string;
  readonly evciEvaluations: readonly EvciEvaluation[];
  readonly activeConnectorsDispatched: readonly string[];
  readonly finalInterventionalProb?: number;
  readonly recommendedStakeFraction?: number;
}

// ---------------------------------------------------------------------------
// REGISTERED MCP CONNECTORS
// ---------------------------------------------------------------------------

export const REGISTERED_MCP_CONNECTORS: readonly ConnectorDefinition[] = [
  {
    connectorId: "@WalrusQuant/sports-leader-mcp",
    name: "WalrusQuant Sports Leader MCP",
    estimatedLatencyMs: 45,
    capabilityType: "TRACKING",
    targetNodesProvided: ["vision.soe_yd", "vision.art_mean", "snap_share", "motion_rate"],
  },
  {
    connectorId: "ebhattad/nfl-mcp",
    name: "NFL Trench & Micro-Matchup MCP",
    estimatedLatencyMs: 65,
    capabilityType: "TRENCH",
    targetNodesProvided: ["OLCAI", "QPTSR", "prwr_trench_delta", "pocket_depth_yd"],
  },
  {
    connectorId: "noaa-hrrr-weather-mcp",
    name: "NOAA HRRR Mesoscale Rapid-Refresh Weather MCP",
    estimatedLatencyMs: 80,
    capabilityType: "WEATHER",
    targetNodesProvided: ["wind_gust_mph", "precipitation_rate_mm_hr", "air_density_kg_m3", "surface_traction_coeff"],
  },
  {
    connectorId: "openstax-physics-mcp",
    name: "OpenStax Continuum Physics & Biomechanics MCP",
    estimatedLatencyMs: 120,
    capabilityType: "PHYSICS",
    targetNodesProvided: ["tendon_strain_hazard", "viscoelastic_turf_friction", "drag_force_newtons"],
  },
  {
    connectorId: "hnsw-living-literature-mcp",
    name: "pgvector HNSW Class-A Living Literature MCP",
    estimatedLatencyMs: 35,
    capabilityType: "LITERATURE",
    targetNodesProvided: ["class_a_premise_delta", "vanderweele_e_value", "contrast_residual_arm"],
  },
  {
    connectorId: "polymarket-clob-mcp",
    name: "Polymarket Limit Order Book Microstructure MCP",
    estimatedLatencyMs: 50,
    capabilityType: "ORDER_FLOW",
    targetNodesProvided: ["kyles_lambda", "order_flow_toxicity", "sharp_clob_spread"],
  },
] as const;

// ---------------------------------------------------------------------------
// LAYER 0: FUNDAMENTAL SANITY ENFORCEMENT
// ---------------------------------------------------------------------------

/**
 * Validates domain truths and role invariants (Layer 0).
 * Hard invariant: An ungrounded role or invalid roster condition fails closed
 * and strictly prohibits downstream Layer 3/4 equations from asserting a positive delta.
 */
export function validateLayer0Fundamentals(input: Layer0FundamentalInput): Layer0ValidationResult {
  const violations: string[] = [];
  let invariantsChecked = 0;

  // 1. Roster Active Invariant
  invariantsChecked++;
  if (!input.isRosterActive) {
    violations.push(`Player ${input.playerName ?? input.playerId ?? "Unknown"} is not active on 53-man roster.`);
  }

  // 2. IR and Non-Cleared Elevation Invariant
  invariantsChecked++;
  if (input.isOnIR || input.isElevatedFromIRWithoutClearance) {
    violations.push(`Player is on IR or elevated without verified physical clearance.`);
  }

  // 3. Snap Share Floor Invariant
  invariantsChecked++;
  const floor = input.minSnapShareFloor ?? 0.25;
  if (input.projectedSnapShare < floor) {
    violations.push(
      `Projected snap share ${(input.projectedSnapShare * 100).toFixed(1)}% is below hard floor ${(floor * 100).toFixed(1)}%.`,
    );
  }

  // 4. Implied Team Total Volume Coherence
  invariantsChecked++;
  const minTotal = input.minImpliedTotalForVolume ?? 13.5;
  if (input.impliedTeamTotal < minTotal && input.projectedSnapShare > 0.6) {
    violations.push(
      `Implied team total ${input.impliedTeamTotal.toFixed(1)} contradicts heavy offensive volume expectation.`,
    );
  }

  const passed = violations.length === 0;
  return {
    passed,
    violations,
    blocksPositiveDelta: !passed,
    invariantsChecked,
  };
}

// ---------------------------------------------------------------------------
// EVCI OPTIMIZATION: VALUE-OF-INFORMATION DYNAMIC ROUTING
// ---------------------------------------------------------------------------

export interface EvciRouterConfig {
  readonly lambdaHedge: number; // e.g. 2.0 (boost for breaking an identifiable hedge)
  readonly kappaLatency: number; // e.g. 0.005 per ms
  readonly tauHaltFastPath: number; // e.g. 0.15 threshold
}

export const DEFAULT_EVCI_CONFIG: EvciRouterConfig = {
  lambdaHedge: 2.0,
  kappaLatency: 0.005,
  tauHaltFastPath: 0.15,
};

/**
 * Computes EVCI for an MCP connector:
 * EVCI(c | G) = E[KL] + lambda_hedge * 1[c in ID-EnablingEdges] - kappa_lat * latency(c)
 */
export function computeEvciForConnector(
  connector: ConnectorDefinition,
  graph: CausalADMG,
  idResult: ReturnType<typeof runShpitserPearlID>,
  layer0: Layer0FundamentalInput,
  config: EvciRouterConfig = DEFAULT_EVCI_CONFIG,
): EvciEvaluation {
  // 1. Check if the connector provides ID-enabling edges for a witnessing hedge
  let isIdEnabling = false;
  if (!idResult.ok && idResult.code === "FAIL_HEDGE" && idResult.hedge) {
    const rawEnabling = (idResult as { enablingEdges?: ReadonlyArray<readonly [NodeId, NodeId]> }).enablingEdges;
    const enablingEdges = rawEnabling && rawEnabling.length > 0 ? rawEnabling : findIDEnablingEdgesForHedge(graph, idResult.hedge);
    for (const [u, v] of enablingEdges) {
      if (
        connector.targetNodesProvided.some(
          (node) => node.toLowerCase() === u.toLowerCase() || node.toLowerCase() === v.toLowerCase(),
        )
      ) {
        isIdEnabling = true;
        break;
      }
    }
    // Also check if any target node provided by connector can serve as a mediator between full forest nodes
    if (!isIdEnabling && idResult.hedge.forestFull.length > 0) {
      const fullSet = new Set(idResult.hedge.forestFull.map((n) => n.toLowerCase()));
      if (connector.targetNodesProvided.some((node) => fullSet.has(node.toLowerCase()))) {
        isIdEnabling = true;
      }
    }
  }

  // 2. Expected KL Divergence estimation based on situational conditions
  let expectedKl = 0.05; // baseline small information gain

  if (connector.capabilityType === "WEATHER") {
    // If dome or indoor, weather variance is exactly zero!
    if (layer0.isDomeOrIndoor) {
      expectedKl = 0.0001; // virtually zero KL divergence
    } else {
      expectedKl = 0.28; // outdoor game, weather observation has high informative value
    }
  } else if (connector.capabilityType === "TRENCH") {
    // If OL health is degraded, trench matchup has massive informational value
    if (layer0.offensiveLineHealthPct < 0.85) {
      expectedKl = 0.35;
    } else {
      expectedKl = 0.12;
    }
  } else if (connector.capabilityType === "TRACKING") {
    expectedKl = 0.22;
  } else if (connector.capabilityType === "LITERATURE") {
    expectedKl = 0.18;
  } else if (connector.capabilityType === "PHYSICS") {
    expectedKl = layer0.isDomeOrIndoor ? 0.05 : 0.19;
  } else if (connector.capabilityType === "ORDER_FLOW") {
    expectedKl = 0.15;
  }

  // 3. Latency penalty
  const latencyPenalty = config.kappaLatency * connector.estimatedLatencyMs;

  // 4. EVCI Total Score
  const hedgeBonus = isIdEnabling ? config.lambdaHedge : 0.0;
  const evciScore = expectedKl + hedgeBonus - latencyPenalty;

  // 5. Decision recommendation
  let recommendation: "DISPATCH_DEEP" | "BYPASS_FAST_PATH" | "DEFER";
  if (isIdEnabling) {
    recommendation = "DISPATCH_DEEP"; // Always dispatch if it breaks a structural hedge
  } else if (evciScore < config.tauHaltFastPath) {
    recommendation = "BYPASS_FAST_PATH"; // Fast path resolution: skip expensive connector
  } else {
    recommendation = "DISPATCH_DEEP";
  }

  return {
    connectorId: connector.connectorId,
    evciScore,
    expectedKlDivergence: expectedKl,
    isIdEnabling,
    latencyPenalty,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// HIERARCHICAL ADAPTIVE SKILL-TREE ROUTER CONTROLLER
// ---------------------------------------------------------------------------

export interface FullEscalationQuery {
  readonly queryId: string;
  readonly layer0: Layer0FundamentalInput;
  readonly layer1: Layer1MarketInput;
  readonly layer2?: Layer2SituationalInput;
  readonly layer3?: Layer3TrackingInput;
  readonly layer4: Layer4CausalSynthesisInput;
  readonly layer5: Layer5ConformalInput;
  readonly availableConnectors?: readonly ConnectorDefinition[];
  readonly evciConfig?: EvciRouterConfig;
}

/**
 * Executes the complete bottom-up 6-layer reasoning ladder with autonomous
 * connector routing, fast-path resolution, and fail-closed stopping.
 */
export function executeAdaptiveEscalationLadder(query: FullEscalationQuery): EscalationLadderResult {
  const layerResults: Partial<
    Record<
      ReasoningLayerId,
      {
        passed: boolean;
        summary: string;
        details: Record<string, unknown>;
      }
    >
  > = {};
  const connectors = query.availableConnectors ?? REGISTERED_MCP_CONNECTORS;
  const evciConfig = query.evciConfig ?? DEFAULT_EVCI_CONFIG;

  // =========================================================================
  // LAYER 0: Fundamental Sanity & Role Invariants
  // =========================================================================
  const l0 = validateLayer0Fundamentals(query.layer0);
  layerResults["L0_FUNDAMENTAL_SANITY"] = {
    passed: l0.passed,
    summary: l0.passed ? "All fundamental role invariants verified." : `Violations: ${l0.violations.join("; ")}`,
    details: {
      invariantsChecked: l0.invariantsChecked,
      violations: l0.violations,
      blocksPositiveDelta: l0.blocksPositiveDelta,
    },
  };

  if (!l0.passed) {
    return {
      success: false,
      terminalLayerReached: "L0_FUNDAMENTAL_SANITY",
      layerResults,
      haltedReason: `Layer 0 Fundamental Sanity failed: ${l0.violations[0]}`,
      evciEvaluations: [],
      activeConnectorsDispatched: [],
    };
  }

  // =========================================================================
  // LAYER 1: Market Microstructure & Line Anchor
  // =========================================================================
  const l1Input = query.layer1;
  const hasValidVigFree = l1Input.vigFreeMarketProb > 0.01 && l1Input.vigFreeMarketProb < 0.99;
  const hasSufficientBooks = l1Input.booksQuoting >= 2;
  const l1Passed = hasValidVigFree && hasSufficientBooks;

  layerResults["L1_MARKET_MICROSTRUCTURE"] = {
    passed: l1Passed,
    summary: l1Passed
      ? `Price anchored at ${l1Input.marketPriceAmerican} with vig-free p=${l1Input.vigFreeMarketProb.toFixed(4)} across ${l1Input.booksQuoting} books.`
      : "Insufficient books or invalid vig-free probability.",
    details: {
      marketPriceAmerican: l1Input.marketPriceAmerican,
      vigFreeMarketProb: l1Input.vigFreeMarketProb,
      crossBookSpreadStdDev: l1Input.crossBookSpreadStdDev,
      booksQuoting: l1Input.booksQuoting,
    },
  };

  if (!l1Passed) {
    return {
      success: false,
      terminalLayerReached: "L1_MARKET_MICROSTRUCTURE",
      layerResults,
      haltedReason: "Layer 1 Market Microstructure failed: insufficient book quotes or unanchored price.",
      evciEvaluations: [],
      activeConnectorsDispatched: [],
    };
  }

  // =========================================================================
  // RUN INITIAL CAUSAL ID ON GRAPH (TO EVALUATE VOI / HEDGES)
  // =========================================================================
  const graph = query.layer4.graph;
  const outcomeSet = new Set<NodeId>([query.layer4.outcome]);
  const treatmentSet = new Set<NodeId>([query.layer4.treatment]);
  const idResult = runShpitserPearlID(outcomeSet, treatmentSet, graph);

  // Compute EVCI for all connectors
  const evciEvaluations: EvciEvaluation[] = connectors.map((conn) =>
    computeEvciForConnector(conn, graph, idResult, query.layer0, evciConfig),
  );

  const activeConnectorsDispatched = evciEvaluations
    .filter((e) => e.recommendation === "DISPATCH_DEEP")
    .map((e) => e.connectorId);

  // =========================================================================
  // LAYER 2: Non-Stat Situational Context & Coaching
  // =========================================================================
  const l2Input = query.layer2;
  let l2Score = 0.0;
  if (l2Input) {
    for (const p of l2Input.premises) {
      const sign = p.direction === "FAVORS_HOME" ? 1 : p.direction === "FAVORS_AWAY" ? -1 : 0;
      l2Score += sign * p.probability * p.weight;
    }
  }

  layerResults["L2_NON_STAT_SITUATIONAL"] = {
    passed: true,
    summary: `Situational compiled: premises count=${l2Input?.premises.length ?? 0}, play-caller change=${l2Input?.hasPlayCallerChange ?? false}`,
    details: {
      l2Score,
      hasCviShellRetreat: l2Input?.hasCviShellRetreat ?? false,
      hypoxicAgeAltitudeTaxes: l2Input?.hypoxicAgeAltitudeTaxes ?? 0,
    },
  };

  // =========================================================================
  // LAYER 3: Spatio-Temporal Tracking & Matchup Chains
  // =========================================================================
  const l3Input = query.layer3;
  const l3Passed = l3Input ? l3Input.homographyConfidence >= 0.8 : true;

  layerResults["L3_SPATIO_TEMPORAL_TRACKING"] = {
    passed: l3Passed,
    summary: l3Passed
      ? `Trench & separation metrics verified (homography conf=${l3Input?.homographyConfidence ?? 1.0}).`
      : "Homography tracking confidence below 0.80.",
    details: {
      prwrAdvantage: l3Input?.passRushWinRateAdvantage ?? 0,
      interiorOlAttritionPenalty: l3Input?.interiorOlAttritionPenalty ?? 0,
      receiverSeparation: l3Input?.receiverSeparationOverExpected ?? 0,
    },
  };

  if (!l3Passed) {
    return {
      success: false,
      terminalLayerReached: "L3_SPATIO_TEMPORAL_TRACKING",
      layerResults,
      haltedReason: "Layer 3 Spatio-Temporal Tracking failed: homography confidence < 0.80.",
      evciEvaluations,
      activeConnectorsDispatched,
    };
  }

  // =========================================================================
  // LAYER 4: 50,000-Formula Scientific & Causal Synthesis
  // =========================================================================
  // Verify identifiability:
  const isIdentifiable = idResult.ok;
  let effectiveInterventionalProb = query.layer5.pointEstimate;

  if (query.layer4.conditionSet && query.layer4.conditionSet.length > 0) {
    const conditionSet = new Set<NodeId>(query.layer4.conditionSet);
    const idcResult = runShpitserPearlIDC(outcomeSet, treatmentSet, conditionSet, graph);
    if (!idcResult.ok) {
      layerResults["L4_SCIENTIFIC_CAUSAL_SYNTHESIS"] = {
        passed: false,
        summary: `Conditional interventional estimand non-identifiable: ${idcResult.code}`,
        details: { code: idcResult.code, hedge: idcResult.hedge },
      };
      return {
        success: false,
        terminalLayerReached: "L4_SCIENTIFIC_CAUSAL_SYNTHESIS",
        layerResults,
        haltedReason: `Layer 4 Causal Synthesis failed: conditional estimand non-identifiable (${idcResult.code}).`,
        evciEvaluations,
        activeConnectorsDispatched,
      };
    }
  } else if (!isIdentifiable) {
    layerResults["L4_SCIENTIFIC_CAUSAL_SYNTHESIS"] = {
      passed: false,
      summary: `Causal estimand non-identifiable: ${idResult.code}`,
      details: { code: idResult.code, hedge: idResult.hedge },
    };
    return {
      success: false,
      terminalLayerReached: "L4_SCIENTIFIC_CAUSAL_SYNTHESIS",
      layerResults,
      haltedReason: `Layer 4 Causal Synthesis failed: witnessing hedge ${JSON.stringify(idResult.hedge)}.`,
      evciEvaluations,
      activeConnectorsDispatched,
    };
  }

  // Cross-Equation Jacobian Delta application
  if (query.layer4.crossEquationJacobianDelta) {
    effectiveInterventionalProb = Math.max(
      0.01,
      Math.min(0.99, effectiveInterventionalProb + query.layer4.crossEquationJacobianDelta),
    );
  }

  layerResults["L4_SCIENTIFIC_CAUSAL_SYNTHESIS"] = {
    passed: true,
    summary: `Graph identifiable under Shpitser-Pearl ID. Formula: ${idResult.ok ? idResult.formulaClass : "IDC"}.`,
    details: {
      formulaClass: idResult.ok ? idResult.formulaClass : null,
      crossEquationJacobianDelta: query.layer4.crossEquationJacobianDelta ?? 0,
      steinBeliefShrinkageApplied: query.layer4.steinBeliefShrinkageApplied ?? false,
    },
  };

  // =========================================================================
  // LAYER 5: Conformal Stopping, Copula & Kelly Sizing
  // =========================================================================
  const l5Input = query.layer5;
  const itcrResult: ItcrGateResult = evaluateItcrTrace(l5Input.itcrInput);

  if (itcrResult.status === "HALT" || itcrResult.status === "REFUSED") {
    const alphaStr = (itcrResult.alpha_ITCR ?? 0).toFixed(4);
    layerResults["L5_CONFORMAL_COPULA_KELLY"] = {
      passed: false,
      summary: `ITCR conformal trace nonconformity ${alphaStr} halted (status=${itcrResult.status}).`,
      details: { itcrResult },
    };
    return {
      success: false,
      terminalLayerReached: "L5_CONFORMAL_COPULA_KELLY",
      layerResults,
      haltedReason: `Layer 5 Conformal Stopping halted: nonconformity ${alphaStr} (status=${itcrResult.status}).`,
      evciEvaluations,
      activeConnectorsDispatched,
    };
  }

  // Calculate Slow Conformal Kelly Stake
  const residuals = l5Input.absoluteResiduals.length > 0 ? l5Input.absoluteResiduals : [0.05, 0.08, 0.06];
  const b = l5Input.oddsB ?? (1.0 / l5Input.vigFreeMarketProb - 1.0);
  const stakeResult = slowConformalKellyStake({
    p: effectiveInterventionalProb,
    b: Math.max(0.01, b),
    k: l5Input.capitalScale ?? 1.0,
    lambdaKelly: l5Input.lambdaKelly ?? 1.0,
    kappaSigma: l5Input.kappaSigma ?? 0.05,
    dBreak: l5Input.dBreak ?? 0.01,
    alphaDown: l5Input.alphaDown ?? 0.05,
    absoluteResiduals: residuals,
  });

  layerResults["L5_CONFORMAL_COPULA_KELLY"] = {
    passed: true,
    summary: `Conformal stopping passed. Slow Conformal Kelly stake: ${(stakeResult.stake * 100).toFixed(2)}% (throttle=${stakeResult.throttle.toFixed(3)}).`,
    details: {
      itcrNonconformity: itcrResult.alpha_ITCR,
      recommendedStake: stakeResult.stake,
      fStake: stakeResult.fStake,
      throttle: stakeResult.throttle,
    },
  };

  return {
    success: true,
    terminalLayerReached: "L5_CONFORMAL_COPULA_KELLY",
    layerResults,
    evciEvaluations,
    activeConnectorsDispatched,
    finalInterventionalProb: effectiveInterventionalProb,
    recommendedStakeFraction: stakeResult.stake,
  };
}
