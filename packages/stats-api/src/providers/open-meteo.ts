/**
 * Open-Meteo weather value provider — free CC-BY path.
 * Pass lat/lon via entityId format "lat,lon" or use defaults.
 */

import type { ValueProvider } from "../values.js";

export interface OpenMeteoClient {
  fetchCurrent(lat: number, lon: number, asOf: string): Promise<{
    temperature_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
    relative_humidity_2m?: number;
  }>;
}

export function parseLatLon(entityId: string): { lat: number; lon: number } | null {
  const m = entityId.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { lat: Number(m[1]), lon: Number(m[2]) };
}

export function createOpenMeteoProvider(client: OpenMeteoClient): ValueProvider {
  return async (metric, entityId) => {
    if (!metric.id.startsWith("ctx.weather.")) return null;
    const loc = parseLatLon(entityId) ?? { lat: 39.1, lon: -84.5 }; // default: stadium-ish
    const cur = await client.fetchCurrent(loc.lat, loc.lon, "");
    switch (metric.id) {
      case "ctx.weather.temp_f": {
        const c = cur.temperature_2m;
        return c == null ? null : Math.round((c * 9) / 5 + 32);
      }
      case "ctx.weather.wind_mph": {
        const k = cur.wind_speed_10m;
        return k == null ? null : Math.round(k * 0.621371);
      }
      case "ctx.weather.precip_mm":
        return cur.precipitation ?? null;
      case "ctx.weather.humidity":
        return cur.relative_humidity_2m ?? null;
      default:
        return null;
    }
  };
}

/** Live fetch client — only use server-side. */
export function liveOpenMeteoClient(fetchImpl: typeof fetch = fetch): OpenMeteoClient {
  return {
    async fetchCurrent(lat, lon) {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lon));
      url.searchParams.set(
        "current",
        "temperature_2m,wind_speed_10m,precipitation,relative_humidity_2m",
      );
      const res = await fetchImpl(url.toString(), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const body = (await res.json()) as { current?: Record<string, number> };
      return body.current ?? {};
    },
  };
}
