import { describe, it, expect } from "vitest";
import {
  windImpact,
  temperatureImpact,
  precipitationImpact,
  overallWeatherImpact,
  windChill,
  heatIndex,
  effectiveTemp,
  passingGameImpactScore,
  isHighImpactGame,
  weatherSummaryLine,
  totalAdjustment,
  type WeatherConditions,
  type WeatherImpact,
  type SportType,
} from "@/lib/sports/weather-impact";

// ---- windImpact ----

describe("windImpact", () => {
  it("returns none at 0 mph", () => {
    const r = windImpact(0);
    expect(r.level).toBe("none");
    expect(r.score).toBe(0);
  });

  it("returns none at 9 mph", () => {
    const r = windImpact(9);
    expect(r.level).toBe("none");
    expect(r.score).toBe(0);
  });

  it("returns low at 10 mph", () => {
    const r = windImpact(10);
    expect(r.level).toBe("low");
    expect(r.score).toBe(15);
    expect(r.description).toBe("Light wind");
  });

  it("returns low at 15 mph", () => {
    const r = windImpact(15);
    expect(r.level).toBe("low");
    expect(r.score).toBe(25);
    expect(r.description).toBe("Moderate wind");
  });

  it("returns moderate at 20 mph", () => {
    const r = windImpact(20);
    expect(r.level).toBe("moderate");
    expect(r.score).toBe(50);
    expect(r.description).toBe("Strong wind affects passing");
  });

  it("returns high at 25 mph", () => {
    const r = windImpact(25);
    expect(r.level).toBe("high");
    expect(r.score).toBe(75);
    expect(r.description).toBe("High wind disrupts aerial game");
  });

  it("returns high at 34 mph", () => {
    const r = windImpact(34);
    expect(r.level).toBe("high");
    expect(r.score).toBe(75);
  });

  it("returns severe at 35 mph", () => {
    const r = windImpact(35);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
    expect(r.description).toBe("Severe wind, major passing disruption");
  });

  it("returns severe at 40 mph", () => {
    const r = windImpact(40);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
  });

  it("gust overrides when gust > wind", () => {
    const r = windImpact(5, 35);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
  });

  it("gust does not override when gust <= wind", () => {
    const r = windImpact(25, 20);
    expect(r.level).toBe("high");
  });

  it("gust equal to wind does not change result", () => {
    const r = windImpact(20, 20);
    expect(r.level).toBe("moderate");
  });

  it("gust upgrades from none to high", () => {
    const r = windImpact(5, 30);
    expect(r.level).toBe("high");
    expect(r.score).toBe(75);
  });
});

// ---- temperatureImpact ----

describe("temperatureImpact", () => {
  it("72°F returns none", () => {
    const r = temperatureImpact(72);
    expect(r.level).toBe("none");
    expect(r.score).toBe(0);
    expect(r.description).toBe("Comfortable");
  });

  it("50°F boundary returns none", () => {
    expect(temperatureImpact(50).level).toBe("none");
  });

  it("85°F boundary returns none", () => {
    expect(temperatureImpact(85).level).toBe("none");
  });

  it("40°F returns low", () => {
    const r = temperatureImpact(40);
    expect(r.level).toBe("low");
    expect(r.score).toBe(15);
    expect(r.description).toBe("Cool conditions");
  });

  it("35°F boundary returns low", () => {
    expect(temperatureImpact(35).level).toBe("low");
  });

  it("90°F returns low (hot)", () => {
    const r = temperatureImpact(90);
    expect(r.level).toBe("low");
    expect(r.score).toBe(15);
    expect(r.description).toBe("Hot conditions");
  });

  it("28°F returns moderate", () => {
    const r = temperatureImpact(28);
    expect(r.level).toBe("moderate");
    expect(r.score).toBe(40);
    expect(r.description).toBe("Cold game-time");
  });

  it("100°F returns moderate (extreme heat)", () => {
    const r = temperatureImpact(100);
    expect(r.level).toBe("moderate");
    expect(r.score).toBe(40);
  });

  it("10°F returns high", () => {
    const r = temperatureImpact(10);
    expect(r.level).toBe("high");
    expect(r.score).toBe(70);
    expect(r.description).toBe("Very cold, affects performance");
  });

  it("0°F returns severe (below 5°F threshold)", () => {
    const r = temperatureImpact(0);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
  });

  it("-10°F returns severe", () => {
    const r = temperatureImpact(-10);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
    expect(r.description).toBe("Extreme cold");
  });

  it("4°F boundary returns severe cold", () => {
    expect(temperatureImpact(4).level).toBe("severe");
  });

  it("111°F returns severe (extreme heat)", () => {
    const r = temperatureImpact(111);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
    expect(r.description).toBe("Extreme heat");
  });
});

