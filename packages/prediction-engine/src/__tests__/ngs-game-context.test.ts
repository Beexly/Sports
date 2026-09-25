import { describe, expect, it, vi } from "vitest";
import { computeGameContext } from "../game-context.js";
import type { GameContextInput } from "@sports/types";

const NOW = "2026-09-24T12:00:00.000Z";
const CAPTURED = "2026-09-24T00:00:00.000Z";
const signal = (value: number) => ({
  value,
  weight: 2.5,
  confidence: 0.7,
  capturedAt: CAPTURED,
  season: 2026,
});

describe("computeGameContext NGS", () => {
  it("adds a bounded, side-aware NGS contribution with visible factor evidence", () => {
    const input: GameContextInput = {
      ngsHome: signal(0.8),
      ngsAway: signal(-0.2),
      ngsReferenceAt: NOW,
    };
    const home = computeGameContext(input, "SPREAD", "HOME");
    const away = computeGameContext(input, "SPREAD", "AWAY");
    expect(home.ngsScore).toBeGreaterThan(0);
    expect(away.ngsScore).toBeCloseTo(-home.ngsScore, 8);
    expect(Math.abs(home.ngsScore)).toBeLessThanOrEqual(5);
    expect(home.factors.find((f) => f.name === "NGS Team Edge")?.impact).toBe("positive");
  });

  it("returns zero rather than a decayed sub-threshold NGS contribution", () => {
    const oldCapture = "2026-06-01T12:00:00.000Z";
    const result = computeGameContext({
      ngsHome: { ...signal(0.4), capturedAt: oldCapture },
      ngsAway: { ...signal(0.38), capturedAt: oldCapture },
      ngsReferenceAt: NOW,
    }, "SPREAD", "HOME");

    expect(result.ngsScore).toBe(0);
    expect(result.factors.some((factor) => factor.name === "NGS Team Edge")).toBe(false);
  });

  it("does not let missing or malformed NGS rows affect the context", () => {
    const empty = computeGameContext({}, "SPREAD", "HOME");
    expect(empty.ngsScore).toBe(0);
    const malformed = computeGameContext({
      ngsHome: { ...signal(0.8), capturedAt: "not-a-date" },
      ngsAway: signal(-0.2),
      ngsReferenceAt: NOW,
    }, "SPREAD", "HOME");
    expect(malformed.ngsScore).toBe(0);
  });
});
