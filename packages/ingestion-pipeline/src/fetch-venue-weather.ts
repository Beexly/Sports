/**
 * One outdoor venue, one National Weather Service reading. Fail closed.
 * A missing coordinate, a non-200, or a period with no wind is null — not a
 * guessed miles-per-hour and not a dome claim.
 */
import { nflTeamAbbr } from "./nfl-team-abbr.js";
import { OUTDOOR_NFL_VENUES } from "./nfl-outdoor-venues.js";

export interface VenueWeatherReading {
  readonly stadium: string;
  readonly windMph: number;
  readonly tempF: number | null;
  readonly observedFor: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function parseWindMph(windSpeed: string | undefined): number | null {
  if (!windSpeed) return null;
  const match = /(\d+)/.exec(windSpeed);
  return match ? Number(match[1]) : null;
}

export async function fetchOutdoorVenueWeather(
  teamName: string,
  fetcher: FetchLike,
  timeoutMs = 4000,
): Promise<VenueWeatherReading | null> {
  const abbr = nflTeamAbbr(teamName);
  if (abbr == null) return null;
  const venue = OUTDOOR_NFL_VENUES[abbr];
  if (venue == null) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const pointsRes = await fetcher(
      `https://api.weather.gov/points/${venue.lat},${venue.lon}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)",
          Accept: "application/geo+json",
        },
      },
    );
    if (!pointsRes.ok) return null;
    const points = (await pointsRes.json()) as {
      properties?: { forecastHourly?: string };
    };
    const hourlyUrl = points.properties?.forecastHourly;
    if (!hourlyUrl || !hourlyUrl.startsWith("https://api.weather.gov/")) return null;
    const hourlyRes = await fetcher(hourlyUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)",
        Accept: "application/geo+json",
      },
    });
    if (!hourlyRes.ok) return null;
    const hourly = (await hourlyRes.json()) as {
      properties?: {
        periods?: ReadonlyArray<{
          temperature?: number;
          windSpeed?: string;
          startTime?: string;
        }>;
      };
    };
    const period = hourly.properties?.periods?.[0];
    const windMph = parseWindMph(period?.windSpeed);
    if (windMph == null || !Number.isFinite(windMph)) return null;
    return {
      stadium: venue.stadium,
      windMph,
      tempF: typeof period?.temperature === "number" ? period.temperature : null,
      observedFor: period?.startTime ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
