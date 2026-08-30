import { describe, expect, it } from "vitest";
import { PLATFORM_STRATEGIES, REQUIRED_MEDIA_PLATFORMS } from "@/lib/media-revenue/platform-strategy";

describe("media revenue platform strategy", () => {
  it("defines every required platform", () => {
    expect(REQUIRED_MEDIA_PLATFORMS.toSorted()).toEqual([
      "instagram_carousel",
      "instagram_reel",
      "linkedin",
      "newsletter",
      "podcast",
      "tiktok",
      "x_thread",
      "youtube_long",
      "youtube_short",
    ]);
  });

  it("gives each platform a primary goal and CTA type", () => {
    for (const platform of REQUIRED_MEDIA_PLATFORMS) {
      expect(PLATFORM_STRATEGIES[platform].primaryGoal).toBeTruthy();
      expect(PLATFORM_STRATEGIES[platform].ctaType).toBeTruthy();
      expect(PLATFORM_STRATEGIES[platform].bestPillars.length).toBeGreaterThan(0);
    }
  });

  it("pins key platform roles", () => {
    expect(PLATFORM_STRATEGIES.youtube_long.primaryGoal).toBe("authority");
    expect(PLATFORM_STRATEGIES.youtube_long.secondaryGoals).toContain("sponsorship");
    expect(PLATFORM_STRATEGIES.tiktok.primaryGoal).toBe("reach");
    expect(["conversion", "retention"]).toContain(PLATFORM_STRATEGIES.newsletter.primaryGoal);
    expect(PLATFORM_STRATEGIES.newsletter.secondaryGoals).toContain("retention");
  });
});
