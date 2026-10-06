/**
 * Total-signal adjustment-layer input for stadium weather.
 *
 * Spec: motif/total-signal-wiring-2026-09-27, section 5 (weather).
 * This is the logged adjustment. It is a prior. It does not change a
 * published probability and it does not fit a weight.
 */
export {
  flagsFrom,
  stadiumKickoffWeather,
  weatherAdjustment,
  type WeatherAdjustment,
} from "@sports/prediction-engine/src/edge-lab/stadium-weather.js";