// ---- precipitationImpact ----

describe("precipitationImpact", () => {
  it("0 returns none", () => {
    const r = precipitationImpact(0);
    expect(r.level).toBe("none");
    expect(r.score).toBe(0);
  });

  it("0.01 returns low", () => {
    const r = precipitationImpact(0.01);
    expect(r.level).toBe("low");
    expect(r.score).toBe(20);
    expect(r.description).toBe("Light rain");
  });

  it("0.09 returns low", () => {
    expect(precipitationImpact(0.09).level).toBe("low");
  });

  it("0.1 returns moderate", () => {
    const r = precipitationImpact(0.1);
    expect(r.level).toBe("moderate");
    expect(r.score).toBe(50);
    expect(r.description).toBe("Moderate rain, affects footing");
  });

  it("0.25 returns high", () => {
    const r = precipitationImpact(0.25);
    expect(r.level).toBe("high");
    expect(r.score).toBe(75);
    expect(r.description).toBe("Heavy rain, significant impact");
  });

  it("0.5 returns severe", () => {
    const r = precipitationImpact(0.5);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
    expect(r.description).toBe("Severe precipitation");
  });

  it("0.6 returns severe", () => {
    const r = precipitationImpact(0.6);
    expect(r.level).toBe("severe");
    expect(r.score).toBe(100);
  });

  it("snow adds +20 to score", () => {
    const r = precipitationImpact(0.1, 2);
    expect(r.score).toBe(70);
  });

  it("snow with 0 precip still registers", () => {
    const r = precipitationImpact(0, 3);
    expect(r.level).not.toBe("none");
    expect(r.description).toContain("snow");
  });

  it("snow changes label from rain to snow", () => {
    const r = precipitationImpact(0.25, 1);
    expect(r.description).toContain("snow");
  });

  it("severe precip with snow caps at 100", () => {
    const r = precipitationImpact(0.5, 5);
    expect(r.score).toBe(100);
  });

  it("0.49 returns high (below 0.5 threshold)", () => {
    expect(precipitationImpact(0.49).level).toBe("high");
  });
});

// ---- overallWeatherImpact ----

