import { describe, expect, it } from "vitest";
import { buildModelParliamentFeed, type ModelParliamentPrediction } from "./model-parliament";

const sample = (
  id: string,
  modelId: string,
  modelName: string,
  predictedFantasyPoints: number,
  actualFantasyPoints: number,
  overrides: Partial<ModelParliamentPrediction> = {},
): ModelParliamentPrediction => ({
  id,
  modelId,
  modelName,
  family: modelId === "anchor" ? "market-anchor" : "tweedie",
  position: "WR",
  predictedFantasyPoints,
  actualFantasyPoints,
  modelStdDev: 4,
  marketFantasyPoints: actualFantasyPoints + 6,
  marketStdDev: 4,
  preGameCommittedAt: "2026-09-13T16:00:00.000Z",
  settledAt: "2026-09-14T04:00:00.000Z",
  ...overrides,
});

describe("model parliament CRPS feed", () => {
  it("ranks internal models by lower CRPS and keeps rows shadow/priced=false", () => {
    const feed = buildModelParliamentFeed(
      [
        sample("a1", "anchor", "Market Anchor", 15, 16),
        sample("a2", "anchor", "Market Anchor", 11, 10),
        sample("t1", "tweedie", "Tweedie Baseline", 21, 15),
        sample("t2", "tweedie", "Tweedie Baseline", 5, 11),
      ],
      { generatedAt: "2026-06-24T04:20:00.000Z", minPublicSampleSize: 2 },
    );
    const first = feed.leaderboard[0];
    const second = feed.leaderboard[1];
    if (!first || !second) throw new Error("expected two leaderboard rows");

    expect(first.modelId).toBe("anchor");
    expect(first.rank).toBe(1);
    expect(first.crps).toBeLessThan(second.crps);
    expect(first.crpsEdgeVsMarket).toBeGreaterThan(0);
    expect(first.eligibleForPublicDraft).toBe(true);
    expect(first.priced).toBe(false);
    expect(first.status).toBe("shadow");
  });

  it("prepares public rows but leaves the feed flagged off", () => {
    const feed = buildModelParliamentFeed(
      [sample("a1", "anchor", "Market Anchor", 15, 16)],
      { generatedAt: "2026-06-24T04:20:00.000Z" },
    );
    const publicRow = feed.publicFeed.rows[0];
    if (!publicRow) throw new Error("expected public feed row");

    expect(feed.publicFeed.flagKey).toBe("MODEL_PARLIAMENT_PUBLIC_FEED");
    expect(feed.publicFeed.status).toBe("FLAGGED_OFF");
    expect(feed.publicFeed.enabled).toBe(false);
    expect(publicRow.modelName).toBe("Market Anchor");
    expect(publicRow.crps).toBe(feed.leaderboard[0]?.crps);
    expect(feed.draftOnly).toBe(true);
  });

  it("excludes rows that were not committed before settlement", () => {
    const feed = buildModelParliamentFeed([
      sample("good", "anchor", "Market Anchor", 15, 16),
      sample("late", "anchor", "Market Anchor", 15, 16, {
        preGameCommittedAt: "2026-09-14T05:00:00.000Z",
      }),
      sample("missing", "tweedie", "Tweedie Baseline", 15, 16, {
        preGameCommittedAt: null,
      }),
    ]);

    expect(feed.excludedSampleIds).toEqual(["late", "missing"]);
    expect(feed.leaderboard).toHaveLength(1);
    expect(feed.leaderboard[0]?.sampleSize).toBe(1);
  });
});
