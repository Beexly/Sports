/**
 * EV14 — empty-slate contract pins across the recently shipped prop families.
 *
 * ── What this file pins, and why ──
 * A bye week, a preseason slate, or a position group whose every row was
 * refused upstream all hand the SAME thing to a fit: an empty array. Before
 * this file, no family test contained an empty-array or degenerate-variance
 * case, so "empty slate ⇒ null prior, never a fabricated prior" was an
 * unpinned contract — a fit could start returning an invented alpha/beta on
 * no data and every existing test would stay green.
 *
 * Two contracts are pinned per family:
 *
 *   1. EMPTY SLATE      — `fit([])` returns `null`. Zero rows is "no data,"
 *                         which is an honest answer, not a failure and not a
 *                         default prior.
 *   2. DEGENERATE SPREAD — a slate whose players share an IDENTICAL rate has
 *                         no measurable between-player dispersion once
 *                         sampling noise is subtracted, so it also returns
 *                         `null`. Fitting alpha = m²/v_between with v_between
 *                         at the noise floor would manufacture precision out
 *                         of rounding error ("no fake dispersion"). Callers
 *                         must fall back to the raw pooled mean with no
 *                         shrinkage.
 *
 * ── Why every test carries a live counterexample ──
 * `expect(fit([])).toBeNull()` is nearly unfalsifiable on its own: for EVERY
 * family in this file a one-element slate ALSO returns `null` (n=1 has zero
 * between-player variance by construction), so swapping `[]` for `[sample]`
 * would not move a bare null assertion. Two things keep these assertions
 * live rather than fluff:
 *
 *   - each empty-slate pin asserts the fixture is genuinely empty
 *     (`toHaveLength(0)`), so substituting any non-empty slate trips it; and
 *   - each family also pins a DISPERSED control slate against hand-derived
 *     alpha/beta values computed from the documented method-of-moments
 *     formulas below — proving `null` is a real branch these fits can leave,
 *     not the only value they ever produce.
 *
 * Test-only card: this file touches ZERO source modules. Every value below
 * was hand-derived from the estimator documented in the module header and
 * then confirmed against execution; where a fit's real behavior differs from
 * what one might wish, the test pins the REAL behavior and says so.
 *
 * priced:false is not applicable — nothing here produces a result record.
 */

import { describe, expect, it } from "vitest";
import { fitGroupPrior, type GammaPrior, type RateSample } from "../props-hb.js";
import { fitAirYacPriors, type AirYacSample } from "../props-hb-air-yac.js";
import { fitCompletionPrior, type CompSample } from "../props-hb-comp.js";
import { fitIntPerAttemptPrior, type IntSample } from "../props-hb-int.js";
import { fitPassTdPerAttemptPrior, type PassTdSample } from "../props-hb-pass-td.js";
import { fitSackPrior, type SackSample } from "../props-hb-sacks.js";
import type { BetaPrior } from "../props-hb-catch.js";

/** Floating-point tolerance for hand-derived alpha/beta (values agree with
 * execution to ~1e-15; 1e-12 leaves room without weakening the assertion). */
const PRECISION = 12;

/**
 * The one empty-slate assertion, shared by all six fits.
 *
 * The `toHaveLength(0)` line is not decoration: it is what makes the pin
 * falsifiable. Because a one-row slate also returns `null` everywhere in this
 * file, a bare `toBeNull()` would survive having its fixture replaced by real
 * data — this line ensures the case under test is still the EMPTY one.
 */
function pinEmptySlate<S, P>(slate: readonly S[], fit: (s: readonly S[]) => P | null): void {
  expect(slate).toHaveLength(0);
  expect(fit(slate)).toBeNull();
}

/** Build `n` copies of one sample — the identical-rate degenerate fixture. */
function repeat<S>(n: number, sample: S): readonly S[] {
  return Array.from({ length: n }, () => sample);
}

// ── family 1: props-hb.ts · fitGroupPrior (Gamma-Poisson, the base fit) ─────

