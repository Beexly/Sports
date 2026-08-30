import { describe, it, expect } from "vitest";
import { personalizeBriefing, isValidPrefs, DEFAULT_PREFS } from "./preferences";
import type { BriefingCard, BriefingKind } from "../cockpit/mission-control";

const card = (kind: BriefingKind, priority: number): BriefingCard => ({
  id: kind, kind, priority, eyebrow: "e", headline: "h", detail: "d", action: "a", href: "/x", accent: "#fff",
});

describe("preferences personalization", () => {
  it("betting focus lifts betting kinds above fantasy kinds", () => {
    const cards = [card("roster", 60), card("discipline", 55)];
    const ranked = personalizeBriefing(cards, { ...DEFAULT_PREFS, focus: "betting" });
    // discipline (×1.3 = 71.5→72) should now outrank roster (×0.6 = 36)
    expect(ranked[0]!.kind).toBe("discipline");
  });

  it("fantasy focus lifts fantasy kinds above betting kinds", () => {
    const cards = [card("discipline", 60), card("roster", 55)];
    const ranked = personalizeBriefing(cards, { ...DEFAULT_PREFS, focus: "fantasy" });
    // roster (×1.3 = 71.5→72) should outrank discipline (×0.7 = 42)
    expect(ranked[0]!.kind).toBe("roster");
  });

  it("'both' focus is identity ordering (by original priority)", () => {
    const cards = [card("roster", 40), card("breaking", 90)];
    const ranked = personalizeBriefing(cards, { ...DEFAULT_PREFS, focus: "both" });
    expect(ranked[0]!.kind).toBe("breaking");
    expect(ranked[0]!.priority).toBe(90);
  });

  it("validates a prefs object", () => {
    expect(isValidPrefs({ focus: "betting", sports: ["NFL"], experience: "sharp" })).toBe(true);
    expect(isValidPrefs({ focus: "nope", sports: [], experience: "sharp" })).toBe(false);
    expect(isValidPrefs(null)).toBe(false);
    expect(isValidPrefs({ focus: "both" })).toBe(false);
  });

  it("does not mutate the input array", () => {
    const cards = [card("roster", 60), card("discipline", 55)];
    const snapshot = cards.map((c) => c.priority);
    personalizeBriefing(cards, { ...DEFAULT_PREFS, focus: "betting" });
    expect(cards.map((c) => c.priority)).toEqual(snapshot);
  });
});
