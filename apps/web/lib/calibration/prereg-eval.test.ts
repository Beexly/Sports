import { describe, expect, it } from "vitest";
import { declarePrereg, evaluatePrereg, fnv1a, verifySeal } from "./prereg-eval";

const base = {
  hypothesis: "TimesFM-3 zero-shot beats the naive seasonal baseline on daily site traffic.",
  metric: "scaledMAE",
  threshold: "beats baseline by >=5% relative",
  n: 90,
  validityGates: ["no train/test leakage", "baseline is the real incumbent"],
  direction: "minimize" as const,
  successValue: 0.95,
};

const passGates = {
  "no train/test leakage": true,
  "baseline is the real incumbent": true,
};

describe("prereg-eval", () => {
  it("fnv1a is deterministic and distinguishes inputs", () => {
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
    expect(fnv1a("abc")).not.toBe(fnv1a("abd"));
  });

  it("declare seals the record; verifySeal passes on the untouched record", () => {
    const rec = declarePrereg(base);
    expect(rec.seal).toMatch(/^[0-9a-f]{8}$/);
    expect(verifySeal(rec)).toBe(true);
  });

  it("rejects declarations with no gates, bad n, or empty hypothesis", () => {
    expect(() => declarePrereg({ ...base, validityGates: [] })).toThrow();
    expect(() => declarePrereg({ ...base, n: 0 })).toThrow();
    expect(() => declarePrereg({ ...base, hypothesis: "  " })).toThrow();
  });

  it("MET when observed beats the declared threshold with all gates passing", () => {
    const rec = declarePrereg(base);
    const out = evaluatePrereg(rec, { observed: 0.9, n: 90, gateResults: passGates });
    expect(out.verdict).toBe("MET");
  });

  it("NOT MET when observed misses the threshold — and says to publish anyway", () => {
    const rec = declarePrereg(base);
    const out = evaluatePrereg(rec, { observed: 1.02, n: 90, gateResults: passGates });
    expect(out.verdict).toBe("NOT MET");
    expect(out.reason).toContain("Publish it anyway");
  });

  it("VOID when any validity gate fails — even on a would-be win", () => {
    const rec = declarePrereg(base);
    const out = evaluatePrereg(rec, {
      observed: 0.5,
      n: 90,
      gateResults: { "no train/test leakage": false, "baseline is the real incumbent": true },
    });
    expect(out.verdict).toBe("VOID");
    expect(out.reason).toContain("no train/test leakage");
  });

  it("VOID when the record is tampered with after declaration", () => {
    const rec = declarePrereg(base);
    const tampered = { ...rec, successValue: 1.5 }; // moved the goalposts
    expect(verifySeal(tampered)).toBe(false);
    const out = evaluatePrereg(tampered, { observed: 1.4, n: 90, gateResults: passGates });
    expect(out.verdict).toBe("VOID");
    expect(out.reason).toContain("seal mismatch");
  });

  it("VOID when evaluated n differs from declared n", () => {
    const rec = declarePrereg(base);
    const out = evaluatePrereg(rec, { observed: 0.9, n: 45, gateResults: passGates });
    expect(out.verdict).toBe("VOID");
  });

  it("maximize direction: observed >= successValue is MET", () => {
    const rec = declarePrereg({ ...base, direction: "maximize", metric: "clvSignRate", successValue: 0.55 });
    expect(evaluatePrereg(rec, { observed: 0.57, n: 90, gateResults: passGates }).verdict).toBe("MET");
    expect(evaluatePrereg(rec, { observed: 0.53, n: 90, gateResults: passGates }).verdict).toBe("NOT MET");
  });
});
