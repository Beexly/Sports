/**
 * Phase-0 core tests: the as-of store's hard cutoff, the purged/embargoed
 * walk-forward, the sealed holdout, provenance stamps, and — the load-bearing
 * pair — the shuffled-time placebo passing on a clean synthetic corpus and
 * FAILING when a backdated outcome-encoding feature is planted (the exact
 * silent-fatal leak class the handoff §2 P0 names).
 */
import { describe, expect, it } from "vitest";

import { AsOfFeatureStore, AsOfViolationError } from "../asof-store.js";
import { logisticTrainer } from "../logistic.js";
import {
  conditionalMiProbe,
  evVsClose,
  shuffledTimePlacebo,
  walkForwardEval,
  type EvalRow,
} from "../placebo.js";
import { canonicalJson, stampProvenance, verifyReproduction } from "../provenance.js";
import { mulberry32 } from "../rng.js";
import {
  FOUNDER_HOLDOUT_TOKEN,
  SealedHoldoutError,
  sealHoldout,
  walkForwardSplits,
  type TimedRow,
} from "../walk-forward.js";

const T0 = Date.parse("2020-01-01T00:00:00.000Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

describe("AsOfFeatureStore — hard cutoff in code", () => {
  it("serves the latest observation at or before asOf, never after", () => {
    const store = new AsOfFeatureStore();
    store.ingest({ entityId: "g1", featureKey: "team:rating", value: 1, observedAt: iso(T0), source: "t" });
    store.ingest({ entityId: "g1", featureKey: "team:rating", value: 2, observedAt: iso(T0 + DAY), source: "t" });
    store.ingest({ entityId: "g1", featureKey: "team:rating", value: 3, observedAt: iso(T0 + 2 * DAY), source: "t" });

    expect(store.get("g1", "team:rating", iso(T0 + DAY))?.value).toBe(2);
    expect(store.get("g1", "team:rating", iso(T0 + DAY - 1))?.value).toBe(1);
    expect(store.get("g1", "team:rating", iso(T0 - 1))).toBeNull();
    expect(() => store.assertNoLookahead()).not.toThrow();
  });

  it("refuses closing-line-shaped feature keys outright", () => {
    const store = new AsOfFeatureStore();
    expect(() =>
      store.ingest({ entityId: "g1", featureKey: "market:closing_spread", value: -3, observedAt: iso(T0), source: "odds" }),
    ).toThrow(AsOfViolationError);
    // Open/current market snapshots are fine and don't need the flag.
    expect(() =>
      store.ingest({ entityId: "g1", featureKey: "market:open_spread", value: -2.5, observedAt: iso(T0), source: "odds" }),
    ).not.toThrow();
  });
});

describe("walkForwardSplits — purge + embargo", () => {
  const rows: TimedRow[] = Array.from({ length: 40 }, (_, i) => ({
    id: `r${i}`,
    decisionAt: iso(T0 + i * DAY),
    eventEndAt: iso(T0 + i * DAY + DAY / 2),
  }));

  it("train strictly precedes test; overlapping windows are purged; embargo bites later folds", () => {
    // A long-running event whose end crosses into the test window must be purged.
    const withOverlap: TimedRow[] = [
      ...rows,
      { id: "long", decisionAt: iso(T0 + 10 * DAY), eventEndAt: iso(T0 + 30 * DAY) },
    ];
    // 3 folds: with contiguous test blocks the embargo can only bite a
    // LATER fold's training set (fold 3 trains past fold 1's margin) — fold 2's
    // candidates inside fold 1's margin are fold 2's own test rows.
    const folds = walkForwardSplits(withOverlap, { folds: 3, minTrainFraction: 0.5, embargoMs: 2 * DAY });
    expect(folds.length).toBe(3);
    for (const fold of folds) {
      const testStart = Date.parse(fold.testStart);
      for (const tr of fold.train) {
        expect(Date.parse(tr.decisionAt)).toBeLessThan(testStart);
        expect(Date.parse(tr.eventEndAt)).toBeLessThan(testStart);
      }
    }
    // The overlapping row is purged from at least the fold whose window it crosses.
    expect(folds.some((f) => f.purged.some((r) => r.id === "long"))).toBe(true);
    // A later fold's train excludes rows inside earlier folds' embargo margins.
    const f3 = folds[2]!;
    const f1End = Date.parse(folds[0]!.testEnd);
    for (const tr of f3.train) {
      const d = Date.parse(tr.decisionAt);
      expect(d <= f1End || d > f1End + 2 * DAY).toBe(true);
    }
    expect(f3.embargoed.length).toBeGreaterThan(0);
  });
});

describe("sealHoldout — founder-gated forward holdout", () => {
  const rows: TimedRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: `r${i}`,
    decisionAt: iso(T0 + i * DAY),
    eventEndAt: iso(T0 + i * DAY + 1),
  }));

  it("hides rows behind the token; summary is inspectable", () => {
    const sealed = sealHoldout(rows, (r) => Date.parse(r.decisionAt) >= T0 + 7 * DAY);
    expect(sealed.working.length).toBe(7);
    expect(sealed.holdoutSummary.count).toBe(3);
    expect(() => sealed.openHoldout("please")).toThrow(SealedHoldoutError);
    expect(sealed.openHoldout(FOUNDER_HOLDOUT_TOKEN).length).toBe(3);
  });
});

