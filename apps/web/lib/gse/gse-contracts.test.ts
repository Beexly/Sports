import { describe, it, expect } from "vitest";
import {
  // scoring core
  GSE_SCORING_SYSTEMS,
  makeScore,
  toBand,
  clampScore,
  weightedAverage,
  getScoringSystem,
  // data excellence
  scoreDataQuality,
  scoreSourceIntegrity,
  scoreCalibrationHealth,
  summarizeDataHealth,
  isWellOrderedLineage,
  type DataSourceRecord,
  type DataQualitySignals,
  // evidence engine
  scoreEvidenceStrength,
  scoreCounterEvidenceSeverity,
  scoreFalsifierRisk,
  scoreRecommendationConfidence,
  scoreDecisionFragility,
  buildVerdict,
  COURTROOM_TEMPLATES,
  type Evidence,
  type Falsifier,
  // claim safety
  scorePublicClaimSafety,
  scoreSourceRightsRisk,
  isRightsHardStop,
  // cognitive
  USER_MODES,
  COGNITIVE_COMMANDS,
  COGNITIVE_PRINCIPLES,
  scoreUserBiasRisk,
  scoreCognitiveLoad,
  // jarvis
  JARVIS_MODES,
  getJarvisModeContract,
  scoreJarvisReadiness,
  // memory
  MEMORY_POLICIES,
  scoreMemoryUsefulness,
  // agents
  AGENT_ROLES,
  scoreAgentTrust,
  // revenue
  FUNNEL_STAGES,
  TRUST_SAFE_COPY,
  scoreRevenueReadiness,
  // product OS
  scoreProductOpportunity,
  scoreLaunchReadiness,
  isLaunchReady,
  scoreMoat,
  summarizeProductOSPriorities,
  type ProductIdea,
  type LaunchReadinessInput,
  // ontology
  ONTOLOGY_ENTITIES,
  ONTOLOGY_RELATIONSHIPS,
  groupDecisionEntitiesByDomain,
  // thinking pages
  PAGE_CONTRACTS,
  scorePageIntelligence,
} from "./index";

// ─── helpers ───────────────────────────────────────────────────────────────
function inRange(n: number) {
  return n >= 0 && n <= 100;
}

// ─── scoring core ────────────────────────────────────────────────────────────
describe("scoring core", () => {
  it("clamps scores into 0..100 and never returns NaN", () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(Number.NaN)).toBe(0);
  });

  it("maps bands at the documented thresholds", () => {
    expect(toBand(10)).toBe("very_low");
    expect(toBand(30)).toBe("low");
    expect(toBand(50)).toBe("moderate");
    expect(toBand(70)).toBe("high");
    expect(toBand(90)).toBe("very_high");
  });

  it("weightedAverage returns 0 (not NaN) for empty/zero-weight input", () => {
    expect(weightedAverage([])).toBe(0);
    expect(weightedAverage([{ value: 50, weight: 0 }])).toBe(0);
  });

  it("makeScore always carries band + rationale + flags arrays", () => {
    const s = makeScore("data_quality", 73, { confidence: "supported", rationale: ["x"] });
    expect(s.band).toBe("high");
    expect(Array.isArray(s.rationale)).toBe(true);
    expect(Array.isArray(s.flags)).toBe(true);
  });
});

// ─── 20 scoring systems registry ─────────────────────────────────────────────
describe("GSE_SCORING_SYSTEMS registry", () => {
  it("declares exactly 20 scoring systems", () => {
    expect(GSE_SCORING_SYSTEMS.length).toBe(20);
  });

  it("every system has unique id + all required fields populated", () => {
    const ids = new Set<string>();
    for (const s of GSE_SCORING_SYSTEMS) {
      expect(s.id.length).toBeGreaterThan(0);
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.purpose.length).toBeGreaterThan(0);
      expect(s.inputs.length).toBeGreaterThan(0);
      expect(s.misuseRisk.length).toBeGreaterThan(0);
      expect(s.v1.length).toBeGreaterThan(0);
      expect(["higher_is_better", "higher_is_riskier"]).toContain(s.orientation);
    }
  });

  it("getScoringSystem resolves a known id and rejects an unknown one", () => {
    expect(getScoringSystem("evidence_strength")?.name).toContain("Evidence");
    expect(getScoringSystem("nope")).toBeUndefined();
  });
});

