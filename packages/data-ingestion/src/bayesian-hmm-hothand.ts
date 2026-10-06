/**
 * A Bayesian hidden Markov model for assessing the hot hand phenomenon in basketball shooting performance
 *
 * arXiv:2303.17863v2 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Port BLHMM to NFL drive/play sequences: latent states {cold, hot} for offensive efficiency;
 * observation = per-play success (EPA>0 or first-down conversion) with covariates (down, distance,
 * field position, QB injury flag, weather); logit transition probabilities with game-level
 * covariates (opponent defensive strength, rest) to fix the paper's missing-opponent flaw -
 * outputting posterior streak probabilities feeding live in-game win-probability adjustments and a
 * 'momentum flag' for content (never as a primary pick input) - with a three-state
 * (cold/neutral/hot) extension preventing the degenerate 'hot = automatic' collapse.
 *
 * ACCEPTANCE GATE: ADOPT as a live-momentum module if the HMM beats the no-HMM baseline by >=0.005 mean log-loss on
 * held-out games AND the posterior hot-state probability is calibrated (slope of observed vs
 * predicted next-drive TD rate within 0.85-1.15); ADAPT if only the streak-quantification outputs
 * are useful (content feature, no pick use); REJECT if the latent states degenerate as in the
 * paper on NFL data.
 *
 * Ingest role: feature builder (Bayesian HMM hot-hand: Gibbs recipe + posterior streak prob).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2303.17863v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as a live-momentum module if the HMM beats the no-HMM baseline by >=0.005 mean log-loss on
 * held-out games AND the posterior hot-state probability is calibrated (slope of observed vs
 * predicted next-drive TD rate within 0.85-1.15); ADAPT if only the streak-quantification outputs
 * are useful (content feature, no pick use); REJECT if the latent states degenerate as in the
 * paper on NFL data.`;

export const CONFIG = {
  enabled: false,
  model: "Bayesian hidden Markov model",
  inference: "Gibbs sampling (offline); this module ships the likelihood + posterior core",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function lse(a: number, b: number): number {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}

export interface HmmParams {
  readonly pCold: number;
  readonly pHot: number;
  readonly aCC: number;
  readonly aCH: number;
  readonly aHC: number;
  readonly aHH: number;
}

export function isHmmParams(x: unknown): x is HmmParams {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const ps = ["pCold", "pHot", "aCC", "aCH", "aHC", "aHH"].map((k) => o[k]);
  if (!ps.every((p) => isFiniteNumber(p) && (p as number) >= 0 && (p as number) <= 1)) return false;
  return (
    Math.abs((o["aCC"] as number) + (o["aCH"] as number) - 1) < 1e-9 &&
    Math.abs((o["aHC"] as number) + (o["aHH"] as number) - 1) < 1e-9
  );
}

/** Forward log-likelihood (shared with the mixture-model lane). */
export function hmmLogLik(seq: ReadonlyArray<0 | 1>, h: HmmParams, piCold = 0.5): number | null {
  if (!isHmmParams(h) || seq.length === 0) return null;
  if (!isFiniteNumber(piCold) || piCold < 0 || piCold > 1) return null;
  const emit = (s: 0 | 1, y: 0 | 1): number => (y === 1 ? [h.pCold, h.pHot][s]! : 1 - [h.pCold, h.pHot][s]!);
  let lc = Math.log(Math.max(1e-300, piCold)) + Math.log(Math.max(1e-300, emit(0, seq[0]!)));
  let lh = Math.log(Math.max(1e-300, 1 - piCold)) + Math.log(Math.max(1e-300, emit(1, seq[0]!)));
  for (let t = 1; t < seq.length; t++) {
    const y = seq[t]!;
    const nlc = lse(lc + Math.log(h.aCC), lh + Math.log(h.aHC)) + Math.log(Math.max(1e-300, emit(0, y)));
    const nlh = lse(lc + Math.log(h.aCH), lh + Math.log(h.aHH)) + Math.log(Math.max(1e-300, emit(1, y)));
    lc = nlc;
    lh = nlh;
  }
  return lse(lc, lh);
}

/** Bayes factor HMM vs Bernoulli (evidence for the hot hand). */
export function hotHandBayesFactor(seq: ReadonlyArray<0 | 1>, h: HmmParams): number | null {
  const llH = hmmLogLik(seq, h);
  if (llH === null || seq.length === 0) return null;
  const pHat = seq.reduce<number>((a, b) => a + b, 0) / seq.length;
  if (pHat <= 0 || pHat >= 1) return null;
  const ll0 = seq.reduce<number>((s, y) => s + (y === 1 ? Math.log(pHat) : Math.log(1 - pHat)), 0);
  return Math.exp(llH - ll0);
}

/** Posterior state probabilities via forward-backward. */
export function posteriorStates(seq: ReadonlyArray<0 | 1>, h: HmmParams): number[] | null {
  if (!isHmmParams(h) || seq.length === 0) return null;
  const n = seq.length;
  const emit = (s: 0 | 1, y: 0 | 1): number => Math.max(1e-300, y === 1 ? [h.pCold, h.pHot][s]! : 1 - [h.pCold, h.pHot][s]!);
  const la: number[] = [];
  const lb: number[] = [];
  let lc = Math.log(0.5) + Math.log(emit(0, seq[0]!));
  let lh = Math.log(0.5) + Math.log(emit(1, seq[0]!));
  la.push(lc);
  lb.push(lh);
  for (let t = 1; t < n; t++) {
    const y = seq[t]!;
    const plc = la[t - 1]!;
    const plh = lb[t - 1]!;
    lc = lse(plc + Math.log(h.aCC), plh + Math.log(h.aHC)) + Math.log(emit(0, y));
    lh = lse(plc + Math.log(h.aCH), plh + Math.log(h.aHH)) + Math.log(emit(1, y));
    la.push(lc);
    lb.push(lh);
  }
  const ll = lse(lc, lh);
  const bc: number[] = new Array<number>(n).fill(0);
  const bh: number[] = new Array<number>(n).fill(0);
  bc[n - 1] = 0;
  bh[n - 1] = 0;
  for (let t = n - 2; t >= 0; t--) {
    const y = seq[t + 1]!;
    bc[t] = lse(bc[t + 1]! + Math.log(h.aCC) + Math.log(emit(0, y)), bh[t + 1]! + Math.log(h.aCH) + Math.log(emit(1, y)));
    bh[t] = lse(bc[t + 1]! + Math.log(h.aHC) + Math.log(emit(0, y)), bh[t + 1]! + Math.log(h.aHH) + Math.log(emit(1, y)));
  }
  return la.map((a, t) => {
    const post = Math.exp(a + (bc[t] ?? 0) - ll);
    return Math.max(0, Math.min(1, post));
  });
}
