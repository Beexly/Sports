import { describe, expect, it } from "vitest";
import { CARD_MAX_AGE_DAYS, cardAgeDays, cardFreshness } from "@/lib/week8/card-freshness";

const NOW = new Date("2026-11-11T15:00:00Z");

describe("sealed card freshness", () => {
  it("treats a card sealed inside the window as live", () => {
    expect(cardFreshness("2026-11-09", NOW).stale).toBe(false);
    expect(cardFreshness("2026-11-09", NOW).ageDays).toBe(2);
  });

  it("refuses the stale card the live site was serving", () => {
    // The production card was sealed 2026-10-30 and was still being rendered as
    // today's board on 2026-11-11, offering tickets on games already played.
    const fresh = cardFreshness("2026-10-30", NOW);
    expect(fresh.stale).toBe(true);
    expect(fresh.ageDays).toBe(12);
  });

  it("flips exactly one day past the shelf life", () => {
    expect(cardFreshness("2026-11-04", NOW).stale).toBe(false);
    expect(cardFreshness("2026-11-03", NOW).stale).toBe(true);
    expect(CARD_MAX_AGE_DAYS).toBe(7);
  });

  it("treats an undated or unparseable card as stale", () => {
    expect(cardFreshness(null, NOW).stale).toBe(true);
    expect(cardFreshness(undefined, NOW).stale).toBe(true);
    expect(cardFreshness("not-a-date", NOW).stale).toBe(true);
  });

  it("never reports a negative age for a future seal date", () => {
    expect(cardAgeDays("2026-12-01", NOW)).toBe(0);
    expect(cardFreshness("2026-12-01", NOW).stale).toBe(false);
  });

  it("honours a caller-supplied window", () => {
    expect(cardFreshness("2026-11-01", NOW, 30).stale).toBe(false);
    expect(cardFreshness("2026-11-01", NOW, 3).stale).toBe(true);
  });
});