// ─── data excellence ─────────────────────────────────────────────────────────
describe("data excellence scoring", () => {
  const fresh: DataQualitySignals = {
    completeness: 1, ageMins: 1, freshnessExpectationMins: 60, consistency: 1,
    sourceReliability: 90, confirmations: 2, contradictions: 0, lineageDepth: 4, rightsSafe: true,
  };
  const stale: DataQualitySignals = {
    completeness: 0.4, ageMins: 600, freshnessExpectationMins: 60, consistency: 0.5,
    sourceReliability: 40, confirmations: 0, contradictions: 2, lineageDepth: 0, rightsSafe: true,
  };

  it("rates a fresh, complete, confirmed item far above a stale, contradicted one", () => {
    const good = scoreDataQuality(fresh);
    const bad = scoreDataQuality(stale);
    expect(inRange(good.score) && inRange(bad.score)).toBe(true);
    expect(good.score).toBeGreaterThan(bad.score);
    expect(bad.flags.join(" ")).toMatch(/stale|incomplete|contradicted|lineage/i);
  });

  it("caps data-quality fitness when rights are not safe", () => {
    const unsafe = scoreDataQuality({ ...fresh, rightsSafe: false });
    expect(unsafe.score).toBeLessThanOrEqual(49);
    expect(unsafe.flags.join(" ")).toMatch(/rights/i);
  });

  it("flags a permission-required source as non-approved in source integrity", () => {
    const src: DataSourceRecord = {
      sourceId: "s1", name: "Example", domain: "scores", sourceType: "aggregator",
      rightsStatus: "permission_required", allowedUsage: [], prohibitedUsage: [],
      freshnessExpectationMins: 60, updateFrequencyMins: 15, reliabilityScore: 70,
      historicalAccuracy: null, cost: "free", dependencyRisk: 80, fallbackSourceId: null,
      publicDisplayAllowed: false,
    };
    const s = scoreSourceIntegrity(src);
    expect(s.flags.join(" ")).toMatch(/not an approved status/i);
    expect(s.flags.join(" ")).toMatch(/single point of failure|fallback/i);
  });

  it("caps calibration health below publishable until the sample is large enough", () => {
    const small = scoreCalibrationHealth({ settledSampleSize: 20, calibrationError: 0.05, drift: 0.02, coveredBins: 5 });
    expect(small.score).toBeLessThanOrEqual(59);
    expect(small.flags.join(" ")).toMatch(/not yet publishable/i);
  });

  it("validates lineage ordering", () => {
    expect(isWellOrderedLineage([
      { stage: "raw_source", ref: "a", at: "t" },
      { stage: "feature", ref: "b", at: "t" },
      { stage: "recommendation", ref: "c", at: "t" },
    ])).toBe(true);
    expect(isWellOrderedLineage([
      { stage: "recommendation", ref: "c", at: "t" },
      { stage: "raw_source", ref: "a", at: "t" },
    ])).toBe(false);
  });

  it("summarizeDataHealth counts stale/SPOF/non-approved and returns a health score", () => {
    const src: DataSourceRecord = {
      sourceId: "s1", name: "n", domain: "odds", sourceType: "api",
      rightsStatus: "permission_required", allowedUsage: [], prohibitedUsage: [],
      freshnessExpectationMins: 5, updateFrequencyMins: 1, reliabilityScore: 50,
      historicalAccuracy: null, cost: "free", dependencyRisk: 80, fallbackSourceId: null,
      publicDisplayAllowed: false,
    };
    const summary = summarizeDataHealth({
      sources: [src], feedHealth: { s1: "stale" }, openContradictions: 1,
      highRiskClaims: 0, unresolvedRightsDisputes: 0,
    });
    expect(summary.staleOrBroken).toBe(1);
    expect(summary.singlePointsOfFailure).toBe(1);
    expect(summary.nonApprovedRights).toBe(1);
    expect(inRange(summary.health.score)).toBe(true);
  });
});

