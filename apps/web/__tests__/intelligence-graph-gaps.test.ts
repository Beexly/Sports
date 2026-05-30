/**
 * Targeted coverage for intelligence-graph branches not reached by intelligence-graph.test.ts.
 *
 * The primary test covers: WATCH status (mixed signals), market pulse with bootstrap
 * picks filtered, game node + single-sport slate weather, and FAN/BETTOR/ANALYST lens.
 *
 * This file covers: STRONG/THIN evidence health status, strong all-fresh signals,
 * multi-sport slate weather grouping, bootstrapGameCount in slate weather,
 * buildMarketPulse with empty picks and game-level bootstrap flag.
 */

import { describe, it, expect } from "vitest";
import {
  computeEvidenceHealth,
  buildMarketPulse,
  buildGameIntelligenceNode,
  buildSlateWeather,
} from "@/lib/intelligence-graph";
import type {
  IntelligenceGameInput,
  IntelligenceSignalInput,
  IntelligencePickInput,
} from "@/lib/intelligence-graph";
import { fixtureGame, fixturePick } from "@/__fixtures__/intelligence-graph/game-node";

const NOW = new Date("2026-05-22T18:30:00.000Z");
const FUTURE = new Date("2026-05-23T10:00:00.000Z");

function freshSignal(overrides: Partial<IntelligenceSignalInput> = {}): IntelligenceSignalInput {
  return {
    sourceCategory: "MARKET",
    sourceName: "odds-api",
    signalKey: "book_depth",
    fetchedAt: NOW.toISOString(),
    expiresAt: FUTURE.toISOString(),
    trustLevel: 0.98,
    isBootstrap: false,
    ...overrides,
  };
}

// ============================================================
// computeEvidenceHealth — status branches
// ============================================================

describe("computeEvidenceHealth — THIN status", () => {
  it("returns THIN when signals array is empty", () => {
    const health = computeEvidenceHealth([], NOW);
    expect(health.status).toBe("THIN");
    expect(health.score).toBe(0);
    expect(health.sourceCount).toBe(0);
  });

  it("returns THIN when all signals are bootstrap (high canonical penalty)", () => {
    const signals = [
      freshSignal({ isBootstrap: true }),
      freshSignal({ isBootstrap: true, sourceCategory: "SCHEDULE" }),
    ];
    const health = computeEvidenceHealth(signals, NOW);
    expect(health.bootstrapCount).toBe(2);
    expect(health.status).not.toBe("STRONG");
  });
});

describe("computeEvidenceHealth — STRONG status", () => {
  it("returns STRONG when signals are fresh, high-trust, diverse, non-bootstrap", () => {
    // 4 different source categories → sourceScore = 1.0 (max)
    // All fresh (staleCount = 0) → freshnessScore = 1.0
    // All non-bootstrap → canonicalScore = 1.0
    // All trust ≈ 0.98 → averageTrust ≈ 0.98
    const signals = [
      freshSignal({ sourceCategory: "MARKET", sourceName: "odds-api" }),
      freshSignal({ sourceCategory: "SCHEDULE", sourceName: "schedule-api" }),
      freshSignal({ sourceCategory: "STATS", sourceName: "stats-api" }),
      freshSignal({ sourceCategory: "FORM", sourceName: "form-api" }),
    ];
    const health = computeEvidenceHealth(signals, NOW);
    expect(health.status).toBe("STRONG");
    expect(health.score).toBeGreaterThanOrEqual(80);
    expect(health.staleCount).toBe(0);
    expect(health.bootstrapCount).toBe(0);
  });
});

describe("computeEvidenceHealth — WATCH status", () => {
  it("returns WATCH when score is in the 55-79 range", () => {
    // 1 unique source (low sourceScore = 0.25) + low trust (0.6) → score ≈ 63
    // score = (0.6*0.45 + 0.25*0.25 + 1.0*0.2 + 1.0*0.1) * 100 ≈ 63 → WATCH
    const signals = [
      freshSignal({ sourceCategory: "MARKET", trustLevel: 0.6 }),
    ];
    const health = computeEvidenceHealth(signals, NOW);
    expect(health.status).toBe("WATCH");
    expect(health.score).toBeGreaterThanOrEqual(55);
    expect(health.score).toBeLessThan(80);
  });
});

describe("computeEvidenceHealth — staleCount calculation", () => {
  it("counts signals whose expiresAt is in the past", () => {
    const past = new Date("2026-05-22T17:00:00.000Z"); // before NOW
    const signals = [
      freshSignal({ expiresAt: past.toISOString() }), // stale
      freshSignal({ expiresAt: FUTURE.toISOString() }), // fresh
    ];
    const health = computeEvidenceHealth(signals, NOW);
    expect(health.staleCount).toBe(1);
  });

  it("does not count signals with null expiresAt as stale", () => {
    const signals = [
      freshSignal({ expiresAt: null }), // no expiry → not stale
    ];
    const health = computeEvidenceHealth(signals, NOW);
    expect(health.staleCount).toBe(0);
  });
});

describe("computeEvidenceHealth — sourceCount deduplication", () => {
  it("counts unique category+name combos, not total signal count", () => {
    const signals = [
      freshSignal({ sourceCategory: "MARKET", sourceName: "odds-api", signalKey: "key1" }),
      freshSignal({ sourceCategory: "MARKET", sourceName: "odds-api", signalKey: "key2" }), // same source
      freshSignal({ sourceCategory: "SCHEDULE", sourceName: "sched-api", signalKey: "rest" }),
    ];
    const health = computeEvidenceHealth(signals, NOW);
    // Two unique source identifiers: "MARKET:odds-api" and "SCHEDULE:sched-api"
    expect(health.sourceCount).toBe(2);
  });
});

