import { describe, it, expect } from "vitest";
import { composeDailyBrief, composeBrief, BRIEF_RESPONSIBLE_GAMING_NOTE } from "@/lib/brief/compose";

describe("composeDailyBrief (stub)", () => {
  it("returns a status of DRAFT until the composer is restored", () => {
    const out = composeDailyBrief({ date: new Date("2026-05-19") });
    expect(out.status).toBe("DRAFT");
    expect(out.responsibleGamingText).toContain("responsibly");
  });

  it("formats the date as YYYY-MM-DD", () => {
    const out = composeDailyBrief({ date: new Date("2026-05-19T12:00:00Z") });
    expect(out.date).toBe("2026-05-19");
  });

  it("always returns empty sections array in stub mode", () => {
    const out = composeDailyBrief({ date: new Date("2026-01-01") });
    expect(Array.isArray(out.sections)).toBe(true);
    expect(out.sections).toHaveLength(0);
  });

  it("promotions count is 0 in stub mode", () => {
    const out = composeDailyBrief({ date: new Date("2026-01-01") });
    expect(out.promotions.count).toBe(0);
    expect(out.promotions.items).toHaveLength(0);
  });
});

describe("composeBrief (direct)", () => {
  it("returns the same shape as composeDailyBrief", () => {
    const out = composeBrief({ date: new Date("2026-06-01") });
    expect(out.status).toBe("DRAFT");
    expect(out.date).toBe("2026-06-01");
    expect(out.whatChanged.items).toHaveLength(0);
    expect(out.contentIdeas.items).toHaveLength(0);
    expect(out.manualReview.items).toHaveLength(0);
  });

  it("ignores extra optional fields gracefully", () => {
    const out = composeBrief({
      date: new Date("2026-06-01"),
      picks: [{ id: "p1" }],
      promotions: [{ id: "promo1" }],
      gameSportMap: { "game-1": "NFL" },
    });
    expect(out.status).toBe("DRAFT");
    expect(out.promotions.count).toBe(0);
  });
});

describe("BRIEF_RESPONSIBLE_GAMING_NOTE", () => {
  it("is a non-empty string", () => {
    expect(typeof BRIEF_RESPONSIBLE_GAMING_NOTE).toBe("string");
    expect(BRIEF_RESPONSIBLE_GAMING_NOTE.length).toBeGreaterThan(0);
  });

  it("contains a responsible-gambling reminder", () => {
    expect(BRIEF_RESPONSIBLE_GAMING_NOTE.toLowerCase()).toContain("responsibly");
  });
});