// ─── evidence engine ─────────────────────────────────────────────────────────
describe("evidence engine", () => {
  const strong: Evidence[] = [
    { evidenceId: "e1", supportsClaim: "c1", kind: "structured_data", strength: "strong", reliability: 90, freshness: 1, independent: true, sourceId: "s1", summary: "x" },
    { evidenceId: "e2", supportsClaim: "c1", kind: "model_output", strength: "strong", reliability: 85, freshness: 0.9, independent: true, sourceId: "s2", summary: "y" },
  ];

  it("returns 0 for an empty evidence set and flags it", () => {
    const s = scoreEvidenceStrength([]);
    expect(s.score).toBe(0);
    expect(s.band).toBe("very_low");
    expect(s.flags.join(" ")).toMatch(/unsupported|empty/i);
  });

  it("rewards multiple independent strong supports", () => {
    expect(scoreEvidenceStrength(strong).score).toBeGreaterThan(70);
  });

  it("discounts correlated (non-independent) evidence", () => {
    const correlated: Evidence[] = strong.map((e) => ({ ...e, independent: false }));
    expect(scoreEvidenceStrength(correlated).score).toBeLessThan(scoreEvidenceStrength(strong).score);
  });

  it("treats counter-evidence and falsifier scores as higher-is-riskier", () => {
    const counter = scoreCounterEvidenceSeverity([
      { counterId: "x", challengesClaim: "c1", severity: "strong", kind: "reported_fact", reliability: 90, freshness: 1, sourceId: "s", summary: "z" },
    ]);
    expect(counter.score).toBeGreaterThan(40);
    const fals: Falsifier[] = [
      { falsifierId: "f1", forClaim: "c1", condition: "OUT", likelihood: 0.5, monitored: false, timeToActionMins: 20, actionIfTriggered: "pass" },
    ];
    const fr = scoreFalsifierRisk(fals);
    expect(fr.score).toBeGreaterThan(30);
    expect(fr.flags.join(" ")).toMatch(/unmonitored/i);
  });

  it("composes recommendation confidence, tempered by counter + falsifier", () => {
    const ev = scoreEvidenceStrength(strong);
    const lowCounter = scoreRecommendationConfidence({ evidenceStrength: ev, counterSeverity: makeScore("counter_evidence_severity", 0, { confidence: "supported", rationale: [] }), falsifierRisk: makeScore("falsifier_risk", 0, { confidence: "supported", rationale: [] }), dataQuality: 80, modelAgreement: 0.9 });
    const highCounter = scoreRecommendationConfidence({ evidenceStrength: ev, counterSeverity: makeScore("counter_evidence_severity", 90, { confidence: "supported", rationale: [] }), falsifierRisk: makeScore("falsifier_risk", 80, { confidence: "supported", rationale: [] }), dataQuality: 80, modelAgreement: 0.9 });
    expect(lowCounter.score).toBeGreaterThan(highCounter.score);
  });

  it("rates a stale, concentrated, falsifier-heavy call as more fragile", () => {
    const highFalsifier = makeScore("falsifier_risk", 80, { confidence: "supported", rationale: [] });
    const lowFalsifier = makeScore("falsifier_risk", 10, { confidence: "supported", rationale: [] });
    const noCounter = makeScore("counter_evidence_severity", 0, { confidence: "supported", rationale: [] });
    const fragile = scoreDecisionFragility({ falsifierRisk: highFalsifier, counterSeverity: noCounter, inputFreshness: 0.2, evidenceIndependence: 0.2, timeToActionMins: 15 });
    const robust = scoreDecisionFragility({ falsifierRisk: lowFalsifier, counterSeverity: noCounter, inputFreshness: 0.95, evidenceIndependence: 0.95, timeToActionMins: 600 });
    expect(fragile.score).toBeGreaterThan(robust.score);
    expect(fragile.flags.join(" ")).toMatch(/concentrated|stale/i);
  });

  it("buildVerdict downgrades a low-confidence call to no_play", () => {
    const lowConf = makeScore("recommendation_confidence", 20, { confidence: "tentative", rationale: [] });
    const fragility = makeScore("decision_fragility", 30, { confidence: "supported", rationale: [] });
    const v = buildVerdict("start", lowConf, fragility, { whatWouldChange: "news", nextMonitoringStep: "watch", alternative: "bench" });
    expect(v.action).toBe("no_play");
  });

  it("buildVerdict sends a confident-but-fragile call to watchlist", () => {
    const conf = makeScore("recommendation_confidence", 75, { confidence: "supported", rationale: [] });
    const fragile = makeScore("decision_fragility", 80, { confidence: "supported", rationale: [] });
    const v = buildVerdict("play", conf, fragile, { whatWouldChange: "x", nextMonitoringStep: "y", alternative: "z" });
    expect(v.action).toBe("watchlist");
  });

  it("ships 10 courtroom templates, each with a no-play path", () => {
    expect(COURTROOM_TEMPLATES.length).toBe(10);
    for (const t of COURTROOM_TEMPLATES) {
      expect(t.noPlayPath.length).toBeGreaterThan(0);
      expect(t.keyEvidence.length).toBeGreaterThan(0);
    }
  });
});

