/**
 * Weighted composite score — the "weight absolutely everything" matrix.
 *
 * Blends any set of signals (hard metrics AND soft signals — practice
 * participation, injury/concussion status, rehab visits, beat-reporter rumors)
 * into ONE score, and reports each signal's attributed contribution so the
 * interpretation/narration layer can say WHY.
 *
 * Two honesty valves keep soft signals from masquerading as facts:
 *   - confidence (0..1): a settled stat ≈ 1.0, a rumor ≈ 0.2.
 *   - freshness: exponential half-life decay on signal age, so stale rumors fade.
 *
 * Scale-agnostic: `value` is each signal's directional reading on a shared scale
 * (e.g. z-scores or −1..1). The caller maps the blended score to a 0–100 index.
 * Pure and db-free.
 */

export interface WeightedSignal {
  readonly key: string;
  /** Directional reading on a scale shared across signals (e.g. z-score; + good, − bad). */
  readonly value: number;
  /** Base importance (>= 0). */
  readonly weight: number;
  /** Reliability 0..1 (default 1). The valve that keeps a rumor from voting like a fact. */
  readonly confidence?: number;
  /** Age in days for freshness decay (default 0 = fresh). */
  readonly ageDays?: number;
}

export interface SignalContribution {
  readonly key: string;
  readonly value: number;
  readonly effectiveWeight: number; // weight × confidence × freshness
  readonly contribution: number; // value × effectiveWeight (signed)
  /** Share of the total effective weight — how much this signal influenced the blend. */
  readonly weightShare: number;
}

export interface CompositeScore {
  readonly score: number; // effective-weighted average of the signal values
  readonly totalWeight: number;
  readonly signalsUsed: number;
  /** Contributions sorted by |contribution| desc — the narration order ("what drove it"). */
  readonly contributions: readonly SignalContribution[];
}

export interface CompositeScoreOptions {
  /** Freshness half-life in days (default 14). A signal this old keeps half its weight. */
  readonly halfLifeDays?: number;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}

export function compositeScore(
  signals: readonly WeightedSignal[],
  options: CompositeScoreOptions = {},
): CompositeScore {
  const halfLife = options.halfLifeDays ?? 14;

  const rows = signals.map((s) => {
    // Treat non-finite inputs as inert so one bad signal (e.g. an Infinity/NaN
    // z-score from a zero-variance sample) cannot corrupt the whole composite.
    const value = Number.isFinite(s.value) ? s.value : 0;
    const weight = Number.isFinite(s.weight) ? Math.max(0, s.weight) : 0;
    const conf = clamp01(s.confidence ?? 1);
    const age = Math.max(0, s.ageDays ?? 0);
    const freshness = halfLife > 0 ? Math.pow(0.5, age / halfLife) : 1;
    const effectiveWeight = weight * conf * freshness;
    return { key: s.key, value, effectiveWeight, contribution: value * effectiveWeight };
  });

  const totalWeight = rows.reduce((sum, r) => sum + r.effectiveWeight, 0);
  const score = totalWeight > 0 ? rows.reduce((sum, r) => sum + r.contribution, 0) / totalWeight : 0;

  const contributions: SignalContribution[] = rows
    .map((r) => ({
      key: r.key,
      value: r.value,
      effectiveWeight: round4(r.effectiveWeight),
      contribution: round4(r.contribution),
      weightShare: totalWeight > 0 ? round4(r.effectiveWeight / totalWeight) : 0,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    score: round4(score),
    totalWeight: round4(totalWeight),
    signalsUsed: rows.filter((r) => r.effectiveWeight > 0).length,
    contributions,
  };
}
