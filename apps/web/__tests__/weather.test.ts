/**
 * Weather feature tests.
 *
 * Tests cover:
 *  1. buildOpenMeteoUrl — correct URL parameters
 *  2. parseOpenMeteoResponse — valid response → GameWeather; malformed → null
 *  3. loadGameWeather — clearance-blocked → null; fetch throw → null
 *
 * No live network calls — fetch is mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildOpenMeteoUrl, parseOpenMeteoResponse, wmoDescription } from "@/lib/weather/open-meteo";

// Mock the clearance engine at module level so hoisting works correctly.
vi.mock("@/lib/scraping/clearance-engine", () => ({
  checkClearance: vi.fn(),
}));

// ─── URL builder tests ────────────────────────────────────────────────────────

describe("buildOpenMeteoUrl", () => {
  it("includes latitude and longitude", () => {
    const url = buildOpenMeteoUrl({ latitude: 44.5013, longitude: -88.0622, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toContain("latitude=44.5013");
    expect(url).toContain("longitude=-88.0622");
  });

  it("requests the expected hourly variables", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toContain("temperature_2m");
    expect(url).toContain("precipitation_probability");
    expect(url).toContain("wind_speed_10m");
    expect(url).toContain("weather_code");
  });

  it("uses fahrenheit temperature unit", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toContain("temperature_unit=fahrenheit");
  });

  it("uses mph wind speed unit", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toContain("wind_speed_unit=mph");
  });

  it("uses the correct base URL", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast/);
  });

  it("uses default forecastDays of 3 when not provided", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z" });
    expect(url).toContain("forecast_days=3");
  });

  it("uses custom forecastDays when provided", () => {
    const url = buildOpenMeteoUrl({ latitude: 40.0, longitude: -74.0, kickoffISO: "2026-11-15T18:00:00Z", forecastDays: 7 });
    expect(url).toContain("forecast_days=7");
  });
});

// ─── Parser tests ─────────────────────────────────────────────────────────────

describe("parseOpenMeteoResponse", () => {
  const kickoffISO = "2026-11-15T18:00:00Z";

  /** Build a valid Open-Meteo-shaped response covering the kickoff hour. */
  function makeValidResponse() {
    return {
      hourly: {
        time: [
          "2026-11-15T17:00",
          "2026-11-15T18:00",   // ← nearest to kickoff
          "2026-11-15T19:00",
        ],
        temperature_2m:           [38.0,  41.0, 43.0],
        precipitation_probability: [10,    20,   30],
        wind_speed_10m:           [8.0,   12.0, 14.0],
        weather_code:             [2,     2,    3],
      },
    };
  }

  it("returns a GameWeather when the response is valid", () => {
    const result = parseOpenMeteoResponse(makeValidResponse(), kickoffISO);
    expect(result).not.toBeNull();
    expect(result?.tempF).toBe(41);
    expect(result?.windMph).toBe(12);
    expect(result?.precipProbPct).toBe(20);
    expect(result?.code).toBe(2);
    expect(result?.summary).toBe("Partly cloudy");
  });

  it("includes the required CC-BY-4.0 attribution string", () => {
    const result = parseOpenMeteoResponse(makeValidResponse(), kickoffISO);
    expect(result?.attribution).toContain("Open-Meteo");
    expect(result?.attribution).toContain("CC-BY-4.0");
  });

  it("picks the hour nearest kickoff, not necessarily the first", () => {
    // Kickoff at 18:00; array has 17:00, 18:00, 19:00
    const result = parseOpenMeteoResponse(makeValidResponse(), kickoffISO);
    // temp at 18:00 slot is 41
    expect(result?.tempF).toBe(41);
  });

  it("returns null when hourly is missing", () => {
    const result = parseOpenMeteoResponse({}, kickoffISO);
    expect(result).toBeNull();
  });

  it("returns null when time array is empty", () => {
    const result = parseOpenMeteoResponse(
      { hourly: { time: [], temperature_2m: [], precipitation_probability: [], wind_speed_10m: [], weather_code: [] } },
      kickoffISO,
    );
    expect(result).toBeNull();
  });

  it("returns null when raw is null", () => {
    expect(parseOpenMeteoResponse(null, kickoffISO)).toBeNull();
  });

  it("returns null when raw is a string (not an object)", () => {
    expect(parseOpenMeteoResponse("unexpected", kickoffISO)).toBeNull();
  });

  it("returns null when kickoff is far outside the forecast window", () => {
    // Kickoff 30 days in the future, only 3 hours of data available
    const farFuture = "2030-01-01T18:00:00Z";
    const result = parseOpenMeteoResponse(makeValidResponse(), farFuture);
    expect(result).toBeNull();
  });

  it("returns null when temperature has null at the target slot", () => {
    const response = makeValidResponse();
    // Replace the temperature at the kickoff slot with null
    const patched = {
      ...response,
      hourly: {
        ...response.hourly,
        temperature_2m: [38.0, null, 43.0],
      },
    };
    expect(parseOpenMeteoResponse(patched, kickoffISO)).toBeNull();
  });

  it("rounds temperature, wind, and precip to integers", () => {
    const response = {
      hourly: {
        time: ["2026-11-15T18:00"],
        temperature_2m:           [41.7],
        precipitation_probability: [19.9],
        wind_speed_10m:           [12.4],
        weather_code:             [0],
      },
    };
    const result = parseOpenMeteoResponse(response, kickoffISO);
    expect(result?.tempF).toBe(42);
    expect(result?.precipProbPct).toBe(20);
    expect(result?.windMph).toBe(12);
  });
});