// ─── claim safety ────────────────────────────────────────────────────────────
describe("claim safety", () => {
  it("hard-fails public copy containing banned tout language", () => {
    const r = scorePublicClaimSafety({ text: "This pick is a guaranteed lock today.", hasSource: true, demoLiveClear: true });
    expect(r.safe).toBe(false);
    expect(r.score.band).toBe("very_low");
    expect(r.bannedHits.length).toBeGreaterThan(0);
  });

  it("passes clean, sourced, demo-clear copy", () => {
    const r = scorePublicClaimSafety({ text: "See the evidence behind every pick.", hasSource: true, demoLiveClear: true });
    expect(r.safe).toBe(true);
    expect(r.score.score).toBeGreaterThanOrEqual(60);
  });

  it("every trust-safe copy sample passes the gate", () => {
    for (const copy of TRUST_SAFE_COPY) {
      const r = scorePublicClaimSafety({ text: copy, hasSource: true, demoLiveClear: true });
      expect(r.safe, `copy not safe: ${copy}`).toBe(true);
    }
  });

  it("source-rights risk hard-stops permission_required / excluded sources", () => {
    const pr = scoreSourceRightsRisk({ status: "permission_required", intendedUse: "automated_ingestion", automationAllowed: false, commercialDisplayAllowed: false });
    expect(pr.score).toBeGreaterThanOrEqual(80);
    expect(isRightsHardStop({ status: "excluded", intendedUse: "automated_ingestion", automationAllowed: false, commercialDisplayAllowed: false })).toBe(true);
    const ok = scoreSourceRightsRisk({ status: "approved_api", intendedUse: "commercial_display", automationAllowed: true, commercialDisplayAllowed: true });
    expect(ok.score).toBeLessThan(40);
  });
});

