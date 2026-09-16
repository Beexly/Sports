/**
 * Tests for the Mission Control briefing composer — verifies the cross-product
 * cards are present, prioritized, actionable, and lead with breaking news
 * only when a real (or fixture) wire is supplied. C-416: no fictional DEMO_WIRE.
 */

import { describe, it, expect } from "vitest";
import { buildBriefing } from "./mission-control";
import type { NewsItem } from "../news/impact";

const LIVE_WIRE: NewsItem[] = [
  {
    id: "w1",
    source: "Example Beat (Outlet)",
    tier: "Insider",
    team: "ATL",
    player: "Marcus Vale",
    headline: "Vale ruled OUT for Sunday after no practice all week",
    signal: "injury-out",
    minutesAgo: 12,
  },
];

describe("mission control briefing", () => {
  const cards = buildBriefing(LIVE_WIRE);

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
    expect(cards[0]!.kind).toBe("breaking");
  });

  it("omits the breaking card entirely when the wire is empty (honest empty, C-416)", () => {
    const empty = buildBriefing([]);
    expect(empty.some((c) => c.kind === "breaking")).toBe(false);
    expect(empty.some((c) => c.kind === "discipline")).toBe(true);
  });

  it("marks illustrative (non-wire, non-discipline) cards as samples", () => {
    const illustrative = cards.filter((c) => c.kind !== "discipline" && c.kind !== "breaking");
    expect(illustrative.length).toBeGreaterThan(0);
    for (const c of illustrative) {
      expect(c.sample).toBe(true);
      expect(c.eyebrow).toContain("Sample");
    }
  });

  it("does not mark the live breaking card as a sample", () => {
    const breaking = cards.find((c) => c.kind === "breaking");
    expect(breaking).toBeDefined();
    expect(breaking!.sample).toBe(false);
    expect(breaking!.eyebrow).not.toContain("Sample");
  });

  it("does not mark the generic discipline nudge as a sample", () => {
    const discipline = cards.find((c) => c.kind === "discipline");
    expect(discipline).toBeDefined();
    expect(discipline!.sample).toBe(false);
    expect(discipline!.eyebrow).not.toContain("Sample");
  });
});
