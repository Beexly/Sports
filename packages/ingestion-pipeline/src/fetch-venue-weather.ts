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
  readonly precipType: "NONE" | "LIGHT_RAIN" | "SNOW" | "FREEZING_RAIN" | null;
  readonly observedFor: string | null;
}

export function classifyPrecip(shortForecast: string | null | undefined): VenueWeatherReading["precipType"] {
  if (shortForecast == null || shortForecast.trim() === "") return null;
  const text = shortForecast.toLowerCase();
  if (text.includes("freezing rain") || text.includes("sleet") || text.includes("ice pellet")) return "FREEZING_RAIN";
  if (text.includes("snow")) return "SNOW";
  if (text.includes("rain") || text.includes("shower") || text.includes("drizzle")) return "LIGHT_RAIN";
  return "NONE";
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function parseWindMph(windSpeed: string | undefined): number | null {
  if (!windSpeed) return null;
  const match = /(\d+)/.exec(windSpeed);
  return match ? Number(match[1]) : null;
}

function periodCoveringKickoff<T extends { startTime?: string; endTime?: string }>(
  periods: readonly T[],
  at: Date,
): T | null {
  const target = at.getTime();
  if (!Number.isFinite(target)) return null;
  for (const period of periods) {
    const start = Date.parse(period.startTime ?? "");
    const end = Date.parse(period.endTime ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    if (target >= start && target < end) return period;
  }
  return null;
}

export async function fetchOutdoorVenueWeather(
  teamName: string,
  fetcher: FetchLike,
  timeoutMs = 4000,
  at?: Date,
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
          shortForecast?: string;
          startTime?: string;
        }>;
      };
    };
    const periods = hourly.properties?.periods ?? [];
    // No kickoff: the first period is the current hour, which is what the
    // existing callers asked for. A kickoff with no covering period abstains.
    // Using "now" for a game hours away is the wrong wind.
    const period = at == null ? periods[0] : periodCoveringKickoff(periods, at);
    const windMph = parseWindMph(period?.windSpeed);
    if (windMph == null || !Number.isFinite(windMph)) return null;
    return {
      stadium: venue.stadium,
      windMph,
      tempF: typeof period?.temperature === "number" ? period.temperature : null,
      precipType: classifyPrecip(period?.shortForecast),
      observedFor: period?.startTime ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
