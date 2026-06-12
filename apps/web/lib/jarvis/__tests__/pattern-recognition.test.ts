import { describe, expect, it } from "vitest";
import {
  buildPatternMemory,
  detectPatterns,
  rankPatternsByUrgency,
  shouldSurfacePattern,
  summarizePatternsForOwner,
} from "../pattern-recognition";
import { makeSummary } from "./fixtures";

function snap(at: string, overrides: Parameters<typeof makeSummary>[0] = {}) {
  return makeSummary({ assessedAt: at, ...overrides });
}

describe("pattern recognition", () => {
  it("honest floor: fewer than two snapshots → no patterns claimed", () => {
    expect(detectPatterns([])).toHaveLength(0);
    expect(detectPatterns([snap("2026-06-10T06:00:00Z")])).toHaveLength(0);
  });

  it("detects a recurring blocker across snapshots", () => {
    const warn = "STRIPE_WEBHOOK_SECRET missing";
    const history = [
      snap("2026-06-10T06:00:00Z", { criticalWarnings: [warn] }),
      snap("2026-06-11T06:00:00Z", { criticalWarnings: [warn] }),
      snap("2026-06-12T06:00:00Z", { criticalWarnings: [warn] }),
    ];
    const patterns = detectPatterns(history);
    const blocker = patterns.find((p) => p.type === "RECURRING_BLOCKER");
    expect(blocker).toBeDefined();
    expect(blocker!.occurrenceCount).toBe(3);
    expect(blocker!.severity).toBe("CRITICAL");
  });

  it("detects a growing decision backlog", () => {
    const d = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        urgency: "NORMAL" as const,
        description: `decision ${i}`,
        link: null,
      }));
    const history = [
      snap("2026-06-10T06:00:00Z", { decisions: d(1) }),
      snap("2026-06-11T06:00:00Z", { decisions: d(3) }),
      snap("2026-06-12T06:00:00Z", { decisions: d(5) }),
    ];
    const backlog = detectPatterns(history).find((p) => p.type === "DECISION_BACKLOG");
    expect(backlog).toBeDefined();
    expect(backlog!.severity).toBe("HIGH");
  });

  it("ranks by severity then recurrence", () => {
    const warn = "same blocker";
    const history = [
      snap("2026-06-10T06:00:00Z", { criticalWarnings: [warn], decisions: [] }),
      snap("2026-06-11T06:00:00Z", { criticalWarnings: [warn], decisions: [{ urgency: "NORMAL", description: "x", link: null }] }),
      snap("2026-06-12T06:00:00Z", { criticalWarnings: [warn], decisions: [{ urgency: "NORMAL", description: "x", link: null }, { urgency: "NORMAL", description: "y", link: null }] }),
    ];
    const ranked = rankPatternsByUrgency(detectPatterns(history));
    expect(ranked[0]!.type).toBe("RECURRING_BLOCKER");
  });

  it("never surfaces the same pattern twice in a session", () => {
    const warn = "repeat";
    const history = [
      snap("2026-06-11T06:00:00Z", { criticalWarnings: [warn] }),
      snap("2026-06-12T06:00:00Z", { criticalWarnings: [warn] }),
    ];
    const [p] = detectPatterns(history);
    expect(p).toBeDefined();
    expect(shouldSurfacePattern(p!, [])).toBe(true);
    expect(shouldSurfacePattern(p!, [`${p!.type}:${p!.description}`])).toBe(false);
  });

  it("summaries and vault memory are produced", () => {
    expect(summarizePatternsForOwner([])).toContain("No patterns");
    const entry = buildPatternMemory([], "2026-06-12T07:00:00.000Z");
    expect(entry.type).toBe("PATTERN");
    expect(entry.body).toContain("No patterns detected");
  });
});