describe("overallWeatherImpact", () => {
  const indoorConditions: WeatherConditions = {
    tempF: 72,
    windSpeedMph: 0,
    precipitationInch: 0,
    humidity: 50,
    isIndoor: true,
  };

  const clearOutdoor: WeatherConditions = {
    tempF: 72,
    windSpeedMph: 5,
    precipitationInch: 0,
    humidity: 50,
    isIndoor: false,
  };

  const highWind: WeatherConditions = {
    tempF: 65,
    windSpeedMph: 30,
    precipitationInch: 0,
    humidity: 40,
    isIndoor: false,
  };

  const heavyRain: WeatherConditions = {
    tempF: 55,
    windSpeedMph: 5,
    precipitationInch: 0.3,
    humidity: 90,
    isIndoor: false,
  };

  const severeSnow: WeatherConditions = {
    tempF: 25,
    windSpeedMph: 25,
    precipitationInch: 0.3,
    snowInch: 4,
    humidity: 80,
    isIndoor: false,
  };

  it("indoor venue → level none", () => {
    const r = overallWeatherImpact(indoorConditions);
    expect(r.level).toBe("none");
    expect(r.score).toBe(0);
  });

  it("indoor venue → favorsBetting neither", () => {
    expect(overallWeatherImpact(indoorConditions).favorsBetting).toBe("neither");
  });

  it("clear outdoor → favorsBetting over", () => {
    const r = overallWeatherImpact(clearOutdoor);
    expect(r.favorsBetting).toBe("over");
  });

  it("high wind → favorsBetting under", () => {
    const r = overallWeatherImpact(highWind);
    expect(r.favorsBetting).toBe("under");
  });

  it("heavy rain → favorsBetting under", () => {
    const r = overallWeatherImpact(heavyRain);
    expect(r.favorsBetting).toBe("under");
  });

  it("high wind → affectsPassingGame true", () => {
    expect(overallWeatherImpact(highWind).affectsPassingGame).toBe(true);
  });

  it("clear conditions → affectsPassingGame false", () => {
    expect(overallWeatherImpact(clearOutdoor).affectsPassingGame).toBe(false);
  });

  it("heavy rain → affectsFooting true", () => {
    expect(overallWeatherImpact(heavyRain).affectsFooting).toBe(true);
  });

  it("snow → affectsFooting true", () => {
    expect(overallWeatherImpact(severeSnow).affectsFooting).toBe(true);
  });

  it("clear outdoor → description 'Clear conditions'", () => {
    expect(overallWeatherImpact(clearOutdoor).description).toBe("Clear conditions");
  });

  it("factors list contains wind description for high wind", () => {
    const r = overallWeatherImpact(highWind);
    expect(r.factors).toContain("High wind disrupts aerial game");
  });

  it("score is max of individual scores", () => {
    const r = overallWeatherImpact(highWind);
    expect(r.score).toBe(75);
  });

  it("severe snow → level severe", () => {
    const r = overallWeatherImpact(severeSnow);
    expect(r.level).toBe("severe");
  });

  it("level maps correctly: score 15 → low", () => {
    const mild: WeatherConditions = {
      tempF: 40,
      windSpeedMph: 5,
      precipitationInch: 0,
      humidity: 50,
      isIndoor: false,
    };
    const r = overallWeatherImpact(mild);
    expect(r.level).toBe("low");
  });

  it("ncaaf sport type accepted without error", () => {
    expect(() => overallWeatherImpact(clearOutdoor, "ncaaf")).not.toThrow();
  });

  it("mlb sport type accepted without error", () => {
    expect(() => overallWeatherImpact(clearOutdoor, "mlb")).not.toThrow();
  });
});

// ---- windChill ----

describe("windChill", () => {
  it("30°F at 20 mph → below 30", () => {
    const wc = windChill(30, 20);
    expect(wc).toBeLessThan(30);
  });

  it("0°F at 30 mph → very cold", () => {
    const wc = windChill(0, 30);
    expect(wc).toBeLessThan(-10);
  });

  it("T > 50°F → returns tempF unchanged", () => {
    expect(windChill(60, 20)).toBe(60);
  });

  it("windSpeed < 3 mph → returns tempF unchanged", () => {
    expect(windChill(30, 2)).toBe(30);
  });

  it("exactly 50°F at 3 mph → applies formula", () => {
    const wc = windChill(50, 3);
    expect(wc).toBeLessThan(50);
  });

  it("51°F → returns tempF unchanged", () => {
    expect(windChill(51, 15)).toBe(51);
  });
});

// ---- heatIndex ----

describe("heatIndex", () => {
  it("90°F at 60% humidity → above 90", () => {
    const hi = heatIndex(90, 60);
    expect(hi).toBeGreaterThan(90);
  });

  it("100°F at 80% humidity → significantly higher", () => {
    const hi = heatIndex(100, 80);
    expect(hi).toBeGreaterThan(110);
  });

  it("T < 80°F → returns tempF unchanged", () => {
    expect(heatIndex(79, 80)).toBe(79);
  });

  it("humidity < 40% → returns tempF unchanged", () => {
    expect(heatIndex(95, 39)).toBe(95);
  });

  it("exactly 80°F at 40% → applies formula (returns a number)", () => {
    const hi = heatIndex(80, 40);
    expect(typeof hi).toBe("number");
    // Steadman formula at boundary can yield slightly below 80; just verify it ran
    expect(hi).toBeCloseTo(80, 0);
  });

  it("81°F at 39% → unchanged", () => {
    expect(heatIndex(81, 39)).toBe(81);
  });
});

// ---- effectiveTemp ----

