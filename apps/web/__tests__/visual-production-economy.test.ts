import { describe, it, expect, afterEach } from "vitest";
import { WORLD_SLATE, getSlateAsset } from "@/lib/visual-production/world-slates";
import {
  evaluateGeneration,
  productionBand,
  isGenerationEnabled,
  isOwnerSpendApproved,
  MIN_REUSE_FOR_HIGGSFIELD,
} from "@/lib/visual-production/spend-policy";
import { NEGATIVE_PROMPT_FLOOR } from "@/lib/visual-production/types";

const BAN_TOKENS = ["logo", "odds", "sportsbook", "casino", "broadcast", "player likeness", "text"];

afterEach(() => {
  delete process.env["HIGGSFIELD_GENERATION_ENABLED"];
  delete process.env["OWNER_VISUAL_SPEND_APPROVED"];
});

describe("visual production — blocked by default", () => {
  it("generation is disabled by default (both master switches off)", () => {
    expect(isGenerationEnabled()).toBe(false);
    expect(isOwnerSpendApproved()).toBe(false);
  });

  it("no slate asset can generate by default — every one is blocked", () => {
    for (const a of WORLD_SLATE) {
      const d = evaluateGeneration(a);
      expect(d.allowed, `${a.id} should be blocked`).toBe(false);
      expect(d.blockers.length).toBeGreaterThan(0);
    }
  });

  it("even with master switches on, unapproved assets stay blocked", () => {
    process.env["HIGGSFIELD_GENERATION_ENABLED"] = "true";
    process.env["OWNER_VISUAL_SPEND_APPROVED"] = "true";
    for (const a of WORLD_SLATE) {
      // approvals are all false in the slate, so per-asset checklist still blocks
      expect(evaluateGeneration(a).allowed, `${a.id} still blocked`).toBe(false);
    }
  });
});

describe("visual production — worthiness bands", () => {
  it("maps scores to the right production band", () => {
    expect(productionBand(40)).toBe("code_native_only");
    expect(productionBand(60)).toBe("cheap_stillframes");
    expect(productionBand(78)).toBe("cheap_motion_test");
    expect(productionBand(88)).toBe("higgsfield_final_candidate");
    expect(productionBand(96)).toBe("premium_campaign_candidate");
  });
});

describe("visual production — slate integrity (doctrine)", () => {
  it("every asset starts unapproved and unpublished", () => {
    for (const a of WORLD_SLATE) {
      expect(["planned", "owner_review"]).toContain(a.status);
      expect(Object.values(a.approvals).every((v) => v === false), `${a.id} approvals`).toBe(true);
    }
  });

  it("every asset carries the negative-prompt ban floor", () => {
    for (const a of WORLD_SLATE) {
      expect(a.negativePrompt, `${a.id} negative prompt`).toContain(NEGATIVE_PROMPT_FLOOR);
    }
    for (const token of BAN_TOKENS) {
      expect(NEGATIVE_PROMPT_FLOOR).toContain(token);
    }
  });

  it("every asset has a truth-overlay plan and a reduced-motion fallback", () => {
    for (const a of WORLD_SLATE) {
      expect(a.overlayPlan.length, `${a.id} overlay`).toBeGreaterThan(0);
      expect(a.reducedMotionFallback.length, `${a.id} reduced-motion`).toBeGreaterThan(0);
    }
  });

  it("Higgsfield-provider assets meet the reuse gate and the 85+ worthiness threshold", () => {
    for (const a of WORLD_SLATE.filter((x) => x.provider === "higgsfield")) {
      expect(a.plannedReuseCount, `${a.id} reuse`).toBeGreaterThanOrEqual(MIN_REUSE_FOR_HIGGSFIELD);
      expect(a.priorityScore, `${a.id} worthiness`).toBeGreaterThanOrEqual(85);
    }
  });

  it("getSlateAsset resolves and rejects", () => {
    expect(getSlateAsset("home-hero-cosmos")?.title).toContain("cosmos");
    expect(getSlateAsset("nope")).toBeUndefined();
  });
});
