import { describe, it } from "vitest";
import * as assert from "node:assert/strict";
import { evaluateArxivCorpus, type ArxivContextQuery } from "../arxiv-reasoning-bridge.js";

describe("arxiv-reasoning-bridge deep alpha pillars", () => {
  it("consults the full 2,446-paper and 429-dataset corpus", () => {
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
    // 2,446 = deduplicated unique papers across the five committed corpus files.
    // Re-derive with `python scripts/verify-corpus-count.py`. This assertion
    // previously expected 2,379, which no committed corpus file reproduces.
    assert.equal(res.totalCorpusPapersIndexed, 2446);
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

  it("replaces the hallucinated Navier-Stokes barometric claim with honest altitude reasoning", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Denver Broncos",
      awayTeam: "Kansas City Chiefs",
      restDaysHome: 7,
      restDaysAway: 7,
      altitudeFt: 5280,
    };

    const res = evaluateArxivCorpus(ctx);
    const synthesis = res.situationalReasoningSynthesis;

    // The fabricated fluid-dynamics framing must not survive. Air is a
    // compressible gas; incompressible Navier-Stokes does not describe ball
    // flight, and the paper id 2610.15000 is not a real source for this claim.
    assert.ok(
      !/Navier[\s-]?Stokes/i.test(synthesis),
      "Navier-Stokes claim must be removed from the altitude reasoning",
    );
    assert.ok(
      !/field goal conversion threshold expands/i.test(synthesis),
      "fabricated field-goal expansion claim must be removed",
    );
    assert.ok(
      !/\+\s*3\.5\s*to\s*5\.0\s*yards/i.test(synthesis),
      "fabricated yardage delta must be removed",
    );

    // Honest altitude reasoning must still be present: reduced air density does
    // lower drag, and the effect on long field goals is real but small.
    assert.ok(/altitude/i.test(synthesis), "altitude should still be discussed");
    assert.ok(
      /reduced air density|lower drag|ball-flight drag/i.test(synthesis),
      "honest drag reasoning should replace the fabricated physics",
    );
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

  it("evaluates BDB 2027 WR Braking/KLD, BDB 2026 Motion Attention, RB Scheme Fit, ClarusC64 Coherence, and Surface/FSM", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Atlanta Falcons",
      awayTeam: "Cincinnati Bengals",
      restDaysHome: 7,
      restDaysAway: 7,
      wrBrakingZDeltaHome: 1.45,
      kldSeparationEdgeHome: 0.35,
      motionAttentionEdgeHome: 0.065,
      rbSchemeYpcEdgeHome: 0.92,
      clarusCoherenceRiskAway: 0.72,
      awayGrassToTurfHazard: 1.24,
    };

    const res = evaluateArxivCorpus(ctx);
    assert.equal(res.activePremisesCount, 5);
    assert.ok(res.situationalReasoningSynthesis.includes("BDB 2027 WR kinematic leverage edge"));
    assert.ok(res.situationalReasoningSynthesis.includes("Pre-snap motion transformer attention shift"));
    assert.ok(res.situationalReasoningSynthesis.includes("RB blocking-scheme alignment"));
    assert.ok(res.situationalReasoningSynthesis.includes("ClarusC64 multi-suite coherence risk"));
    assert.ok(res.situationalReasoningSynthesis.includes("grass-to-turf surface switch hazard"));
  });
});

describe("arxiv-reasoning-bridge wind premise: real ID, honest physics", () => {
  it("removes the fabricated aerodynamics title suffix from the real 2607.24573 ID", () => {
    const ctx: ArxivContextQuery = {
      sport: "NFL",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Denver Broncos",
      restDaysHome: 7,
      restDaysAway: 7,
      weatherWindMph: 20,
    };

    const res = evaluateArxivCorpus(ctx);
    const synthesis = res.situationalReasoningSynthesis;

    // arXiv:2607.24573 is real, but it is "LLM-SoccerArena: Benchmarking LLMs on
    // Real-World Predictions in Sports" — an LLM Brier-scoring protocol. The
    // "& Ball Aerodynamics in Turbulent Wind Regimes" title suffix and the
    // "non-linear aerodynamic drag" concept are fabricated additions. A
    // benchmark protocol is not a situational game condition.
    assert.ok(
      !/Ball Aerodynamics in Turbulent Wind Regimes/i.test(synthesis),
      "fabricated aerodynamics title suffix must be removed",
    );
    assert.ok(
      !/aerodynamic drag/i.test(synthesis),
      "fabricated aerodynamic-drag framing must be removed from the narrative",
    );

    // Honest wind reasoning must still fire: sustained wind degrades deep
    // passing and field goal reliability. No fabricated paper is needed.
    assert.ok(
      /wind/i.test(synthesis),
      "honest wind reasoning should still be present at 20 mph",
    );
  });
});