// ─── cognitive operating model ───────────────────────────────────────────────
describe("cognitive operating model", () => {
  it("declares 10 principles and 10 user modes with full contracts", () => {
    expect(COGNITIVE_PRINCIPLES.length).toBe(10);
    expect(USER_MODES.length).toBe(10);
    for (const m of USER_MODES) {
      expect(m.primaryAction.length).toBeGreaterThan(0);
      expect(m.failureMode.length).toBeGreaterThan(0);
      expect(m.whatToShow.length).toBeGreaterThan(0);
    }
  });

  it("declares a cognitive command palette of at least 14 commands", () => {
    expect(COGNITIVE_COMMANDS.length).toBeGreaterThanOrEqual(14);
    for (const c of COGNITIVE_COMMANDS) expect(c.outputShape.length).toBeGreaterThan(0);
  });

  it("weights loss-chasing highest in user bias risk", () => {
    const lossChaser = scoreUserBiasRisk({ recencyChasing: 0.1, lossChasing: 0.9, favoriteTeamSkew: 0.1, overtrading: 0.1, ignoringCounterEvidence: 0.1, narrativeChasing: 0.1 });
    const calm = scoreUserBiasRisk({ recencyChasing: 0.1, lossChasing: 0.0, favoriteTeamSkew: 0.1, overtrading: 0.1, ignoringCounterEvidence: 0.1, narrativeChasing: 0.1 });
    expect(lossChaser.score).toBeGreaterThan(calm.score);
    expect(lossChaser.flags.join(" ")).toMatch(/loss-chasing/i);
  });

  it("scores a cluttered surface as heavier cognitive load than a focused one", () => {
    const heavy = scoreCognitiveLoad({ primaryActions: 4, dataElements: 20, unexplainedJargon: 5, decisionsRequired: 6, novelty: 0.8 });
    const light = scoreCognitiveLoad({ primaryActions: 1, dataElements: 3, unexplainedJargon: 0, decisionsRequired: 1, novelty: 0.1 });
    expect(heavy.score).toBeGreaterThan(light.score);
  });
});

// ─── jarvis ──────────────────────────────────────────────────────────────────
describe("jarvis decision copilot", () => {
  it("every mode declares forbidden claims + a fallback + an audit requirement", () => {
    expect(JARVIS_MODES.length).toBeGreaterThanOrEqual(13);
    for (const m of JARVIS_MODES) {
      expect(m.forbiddenClaims.length, `${m.id} has no forbidden claims`).toBeGreaterThan(0);
      expect(m.fallbackBehavior.length).toBeGreaterThan(0);
      expect(m.auditRequirement.length).toBeGreaterThan(0);
    }
  });

  it("scoreJarvisReadiness rewards a complete contract and flags a stripped one", () => {
    const mode = getJarvisModeContract("argue_the_case")!;
    expect(scoreJarvisReadiness(mode).score).toBeGreaterThanOrEqual(80);
    const stripped = { ...mode, forbiddenClaims: [], sourceProtocol: "" };
    const s = scoreJarvisReadiness(stripped);
    expect(s.score).toBeLessThan(80);
    expect(s.flags.join(" ")).toMatch(/forbidden-claims|source protocol/i);
  });
});

// ─── memory ──────────────────────────────────────────────────────────────────
describe("memory policy", () => {
  it("declares 6 memory types", () => {
    expect(MEMORY_POLICIES.length).toBe(6);
  });

  it("zeroes usefulness when consent is required but not granted", () => {
    const s = scoreMemoryUsefulness({ type: "user_preference", ageDays: 1, confirmed: true, outcomeRelevance: 1, consentGranted: false, hasSourceRef: true });
    expect(s.score).toBe(0);
    expect(s.flags.join(" ")).toMatch(/consent/i);
  });

  it("caps an unconfirmed candidate so it never acts like a fact", () => {
    const s = scoreMemoryUsefulness({ type: "model_memory", ageDays: 1, confirmed: false, outcomeRelevance: 1, consentGranted: true, hasSourceRef: true });
    expect(s.score).toBeLessThanOrEqual(35);
    expect(s.flags.join(" ")).toMatch(/candidate/i);
  });
});