describe("provenance", () => {
  it("canonical JSON is key-order independent and stamps verify round-trip", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
    const stamp = stampProvenance({
      producer: "edge-lab/test",
      asOf: iso(T0),
      inputs: { x: 1 },
      output: { p: 0.6 },
    });
    expect(verifyReproduction(stamp, { p: 0.6 })).toBe(true);
    expect(verifyReproduction(stamp, { p: 0.61 })).toBe(false);
    expect(stamp.modelVersion.length).toBeGreaterThan(0);
  });

  it("refuses NaN/Infinity in hashed inputs", () => {
    expect(() =>
      stampProvenance({ producer: "t", asOf: iso(T0), inputs: { x: Number.NaN }, output: null }),
    ).toThrow(RangeError);
  });
});

// ── Synthetic corpus for the gate tests ──────────────────────────────────────
//
// A latent team-strength world: each of 12 teams has a drifting strength;
// games pair random teams; the TRUE home-win prob comes from the strength
// gap + home edge; the close q is the true prob plus small market noise
// (the close is EFFICIENT); the honest feature is the pre-game strength
// gap reading. Honest pipeline: EV vs close ~ 0 both real and placebo.
// Leaky pipeline: plant q (the close, outcome-correlated) as a backdated
// "feature" -> real run shows fake edge -> placebo must catch it.

function buildCorpus(seed: number, games: number) {
  const rng = mulberry32(seed);
  const teams = 12;
  const strength = Array.from({ length: teams }, () => (rng() - 0.5) * 1.2);
  const store = new AsOfFeatureStore();
  const rows: EvalRow[] = [];
  for (let i = 0; i < games; i++) {
    const t = T0 + i * (DAY / 2);
    // drift strengths slowly
    for (let k = 0; k < teams; k++) strength[k] = (strength[k] ?? 0) + (rng() - 0.5) * 0.02;
    const home = Math.floor(rng() * teams);
    let away = Math.floor(rng() * teams);
    if (away === home) away = (away + 1) % teams;
    const gap = (strength[home] ?? 0) - (strength[away] ?? 0) + 0.12; // home edge
    const trueP = 1 / (1 + Math.exp(-2.2 * gap));
    // EFFICIENT close: q IS the true probability. Any additive-noise-then-
    // clamp construction makes E[truth|q] != q ("fade the extremes" becomes
    // free money) and the placebo will rightly refuse to pass such a market
    // — this test corpus must not smuggle in a beatable close.
    const q = trueP;
    const y: 0 | 1 = rng() < trueP ? 1 : 0;
    const gameId = `g${i}`;
    const decisionAt = iso(t);
    // Honest feature: the strength-gap reading, knowable the day before.
    store.ingest({
      entityId: gameId,
      featureKey: "team:strength_gap",
      value: gap + (rng() - 0.5) * 0.1, // measured with honest noise
      observedAt: iso(t - DAY / 4),
      source: "synthetic",
    });
    const features = store.vector(gameId, ["team:strength_gap"], decisionAt);
    rows.push({
      id: gameId,
      decisionAt,
      eventEndAt: iso(t + DAY / 8),
      features,
      y,
      qClose: q,
    });
  }
  return { store, rows };
}

const WF = { folds: 4, minTrainFraction: 0.4, embargoMs: DAY } as const;

