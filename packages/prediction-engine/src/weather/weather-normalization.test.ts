import { describe, expect, it } from "vitest";
import {
  coldDegreeDays,
  normalizeByWeather,
  precipSeverity,
  rankingMoveFraction,
  weatherNormalizedMedianCI,
  weatherSeverityIndex,
  windExposure,
  type GameWeather,
} from "./weather-normalization";

const calm: GameWeather = { tempF: 70, windMph: 5, precipIn: 0 };
const brutal: GameWeather = { tempF: 15, windMph: 25, precipIn: 0.4 };

describe("weather-normalization", () => {
  it("severity indices are monotone in worsening conditions", () => {
    expect(coldDegreeDays(70)).toBe(0);
    expect(coldDegreeDays(30)).toBe(10);
    expect(coldDegreeDays(30)).toBeGreaterThan(coldDegreeDays(35));
    expect(windExposure(5)).toBe(0);
    expect(windExposure(20)).toBe(8);
    expect(precipSeverity(0)).toBe(0);
    expect(precipSeverity(0.5)).toBeGreaterThan(0);
    expect(weatherSeverityIndex(brutal)).toBeGreaterThan(
      weatherSeverityIndex(calm),
    );
    expect(weatherSeverityIndex(calm)).toBe(0);
  });

  it("normalization lifts severe-weather games toward fair comparison", () => {
    // Data-generating process: observed = trueEff * exp(-severity), so the
    // normalization inverts the weather suppression exactly.
    const weather = [calm, calm, calm, calm, brutal, brutal];
    const values = weather.map((w) => 0.2 * Math.exp(-weatherSeverityIndex(w)));
    const normed = normalizeByWeather(values, weather);
    for (const v of normed) expect(v).toBeCloseTo(0.2, 10);
    expect((normed[4] ?? 0)).toBeGreaterThan(values[4] ?? 0);
    expect(normed[0]).toBeCloseTo(values[0] ?? 0, 10);
    const spread = (xs: number[]): number => Math.max(...xs) - Math.min(...xs);
    expect(spread(normed)).toBeLessThan(spread(values));
    expect(() => normalizeByWeather([1], [])).toThrow();
  });

  it("bootstrap CI brackets the normalized median and shrinks with n", () => {
    const values = [0.2, 0.22, 0.19, 0.21, 0.2, 0.23, 0.18, 0.2];
    const weather = values.map(() => calm);
    const ci = weatherNormalizedMedianCI(values, weather, {
      replicates: 2000,
      seed: 42,
    });
    expect(ci.lo).toBeLessThanOrEqual(ci.median);
    expect(ci.hi).toBeGreaterThanOrEqual(ci.median);
    expect(ci.width).toBeGreaterThan(0);
    const tiny = weatherNormalizedMedianCI(values.slice(0, 3), weather.slice(0, 3), {
      replicates: 2000,
      seed: 42,
    });
    expect(tiny.width).toBeGreaterThanOrEqual(ci.width * 0.5);
  });

  it("rankingMoveFraction detects weather-driven rank changes", () => {
    // Raw means rank A first, but A played in brutal weather; normalized
    // medians flip the order by more than 2 places with 4 teams.
    const raw = { A: 0.25, B: 0.22, C: 0.2, D: 0.18 };
    const normed = { A: 0.35, B: 0.21, C: 0.19, D: 0.17 };
    // A: 0->0 (no move); make a sharper case:
    const raw2 = { A: 0.25, B: 0.24, C: 0.23, D: 0.22 };
    const normed2 = { A: 0.2, B: 0.3, C: 0.19, D: 0.31 };
    // raw2 ranks: A0 B1 C2 D3; normed2: D0 B1 A2 C3 -> A moves 2, C moves 1, D moves 3
    expect(rankingMoveFraction(raw2, normed2)).toBeCloseTo(0.5, 10);
    expect(rankingMoveFraction(raw, raw)).toBe(0);
    expect(rankingMoveFraction({ A: 1 }, { A: 2 })).toBe(1);
  });

  it("empty input throws", () => {
    expect(() => weatherNormalizedMedianCI([], [])).toThrow();
  });
});
