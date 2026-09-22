/**
 * Safe-lead baseline Q(L,τ) — Brownian diffusion with NFL-calibrated
 * diffusivity D and drift from the pregame spread.
 *
 * Closed form (reflection principle) for the probability the current lead L
 * survives the remaining time τ:
 *   Q(L,τ) = Φ((L + μτ)/(σ√τ)) − e^(−2μL/σ²)·Φ((−L + μτ)/(σ√τ))
 * Serves the live win-probability stack as both a baseline WP and features
 * (lead-safety, expected lead changes remaining). D recalibrated per season.
 *
 * @see arXiv:1503.03509v1 — "Safe Leads and Lead Changes in Competitive Team Sports"
 *
 * ACCEPTANCE GATE: ADOPT the safe-lead features iff adding them to the live
 * WP model improves 2022–2024 log-loss by ≥ 1% with no calibration
 * degradation (reliability-curve slope within [0.95, 1.05]). The gate is a
 * backtest concern; this module is the pure diffusion kernel, not wired live.
 */

/** Standard normal CDF (A&S approximation). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp((-x * x) / 2) * poly * 0.3989422804014327;
  return x >= 0 ? cdf : 1 - cdf;
}

export interface SafeLeadParams {
  /** Lead L in points (home perspective; negative = trailing). */
  lead: number;
  /** Time remaining τ in minutes. */
  timeRemainingMin: number;
  /** Drift μ: expected point differential per minute (from pregame spread). */
  driftPerMin: number;
  /** Diffusivity σ: point std-dev per √minute (NFL-calibrated, per season). */
  diffusivity: number;
}

/**
 * Q(L,τ): probability the lead survives to the final whistle under Brownian
 * diffusion with drift. Clamp: L ≥ 0 required; a deficit returns 1 − Q(|L|)
 * with negated drift (symmetry).
 */
export function safeLeadProb(p: SafeLeadParams): number {
  const { timeRemainingMin: tau, driftPerMin: mu, diffusivity: sigma } = p;
  if (!(tau > 0)) return p.lead > 0 ? 1 : p.lead < 0 ? 0 : 0.5;
  if (!(sigma > 0)) throw new Error("safeLeadProb: diffusivity must be positive");
  const L = Math.abs(p.lead);
  const s = sigma * Math.sqrt(tau);
  const term1 = normalCdf((L + mu * tau) / s);
  const term2 =
    Math.exp((-2 * mu * L) / (sigma * sigma)) * normalCdf((-L + mu * tau) / s);
  const q = Math.min(1, Math.max(0, term1 - term2));
  return p.lead >= 0 ? q : 1 - q;
}

/**
 * Eventual-win probability under the same diffusion: P(X_τ + L > 0).
 * Unlike Q(L,τ) this is non-degenerate at L = 0, so it is the form the
 * live WP stack uses as a baseline feature.
 */
export function diffusionWinProb(
  lead: number,
  timeRemainingMin: number,
  driftPerMin: number,
  diffusivity: number,
): number {
  if (!(timeRemainingMin > 0)) return lead > 0 ? 1 : lead < 0 ? 0 : 0.5;
  if (!(diffusivity > 0)) throw new Error("diffusionWinProb: diffusivity must be positive");
  return normalCdf(
    (lead + driftPerMin * timeRemainingMin) / (diffusivity * Math.sqrt(timeRemainingMin)),
  );
}

/**
 * Lead-safety feature: eventual-win probability under Brownian diffusion
 * with drift from the pregame spread — feeds the live WP model as a
 * calibrated baseline feature.
 */
export function leadSafetyFeature(
  lead: number,
  timeRemainingMin: number,
  pregameSpread: number,
  diffusivity: number,
): number {
  // Spread of s points over 60 min ≈ s/60 expected differential per minute.
  return diffusionWinProb(lead, timeRemainingMin, pregameSpread / 60, diffusivity);
}

/**
 * Expected number of lead changes remaining: E ≈ (scoring-event rate) × τ ×
 * P(next score flips the leader). Simplified: 2·λ·τ·b·(1−b)·P(|L| < k̄),
 * where k̄ is the mean event point value.
 */
export function expectedLeadChangesRemaining(
  lead: number,
  timeRemainingMin: number,
  eventsPerMin: number,
  meanEventPoints: number,
  balance = 0.5,
): number {
  if (!(timeRemainingMin > 0) || !(eventsPerMin > 0)) return 0;
  const flipProb = normalCdf((meanEventPoints - Math.abs(lead)) / (meanEventPoints / 2));
  return 2 * eventsPerMin * timeRemainingMin * balance * (1 - balance) * flipProb;
}
