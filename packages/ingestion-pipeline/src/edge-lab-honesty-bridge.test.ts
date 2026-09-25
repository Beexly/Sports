import { describe, expect, it } from "vitest";
import {
  evalCloseDistillation,
  evalFeatureAdmission,
  evalGameContext,
  evalPredictedMoveEdge,
  evalTaxonomyRow,
} from "./edge-lab-honesty-bridge.js";

function closeRow(qClose: number, epa: number, rest: number) {
  return {
    features: new Map([
      ["epa_last3", epa],
      ["rest_days", rest],
    ]),
    qClose,
  };
}

const closeRows = Array.from({ length: 30 }, (_, i) =>
  closeRow(0.5 + (i % 7) * 0.05, (i % 5) * 0.1 - 0.2, (i % 4) + 3),
);

describe("edge-lab-honesty-bridge evalCloseDistillation", () => {
  it("fail-closes on too-few rows", () => {
    const r = evalCloseDistillation({
      rows: [closeRow(0.5, 0, 7)],
      featureKeys: ["epa_last3"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("at least 5");
  });

  it("fail-closes on closing-line feature key (target must never be a feature)", () => {
    const r = evalCloseDistillation({
      rows: closeRows,
      featureKeys: ["q_close"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("closing-line");
  });

  it("trains a distiller and reports fold scores", () => {
    const r = evalCloseDistillation({
      rows: closeRows,
      featureKeys: ["epa_last3", "rest_days"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.distiller.coefficients.size).toBeGreaterThan(0);
      expect(Array.isArray(r.data.foldScores)).toBe(true);
    }
  });
});

describe("edge-lab-honesty-bridge evalPredictedMoveEdge", () => {
  it("computes edge from a real decision-time price (decimal odds)", () => {
    // predictedClose 0.58, decisionPrice 2.00 → implied 0.50 → edge 0.08
    const r = evalPredictedMoveEdge({ predictedClose: 0.58, decisionPrice: 2.0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0.08, 5);
  });

  it("fail-closes when the decision price is missing — never fabricated", () => {
    const r = evalPredictedMoveEdge({ predictedClose: 0.58, decisionPrice: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("fabricated");
  });

  it("fail-closes when decisionPrice is not decimal odds > 1", () => {
    const r = evalPredictedMoveEdge({ predictedClose: 0.58, decisionPrice: 0.52 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("decimal odds");
  });
});

describe("edge-lab-honesty-bridge evalFeatureAdmission", () => {
  it("records a trial and decides admissions under BH-FDR", () => {
    const r = evalFeatureAdmission({
      family: "EFFICIENCY",
      featureKey: "epa_last3",
      recordedAt: "2026-09-25T12:00:00.000Z",
      values: Array.from({ length: 40 }, (_, i) => (i % 5) * 0.1),
      outcomes: Array.from({ length: 40 }, (_, i) => (i % 2) as 0 | 1),
      qClose: Array.from({ length: 40 }, (_, i) => 0.5 + (i % 3) * 0.05),
      strata: 2,
      q: 0.1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.admissions).toBeDefined();
      expect(r.data.bh).toBeDefined();
    }
  });

  it("fail-closes on misaligned arrays", () => {
    const r = evalFeatureAdmission({
      family: "EFFICIENCY",
      featureKey: "epa",
      recordedAt: "2026-09-25T12:00:00.000Z",
      values: [0.1, 0.2],
      outcomes: [1],
      qClose: [0.5, 0.5],
      q: 0.1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });
});

describe("edge-lab-honesty-bridge taxonomy source", () => {
  it("evalGameContext fail-closes on missing features", () => {
    const r = evalGameContext({ features: null as never, isHomeSelection: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("required");
  });

  it("evalTaxonomyRow fail-closes on missing pick", () => {
    const r = evalTaxonomyRow({ pick: null as never, features: null as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("required");
  });
});
