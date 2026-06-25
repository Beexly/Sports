/**
 * DATA INTELLIGENCE MESH — Acceptance Scenarios (A–I), wired against real modules.
 *
 * The bar: GSE knows which facts exist, when they were knowable, which source saw them first, which
 * disagree, which change decisions, and which are too expensive, dirty, late, or legally unsafe to
 * trust. Nothing here touches a live gate, requires a key, or makes a network call.
 */

import { describe, it, expect } from "vitest";
import { scoreAcquisition, rankAcquisition, type AcquisitionInputs, type ExperimentTarget } from "../acquisition-governor.js";
import { reliabilityFromGenome } from "../source-quality-score.js";
import { classifyConflict } from "../source-conflict-court.js";
import { knowableAt } from "../temporal-fact.js";
import { detectCoverageGaps, DEFAULT_MODULE_REQUIREMENTS } from "../coverage-gap-radar.js";
import type { SourceGenome } from "../source-genome.js";
import {
  GENOME_ODDS_API, GENOME_SPORTSDATAIO, GENOME_ENTERPRISE, GENOME_FORBIDDEN, GENOME_SLEEPER,
  ENDPOINTS_ODDS_API, ENDPOINTS_SPORTSDATAIO, ENDPOINTS_TRIVIA, GENOME_TRIVIA, ENDPOINTS_NFLVERSE, FACTS_FIXTURE,
} from "../source-mesh-fixtures.js";

function inputs(genome: SourceGenome, endpoints: AcquisitionInputs["endpoints"] = [], over: Partial<AcquisitionInputs> = {}): AcquisitionInputs {
  const novelty = genome.uniqueFacts.length / Math.max(1, genome.uniqueFacts.length + genome.duplicateFacts.length);
  return { genome, reliability: reliabilityFromGenome(genome).reliability, novelty, freshnessAlpha: 0.5, decisionLeverage: genome.decisionLeverage, proofValue: genome.proofValue, integrationComplexity: 0.3, endpoints, ...over };
}

// A. A forbidden source can never become USE_NOW.
it("A. a forbidden legal verdict cannot become USE_NOW", () => {
  expect(scoreAcquisition(inputs(GENOME_FORBIDDEN)).recommendation).toBe("DO_NOT_USE");
});

// B. A high-cost, low-unique source ranks below a cheap, high-leverage one.
it("B. a high-cost low-unique source ranks below a cheap high-leverage source", () => {
  const r = rankAcquisition([inputs(GENOME_ENTERPRISE), inputs(GENOME_ODDS_API)]);
  expect(r[0]!.sourceId).toBe("the-odds-api");
});

// C. A stale disagreement is classified LATE_SOURCE, not truth.
it("C. a stale source disagreement is LATE_SOURCE (trust the fresher), not blind truth", () => {
  const r = classifyConflict({
    a: { sourceId: "stale", factType: "spread", observedAt: "2026-01-04T09:00:00Z", reliability: 0.8, gseEntityId: "game:x" },
    b: { sourceId: "fresh", factType: "spread", observedAt: "2026-01-04T11:00:00Z", reliability: 0.8, gseEntityId: "game:x" },
  });
  expect(r.conflictClass).toBe("LATE_SOURCE");
  expect(r.verdict).toBe("TRUST_SOURCE_B");
});

// D. A fantasy projection lag is classified separately from injury truth.
it("D. a fantasy projection disagreeing with injury truth is FANTASY_PLATFORM_LAG, not averaged", () => {
  const r = classifyConflict({
    a: { sourceId: "platform", factType: "platform_projection", observedAt: "2026-01-04T10:00:00Z", reliability: 0.7, gseEntityId: "player:x" },
    b: { sourceId: "wire", factType: "injury_report", observedAt: "2026-01-04T10:00:00Z", reliability: 0.9, gseEntityId: "player:x" },
  });
  expect(r.conflictClass).toBe("FANTASY_PLATFORM_LAG");
  expect(r.verdict).toBe("USE_AS_CONTRADICTION_SIGNAL");
});

// E. A fact outside the decision light cone is rejected for decision credit.
it("E. a fact first-knowable after the decision earns no decision credit", () => {
  const r = knowableAt(FACTS_FIXTURE[0]!, "2026-01-04T18:00:00Z"); // first-seen 2026-01-06
  expect(r.creditable).toBe(false);
  expect(r.verdict).toBe("NOT_YET_KNOWABLE");
});

// F. Great coverage but high rights risk → RIGHTS_REVIEW, not live.
it("F. a high-rights-risk source is RIGHTS_REVIEW even with good coverage", () => {
  const risky: SourceGenome = { ...GENOME_SLEEPER, rightsRisk: 0.7 };
  expect(scoreAcquisition(inputs(risky, ENDPOINTS_SPORTSDATAIO)).recommendation).toBe("RIGHTS_REVIEW");
});

// G. Coverage Gap Radar identifies the missing fantasy/DFS/market facts.
it("G. the coverage gap radar names the missing prop history, DFS salary, ADP, roster %, start %, add/drop velocity", () => {
  const missing = new Set(detectCoverageGaps(DEFAULT_MODULE_REQUIREMENTS, ENDPOINTS_NFLVERSE).gaps.map((g) => g.factType));
  for (const f of ["odds_history", "dfs_salary", "adp", "roster_pct", "start_pct", "add_drop_velocity"] as const) {
    expect(missing.has(f)).toBe(true);
  }
});

// H. The governor ranks The Odds API dense snapshots ahead of broad trivia for Book DNA.
it("H. for a Book DNA / absorption target, dense odds snapshots outrank broad sports trivia", () => {
  const target: ExperimentTarget = { name: "Book DNA / absorption half-life", neededFacts: ["odds_history", "book_update"] };
  const r = rankAcquisition([inputs(GENOME_TRIVIA, ENDPOINTS_TRIVIA), inputs(GENOME_ODDS_API, ENDPOINTS_ODDS_API)], target);
  expect(r[0]!.sourceId).toBe("the-odds-api");
});

// I. The governor ranks SportsDataIO ahead of an odds provider for DFS salary lag.
it("I. for a DFS salary-lag target, SportsDataIO outranks the odds provider", () => {
  const target: ExperimentTarget = { name: "DFS salary lag", neededFacts: ["dfs_salary", "dfs_slate"] };
  const r = rankAcquisition([inputs(GENOME_ODDS_API, ENDPOINTS_ODDS_API), inputs(GENOME_SPORTSDATAIO, ENDPOINTS_SPORTSDATAIO)], target);
  expect(r[0]!.sourceId).toBe("sportsdataio");
});
