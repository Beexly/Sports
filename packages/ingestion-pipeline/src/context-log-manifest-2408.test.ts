import { describe, expect, it } from "vitest";
import { buildRunManifest, verifyReproduction, retroScore, contextLogGatePasses } from "./context-log-manifest-2408.js";

const inputs = [
  { dataset: "pbp", contentHash: "h1", capturedAt: "2024-01-01T00:00:00Z" },
  { dataset: "odds", contentHash: "h2", capturedAt: "2024-01-01T00:00:00Z" },
];

describe("context log manifest", () => {
  it("sorts inputs deterministically", () => {
    const m = buildRunManifest("r1", "sha", [...inputs].reverse(), "2024-01-02T00:00:00Z");
    expect(m.inputs.map((i) => i.dataset)).toEqual(["odds", "pbp"]);
  });
  it("verifies an exact reproduction", () => {
    const m = buildRunManifest("r1", "sha", inputs, "2024-01-02T00:00:00Z");
    expect(verifyReproduction(m, { ...m }).reproducible).toBe(true);
  });
  it("flags code and input drift", () => {
    const m = buildRunManifest("r1", "sha", inputs, "2024-01-02T00:00:00Z");
    const i0 = inputs[0];
    expect(i0).toBeDefined();
    const badInputs = i0 === undefined ? [] : [{ dataset: i0.dataset, contentHash: "hx", capturedAt: i0.capturedAt }];
    const bad = buildRunManifest("r1", "sha2", badInputs, "2024-01-02T00:00:00Z");
    const v = verifyReproduction(m, bad);
    expect(v.reproducible).toBe(false);
    expect(v.mismatches.length).toBeGreaterThanOrEqual(2);
  });
  it("gate needs 5/5 questions and <2% overhead", () => {
    expect(contextLogGatePasses(5, 5, 0.01)).toBe(true);
    expect(contextLogGatePasses(4, 5, 0.01)).toBe(false);
    expect(contextLogGatePasses(5, 5, 0.03)).toBe(false);
    expect(retroScore(0, 0)).toBe(0);
  });
  it("handles empty input", () => {
    const m = buildRunManifest("r1", "sha", [], "2024-01-01T00:00:00Z");
    expect(m.inputs).toEqual([]);
    const v = verifyReproduction(m, m);
    expect(v.reproducible).toBe(true);
    expect(v.mismatches).toEqual([]);
  });
  it("handles edge inputs", () => {
    const m = buildRunManifest("r1", "sha", [], "2024-01-01T00:00:00Z");
    const other = buildRunManifest("r2", "sha2", [], "2024-01-01T00:00:00Z");
    const v = verifyReproduction(m, other);
    expect(v.reproducible).toBe(false);
    expect(v.mismatches.some((x) => x.includes("codeSha"))).toBe(true);
  });
});