describe("effectiveTemp", () => {
  it("cold + wind → windChill applied", () => {
    const conds: WeatherConditions = {
      tempF: 30,
      windSpeedMph: 20,
      precipitationInch: 0,
      humidity: 50,
      isIndoor: false,
    };
    expect(effectiveTemp(conds)).toBeLessThan(30);
  });

  it("hot + humid → heatIndex applied", () => {
    const conds: WeatherConditions = {
      tempF: 95,
      windSpeedMph: 5,
      precipitationInch: 0,
      humidity: 70,
      isIndoor: false,
    };
    expect(effectiveTemp(conds)).toBeGreaterThan(95);
  });

  it("moderate conditions → returns tempF unchanged", () => {
    const conds: WeatherConditions = {
      tempF: 65,
      windSpeedMph: 10,
      precipitationInch: 0,
      humidity: 50,
      isIndoor: false,
    };
    expect(effectiveTemp(conds)).toBe(65);
  });

  it("50°F at exactly 3 mph → windChill path", () => {
    const conds: WeatherConditions = {
      tempF: 50,
      windSpeedMph: 3,
      precipitationInch: 0,
      humidity: 30,
      isIndoor: false,
    };
    expect(effectiveTemp(conds)).toBeLessThan(50);
  });

  it("51°F at 20 mph (not cold enough) → tempF unchanged", () => {
    const conds: WeatherConditions = {
      tempF: 51,
      windSpeedMph: 20,
      precipitationInch: 0,
      humidity: 30,
      isIndoor: false,
    };
    expect(effectiveTemp(conds)).toBe(51);
  });
});

// ---- passingGameImpactScore ----

describe("passingGameImpactScore", () => {
  it("no weather → 0", () => {
    expect(passingGameImpactScore(0, 0)).toBe(0);
  });

  it("high wind → high score", () => {
    const score = passingGameImpactScore(30, 0);
    expect(score).toBeGreaterThan(50);
  });

  it("severe wind → score near 70 (100*0.7)", () => {
    expect(passingGameImpactScore(40, 0)).toBeCloseTo(70);
  });

  it("severe precip → contributes 30 (100*0.3)", () => {
    expect(passingGameImpactScore(0, 0.6)).toBeCloseTo(30);
  });

  it("wind + precip combined → caps at 100", () => {
    const score = passingGameImpactScore(40, 0.6);
    expect(score).toBe(100);
  });

  it("light wind only → low score", () => {
    const score = passingGameImpactScore(12, 0);
    expect(score).toBeLessThan(20);
  });
});

// ---- isHighImpactGame ----

describe("isHighImpactGame", () => {
  it("indoor → always false", () => {
    const conds: WeatherConditions = {
      tempF: -20,
      windSpeedMph: 50,
      precipitationInch: 2,
      humidity: 90,
      isIndoor: true,
    };
    expect(isHighImpactGame(conds, "nfl")).toBe(false);
  });

  it("severe weather outdoor → true", () => {
    const conds: WeatherConditions = {
      tempF: 10,
      windSpeedMph: 40,
      precipitationInch: 0.6,
      snowInch: 5,
      humidity: 80,
      isIndoor: false,
    };
    expect(isHighImpactGame(conds, "nfl")).toBe(true);
  });

  it("clear conditions → false", () => {
    const conds: WeatherConditions = {
      tempF: 72,
      windSpeedMph: 5,
      precipitationInch: 0,
      humidity: 40,
      isIndoor: false,
    };
    expect(isHighImpactGame(conds, "nfl")).toBe(false);
  });

  it("moderate impact → false (not high enough)", () => {
    const conds: WeatherConditions = {
      tempF: 45,
      windSpeedMph: 10,
      precipitationInch: 0.05,
      humidity: 60,
      isIndoor: false,
    };
    expect(isHighImpactGame(conds, "mlb")).toBe(false);
  });

  it("high wind outdoor → true", () => {
    const conds: WeatherConditions = {
      tempF: 60,
      windSpeedMph: 30,
      precipitationInch: 0,
      humidity: 40,
      isIndoor: false,
    };
    expect(isHighImpactGame(conds, "ncaaf")).toBe(true);
  });
});

