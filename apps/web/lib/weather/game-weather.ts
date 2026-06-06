import { assertIngestible } from "@sports/data-ingestion";

/**
 * Game-environment weather from the US National Weather Service (api.weather.gov).
 * NWS data is a US-government work in the public domain — free for commercial use,
 * no API key — so unlike Open-Meteo (commercial-ambiguous) it is unambiguously
 * clean. Weather is a real edge for outdoor games (wind kills passing/kicking).
 * Read-only, cached; honest empty state on failure.
 */

export interface NflVenue {
  readonly team: string;
  readonly stadium: string;
  readonly lat: number;
  readonly lon: number;
}

/** Outdoor / open-air NFL venues where weather actually moves outcomes (domes excluded). */
export const OUTDOOR_NFL_VENUES: readonly NflVenue[] = [
  { team: "GB", stadium: "Lambeau Field", lat: 44.5013, lon: -88.0622 },
  { team: "CHI", stadium: "Soldier Field", lat: 41.8623, lon: -87.6167 },
  { team: "BUF", stadium: "Highmark Stadium", lat: 42.7738, lon: -78.787 },
  { team: "NE", stadium: "Gillette Stadium", lat: 42.0909, lon: -71.2643 },
  { team: "CLE", stadium: "Huntington Bank Field", lat: 41.5061, lon: -81.6995 },
  { team: "PIT", stadium: "Acrisure Stadium", lat: 40.4468, lon: -80.0158 },
  { team: "CIN", stadium: "Paycor Stadium", lat: 39.0954, lon: -84.516 },
  { team: "KC", stadium: "Arrowhead Stadium", lat: 39.0489, lon: -94.4839 },
  { team: "DEN", stadium: "Empower Field", lat: 39.7439, lon: -105.02 },
  { team: "PHI", stadium: "Lincoln Financial Field", lat: 39.9008, lon: -75.1675 },
  { team: "NYJ/NYG", stadium: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  { team: "WAS", stadium: "Northwest Stadium", lat: 38.9077, lon: -76.8645 },
  { team: "BAL", stadium: "M&T Bank Stadium", lat: 39.278, lon: -76.6227 },
  { team: "SEA", stadium: "Lumen Field", lat: 47.5952, lon: -122.3316 },
  { team: "MIA", stadium: "Hard Rock Stadium", lat: 25.958, lon: -80.2389 },
  { team: "TB", stadium: "Raymond James Stadium", lat: 27.9759, lon: -82.5033 },
  { team: "CAR", stadium: "Bank of America Stadium", lat: 35.2258, lon: -80.8528 },
  { team: "JAX", stadium: "EverBank Stadium", lat: 30.3239, lon: -81.6373 },
  { team: "TEN", stadium: "Nissan Stadium", lat: 36.1665, lon: -86.7713 },
];

export interface VenueWeather {
  readonly team: string;
  readonly stadium: string;
  readonly status: "ok" | "error";
  readonly tempF: number | null;
  readonly windMph: number | null;
  readonly windDirection: string;
  readonly precipPct: number | null;
  readonly shortForecast: string;
  readonly observedFor: string | null;
  readonly error: string | null;
}

export interface NflGameWeather {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly venues: readonly VenueWeather[];
  readonly venuesLive: number;
  readonly canPublishPicks: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const USER_AGENT = "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)";
let cache: { readonly expiresAt: number; readonly value: NflGameWeather } | null = null;

function parseWindMph(windSpeed: string | undefined): number | null {
  if (!windSpeed) return null;
  const match = /(\d+)/.exec(windSpeed);
  return match ? Number(match[1]) : null;
}

async function fetchJson<T>(url: string, fetcher: FetchLike, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`NWS ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface PointsResponse {
  readonly properties?: { readonly forecastHourly?: string };
}
interface HourlyResponse {
  readonly properties?: {
    readonly periods?: ReadonlyArray<{
      readonly temperature?: number;
      readonly windSpeed?: string;
      readonly windDirection?: string;
      readonly probabilityOfPrecipitation?: { readonly value?: number | null };
      readonly shortForecast?: string;
      readonly startTime?: string;
    }>;
  };
}

async function fetchVenue(venue: NflVenue, fetcher: FetchLike, timeoutMs: number): Promise<VenueWeather> {
  try {
    const points = await fetchJson<PointsResponse>(
      `https://api.weather.gov/points/${venue.lat},${venue.lon}`,
      fetcher,
      timeoutMs,
    );
    const hourlyUrl = points.properties?.forecastHourly;
    if (!hourlyUrl) throw new Error("no hourly forecast URL");
    const hourly = await fetchJson<HourlyResponse>(hourlyUrl, fetcher, timeoutMs);
    const period = hourly.properties?.periods?.[0];
    if (!period) throw new Error("no forecast period");
    return {
      team: venue.team,
      stadium: venue.stadium,
      status: "ok",
      tempF: typeof period.temperature === "number" ? period.temperature : null,
      windMph: parseWindMph(period.windSpeed),
      windDirection: period.windDirection ?? "",
      precipPct: period.probabilityOfPrecipitation?.value ?? null,
      shortForecast: period.shortForecast ?? "",
      observedFor: period.startTime ?? null,
      error: null,
    };
  } catch (error) {
    return {
      team: venue.team,
      stadium: venue.stadium,
      status: "error",
      tempF: null,
      windMph: null,
      windDirection: "",
      precipPct: null,
      shortForecast: "",
      observedFor: null,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}

export function resetGameWeatherCacheForTests(): void {
  cache = null;
}

export async function loadNflGameWeather({
  venues = OUTDOOR_NFL_VENUES,
  timeoutMs = 12000,
  cacheTtlMs = 60 * 60 * 1000,
  fetcher = fetch,
}: {
  venues?: readonly NflVenue[];
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflGameWeather> {
  // Governance: nws-weather must be cleared in the registry before any fetch.
  assertIngestible("nws-weather");

  const now = Date.now();
  const live = fetcher === fetch;
  if (cacheTtlMs > 0 && live && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const settled = await Promise.allSettled(venues.map((v) => fetchVenue(v, fetcher, timeoutMs)));
  const results: VenueWeather[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          team: venues[i]!.team,
          stadium: venues[i]!.stadium,
          status: "error",
          tempF: null,
          windMph: null,
          windDirection: "",
          precipPct: null,
          shortForecast: "",
          observedFor: null,
          error: s.reason instanceof Error ? s.reason.message : "UNKNOWN",
        },
  );
  const venuesLive = results.filter((r) => r.status === "ok").length;

  const value: NflGameWeather = {
    generatedAt: new Date().toISOString(),
    status: venuesLive > 0 ? "live" : "source-error",
    venues: results.sort((a, b) => (b.windMph ?? -1) - (a.windMph ?? -1)),
    venuesLive,
    canPublishPicks: false,
    note: "Current hourly conditions at outdoor NFL venues from the US National Weather Service (public domain). Wind and precipitation move passing and kicking; this is real environment data, not a betting pick.",
    sourceUrl: "https://api.weather.gov",
    error: venuesLive > 0 ? null : "NWS returned no venue forecasts.",
  };
  if (cacheTtlMs > 0 && live && venuesLive > 0) cache = { expiresAt: now + cacheTtlMs, value };
  return value;
}
