/** Falsifier — 4 kill tests over a bind's backtest rows (Wave 3, LANE B). */
import { eProcess, mulberry32 } from "../bernoulli-eprocess.js";

export interface BacktestRow {
  readonly knownAtWeek: number;
  readonly outcomeWeek: number;
  readonly season: number;
  readonly outcome: number; // 0/1 binary
  readonly modelProb: number; // p_hat, [0,1]
  readonly marketProb?: number; // q (optional), defaults to 0.5
}

export interface KillResult {
  readonly verdict: "PASS" | "KILLED" | "STARVED" | "PARKED";
  readonly detail: string;
}

export interface FalsifyOutput {
  readonly leakage: KillResult;
  readonly shuffle: KillResult;
  readonly split: KillResult;
  readonly multiplicity: KillResult;
  readonly overall: { readonly verdict: "SURVIVOR" | "KILLED" | "STARVED" | "PARKED"; readonly reason: string };
}

export interface FalsifyOpts {
  readonly minN?: number;
  readonly shuffleB?: number;
  readonly seed?: number;
}

function defaultOpts(o?: FalsifyOpts): Required<FalsifyOpts> {
  return { minN: 100, shuffleB: 200, seed: 42, ...o };
}

/**
 * Outcome base rate relative to the market, averaged over rows.
 *
 * Retained for REPORTING only. It does not read `modelProb`, so it says nothing
 * about whether the model has skill — it is a property of the outcome column.
 * It must never again be the statistic a kill test decides on; see
 * `meanLogLikRatio`.
 */
function effectSize(rows: readonly BacktestRow[]): number {
  const sum = rows.reduce((a, r) => a + (r.outcome - (r.marketProb ?? 0.5)), 0);
  return sum / rows.length;
}

/**
 * Mean per-row log-likelihood ratio of the model against the market — the
 * statistic the e-process is built on, averaged so it is comparable across
 * sample sizes.
 *
 *   LLR = (1/n) Σ [ y·log(p/q) + (1−y)·log((1−p)/(1−q)) ]
 *
 * Positive → the model's probabilities beat the market's on the realized
 * outcomes. Negative → worse than the market.
 *
 * This is the piece that was missing: a kill test built on `effectSize` alone
 * cannot see `modelProb` at all, so it returns identical verdicts for a
 * pure-noise model, a perfect oracle and a perfectly inverted one, and can
 * never refute anything.
 */
function meanLogLikRatio(
  ys: readonly (0 | 1)[],
  pHats: readonly number[],
  pMkts: readonly number[],
): number {
  if (ys.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < ys.length; i++) {
    const p = pHats[i]!, q = pMkts[i]!, y = ys[i]!;
    acc += y === 1 ? Math.log(p / q) : Math.log((1 - p) / (1 - q));
  }
  return acc / ys.length;
}

/** True when every outcome is identical — label permutation is then vacuous. */
function outcomesAreConstant(ys: readonly (0 | 1)[]): boolean {
  if (ys.length === 0) return true;
  const first = ys[0]!;
  return ys.every((y) => y === first);
}