describe("EV14 · fitGroupPrior — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate (bye week / preseason: no rows at all)", () => {
    const emptySlate: readonly RateSample[] = [];
    pinEmptySlate(emptySlate, fitGroupPrior);
  });

  it("returns null for 8 players at an IDENTICAL rate — no fake dispersion", () => {
    // Every player: 20 events over 10 games ⇒ rate 2.0 for all eight.
    //   m           = 160 / 80 = 2
    //   var(rate_i) = 0            (all raw rates identical)
    //   samplingVar = mean(2 / 10) = 0.2
    //   v_between   = max(0, 0 - 0.2) = 0  ⇒ below the degeneracy floor
    // alpha = m²/v_between would be +Infinity. The fit refuses instead.
    // Callers MUST fall back to the raw pooled mean m = 2 with no shrinkage.
    const identical = repeat(8, { games: 10, total: 20 });
    expect(identical).toHaveLength(8);
    expect(fitGroupPrior(identical)).toBeNull();
  });

  it("returns null for a single-player slate — n=1 has no between-player variance", () => {
    // A near-empty slate is the same honest refusal as an empty one: with one
    // player there is nothing to measure dispersion ACROSS.
    expect(fitGroupPrior([{ games: 10, total: 20 }])).toBeNull();
  });

  it("returns null when every player scored zero — pooled mean m = 0", () => {
    // m = 0 ⇒ alpha = beta = 0, which is not a usable Gamma. Refused, not
    // clamped to some epsilon prior.
    expect(fitGroupPrior(repeat(8, { games: 10, total: 0 }))).toBeNull();
  });

  it("DOES fit a real prior on a dispersed slate — proving null is a live branch", () => {
    // Two archetypes, four players, 100 games each (large exposure keeps the
    // Poisson sampling floor small enough that real dispersion survives it):
    //   rates       = 1, 4, 1, 4
    //   m           = 1000 / 400 = 2.5
    //   var(rate_i) = mean((1-2.5)², (4-2.5)², …) = 2.25
    //   samplingVar = mean(1/100, 4/100, 1/100, 4/100) = 0.025
    //   v_between   = 2.25 - 0.025 = 2.225
    //   alpha       = m² / v_between = 6.25 / 2.225 = 2.808988764044944
    //   beta        = m  / v_between = 2.5  / 2.225 = 1.123595505617978
    const dispersed: readonly RateSample[] = [
      { games: 100, total: 100 },
      { games: 100, total: 400 },
      { games: 100, total: 100 },
      { games: 100, total: 400 },
    ];
    const prior = fitGroupPrior(dispersed);
    expect(prior).not.toBeNull();
    const fitted = prior as GammaPrior;
    expect(fitted.alpha).toBeCloseTo(6.25 / 2.225, PRECISION);
    expect(fitted.beta).toBeCloseTo(2.5 / 2.225, PRECISION);
    // Method-of-moments identity, independent of the code path: mean = m.
    expect(fitted.alpha / fitted.beta).toBeCloseTo(2.5, PRECISION);
    // …and variance = alpha/beta² = m/beta = v_between.
    expect(fitted.alpha / (fitted.beta * fitted.beta)).toBeCloseTo(2.225, PRECISION);
  });

  it("throws rather than imputing when a slate row is unusable", () => {
    // Fail-closed at the fit seam: a zero-games row and a NaN row are BAD
    // data, distinct from the empty slate's NO data. Neither is defaulted.
    expect(() => fitGroupPrior([{ games: 0, total: 0 }])).toThrow(RangeError);
    expect(() => fitGroupPrior([{ games: 10, total: Number.NaN }])).toThrow(RangeError);
  });
});

// ── family 2: props-hb-air-yac.ts · fitAirYacPriors ─────────────────────────

