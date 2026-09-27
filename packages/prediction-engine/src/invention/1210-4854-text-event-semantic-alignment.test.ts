import { describe, expect, it } from "vitest";
import {
  ALIGNMENT_F1_FLOOR,
  LOG_LOSS_DELTA_FLOOR,
  TEMPORAL_BUCKET_MS,
  TweetEvent,
  PlayEvent,
  cosineSimilarity,
  infoNceLoss,
  inTemporalBucket,
  popularityRerank,
  scoreAlignmentCandidates,
  classifyTweet,
  decideAlignments,
  aggregateDriveSentiment,
  evaluateAlignmentF1,
  meanLogLoss,
  evaluateLogLossArm,
  passesAcceptanceGate,
} from "./1210-4854-text-event-semantic-alignment";

function makeTweet(
  overrides: Partial<TweetEvent> & Pick<TweetEvent, "id" | "text" | "embedding">,
): TweetEvent {
  return {
    postedAtMs: 1_000_000,
    authorId: "author-1",
    popularity: 0.1,
    ...overrides,
  };
}

function makePlay(
  overrides: Partial<PlayEvent> & Pick<PlayEvent, "playId" | "embedding">,
): PlayEvent {
  return {
    description: "",
    gameClockMs: 1_000_000,
    driveId: "drive-1",
    ...overrides,
  };
}