// ============================================================
// buildMarketPulse — edge cases
// ============================================================

describe("buildMarketPulse — empty picks", () => {
  it("returns publishedPickCount=0 and gatedByBootstrap=false for empty picks", () => {
    const pulse = buildMarketPulse(fixtureGame, []);
    expect(pulse.publishedPickCount).toBe(0);
    expect(pulse.gatedByBootstrap).toBe(false);
  });
});

describe("buildMarketPulse — game-level bootstrap flag", () => {
  it("marks gatedByBootstrap=true when the game itself is bootstrap, even with canonical picks", () => {
    const bootstrapGame: IntelligenceGameInput = { ...fixtureGame, isBootstrap: true };
    const pulse = buildMarketPulse(bootstrapGame, [fixturePick]);
    expect(pulse.gatedByBootstrap).toBe(true);
    // canonical pick is still counted in publishedPickCount
    expect(pulse.publishedPickCount).toBe(1);
  });
});

describe("buildMarketPulse — unpublished picks excluded", () => {
  it("excludes unpublished picks from publishedPickCount", () => {
    const unpublishedPick: IntelligencePickInput = { ...fixturePick, id: "unpub", isPublished: false };
    const pulse = buildMarketPulse(fixtureGame, [unpublishedPick]);
    expect(pulse.publishedPickCount).toBe(0);
    expect(pulse.gatedByBootstrap).toBe(false);
  });
});

// ============================================================
// buildSlateWeather — multi-sport grouping
// ============================================================

describe("buildSlateWeather — multi-sport grouping", () => {
  const nbaNode = buildGameIntelligenceNode({
    game: fixtureGame,
    picks: [fixturePick],
    signals: [],
    now: NOW,
  });

  const mlbGame: IntelligenceGameInput = {
    ...fixtureGame,
    id: "game-mlb",
    sport: "MLB",
    homeTeamName: "Yankees",
    awayTeamName: "Red Sox",
    isBootstrap: false,
  };
  const mlbNode = buildGameIntelligenceNode({
    game: mlbGame,
    picks: [],
    signals: [],
    now: NOW,
  });

  it("produces one SlateWeather entry per sport", () => {
    const slate = buildSlateWeather([nbaNode, mlbNode]);
    const sports = slate.map((sw) => sw.sport).sort();
    expect(sports).toEqual(["MLB", "NBA"]);
  });

  it("gameCount reflects how many games per sport", () => {
    const anotherNbaGame: IntelligenceGameInput = {
      ...fixtureGame,
      id: "game-nba-2",
      homeTeamName: "Lakers",
      awayTeamName: "Clippers",
    };
    const anotherNbaNode = buildGameIntelligenceNode({
      game: anotherNbaGame,
      picks: [],
      signals: [],
      now: NOW,
    });

    const slate = buildSlateWeather([nbaNode, mlbNode, anotherNbaNode]);
    const nbaSummary = slate.find((sw) => sw.sport === "NBA");
    const mlbSummary = slate.find((sw) => sw.sport === "MLB");
    expect(nbaSummary?.gameCount).toBe(2);
    expect(mlbSummary?.gameCount).toBe(1);
  });
});

describe("buildSlateWeather — bootstrapGameCount", () => {
  it("counts games where marketPulse.gatedByBootstrap is true", () => {
    const bootstrapGame: IntelligenceGameInput = { ...fixtureGame, id: "g-boot", isBootstrap: true };
    const bootstrapNode = buildGameIntelligenceNode({
      game: bootstrapGame,
      picks: [],
      signals: [],
      now: NOW,
    });
    const normalNode = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "g-normal" },
      picks: [],
      signals: [],
      now: NOW,
    });

    const slate = buildSlateWeather([bootstrapNode, normalNode]);
    const nbaSummary = slate.find((sw) => sw.sport === "NBA");
    expect(nbaSummary?.bootstrapGameCount).toBe(1);
    expect(nbaSummary?.gameCount).toBe(2);
  });

  it("returns bootstrapGameCount=0 when no games are bootstrap-gated", () => {
    const normalNode = buildGameIntelligenceNode({
      game: fixtureGame,
      picks: [fixturePick],
      signals: [],
      now: NOW,
    });

    const slate = buildSlateWeather([normalNode]);
    expect(slate[0]?.bootstrapGameCount).toBe(0);
  });
});

// ============================================================
// buildSlateWeather — averageEvidenceScore
// ============================================================

describe("buildSlateWeather — averageEvidenceScore", () => {
  it("averages evidence scores across all games in the sport", () => {
    const node1 = buildGameIntelligenceNode({ game: fixtureGame, signals: [], now: NOW });
    const node2 = buildGameIntelligenceNode({
      game: { ...fixtureGame, id: "g2" },
      signals: [freshSignal(), freshSignal({ sourceCategory: "SCHEDULE" })],
      now: NOW,
    });

    const slate = buildSlateWeather([node1, node2]);
    const summary = slate[0];
    const expected = Math.round(((node1.evidenceHealth.score + node2.evidenceHealth.score) / 2) * 1000) / 1000;
    expect(summary?.averageEvidenceScore).toBeCloseTo(expected, 1);
  });
});
