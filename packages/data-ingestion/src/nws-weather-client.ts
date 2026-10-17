/**
 * nws-weather-client.ts — Keyless National Weather Service (NWS) Client.
 *
 * Grounded in empirical football weather science:
 * - Two-step NWS API:
 *   1. GET https://api.weather.gov/points/{lat},{lon}
 *   2. GET properties.forecastHourly
 * - Maps temperature, wind speed, precipitation into GameContext.
 * - Handles indoor/dome venues with zero wind and climate-controlled baseline.
 * - In-memory cache for gridpoint URLs and hourly forecasts.
 * - Fail-soft: returns neutral baseline on network failure.
 */

export interface WeatherContextReading {
  readonly temperatureF: number;
  readonly windSpeedMph: number;
  readonly precipitationRateMmHr: number;
  readonly weatherSummary: string;
  readonly isIndoor: boolean;
  readonly source: "nws" | "indoor" | "neutral_fallback";
}

// Known coordinates for NFL and major NCAA football venues (lat, lon)
export const VENUE_COORDINATES: Record<string, { lat: number; lon: number; indoor?: boolean }> = {
  // NFL Stadiums
  "empower field at mile high": { lat: 39.7439, lon: -105.0201 }, // Denver, CO (altitude 5280)
  "lumen field": { lat: 47.5952, lon: -122.3316 }, // Seattle, WA
  "arrowhead stadium": { lat: 39.0489, lon: -94.4839 }, // Kansas City, MO
  "geha field at arrowhead stadium": { lat: 39.0489, lon: -94.4839 },
  "lambeau field": { lat: 44.5013, lon: -88.0622 }, // Green Bay, WI
  "soldier field": { lat: 41.8623, lon: -87.6167 }, // Chicago, IL
  "highmark stadium": { lat: 42.7738, lon: -78.7870 }, // Orchard Park, NY
  "gillette stadium": { lat: 42.0909, lon: -71.2643 }, // Foxborough, MA
  "metlife stadium": { lat: 40.8128, lon: -74.0742 }, // East Rutherford, NJ
  "lincoln financial field": { lat: 39.9008, lon: -75.1675 }, // Philadelphia, PA
  "m&t bank stadium": { lat: 39.2780, lon: -76.6227 }, // Baltimore, MD
  "acrisure stadium": { lat: 40.4468, lon: -80.0158 }, // Pittsburgh, PA
  "cleveland browns stadium": { lat: 41.5061, lon: -81.6995 }, // Cleveland, OH
  "paycor stadium": { lat: 39.0955, lon: -84.5161 }, // Cincinnati, OH
  "nissan stadium": { lat: 36.1665, lon: -86.7713 }, // Nashville, TN
  "bank of america stadium": { lat: 35.2258, lon: -80.8528 }, // Charlotte, NC
  "raymond james stadium": { lat: 27.9759, lon: -82.5033 }, // Tampa, FL
  "hard rock stadium": { lat: 25.9580, lon: -80.2389 }, // Miami Gardens, FL
  "everbank stadium": { lat: 30.3239, lon: -81.6373 }, // Jacksonville, FL
  "mercedes-benz stadium": { lat: 33.7554, lon: -84.4010, indoor: true }, // Atlanta, GA
  "caesars superdome": { lat: 29.9511, lon: -90.0812, indoor: true }, // New Orleans, LA
  "ford field": { lat: 42.3400, lon: -83.0456, indoor: true }, // Detroit, MI
  "u.s. bank stadium": { lat: 44.9735, lon: -93.2575, indoor: true }, // Minneapolis, MN
  "lucas oil stadium": { lat: 39.7601, lon: -86.1639, indoor: true }, // Indianapolis, IN
  "nrg stadium": { lat: 29.6847, lon: -95.4107, indoor: true }, // Houston, TX
  "at&t stadium": { lat: 32.7473, lon: -97.0945, indoor: true }, // Arlington, TX
  "state farm stadium": { lat: 33.5276, lon: -112.2626, indoor: true }, // Glendale, AZ
  "allegiant stadium": { lat: 36.0909, lon: -115.1833, indoor: true }, // Las Vegas, NV
  "sofi stadium": { lat: 33.9535, lon: -118.3390, indoor: true }, // Inglewood, CA
  "levi's stadium": { lat: 37.4033, lon: -121.9694 }, // Santa Clara, CA

  // College Football Stadiums
  "memorial stadium (bloomington, in)": { lat: 39.1809, lon: -86.5256 }, // Indiana
  "memorial stadium": { lat: 39.1809, lon: -86.5256 },
  "ohio stadium": { lat: 40.0016, lon: -83.0197 }, // Ohio State
  "michigan stadium": { lat: 42.2658, lon: -83.7487 }, // Michigan
  "beaver stadium": { lat: 40.8122, lon: -77.8561 }, // Penn State
  "bryant-denny stadium": { lat: 33.2083, lon: -87.5504 }, // Alabama
  "tiger stadium": { lat: 30.4120, lon: -91.1838 }, // LSU
  "sanford stadium": { lat: 33.9498, lon: -83.3734 }, // Georgia
  "ben hill griffin stadium": { lat: 29.6499, lon: -82.3486 }, // Florida
  "kyle field": { lat: 30.6102, lon: -96.3407 }, // Texas A&M
  "darrell k royal-texas memorial stadium": { lat: 30.2837, lon: -97.7325 }, // Texas
  "notre dame stadium": { lat: 41.6984, lon: -86.2339 }, // Notre Dame
  "neyland stadium": { lat: 35.9550, lon: -83.9250 }, // Tennessee
  "rice-eccles stadium": { lat: 40.7598, lon: -111.8488 }, // Utah (Salt Lake City)
  "autzen stadium": { lat: 44.0583, lon: -123.0685 }, // Oregon
  "husky stadium": { lat: 47.6504, lon: -122.3016 }, // Washington
  "camp randall stadium": { lat: 43.0701, lon: -89.4127 }, // Wisconsin
  "memorial stadium (lincoln)": { lat: 40.8206, lon: -96.7056 }, // Nebraska
  "kinnick stadium": { lat: 41.6586, lon: -91.5511 }, // Iowa
  "ross-ade stadium": { lat: 40.4417, lon: -86.9183 }, // Purdue
};

