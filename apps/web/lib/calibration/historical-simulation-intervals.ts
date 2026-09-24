/**
 * In-sample historical simulation (HS_in) post-processing — arXiv 2608.10620
 * ("Probabilistic Forecasting via Post-Processing Prediction Errors:
 * In- or Out-of-Sample?").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published intervals and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: replace the Gaussian/CQR uncertainty layer with
 * in-sample historical simulation — the predictive distribution for a game
 * is the engine's point forecast plus its own in-sample residuals
 * (residuals from the data the model was fit on, not holdout). The paper's
 * heterogeneity finding: QR beats HS on some markets, so adopt per-market
 * method selection when QR wins by >1pp CRPSS on that market.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT HS_in as the default
 * uncertainty layer if CRPSS > 0 vs current intervals on the 2022-2024
 * backtest AND 90% coverage lands in [0.87, 0.93]; if QR beats HS on any
 * market by >1pp CRPSS, adopt per-market method selection.
 */

/** Empirical quantile (linear interpolation). */
export function empiricalQuantile(samples: readonly number[], q: number): number {
  const qc = Math.min(Math.max(q, 0), 1);
  if (samples.length === 0) return Number.NaN;
  const s = [...samples].sort((a, b) => a - b);
  const pos = qc * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/**
 * HS predictive quantiles: point forecast + in-sample residuals, then the
 * requested quantiles of the shifted distribution.
 */
export function hsQuantiles(
  pointForecast: number,
  inSampleResiduals: readonly number[],
  quantileLevels: readonly number[],
): number[] {
  const shifted = inSampleResiduals.map((r) => pointForecast + r);
  return quantileLevels.map((q) => empiricalQuantile(shifted, q));
}

/**
 * HS central interval at miscoverage alpha from in-sample residuals.
 */
export function hsInterval(
  pointForecast: number,
  inSampleResiduals: readonly number[],
  alpha: number,
): { readonly lo: number; readonly hi: number } {
  const [lo, hi] = hsQuantiles(pointForecast, inSampleResiduals, [
    alpha / 2,
    1 - alpha / 2,
  ]);
  return { lo: lo!, hi: hi! };
}

/**
 * Empirical CRPS from predictive samples: E|X - y| - 0.5 * E|X - X'|.
 */
export function crpsFromSamples(samples: readonly number[], y: number): number {
  const n = samples.length;
  if (n === 0) return Number.NaN;
  let term1 = 0;
  for (const x of samples) term1 += Math.abs(x - y);
  term1 /= n;
  let term2 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) term2 += Math.abs(samples[i]! - samples[j]!);
  }
  term2 /= 2 * n * n;
  return term1 - term2;
}

/** CRPSS of a candidate vs a reference (positive = candidate wins). */
export function crpss(crpsCandidate: number, crpsReference: number): number {
  if (!(crpsReference > 0)) return 0;
  return 1 - crpsCandidate / crpsReference;
}

/**
 * Per-market method selection (the paper's heterogeneity finding): for
 * each market, pick HS_in or QR by lower mean CRPS; QR wins the market
 * only if its CRPSS over HS_in exceeds the threshold (default 1pp).
 */
export function selectMethodPerMarket(
  markets: ReadonlyArray<{
    readonly market: string;
    readonly crpsHsIn: number;
    readonly crpsQr: number;
  }>,
  qrWinThresholdPp = 1,
): ReadonlyArray<{ readonly market: string; readonly method: "hs-in" | "qr" }> {
  return markets.map((m) => {
    const skill = crpss(m.crpsQr, m.crpsHsIn) * 100;
    return {
      market: m.market,
      method: skill > qrWinThresholdPp ? ("qr" as const) : ("hs-in" as const),
    };
  });
}