describe("shuffled-time placebo — THE Phase-0 gate", () => {
  it("evVsClose: expectation-zero bookkeeping sanity", () => {
    // Firing home at q=0.5: win pays +1, loss pays -1.
    expect(evVsClose(0.6, 0.5, 1)).toBeCloseTo(1, 9);
    expect(evVsClose(0.6, 0.5, 0)).toBeCloseTo(-1, 9);
    // Firing away (p<q): away q_side=0.4, away win (y=0) pays 0.6/0.4=1.5.
    expect(evVsClose(0.3, 0.6, 0)).toBeCloseTo(1.5, 9);
  });

  it("PASSES on the clean corpus (no leak -> placebo edge ~ 0)", () => {
    const { store, rows } = buildCorpus(42, 1600);
    const trainer = logisticTrainer({ featureKeys: ["team:strength_gap"] });
    const report = shuffledTimePlacebo(store, rows, trainer, {
      fireThreshold: 0.04,
      walkForward: WF,
      featureKeys: ["team:strength_gap"],
      runs: 8,
      seed: 7,
    });
    expect(report.passed).toBe(true);
  }, 30_000);

  it("FAILS when a backdated outcome-encoding feature is planted (the named leak class)", () => {
    const { store, rows } = buildCorpus(43, 1600);
    // The leak: a RESULT-derived stat (think "post-game grade") recorded
    // with a pre-kickoff observedAt under an innocent-looking key —
    // mis-stamped observedAt is the classic silent-fatal bug. Against an
    // efficient close, only outcome knowledge manufactures fake EV.
    const poisoned: EvalRow[] = rows.map((row) => {
      store.ingest({
        entityId: row.id,
        featureKey: "scout:sharp_read", // innocuous name — pattern guard can't catch it
        value: row.y * 3 + 0.1,
        observedAt: iso(Date.parse(row.decisionAt) - 1000),
        source: "leak",
      });
      return {
        ...row,
        features: store.vector(row.id, ["team:strength_gap", "scout:sharp_read"], row.decisionAt),
      };
    });
    const trainer = logisticTrainer({ featureKeys: ["team:strength_gap", "scout:sharp_read"] });

    // The leak inflates apparent skill: the model reconstructs the close and
    // fires on noise. The placebo must refuse to pass this pipeline.
    const report = shuffledTimePlacebo(store, poisoned, trainer, {
      fireThreshold: 0.04,
      walkForward: WF,
      featureKeys: ["team:strength_gap", "scout:sharp_read"],
      runs: 8,
      seed: 11,
    });
    expect(report.passed).toBe(false);
    expect(report.failureReason).toMatch(/post-decision|observedAt/i);
  }, 30_000);
});

describe("conditionalMiProbe", () => {
  it("reports ~0 with a high p-value when scores carry nothing beyond q", () => {
    const rng = mulberry32(5);
    const n = 800;
    const q = Array.from({ length: n }, () => 0.2 + rng() * 0.6);
    const y = q.map((qi) => (rng() < qi ? 1 : 0) as 0 | 1);
    const scores = Array.from({ length: n }, () => rng()); // pure noise
    const probe = conditionalMiProbe({ scores, outcomes: y, qClose: q, permutations: 100, seed: 3 });
    expect(probe.pValue).toBeGreaterThan(0.05);
  });

  it("detects real conditional information", () => {
    const rng = mulberry32(6);
    const n = 800;
    const q = Array.from({ length: n }, () => 0.2 + rng() * 0.6);
    // Outcome depends on q AND an orthogonal signal the score sees.
    const signal = Array.from({ length: n }, () => (rng() - 0.5) * 0.3);
    const y = q.map((qi, i) => (rng() < Math.min(0.95, Math.max(0.05, qi + (signal[i] ?? 0))) ? 1 : 0) as 0 | 1);
    const scores = signal.map((s) => s + (rng() - 0.5) * 0.05);
    const probe = conditionalMiProbe({ scores, outcomes: y, qClose: q, permutations: 100, seed: 4 });
    expect(probe.miNats).toBeGreaterThan(0);
    expect(probe.pValue).toBeLessThan(0.05);
  });
});

describe("walkForwardEval bookkeeping", () => {
  it("coverage = fired / eligible and folds respect time order", () => {
    const { rows } = buildCorpus(44, 400);
    const trainer = logisticTrainer({ featureKeys: ["team:strength_gap"] });
    const report = walkForwardEval(rows, trainer, WF, 0.03);
    expect(report.eligible).toBeGreaterThan(0);
    expect(report.fired).toBeLessThanOrEqual(report.eligible);
    expect(report.coverage).toBeCloseTo(report.fired / report.eligible, 9);
    expect(report.foldCount).toBe(4);
  });
});