// City/State fallback coordinates
export const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "bloomington, in": { lat: 39.1653, lon: -86.5264 },
  "denver, co": { lat: 39.7392, lon: -104.9903 },
  "columbus, oh": { lat: 39.9612, lon: -82.9988 },
  "ann arbor, mi": { lat: 42.2808, lon: -83.7430 },
  "chicago, il": { lat: 41.8781, lon: -87.6298 },
  "green bay, wi": { lat: 44.5192, lon: -88.0198 },
  "orchard park, ny": { lat: 42.7676, lon: -78.7439 },
  "buffalo, ny": { lat: 42.8864, lon: -78.8784 },
  "philadelphia, pa": { lat: 39.9526, lon: -75.1652 },
  "pittsburgh, pa": { lat: 40.4406, lon: -79.9959 },
  "cleveland, oh": { lat: 41.4993, lon: -81.6944 },
  "cincinnati, oh": { lat: 39.1031, lon: -84.5120 },
  "baltimore, md": { lat: 39.2904, lon: -76.6122 },
  "nashville, tn": { lat: 36.1627, lon: -86.7816 },
  "charlotte, nc": { lat: 35.2271, lon: -80.8431 },
  "tampa, fl": { lat: 27.9506, lon: -82.4572 },
  "miami, fl": { lat: 25.7617, lon: -80.1918 },
  "jacksonville, fl": { lat: 30.3322, lon: -81.6557 },
  "atlanta, ga": { lat: 33.7490, lon: -84.3880 },
  "new orleans, la": { lat: 29.9511, lon: -90.0715 },
  "detroit, mi": { lat: 42.3314, lon: -83.0458 },
  "minneapolis, mn": { lat: 44.9778, lon: -93.2650 },
  "indianapolis, in": { lat: 39.7684, lon: -86.1581 },
  "houston, tx": { lat: 29.7604, lon: -95.3698 },
  "dallas, tx": { lat: 32.7767, lon: -96.7970 },
  "arlington, tx": { lat: 32.7357, lon: -97.1081 },
  "kansas city, mo": { lat: 39.0997, lon: -94.5786 },
  "las vegas, nv": { lat: 36.1699, lon: -115.1398 },
  "los angeles, ca": { lat: 34.0522, lon: -118.2437 },
  "seattle, wa": { lat: 47.6062, lon: -122.3321 },
  "san francisco, ca": { lat: 37.7749, lon: -122.4194 },
  "salt lake city, ut": { lat: 40.7608, lon: -111.8910 },
  "austin, tx": { lat: 30.2672, lon: -97.7431 },
  "gainesville, fl": { lat: 29.6516, lon: -82.3248 },
  "tuscaloosa, al": { lat: 33.2098, lon: -87.5692 },
  "knoxville, tn": { lat: 35.9606, lon: -83.9207 },
  "baton rouge, la": { lat: 30.4515, lon: -91.1871 },
  "athens, ga": { lat: 33.9519, lon: -83.3576 },
};

export function resolveVenueCoordinates(venueName?: string, city?: string, state?: string): { lat: number; lon: number; indoor?: boolean } | null {
  if (venueName) {
    const vKey = venueName.trim().toLowerCase();
    if (VENUE_COORDINATES[vKey]) {
      return VENUE_COORDINATES[vKey]!;
    }
    for (const [key, coords] of Object.entries(VENUE_COORDINATES)) {
      if (vKey.includes(key) || key.includes(vKey)) {
        return coords;
      }
    }
  }

  if (city && state) {
    const cKey = `${city.trim().toLowerCase()}, ${state.trim().toLowerCase()}`;
    if (CITY_COORDINATES[cKey]) {
      return CITY_COORDINATES[cKey]!;
    }
  }

  return null;
}