describe("EV14 · fitAirYacPriors — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate", () => {
    const emptySlate: readonly AirYacSample[] = [];
    pinEmptySlate(emptySlate, fitAirYacPriors);
  });

  it("returns null for 8 receivers at IDENTICAL air- and YAC-per-catch rates", () => {
    // 40 air yards and 15 YAC over 5 receptions ⇒ 8.0 air/catch and 3.0
    // YAC/catch for every receiver. Both legs degenerate, so both underlying
    // fitGroupPrior calls return null and the pair refuses.
    const identical = repeat(8, { receptions: 5, airYards: 40, yac: 15 });
    expect(identical).toHaveLength(8);
    expect(fitAirYacPriors(identical)).toBeNull();
  });

  it("returns null when only ONE leg degenerates — a half-fit is never returned", () => {
    // Air yards are genuinely dispersed here (1 vs 4 per catch) but YAC is
    // identical across all four receivers. The module refuses the PAIR rather
    // than shipping a real air prior beside a fabricated YAC prior.
    const halfDegenerate: readonly AirYacSample[] = [
      { receptions: 100, airYards: 100, yac: 300 },
      { receptions: 100, airYards: 400, yac: 300 },
      { receptions: 100, airYards: 100, yac: 300 },
      { receptions: 100, airYards: 400, yac: 300 },
    ];
    expect(fitAirYacPriors(halfDegenerate)).toBeNull();
  });

  it("returns null for a single-receiver slate", () => {
    expect(fitAirYacPriors([{ receptions: 5, airYards: 40, yac: 15 }])).toBeNull();
  });

  it("returns null when every receiver has zero air yards and zero YAC", () => {
    expect(fitAirYacPriors(repeat(3, { receptions: 5, airYards: 0, yac: 0 }))).toBeNull();
  });

  it("DOES fit both priors on a dispersed slate — proving null is a live branch", () => {
    // Exposure is receptions, not games. Four receivers, 100 receptions each:
    //   air rates   = 1, 4, 1, 4  ⇒ m = 2.5, var = 2.25, samplingVar = 0.025
    //                 v_between = 2.225 ⇒ alpha = 6.25/2.225, beta = 2.5/2.225
    //   yac rates   = 2, 8, 2, 8  ⇒ m = 5,   var = 9,    samplingVar = 0.05
    //                 v_between = 8.95  ⇒ alpha = 25/8.95, beta = 5/8.95
    const dispersed: readonly AirYacSample[] = [
      { receptions: 100, airYards: 100, yac: 200 },
      { receptions: 100, airYards: 400, yac: 800 },
      { receptions: 100, airYards: 100, yac: 200 },
      { receptions: 100, airYards: 400, yac: 800 },
    ];
    const priors = fitAirYacPriors(dispersed);
    expect(priors).not.toBeNull();
    const { air, yac } = priors as { air: GammaPrior; yac: GammaPrior };
    expect(air.alpha).toBeCloseTo(6.25 / 2.225, PRECISION);
    expect(air.beta).toBeCloseTo(2.5 / 2.225, PRECISION);
    expect(yac.alpha).toBeCloseTo(25 / 8.95, PRECISION);
    expect(yac.beta).toBeCloseTo(5 / 8.95, PRECISION);
    // Prior means recover the pooled per-catch rates exactly.
    expect(air.alpha / air.beta).toBeCloseTo(2.5, PRECISION);
    expect(yac.alpha / yac.beta).toBeCloseTo(5, PRECISION);
  });

  it("throws rather than imputing on a zero-reception or NaN row", () => {
    // Zero receptions is zero EXPOSURE, not a 0-yard receiver.
    expect(() => fitAirYacPriors([{ receptions: 0, airYards: 0, yac: 0 }])).toThrow(RangeError);
    expect(() => fitAirYacPriors([{ receptions: 5, airYards: Number.NaN, yac: 10 }])).toThrow(RangeError);
  });
});

// ── family 3: props-hb-comp.ts · fitCompletionPrior (Beta family) ───────────

