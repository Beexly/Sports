import { describe, it, expect } from "vitest";
import {
  // projection models
  americanToImpliedProb,
  removeVigProportional,
  blackLittermanBlend,
  dixonColesTau,
  conformalProjectionInterval,
  glicko2Update,
  // trust loop
  gradeClv,
  freezeReceipt,
  verifyReceipt,
  runTrustLoop,
  type TrustLoopInput,
  type Evidence,
  type CounterEvidence,
  type Falsifier,
} from "./index";

describe("projection models", () => {
  it("converts American odds to implied probability", () => {
    expect(americanToImpliedProb(100)).toBeCloseTo(0.5, 5);
    expect(americanToImpliedProb(-110)).toBeCloseTo(0.5238, 3);
    expect(americanToImpliedProb(200)).toBeCloseTo(0.3333, 3);
  });

  it("de-vigs a balanced two-way market to 0.5 / 0.5", () => {
    const fair = removeVigProportional([americanToImpliedProb(-110), americanToImpliedProb(-110)]);
    expect(fair[0]).toBeCloseTo(0.5, 6);
    expect(fair[1]).toBeCloseTo(0.5, 6);
  });

  it("blends model and market by precision, anchoring on the more confident side", () => {
    const equal = blackLittermanBlend(0.5, 0.7, 1, 1);
    expect(equal.probability).toBeGreaterThan(0.5);
    expect(equal.probability).toBeLessThan(0.7);
    expect(equal.weightMarket).toBeCloseTo(0.5, 6);
    expect(equal.precision).toBe(2);
    // Heavier market precision pulls the posterior back toward the market.
    const marketHeavy = blackLittermanBlend(0.5, 0.7, 3, 1);
    expect(marketHeavy.probability).toBeLessThan(equal.probability);
    expect(blackLittermanBlend(0.5, 0.7, 0, 0).probability).toBe(0.5);
  });

  it("applies the Dixon-Coles low-score correction", () => {
    expect(dixonColesTau(0, 0, 1.2, 1.0, -0.1)).toBeCloseTo(1.12, 6);
    expect(dixonColesTau(1, 1, 1.2, 1.0, -0.1)).toBeCloseTo(1.1, 6);
    expect(dixonColesTau(2, 2, 1.2, 1.0, -0.1)).toBe(1); // outside {0,1}^2
  });

  it("builds a conformal projection interval", () => {
    const iv = conformalProjectionInterval(10, [1, -2, 3, -4], 0.1);
    expect(iv.point).toBe(10);
    expect(iv.high - iv.low).toBe(8); // ± half-width 4
    expect(iv.coverage).toBeCloseTo(0.9, 6);
  });

  it("matches Glickman's canonical Glicko-2 worked example", () => {
    const out = glicko2Update(
      { rating: 1500, rd: 200, volatility: 0.06 },
      [
        { rating: 1400, rd: 30, score: 1 },
        { rating: 1550, rd: 100, score: 0 },
        { rating: 1700, rd: 300, score: 0 },
      ],
      0.5,
    );
    expect(out.rating).toBeCloseTo(1464.06, 1);
    expect(out.rd).toBeCloseTo(151.52, 0);
    expect(out.volatility).toBeCloseTo(0.05999, 4);
  });

  it("widens RD and keeps rating when no games are played", () => {
    const out = glicko2Update({ rating: 1500, rd: 200, volatility: 0.06 }, [], 0.5);
    expect(out.rating).toBe(1500);
    expect(out.rd).toBeGreaterThan(200);
  });
});

describe("trust loop", () => {
  it("grades CLV by whether you beat the close", () => {
    const beat = gradeClv(110, -110); // took +110, closed -110 (price improved)
    expect(beat.beatClose).toBe(true);
    expect(beat.clvPoints).toBeGreaterThan(0);
    const worse = gradeClv(-110, 110);
    expect(worse.beatClose).toBe(false);
  });

  it("freezes a tamper-evident receipt", () => {
    const r = freezeReceipt({ claim: "Home -3.5 has value", action: "play", confidence: 62, fragility: 22, asOf: "2026-06-22T00:00:00Z", whatWouldChange: "Status downgrade before lock" });
    expect(verifyReceipt(r)).toBe(true);
    const tampered = { ...r, action: "no_play" as const };
    expect(verifyReceipt(tampered)).toBe(false);
  });

  const evidence: Evidence[] = [
    { evidenceId: "e1", supportsClaim: "c", kind: "structured_data", strength: "strong", reliability: 90, freshness: 1, independent: true, sourceId: "s1", summary: "x" },
    { evidenceId: "e2", supportsClaim: "c", kind: "model_output", strength: "strong", reliability: 85, freshness: 1, independent: true, sourceId: "s2", summary: "y" },
  ];
  const counter: CounterEvidence[] = [
    { counterId: "x", challengesClaim: "c", severity: "moderate", kind: "reported_fact", reliability: 80, freshness: 1, sourceId: "s3", summary: "z" },
  ];
  const falsifiers: Falsifier[] = [
    { falsifierId: "f", forClaim: "c", condition: "Status downgrade before lock", likelihood: 0.3, monitored: true, monitoringSource: "injury-agent", timeToActionMins: 120, actionIfTriggered: "pass" },
  ];

  function input(overrides: Partial<TrustLoopInput> = {}): TrustLoopInput {
    return {
      marketOdds: [-110, -110], modelProb: 0.62, marketConfidence: 1, modelConfidence: 1,
      evidence, counterEvidence: counter, falsifiers, dataQuality: 80, modelAgreement: 0.85,
      primaryAction: "play", inputFreshness: 0.95, timeToActionMins: 120,
      claim: "Home -3.5 has value", asOf: "2026-06-22T00:00:00Z", ...overrides,
    };
  }

  it("runs the full loop and freezes a verifiable receipt", () => {
    const r = runTrustLoop(input());
    expect(r.marketFairProb).toBeCloseTo(0.5, 6);
    expect(r.edge).toBeGreaterThan(0); // model tilts above market
    expect(r.verdict.action).toBe("play");
    expect(verifyReceipt(r.receipt)).toBe(true);
    expect(r.receipt.confidence).toBe(r.confidence.score);
  });

  it("returns the honest no-play when the whole case is weak", () => {
    const r = runTrustLoop(input({ evidence: [], counterEvidence: [], falsifiers: [], dataQuality: 20, modelAgreement: 0.2, modelProb: 0.5 }));
    expect(r.verdict.action).toBe("no_play");
  });

  it("downgrades away from play when evidence is absent but data is decent", () => {
    const r = runTrustLoop(input({ evidence: [], counterEvidence: [], falsifiers: [] }));
    expect(r.verdict.action).not.toBe("play"); // honest: watchlist, not a confident play
  });
});
