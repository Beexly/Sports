/**
 * Open-Meteo weather adapter — FREE, no key, open license (CC-BY 4.0).
 *
 * Game-time weather is a free quality input for totals/passing models. Schema verified
 * live against https://api.open-meteo.com/v1/forecast (hourly arrays + units). The
 * parser is pure and tested against a captured fixture; the fetch wrapper is a thin shell.
 *
 * Rights: data is CC-BY (commercial OK with attribution); the hosted free API tier is
 * non-commercial/fair-use, so production should self-host the open data or use the
 * commercial tier. Attribution is required on any derived output.
 */

export const OPEN_METEO_ATTRIBUTION = "Weather data by Open-Meteo.com (CC-BY-4.0)";

const HOURLY_VARS = [
  "temperature_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "precipitation",
  "precipitation_probability",
  "relative_humidity_2m",
] as const;

export type HourlyWeather = {
  readonly time: string; // ISO 8601 (local to the requested timezone)
  readonly temperatureC: number | null;
  readonly windSpeedKmh: number | null;
  readonly windGustsKmh: number | null;
  readonly precipitationMm: number | null;
  readonly precipitationProbability: number | null;
  readonly relativeHumidity: number | null;
};

export type WeatherResult = {
  readonly sourceId: "open-meteo";
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly hourly: readonly HourlyWeather[];
  readonly attribution: string;
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: number[];
    precipitation?: number[];
    precipitation_probability?: number[];
    relative_humidity_2m?: number[];
  };
};

function at(arr: number[] | undefined, i: number): number | null {
  const v = arr?.[i];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure parser — verified against the live Open-Meteo schema. */
export function parseOpenMeteo(json: OpenMeteoResponse): WeatherResult {
  const h = json.hourly ?? {};
  const times = Array.isArray(h.time) ? h.time : [];
  const hourly: HourlyWeather[] = times.map((time, i) => ({
    time,
    temperatureC: at(h.temperature_2m, i),
    windSpeedKmh: at(h.wind_speed_10m, i),
    windGustsKmh: at(h.wind_gusts_10m, i),
    precipitationMm: at(h.precipitation, i),
    precipitationProbability: at(h.precipitation_probability, i),
    relativeHumidity: at(h.relative_humidity_2m, i),
  }));

  return {
    sourceId: "open-meteo",
    latitude: json.latitude ?? 0,
    longitude: json.longitude ?? 0,
    timezone: json.timezone ?? "UTC",
    hourly,
    attribution: OPEN_METEO_ATTRIBUTION,
  };
}

export function openMeteoUrl(latitude: number, longitude: number, opts: { forecastDays?: number; timezone?: string } = {}): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARS.join(","),
    forecast_days: String(opts.forecastDays ?? 3),
    timezone: opts.timezone ?? "auto",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

/** Pick the hourly entry closest to a kickoff time (ISO). */
export function weatherAtKickoff(result: WeatherResult, kickoffIso: string): HourlyWeather | null {
  const target = Date.parse(kickoffIso);
  if (Number.isNaN(target) || result.hourly.length === 0) return null;
  let best: HourlyWeather | null = null;
  let bestDelta = Infinity;
  for (const h of result.hourly) {
    const delta = Math.abs(Date.parse(h.time) - target);
    if (Number.isFinite(delta) && delta < bestDelta) {
      bestDelta = delta;
      best = h;
    }
  }
  return best;
}

export type FetchOptions = { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number; readonly forecastDays?: number };

export async function fetchWeather(
  latitude: number,
  longitude: number,
  opts: FetchOptions = {},
): Promise<WeatherResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(openMeteoUrl(latitude, longitude, { forecastDays: opts.forecastDays }), {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const json = (await res.json()) as OpenMeteoResponse;
    return parseOpenMeteo(json);
  } finally {
    clearTimeout(timer);
  }
}
