/**
 * Stadium kickoff weather as an adjustment-layer input.
 *
 * Choice of source, measured 2026-10-02:
 * - Live path stays on NWS (apps/web/lib/weather/game-weather.ts). US government
 *   work, public domain, no key, commercial-clean.
 * - As-of backtest stays on Open-Meteo historical-forecast via getAsOfGameWeather.
 *   That is a forecast issued before the freeze. ERA5 is the weather that
 *   occurred. Using it as a pick-time feature is leakage. The mission asked for
 *   ERA5 so the rule can be backtested; this module fetches it only as
 *   source:"observed-era5" and refuses to emit a pick adjustment from it.
 * - Open-Meteo data is CC-BY-4.0. The hosted free API tier is non-commercial.
 *   Production serving must self-host or use NWS. Attribution is required.
 *
 * Dome handling is a site flag. The Ford Field grid on 2024-01-13T20Z returned
 * 23.1 mph of outdoor wind. The API does not know the roof is closed.
 */
import { getAsOfGameWeather, type GameWeatherQuery, type WeatherFeatures } from "./loaders/weather-edge.js";

export const WIND_MPH_PRIOR_THRESHOLD = 15;
export const EXTREME_COLD_F = 20;
export const EXTREME_HEAT_F = 95;
export const HEAVY_RAIN_INCH = 0.1;

export interface StadiumFlags {
  readonly windOver15: boolean;
  readonly heavyRain: boolean;
  readonly extremeCold: boolean;
  readonly extremeHeat: boolean;
  readonly weatherIrrelevant: boolean;
}

export interface WeatherAdjustment {
  readonly applied: boolean;
  readonly weightStatus: "prior" | "not-applied";
  readonly totalPoints: number | null;
  readonly passingDirection: "down" | "none";
  readonly kickingDirection: "down" | "none";
  readonly reasons: readonly string[];
  readonly source: WeatherFeatures["source"] | "observed-era5";
  readonly note: string;
}

export function flagsFrom(features: Pick<WeatherFeatures, "indoor" | "available" | "windMph" | "tempF" | "precipInch">): StadiumFlags {
  if (features.indoor) {
    return {
      windOver15: false,
      heavyRain: false,
      extremeCold: false,
      extremeHeat: false,
      weatherIrrelevant: true,
    };
  }
  if (!features.available) {
    return {
      windOver15: false,
      heavyRain: false,
      extremeCold: false,
      extremeHeat: false,
      weatherIrrelevant: false,
    };
  }
  return {
    windOver15: (features.windMph ?? 0) > WIND_MPH_PRIOR_THRESHOLD,
    heavyRain: (features.precipInch ?? 0) >= HEAVY_RAIN_INCH,
    extremeCold: features.tempF != null && features.tempF < EXTREME_COLD_F,
    extremeHeat: features.tempF != null && features.tempF > EXTREME_HEAT_F,
    weatherIrrelevant: false,
  };
}

/**
 * Logged adjustment. Priors, not weights. A null totalPoints means "do not
 * move the total." It is never a silent 0 standing in for a missing forecast.
 */
export function weatherAdjustment(features: WeatherFeatures): WeatherAdjustment {
  if (features.indoor) {
    return {
      applied: false,
      weightStatus: "not-applied",
      totalPoints: null,
      passingDirection: "none",
      kickingDirection: "none",
      reasons: ["dome-or-closed-roof"],
      source: features.source,
      note: "Weather irrelevant. Not a measured wind of 0.",
    };
  }
  if (!features.available) {
    return {
      applied: false,
      weightStatus: "not-applied",
      totalPoints: null,
      passingDirection: "none",
      kickingDirection: "none",
      reasons: ["upstream-unavailable"],
      source: features.source,
      note: "No forecast. The total is not moved. A missing forecast is not 0 mph.",
    };
  }
  const flags = flagsFrom(features);
  const reasons: string[] = [];
  let total = 0;
  if (flags.windOver15) {
    reasons.push("prior:wind>15mph hurts passing and kicking");
    total -= 1.5;
  }
  if (flags.heavyRain) {
    reasons.push("prior:heavy rain depresses the total");
    total -= 1.0;
  }
  if (flags.extremeCold) {
    reasons.push("prior:extreme cold <20F");
    total -= 0.5;
  }
  if (flags.extremeHeat) {
    reasons.push("prior:extreme heat >95F");
    total -= 0.5;
  }
  if (reasons.length === 0) {
    return {
      applied: false,
      weightStatus: "not-applied",
      totalPoints: null,
      passingDirection: "none",
      kickingDirection: "none",
      reasons: ["no-threshold-met"],
      source: features.source,
      note: "Forecast present. No prior threshold met. Total unchanged.",
    };
  }
  return {
    applied: true,
    weightStatus: "prior",
    totalPoints: total,
    passingDirection: flags.windOver15 || flags.heavyRain || flags.extremeCold ? "down" : "none",
    kickingDirection: flags.windOver15 || flags.heavyRain ? "down" : "none",
    reasons,
    source: features.source,
    note: "Prior only. Not calibrated. Not a published probability.",
  };
}

export async function stadiumKickoffWeather(
  query: GameWeatherQuery,
  deps: Parameters<typeof getAsOfGameWeather>[1],
): Promise<{ features: WeatherFeatures; flags: StadiumFlags; adjustment: WeatherAdjustment }> {
  const features = await getAsOfGameWeather(query, deps);
  const flags = flagsFrom(features);
  return { features, flags, adjustment: weatherAdjustment(features) };
}

/** Observed ERA5 hour. Not knowable at freeze time. Never an adjustment input. */
export interface ObservedEra5Hour {
  readonly source: "observed-era5";
  readonly usableAsPickFeature: false;
  readonly license: "CC-BY-4.0";
  readonly apiTerms: "hosted free tier is non-commercial; self-host or use NWS for production";
  readonly tempF: number | null;
  readonly windMph: number | null;
  readonly precipInch: number | null;
  readonly humidityPct: number | null;
}

export function parseObservedEra5Hour(hourly: {
  time: string[];
  temperature_2m?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  precipitation?: (number | null)[];
  relative_humidity_2m?: (number | null)[];
}, hour: string): ObservedEra5Hour | null {
  const i = hourly.time.indexOf(hour);
  if (i < 0) return null;
  const at = (arr?: (number | null)[]) => {
    const v = arr?.[i];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    source: "observed-era5",
    usableAsPickFeature: false,
    license: "CC-BY-4.0",
    apiTerms: "hosted free tier is non-commercial; self-host or use NWS for production",
    tempF: at(hourly.temperature_2m),
    windMph: at(hourly.wind_speed_10m),
    precipInch: at(hourly.precipitation),
    humidityPct: at(hourly.relative_humidity_2m),
  };
}
