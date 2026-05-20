import { describe, it, expect } from "vitest";
import { getSamplePicks, SAMPLE_PICK_COUNT, isDemoPicksEnabled } from "@sports/db";

describe("getSamplePicks (stub-mode demo data)", () => {
  it("returns exactly SAMPLE_PICK_COUNT picks", () => {
    const picks = getSamplePicks(new Date("2026-05-19T12:00:00Z"));
    expect(picks).toHaveLength(SAMPLE_PICK_COUNT);
    expect(SAMPLE_PICK_COUNT).toBeGreaterThanOrEqual(8);
  });

  it("every pick has result=PENDING — no fake settlements", () => {
    const picks = getSamplePicks();
    for (const p of picks) {
      expect(p.result).toBe("PENDING");
      expect(p.settledAt).toBeNull();
    }
  });

  it("every pick is published, non-bootstrap, with a sport", () => {
    const picks = getSamplePicks();
    for (const p of picks) {
      expect(p.isPublished).toBe(true);
      expect(p.isBootstrap).toBe(false);
      expect(p.game.sport.name).toBeTruthy();
    }
  });

  it("ids are deterministic for the same day", () => {
    const a = getSamplePicks(new Date("2026-05-19T01:00:00Z"));
    const b = getSamplePicks(new Date("2026-05-19T23:00:00Z"));
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("ids differ between days", () => {
    const a = getSamplePicks(new Date("2026-05-19T12:00:00Z"));
    const b = getSamplePicks(new Date("2026-05-20T12:00:00Z"));
    expect(a[0]!.id).not.toBe(b[0]!.id);
  });

  it("uses the system PickGrade and RiskLevel enums", () => {
    const validGrades = new Set(["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"]);
    const validRisk = new Set(["LOW_RISK", "MODERATE", "HIGH_VARIANCE", "INJURY_RISK", "LINE_STEAM"]);
    for (const p of getSamplePicks()) {
      expect(validGrades.has(p.pickGrade)).toBe(true);
      expect(validRisk.has(p.riskLevel)).toBe(true);
    }
  });

  it("at least one pick is featured", () => {
    const picks = getSamplePicks();
    expect(picks.some((p) => p.isFeatured)).toBe(true);
  });

  it("covers multiple sports", () => {
    const sports = new Set(getSamplePicks().map((p) => p.game.sport.key));
    expect(sports.size).toBeGreaterThanOrEqual(3);
  });

  it("reasoning never contains banned guarantee language", () => {
    const banned = ["guaranteed", "100%", "sure thing", "lock"];
    for (const p of getSamplePicks()) {
      const reasoning = p.reasoning.toLowerCase();
      for (const b of banned) {
        expect(reasoning).not.toContain(b);
      }
    }
  });
});

describe("isDemoPicksEnabled", () => {
  it("returns false unless DEMO_PICKS_ENABLED=true", () => {
    const original = process.env["DEMO_PICKS_ENABLED"];
    process.env["DEMO_PICKS_ENABLED"] = "false";
    expect(isDemoPicksEnabled()).toBe(false);
    process.env["DEMO_PICKS_ENABLED"] = "true";
    expect(isDemoPicksEnabled()).toBe(true);
    process.env["DEMO_PICKS_ENABLED"] = original;
  });
});