export function falsifyBind(rows: readonly BacktestRow[], opts?: FalsifyOpts): FalsifyOutput {
  const o = defaultOpts(opts);
  const n = rows.length;

  // LEAKAGE
  const leakRow = rows.find((r) => r.knownAtWeek >= r.outcomeWeek);
  const leakage: KillResult = leakRow
    ? { verdict: "KILLED", detail: `lookahead at season=${leakRow.season} week=${leakRow.outcomeWeek}` }
    : { verdict: "PASS", detail: "no knownAtWeek >= outcomeWeek" };

  // STARVATION gate: small n preserves e-value and returns PARKED (not STARVED) when gates ran clean
  let starvedParkedDetail = `n=${n} < minN=${o.minN}`;
  let starvedVerdicts = { leakage, shuffle: { verdict: "PASS" as const, detail: "unrun (n < minN)" }, split: { verdict: "PASS" as const, detail: "unrun (n < minN)" }, multiplicity: { verdict: "PASS" as const, detail: "unrun (n < minN)" } };

  // First compute leakage regardless of n (leakage doesn't depend on n)
  // Then for small n, still compute e-value so it's preserved in PARKED detail
  const pHats = rows.map((r) => Math.max(0.01, Math.min(0.99, r.modelProb)));
  const pMkts = rows.map((r) => Math.max(0.01, Math.min(0.99, r.marketProb ?? 0.5)));
  const ys = rows.map((r) => r.outcome as 0 | 1);
  const epRes = eProcess(pHats, pMkts, ys);
  let eValue = 1;
  if (epRes && epRes.series.length > 0) {
    eValue = epRes.series[epRes.series.length - 1]!;
  }
  let simpleE = 1;
  for (let i = 0; i < rows.length; i++) {
    const p = pHats[i]!, q = pMkts[i]!, y = ys[i]!;
    const factor = y === 1 ? (p / q) : ((1 - p) / (1 - q));
    const clipped = Math.max(0.5, Math.min(2, factor));
    simpleE *= clipped;
  }
  starvedParkedDetail += `; e=${eValue.toFixed(3)}`;

  if (n < o.minN) {
    // For actual refutation failures (leakage KILLED) keep KILLED; else PARKED
    const starvedLeak = leakage.verdict === "KILLED" ? leakage : { verdict: "PASS" as const, detail: "no knownAtWeek >= outcomeWeek" };
    const overallStarvedVerdict: "PARKED" | "KILLED" = (leakage.verdict === "KILLED") ? "KILLED" : "PARKED";
    const overallReason = (leakage.verdict === "KILLED")
      ? leakage.detail
      : `starved bind (n=${n} < minN=${o.minN}) — e-value preserved e=${eValue.toFixed(3)}; gates did not refute`;
    return {
      leakage: starvedLeak,
      shuffle: { verdict: "PASS" as const, detail: `unrun (n < minN) — e=${eValue.toFixed(3)}` },
      split: { verdict: "PASS" as const, detail: `unrun (n < minN) — e=${eValue.toFixed(3)}` },
      multiplicity: { verdict: "PASS" as const, detail: `unrun (n < minN) — e=${eValue.toFixed(3)}` },
      overall: { verdict: overallStarvedVerdict, reason: overallReason },
    };
  }

  // SHUFFLE — label-permutation test, deterministic seeded PRNG.
  //
  // The null is "the model's probabilities carry no information about the
  // outcomes", so the OUTCOME LABELS are permuted against fixed (modelProb,
  // marketProb) pairs. Permuting whole rows instead — as this did previously —
  // leaves any row-set mean unchanged, which made the comparison `abs(x) >= abs(x)`
  // and the test incapable of ever firing.
  //
  // One-sided by design: a two-sided |statistic| comparison would credit a
  // perfectly ANTI-predictive model, which is the opposite of what an edge funnel
  // should accept.
  const origES = effectSize(rows); // reported for context only — not the decision
  const origStat = meanLogLikRatio(ys, pHats, pMkts);
  const degenerateOutcomes = outcomesAreConstant(ys);
  let shuffle: KillResult;
  if (degenerateOutcomes) {
    // Every permutation equals the original, so the test carries zero
    // information. Saying PASS here would be the same silent rubber-stamp the
    // permute-the-rows bug produced. STARVED is the honest verdict.
    shuffle = {
      verdict: "STARVED",
      detail:
        `outcome vector is constant (all ${ys[0] ?? 0}) — label permutation is ` +
        `vacuous, test carries no information; modelLLR=${origStat.toFixed(4)}/row`,
    };
  } else {
    const prng = mulberry32(o.seed);
    const permYs: (0 | 1)[] = [...ys];
    let survive = 0;
    for (let b = 0; b < o.shuffleB; b++) {
      // Fisher-Yates over the LABELS, deterministic PRNG
      for (let i = permYs.length - 1; i > 0; i--) {
        const j = Math.floor(prng() * (i + 1));
        const t = permYs[i]!; permYs[i] = permYs[j]!; permYs[j] = t;
      }
      const permStat = meanLogLikRatio(permYs, pHats, pMkts);
      if (origStat >= permStat) survive++;
    }
    const p95 = o.shuffleB * 0.95;
    shuffle = survive >= p95
      ? {
          verdict: "PASS",
          detail:
            `model LLR=${origStat.toFixed(4)}/row beats ${survive}/${o.shuffleB} ` +
            `label permutations (>= p95); baseRateEffect=${origES.toFixed(3)}`,
        }
      : {
          verdict: "KILLED",
          detail:
            `model LLR=${origStat.toFixed(4)}/row beats only ${survive}/${o.shuffleB} ` +
            `label permutations (< p95); baseRateEffect=${origES.toFixed(3)}`,
        };
  }

  // SPLIT STABILITY: chronological halves, compared on the MODEL-AWARE statistic.
  //
  // Previously this compared `effectSize` per half, which asks only whether the
  // OUTCOME BASE RATE sits on the same side of the market in both halves — a
  // property of the outcome column that a model cannot influence. What the gate
  // is for is whether the MODEL's edge holds up across time, so both halves are
  // now scored with the same per-row LLR the shuffle test uses.
  const sorted = [...rows].sort((a, b) => (a.season - b.season) || (a.outcomeWeek - b.outcomeWeek) || (a.knownAtWeek - b.knownAtWeek));
  const mid = Math.floor(sorted.length / 2);
  const halfStat = (rs: readonly BacktestRow[]): number =>
    meanLogLikRatio(
      rs.map((r) => r.outcome as 0 | 1),
      rs.map((r) => Math.max(0.01, Math.min(0.99, r.modelProb))),
      rs.map((r) => Math.max(0.01, Math.min(0.99, r.marketProb ?? 0.5))),
    );
  const esA = halfStat(sorted.slice(0, mid));
  const esB = halfStat(sorted.slice(mid));
  const sameSign = (esA > 0 ? 1 : esA < 0 ? -1 : 0) === (esB > 0 ? 1 : esB < 0 ? -1 : 0);
  const splitDetail =
    `firstHalfLLR=${esA.toFixed(4)} secondHalfLLR=${esB.toFixed(4)} signMatch=${sameSign}`;
  const split: KillResult = sameSign
    ? { verdict: "PASS", detail: splitDetail }
    : { verdict: "KILLED", detail: splitDetail };

  // MULTIPLICITY (reuse precomputed eValue/simpleE from starvation gate; computed regardless of n)
  //
  // NOTE ON THE STATISTIC — this gate reads TERMINAL wealth `M`, not the running
  // maximum `supM`. bernoulli-eprocess.ts's own header states the Ville result as
  // `P(exists t: M_t >= 1/alpha) <= alpha` and says "supM is the statistic, not
  // only terminal M". A bind whose wealth crosses the threshold early and then
  // decays therefore lands here as KILLED on its terminal value.
  //
  // That direction is CONSERVATIVE — it can over-kill, never over-pass — so it is
  // left in force. What is not acceptable is erasing the crossing from the record:
  // a run that peaked at supM=3e24 previously reported only "e-value decayed
  // M=0.000", which reads as "never had evidence" and is indistinguishable from a
  // bind that never moved. `supM` is now carried in the detail either way.
  // Whether the DECISION should switch to supM is a separate, deliberate call —
  // see docs/ops/edge/2026-08-26-falsifier-kill-test-audit.md.
  const supM = epRes?.supM ?? simpleE;
  const growing = simpleE > 1 && (epRes ? epRes.M > 1 : false);
  const multiplicity: KillResult = growing && simpleE >= 1
    ? {
        verdict: "PASS",
        detail:
          `e-process M=${(epRes?.M ?? simpleE).toFixed(3)} growing ` +
          `(peak supM=${supM.toExponential(3)}), simpleE=${simpleE.toFixed(3)}`,
      }
    : {
        verdict: "KILLED",
        detail:
          `e-value decayed M=${(epRes?.M ?? simpleE).toFixed(3)} (not growing/survivor; ` +
          `peak supM=${supM.toExponential(3)} — decision reads terminal M, not supM)`,
      };

  // A gate that could not discriminate is NOT a gate that passed. Ordering:
  // any KILLED refutes outright; otherwise an uninformative (STARVED) gate means
  // the funnel never actually tested the bind, which is PARKED, not SURVIVOR.
  const gates = [leakage, shuffle, split, multiplicity];
  const killed = gates.filter((k) => k.verdict === "KILLED");
  const starved = gates.filter((k) => k.verdict === "STARVED");
  const overallVerdict: FalsifyOutput["overall"]["verdict"] =
    killed.length > 0 ? "KILLED" : starved.length > 0 ? "PARKED" : "SURVIVOR";
  const reason =
    killed.length > 0
      ? killed.map((k) => k.detail).join("; ")
      : starved.length > 0
        ? `gates did not refute, but ${starved.length} gate(s) carried no information: ` +
          starved.map((k) => k.detail).join("; ")
        : "all 4 PASS";

  return {
    leakage,
    shuffle,
    split,
    multiplicity,
    overall: { verdict: overallVerdict, reason },
  };
}
