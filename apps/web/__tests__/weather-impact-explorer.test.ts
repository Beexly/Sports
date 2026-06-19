import { describe, it, expect } from "vitest";

import {
  validateWeatherImpactInput,
  runWeatherImpactExplorer,
  WEATHER_IMPACT_DISCLAIMER,
  type WeatherImpactInput,
} from "@/lib/lab/weather-impact-explorer";

// ── Validation ────────────────────────────────────────────────────────────────

describe("validateWeatherImpactInput", () => {
  it("rejects non-objects", () => {
    expect(validateWeatherImpactInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validateWeatherImpactInput("nope")).toHaveProperty("error");
    expect(validateWeatherImpactInput(42)).toHaveProperty("error");
  });

  it("requires a supported sport", () => {
    expect(validateWeatherImpactInput({ tempF: 50 })).toHaveProperty("error");
    // Indoor sports the libs do not weather-model are rejected.
    expect(
      validateWeatherImpactInput({ sport: "nba", tempF: 50 }),
    ).toHaveProperty("error");
    expect(
      validateWeatherImpactInput({ sport: "soccer", tempF: 50 }),
    ).toHaveProperty("error");
  });

  it("requires a numeric tempF", () => {
    expect(validateWeatherImpactInput({ sport: "nfl" })).toHaveProperty("error");
    expect(
      validateWeatherImpactInput({ sport: "nfl", tempF: "warm" }),
    ).toHaveProperty("error");
  });

  it("accepts the three supported sports (case-insensitive) and numeric strings", () => {
    for (const sport of ["NFL", "ncaaf", "Mlb"]) {
      const res = validateWeatherImpactInput({ sport, tempF: "70" });
      expect(res).not.toHaveProperty("error");
    }
  });

  it("defaults optional fields and clamps/wraps out-of-range values", () => {
    const v = validateWeatherImpactInput({
      sport: "nfl",
      tempF: 70,
    }) as WeatherImpactInput;
    expect(v.windSpeedMph).toBe(0);
    expect(v.precipitationInch).toBe(0);
    expect(v.snowInch).toBe(0);
    expect(v.humidity).toBe(50);
    expect(v.stadiumType).toBe("outdoor");

    const wrapped = validateWeatherImpactInput({
      sport: "mlb",
      tempF: 200, // clamped down
      windDirectionDeg: 450, // wraps to 90
      humidity: 999, // clamped to 100
    }) as WeatherImpactInput;
    expect(wrapped.tempF).toBeLessThanOrEqual(140);
    expect(wrapped.windDirectionDeg).toBe(90);
    expect(wrapped.humidity).toBe(100);
  });

  it("defaults an unknown stadium type to outdoor", () => {
    const v = validateWeatherImpactInput({
      sport: "nfl",
      tempF: 50,
      stadiumType: "bouncy castle",
    }) as WeatherImpactInput;
    expect(v.stadiumType).toBe("outdoor");
  });
});

// ── High-wind, cold NFL game ──────────────────────────────────────────────────

describe("runWeatherImpactExplorer — high-wind cold NFL game", () => {
  const input = validateWeatherImpactInput({
    sport: "nfl",
    tempF: 18,
    windSpeedMph: 36, // severe per windImpact (>= 35)
    windDirectionDeg: 270,
    precipitationInch: 0,
    snowInch: 0,
    humidity: 60,
    stadiumType: "outdoor",
  }) as WeatherImpactInput;
  const out = runWeatherImpactExplorer(input);

  it("reports a high/severe overall impact", () => {
    expect(["high", "severe"]).toContain(out.level);
    expect(out.score).toBeGreaterThanOrEqual(75);
    expect(out.highImpact).toBe(true);
  });

  it("leans the total under with a downward total adjustment", () => {
    expect(out.favorsBetting).toBe("under");
    expect(out.total.delta).toBeLessThan(0);
    expect(out.total.adjusted).toBeLessThan(out.total.baseline);
  });

  it("includes the football model with a strong passing-game impact", () => {
    expect(out.football).not.toBeNull();
    expect(out.baseball).toBeNull();
    expect(out.football!.passingImpactScore).toBeGreaterThanOrEqual(50);
    expect(out.football!.passingImpact).toBeLessThan(0);
    // High winds register on the Beaufort scale (36 mph → near gale, force 7).
    expect(out.football!.beaufort.force).toBeGreaterThanOrEqual(7);
  });

  it("perceived temperature drops below the air temperature (wind chill)", () => {
    expect(out.effectiveTempF).toBeLessThan(input.tempF);
  });
});

// ── Dome game shows ~no impact ────────────────────────────────────────────────

