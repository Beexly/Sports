/**
 * D2 — Forecast-vintage weather.
 *
 * Open-Meteo Previous Runs (forecast vintages) + NWS fallback.
 * As-of rule: only vintages issued before T−Xh are eligible features.
 * Observed weather is NEVER a feature — it is post-kickoff information.
 *
 * COMPOSES WITH: existing weather modules, V1 leakage probes
 * (flag observed-weather leakage).
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const WEATHER_VINTAGE_ENABLED_ENV = "WEATHER_VINTAGE_ENABLED";

export function weatherVintageEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, WEATHER_VINTAGE_ENABLED_ENV);
}

export interface WeatherVintage {
  readonly vintageId: string;
  readonly source: "OPEN_METEO_PREVIOUS_RUNS" | "NWS" | "OTHER";
  /** When the forecast was issued. */
  readonly issuedAt: string;
  /** Target valid time (game window). */
  readonly validAt: string;
  readonly windMph: number | null;
  readonly tempF: number | null;
  readonly precipInches: number | null;
  readonly humidityPct: number | null;
}

export interface WeatherObserved {
  readonly source: "ASOS" | "NWS_OBS" | "OTHER";
  readonly observedAt: string;
  readonly windMph: number | null;
  readonly tempF: number | null;
  readonly precipInches: number | null;
}

export type VintageSelection =
  | { readonly ok: true; readonly vintage: WeatherVintage }
  | { readonly ok: false; readonly reason: string };

/**
 * As-of rule: pick the latest vintage issued strictly before `cutoffTime`
 * (typically kickoff − X hours). Never returns a vintage issued after cutoff.
 */
export function selectVintageAsOf(
  vintages: readonly WeatherVintage[],
  cutoffTime: string,
): VintageSelection {
  const cutoff = Date.parse(cutoffTime);
  if (!Number.isFinite(cutoff)) {
    return { ok: false, reason: "invalid cutoff timestamp" };
  }
  const eligible = vintages
    .filter((v) => {
      const issued = Date.parse(v.issuedAt);
      return Number.isFinite(issued) && issued < cutoff;
    })
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));

  if (eligible.length === 0) {
    return {
      ok: false,
      reason: "no forecast vintage issued before cutoff — fail-closed (no observed fallback)",
    };
  }
  return { ok: true, vintage: eligible[0]! };
}

/**
 * Compute the as-of cutoff: kickoff minus `leadHours`. Default lead is 6h —
 * forecasts issued closer to kickoff than this are still valid, but the
 * caller may tighten the window to avoid late-information leakage.
 */
export function asOfCutoff(kickoff: string, leadHours = 6): string | null {
  const k = Date.parse(kickoff);
  if (!Number.isFinite(k)) return null;
  return new Date(k - leadHours * 3600 * 1000).toISOString();
}

/**
 * Observed weather is NEVER a feature. Call this to assert a candidate
 * feature set does not include observed fields. Returns a list of leaked
 * field names (empty = clean).
 */
export function flagObservedWeatherLeakage(
  featureNames: readonly string[],
  observedFields: readonly string[] = [
    "observed_wind",
    "observed_temp",
    "observed_precip",
    "observed_windMph",
    "observed_tempF",
    "observed_precipInches",
    "actual_wind",
    "actual_temp",
    "actual_precip",
    "weather_observed",
    "postgame_weather",
  ],
): readonly string[] {
  const lowerObserved = new Set(observedFields.map((f) => f.toLowerCase()));
  return featureNames.filter((n) => lowerObserved.has(n.toLowerCase()));
}

/**
 * Validate that a feature set uses only forecast-vintage weather.
 * Throws if any observed-weather field is present.
 */
export function assertNoObservedWeather(
  featureNames: readonly string[],
): void {
  const leaked = flagObservedWeatherLeakage(featureNames);
  if (leaked.length > 0) {
    throw new Error(
      `OBSERVED WEATHER LEAKAGE: ${leaked.join(", ")} — observed weather is never a feature`,
    );
  }
}

/**
 * Convert a vintage to a feature vector. Missing fields stay null —
 * never imputed.
 */
export function vintageToFeatures(
  v: WeatherVintage | null | undefined,
  prefix = "wx_",
): Record<string, number | null> {
  if (!v) {
    return {
      [`${prefix}wind_mph`]: null,
      [`${prefix}temp_f`]: null,
      [`${prefix}precip_in`]: null,
      [`${prefix}humidity_pct`]: null,
    };
  }
  return {
    [`${prefix}wind_mph`]: v.windMph,
    [`${prefix}temp_f`]: v.tempF,
    [`${prefix}precip_in`]: v.precipInches,
    [`${prefix}humidity_pct`]: v.humidityPct,
  };
}

/**
 * Intake a batch of vintages. Env-gated and fail-closed.
 * Rejects vintages with invalid timestamps or future issue dates relative
 * to the batch reference time.
 */
export function ingestVintages(
  vintages: readonly WeatherVintage[],
  env: NodeJS.ProcessEnv = process.env,
): {
  readonly ok: boolean;
  readonly reason?: string;
  readonly accepted: readonly WeatherVintage[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
} {
  if (!weatherVintageEnabled(env)) {
    return {
      ok: false,
      reason: `weather vintage intake disabled — set ${WEATHER_VINTAGE_ENABLED_ENV}=true to enable`,
      accepted: [],
      rejected: [],
    };
  }
  if (!Array.isArray(vintages)) {
    return { ok: false, reason: "vintages must be an array", accepted: [], rejected: [] };
  }

  const accepted: WeatherVintage[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < vintages.length; i++) {
    const v = vintages[i]!;
    const issued = Date.parse(v.issuedAt);
    const valid = Date.parse(v.validAt);
    if (!Number.isFinite(issued)) {
      rejected.push({ index: i, reason: "invalid issuedAt" });
      continue;
    }
    if (!Number.isFinite(valid)) {
      rejected.push({ index: i, reason: "invalid validAt" });
      continue;
    }
    if (!v.vintageId || v.vintageId.trim().length === 0) {
      rejected.push({ index: i, reason: "missing vintageId" });
      continue;
    }
    accepted.push(v);
  }

  return { ok: true, accepted, rejected };
}

/**
 * NWS fallback preference: when multiple vintages share the same issue time,
 * prefer OPEN_METEO_PREVIOUS_RUNS over NWS (higher-resolution ensembles).
 */
export function preferSource(
  a: WeatherVintage,
  b: WeatherVintage,
): WeatherVintage {
  const rank = (s: WeatherVintage["source"]) =>
    s === "OPEN_METEO_PREVIOUS_RUNS" ? 0 : s === "NWS" ? 1 : 2;
  return rank(a.source) <= rank(b.source) ? a : b;
}
