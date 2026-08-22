import { describe, expect, it } from "vitest";
import {
  SEP_BIND_METHOD_TAG,
  bindSepSamples,
  boundSepSamples,
  type SepBindRequest,
  type SepBindResult,
} from "../props-hb-adot-sep-bind.js";
import { fitAdotSepCatchPriors, posteriorAdotSepCatch } from "../props-hb-adot-sep.js";
import type { CovariateRow } from "../covariate-bus.js";

function ngsRow(o: Partial<CovariateRow>): CovariateRow {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    week: 1,
    statType: "receiving",
    avgSeparation: 2.5,
    avgCushion: 4.0,
    airYardsShare: 0.18,
    avgTimeToThrow: 2.6,
    aggressiveness: 19.2,
    avgIntendedAirYards: 8.4,
    pctAttemptsGte8Defenders: 0.54,
    avgTimeToLos: 2.2,
    ...o,
  };
}

function req(o: Partial<SepBindRequest>): SepBindRequest {
  return {
    gsisId: "00-0030501-2",
    season: 2024,
    kickoffWeek: 3,
    adot: { targets: 8, receptions: 6, airYards: 16 },
    ...o,
  };
}

describe("sep bind contract", () => {
  it("exposes the v1 method tag", () => {
    expect(SEP_BIND_METHOD_TAG).toBe("sep_bind_v1");
  });

  it("binds the latest prior receiving separation — not same-week, not week=0", () => {
    const rows = [
      ngsRow({ week: 0, avgSeparation: 99 }), // season aggregate — poison
      ngsRow({ week: 2, avgSeparation: 1.4 }),
      ngsRow({ week: 3, avgSeparation: 5.0 }), // same-week as kickoffWeek=3 — ignored
    ];
    const results = bindSepSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(true);
    if (!results[0]!.ok) throw new Error("expected ok");
    expect(results[0]!.sample.avgSeparation).toBe(1.4); // not 99, not 5.0
    expect(results[0]!.priced).toBe(false);
  });

function isDenied(r: SepBindResult): r is Extract<SepBindResult, { ok: false }> {
  return !r.ok;
}

// ... existing describe block

  it("FAILS CLOSED: no prior per-game row → sample dropped, never 3.0 yards", () => {
    const rows = [ngsRow({ week: 0, avgSeparation: 3.0 })]; // only aggregate
    const results = bindSepSamples(rows, [req({ kickoffWeek: 1 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row");
    // The caller never sees a 3.0-yard invention:
    expect(boundSepSamples(rows, [req({ kickoffWeek: 1 })])).toEqual([]);
  });

  it("FAILS CLOSED: null separation on the latest prior row → dropped", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: null })];
    const results = bindSepSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(results.length).toBe(1);
    expect(results[0]!.ok).toBe(false);
    expect(isDenied(results[0]!) ? results[0]!.refuse : "ok").toBe("no_prior_row"); // bus returns null for null field too
  });

  it("preserves aDOT fields (targets/receptions/airYards) on the bound sample", () => {
    const rows = [ngsRow({ week: 2, avgSeparation: 3.4 })];
    const samples = boundSepSamples(rows, [req({ kickoffWeek: 3 })]);
    expect(samples.length).toBe(1);
    expect(samples[0]!.targets).toBe(8);
    expect(samples[0]!.receptions).toBe(6);
    expect(samples[0]!.airYards).toBe(16);
    expect(samples[0]!.avgSeparation).toBe(3.4);
  });

  it("end-to-end: fitted priors accept a fully bus-bound aDOT×SEP cell", () => {
    // Two players; each has a prior receiving row the bus can read (week 1,
    // kickoffWeek=2). Separation is the bus weekly mean — honest, not invented.
    // short_open samples have HIGH variance catch rates (6/8, 1/9, 2/8, 0/7)
    // so fitCatchPrior detects extra-binomial dispersion and emits a prior.
    // deep_tight samples are low catch-rate with variance (0/12, 1/10, 2/9).
    const rows = [
      ngsRow({ gsisId: "00-0000001-1", week: 1, avgSeparation: 3.4 }), // → short_open
      ngsRow({ gsisId: "00-0000002-2", week: 1, avgSeparation: 0.9 }), // → deep_tight
    ];
    const requests: SepBindRequest[] = [
      req({ gsisId: "00-0000001-1", kickoffWeek: 2, adot: { targets: 8,  receptions: 6,  airYards: 16 } }),
      req({ gsisId: "00-0000001-1", kickoffWeek: 2, adot: { targets: 9,  receptions: 1,  airYards: 22 } }),
      req({ gsisId: "00-0000001-1", kickoffWeek: 2, adot: { targets: 8,  receptions: 2,  airYards: 18 } }),
      req({ gsisId: "00-0000001-1", kickoffWeek: 2, adot: { targets: 7,  receptions: 0,  airYards: 21 } }),
      req({ gsisId: "00-0000002-2", kickoffWeek: 2, adot: { targets: 12, receptions: 0,  airYards: 140 } }),
      req({ gsisId: "00-0000002-2", kickoffWeek: 2, adot: { targets: 10, receptions: 1,  airYards: 130 } }),
      req({ gsisId: "00-0000002-2", kickoffWeek: 2, adot: { targets: 9,  receptions: 2,  airYards: 145 } }),
    ];
    const samples = boundSepSamples(rows, requests);
    expect(samples.length).toBe(7); // all bound, none dropped
    const fits = fitAdotSepCatchPriors(samples);
    expect(fits.length).toBeGreaterThanOrEqual(1); // at least one cell has dispersion
    const posts = posteriorAdotSepCatch(fits, samples);
    expect(posts.length).toBe(fits.length);
    // short_open (open coverage) should have a higher catch rate prior than
    // deep_tight (tight coverage).
    const byCell = new Map(fits.map((f) => [f.cell, f.prior]));
    const shortOpen = byCell.get("short_open");
    const deepTight = byCell.get("deep_tight");
    if (shortOpen && deepTight) {
      const shortRate = shortOpen.alpha / (shortOpen.alpha + shortOpen.beta);
      const deepRate = deepTight.alpha / (deepTight.alpha + deepTight.beta);
      expect(shortRate).toBeGreaterThan(deepRate);
    }
  });
});
