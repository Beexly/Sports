import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_FLOORS,
  RUBRIC_WEIGHTS,
  runSuite,
  scoreCase,
  scoreConsistency,
  scoreFalsifier,
  scoreGrounding,
  scoreSpecificity,
  type BenchmarkCase,
  type ReasonArtifact,
} from "../reasoning-benchmark";

const kase: BenchmarkCase = {
  id: "windy",
  loadedSurfaces: ["wind_mph", "pressure_rate"],
  outcome: 1,
  marketProb: 0.52,
  facts: { wind_mph: 14.3, pressure_rate: 0.31 },
};

const good: ReasonArtifact = {
  caseId: "windy",
  reasonText: "wind mph 14.3 against a pressure rate of 0.31 pushes this under.",
  prob: 0.58,
  side: "UNDER",
  citedSurfaces: ["wind_mph", "pressure_rate"],
};

describe("grounding", () => {
  it("is 1 for purely loaded citations", () => {
    expect(scoreGrounding(good, kase)).toBe(1);
  });

  it("falls by the hallucinated fraction", () => {
    const half = { ...good, citedSurfaces: ["wind_mph", "invented_surface"] };
    expect(scoreGrounding(half, kase)).toBe(0.5);
  });

  it("is 0.5 for no citations — unevidenced, not wrong", () => {
    expect(scoreGrounding({ ...good, citedSurfaces: [] }, kase)).toBe(0.5);
  });

  it("ignores blank citation strings", () => {
    expect(scoreGrounding({ ...good, citedSurfaces: ["wind_mph", "  "] }, kase)).toBe(1);
  });
});

describe("consistency", () => {
  it("is 1 for a coherent artifact", () => {
    expect(scoreConsistency(good, kase)).toBe(1);
  });

  it("penalises a calm claim on a windy case", () => {
    const calm = { ...good, reasonText: "calm conditions, play the over. wind mph 14.3." };
    expect(scoreConsistency(calm, kase)).toBeLessThan(1);
  });

  it("accepts ordinary dogs — a side at 44% is not an inconsistency", () => {
    expect(scoreConsistency({ ...good, side: "UNDER", prob: 0.47 }, kase)).toBe(1);
    expect(scoreConsistency({ ...good, side: "UNDER", prob: 0.44 }, kase)).toBe(1);
  });

  it("penalises a big disagreement with the market", () => {
    const k = { ...kase, facts: { ...kase.facts, marketFairProb: 0.52 } };
    expect(scoreConsistency({ ...good, prob: 0.38 }, k)).toBeLessThan(1);
    expect(scoreConsistency({ ...good, prob: 0.52 }, k)).toBe(1);
    // 10 points away is inside the band.
    expect(scoreConsistency({ ...good, prob: 0.62 }, k)).toBe(1);
  });

  it("penalises a long shot however the market prices it", () => {
    const k = { ...kase, facts: { ...kase.facts, marketFairProb: 0.09 } };
    expect(scoreConsistency({ ...good, prob: 0.06 }, k)).toBeLessThan(1);
  });

  it("accepts a 0.5 lean, which is the engine's normal output", () => {
    expect(scoreConsistency({ ...good, prob: 0.5 }, kase)).toBe(1);
  });

  it("does not require a side on PASS", () => {
    expect(scoreConsistency({ ...good, side: "PASS", prob: 0.5 }, kase)).toBe(1);
  });

  it("penalises a contestable figure", () => {
    const wrong = { ...good, reasonText: "wind mph 21 with pressure rate 0.31." };
    expect(scoreConsistency(wrong, kase)).toBeLessThan(1);
  });

  it("accepts printed fairs that match the record", () => {
    const k: BenchmarkCase = { ...kase, facts: { wind_mph: 14.3, marketFairProb: 0.55, fairProbability: 0.58 } };
    const a = { ...good, reasonText: "wind mph 14.3. Market fair: 55%, engine fair: 58%." };
    expect(scoreConsistency(a, k)).toBe(1);
  });

  it("penalises a printed market fair that disagrees with the record", () => {
    const k: BenchmarkCase = { ...kase, facts: { wind_mph: 14.3, marketFairProb: 0.143 } };
    const a = { ...good, reasonText: "wind mph 14.3. Market fair: 60%." };
    expect(scoreConsistency(a, k)).toBeLessThan(1);
  });

  it("penalises a printed engine fair that disagrees, and allows the rounding band", () => {
    const k: BenchmarkCase = { ...kase, facts: { wind_mph: 14.3, fairProbability: 0.58 } };
    expect(scoreConsistency({ ...good, reasonText: "wind mph 14.3, engine fair: 59%." }, k)).toBe(1);
    expect(scoreConsistency({ ...good, reasonText: "wind mph 14.3, engine fair: 70%." }, k)).toBeLessThan(1);
  });

  it("never goes below zero", () => {
    const awful: ReasonArtifact = {
      ...good,
      prob: 0.5,
      reasonText: "calm, wind mph 30, pressure rate 0.9, always the over",
      citedSurfaces: ["wind_mph", "pressure_rate"],
    };
    expect(scoreConsistency(awful, kase)).toBeGreaterThanOrEqual(0);
  });
});

