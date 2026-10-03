/**
 * Phase-0 core tests: the as-of store's hard cutoff, the purged/embargoed
 * walk-forward, the sealed holdout, provenance stamps, and — the load-bearing
 * pair — the shuffled-time placebo passing on a clean synthetic corpus and
 * FAILING when a backdated outcome-encoding feature is planted (the exact
 * silent-fatal leak class the handoff §2 P0 names).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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

  // FIX 2: marketDecisionKeys is an exact-name allowlist, not a boolean
  // escape hatch — a reviewed near-miss key ingests when named explicitly,
  // but every OTHER closing-pattern key still throws even with the option
  // present (non-empty list does not turn off the pattern check generally).
  it("marketDecisionKeys allowlists an exact reviewed key despite the closing-line pattern", () => {
    const store = new AsOfFeatureStore();
    expect(() =>
      store.ingest(
        { entityId: "g1", featureKey: "player:disclosure_days", value: 2, observedAt: iso(T0), source: "injury" },
        { marketDecisionKeys: ["player:disclosure_days"] },
      ),
    ).not.toThrow();
    expect(store.get("g1", "player:disclosure_days", iso(T0))?.value).toBe(2);
  });

  it("a non-allowlisted closing-pattern key still throws even with marketDecisionKeys present", () => {
    const store = new AsOfFeatureStore();
    expect(() =>
      store.ingest(
        { entityId: "g1", featureKey: "market:closing_spread", value: -3, observedAt: iso(T0), source: "odds" },
        { marketDecisionKeys: ["player:disclosure_days"] },
      ),
    ).toThrow(AsOfViolationError);
  });

  it("an empty marketDecisionKeys list behaves exactly like no option at all", () => {
    const store = new AsOfFeatureStore();
    expect(() =>
      store.ingest(
        { entityId: "g1", featureKey: "market:closing_spread", value: -3, observedAt: iso(T0), source: "odds" },
        { marketDecisionKeys: [] },
      ),
    ).toThrow(AsOfViolationError);
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

  // FIX 6: openHoldout previously opened on the literal token ALONE — a
  // token that could be (and, before this fix, effectively was) hard-coded
  // or copy-pasted into application code, silently unsealing the holdout in
  // CI/prod. It now ALSO requires process.env.GSE_ALLOW_HOLDOUT_OPEN ===
  // "true", an env var deliberately absent outside a human's interactive
  // sign-off session. The old assertion here (token alone succeeds) encoded
  // exactly that gap, so it is updated rather than merely extended.
  const ENV_VAR = "GSE_ALLOW_HOLDOUT_OPEN";
  const originalEnv = process.env[ENV_VAR];
  afterEach(() => {
    if (originalEnv === undefined) delete process.env[ENV_VAR];
    else process.env[ENV_VAR] = originalEnv;
  });

  it("hides rows behind the token; summary is inspectable", () => {
    const sealed = sealHoldout(rows, (r) => Date.parse(r.decisionAt) >= T0 + 7 * DAY);
    expect(sealed.working.length).toBe(7);
    expect(sealed.holdoutSummary.count).toBe(3);
    expect(() => sealed.openHoldout("please")).toThrow(SealedHoldoutError);
  });

  it("the literal token ALONE (no env var) still throws — closes the FIX 6 gap", () => {
    delete process.env[ENV_VAR];
    const sealed = sealHoldout(rows, (r) => Date.parse(r.decisionAt) >= T0 + 7 * DAY);
    expect(() => sealed.openHoldout(FOUNDER_HOLDOUT_TOKEN)).toThrow(SealedHoldoutError);
  });

  it("wrong token WITH the env var set still throws — both are required", () => {
    process.env[ENV_VAR] = "true";
    const sealed = sealHoldout(rows, (r) => Date.parse(r.decisionAt) >= T0 + 7 * DAY);
    expect(() => sealed.openHoldout("please")).toThrow(SealedHoldoutError);
  });

  it("token AND the env var together open the holdout", () => {
    process.env[ENV_VAR] = "true";
    const sealed = sealHoldout(rows, (r) => Date.parse(r.decisionAt) >= T0 + 7 * DAY);
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
    // FIX 5: an honest corpus with no sign-inversion should not raise the
    // (non-gating) sign-integrity blind-spot flag either.
    expect(report.signIntegrityWarning).toBe(false);
    expect(report.signIntegrityNote).toBeNull();
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
    // A POSITIVE-tail failure is not what the sign-integrity flag is for.
    expect(report.signIntegrityWarning).toBe(false);
  }, 30_000);

  // FIX 5: the gate is deliberately one-sided (only a significant POSITIVE
  // placebo EV fails it — a leak can only manufacture positive EV against an
  // efficient close). The blind spot: a sign-inverted OUTCOME JOIN (e.g. the
  // win/loss label got attached to the wrong side downstream of an
  // otherwise-honest evaluation) manufactures a significant NEGATIVE placebo
  // EV instead, which the one-sided gate passes silently. signIntegrityWarning
  // is a NON-GATING flag that catches exactly this signature.
  it("planted sign-inverted outcome join -> signIntegrityWarning true, gate still PASSES", () => {
    const rng = mulberry32(53);
    const teams = 12;
    const strength = Array.from({ length: teams }, () => (rng() - 0.5) * 1.2);
    const store = new AsOfFeatureStore();
    const games = 1600;
    const rows: EvalRow[] = [];
    for (let i = 0; i < games; i++) {
      const t = T0 + i * (DAY / 2);
      for (let k = 0; k < teams; k++) strength[k] = (strength[k] ?? 0) + (rng() - 0.5) * 0.02;
      const home = Math.floor(rng() * teams);
      let away = Math.floor(rng() * teams);
      if (away === home) away = (away + 1) % teams;
      const gap = (strength[home] ?? 0) - (strength[away] ?? 0) + 0.12;
      const trueP = 1 / (1 + Math.exp(-2.2 * gap));
      const trueY: 0 | 1 = rng() < trueP ? 1 : 0;
      // THE BUG: the outcome label handed to the harness is the OPPOSITE of
      // what actually happened (a home/away- or win/loss-flip smuggled into
      // the join), while the close q is untouched (still the true home-win
      // probability) — exactly a sign-inverted outcome join.
      const y: 0 | 1 = (1 - trueY) as 0 | 1;
      const gameId = `g${i}`;
      const decisionAt = iso(t);
      // A confident, entity-fixed read of the TRUE (unflipped) outcome —
      // ingested with an observedAt that predates the whole corpus era, so
      // it is served under EVERY possible scramble instant (isolating the
      // sign effect from reveal-rate noise, not a leak this test is about).
      store.ingest({
        entityId: gameId,
        featureKey: "scout:oracle_read",
        value: trueY,
        observedAt: iso(T0 - 10 * DAY),
        source: "leak",
      });
      const features = store.vector(gameId, ["scout:oracle_read"], decisionAt);
      rows.push({ id: gameId, decisionAt, eventEndAt: iso(t + DAY / 8), features, y, qClose: trueP });
    }
    // Non-adaptive: reflects the (true, unflipped) oracle read directly
    // rather than fitting to labels — a fitted trainer would just flip its
    // own coefficient sign to match whatever label it's shown and could
    // never produce negative EV against its OWN training target, which is
    // exactly why this blind spot needs a decoupled construction to exist
    // at all (see design note in placebo.ts).
    const oracleTrainer = (): ((features: ReadonlyMap<string, number>) => number) => (features) => {
      const v = features.get("scout:oracle_read");
      if (v === undefined) return 0.5;
      return v > 0.5 ? 0.97 : 0.03;
    };

    const report = shuffledTimePlacebo(store, rows, oracleTrainer, {
      fireThreshold: 0.04,
      walkForward: WF,
      featureKeys: ["scout:oracle_read"],
      runs: 8,
      seed: 11,
    });

    expect(report.placeboMedianP).not.toBeNull();
    expect(report.placeboMedianP!).toBeLessThan(0.005);
    expect(report.placeboMedianMean).not.toBeNull();
    expect(report.placeboMedianMean!).toBeLessThan(-report.epsilon);
    // passed/failureReason semantics are UNCHANGED — the one-sided gate
    // still passes (this is precisely the blind spot).
    expect(report.passed).toBe(true);
    expect(report.failureReason).toBeNull();
    expect(report.signIntegrityWarning).toBe(true);
    expect(report.signIntegrityNote).toMatch(/negative/i);
  }, 30_000);
});

describe("PlaceboReport.signIntegrityWarning — committed real-run regression (FIX 5)", () => {
  // The committed Phase-0 NFL acceptance run (reports/edge-lab/phase0-nfl-acceptance.json,
  // generated by scripts/edge-lab/phase0-acceptance.ts against real nflverse
  // data) has a genuinely negative median placebo EV (favorite-longshot/vig
  // cost of firing on noise, not a leak) with median p ~ 0.015 — significant
  // enough to be noteworthy but NOT at the 0.005 bar this flag uses. FIX 5
  // must not turn that honest, already-reviewed finding into a new warning:
  // the threshold check is mirrored here directly against the committed
  // numbers as a regression guard, since re-running the real pipeline in a
  // unit test would require network access to nflverse data.
  it("committed phase0 real-run inputs (median p≈0.015, negative EV) yield NO warning", () => {
    const reportPath = join(
      __dirname,
      "..", "..", "..", "..", "..",
      "reports", "edge-lab", "phase0-nfl-acceptance.json",
    );
    const committed = JSON.parse(readFileSync(reportPath, "utf8")) as {
      readonly report: {
        readonly placeboGate: {
          readonly passed: boolean;
          readonly medianP: number;
          readonly medianMean: number;
          readonly epsilon: number;
        };
      };
    };
    const { medianP, medianMean, epsilon, passed } = committed.report.placeboGate;

    // Sanity: this is genuinely the "median p ~ 0.015 on negative EV" case
    // the fix's acceptance criteria names, not a stale/edited fixture.
    expect(medianP).toBeGreaterThan(0.005);
    expect(medianP).toBeLessThan(0.03);
    expect(medianMean).toBeLessThan(0);
    expect(passed).toBe(true);

    // The exact FIX 5 predicate, mirrored: NOT (p < 0.005 AND mean < -epsilon).
    const wouldWarn = medianP < 0.005 && medianMean < -epsilon;
    expect(wouldWarn).toBe(false);
  });
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