describe("EV14 · fitCompletionPrior — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate", () => {
    const emptySlate: readonly CompSample[] = [];
    pinEmptySlate(emptySlate, fitCompletionPrior);
  });

  it("returns null for 8 passers at an IDENTICAL completion rate", () => {
    // BETA-FAMILY DEGENERATE PIN (actual, executed behavior — null).
    // 20 completions on 30 attempts ⇒ 0.6667 for every passer.
    //   m           = 160 / 240 = 2/3
    //   var(rate_i) = 0
    //   samplingVar = m(1-m)/30 = (2/3)(1/3)/30 ≈ 0.00741
    //   v_between   = max(0, 0 - 0.00741) = 0 ⇒ below the degeneracy floor
    // Concentration = m(1-m)/v_between - 1 would diverge; the fit refuses.
    const identical = repeat(8, { attempts: 30, completions: 20 });
    expect(identical).toHaveLength(8);
    expect(fitCompletionPrior(identical)).toBeNull();
  });

  it("returns null for a single-passer slate", () => {
    expect(fitCompletionPrior([{ attempts: 30, completions: 20 }])).toBeNull();
  });

  it("returns null at the rate boundaries — pooled m = 0 and pooled m = 1", () => {
    // A Beta prior needs m strictly inside (0,1). An all-incompletions slate
    // and an all-completions slate are both refused rather than clamped to a
    // near-boundary prior.
    expect(fitCompletionPrior(repeat(8, { attempts: 30, completions: 0 }))).toBeNull();
    expect(fitCompletionPrior(repeat(8, { attempts: 30, completions: 30 }))).toBeNull();
  });

  it("DOES fit a real prior on a dispersed slate — proving null is a live branch", () => {
    // Four passers, 100 attempts each, completion rates 0.4 / 0.8 / 0.4 / 0.8:
    //   m             = 240 / 400 = 0.6
    //   var(rate_i)   = mean(0.2², 0.2², 0.2², 0.2²) = 0.04
    //   samplingVar   = m(1-m)/100 = 0.24 / 100 = 0.0024
    //   v_between     = 0.04 - 0.0024 = 0.0376
    //   concentration = m(1-m)/v_between - 1 = 0.24/0.0376 - 1 = 5.382978723404255
    //   alpha         = 0.6 * concentration = 3.229787234042553
    //   beta          = 0.4 * concentration = 2.153191489361702
    const concentration = 0.24 / 0.0376 - 1;
    const dispersed: readonly CompSample[] = [
      { attempts: 100, completions: 40 },
      { attempts: 100, completions: 80 },
      { attempts: 100, completions: 40 },
      { attempts: 100, completions: 80 },
    ];
    const prior = fitCompletionPrior(dispersed);
    expect(prior).not.toBeNull();
    const fitted = prior as BetaPrior;
    expect(fitted.alpha).toBeCloseTo(0.6 * concentration, PRECISION);
    expect(fitted.beta).toBeCloseTo(0.4 * concentration, PRECISION);
    // Beta mean alpha/(alpha+beta) recovers the pooled completion rate.
    expect(fitted.alpha / (fitted.alpha + fitted.beta)).toBeCloseTo(0.6, PRECISION);
  });

  it("throws rather than imputing on a zero-attempt or NaN row", () => {
    // A healthy scratch (0 attempts) is zero opportunity, not a 0% passer.
    expect(() => fitCompletionPrior([{ attempts: 0, completions: 0 }])).toThrow(RangeError);
    expect(() => fitCompletionPrior([{ attempts: 30, completions: Number.NaN }])).toThrow(RangeError);
  });
});

// ── family 4: props-hb-int.ts · fitIntPerAttemptPrior ──────────────────────

describe("EV14 · fitIntPerAttemptPrior — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate", () => {
    const emptySlate: readonly IntSample[] = [];
    pinEmptySlate(emptySlate, fitIntPerAttemptPrior);
  });

  it("returns null for 8 passers at an IDENTICAL INT-per-attempt rate", () => {
    // 1 INT on 30 attempts ⇒ 1/30 for every passer; zero between-player
    // variance, so there is no extra-Poisson dispersion to fit. Callers fall
    // back to the pooled mean via intProbZeroPoisson, per the module header.
    const identical = repeat(8, { attempts: 30, ints: 1 });
    expect(identical).toHaveLength(8);
    expect(fitIntPerAttemptPrior(identical)).toBeNull();
  });

  it("returns null for a single-passer slate", () => {
    expect(fitIntPerAttemptPrior([{ attempts: 30, ints: 1 }])).toBeNull();
  });

  it("returns null for a slate with zero interceptions anywhere", () => {
    expect(fitIntPerAttemptPrior(repeat(4, { attempts: 30, ints: 0 }))).toBeNull();
  });

  it("DOES fit a real prior on a dispersed slate — proving null is a live branch", () => {
    // Four passers, 100 attempts each, INT rates 0.02 / 0.10 / 0.02 / 0.10:
    //   m           = 24 / 400 = 0.06
    //   var(rate_i) = mean(0.04², 0.04², 0.04², 0.04²) = 0.0016
    //   samplingVar = mean(0.02/100, 0.10/100, 0.02/100, 0.10/100) = 0.0006
    //   v_between   = 0.0016 - 0.0006 = 0.001
    //   alpha       = 0.06² / 0.001 = 3.6
    //   beta        = 0.06  / 0.001 = 60
    const dispersed: readonly IntSample[] = [
      { attempts: 100, ints: 2 },
      { attempts: 100, ints: 10 },
      { attempts: 100, ints: 2 },
      { attempts: 100, ints: 10 },
    ];
    const prior = fitIntPerAttemptPrior(dispersed);
    expect(prior).not.toBeNull();
    const fitted = prior as GammaPrior;
    expect(fitted.alpha).toBeCloseTo(3.6, PRECISION);
    expect(fitted.beta).toBeCloseTo(60, PRECISION);
    expect(fitted.alpha / fitted.beta).toBeCloseTo(0.06, PRECISION);
  });

  it("throws rather than imputing on a zero-attempt or NaN row", () => {
    expect(() => fitIntPerAttemptPrior([{ attempts: 0, ints: 0 }])).toThrow(RangeError);
    expect(() => fitIntPerAttemptPrior([{ attempts: 30, ints: Number.NaN }])).toThrow(RangeError);
  });
});

