/**
 * C8 offline reliability / ECE bins (cat:C8).
 *
 * Equal-width reliability diagram bins + Expected Calibration Error.
 * Measurement only — does not publish a dashboard or flip PERFORMANCE_STATS.
 * Spirit of learned reliability diagrams (2207.13770) without interactive UI yet.
 */

export type ReliabilityRow = {
  readonly p: number;
  readonly y: 0 | 1;
};

export type ReliabilityBin = {
  readonly binIndex: number;
  readonly lo: number;
  readonly hi: number;
  readonly n: number;
  readonly meanP: number | null;
  readonly meanY: number | null;
  /** meanP − meanY (positive = overconfident on this bin). */
  readonly gap: number | null;
};

export type OfflineReliabilityResult = {
  readonly n: number;
  readonly bins: readonly ReliabilityBin[];
  readonly ece: number | null;
  readonly notes: readonly string[];
};

function clamp01(p: number): number {
  return Math.min(1, Math.max(0, p));
}

export function runOfflineReliabilityBins(
  rows: readonly ReliabilityRow[],
  binCount: number = 10,
): OfflineReliabilityResult {
  const k = Number.isFinite(binCount) && binCount >= 2 ? Math.floor(binCount) : 10;
  const usable = rows.filter(
    (r) => Number.isFinite(r.p) && (r.y === 0 || r.y === 1),
  );
  const bins: ReliabilityBin[] = [];
  for (let i = 0; i < k; i++) {
    const lo = i / k;
    const hi = (i + 1) / k;
    const inBin = usable.filter((r) => {
      const p = clamp01(r.p);
      return i === k - 1 ? p >= lo && p <= hi : p >= lo && p < hi;
    });
    const n = inBin.length;
    const meanP = n ? inBin.reduce((s, r) => s + clamp01(r.p), 0) / n : null;
    const meanY = n ? inBin.reduce((s, r) => s + r.y, 0) / n : null;
    bins.push({
      binIndex: i,
      lo,
      hi,
      n,
      meanP,
      meanY,
      gap: meanP != null && meanY != null ? meanP - meanY : null,
    });
  }
  let ece: number | null = null;
  if (usable.length > 0) {
    ece = 0;
    for (const b of bins) {
      if (b.n === 0 || b.gap == null) continue;
      ece += (b.n / usable.length) * Math.abs(b.gap);
    }
  }
  return {
    n: usable.length,
    bins,
    ece,
    notes: [
      "Offline / measurement only — not a public /performance claim.",
      "ECE is a weighted absolute gap across equal-width bins.",
      "Do not flip PERFORMANCE_STATS or publish rates from this harness alone.",
    ],
  };
}

export const OFFLINE_RELIABILITY_FIXTURE: readonly ReliabilityRow[] = [
  { p: 0.1, y: 0 },
  { p: 0.2, y: 0 },
  { p: 0.4, y: 0 },
  { p: 0.45, y: 1 },
  { p: 0.55, y: 1 },
  { p: 0.6, y: 0 },
  { p: 0.75, y: 1 },
  { p: 0.9, y: 1 },
];
