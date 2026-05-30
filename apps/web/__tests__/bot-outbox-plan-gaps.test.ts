/**
 * Targeted coverage for blockedReason branches not reached by bot-outbox-plan.test.ts.
 *
 * The primary test covers: premium-pick, compliance-blocked, pending-settlement,
 * the loss post-mortem path, and gated-slate/bootstrap for SLATE_STATE_GATED events.
 *
 * This file covers the remaining blocked branches and the WIN/PUSH settlement
 * path where no post-mortem thread is appended.
 */

import { describe, it, expect } from "vitest";
import {
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

const settledWin: BotSettlementInput = {
  pickId: "pick-win",
  gameId: "game-win",
  matchup: "LAL @ GSW",
  pickLine: "LAL +4.5",
  outcome: "W",
  finalScore: "LAL 112, GSW 108",
  confidenceAtPublish: 74,
  heaviestContributorFactor: "restAdvantage",
  biggestMissFactor: null,
  oneLineCause: null,
  sport: "NBA",
  modelVersion: "v5.0.0",
  settledAt: new Date("2026-05-22T22:30:00.000Z"),
  tier: "FREE",
  isPublished: true,
  isBootstrap: false,
  topFactorsAtPublish: [{ factor: "restAdvantage", score: 0.74 }],
  whatChanged: "",
  whatThisUpdates: "",
};

// ============================================================
// planPickPublicationOutbox — bootstrap-data blocker
// ============================================================

describe("planPickPublicationOutbox — bootstrap-data blocker", () => {
  it("blocks both channels when pick is a bootstrap entry", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, isBootstrap: true },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.shouldPost === false)).toBe(true);
    expect(items.every((item) => item.blockedReason === "bootstrap-data")).toBe(true);
  });

  it("bootstrap-data blocked items have null body and embed", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, isBootstrap: true },
      publicUrl,
    );
    expect(items.every((item) => item.bodyText === null)).toBe(true);
    expect(items.every((item) => item.embed === null)).toBe(true);
  });

  it("idempotency keys use pick-publication event kind", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, pickId: "pick-boot", modelVersion: "v5.1.0", isBootstrap: true },
      publicUrl,
    );
    expect(items.map((i) => i.idempotencyKey)).toEqual([
      "twitter:pick-publication:pick-boot:v5.1.0",
      "discord:pick-publication:pick-boot:v5.1.0",
    ]);
  });
});

// ============================================================
// planPickPublicationOutbox — unpublished-pick blocker
// ============================================================

describe("planPickPublicationOutbox — unpublished-pick blocker", () => {
  it("blocks both channels when pick is not published", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, isPublished: false },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.blockedReason === "unpublished-pick")).toBe(true);
    expect(items.every((item) => item.shouldPost === false)).toBe(true);
  });

  it("premium pick takes priority over unpublished (checked first)", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, tier: "PREMIUM", isPublished: false },
      publicUrl,
    );
    // tier check comes before isPublished check → premium-pick, not unpublished-pick
    expect(items.every((item) => item.blockedReason === "premium-pick")).toBe(true);
  });

  it("bootstrap-data takes priority over unpublished (checked second)", () => {
    const items = planPickPublicationOutbox(
      { ...freePick, isBootstrap: true, isPublished: false },
      publicUrl,
    );
    expect(items.every((item) => item.blockedReason === "bootstrap-data")).toBe(true);
  });
});

// ============================================================
// planSettlementOutbox — bootstrap-data blocker
// ============================================================

describe("planSettlementOutbox — bootstrap-data blocker", () => {
  it("blocks both channels when settlement is a bootstrap entry", () => {
    const items = planSettlementOutbox(
      { ...settledWin, isBootstrap: true },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.blockedReason === "bootstrap-data")).toBe(true);
    expect(items.every((item) => item.shouldPost === false)).toBe(true);
  });
});

// ============================================================
// planSettlementOutbox — unpublished-pick blocker
// ============================================================

describe("planSettlementOutbox — unpublished-pick blocker", () => {
  it("blocks both channels when settlement pick is not published", () => {
    const items = planSettlementOutbox(
      { ...settledWin, isPublished: false },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.blockedReason === "unpublished-pick")).toBe(true);
  });
});

// ============================================================
// planSettlementOutbox — WIN outcome (no post-mortem thread)
// ============================================================

describe("planSettlementOutbox — WIN outcome", () => {
  it("produces exactly 2 items (Twitter + Discord SETTLEMENT, no post-mortem)", () => {
    const items = planSettlementOutbox(settledWin, publicUrl);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.eventKind)).toEqual(["SETTLEMENT", "SETTLEMENT"]);
  });

  it("WIN settlement body text contains ✅ WIN", () => {
    const items = planSettlementOutbox(settledWin, publicUrl);
    expect(items[0]?.bodyText).toContain("✅ WIN");
  });

  it("WIN settlement discord embed title contains WIN", () => {
    const items = planSettlementOutbox(settledWin, publicUrl);
    expect(items[1]?.embed?.title).toContain("WIN");
  });

  it("WIN settlement items are shouldPost: true", () => {
    const items = planSettlementOutbox(settledWin, publicUrl);
    expect(items.every((i) => i.shouldPost)).toBe(true);
  });

  it("idempotency keys use settlement event kind", () => {
    const items = planSettlementOutbox(
      { ...settledWin, pickId: "pk-w", modelVersion: "v5.2.0" },
      publicUrl,
    );
    expect(items.map((i) => i.idempotencyKey)).toEqual([
      "twitter:settlement:pk-w:v5.2.0",
      "discord:settlement:pk-w:v5.2.0",
    ]);
  });
});

// ============================================================
// planSettlementOutbox — PUSH outcome (no post-mortem thread)
// ============================================================

describe("planSettlementOutbox — PUSH outcome", () => {
  it("produces exactly 2 items (Twitter + Discord SETTLEMENT, no post-mortem)", () => {
    const items = planSettlementOutbox(
      { ...settledWin, outcome: "PUSH" },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.eventKind)).toEqual(["SETTLEMENT", "SETTLEMENT"]);
  });

  it("PUSH settlement body text contains PUSH", () => {
    const items = planSettlementOutbox(
      { ...settledWin, outcome: "PUSH" },
      publicUrl,
    );
    expect(items[0]?.bodyText).toContain("PUSH");
  });
});

// ============================================================
// planSettlementOutbox — premium-pick blocker for settlement
// ============================================================

describe("planSettlementOutbox — premium-pick blocker", () => {
  it("blocks settlement of premium picks", () => {
    const items = planSettlementOutbox(
      { ...settledWin, tier: "PREMIUM" },
      publicUrl,
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.blockedReason === "premium-pick")).toBe(true);
  });
});