// ── family 5: props-hb-pass-td.ts · fitPassTdPerAttemptPrior ───────────────

describe("EV14 · fitPassTdPerAttemptPrior — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate", () => {
    const emptySlate: readonly PassTdSample[] = [];
    pinEmptySlate(emptySlate, fitPassTdPerAttemptPrior);
  });

  it("returns null for 8 passers at an IDENTICAL pass-TD-per-attempt rate", () => {
    // 2 pass TDs on 30 attempts ⇒ 1/15 for every passer — no dispersion to
    // fit, so the Poisson fallback at the pooled mean is the honest answer.
    const identical = repeat(8, { attempts: 30, passTds: 2 });
    expect(identical).toHaveLength(8);
    expect(fitPassTdPerAttemptPrior(identical)).toBeNull();
  });

  it("returns null for a single-passer slate", () => {
    expect(fitPassTdPerAttemptPrior([{ attempts: 30, passTds: 2 }])).toBeNull();
  });

  it("returns null for a slate with zero pass TDs anywhere", () => {
    expect(fitPassTdPerAttemptPrior(repeat(4, { attempts: 30, passTds: 0 }))).toBeNull();
  });

  it("DOES fit a real prior on a dispersed slate — proving null is a live branch", () => {
    // Four passers, 50 attempts each, TD rates 0.02 / 0.10 / 0.02 / 0.10:
    //   m           = 12 / 200 = 0.06
    //   var(rate_i) = 0.0016
    //   samplingVar = mean(0.02/50, 0.10/50, 0.02/50, 0.10/50) = 0.0012
    //   v_between   = 0.0016 - 0.0012 = 0.0004
    //   alpha       = 0.06² / 0.0004 = 9
    //   beta        = 0.06  / 0.0004 = 150
    const dispersed: readonly PassTdSample[] = [
      { attempts: 50, passTds: 1 },
      { attempts: 50, passTds: 5 },
      { attempts: 50, passTds: 1 },
      { attempts: 50, passTds: 5 },
    ];
    const prior = fitPassTdPerAttemptPrior(dispersed);
    expect(prior).not.toBeNull();
    const fitted = prior as GammaPrior;
    expect(fitted.alpha).toBeCloseTo(9, PRECISION);
    expect(fitted.beta).toBeCloseTo(150, PRECISION);
    expect(fitted.alpha / fitted.beta).toBeCloseTo(0.06, PRECISION);
  });

  it("throws rather than imputing on a zero-attempt or NaN row", () => {
    expect(() => fitPassTdPerAttemptPrior([{ attempts: 0, passTds: 0 }])).toThrow(RangeError);
    expect(() => fitPassTdPerAttemptPrior([{ attempts: 30, passTds: Number.NaN }])).toThrow(RangeError);
  });
});

// ── family 6: props-hb-sacks.ts · fitSackPrior (Beta family) ───────────────

