/**
 * arXiv:2608.28598 — OhmicFlow: Forecasting transit passenger flow under extreme weather disruptions via Ohm's law
 *
 * Weather counterfactual inference: train with weather features, then at inference run each game twice —
 * factual weather vs counterfactual neutral (70F, 5 mph, no precip) — so the counterfactual is a
 * weather-neutral team strength and factual-minus-counterfactual is the weather-edge diagnostic.
 *
 * Improvement: Build weather/counterfactual.py: train the game-outcome model with weather features included, then at inference run each game twice - factual weather vs counterfactual neutral references (70F, 5 mph wind, no precip) - so the counterfactual output serves as a weather-neutral team strength for ratings and the factual-minus-counterfactual difference becomes a weather-edge diagnostic for weather-line shopping.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT weather-neutral ratings if counterfactual ratings predict next-game margin with >= 0.3 points lower MAE than factual ratings on 2024 holdout (stability win) AND the weather-edge term has the correct sign on >= 60% of extreme-weather games; REJECT if the counterfactual pass just reproduces the no-weather model.
 */

/** Weather inputs for one game. */
export interface GameWeather {
  tempF: number;
  windMph: number;
  precipIn: number;
  dome: boolean;
}

/** Neutral reference weather (the counterfactual). */
export const NEUTRAL_WEATHER: GameWeather = { tempF: 70, windMph: 5, precipIn: 0, dome: false };

/** Linear outcome model: base strength + weather loadings (host-supplied fit). */
export interface WeatherOutcomeModel {
  baseStrength: number; // team strength component (no weather)
  windLoading: number;  // points per mph above neutral
  tempLoading: number;  // points per degF below neutral
  precipLoading: number;// points per inch
  domeLoading: number;  // dome bonus vs outdoor neutral
}

/** Predicted margin under given weather. */
export function predictMargin(m: WeatherOutcomeModel, w: GameWeather): number {
  const windEff = m.windLoading * Math.max(0, w.windMph - NEUTRAL_WEATHER.windMph);
  const tempEff = m.tempLoading * Math.max(0, NEUTRAL_WEATHER.tempF - w.tempF);
  const precipEff = m.precipLoading * w.precipIn;
  const domeEff = w.dome ? m.domeLoading : 0;
  return m.baseStrength + windEff + tempEff + precipEff + domeEff;
}

/**
 * Counterfactual pass: { neutral, factual, weatherEdge } where weatherEdge =
 * factual - neutral is the weather-edge diagnostic for weather-line shopping.
 */
export function weatherCounterfactual(
  m: WeatherOutcomeModel,
  factual: GameWeather,
): { neutral: number; factual: number; weatherEdge: number } {
  const neutral = predictMargin(m, NEUTRAL_WEATHER);
  const factualPred = predictMargin(m, factual);
  return { neutral, factual: factualPred, weatherEdge: factualPred - neutral };
}
