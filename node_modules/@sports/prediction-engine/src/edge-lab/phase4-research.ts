/**
 * PHASE 4 — frontier fusion research stubs (handoff §2 P4). INERT by
 * doctrine: "No live weight and no public claim until 200+ fired bets
 * clear breakeven+vig out-of-sample." Everything here is pure math with
 * tests; nothing consumes a live feed. Live signal-mesh CAPTURE
 * (SiriusXM/Airwave, beat writers, Reddit) is founder/legal-gated and has
 * NO implementation in this repo — these functions only accept historical
 * claim records a human has already cleared.
 */

// ── Accountability-as-Bayesian-precision (signal mesh weighting) ─────────────

export interface ChannelRecord {
  readonly channelId: string;
  /** Graded, settled claims only — never live chatter. */
  readonly claims: number;
  readonly correct: number;
}

export interface ChannelPrecision {
  readonly channelId: string;
  /** Beta(1,1)-posterior mean accuracy. */
  readonly posteriorAccuracy: number;
  /** Precision weight: evidence-scaled log-odds of beating a coin. */
  readonly weight: number;
}

/**
 * A channel's weight is its EMPIRICALLY PROVEN precision: Beta-Bernoulli
 * posterior over its graded claim record, converted to an evidence-scaled
 * log-odds weight that is exactly 0 for channels at or below coin-flip.
 * "Accountability as Bayesian precision" — pundits earn weight only by
 * being right on the record.
 */
export function channelPrecision(record: ChannelRecord): ChannelPrecision {
  if (record.claims < 0 || record.correct < 0 || record.correct > record.claims) {
    throw new RangeError("invalid channel record");
  }
  const a = 1 + record.correct;
  const b = 1 + record.claims - record.correct;
  const mean = a / (a + b);
  // Evidence scaling: shrink toward 0 with few claims (n/(n+20) ramp).
  const evidence = record.claims / (record.claims + 20);
  const logOdds = Math.log(mean / (1 - mean));
  return {
    channelId: record.channelId,
    posteriorAccuracy: mean,
    weight: Math.max(0, logOdds) * evidence,
  };
}

/** Precision-weighted logit pool of channel claim probabilities. */
export function fuseSignals(
  signals: readonly { readonly channel: ChannelPrecision; readonly prob: number }[],
): number | null {
  let num = 0;
  let den = 0;
  for (const s of signals) {
    if (!(s.prob > 0 && s.prob < 1)) throw new RangeError("prob out of (0,1)");
    num += s.channel.weight * Math.log(s.prob / (1 - s.prob));
    den += s.channel.weight;
  }
  if (den <= 0) return null; // no channel has earned any weight — say nothing
  const z = num / den;
  return 1 / (1 + Math.exp(-z));
}

// ── Adaptive Conformal Inference (non-stationarity) ──────────────────────────

/**
 * Gibbs–Candès ACI online update: alpha_{t+1} = alpha_t + gamma * (target
 * miscoverage − observed miss). Keeps marginal coverage on drifting
 * streams; clamped to [0.001, 0.5].
 */
export function aciUpdate(
  alpha: number,
  targetMiscoverage: number,
  covered: boolean,
  gamma = 0.005,
): number {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError("alpha out of (0,1)");
  const next = alpha + gamma * (targetMiscoverage - (covered ? 0 : 1));
  return Math.min(0.5, Math.max(0.001, next));
}

// ── Learn-then-Test (FWER-bounded threshold selection) ───────────────────────

export interface LttCandidate {
  readonly threshold: number;
  /** Valid p-value that firing at this threshold violates the risk bound. */
  readonly pValue: number;
}

/**
 * Fixed-sequence Learn-then-Test: candidates ordered most-conservative
 * first; accept while p <= delta and STOP at the first failure (fixed-
 * sequence testing controls FWER at delta with no multiplicity penalty).
 * Returns the accepted thresholds — possibly empty, which means FIRE
 * NOTHING and is a first-class outcome.
 */
export function learnThenTest(
  candidates: readonly LttCandidate[],
  delta: number,
): readonly LttCandidate[] {
  if (!(delta > 0 && delta < 1)) throw new RangeError("delta out of (0,1)");
  const ordered = [...candidates].sort((a, b) => b.threshold - a.threshold); // most conservative first
  const accepted: LttCandidate[] = [];
  for (const c of ordered) {
    if (c.pValue <= delta) accepted.push(c);
    else break; // fixed-sequence stop — later (looser) candidates untested
  }
  return accepted;
}
