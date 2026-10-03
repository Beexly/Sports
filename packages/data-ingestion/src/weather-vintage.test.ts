import { describe, expect, it } from "vitest";
import {
  asOfCutoff,
  assertNoObservedWeather,
  flagObservedWeatherLeakage,
  ingestVintages,
  preferSource,
  selectVintageAsOf,
  vintageToFeatures,
  weatherVintageEnabled,
  type WeatherVintage,
} from "./weather-vintage.js";

const enabledEnv = { WEATHER_VINTAGE_ENABLED: "true" } as NodeJS.ProcessEnv;

function vintage(over: Partial<WeatherVintage> = {}): WeatherVintage {
  return {
    vintageId: "v1",
    source: "OPEN_METEO_PREVIOUS_RUNS",
    issuedAt: "2026-09-25T12:00:00.000Z",
    validAt: "2026-09-25T20:00:00.000Z",
    windMph: 12,
    tempF: 68,
    precipInches: 0.1,
    humidityPct: 55,
    ...over,
  };
}

describe("D2 weatherVintageEnabled", () => {
  it("is env-gated and default OFF", () => {
    expect(weatherVintageEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(weatherVintageEnabled(enabledEnv)).toBe(true);
  });
});

describe("D2 selectVintageAsOf", () => {
  it("picks the latest vintage issued before cutoff", () => {
    const list = [
      vintage({ vintageId: "a", issuedAt: "2026-09-25T06:00:00.000Z" }),
      vintage({ vintageId: "b", issuedAt: "2026-09-25T12:00:00.000Z" }),
      vintage({ vintageId: "c", issuedAt: "2026-09-25T18:00:00.000Z" }),
    ];
    const r = selectVintageAsOf(list, "2026-09-25T14:00:00.000Z");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.vintage.vintageId).toBe("b");
  });

  it("never returns a vintage issued at or after cutoff", () => {
    const list = [vintage({ issuedAt: "2026-09-25T14:00:00.000Z" })];
    const r = selectVintageAsOf(list, "2026-09-25T14:00:00.000Z");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no forecast vintage");
  });

  it("fail-closes when nothing was issued before cutoff — never falls back to observed", () => {
    const r = selectVintageAsOf([], "2026-09-25T14:00:00.000Z");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("fail-closed");
  });

  it("rejects invalid cutoff", () => {
    expect(selectVintageAsOf([vintage()], "nope").ok).toBe(false);
  });
});

describe("D2 asOfCutoff", () => {
  it("subtracts lead hours from kickoff", () => {
    const c = asOfCutoff("2026-09-25T20:00:00.000Z", 6);
    expect(c).toBe("2026-09-25T14:00:00.000Z");
  });

  it("returns null on invalid kickoff", () => {
    expect(asOfCutoff("nope")).toBeNull();
  });
});

describe("D2 observed-weather leakage flags", () => {
  it("flags observed weather feature names", () => {
    const leaked = flagObservedWeatherLeakage([
      "wx_wind_mph",
      "observed_wind",
      "temp_f",
      "actual_precip",
    ]);
    expect(leaked).toContain("observed_wind");
    expect(leaked).toContain("actual_precip");
    expect(leaked).not.toContain("wx_wind_mph");
  });

  it("assertNoObservedWeather throws on leak and passes on clean", () => {
    expect(() => assertNoObservedWeather(["wx_wind_mph", "wx_temp_f"])).not.toThrow();
    expect(() => assertNoObservedWeather(["observed_temp"])).toThrow(/LEAKAGE/);
  });
});

describe("D2 vintageToFeatures", () => {
  it("maps vintage fields to a feature vector", () => {
    const f = vintageToFeatures(vintage());
    expect(f.wx_wind_mph).toBe(12);
    expect(f.wx_temp_f).toBe(68);
    expect(f.wx_precip_in).toBe(0.1);
  });

  it("returns nulls for missing vintage — never imputes", () => {
    const f = vintageToFeatures(null);
    expect(f.wx_wind_mph).toBeNull();
    expect(f.wx_temp_f).toBeNull();
  });
});

describe("D2 ingestVintages", () => {
  it("rejects when env gate is off", () => {
    const r = ingestVintages([vintage()], {} as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("disabled");
  });

  it("accepts valid vintages and rejects bad timestamps", () => {
    const r = ingestVintages(
      [
        vintage(),
        vintage({ issuedAt: "nope" }),
        vintage({ validAt: "nope" }),
        vintage({ vintageId: "  " }),
      ],
      enabledEnv,
    );
    expect(r.ok).toBe(true);
    expect(r.accepted).toHaveLength(1);
    expect(r.rejected).toHaveLength(3);
  });
});

describe("D2 preferSource", () => {
  it("prefers Open-Meteo Previous Runs over NWS at same issue time", () => {
    const om = vintage({ source: "OPEN_METEO_PREVIOUS_RUNS" });
    const nws = vintage({ source: "NWS" });
    expect(preferSource(om, nws)).toBe(om);
    expect(preferSource(nws, om)).toBe(om);
  });
});
