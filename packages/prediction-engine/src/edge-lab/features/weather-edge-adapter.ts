/**
 * The W-WEATHER-REC seam: adapt the vendored as-of loader's output
 * (loaders/weather-edge.ts, WeatherFeatures) into the edge-lab feature
 * builder's input (nfl-weather.ts, GameWeatherForecast) â€” completing the ONE
 * canonical weather path:
 *
 *   getAsOfGameWeather (loader, as-of fetch, provenance)
 *     â†’ toGameWeatherForecast (this file)
 *       â†’ buildWeatherFeatureRows (leak gate at the store rails)
 *         â†’ Â§5 trials registry (admit or honestly reject)
 *
 * Honesty mapping:
 *   - available:false â†’ null (the feature layer records skipped.noWeather â€”
 *     never a fabricated neutral).
 *   - indoor â†’ isDome:true (neutralized signal, which is itself signal).
 *   - forecastIssuedAt := the loader's asOfUtc â€” the loader's contract is that
 *     everything it returns was knowable AT asOfUtc, so asOfUtc is the honest
 *     LATEST bound on the issue instant. The feature layer then enforces
 *     issuedAt â‰¤ decision cutoff, so a mis-called loader (asOf after cutoff)
 *     is dropped as leaky rather than trusted.
 */

import type { GameWeatherForecast } from "./nfl-weather.js";
import type { WeatherFeatures } from "../loaders/weather-edge.js";

export function toGameWeatherForecast(w: WeatherFeatures): GameWeatherForecast | null {
  if (!w.available) return null;
  return {
    forecastIssuedAt: w.asOfUtc,
    isDome: w.indoor,
    windMph: w.windMph,
    precipProbPct: w.precipProbPct,
    tempF: w.tempF,
  };
}
