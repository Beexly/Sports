import { describe, expect, it } from "vitest";
import {
  planGatedSlateOutbox,
  planPickPublicationOutbox,
  planSettlementOutbox,
  type BotPickPublicationInput,
  type BotSettlementInput,
} from "@/lib/bot-outbox/plan";

const publicUrl = "https://galaxysportsedge.com";

const freePick: BotPickPublicationInput = {
  pickId: "pick-1",
  gameId: "game-1",
  matchup: "BOS @ NYK",
  pickKind: "SPREAD",
  line: "BOS -3.5",
  side: "BOS",
  pickGrade: "SOLID_PLAY",
  confidence: 73,
  edgeIndex: 68.4,
  sport: "NBA",
  modelVersion: "v5.0.0",
  gameStartsAt: new Date("2026-05-22T23:00:00.000Z"),
  tier: "FREE",
  isPublished: true,
  isBootstrap: false,
};

const settledLoss: BotSettlementInput = {
  pickId: "pick-2",
  gameId: "game-2",
  matchup: "MIN @ DET",
  pickLine: "MIN +6",
  outcome: "L",
  finalScore: "DET 24, MIN 17",
  confidenceAtPublish: 71,
  heaviestContributorFactor: null,
  biggestMissFactor: "restAdvantage",
  oneLineCause: "MIN was more fatigued than projected",
  sport: "NFL",
  modelVersion: "v5.0.0",
  settledAt: new Date("2026-05-23T03:30:00.000Z"),
  tier: "FREE",
  isPublished: true,
  isBootstrap: false,
  topFactorsAtPublish: [{ factor: "restAdvantage", score: 0.74 }],
  whatChanged: "Detroit's injury report cleared before kickoff.",
  whatThisUpdates: "The rest factor needs an availability cross-check.",
};

describe("bot outbox planner", () => {
  it("plans free canonical pick publication drafts for Twitter and Discord", () => {
    const items = planPickPublicationOutbox(freePick, publicUrl);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.idempotencyKey)).toEqual([
      "twitter:pick-publication:pick-1:v5.0.0",
      "discord:pick-publication:pick-1:v5.0.0",
    ]);
    expect(items.every((item) => item.shouldPost)).toBe(true);
    expect(items[0]?.bodyText).toContain("Published BOS @ NYK BOS -3.5 at 73% confidence");
    expect(items[1]?.embed?.title).toBe("Published BOS -3.5 (SOLID_PLAY)");
    expect(JSON.stringify(items)).not.toMatch(/Ã¢|Ã‚|â/);
  });

  it("blocks premium pick publication while keeping audit-shaped drafts", () => {
    const items = planPickPublicationOutbox(
      {
        ...freePick,
        pickId: "pick-premium",
        tier: "PREMIUM",
      },
      publicUrl,
    );

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.shouldPost === false)).toBe(true);
    expect(items.every((item) => item.blockedReason === "premium-pick")).toBe(true);
    expect(items.every((item) => item.bodyText === null && item.embed === null)).toBe(true);
  });

  it("plans settled loss drafts with a post-mortem thread", () => {
    const items = planSettlementOutbox(settledLoss, publicUrl);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.eventKind)).toEqual([
      "SETTLEMENT",
      "SETTLEMENT",
      "POST_MORTEM_THREAD",
    ]);
    expect(items[0]?.bodyText).toContain("MIN +6 \u274C LOSS");
    expect(items[1]?.embed?.title).toBe("Settled MIN +6 \u274C LOSS");
    expect(items[2]?.threadText?.[0]).toBe(
      "Settled MIN +6 \u274C LOSS. Here's what the model saw and what it missed.",
    );
    expect(JSON.stringify(items)).not.toMatch(/Ã¢|Ã‚|â/);
  });

  it("blocks pending settlement drafts", () => {
    const items = planSettlementOutbox(
      {
        ...settledLoss,
        outcome: "PENDING",
        settledAt: null,
      },
      publicUrl,
    );

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.blockedReason === "pending-settlement")).toBe(true);
  });

  it("plans gated slate drafts and blocks bootstrap slate state", () => {
    const items = planGatedSlateOutbox(
      {
        gateDecisionId: "gate-1",
        gameId: "game-3",
        matchup: "MIA @ NYY",
        edgeIndex: 0.4,
        gateReason: "LOW_EDGE",
        gateReasonText: "spread balanced at 51% consensus across 8 books.",
        sport: "MLB",
        modelVersion: "v5.0.0",
        gateDecisionAt: new Date("2026-05-22T18:00:00.000Z"),
        isBootstrap: false,
      },
      publicUrl,
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.bodyText).toContain("Just gated MIA @ NYY");
    expect(items[1]?.embed?.title).toBe("Just gated MIA @ NYY");

    const blocked = planGatedSlateOutbox(
      {
        gateDecisionId: "gate-2",
        gameId: "game-4",
        matchup: "SEA @ HOU",
        edgeIndex: null,
        gateReason: "BOOTSTRAP",
        gateReasonText: "Historical data is still warming.",
        sport: "MLB",
        modelVersion: "v5.0.0",
        gateDecisionAt: new Date("2026-05-22T18:00:00.000Z"),
        isBootstrap: true,
      },
      publicUrl,
    );

    expect(blocked.every((item) => item.blockedReason === "bootstrap-data")).toBe(true);
  });
});