// ─── agents ──────────────────────────────────────────────────────────────────
describe("agent orchestration", () => {
  it("declares 23 agent roles, each with allowed + forbidden inputs", () => {
    expect(AGENT_ROLES.length).toBe(23);
    for (const a of AGENT_ROLES) {
      expect(a.allowedInputs.length, `${a.id} missing allowed inputs`).toBeGreaterThan(0);
      expect(a.forbiddenInputs.length, `${a.id} missing forbidden inputs`).toBeGreaterThan(0);
      expect(a.escalationTriggers.length).toBeGreaterThan(0);
    }
  });

  it("cannot earn high autonomy with no observed runs", () => {
    const role = AGENT_ROLES.find((a) => a.id === "jarvis_orchestrator")!;
    const cold = scoreAgentTrust({ role });
    expect(cold.score).toBeLessThanOrEqual(70);
    expect(cold.flags.join(" ")).toMatch(/no observed runs/i);
    const warm = scoreAgentTrust({ role, calibratedReliability: 95, runsObserved: 60 });
    expect(warm.score).toBeGreaterThan(cold.score);
  });
});

// ─── revenue ─────────────────────────────────────────────────────────────────
describe("revenue intelligence OS", () => {
  it("declares the full funnel", () => {
    expect(FUNNEL_STAGES.length).toBe(10);
  });

  it("hard-caps revenue readiness when the copy contains banned language", () => {
    const bad = scoreRevenueReadiness({
      surface: "pricing", valueClarity: 1, disclosuresComplete: true,
      copy: "Guaranteed profit, risk-free!", priceFromSourceOfTruth: true, refundClarity: true,
      usesCountdownUrgency: false, usesUnverifiedSocialProof: false,
    });
    expect(bad.score).toBeLessThanOrEqual(20);
  });

  it("penalizes fake urgency and unverified social proof", () => {
    const clean = scoreRevenueReadiness({
      surface: "pricing", valueClarity: 1, disclosuresComplete: true,
      copy: "Cancel any time from your dashboard.", priceFromSourceOfTruth: true, refundClarity: true,
      usesCountdownUrgency: false, usesUnverifiedSocialProof: false,
    });
    const dark = scoreRevenueReadiness({
      surface: "pricing", valueClarity: 1, disclosuresComplete: true,
      copy: "Cancel any time from your dashboard.", priceFromSourceOfTruth: true, refundClarity: true,
      usesCountdownUrgency: true, usesUnverifiedSocialProof: true,
    });
    expect(dark.score).toBeLessThan(clean.score);
  });
});

// ─── product OS ──────────────────────────────────────────────────────────────
describe("product operating system", () => {
  const baseIdea: ProductIdea = {
    id: "i1", name: "Idea", userPain: 0.9, uniqueness: 0.8, trustImpact: 0.5,
    revenueImpact: 0.7, retentionImpact: 0.7, dataAvailability: 0.8, rightsSafe: true,
    buildComplexity: 0.3, maintenanceBurden: 0.3, ecosystemFit: 0.8, firstOfKind: 0.7,
  };

  it("caps opportunity when rights are not safe (a hard gate, not a slider)", () => {
    const blocked = scoreProductOpportunity({ ...baseIdea, rightsSafe: false });
    expect(blocked.score).toBeLessThanOrEqual(15);
    expect(blocked.flags.join(" ")).toMatch(/rights gate/i);
  });

  it("caps opportunity when trust impact is negative", () => {
    const erodes = scoreProductOpportunity({ ...baseIdea, trustImpact: -0.5 });
    expect(erodes.score).toBeLessThanOrEqual(25);
    expect(erodes.flags.join(" ")).toMatch(/trust gate/i);
  });

  it("launch readiness hard-caps when a blocking gate is unmet", () => {
    const allReady: LaunchReadinessInput = {
      data: true, trust: true, ux: true, mobile: true, performance: true,
      accessibility: true, legal_source: true, revenue: true, support: true, rollback: true,
    };
    expect(isLaunchReady(allReady)).toBe(true);
    expect(scoreLaunchReadiness(allReady).score).toBe(100);
    const dataMissing = { ...allReady, data: false };
    expect(scoreLaunchReadiness(dataMissing).score).toBeLessThanOrEqual(39);
    expect(isLaunchReady(dataMissing)).toBe(false);
  });

  it("scoreMoat treats a highly replicable capability as a head start, not a moat", () => {
    const durable = scoreMoat({ uniqueness: 0.8, dataAdvantage: 0.8, trustAdvantage: 0.8, compoundingMemory: 0.8, switchingCost: 0.7, replicability: 0.1 });
    const copyable = scoreMoat({ uniqueness: 0.8, dataAdvantage: 0.8, trustAdvantage: 0.8, compoundingMemory: 0.8, switchingCost: 0.7, replicability: 0.9 });
    expect(durable.score).toBeGreaterThan(copyable.score);
    expect(copyable.flags.join(" ")).toMatch(/head start/i);
  });

  it("summarizeProductOSPriorities ranks by opportunity and respects blockers", () => {
    const ideas: ProductIdea[] = [
      baseIdea,
      { ...baseIdea, id: "i2", name: "Weak", userPain: 0.2, uniqueness: 0.2, firstOfKind: 0.1, revenueImpact: 0.2, retentionImpact: 0.2 },
    ];
    const out = summarizeProductOSPriorities(ideas, { i1: { rightsUnclear: true } });
    expect(out.topOpportunity).not.toBeNull();
    // i1 is blocked by rights despite being the stronger idea.
    expect(out.blocked.some((s) => s.idea.id === "i1")).toBe(true);
  });
});

