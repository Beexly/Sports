/**
 * tsflex: Flexible Time Series Processing & Feature Extraction
 *
 * arXiv:2111.12429v2 · lane:auto_feature_eng · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt tsflex as the feature-extraction backbone: register catch22 (via pycatch22, 8-game window
 * stride 1) and custom gse-lab metrics (4/8/17-game windows) in one FeatureCollection over game-
 * date-indexed series with bye-week gaps; SeriesPipeline for cleaning (dedupe, gap marking, odds
 * alignment); replace ad-hoc rolling loops in the gse-lab build scripts with the serialized
 * collection — then exploit multi-window registration in one pass to build a scale-space feature
 * tensor with learned per-scale attention in the meta-learner.
 *
 * ACCEPTANCE GATE: Adopt iff the reproducibility test passes all three criteria: exact numerical match (1e-9) with
 * hand-rolled features, >=2x speedup on the full 32-team rebuild, correct gap handling — AND the
 * pinned version's API supports multi-window registration, serialization, multiprocessing without
 * workarounds.
 *
 * Ingest role: feature builder (tsflex-style time-series feature extraction: windowed ops registry).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2111.12429v2" as const;
export const LANE = "auto_feature_eng" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt iff the reproducibility test passes all three criteria: exact numerical match (1e-9) with
 * hand-rolled features, >=2x speedup on the full 32-team rebuild, correct gap handling — AND the
 * pinned version's API supports multi-window registration, serialization, multiprocessing without
 * workarounds.`;

export const CONFIG = {
  enabled: false,
  library: "tsflex",
  windows: ["5min", "15min", "1h"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type SeriesOp = "mean" | "std" | "min" | "max" | "sum" | "slope" | "range" | "last";

export interface WindowSpec {
  readonly window: number;
  readonly stride: number;
  readonly ops: readonly SeriesOp[];
}

export function isWindowSpec(x: unknown): x is WindowSpec {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const ops: SeriesOp[] = ["mean", "std", "min", "max", "sum", "slope", "range", "last"];
  return (
    Number.isInteger(o["window"]) && (o["window"] as number) > 0 &&
    Number.isInteger(o["stride"]) && (o["stride"] as number) > 0 &&
    Array.isArray(o["ops"]) && (o["ops"] as unknown[]).every((op) => ops.includes(op as SeriesOp))
  );
}

/** Apply one op to a window. */
export function applyOp(win: readonly number[], op: SeriesOp): number | null {
  if (win.length === 0 || !win.every(isFiniteNumber)) return null;
  switch (op) {
    case "mean":
      return win.reduce((a, b) => a + b, 0) / win.length;
    case "std": {
      const m = win.reduce((a, b) => a + b, 0) / win.length;
      return Math.sqrt(win.reduce((a, b) => a + (b - m) * (b - m), 0) / win.length);
    }
    case "min":
      return Math.min(...win);
    case "max":
      return Math.max(...win);
    case "sum":
      return win.reduce((a, b) => a + b, 0);
    case "slope": {
      const n = win.length;
      if (n < 2) return 0;
      const mx = (n - 1) / 2;
      const my = win.reduce((a, b) => a + b, 0) / n;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - mx) * ((win[i] ?? 0) - my);
        den += (i - mx) * (i - mx);
      }
      return den === 0 ? 0 : num / den;
    }
    case "range":
      return Math.max(...win) - Math.min(...win);
    case "last":
      return win[win.length - 1] ?? null;
  }
}

/** Rolling windowed feature extraction (tsflex-style). */
export function extractWindowed(
  series: readonly number[],
  spec: WindowSpec,
): Array<Record<SeriesOp, number>> | null {
  if (!isWindowSpec(spec) || series.length === 0 || !series.every(isFiniteNumber)) return null;
  const out: Array<Record<SeriesOp, number>> = [];
  for (let start = 0; start + spec.window <= series.length; start += spec.stride) {
    const win = series.slice(start, start + spec.window);
    const row = {} as Record<SeriesOp, number>;
    for (const op of spec.ops) {
      const v = applyOp(win, op);
      if (v === null) return null;
      row[op] = v;
    }
    out.push(row);
  }
  return out;
}

/** Feature names for a spec (for the registry). */
export function featureNames(spec: WindowSpec, prefix: string): string[] | null {
  if (!isWindowSpec(spec) || typeof prefix !== "string") return null;
  return spec.ops.map((op) => `${prefix}_w${spec.window}_${op}`);
}