// Caches: gridpoints URL cache and forecast cache (1-hour TTL)
const gridpointsUrlCache = new Map<string, string>();
const forecastCache = new Map<string, { data: WeatherContextReading; timestamp: number }>();
const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000;

export function clearWeatherCacheForTests(): void {
  gridpointsUrlCache.clear();
  forecastCache.clear();
}

/**
 * Fetches real weather from NWS two-step points/forecast API.
 */
export async function fetchNwsWeather(
  lat: number,
  lon: number,
  isIndoorVenue = false,
  customFetch: typeof fetch = fetch,
): Promise<WeatherContextReading> {
  if (isIndoorVenue) {
    return {
      temperatureF: 72,
      windSpeedMph: 0,
      precipitationRateMmHr: 0,
      weatherSummary: "Indoors (dome)",
      isIndoor: true,
      source: "indoor",
    };
  }

  const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const now = Date.now();
  const cached = forecastCache.get(coordKey);
  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    let forecastUrl = gridpointsUrlCache.get(coordKey);
    if (!forecastUrl) {
      const pointsUrl = `https://api.weather.gov/points/${coordKey}`;
      const ptsRes = await customFetch(pointsUrl, {
        headers: { "User-Agent": "GalaxySportsEdge/1.0 (contact@galaxysportsedge.com)" },
      });
      if (!ptsRes.ok) {
        console.warn(`[nws-weather] Points endpoint returned HTTP ${ptsRes.status} for ${coordKey}`);
        return neutralWeatherFallback();
      }
      const ptsJson = (await ptsRes.json()) as {
        properties?: {
          forecastHourly?: string;
          forecast?: string;
        };
      };
      forecastUrl = ptsJson.properties?.forecastHourly || ptsJson.properties?.forecast;
      if (forecastUrl) {
        gridpointsUrlCache.set(coordKey, forecastUrl);
      }
    }

    if (!forecastUrl) {
      return neutralWeatherFallback();
    }

    const fRes = await customFetch(forecastUrl, {
      headers: { "User-Agent": "GalaxySportsEdge/1.0 (contact@galaxysportsedge.com)" },
    });
    if (!fRes.ok) {
      console.warn(`[nws-weather] Forecast endpoint returned HTTP ${fRes.status} for ${forecastUrl}`);
      return neutralWeatherFallback();
    }

    const fJson = (await fRes.json()) as {
      properties?: {
        periods?: Array<{
          temperature?: number;
          windSpeed?: string;
          shortForecast?: string;
          detailedForecast?: string;
          probabilityOfPrecipitation?: { value?: number | null };
        }>;
      };
    };

    const period = fJson.properties?.periods?.[0];
    if (!period) {
      return neutralWeatherFallback();
    }

    const tempF = typeof period.temperature === "number" ? period.temperature : 70;
    const windMatch = (period.windSpeed || "").match(/(\d+)/);
    const windSpeedMph = windMatch ? parseInt(windMatch[1]!, 10) : 5;
    const shortDesc = period.shortForecast || "Clear";

    // Determine precipitation rate estimate
    let precipRateMmHr = 0.0;
    const descLower = shortDesc.toLowerCase();
    const precipProb = period.probabilityOfPrecipitation?.value ?? 0;
    if (descLower.includes("heavy rain") || descLower.includes("thunderstorm")) {
      precipRateMmHr = 6.0;
    } else if (descLower.includes("rain") || descLower.includes("snow") || descLower.includes("showers")) {
      precipRateMmHr = 2.5;
    } else if (precipProb != null && precipProb >= 60) {
      precipRateMmHr = 1.0;
    }

    const reading: WeatherContextReading = {
      temperatureF: tempF,
      windSpeedMph,
      precipitationRateMmHr: precipRateMmHr,
      weatherSummary: `${shortDesc}, ${tempF}°F, wind ${windSpeedMph} mph`,
      isIndoor: false,
      source: "nws",
    };

    forecastCache.set(coordKey, { data: reading, timestamp: now });
    return reading;
  } catch (err) {
    console.warn(`[nws-weather] NWS call failed for ${coordKey}: ${err instanceof Error ? err.message : String(err)}`);
    return neutralWeatherFallback();
  }
}

export function neutralWeatherFallback(): WeatherContextReading {
  return {
    temperatureF: 70,
    windSpeedMph: 5,
    precipitationRateMmHr: 0,
    weatherSummary: "Clear (neutral)",
    isIndoor: false,
    source: "neutral_fallback",
  };
}