// ─── ontology ────────────────────────────────────────────────────────────────
describe("decision ontology", () => {
  it("groups every entity into a domain with no loss", () => {
    const groups = groupDecisionEntitiesByDomain();
    const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(ONTOLOGY_ENTITIES.length);
    expect(ONTOLOGY_ENTITIES.length).toBeGreaterThanOrEqual(50);
  });

  it("every relationship endpoint refers to a declared entity kind", () => {
    const kinds = new Set(ONTOLOGY_ENTITIES.map((e) => e.kind));
    for (const r of ONTOLOGY_RELATIONSHIPS) {
      expect(kinds.has(r.from), `unknown from: ${r.from}`).toBe(true);
      expect(kinds.has(r.to), `unknown to: ${r.to}`).toBe(true);
    }
  });

  it("narrative_signal only affects projection/ownership via allowed impact", () => {
    const narrativeEdges = ONTOLOGY_RELATIONSHIPS.filter((r) => r.from === "NarrativeSignal");
    expect(narrativeEdges.length).toBeGreaterThan(0);
    for (const e of narrativeEdges) expect(e.note).toMatch(/allowed impact/i);
  });
});

// ─── thinking pages ──────────────────────────────────────────────────────────
describe("thinking-website page contracts", () => {
  it("every page names a primary decision + a success metric + a failure mode", () => {
    expect(PAGE_CONTRACTS.length).toBeGreaterThanOrEqual(20);
    for (const p of PAGE_CONTRACTS) {
      expect(p.decisionSupported.length, `${p.page} missing decision`).toBeGreaterThan(0);
      expect(p.primaryUserQuestion.length).toBeGreaterThan(0);
      expect(p.successMetric.length).toBeGreaterThan(0);
      expect(p.failureMode.length).toBeGreaterThan(0);
    }
  });

  it("every page's jarvisMode references a real Jarvis mode", () => {
    const modeIds = new Set(JARVIS_MODES.map((m) => m.id));
    for (const p of PAGE_CONTRACTS) {
      expect(modeIds.has(p.jarvisMode), `${p.page} → unknown jarvisMode ${p.jarvisMode}`).toBe(true);
    }
  });

  it("scores a full courtroom-style page above a thin one", () => {
    const courtroom = PAGE_CONTRACTS.find((p) => p.page === "Signal Courtroom")!;
    const score = scorePageIntelligence(courtroom);
    expect(score.score).toBeGreaterThanOrEqual(80);
    const thin = scorePageIntelligence({ ...courtroom, hasCounterEvidenceLayer: false, hasNoPlayPath: false, showsSource: false });
    expect(thin.score).toBeLessThan(score.score);
    expect(thin.flags.join(" ")).toMatch(/counter-evidence/i);
  });
});
