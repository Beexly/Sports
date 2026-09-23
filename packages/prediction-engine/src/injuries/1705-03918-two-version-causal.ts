/**
 * arXiv 1705.03918: Causal inference with two versions of treatment
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Situational-factor causal claims (rest, travel, surface, dome) reported as
Ic + Iv interval pairs: games matched on spread/total/Elo form as-if-random
sets, randomization inference gives the additive ATS/spread-residual effect,
Ic is the pooled interval over all games while Iv is the union over version
splits (e.g. rest = [3-4 days] vs [7+ days]), and a Rosenbaum Gamma
sensitivity analysis reports how much hidden bias would tip Iv to cover 0.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Upgrade GSE's situational-factor causal write-ups (rest, travel, surface, dome) to report Ic + Iv pairs: match games on spread/total/Elo to create as-if-random sets (same-team similar-spread games differing in the factor), run randomization inference for the additive ATS/spread-residual effect of the treatment, report Ic (all games) and Iv (union over version splits, e.g., rest = [3-4 days] vs [7+ days]), plus Rosenbaum Gamma sensitivity analysis for hidden bias -- the zero-cost dual-interval construction for every causal claim GSE publishes about situational factors with versions.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if on the rest-advantage replication: Iv width <= 1.4x Ic width AND the Gamma-value tipping Iv to include 0 is >= 1.3.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: causal_injury | verdict: ADAPT | doctrine: SITUATIONAL
 */
export const ENABLED = false; // Gate needs the rest-advantage replication data.

export interface SituGame {
  spread: number;
  total: number;
  eloDiff: number;
  treated: boolean;
  /** Treatment version, e.g. "rest-3-4d" vs "rest-7d-plus". */
  version: string;
  atsResidual: number;
}

export interface MatchedPair {
  treated: SituGame;
  control: SituGame;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1:1 nearest-neighbor matching on standardized [spread, total, eloDiff]. */
export function matchAsIfRandom(games: SituGame[]): MatchedPair[] {
  const cols = [
    games.map((g) => g.spread),
    games.map((g) => g.total),
    games.map((g) => g.eloDiff),
  ].map((v) => {
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length) || 1;
    return { mean, sd };
  });
  const z = (g: SituGame) => [
    (g.spread - cols[0]!.mean) / cols[0]!.sd,
    (g.total - cols[1]!.mean) / cols[1]!.sd,
    (g.eloDiff - cols[2]!.mean) / cols[2]!.sd,
  ];
  const treated = games.filter((g) => g.treated);
  const controls = games.filter((g) => !g.treated);
  const used = new Set<number>();
  const pairs: MatchedPair[] = [];
  for (const tr of treated) {
    const zt = z(tr);
    let best = -1;
    let bd = Infinity;
    controls.forEach((c, i) => {
      if (used.has(i)) return;
      const zc = z(c);
      const d = zt.reduce((sum, v, k) => sum + (v - zc[k]!) ** 2, 0);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best >= 0) {
      used.add(best);
      pairs.push({ treated: tr, control: controls[best]! });
    }
  }
  return pairs;
}

function pairDiffs(pairs: MatchedPair[]): number[] {
  return pairs.map((p) => p.treated.atsResidual - p.control.atsResidual);
}

/** ATT estimate: mean matched-pair difference in ATS residuals. */
export function attEstimate(pairs: MatchedPair[]): number {
  const d = pairDiffs(pairs);
  return d.reduce((a, b) => a + b, 0) / Math.max(d.length, 1);
}

/** Randomization inference: permute treatment labels within pairs. */
export function randomizationInference(
  pairs: MatchedPair[],
  draws: number,
  seed: number,
): { att: number; pValue: number } {
  const diffs = pairDiffs(pairs);
  const att = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const rand = mulberry32(seed);
  let extreme = 0;
  for (let d = 0; d < draws; d++) {
    let s = 0;
    for (const x of diffs) s += (rand() < 0.5 ? -1 : 1) * x;
    if (Math.abs(s / diffs.length) >= Math.abs(att)) extreme++;
  }
  return { att, pValue: (extreme + 1) / (draws + 1) };
}

export interface IcIv {
  /** Pooled interval over all games. */
  ic: [number, number];
  /** Union over version splits. */
  iv: [number, number];
  att: number;
  versions: string[];
}

function meanSe(a: number[]): { mean: number; se: number } {
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(a.length - 1, 1));
  return { mean, se: sd / Math.sqrt(a.length) };
}

/** Ic (all games) + Iv (union over version splits) dual-interval construction. */
export function icIvIntervals(pairs: MatchedPair[]): IcIv {
  const diffs = pairDiffs(pairs);
  const { mean, se } = meanSe(diffs);
  const versions = [...new Set(pairs.map((p) => p.treated.version))];
  const perVersion = versions.map((v) => {
    const dd = pairs
      .filter((p) => p.treated.version === v)
      .map((p) => p.treated.atsResidual - p.control.atsResidual);
    const { mean: m, se: s } = meanSe(dd);
    return [m - 1.96 * s, m + 1.96 * s] as [number, number];
  });
  return {
    ic: [mean - 1.96 * se, mean + 1.96 * se],
    iv: [Math.min(...perVersion.map((w) => w[0])), Math.max(...perVersion.map((w) => w[1]))],
    att: mean,
    versions,
  };
}

/**
 * Rosenbaum Gamma tipping point: largest hidden-bias odds ratio Gamma such
 * that the effect stays significant at zCrit under the worst-case bias shift
 * ((Gamma-1)/(Gamma+1)) * sd. Returns 1 when not significant even at Gamma=1.
 */
export function rosenbaumGammaTipping(
  pairs: MatchedPair[],
  zCrit = 1.645,
  gammaMax = 10,
): number {
  const diffs = pairDiffs(pairs);
  const n = diffs.length;
  const mean = diffs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1));
  const se = sd / Math.sqrt(n);
  const tipped = (g: number) => (mean - ((g - 1) / (g + 1)) * sd) / se < zCrit;
  if (tipped(1)) return 1;
  let lo = 1;
  let hi = gammaMax;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    if (tipped(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
