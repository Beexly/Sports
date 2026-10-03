/**
 * Tests for the Mission Control briefing composer — verifies the cross-product
 * cards are present, prioritized, actionable, and lead with breaking news.
 */

import { describe, it, expect } from "vitest";
import { buildBriefing } from "./mission-control";

describe("mission control briefing", () => {
  const cards = buildBriefing();

  it("composes a multi-source prioritized briefing", () => {
    expect(cards.length).toBeGreaterThanOrEqual(4);
    const kinds = new Set(cards.map((c) => c.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(4); // cross-product, not one source
  });

  it("is sorted by priority, highest first", () => {
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i - 1]!.priority).toBeGreaterThanOrEqual(cards[i]!.priority);
    }
  });

  it("every card is actionable with a deep link and copy", () => {
    for (const c of cards) {
      expect(c.href.startsWith("/")).toBe(true);
      expect(c.action.length).toBeGreaterThan(3);
      expect(c.headline.length).toBeGreaterThan(5);
      expect(c.priority).toBeGreaterThanOrEqual(0);
      expect(c.priority).toBeLessThanOrEqual(100);
    }
  });

  it("always includes the CLV discipline nudge", () => {
    expect(cards.some((c) => c.kind === "discipline" && c.href === "/track")).toBe(true);
  });

  it("leads with breaking news when the wire is hot", () => {
    // the demo wire has a fresh insider 'ruled out' — it should top the briefing
    expect(cards[0]!.kind).toBe("breaking");
  });

  it("marks illustrative cards as samples with a per-card provenance tag", () => {
    // Every card whose numbers come from a fictional engine must carry
    // sample:true and a visible 'Sample' marker so it is never mistaken for a
    // live, sourced alert (non-negotiables #1/#4).
    const illustrative = cards.filter((c) => c.kind !== "discipline");
    expect(illustrative.length).toBeGreaterThan(0);
    for (const c of illustrative) {
      expect(c.sample).toBe(true);
      expect(c.eyebrow).toContain("Sample");
    }
  });

  it("does not mark the generic discipline nudge as a sample", () => {
    const discipline = cards.find((c) => c.kind === "discipline");
    expect(discipline).toBeDefined();
    expect(discipline!.sample).toBe(false);
    expect(discipline!.eyebrow).not.toContain("Sample");
  });

  it("does not assert a fabricated 'confirmed by N sources' corroboration on the breaking card", () => {
    // DEMO_WIRE is fictional; the eyebrow must not present a real-world
    // corroboration count as a live, sourced alert.
    const breaking = cards.find((c) => c.kind === "breaking");
    expect(breaking).toBeDefined();
    expect(breaking!.eyebrow).not.toMatch(/confirmed by \d+ sources/i);
  });
});