describe("specificity", () => {
  it("rewards distinct loaded citations and numbers", () => {
    expect(scoreSpecificity(good, kase)).toBeGreaterThan(0.5);
  });

  it("is low for fluent but empty prose", () => {
    const empty = { ...good, reasonText: "this one looks good to me", citedSurfaces: [] };
    expect(scoreSpecificity(empty, kase)).toBeLessThan(0.2);
  });

  it("does not count hallucinated citations as distinct", () => {
    const fake = { ...good, citedSurfaces: ["a", "b", "c"] };
    expect(scoreSpecificity(fake, kase)).toBeLessThan(0.4);
  });
});

describe("falsifier", () => {
  it("gives full credit for two named failure states", () => {
    const a = { ...good, reasonText: good.reasonText + " Would be wrong if the wind drops; the line reverses." };
    expect(scoreFalsifier(a)).toBe(1);
  });

  it("gives partial credit for one", () => {
    const a = { ...good, reasonText: good.reasonText + " Would be wrong if the wind drops." };
    expect(scoreFalsifier(a)).toBe(0.7);
  });

  it("does not zero a silent artifact — some reads are clean", () => {
    expect(scoreFalsifier(good)).toBe(0.6);
  });

  it("is case-insensitive", () => {
    expect(scoreFalsifier({ ...good, reasonText: "WOULD BE WRONG IF a; b" })).toBe(1);
  });
});

describe("case scoring", () => {
  it("names every failure", () => {
    const bad = scoreCase({ ...good, citedSurfaces: ["invented"], prob: 0.05 }, kase);
    expect(bad.failures).toContain("cited unloaded surface: invented");
    expect(bad.failures.length).toBeGreaterThan(1);
  });

  it("rubric weights sum to 1", () => {
    const total = Object.values(RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("a clean artifact scores high", () => {
    // Lowered from >80: a silent artifact now loses the falsifier weight.
    expect(scoreCase(good, kase).rubric).toBeGreaterThan(70);
  });
});

describe("suite gate", () => {
  it("reports missing artifacts as blockers, not zeros", () => {
    const card = runSuite([kase], []);
    expect(card.blockers).toContain("missing artifact: windy");
    expect(card.meanRubric).toBeNaN();
  });

  it("excludes unsettled cases from Brier", () => {
    const unsettled: BenchmarkCase = { ...kase, id: "u", outcome: null };
    const art = { ...good, caseId: "u" };
    const card = runSuite([kase, unsettled], [good, art]);
    expect(card.settled).toBe(1);
    expect(card.brier).not.toBeNull();
  });

  it("clears the gate on a strong run", () => {
    const card = runSuite([kase], [good]);
    expect(card.meanGrounding).toBeGreaterThanOrEqual(LEADERBOARD_FLOORS.meanGrounding);
    expect(card.blockers).not.toContain("grounding below floor");
  });

  it("blocks a hallucinating run even with perfect calibration", () => {
    const hallucinating = { ...good, citedSurfaces: ["invented", "fake_two"] };
    const card = runSuite([kase], [hallucinating]);
    expect(card.brier).toBeLessThan(0.25);
    expect(card.blockers).toContain("grounding below floor");
    expect(card.leaderboardReady).toBe(false);
  });

  it("blocks an empty suite", () => {
    expect(runSuite([], []).leaderboardReady).toBe(false);
  });

  it("blocks when the market is beaten badly", () => {
    // Outcome is 1; 0.02 is confidently wrong. 0.99 would be near-perfect.
    const wrong = { ...good, prob: 0.02 };
    const card = runSuite([kase], [wrong]);
    expect(card.blockers).toContain("Brier worse than the market");
  });
});