describe("runWeatherImpactExplorer — dome game", () => {
  const input = validateWeatherImpactInput({
    sport: "nfl",
    tempF: 12,
    windSpeedMph: 40,
    precipitationInch: 0.4,
    snowInch: 3,
    humidity: 80,
    stadiumType: "dome",
  }) as WeatherImpactInput;
  const out = runWeatherImpactExplorer(input);

  it("neutralizes all weather impact indoors", () => {
    expect(out.indoor).toBe(true);
    expect(out.level).toBe("none");
    expect(out.score).toBe(0);
    expect(out.favorsBetting).toBe("neither");
    expect(out.highImpact).toBe(false);
  });

  it("leaves the reference total unchanged", () => {
    expect(out.total.adjusted).toBe(out.total.baseline);
    expect(out.total.delta).toBe(0);
  });

  it("reports a 'none' football severity for the closed venue", () => {
    expect(out.football).not.toBeNull();
    expect(out.football!.severity).toBe("none");
    expect(out.football!.scoringImpactPct).toBe(0);
  });

  it("notes that the closed venue neutralizes weather", () => {
    expect(
      out.factorNotes.some((n) => n.toLowerCase().includes("closed venue")),
    ).toBe(true);
  });
});

// ── MLB wind blowing out boosts offense ───────────────────────────────────────

describe("runWeatherImpactExplorer — MLB wind blowing out", () => {
  // Wind from 180° (south) at a ballpark oriented to 0° → tailwind blowing out.
  const out = runWeatherImpactExplorer(
    validateWeatherImpactInput({
      sport: "mlb",
      tempF: 82,
      windSpeedMph: 20,
      windDirectionDeg: 180,
      ballparkOrientationDeg: 0,
      precipitationInch: 0,
      snowInch: 0,
      humidity: 50,
      stadiumType: "outdoor",
    }) as WeatherImpactInput,
  );

  it("classifies the wind as blowing out and leans the total over", () => {
    expect(out.baseball).not.toBeNull();
    expect(out.football).toBeNull();
    expect(out.baseball!.windDirection).toBe("out");
    expect(out.baseball!.windEdge).toBe("over");
    expect(out.baseball!.hrBoostPct).toBeGreaterThan(0);
    expect(out.baseball!.runBoostPct).toBeGreaterThan(0);
  });

  it("notes the over lean and home-run boost", () => {
    expect(
      out.factorNotes.some((n) => n.toLowerCase().includes("blowing out")),
    ).toBe(true);
  });
});

describe("runWeatherImpactExplorer — MLB wind blowing in", () => {
  // Wind from 0° (north) at a ballpark oriented to 0° → headwind blowing in.
  const out = runWeatherImpactExplorer(
    validateWeatherImpactInput({
      sport: "mlb",
      tempF: 75,
      windSpeedMph: 20,
      windDirectionDeg: 0,
      ballparkOrientationDeg: 0,
      stadiumType: "outdoor",
    }) as WeatherImpactInput,
  );

  it("classifies the wind as blowing in and leans the total under", () => {
    expect(out.baseball!.windDirection).toBe("in");
    expect(out.baseball!.windEdge).toBe("under");
    expect(out.baseball!.hrBoostPct).toBeLessThan(0);
  });
});

// ── Determinism & honesty ─────────────────────────────────────────────────────

describe("runWeatherImpactExplorer — determinism & honesty", () => {
  const input = validateWeatherImpactInput({
    sport: "ncaaf",
    tempF: 40,
    windSpeedMph: 18,
    windDirectionDeg: 90,
    precipitationInch: 0.2,
    snowInch: 0,
    humidity: 70,
    stadiumType: "outdoor",
  }) as WeatherImpactInput;

  it("is deterministic — same input yields identical output", () => {
    const a = runWeatherImpactExplorer(input);
    const b = runWeatherImpactExplorer(input);
    expect(a).toEqual(b);
  });

  it("routes NCAAF through the football model", () => {
    const out = runWeatherImpactExplorer(input);
    expect(out.sport).toBe("ncaaf");
    expect(out.football).not.toBeNull();
    expect(out.baseball).toBeNull();
  });

  it("always carries the honesty disclaimer", () => {
    const out = runWeatherImpactExplorer(input);
    expect(out.disclaimer).toBe(WEATHER_IMPACT_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
    expect(out.disclaimer.toLowerCase()).toContain("models weather only");
    expect(out.disclaimer).toContain("1-800-GAMBLER");
  });

  it("produces a summary line reflecting the entered conditions", () => {
    const out = runWeatherImpactExplorer(input);
    expect(out.summaryLine).toContain("40°F");
    expect(out.summaryLine.toLowerCase()).toContain("wind");
  });
});
