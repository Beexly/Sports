import { describe, expect, it } from "vitest";
import {
  EXTERNAL_SOURCES,
  externalSourceStats,
  handleExternalSources,
  catalogStats,
  listExternalSources,
} from "../index.js";

describe("external source registry", () => {
  it("maps HF + free APIs + engines outside Sports", () => {
    const s = externalSourceStats();
    expect(s.total).toBeGreaterThanOrEqual(20);
    expect(s.byKind.cv_dataset + s.byKind.cv_model).toBeGreaterThanOrEqual(4);
    expect(s.byKind.free_api).toBeGreaterThanOrEqual(5);
    expect(s.wireNext.length).toBeGreaterThan(0);
  });

  it("unique external ids", () => {
    const ids = EXTERNAL_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handler returns sources", () => {
    const r = handleExternalSources({ kind: "cv_dataset" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.sources.every((s) => s.kind === "cv_dataset")).toBe(true);
    }
  });

  it("research sources are not commercial wire-next by default", () => {
    const research = listExternalSources({ status: "RESEARCH" });
    expect(research.some((s) => s.id.includes("sportsmot"))).toBe(true);
  });
});

describe("catalog after external expansion", () => {
  it("exceeds 850 metrics", () => {
    const s = catalogStats();
    expect(s.total).toBeGreaterThanOrEqual(850);
  });
});
