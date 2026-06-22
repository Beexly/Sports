import { describe, it, expect } from "vitest";
import {
  COMPETITOR_INTELLIGENCE,
  summarizeCompetitorCategories,
  competitorsMissingFeature,
  gseGapSummary,
} from "../competitor-intelligence";
import {
  FIRST_OF_KIND_SYSTEMS,
  GSE_SCORING_MODELS,
  confirmedUniqueCount,
  liveOrInSprintSystems,
  criticalTrustImpactSystems,
  systemsByCategory,
} from "../first-of-kind-systems";
import {
  REVENUE_MODELS,
  COMPETITOR_PRICING,
  coreRevenueModels,
  highRiskModels,
  competitorPricingRange,
  revenueModelsForStage,
} from "../revenue-intelligence";
import {
  CALIBRATION_METRICS,
  NO_PLAY_DOCTRINE,
  STAT_METHODS,
  primarySignals,
  sharpSignals,
  calibrationMetricById,
  BREAKEVEN_WIN_RATE,
} from "../prediction-methods";
import {
  DOMAIN_TRANSFERS,
  v1ReadyTransfers,
  v2RoadmapTransfers,
} from "../outside-domain-transfer";

// ── Competitor intelligence ───────────────────────────────────────────────────

describe("competitor-intelligence", () => {
  it("tracks at least 30 competitors", () => {
    expect(COMPETITOR_INTELLIGENCE.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has required fields", () => {
    for (const c of COMPETITOR_INTELLIGENCE) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(Array.isArray(c.categories)).toBe(true);
      expect(c.categories.length).toBeGreaterThan(0);
      expect(c.mechanicGseLearn).toBeTruthy();
      expect(typeof c.features.calibrationTracking).toBe("boolean");
      expect(typeof c.features.processGrading).toBe("boolean");
      expect(typeof c.features.voiceAssistant).toBe("boolean");
      expect(typeof c.features.managerGenome).toBe("boolean");
    }
  });

  it("summarizeCompetitorCategories returns all categories with counts", () => {
    const cats = summarizeCompetitorCategories(COMPETITOR_INTELLIGENCE);
    const entries = Object.entries(cats);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, count] of entries) {
      expect(count).toBeGreaterThan(0);
    }
    // Total entries >= competitor count since competitors can span multiple categories
    const total = Object.values(cats).reduce((sum, c) => sum + c, 0);
    expect(total).toBeGreaterThanOrEqual(COMPETITOR_INTELLIGENCE.length);
  });

  it("gseGapSummary reports critical first-of-kind gaps", () => {
    const summary = gseGapSummary(COMPETITOR_INTELLIGENCE);
    expect(summary.missingManagerGenome).toBeGreaterThan(0);
    expect(summary.missingCalibrationTracking).toBeGreaterThan(0);
    expect(summary.missingVoiceAssistant).toBeGreaterThan(0);
    expect(summary.missingProcessGrading).toBeGreaterThan(0);
  });

  it("competitorsMissingFeature returns competitors without calibration tracking", () => {
    const missing = competitorsMissingFeature(COMPETITOR_INTELLIGENCE, "calibrationTracking");
    expect(missing.length).toBeGreaterThan(0);
    for (const c of missing) {
      expect(c.features.calibrationTracking).toBe(false);
    }
  });

  it("no duplicate competitor IDs", () => {
    const ids = COMPETITOR_INTELLIGENCE.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ── First-of-kind systems ─────────────────────────────────────────────────────

describe("first-of-kind-systems", () => {
  it("documents at least 25 first-of-kind systems", () => {
    expect(FIRST_OF_KIND_SYSTEMS.length).toBeGreaterThanOrEqual(25);
  });

  it("every system has required fields", () => {
    for (const s of FIRST_OF_KIND_SYSTEMS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.category).toBeTruthy();
      expect(s.oneLiner).toBeTruthy();
      expect(s.whatNoCompetitorDoes).toBeTruthy();
      expect(s.howGseDoesIt).toBeTruthy();
      expect(s.status).toBeTruthy();
      expect(s.gseReadiness).toBeTruthy();
      expect(typeof s.buildPhase).toBe("number");
    }
  });

  it("confirmedUniqueCount returns a positive number", () => {
    const count = confirmedUniqueCount();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(FIRST_OF_KIND_SYSTEMS.length);
  });

  it("liveOrInSprintSystems returns systems that are live or in_sprint", () => {
    const live = liveOrInSprintSystems();
    for (const s of live) {
      expect(["live", "in_sprint"]).toContain(s.gseReadiness);
    }
  });

  it("criticalTrustImpactSystems returns only critical trust systems", () => {
    const critical = criticalTrustImpactSystems();
    expect(critical.length).toBeGreaterThan(0);
    for (const s of critical) {
      expect(s.trustImpact).toBe("critical");
    }
  });

  it("systemsByCategory returns only systems from that category", () => {
    const draftSystems = systemsByCategory("draft_intelligence");
    for (const s of draftSystems) {
      expect(s.category).toBe("draft_intelligence");
    }
  });

  it("no duplicate system IDs", () => {
    const ids = FIRST_OF_KIND_SYSTEMS.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all systems have valid build phases (1-12)", () => {
    for (const s of FIRST_OF_KIND_SYSTEMS) {
      expect(s.buildPhase).toBeGreaterThanOrEqual(1);
      expect(s.buildPhase).toBeLessThanOrEqual(12);
    }
  });

  it("documents 7 scoring models", () => {
    expect(GSE_SCORING_MODELS.length).toBe(7);
  });

  it("every scoring model has required fields", () => {
    for (const m of GSE_SCORING_MODELS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(Array.isArray(m.inputSignals)).toBe(true);
      expect(m.inputSignals.length).toBeGreaterThan(0);
      expect(m.outputRange).toBeTruthy();
      expect(Array.isArray(m.usedIn)).toBe(true);
    }
  });
});

// ── Revenue intelligence ──────────────────────────────────────────────────────

describe("revenue-intelligence", () => {
  it("documents at least 12 revenue models", () => {
    expect(REVENUE_MODELS.length).toBeGreaterThanOrEqual(12);
  });

  it("every revenue model has required fields", () => {
    for (const m of REVENUE_MODELS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.mechanics).toBeTruthy();
      expect(Array.isArray(m.upsides)).toBe(true);
      expect(Array.isArray(m.risks)).toBe(true);
      expect(m.gseRelevance).toBeTruthy();
      expect(m.regulatoryRisk).toBeTruthy();
    }
  });

  it("coreRevenueModels returns only core models", () => {
    const core = coreRevenueModels();
    expect(core.length).toBeGreaterThan(0);
    for (const m of core) {
      expect(m.gseRelevance).toBe("core");
    }
  });

  it("highRiskModels returns only high or critical risk models", () => {
    const risky = highRiskModels();
    for (const m of risky) {
      expect(["high", "critical"]).toContain(m.regulatoryRisk);
    }
  });

  it("competitorPricingRange returns valid range", () => {
    const range = competitorPricingRange();
    expect(range.minMonthly).toBeGreaterThan(0);
    expect(range.maxMonthly).toBeGreaterThan(range.minMonthly);
    expect(range.medianAnnual).toBeGreaterThan(0);
  });

  it("revenueModelsForStage returns models for each stage", () => {
    const seedModels = revenueModelsForStage("seed");
    expect(seedModels.length).toBeGreaterThan(0);
    const earlyModels = revenueModelsForStage("early");
    expect(earlyModels.length).toBeGreaterThan(0);
  });

  it("competitor pricing has entries with source notes", () => {
    for (const c of COMPETITOR_PRICING) {
      expect(c.name).toBeTruthy();
      expect(c.sourceNote).toBeTruthy();
      // Notes are public-page estimates, not verified figures
      expect(c.sourceNote.length).toBeGreaterThan(10);
    }
  });
});

