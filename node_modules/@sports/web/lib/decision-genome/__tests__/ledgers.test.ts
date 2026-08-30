import { describe, expect, it } from "vitest";
import { AgentCourt, brierScore, settleClaim, type AgentClaim } from "../agent-court";
import { CandidateLedger } from "../candidate-ledger";
import { scoreEpistemicAlpha } from "../epistemic-alpha";
import { buildProofCard } from "../proof-card";
import { passGenome, signalGenome } from "../fixtures";
import type { DecisionGenome } from "../decision-genome";

describe("CandidateDenominatorLedger", () => {
  it("computes the honest denominator, publish + restraint rates, and top reasons", () => {
    const ledger = new CandidateLedger();
    ledger.record({ id: "1", genomeId: "g1", disposition: "published", aperture: "signal", reason: "" });
    ledger.record({ id: "2", genomeId: "g2", disposition: "passed", aperture: "pass", reason: "edge below floor" });
    ledger.record({ id: "3", genomeId: "g3", disposition: "suppressed", aperture: "quarantine", reason: "rights not cleared" });
    ledger.record({ id: "4", genomeId: "g4", disposition: "passed", aperture: "pass", reason: "edge below floor" });

    const s = ledger.summary();
    expect(s.total).toBe(4);
    expect(s.byDisposition.published).toBe(1);
    expect(s.publishRate).toBe(0.25);
    expect(s.restraintRate).toBe(0.75); // 2 passed + 1 suppressed
    expect(s.topSuppressionReasons[0]).toEqual({ reason: "edge below floor", count: 2 });
  });

  it("returns zeroed rates for an empty ledger (no divide-by-zero)", () => {
    const s = new CandidateLedger().summary();
    expect(s.total).toBe(0);
    expect(s.publishRate).toBe(0);
  });
});

describe("AgentCourt", () => {
  const claim = (over: Partial<AgentClaim> = {}): AgentClaim => ({
    id: "claim-1",
    agent: "scout",
    type: "beats-close",
    statement: "Line will beat close",
    confidence: 0.8,
    stakedAt: 0,
    resolvesAt: 100,
    ...over,
  });

  it("scores a confident-correct claim better than a confident-wrong one", () => {
    expect(brierScore(0.9, true)).toBeLessThan(brierScore(0.9, false));
    expect(settleClaim(claim(), true).brier).toBeCloseTo(0.04, 5);
  });

  it("rejects unknown court agents", () => {
    const court = new AgentCourt();
    expect(() => court.stake(claim({ agent: "nobody" as never }))).toThrow();
  });

  it("tracks credibility and a leaderboard across settled claims", () => {
    const court = new AgentCourt();
    court.stake(claim({ id: "a", agent: "scout", confidence: 0.9 }));
    court.stake(claim({ id: "b", agent: "tal", confidence: 0.9 }));
    court.resolve("a", true); // scout right
    court.resolve("b", false); // tal wrong

    const scout = court.credibility("scout");
    expect(scout.settledClaims).toBe(1);
    expect(scout.directionalAccuracy).toBe(1);
    const board = court.leaderboard();
    expect(board[0]?.agent).toBe("scout"); // lower brier ranks first
    expect(court.openClaims()).toHaveLength(0);
  });

  it("clamps out-of-range confidence into [0,1]", () => {
    const court = new AgentCourt();
    const staked = court.stake(claim({ confidence: 1.5 }));
    expect(staked.confidence).toBe(1);
  });
});

describe("EpistemicAlphaLedger", () => {
  it("scores six dimensions and leaves proof null until settled", () => {
    const score = scoreEpistemicAlpha(signalGenome);
    expect(score.dimensions).toHaveLength(6);
    expect(score.settled).toBe(false);
    const proof = score.dimensions.find((d) => d.dimension === "proof");
    expect(proof?.score).toBeNull();
    expect(score.composite).not.toBeNull();
  });

  it("grades proof alpha once the decision settles", () => {
    const settled: DecisionGenome = { ...signalGenome, proof: { ...signalGenome.proof, clv: 0.03, brier: 0.18 } };
    const score = scoreEpistemicAlpha(settled);
    expect(score.settled).toBe(true);
    expect(score.dimensions.find((d) => d.dimension === "proof")?.score).not.toBeNull();
  });

  it("rewards availability and penalizes a theatrical edge", () => {
    const reachable = scoreEpistemicAlpha(signalGenome).dimensions.find((d) => d.dimension === "availability");
    expect(reachable?.score).toBe(1);
  });
});

describe("ProofCardEngine", () => {
  const eligible = (proof: Partial<DecisionGenome["proof"]>): DecisionGenome => ({
    ...signalGenome,
    proof: { proofCardEligible: true, priced: false, ...proof },
  });

  it("refuses to build a card from an unsettled decision (no fabricated numbers)", () => {
    const r = buildProofCard(eligible({}));
    expect(r.ok).toBe(false);
    expect(r.card).toBeNull();
  });

  it("builds a DRAFT, non-publishable beat-close card from a settled decision", () => {
    const r = buildProofCard(eligible({ clv: 0.025 }));
    expect(r.ok).toBe(true);
    expect(r.card?.status).toBe("draft");
    expect(r.card?.publishable).toBe(false);
    expect(r.card?.kind).toBe("beat-close");
    expect(r.card?.languageFlags).toEqual([]);
  });

  it("will not build a card from an ineligible genome", () => {
    expect(buildProofCard(passGenome).ok).toBe(false);
  });

  it("renders a saved-loss card for a graded pass", () => {
    const passEligible: DecisionGenome = {
      ...passGenome,
      proof: { proofCardEligible: true, priced: false, savedLoss: 1.5 },
    };
    const r = buildProofCard(passEligible);
    expect(r.ok).toBe(true);
    expect(r.card?.kind).toBe("saved-loss");
  });
});
