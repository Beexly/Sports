import { describe, expect, it } from "vitest";
import {
  AsOfFeatureStore,
  evalCloseDistillation,
  evalFeatureAdmission,
  evalGameContext,
  evalPredictedMoveEdge,
  evalTaxonomyRow,
  evalAsofIngest,
  evalAsofGet,
  evalAsofNoLookahead,
  evalWalkForward,
  evalConditionalMiProbe,
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

describe("edge-lab-honesty-bridge asof-store leak wall", () => {
  it("ingests a clean observation and serves it as-of", () => {
    const store = new AsOfFeatureStore();
    const r = evalAsofIngest({
      store,
      observation: {
        entityId: "g1",
        featureKey: "team:rest_days",
        value: 7,
        observedAt: "2026-09-20T12:00:00Z",
        source: "test",
      },
    });
    expect(r.ok).toBe(true);

    const got = evalAsofGet({
      store,
      entityId: "g1",
      featureKey: "team:rest_days",
      asOf: "2026-09-21T12:00:00Z",
    });
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.data.value).toBe(7);

    const clean = evalAsofNoLookahead({ store });
    expect(clean.ok).toBe(true);
    if (clean.ok) expect(clean.data.servedCount).toBe(1);
  });

  it("fail-closes on closing-line feature keys unless allowlisted", () => {
    const store = new AsOfFeatureStore();
    const blocked = evalAsofIngest({
      store,
      observation: {
        entityId: "g1",
        featureKey: "market:closing_spread",
        value: -3,
        observedAt: "2026-09-20T12:00:00Z",
        source: "test",
      },
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toContain("closing");

    const allowed = evalAsofIngest({
      store,
      observation: {
        entityId: "g1",
        featureKey: "market:closing_spread",
        value: -3,
        observedAt: "2026-09-20T12:00:00Z",
        source: "test",
      },
      marketDecisionKeys: ["market:closing_spread"],
    });
    expect(allowed.ok).toBe(true);
  });

  it("fail-closes when nothing was knowable at asOf — never imputes", () => {
    const store = new AsOfFeatureStore();
    evalAsofIngest({
      store,
      observation: {
        entityId: "g1",
        featureKey: "team:rest_days",
        value: 7,
        observedAt: "2026-09-25T12:00:00Z",
        source: "test",
      },
    });
    const got = evalAsofGet({
      store,
      entityId: "g1",
      featureKey: "team:rest_days",
      asOf: "2026-09-24T12:00:00Z",
    });
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.reason).toContain("not imputed");
  });
});

describe("edge-lab-honesty-bridge placebo / walk-forward", () => {
  function makeRows(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      decisionAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
      eventEndAt: new Date(Date.UTC(2026, 0, 1 + i, 3)).toISOString(),
      features: new Map([["epa", (i % 5) * 0.1]]),
      y: (i % 2) as 0 | 1,
      qClose: 0.5,
    }));
  }

  const trainer = (train: readonly { features: ReadonlyMap<string, number>; y: 0 | 1 }[]) => {
    const mean =
      train.length === 0
        ? 0.5
        : train.reduce((s, x) => s + x.y, 0) / train.length;
    return () => mean;
  };

  it("evalWalkForward fail-closes on empty rows", () => {
    const r = evalWalkForward({
      rows: [],
      trainer,
      walkForward: { folds: 2, minTrainFraction: 0.5, embargoMs: 0 },
      fireThreshold: 0.05,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not imputed");
  });

  it("evalWalkForward returns a real report on sufficient rows", () => {
    const r = evalWalkForward({
      rows: makeRows(40),
      trainer,
      walkForward: { folds: 3, minTrainFraction: 0.4, embargoMs: 0 },
      fireThreshold: 0.05,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.eligible).toBeGreaterThan(0);
      expect(r.data.foldCount).toBeGreaterThan(0);
    }
  });

  it("evalConditionalMiProbe fail-closes on mismatched arrays", () => {
    const r = evalConditionalMiProbe({
      scores: [0.6, 0.7],
      outcomes: [1],
      qClose: [0.5, 0.5],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("equal-length");
  });

  it("evalConditionalMiProbe returns finite MI on valid input", () => {
    const scores = Array.from({ length: 80 }, (_, i) => 0.4 + (i % 7) * 0.05);
    const outcomes = scores.map((s, i) => (s > 0.55 && i % 3 !== 0 ? 1 : 0) as 0 | 1);
    const qClose = scores.map(() => 0.5);
    const r = evalConditionalMiProbe({
      scores,
      outcomes,
      qClose,
      permutations: 20,
      seed: 7,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.miNats)).toBe(true);
      expect(r.data.n).toBe(80);
    }
  });
});
