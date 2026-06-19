/**
 * Open-Meteo URL builder and response parser.
 *
 * PURE FUNCTIONS ONLY — no network calls in this file.
 *
 * Open-Meteo is registered in the Source Rights Registry as "approved_open_license"
 * (CC-BY-4.0). Attribution: "Weather data by Open-Meteo.com (CC-BY-4.0)"
 *
 * Every caller MUST gate on checkClearance("open-meteo") before fetching.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenMeteoParams {
  readonly latitude: number;
  readonly longitude: number;
  /** ISO-8601 datetime string for the target game kickoff time */
  readonly kickoffISO: string;
  /** Number of forecast days (1–16). Default 3. */
  readonly forecastDays?: number;
}

/**
 * Parsed game-time weather — a single data point for one hour near kickoff.
 * All fields are facts from the Open-Meteo API response; nothing is fabricated.
 */
export interface GameWeather {
  /** Temperature at game time in degrees Fahrenheit */
  readonly tempF: number;
  /** Wind speed at 10 m in mph */
  readonly windMph: number;
  /** Precipitation probability 0–100 */
  readonly precipProbPct: number;
  /** WMO weather interpretation code (https://open-meteo.com/en/docs) */
  readonly code: number;
  /** Human-readable summary derived from the WMO code */
  readonly summary: string;
  /** Attribution text required by CC-BY-4.0 license */
  readonly attribution: string;
}

// ─── WMO weather code descriptions ───────────────────────────────────────────

/**
 * WMO weather interpretation code → plain English summary.
 * Source: https://open-meteo.com/en/docs (WMO 4677 subset used by Open-Meteo).
 */
const WMO_DESCRIPTIONS: Readonly<Record<number, string>> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function wmoDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? `Conditions (code ${code})`;
}

// ─── URL builder ─────────────────────────────────────────────────────────────

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Build the Open-Meteo forecast URL for the given game location.
 *
 * Hourly variables: temperature_2m, precipitation_probability,
 * wind_speed_10m, weather_code.
 *
 * Temperature unit: Fahrenheit. Wind speed unit: mph.
 */
export function buildOpenMeteoUrl(params: OpenMeteoParams): string {
  const forecastDays = params.forecastDays ?? 3;
  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", params.latitude.toString());
  url.searchParams.set("longitude", params.longitude.toString());
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,wind_speed_10m,weather_code",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("forecast_days", forecastDays.toString());
  url.searchParams.set("timezone", "UTC");
  return url.toString();
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface OpenMeteoHourlyResponse {
  readonly hourly?: {
    readonly time?: readonly string[];
    readonly temperature_2m?: readonly (number | null)[];
    readonly precipitation_probability?: readonly (number | null)[];
    readonly wind_speed_10m?: readonly (number | null)[];
    readonly weather_code?: readonly (number | null)[];
  };
}

// ─── Response parser ──────────────────────────────────────────────────────────

/**
 * Find the index of the hourly slot nearest to the kickoff time.
 * Returns -1 if the kickoff is not within the forecast window.
 */
function nearestHourIndex(times: readonly string[], kickoffISO: string): number {
  const kickoffMs = Date.parse(kickoffISO);
  if (Number.isNaN(kickoffMs)) return -1;

  let bestIdx = -1;
  let bestDelta = Infinity;

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t === undefined) continue;
    const tMs = Date.parse(t);
    if (Number.isNaN(tMs)) continue;
    const delta = Math.abs(tMs - kickoffMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }

  // Only return a slot that is within 12 hours of kickoff
  return bestDelta <= 12 * 60 * 60 * 1000 ? bestIdx : -1;
}

/**
 * Parse an Open-Meteo hourly response and extract the data point nearest to
 * the given kickoff time.
 *
 * Returns `null` on any malformed, incomplete, or out-of-window response —
 * never throws.
 */
export function parseOpenMeteoResponse(
  raw: unknown,
  kickoffISO: string,
): GameWeather | null {
  if (!raw || typeof raw !== "object") return null;
  const resp = raw as OpenMeteoHourlyResponse;
  const hourly = resp.hourly;
  if (!hourly) return null;

  const times = hourly.time;
  if (!Array.isArray(times) || times.length === 0) return null;

  const idx = nearestHourIndex(times as readonly string[], kickoffISO);
  if (idx === -1) return null;

  const tempArr = hourly.temperature_2m;
  const precipArr = hourly.precipitation_probability;
  const windArr = hourly.wind_speed_10m;
  const codeArr = hourly.weather_code;

  if (!Array.isArray(tempArr) || !Array.isArray(precipArr) || !Array.isArray(windArr) || !Array.isArray(codeArr)) {
    return null;
  }

  const tempF = tempArr[idx];
  const precipProbPct = precipArr[idx];
  const windMph = windArr[idx];
  const code = codeArr[idx];

  if (
    typeof tempF !== "number" ||
    typeof precipProbPct !== "number" ||
    typeof windMph !== "number" ||
    typeof code !== "number"
  ) {
    return null;
  }

  return {
    tempF: Math.round(tempF),
    windMph: Math.round(windMph),
    precipProbPct: Math.round(precipProbPct),
    code,
    summary: wmoDescription(code),
    attribution: "Weather data by Open-Meteo.com (CC-BY-4.0)",
  };
}
