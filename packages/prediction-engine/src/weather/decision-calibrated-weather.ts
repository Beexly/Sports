
export interface WeatherSource {
  readonly name: string;
  /** Forecast values (e.g. wind mph) aligned with actuals. */
  readonly forecasts: readonly number[];
  readonly actuals: readonly number[];
}

/** Decision rule: act (1) when the forecast crosses the threshold. */
export function thresholdDecision(forecast: number, threshold: number): 1 | 0 {
  return forecast >= threshold ? 1 : 0;
}

/**
 * Decision value of a source: mean realized value of acting on its forecasts.
 * valuePerCorrect / valuePerWrong encode the betting payoff of the decision.
 */
export function decisionValue(
  source: WeatherSource,
  threshold: number,
  valuePerCorrect = 1,
  valuePerWrong = -1.1,
): number {
  if (source.forecasts.length !== source.actuals.length || source.forecasts.length === 0) {
    throw new Error("decision-calibrated-weather: aligned non-empty series required");
  }
  let total = 0;
  for (let i = 0; i < source.forecasts.length; i++) {
    const act = thresholdDecision(source.forecasts[i] ?? 0, threshold);
    const truth = thresholdDecision(source.actuals[i] ?? 0, threshold);
    total += act === 1 ? (truth === 1 ? valuePerCorrect : valuePerWrong) : 0;
  }
  return total / source.forecasts.length;
}

/** RMSE of a source (the accuracy baseline the gate compares against). */
export function rmse(source: WeatherSource): number {
  const n = source.forecasts.length;
  if (n === 0 || n !== source.actuals.length) throw new Error("decision-calibrated-weather: aligned non-empty series required");
  return Math.sqrt(
    source.forecasts.reduce((s, f, i) => s + (f - (source.actuals[i] ?? 0)) ** 2, 0) / n,
  );
}

/** Select the source with the highest decision value (ties -> first). */
export function selectWeatherSource(
  sources: readonly WeatherSource[],
  threshold: number,
): { name: string; decisionValue: number } {
  if (sources.length === 0) throw new Error("decision-calibrated-weather: need >= 1 source");
  let best = sources[0]!;
  let bestV = decisionValue(best, threshold);
  for (const s of sources.slice(1)) {
    const v = decisionValue(s, threshold);
    if (v > bestV) {
      best = s;
      bestV = v;
    }
  }
  return { name: best.name, decisionValue: bestV };
}