// ─── WMO description tests ────────────────────────────────────────────────────

describe("wmoDescription", () => {
  it("returns a human-readable string for known codes", () => {
    expect(wmoDescription(0)).toBe("Clear sky");
    expect(wmoDescription(95)).toBe("Thunderstorm");
    expect(wmoDescription(3)).toBe("Overcast");
  });

  it("returns a fallback string for unknown codes", () => {
    const result = wmoDescription(999);
    expect(result).toContain("999");
  });
});

// ─── Loader tests ─────────────────────────────────────────────────────────────

// Import after mock declaration so the mock is active.
import { loadGameWeather } from "@/lib/weather/load-game-weather";
import { checkClearance } from "@/lib/scraping/clearance-engine";

/** A clearance result that allows the request to proceed. */
const ALLOWED_CLEARANCE = {
  allowed: true,
  blocks: [],
  requiresReview: false,
  source_id: "open-meteo",
  mode: "open_dataset_ingest" as const,
  tool_id: "fetch-native" as const,
  intents: ["commercial_display"] as const,
  warnings: [],
  rightsSnapshot: null,
  checkedAt: new Date().toISOString(),
};

/** A clearance result that blocks the request. */
const DENIED_CLEARANCE = {
  ...ALLOWED_CLEARANCE,
  allowed: true, // will be overridden per test
  blocks: [{ code: "TEST_BLOCK", message: "blocked in test" }],
  allowed_final: false,
};

describe("loadGameWeather", () => {
  const params = { lat: 44.5013, lon: -88.0622, kickoffISO: "2026-11-15T18:00:00Z" };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns null when clearance is denied", async () => {
    vi.mocked(checkClearance).mockReturnValue({
      ...ALLOWED_CLEARANCE,
      allowed: false,
      blocks: [{ code: "TEST", message: "blocked" }],
    });

    const result = await loadGameWeather(params);
    expect(result).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    vi.mocked(checkClearance).mockReturnValue(ALLOWED_CLEARANCE);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const result = await loadGameWeather(params);
    expect(result).toBeNull();
  });

  it("returns null when fetch returns a non-ok status", async () => {
    vi.mocked(checkClearance).mockReturnValue(ALLOWED_CLEARANCE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: vi.fn() }));

    const result = await loadGameWeather(params);
    expect(result).toBeNull();
  });

  it("returns null when response JSON is malformed", async () => {
    vi.mocked(checkClearance).mockReturnValue(ALLOWED_CLEARANCE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ unexpected: "shape" }),
    }));

    const result = await loadGameWeather(params);
    expect(result).toBeNull();
  });

  it("returns null when fetch response.json() throws", async () => {
    vi.mocked(checkClearance).mockReturnValue(ALLOWED_CLEARANCE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    }));

    const result = await loadGameWeather(params);
    expect(result).toBeNull();
  });

  it("returns GameWeather when clearance is granted and fetch succeeds", async () => {
    const kickoffISO = "2026-11-15T18:00:00Z";
    const mockResponse = {
      hourly: {
        time: ["2026-11-15T17:00", "2026-11-15T18:00", "2026-11-15T19:00"],
        temperature_2m:            [38.0,  41.0, 43.0],
        precipitation_probability: [10,    20,   30],
        wind_speed_10m:            [8.0,   12.0, 14.0],
        weather_code:              [1,     2,    3],
      },
    };

    vi.mocked(checkClearance).mockReturnValue(ALLOWED_CLEARANCE);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponse),
    }));

    const result = await loadGameWeather({ ...params, kickoffISO });
    expect(result).not.toBeNull();
    expect(result?.tempF).toBe(41);
    expect(result?.windMph).toBe(12);
    expect(result?.precipProbPct).toBe(20);
    expect(result?.attribution).toContain("Open-Meteo");
  });
});
