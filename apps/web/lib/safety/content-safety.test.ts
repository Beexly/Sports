import { describe, it, expect } from "vitest";
import { scanText, isPublishable, imageVerdict, HUMAN_REVIEW_CLASSIFIER } from "./content-safety";

describe("content safety guardrail", () => {
  it("passes clean sports copy", () => {
    const r = scanText("Nova here from the sideline — the lead back is trending up and the matchup is soft. Start him.");
    expect(r.verdict).toBe("safe");
    expect(isPublishable(r)).toBe(true);
  });

  it("blocks sexual/explicit content", () => {
    const r = scanText("check out these nudes and explicit content");
    expect(r.verdict).toBe("block");
    expect(r.categories).toContain("sexual");
    expect(isPublishable(r)).toBe(false);
  });

  it("routes profanity to human review, not auto-publish", () => {
    const r = scanText("this defense is absolute shit");
    expect(r.verdict).toBe("review");
    expect(r.categories).toContain("profanity");
  });

  it("flags betting overclaims at runtime (mirrors the trust registry)", () => {
    const r = scanText("this pick is a guaranteed winner, basically free money");
    expect(r.verdict).toBe("review");
    expect(r.categories).toContain("overclaim");
  });

  it("detects PII and routes to review", () => {
    expect(scanText("email me at scout@example.com").categories).toContain("pii");
    expect(scanText("my number is 555-123-4567").categories).toContain("pii");
  });

  it("a clean message has no hits", () => {
    expect(scanText("Week 7 byes hit your RB room — plan ahead.").hits).toHaveLength(0);
  });

  it("image verdict thresholds: high score blocks, mid reviews, low is safe", () => {
    expect(imageVerdict(0.9)).toBe("block");
    expect(imageVerdict(0.4)).toBe("review");
    expect(imageVerdict(0.05)).toBe("safe");
  });

  it("unconfigured image classifier fails CLOSED to human review", async () => {
    const r = await HUMAN_REVIEW_CLASSIFIER.classify("any.jpg");
    expect(r.verdict).toBe("review");
    expect(imageVerdict(r.nsfwScore)).toBe("review");
  });
});
