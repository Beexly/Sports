import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { evaluateArxivCorpus, type ArxivContextQuery } from "../arxiv-reasoning-bridge.js";

describe("arxiv-reasoning-bridge deep alpha pillars", () => {
  it("consults the full 2,379-paper and 429-dataset corpus", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Denver Broncos",
      restDaysHome: 7,
      restDaysAway: 7,
      weatherWindMph: 5,
      altitudeFt: 800,
    };

    const res = evaluateArxivCorpus(ctx);
    assert.equal(res.totalCorpusPapersIndexed, 2379);
    assert.equal(res.totalKaggleDatasetsIndexed, 429);
    assert.ok(res.situationalReasoningSynthesis.includes("all situational and environmental parameters within neutral baseline"));
  });

  it("detects offensive line continuity disruption in visiting trench unit", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Philadelphia Eagles",
      awayTeam: "New York Giants",
      restDaysHome: 7,
      restDaysAway: 7,
      olContinuityScoreAway: 0.52, // 2 backups starting on Giants OL
    };

    const res = evaluateArxivCorpus(ctx);
    assert.ok(res.activePremisesCount >= 1);
    assert.ok(res.situationalReasoningSynthesis.includes("Compromised offensive line continuity score (52%)"));
    assert.ok(res.situationalReasoningSynthesis.includes("quick-pressure hazard"));
  });

  it("detects 4th down coaching decision-making drag", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Detroit Lions", // Dan Campbell aggressive
      awayTeam: "Carolina Panthers", // Conservative punter
      restDaysHome: 7,
      restDaysAway: 7,
      coachAggressivenessDelta: 2.2,
    };

    const res = evaluateArxivCorpus(ctx);
    assert.ok(res.activePremisesCount >= 1);
    assert.ok(res.situationalReasoningSynthesis.includes("Coaching game-theory differential"));
    assert.ok(res.situationalReasoningSynthesis.includes("Optimal fourth-down conversion strategy"));
  });

  it("detects turnover luck regression on inflated road teams", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Cleveland Browns",
      awayTeam: "Pittsburgh Steelers",
      restDaysHome: 7,
      restDaysAway: 7,
      turnoverDifferentialAway: 8, // Steelers +8 turnover margin from fumble recoveries
    };

    const res = evaluateArxivCorpus(ctx);
    assert.ok(res.activePremisesCount >= 1);
    assert.ok(res.situationalReasoningSynthesis.includes("unsustainable turnover luck (+8)"));
    assert.ok(res.situationalReasoningSynthesis.includes("fading inflated road favorite"));
  });

  it("evaluates SGP Archimedean copula tail dependence", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Buffalo Bills",
      awayTeam: "Miami Dolphins",
      restDaysHome: 7,
      restDaysAway: 7,
      sgpCorrelationRequested: true,
    };

    const res = evaluateArxivCorpus(ctx);
    assert.ok(res.activePremisesCount >= 1);
    assert.ok(res.situationalReasoningSynthesis.includes("Archimedean Clayton-Gumbel copula"));
  });
});
