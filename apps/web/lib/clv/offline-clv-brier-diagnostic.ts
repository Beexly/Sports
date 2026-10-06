/**
 * C4 offline CLV ↔ Brier diagnostic (cat:C4).
 *
 * Closing Line Value vs calibration quality on identical settled rows
 * (arxiv 1710.02824 spirit). Measurement only — no publish path, no gate flips.
 *
 * Soft-blocked on a full line archive in production; this harness accepts
 * fixture rows with open/close prices so coding agents can land the math first.
 */

export type OfflineClvRow = {
  readonly sport: string;
  readonly pModel: number;
  /** Fair probability implied by the opening line. */
  readonly pOpen: number;
  /** Fair probability implied by the closing line. */
  readonly pClose: number;
  readonly y: 0 | 1;
};

export type ClvSummary = {
  readonly n: number;
  readonly meanClv: number | null;
  /** Fraction of rows with CLV > 0 (beat the close). */
  readonly beatCloseRate: number | null;
  readonly brierModel: number | null;
  readonly brierClose: number | null;
  readonly brierOpen: number | null;
  /** Brier(model) − Brier(close); negative means model better calibrated than close. */
  readonly brierDeltaVsClose: number | null;
};

export type OfflineClvDiagnosticResult = {
  readonly overall: ClvSummary;
  readonly bySport: readonly { readonly sport: string; readonly summary: ClvSummary }[];
  readonly notes: readonly string[];
};

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** CLV in probability points: model vs close (positive = model higher than close). */
export function computeClv(pModel: number, pClose: number): number | null {
  if (!Number.isFinite(pModel) || !Number.isFinite(pClose)) return null;
  return pModel - pClose;
}

function brierOf(rows: readonly { p: number; y: 0 | 1 }[]): number | null {
  if (rows.length === 0) return null;
  let s = 0;
  for (const r of rows) s += (clampP(r.p) - r.y) ** 2;
  return s / rows.length;
}

function summarize(rows: readonly OfflineClvRow[]): ClvSummary {
  if (rows.length === 0) {
    return {
      n: 0,
      meanClv: null,
      beatCloseRate: null,
      brierModel: null,
      brierClose: null,
      brierOpen: null,
      brierDeltaVsClose: null,
    };
  }
  const clvs: number[] = [];
  let beats = 0;
  for (const r of rows) {
    const c = computeClv(r.pModel, r.pClose);
    if (c == null) continue;
    clvs.push(c);
    if (c > 0) beats += 1;
  }
  const brierModel = brierOf(rows.map((r) => ({ p: r.pModel, y: r.y })));
  const brierClose = brierOf(rows.map((r) => ({ p: r.pClose, y: r.y })));
  const brierOpen = brierOf(rows.map((r) => ({ p: r.pOpen, y: r.y })));
  return {
    n: rows.length,
    meanClv: clvs.length ? clvs.reduce((a, b) => a + b, 0) / clvs.length : null,
    beatCloseRate: clvs.length ? beats / clvs.length : null,
    brierModel,
    brierClose,
    brierOpen,
    brierDeltaVsClose:
      brierModel != null && brierClose != null ? brierModel - brierClose : null,
  };
}

export function runOfflineClvBrierDiagnostic(
  rows: readonly OfflineClvRow[],
): OfflineClvDiagnosticResult {
  const sports = [...new Set(rows.map((r) => r.sport))].sort();
  return {
    overall: summarize(rows),
    bySport: sports.map((sport) => ({
      sport,
      summary: summarize(rows.filter((r) => r.sport === sport)),
    })),
    notes: [
      "Offline / measurement only — needs timestamped open/close lines for real CLV.",
      "Positive meanClv means model was higher than close on average (not automatically +EV).",
      "Compare Brier(model) to Brier(close): beating close on Brier is a strong honesty check.",
      "No gate flips; no production wiring in this unit.",
    ],
  };
}

export const OFFLINE_CLV_FIXTURE: readonly OfflineClvRow[] = [
  { sport: "americanfootball_nfl", pModel: 0.58, pOpen: 0.52, pClose: 0.55, y: 1 },
  { sport: "americanfootball_nfl", pModel: 0.44, pOpen: 0.5, pClose: 0.48, y: 0 },
  { sport: "baseball_mlb", pModel: 0.51, pOpen: 0.5, pClose: 0.5, y: 1 },
  { sport: "baseball_mlb", pModel: 0.47, pOpen: 0.49, pClose: 0.51, y: 0 },
  { sport: "soccer_usa_mls", pModel: 0.4, pOpen: 0.42, pClose: 0.38, y: 0 },
  { sport: "soccer_usa_mls", pModel: 0.36, pOpen: 0.35, pClose: 0.4, y: 1 },
];
