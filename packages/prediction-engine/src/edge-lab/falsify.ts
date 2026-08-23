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
  readonly verdict: "PASS" | "KILLED" | "STARVED";
  readonly detail: string;
}

export interface FalsifyOutput {
  readonly leakage: KillResult;
  readonly shuffle: KillResult;
  readonly split: KillResult;
  readonly multiplicity: KillResult;
  readonly overall: { readonly verdict: "SURVIVOR" | "KILLED" | "STARVED"; readonly reason: string };
}

export interface FalsifyOpts {
  readonly minN?: number;
  readonly shuffleB?: number;
  readonly seed?: number;
}

function defaultOpts(o?: FalsifyOpts): Required<FalsifyOpts> {
  return { minN: 100, shuffleB: 200, seed: 42, ...o };
}

function effectSize(rows: readonly BacktestRow[]): number {
  const sum = rows.reduce((a, r) => a + (r.outcome - (r.marketProb ?? 0.5)), 0);
  return sum / rows.length;
}

export function falsifyBind(rows: readonly BacktestRow[], opts?: FalsifyOpts): FalsifyOutput {
  const o = defaultOpts(opts);
  const n = rows.length;

  // LEAKAGE
  const leakRow = rows.find((r) => r.knownAtWeek >= r.outcomeWeek);
  const leakage: KillResult = leakRow
    ? { verdict: "KILLED", detail: `lookahead at season=${leakRow.season} week=${leakRow.outcomeWeek}` }
    : { verdict: "PASS", detail: "no knownAtWeek >= outcomeWeek" };

  // STARVATION gate
  if (n < o.minN) {
    const starved = { verdict: "STARVED" as const, detail: `n=${n} < minN=${o.minN}` };
    return {
      leakage,
      shuffle: starved,
      split: starved,
      multiplicity: starved,
      overall: { verdict: "STARVED", reason: `n < minN` },
    };
  }

  // SHUFFLE (permutation test, deterministic seeded PRNG)
  const origES = effectSize(rows);
  const prng = mulberry32(o.seed);
  let survive = 0;
  for (let b = 0; b < o.shuffleB; b++) {
    const perm = [...rows];
    // Fisher-Yates shuffle using deterministic PRNG
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    const permES = effectSize(perm);
    // "original >= 95th percentile survives" => PASS if original >= 95th perc
    if (Math.abs(origES) >= Math.abs(permES)) survive++;
  }
  const p95 = (o.shuffleB * 0.95);
  const shuffle: KillResult = survive >= p95
    ? { verdict: "PASS", detail: `original effect=${origES.toFixed(3)} survives ${survive}/${o.shuffleB} perm > p95` }
    : { verdict: "KILLED", detail: `original effect=${origES.toFixed(3)} fails shuffle (${survive}/${o.shuffleB})` };

  // SPLIT STABILITY: split rows chronologically into two halves by row count (not season)
  const sorted = [...rows].sort((a, b) => (a.season - b.season) || (a.outcomeWeek - b.outcomeWeek) || (a.knownAtWeek - b.knownAtWeek));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const esA = effectSize(firstHalf);
  const esB = effectSize(secondHalf);
  const sameSign = (esA > 0 ? 1 : esA < 0 ? -1 : 0) === (esB > 0 ? 1 : esB < 0 ? -1 : 0);
  const splitPass = sameSign;
  const splitDetail = `firstHalf=${esA.toFixed(3)} secondHalf=${esB.toFixed(3)} signMatch=${sameSign}`;
  const split: KillResult = splitPass
    ? { verdict: "PASS", detail: splitDetail }
    : { verdict: "KILLED", detail: splitDetail };

  // MULTIPLICITY (wire existing e-process from bernoulli-eprocess.ts)
  // Per-edge Bernoulli e-value: after each game, factor clipped to [0.5,2]
  // e *= (p_model/(1-p_model)) / (q/(1-q)) clipped per observation
  const pHats = rows.map((r) => Math.max(0.01, Math.min(0.99, r.modelProb)));
  const pMkts = rows.map((r) => Math.max(0.01, Math.min(0.99, r.marketProb ?? 0.5)));
  const ys = rows.map((r) => r.outcome as 0 | 1);
  const epRes = eProcess(pHats, pMkts, ys);
  let eValue = 1;
  if (epRes && epRes.series.length > 0) {
    eValue = epRes.series[epRes.series.length - 1]!;
  }
  // Fallback clipped simple accumulator (same spec as user directive)
  let simpleE = 1;
  for (let i = 0; i < rows.length; i++) {
    const p = pHats[i]!, q = pMkts[i]!, y = ys[i]!;
    const factor = y === 1 ? (p / q) : ((1 - p) / (1 - q));
    const clipped = Math.max(0.5, Math.min(2, factor));
    simpleE *= clipped;
  }
  const growing = simpleE > 1 && (epRes ? epRes.M > 1 : false);
  const multiplicity: KillResult = growing && simpleE >= 1
    ? { verdict: "PASS", detail: `e-process M=${(epRes?.M ?? simpleE).toFixed(3)} growing, simpleE=${simpleE.toFixed(3)}` }
    : { verdict: "KILLED", detail: `e-value decayed M=${(epRes?.M ?? simpleE).toFixed(3)} (not growing/survivor)` };

  const allPass = [leakage, shuffle, split, multiplicity].every((k) => k.verdict === "PASS");
  const overallVerdict = allPass ? "SURVIVOR" : "KILLED";
  const reason = allPass ? "all 4 PASS" : [leakage, shuffle, split, multiplicity].filter((k) => k.verdict === "KILLED").map((k) => k.detail).join("; ");

  return {
    leakage,
    shuffle,
    split,
    multiplicity,
    overall: { verdict: overallVerdict, reason },
  };
}
