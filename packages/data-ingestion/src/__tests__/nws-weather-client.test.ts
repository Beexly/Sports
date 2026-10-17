import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resolveVenueCoordinates,
  fetchNwsWeather,
  neutralWeatherFallback,
  clearWeatherCacheForTests,
  type WeatherContextReading,
} from "../nws-weather-client.js";

describe("NWS Weather Client", () => {
  beforeEach(() => {
    clearWeatherCacheForTests();
  });

  describe("resolveVenueCoordinates", () => {
    it("resolves outdoor NFL stadium by exact and partial name", () => {
      const denver = resolveVenueCoordinates("Empower Field at Mile High");
      expect(denver).not.toBeNull();
      expect(denver!.lat).toBeCloseTo(39.7439, 3);
      expect(denver!.lon).toBeCloseTo(-105.0201, 3);
      expect(denver!.indoor).toBeUndefined();

      const lambeau = resolveVenueCoordinates("Lambeau Field");
      expect(lambeau).not.toBeNull();
      expect(lambeau!.lat).toBeCloseTo(44.5013, 3);
    });

    it("resolves indoor / dome NFL stadium with indoor: true flag", () => {
      const lucasOil = resolveVenueCoordinates("Lucas Oil Stadium");
      expect(lucasOil).not.toBeNull();
      expect(lucasOil!.indoor).toBe(true);

      const mercedes = resolveVenueCoordinates("Mercedes-Benz Stadium");
      expect(mercedes).not.toBeNull();
      expect(mercedes!.indoor).toBe(true);

      const superdome = resolveVenueCoordinates("Caesars Superdome");
      expect(superdome).not.toBeNull();
      expect(superdome!.indoor).toBe(true);
    });

    it("resolves NCAA stadiums (e.g., Indiana Memorial Stadium)", () => {
      const memorial = resolveVenueCoordinates("Memorial Stadium (Bloomington, IN)");
      expect(memorial).not.toBeNull();
      expect(memorial!.lat).toBeCloseTo(39.1809, 3);
      expect(memorial!.lon).toBeCloseTo(-86.5256, 3);

      const ohio = resolveVenueCoordinates("Ohio Stadium");
      expect(ohio).not.toBeNull();
      expect(ohio!.lat).toBeCloseTo(40.0016, 3);
    });

    it("falls back to city, state coordinates when venue is unknown", () => {
      const coords = resolveVenueCoordinates("Unknown Stadium", "Denver", "CO");
      expect(coords).not.toBeNull();
      expect(coords!.lat).toBeCloseTo(39.7392, 3);
      expect(coords!.lon).toBeCloseTo(-104.9903, 3);
    });

    it("returns null for completely unrecognized locations", () => {
      const coords = resolveVenueCoordinates("Imaginary Field", "Atlantis", "Ocean");
      expect(coords).toBeNull();
    });
  });

  describe("fetchNwsWeather", () => {
    it("returns controlled indoor baseline for dome venues without network calls", async () => {
      const mockFetch = vi.fn();
      const weather = await fetchNwsWeather(39.7601, -86.1639, true, mockFetch as unknown as typeof fetch);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(weather.isIndoor).toBe(true);
      expect(weather.temperatureF).toBe(72);
      expect(weather.windSpeedMph).toBe(0);
      expect(weather.precipitationRateMmHr).toBe(0);
      expect(weather.source).toBe("indoor");
    });

    it("fetches two-step NWS API successfully and parses temperature and wind", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/points/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              properties: {
                forecastHourly: "https://api.weather.gov/gridpoints/IND/47,41/forecast/hourly",
              },
            }),
          };
        }
        if (url.includes("/gridpoints/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              properties: {
                periods: [
                  {
                    temperature: 58,
                    windSpeed: "14 mph",
                    shortForecast: "Partly Cloudy",
                    probabilityOfPrecipitation: { value: 15 },
                  },
                ],
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const weather = await fetchNwsWeather(39.1809, -86.5256, false, mockFetch as unknown as typeof fetch);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(weather.temperatureF).toBe(58);
      expect(weather.windSpeedMph).toBe(14);
      expect(weather.precipitationRateMmHr).toBe(0);
      expect(weather.weatherSummary).toContain("Partly Cloudy, 58°F, wind 14 mph");
      expect(weather.isIndoor).toBe(false);
      expect(weather.source).toBe("nws");
    });

    it("calculates precipitation rate correctly for heavy rain", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/points/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              properties: { forecastHourly: "https://api.weather.gov/gridpoints/MIA/10,10/forecast/hourly" },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            properties: {
              periods: [
                {
                  temperature: 78,
                  windSpeed: "20 mph",
                  shortForecast: "Heavy Rain and Thunderstorms",
                  probabilityOfPrecipitation: { value: 90 },
                },
              ],
            },
          }),
        };
      });

      const weather = await fetchNwsWeather(25.9580, -80.2389, false, mockFetch as unknown as typeof fetch);
      expect(weather.precipitationRateMmHr).toBe(6.0);
      expect(weather.temperatureF).toBe(78);
      expect(weather.windSpeedMph).toBe(20);
    });

    it("fails soft to neutral fallback on points endpoint 500 error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const weather = await fetchNwsWeather(40.0, -80.0, false, mockFetch as unknown as typeof fetch);
      expect(weather.source).toBe("neutral_fallback");
      expect(weather.temperatureF).toBe(70);
      expect(weather.windSpeedMph).toBe(5);
      expect(weather.precipitationRateMmHr).toBe(0);
    });

    it("fails soft to neutral fallback on network exception", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      const weather = await fetchNwsWeather(40.0, -80.0, false, mockFetch as unknown as typeof fetch);
      expect(weather.source).toBe("neutral_fallback");
      expect(weather.temperatureF).toBe(70);
    });

    it("serves subsequent requests from cache without calling network", async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/points/")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              properties: { forecastHourly: "https://api.weather.gov/gridpoints/BUF/1,1/forecast/hourly" },
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            properties: {
              periods: [{ temperature: 42, windSpeed: "18 mph", shortForecast: "Windy" }],
            },
          }),
        };
      });

      const first = await fetchNwsWeather(42.7738, -78.7870, false, mockFetch as unknown as typeof fetch);
      expect(first.temperatureF).toBe(42);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call to same coords
      const second = await fetchNwsWeather(42.7738, -78.7870, false, mockFetch as unknown as typeof fetch);
      expect(second.temperatureF).toBe(42);
      expect(mockFetch).toHaveBeenCalledTimes(2); // no additional calls
    });
  });

  describe("neutralWeatherFallback", () => {
    it("returns empirical neutral football weather", () => {
      const fallback = neutralWeatherFallback();
      expect(fallback.temperatureF).toBe(70);
      expect(fallback.windSpeedMph).toBe(5);
      expect(fallback.precipitationRateMmHr).toBe(0);
      expect(fallback.isIndoor).toBe(false);
      expect(fallback.source).toBe("neutral_fallback");
    });
  });
});
