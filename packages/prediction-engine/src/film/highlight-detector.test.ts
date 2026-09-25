import { describe, expect, it } from "vitest";
import {
  createHighlightDetector,
  type HighlightClip,
} from "./highlight-detector.js";

describe("highlight-detector TS wrapper", () => {
  it("exposes the documented API surface", () => {
    const d = createHighlightDetector();
    expect(typeof d.detectHighlights).toBe("function");
  });

  it("fails closed when no backend is configured — never fabricates highlights", async () => {
    const d = createHighlightDetector();
    await expect(d.detectHighlights("game.mp4")).rejects.toThrow(
      /fail-closed|no backend/i,
    );
  });

  it("rejects empty or non-string videoRef", async () => {
    const d = createHighlightDetector();
    await expect(d.detectHighlights("")).rejects.toThrow(/non-empty/);
    await expect(d.detectHighlights(null as unknown as string)).rejects.toThrow();
  });

  it("returns documented clip shape when a backend is injected", async () => {
    const clips: readonly HighlightClip[] = [
      { tStart: 120, tEnd: 145, type: "TD", confidence: 0.92 },
      { tStart: 300, tEnd: 318, type: "INT", confidence: 0.87 },
    ];
    const d = createHighlightDetector({
      runBackend: () => Promise.resolve(clips),
    });
    const result = await d.detectHighlights("game.mp4");
    expect(result).toHaveLength(2);
    for (const c of result) {
      expect(typeof c.tStart).toBe("number");
      expect(typeof c.tEnd).toBe("number");
      expect(["TD", "INT"]).toContain(c.type);
      expect(c.confidence).toBeGreaterThan(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
    // INT preferred when present — check both types documented
    expect(result.some((c) => c.type === "INT")).toBe(true);
    expect(result.some((c) => c.type === "TD")).toBe(true);
  });

  it("returns empty array for flat audio (no spikes, no cues)", async () => {
    const d = createHighlightDetector({
      runBackend: () => Promise.resolve([]),
    });
    const result = await d.detectHighlights("flat.mp4");
    expect(result).toHaveLength(0);
  });
});