// ── Prediction methods ────────────────────────────────────────────────────────

describe("prediction-methods", () => {
  it("documents at least 8 calibration metrics", () => {
    expect(CALIBRATION_METRICS.length).toBeGreaterThanOrEqual(8);
  });

  it("every calibration metric has required fields", () => {
    for (const m of CALIBRATION_METRICS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.formula).toBeTruthy();
      expect(m.interpretation).toBeTruthy();
      expect(m.gseUsage).toBeTruthy();
    }
  });

  it("primarySignals returns signals with primary weight", () => {
    const primary = primarySignals();
    expect(primary.length).toBeGreaterThan(0);
    for (const s of primary) {
      expect(s.gseWeight).toBe("primary");
    }
  });

  it("sharpSignals returns only sharp indicator signals", () => {
    const sharp = sharpSignals();
    expect(sharp.length).toBeGreaterThan(0);
    for (const s of sharp) {
      expect(s.sharpIndicator).toBe(true);
    }
  });

  it("calibrationMetricById returns correct metric", () => {
    const mae = calibrationMetricById("mae");
    expect(mae).toBeDefined();
    expect(mae?.id).toBe("mae");
  });

  it("breakeven win rate is correct (52.38%)", () => {
    expect(BREAKEVEN_WIN_RATE).toBeCloseTo(0.5238, 4);
  });

  it("no-play doctrine covers all key suppression behaviors", () => {
    const behaviors = new Set(NO_PLAY_DOCTRINE.map((d) => d.suppressionBehavior));
    expect(behaviors.has("show_no_play_card")).toBe(true);
    expect(behaviors.has("show_watchlist")).toBe(true);
  });

  it("stat methods cover ensemble and monte carlo", () => {
    const ids = STAT_METHODS.map((m) => m.id);
    expect(ids).toContain("ensemble");
    expect(ids).toContain("monte_carlo");
  });
});

// ── Outside domain transfers ──────────────────────────────────────────────────

describe("outside-domain-transfer", () => {
  it("documents at least 12 domain transfers", () => {
    expect(DOMAIN_TRANSFERS.length).toBeGreaterThanOrEqual(12);
  });

  it("every domain transfer has required fields", () => {
    for (const t of DOMAIN_TRANSFERS) {
      expect(t.domain).toBeTruthy();
      expect(t.domainName).toBeTruthy();
      expect(t.coreMechanic).toBeTruthy();
      expect(t.transferBridge).toBeTruthy();
      expect(t.v1Feature).toBeTruthy();
      expect(t.v2Feature).toBeTruthy();
      expect(t.status).toBeTruthy();
    }
  });

  it("v1ReadyTransfers returns only v1_ready transfers", () => {
    const v1 = v1ReadyTransfers();
    expect(v1.length).toBeGreaterThan(0);
    for (const t of v1) {
      expect(t.status).toBe("v1_ready");
    }
  });

  it("v2RoadmapTransfers returns only v2_roadmap transfers", () => {
    const v2 = v2RoadmapTransfers();
    for (const t of v2) {
      expect(t.status).toBe("v2_roadmap");
    }
  });

  it("covers finance and chess and aviation domains", () => {
    const domains = DOMAIN_TRANSFERS.map((t) => t.domain);
    expect(domains).toContain("finance_quant");
    expect(domains).toContain("chess_engines");
    expect(domains).toContain("aviation_checklists");
  });
});