describe("EV14 · fitSackPrior — empty slate and degenerate dispersion", () => {
  it("returns null for an empty slate", () => {
    const emptySlate: readonly SackSample[] = [];
    pinEmptySlate(emptySlate, fitSackPrior);
  });

  it("returns null for 8 passers at an IDENTICAL sack rate", () => {
    // BETA-FAMILY DEGENERATE PIN (actual, executed behavior — null).
    // 3 sacks on 40 dropbacks ⇒ 0.075 for every passer; v_between collapses
    // to the noise floor and the concentration parameter would diverge.
    const identical = repeat(8, { dropbacks: 40, sacks: 3 });
    expect(identical).toHaveLength(8);
    expect(fitSackPrior(identical)).toBeNull();
  });

  it("returns null for a single-passer slate", () => {
    expect(fitSackPrior([{ dropbacks: 40, sacks: 3 }])).toBeNull();
  });

  it("returns null at the rate boundaries — pooled m = 0 and pooled m = 1", () => {
    expect(fitSackPrior(repeat(4, { dropbacks: 40, sacks: 0 }))).toBeNull();
    expect(fitSackPrior(repeat(3, { dropbacks: 40, sacks: 40 }))).toBeNull();
  });

  it("DOES fit a real prior on a dispersed slate — proving null is a live branch", () => {
    // Four passers, 100 dropbacks each, sack rates 0.04 / 0.12 / 0.04 / 0.12:
    //   m             = 32 / 400 = 0.08
    //   var(rate_i)   = mean(0.04², 0.04², 0.04², 0.04²) = 0.0016
    //   samplingVar   = m(1-m)/100 = 0.0736 / 100 = 0.000736
    //   v_between     = 0.0016 - 0.000736 = 0.000864
    //   concentration = 0.0736/0.000864 - 1 = 84.18518518518519
    //   alpha         = 0.08 * concentration = 6.734814814814815
    //   beta          = 0.92 * concentration = 77.45037037037038
    const concentration = 0.0736 / 0.000864 - 1;
    const dispersed: readonly SackSample[] = [
      { dropbacks: 100, sacks: 4 },
      { dropbacks: 100, sacks: 12 },
      { dropbacks: 100, sacks: 4 },
      { dropbacks: 100, sacks: 12 },
    ];
    const prior = fitSackPrior(dispersed);
    expect(prior).not.toBeNull();
    const fitted = prior as BetaPrior;
    expect(fitted.alpha).toBeCloseTo(0.08 * concentration, PRECISION);
    expect(fitted.beta).toBeCloseTo(0.92 * concentration, PRECISION);
    expect(fitted.alpha / (fitted.alpha + fitted.beta)).toBeCloseTo(0.08, PRECISION);
  });

  it("throws rather than imputing on a zero-dropback or NaN row", () => {
    // A healthy scratch (0 dropbacks) is zero opportunity, not a 0% sacked passer.
    expect(() => fitSackPrior([{ dropbacks: 0, sacks: 0 }])).toThrow(RangeError);
    expect(() => fitSackPrior([{ dropbacks: 40, sacks: Number.NaN }])).toThrow(RangeError);
  });
});

// ── cross-family sweep ─────────────────────────────────────────────────────

describe("EV14 · cross-family empty-slate sweep", () => {
  /**
   * The whole contract in one table: every fit named by the card, called with
   * its own empty slate. A new prop family that forgets this contract has to
   * be added here (and will fail here) before it can ship a fabricated prior.
   */
  const emptyCalls: readonly { readonly name: string; readonly call: () => unknown }[] = [
    { name: "fitGroupPrior", call: () => fitGroupPrior([]) },
    { name: "fitAirYacPriors", call: () => fitAirYacPriors([]) },
    { name: "fitCompletionPrior", call: () => fitCompletionPrior([]) },
    { name: "fitIntPerAttemptPrior", call: () => fitIntPerAttemptPrior([]) },
    { name: "fitPassTdPerAttemptPrior", call: () => fitPassTdPerAttemptPrior([]) },
    { name: "fitSackPrior", call: () => fitSackPrior([]) },
  ];

  it("covers all six fits named by the card", () => {
    expect(emptyCalls.map((c) => c.name)).toEqual([
      "fitGroupPrior",
      "fitAirYacPriors",
      "fitCompletionPrior",
      "fitIntPerAttemptPrior",
      "fitPassTdPerAttemptPrior",
      "fitSackPrior",
    ]);
  });

  it.each(emptyCalls)("$name([]) returns null — never a fabricated prior", ({ call }) => {
    // An empty slate must never throw either: zero rows is "no data," which is
    // a returned null, not bad data (which is the RangeError path pinned above).
    expect(call()).toBeNull();
  });
});
