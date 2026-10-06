/**
 * Tests for ./weather-api-ingest (arXiv:1805.09091, lane=weather).
 *
 * ACCEPTANCE GATE: ADAPT only if NN-aux-emb achieves >=5% relative mean-CRPS improvement over EMOS-gl on a holdout
 * season AND is significantly better (DM+BH) than EMOS-gl at >=15% of stadiums while significantly
 * worse at <=5%. Otherwise ship the EMOS-gl linear model.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./weather-api-ingest";

describe("weather API ingest (arXiv:1803.07929v1)", () => {
  it("normalizes a raw row", () => {
    const r = mod.normalizeWeatherRow({ game_id: "g1", stadium: "Lambeau", observed_at: new Date().toISOString(), temp_f: 30, wind_mph: 15, wind_dir: "NW", humidity_pct: 80, precip: "snow", roof: "open" })!;
    expect(mod.isWeatherReading(r)).toBe(true);
    expect(mod.weatherApplies(r)).toBe(true);
    expect(mod.windBucket(r.windMph)).toBe("windy");
  });
  it("dome games null out weather", () => {
    const r = mod.normalizeWeatherRow({ game_id: "g2", stadium: "SoFi", observed_at: new Date().toISOString(), temp_f: null, wind_mph: null, wind_dir: null, humidity_pct: null, precip: null, roof: "closed" })!;
    expect(mod.weatherApplies(r)).toBe(false);
    expect(mod.windBucket(r.windMph)).toBe("unknown");
  });
  it("rejects malformed", () => {
    expect(mod.normalizeWeatherRow({ game_id: "g3", observed_at: "not-a-date" })).toBeNull();
    expect(mod.isWeatherReading(null)).toBe(false);
  });
  it("wind buckets", () => {
    expect(mod.windBucket(3)).toBe("calm");
    expect(mod.windBucket(8)).toBe("breezy");
    expect(mod.windBucket(25)).toBe("extreme");
    expect(mod.windBucket(-1)).toBe("unknown");
  });
});