describe("1210-4854 text-event semantic alignment", () => {
  it("exports acceptance-gate floors", () => {
    expect(ALIGNMENT_F1_FLOOR).toBe(0.55);
    expect(LOG_LOSS_DELTA_FLOOR).toBe(0.005);
    expect(TEMPORAL_BUCKET_MS).toBe(10 * 60 * 1000);
  });

  it("cosineSimilarity is 1 for identical unit vectors and 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it("inTemporalBucket uses TEMPORAL_BUCKET_MS as default half-window", () => {
    expect(inTemporalBucket(0, TEMPORAL_BUCKET_MS)).toBe(true);
    expect(inTemporalBucket(0, TEMPORAL_BUCKET_MS + 1)).toBe(false);
    expect(inTemporalBucket(0, TEMPORAL_BUCKET_MS, TEMPORAL_BUCKET_MS / 2)).toBe(false);
  });

  it("popularityRerank blends bi-encoder score with relative popularity", () => {
    const peers = [10, 10, 10];
    expect(popularityRerank(0.8, 10, peers, 1)).toBeCloseTo(0.8, 6);
    const boosted = popularityRerank(0.5, 100, [10, 10, 100], 0.5);
    const dampened = popularityRerank(0.5, 1, [10, 10, 1], 0.5);
    expect(boosted).toBeGreaterThan(dampened);
  });

  it("infoNceLoss is lower when the positive is closer than negatives", () => {
    const query = [1, 0];
    const strong = infoNceLoss(query, [1, 0], [
      [0, 1],
      [-1, 0],
    ]);
    const weak = infoNceLoss(query, [0, 1], [
      [1, 0],
      [-1, 0],
    ]);
    expect(strong).toBeLessThan(weak);
    expect(Number.isFinite(strong)).toBe(true);
  });

  it("scoreAlignmentCandidates ranks in-bucket plays by combined score", () => {
    const tweet = makeTweet({
      id: "t1",
      text: "blitz pickup",
      embedding: [1, 0],
      popularity: 5,
      postedAtMs: 1_000_000,
    });
    const far = makePlay({
      playId: "p-far",
      embedding: [1, 0],
      gameClockMs: 1_000_000 + TEMPORAL_BUCKET_MS + 1,
    });
    const ortho = makePlay({
      playId: "p-ortho",
      embedding: [0, 1],
      gameClockMs: 1_000_000,
    });
    const near = makePlay({
      playId: "p-near",
      embedding: [1, 0],
      gameClockMs: 1_000_000,
    });
    const scored = scoreAlignmentCandidates([tweet], [far, ortho, near]);
    expect(scored.every((c) => c.tweetId === "t1")).toBe(true);
    expect(scored.some((c) => c.playId === "p-far")).toBe(false);
    expect(scored[0]?.playId).toBe("p-near");
    expect(scored[0]?.combinedScore).toBeGreaterThan(scored[1]?.combinedScore ?? -1);
  });

it("classifyTweet uses max bi-encoder score and strategy cues", () => {
  expect(classifyTweet("great catch", 0.1)).toBe("no_event");
  expect(classifyTweet("great catch", 0.5)).toBe("event");
  expect(classifyTweet("coverage shell on the blitz", 0.1)).toBe("strategy_talk");
  expect(classifyTweet("injury questionable limited", 0.1)).toBe("strategy_talk");
  expect(classifyTweet("play-action boot", 0.9, 0.95)).toBe("strategy_talk");
});

  it("decideAlignments picks best candidate and respects event threshold", () => {
    const tweets = [
      makeTweet({ id: "t1", text: "touchdown run", embedding: [1, 0], popularity: 2 }),
      makeTweet({ id: "t2", text: "weather chat", embedding: [0, 1], popularity: 1 }),
    ];
    const plays = [
      makePlay({ playId: "p1", embedding: [1, 0], description: "rush TD" }),
      makePlay({ playId: "p2", embedding: [0.1, 0.9], description: "punt" }),
    ];
    const candidates = scoreAlignmentCandidates(tweets, plays);
    const decisions = decideAlignments(tweets, candidates, 0.35);
    expect(decisions).toHaveLength(2);
    const eventish = decisions.find((d) => d.tweetId === "t1");
    expect(eventish?.class).toBe("event");
    expect(eventish?.bestPlayId).toBe("p1");
    expect(typeof eventish?.score).toBe("number");
  });

  it("aggregateDriveSentiment groups by driveId", () => {
    const tweets = [
      makeTweet({
        id: "t1",
        text: "great explosive conversion",
        embedding: [1, 0],
        postedAtMs: 1_000_000,
      }),
      makeTweet({
        id: "t2",
        text: "terrible sack",
        embedding: [1, 0],
        postedAtMs: 1_000_100,
      }),
    ];
    const plays = [
      makePlay({ playId: "p1", embedding: [1, 0], driveId: "drive-a" }),
      makePlay({ playId: "p2", embedding: [1, 0], driveId: "drive-a" }),
    ];
    const candidates = scoreAlignmentCandidates(tweets, plays);
    const decisions = decideAlignments(tweets, candidates, 0.1);
    const features = aggregateDriveSentiment(decisions, tweets, plays);
    expect(features.length).toBeGreaterThan(0);
    expect(features[0]?.driveId).toBe("drive-a");
    expect(typeof features[0]?.meanSentiment).toBe("number");
    expect(features[0]?.tweetCount).toBeGreaterThan(0);
  });

  it("evaluateAlignmentF1 compares decisions to a gold Map", () => {
    const decisions = [
      { tweetId: "t1", class: "event" as const, bestPlayId: "p1", score: 0.9 },
      { tweetId: "t2", class: "event" as const, bestPlayId: "p2", score: 0.8 },
      { tweetId: "t3", class: "no_event" as const, bestPlayId: null, score: 0.1 },
    ];
    const gold = new Map<string, string | null>([
      ["t1", "p1"],
      ["t2", "p9"],
      ["t3", null],
    ]);
    const evalResult = evaluateAlignmentF1(decisions, gold);
    expect(evalResult.f1).toBeGreaterThan(0);
    expect(evalResult.f1).toBeLessThanOrEqual(1);
    expect(evalResult.precision).toBeGreaterThan(0);
    expect(evalResult.recall).toBeGreaterThan(0);
  });

  it("meanLogLoss and evaluateLogLossArm require enough tweets for the arm", () => {
    const labels = [1, 0, 1, 0];
    const baseline = [0.6, 0.4, 0.55, 0.45];
    const augmented = [0.8, 0.2, 0.75, 0.25];
    expect(meanLogLoss(baseline, labels)).toBeGreaterThan(meanLogLoss(augmented, labels));

    const short = evaluateLogLossArm(baseline, augmented, labels, 10);
    expect(short.tweetCount).toBe(10);
    expect(short.delta).toBeGreaterThan(0);

    const longLabels = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 1 : 0));
    const longBase = longLabels.map((y) => (y === 1 ? 0.55 : 0.45));
    const longAug = longLabels.map((y) => (y === 1 ? 0.85 : 0.15));
    const arm = evaluateLogLossArm(longBase, longAug, longLabels, 40);
    expect(arm.tweetCount).toBe(40);
    expect(arm.delta).toBeGreaterThan(0);
  });

  it("passesAcceptanceGate enforces both floors", () => {
    const alignmentOk = {
      f1: ALIGNMENT_F1_FLOOR,
      precision: 1,
      recall: 1,
      truePositives: 1,
      falsePositives: 0,
      falseNegatives: 0,
    };
    const logLossOk = {
      baselineLogLoss: 0.7,
      augmentedLogLoss: 0.7 - LOG_LOSS_DELTA_FLOOR,
      delta: LOG_LOSS_DELTA_FLOOR,
      tweetCount: 30,
    };

    expect(passesAcceptanceGate(alignmentOk, logLossOk).adopt).toBe(true);
    expect(
      passesAcceptanceGate({ ...alignmentOk, f1: ALIGNMENT_F1_FLOOR - 0.01 }, logLossOk).adopt,
    ).toBe(false);
    expect(
      passesAcceptanceGate(alignmentOk, {
        ...logLossOk,
        delta: LOG_LOSS_DELTA_FLOOR - 0.001,
        augmentedLogLoss: 0.7 - (LOG_LOSS_DELTA_FLOOR - 0.001),
      }).adopt,
    ).toBe(false);
    expect(
      passesAcceptanceGate(alignmentOk, { ...logLossOk, tweetCount: 10 }).adopt,
    ).toBe(false);
  });
});
