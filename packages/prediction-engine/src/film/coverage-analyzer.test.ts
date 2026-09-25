import { describe, expect, it } from "vitest";
import {
  createCoverageAnalyzer,
  type CoveragePlayResult,
} from "./coverage-analyzer.js";
import { FilmBackendUnavailableError } from "./highlight-detector.js";

function makePlayResult(pre: string, post: string): Record<string, unknown> {
  return {
    preSnap: pre,
    postSnap: post,
    disguised: pre !== post,
    safetyDepth: 14.5,
    cornerLeverage: [
      { side: "left", technique: "off", leverage: "outside" },
      { side: "right", technique: "off", leverage: "outside" },
    ],
    boxCount: 5,
  };
}

function makeBackend(playResult: Record<string, unknown>) {
  return {
    isAvailable: () => true,
    analyzePlay: () => Promise.resolve(playResult),
    aggregate: () =>
      Promise.resolve({
        coverageDistribution: { "Cover 3": 0.75, "Cover 2": 0.25 },
        disguiseRate: 0.25, downDistanceTendency: [],
        byDownDistance: [],
      }),
  };
}

describe("coverage-analyzer TS wrapper", () => {
  it("exposes the documented API surface", () => {
    const a = createCoverageAnalyzer();
    expect(typeof a.analyzePlay).toBe("function");
    expect(typeof a.aggregate).toBe("function");
  });

  it("fails closed (throws FilmBackendUnavailableError) when backend is unavailable", async () => {
    const a = createCoverageAnalyzer({
      backend: {
        isAvailable: () => false,
        analyzePlay: () => Promise.resolve(null),
        aggregate: () => Promise.resolve(null),
      },
    });
    await expect(a.analyzePlay({})).rejects.toThrow(FilmBackendUnavailableError);
    await expect(a.aggregate([])).rejects.toThrow(FilmBackendUnavailableError);
  });

  it("returns Cover 3 for deep safeties + off corners fixture", async () => {
    const a = createCoverageAnalyzer({
      backend: makeBackend(makePlayResult("Cover 3", "Cover 3")),
    });
    const r = await a.analyzePlay({});
    expect(r.preSnap).toBe("Cover 3");
    expect(r.postSnap).toBe("Cover 3");
    expect(r.disguised).toBe(false);
  });

  it("disguised is true exactly when pre â‰  post labels differ", async () => {
    const a = createCoverageAnalyzer({
      backend: makeBackend(makePlayResult("1-Man", "Cover 3")),
    });
    const r = await a.analyzePlay({});
    expect(r.disguised).toBe(true);
    expect(r.preSnap).not.toBe(r.postSnap);
  });

  it("aggregate returns distribution and disguise rate", async () => {
    const a = createCoverageAnalyzer({
      backend: makeBackend(makePlayResult("Cover 3", "Cover 3")),
    });
    const agg = await a.aggregate([]);
    expect(agg).toHaveProperty("coverageDistribution");
    expect(agg).toHaveProperty("disguiseRate");
  });

  it("FilmBackendUnavailableError is a real Error subclass", () => {
    const e = new FilmBackendUnavailableError("backend_unavailable", "test msg");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("backend_unavailable");
    expect(e.message).toContain("test msg");
    expect(e.name).toBe("FilmBackendUnavailableError");
  });
});