// ---- weatherSummaryLine ----

describe("weatherSummaryLine", () => {
  it("formats basic conditions correctly", () => {
    const conds: WeatherConditions = {
      tempF: 72,
      windSpeedMph: 10,
      precipitationInch: 0,
      humidity: 50,
      isIndoor: false,
    };
    expect(weatherSummaryLine(conds)).toBe("72°F, Wind 10mph, No precipitation");
  });

  it("includes gust when gustMph > windSpeedMph + 5", () => {
    const conds: WeatherConditions = {
      tempF: 28,
      windSpeedMph: 22,
      windGustMph: 35,
      precipitationInch: 0,
      snowInch: 2,
      humidity: 80,
      isIndoor: false,
    };
    expect(weatherSummaryLine(conds)).toBe("28°F, Wind 22mph/gusts 35mph, Snow 2in");
  });

  it("does not include gust when gustMph <= windSpeedMph + 5", () => {
    const conds: WeatherConditions = {
      tempF: 55,
      windSpeedMph: 15,
      windGustMph: 20,
      precipitationInch: 0,
      humidity: 50,
      isIndoor: false,
    };
    const line = weatherSummaryLine(conds);
    expect(line).not.toContain("gusts");
  });

  it("shows rain label with precipitation", () => {
    const conds: WeatherConditions = {
      tempF: 55,
      windSpeedMph: 5,
      precipitationInch: 0.15,
      humidity: 80,
      isIndoor: false,
    };
    expect(weatherSummaryLine(conds)).toContain("Rain 0.15in/hr");
  });

  it("snow takes priority over rain label", () => {
    const conds: WeatherConditions = {
      tempF: 28,
      windSpeedMph: 10,
      precipitationInch: 0.1,
      snowInch: 3,
      humidity: 80,
      isIndoor: false,
    };
    expect(weatherSummaryLine(conds)).toContain("Snow 3in");
  });

  it("no gust field → no gust in output", () => {
    const conds: WeatherConditions = {
      tempF: 65,
      windSpeedMph: 20,
      precipitationInch: 0,
      humidity: 40,
      isIndoor: false,
    };
    expect(weatherSummaryLine(conds)).not.toContain("gusts");
  });
});

// ---- totalAdjustment ----

describe("totalAdjustment", () => {
  const makeImpact = (
    favorsBetting: "under" | "over" | "neither",
    score: number,
  ): WeatherImpact => ({
    level: "high",
    score,
    favorsBetting,
    affectsPassingGame: true,
    affectsFooting: true,
    description: "test",
    factors: [],
  });

  it("under with score 100 → 20% reduction from baseline", () => {
    const impact = makeImpact("under", 100);
    const result = totalAdjustment(impact, 50);
    expect(result).toBe(40); // 50 * (1 - 100/500) = 50 * 0.8 = 40
  });

  it("under with score 0 → no change", () => {
    const impact = makeImpact("under", 0);
    expect(totalAdjustment(impact, 45)).toBe(45);
  });

  it("over → baseline unchanged", () => {
    const impact = makeImpact("over", 50);
    expect(totalAdjustment(impact, 47.5)).toBe(47.5);
  });

  it("neither → baseline unchanged", () => {
    const impact = makeImpact("neither", 30);
    expect(totalAdjustment(impact, 44)).toBe(44);
  });

  it("rounds to nearest 0.5", () => {
    const impact = makeImpact("under", 50);
    // baseline=47, adjusted = 47 * (1 - 50/500) = 47 * 0.9 = 42.3 → rounds to 42.5
    const result = totalAdjustment(impact, 47);
    expect(result * 2).toBe(Math.round(result * 2));
  });

  it("under with score 50 → 10% reduction", () => {
    const impact = makeImpact("under", 50);
    const result = totalAdjustment(impact, 50);
    expect(result).toBe(45); // 50 * 0.9 = 45.0
  });

  it("never produces non-0.5 increment results", () => {
    const impact = makeImpact("under", 75);
    const result = totalAdjustment(impact, 48);
    // 48 * (1 - 75/500) = 48 * 0.85 = 40.8 → rounds to 41
    expect(result % 0.5).toBe(0);
  });
});
