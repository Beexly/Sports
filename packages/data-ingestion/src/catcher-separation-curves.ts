/**
 * Modelling rankings in R: the PlackettLuce package
 *
 * arXiv:1810.12068v2 · lane:markets · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt the Plackett-Luce ranking machinery (the R PlackettLuce package's statistical engine, re-
 * implemented in GSE's stack) as an honesty harness for early-season NFL ratings: pseudo-
 * regularized ratings fitted on the partial-season matchup graph, evaluated on held-out log-
 * likelihood -- i.e., do not trust the early-season leaderboard until a regularized model beats
 * the unregularized one out of sample. Operational rule (BASELINE): before any early-season pick-
 * confidence tier is published from weeks 1-4 ratings, run the pseudo-regularization check; report
 * quasi-SEs (the package's quasi-standard-errors) rather than naive SEs whenever they change a
 * published confidence tier. This is infrastructure, not a signal -- the objective is not to beat
 * the engine, it is to stop the engine from publishing overconfident claims from 4-game samples.
 * The ledger's extracted §§10-14 were missing; the improvement and gate are taken from the
 * ledger's stated numeric gate.
 *
 * ACCEPTANCE GATE: ADAPT confirmed if pseudo-regularized early-season NFL ratings beat unregularized on weeks 5-8
 * held-out log-likelihood (any positive margin with p<0.1), OR if quasi-SEs change at least one
 * published pick-confidence tier vs naive SEs; otherwise keep the current early-season rating
 * procedure.
 *
 * Ingest role: feature builder (receiver separation vs time: smooth curves + EPA mapping).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1810.12068v2" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT confirmed if pseudo-regularized early-season NFL ratings beat unregularized on weeks 5-8
 * held-out log-likelihood (any positive margin with p<0.1), OR if quasi-SEs change at least one
 * published pick-confidence tier vs naive SEs; otherwise keep the current early-season rating
 * procedure.`;

export const CONFIG = {
  enabled: false,
  logLossGainThreshold: 0.003,
  separationWindows: [0.5, 1.0, 1.5, 2.0, 2.5],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SeparationSample {
  readonly tSec: number;
  readonly separationYd: number;
}

export function isSeparationSample(x: unknown): x is SeparationSample {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["tSec"]) && (o["tSec"] as number) >= 0 && isFiniteNumber(o["separationYd"]) && (o["separationYd"] as number) >= 0;
}

/** Monotone-ish smoother: running maximum over a sorted time series (separation only grows to the catch point). */
export function separationEnvelope(samples: readonly unknown[]): SeparationSample[] {
  const valid: SeparationSample[] = [];
  for (const s of samples) if (isSeparationSample(s)) valid.push(s);
  valid.sort((a, b) => a.tSec - b.tSec);
  const out: SeparationSample[] = [];
  let peak = -Infinity;
  for (const s of valid) {
    peak = Math.max(peak, s.separationYd);
    out.push({ tSec: s.tSec, separationYd: peak });
  }
  return out;
}

/** Separation at fixed windows via linear interpolation of the envelope. */
export function separationAtWindows(envelope: readonly SeparationSample[], windows: readonly number[]): Array<number | null> {
  return windows.map((w) => {
    if (!isFiniteNumber(w) || envelope.length === 0) return null;
    if (w <= (envelope[0]?.tSec ?? 0)) return envelope[0]?.separationYd ?? null;
    for (let i = 1; i < envelope.length; i++) {
      const prev = envelope[i - 1]!;
      const cur = envelope[i]!;
      if (w <= cur.tSec) {
        const span = cur.tSec - prev.tSec;
        if (span === 0) return cur.separationYd;
        const f = (w - prev.tSec) / span;
        return prev.separationYd + f * (cur.separationYd - prev.separationYd);
      }
    }
    return envelope[envelope.length - 1]?.separationYd ?? null;
  });
}

/** Separation -> expected EPA lift (calibrated offline; monotone map). */
export function separationEpaLift(separationYd: number, params = { a: 0.35, b: 0.9 }): number | null {
  if (!isFiniteNumber(separationYd) || separationYd < 0) return null;
  if (!isFiniteNumber(params.a) || !isFiniteNumber(params.b) || params.b <= 0) return null;
  return params.a * Math.log1p(separationYd / params.b);
}

/** Route-level aggregates: peak, mean, time-to-3yd. */
export function separationAggregates(envelope: readonly SeparationSample[]): { peak: number; mean: number; timeTo3Yd: number | null } | null {
  if (envelope.length === 0) return null;
  const seps = envelope.map((s) => s.separationYd);
  const peak = Math.max(...seps);
  const mean = seps.reduce((a, b) => a + b, 0) / seps.length;
  const hit = envelope.find((s) => s.separationYd >= 3);
  return { peak, mean, timeTo3Yd: hit ? hit.tSec : null };
}
