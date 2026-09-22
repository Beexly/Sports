/**
 * next-gen-scraPy: Extracting NFL Tracking Data from Images
 *
 * arXiv:1906.03339 · lane:tracking · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the CPAE pipeline (league GAM of completion on air yards x lateral offset, 2-D KDE attempt
 * density, Naive Bayes shrinkage with N_Median prior, CPAE integral on a field grid) and publish
 * weekly QB/defense CPAE tables cross-checked against official NGS CPAE.
 *
 * ACCEPTANCE GATE: ADOPT if rho(scraped/computed CPAE, official NGS CPAE) >= 0.80 on a full season (2017 and/or
 * 2018) AND median coordinate deviation <= 2.0 yards on any linked tracking sample.
 *
 * Ingest role: feature builder (streakiness detector: hidden-Markov mixture on makes/misses).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1906.03339" as const;
export const LANE = "tracking" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if rho(scraped/computed CPAE, official NGS CPAE) >= 0.80 on a full season (2017 and/or
 * 2018) AND median coordinate deviation <= 2.0 yards on any linked tracking sample.`;

export const CONFIG = {
  enabled: false,
  model: "hidden Markov mixture",
  emIters: 100,
  emTol: 1e-6,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type Make = 0 | 1;

/** Log-sum-exp for numerical stability. */
function lse(a: number, b: number): number {
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}

/**
 * Forward log-likelihood of a binary sequence under a 2-state HMM
 * (states: cold/hot, with per-state make probs and transition matrix).
 */
export function hmmLogLik(
  seq: ReadonlyArray<0 | 1>,
  pCold: number,
  pHot: number,
  aCC: number,
  aCH: number,
  aHC: number,
  aHH: number,
  piCold = 0.5,
): number | null {
  if (seq.length === 0) return null;
  if (!seq.every((y) => y === 0 || y === 1)) return null;
  const ps = [pCold, pHot, aCC, aCH, aHC, aHH, piCold];
  if (!ps.every(isFiniteNumber) || ps.some((p) => p < 0 || p > 1)) return null;
  if (Math.abs(aCC + aCH - 1) > 1e-9 || Math.abs(aHC + aHH - 1) > 1e-9) return null;
  const emit = (s: 0 | 1, y: 0 | 1): number => (y === 1 ? [pCold, pHot][s]! : 1 - [pCold, pHot][s]!);
  let lc = Math.log(piCold) + Math.log(Math.max(1e-300, emit(0, seq[0]!)));
  let lh = Math.log(1 - piCold) + Math.log(Math.max(1e-300, emit(1, seq[0]!)));
  for (let t = 1; t < seq.length; t++) {
    const y = seq[t]!;
    const nlc = lse(lc + Math.log(aCC), lh + Math.log(aHC)) + Math.log(Math.max(1e-300, emit(0, y)));
    const nlh = lse(lc + Math.log(aCH), lh + Math.log(aHH)) + Math.log(Math.max(1e-300, emit(1, y)));
    lc = nlc;
    lh = nlh;
  }
  return lse(lc, lh);
}

/** Bernoulli (no-hot-hand) log-likelihood. */
export function bernoulliLogLik(seq: ReadonlyArray<0 | 1>, p: number): number | null {
  if (seq.length === 0 || !isFiniteNumber(p) || p <= 0 || p >= 1) return null;
  return seq.reduce<number>((s, y) => s + (y === 1 ? Math.log(p) : Math.log(1 - p)), 0);
}

/** Likelihood-ratio test: HMM vs Bernoulli (hot-hand evidence). */
export function hotHandLR(
  seq: ReadonlyArray<0 | 1>,
  hmm: { pCold: number; pHot: number; aCC: number; aCH: number; aHC: number; aHH: number },
): { lr: number; df: number } | null {
  const llH = hmmLogLik(seq, hmm.pCold, hmm.pHot, hmm.aCC, hmm.aCH, hmm.aHC, hmm.aHH);
  if (llH === null) return null;
  const pHat = seq.reduce<number>((a, b) => a + b, 0) / seq.length;
  const ll0 = bernoulliLogLik(seq, pHat);
  if (ll0 === null) return null;
  return { lr: 2 * (llH - ll0), df: 5 };
}

/** Posterior P(hot | sequence) via forward-backward (last-step filtering). */
export function posteriorHotProb(
  seq: ReadonlyArray<0 | 1>,
  hmm: { pCold: number; pHot: number; aCC: number; aCH: number; aHC: number; aHH: number },
): number | null {
  const ll = hmmLogLik(seq, hmm.pCold, hmm.pHot, hmm.aCC, hmm.aCH, hmm.aHC, hmm.aHH);
  if (ll === null) return null;
  const emit = (s: 0 | 1, y: 0 | 1): number => (y === 1 ? [hmm.pCold, hmm.pHot][s]! : 1 - [hmm.pCold, hmm.pHot][s]!);
  let lc = Math.log(0.5) + Math.log(Math.max(1e-300, emit(0, seq[0]!)));
  let lh = Math.log(0.5) + Math.log(Math.max(1e-300, emit(1, seq[0]!)));
  for (let t = 1; t < seq.length; t++) {
    const y = seq[t]!;
    const nlc = lse(lc + Math.log(hmm.aCC), lh + Math.log(hmm.aHC)) + Math.log(Math.max(1e-300, emit(0, y)));
    const nlh = lse(lc + Math.log(hmm.aCH), lh + Math.log(hmm.aHH)) + Math.log(Math.max(1e-300, emit(1, y)));
    lc = nlc;
    lh = nlh;
  }
  return Math.exp(lh - ll);
}
