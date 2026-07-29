import { describe, expect, it } from "vitest";
import {
  createOpenMeteoProvider,
  parseLatLon,
  createNflverseMemoryProvider,
  NflverseMemoryStore,
  getMetricById,
} from "../index.js";

describe("open-meteo provider", () => {
  it("parses lat,lon entity", () => {
    expect(parseLatLon("39.1,-84.5")).toEqual({ lat: 39.1, lon: -84.5 });
    expect(parseLatLon("bad")).toBeNull();
  });

  it("maps temp_f from celsius", async () => {
    const p = createOpenMeteoProvider({
      async fetchCurrent() {
        return { temperature_2m: 0 };
      },
    });
    const m = getMetricById("ctx.weather.temp_f")!;
    const v = await p(m, "39.1,-84.5", "2025-11-01T00:00:00.000Z");
    expect(v).toBe(32);
  });
});

describe("nflverse memory provider", () => {
  it("PIT get returns latest asOf", async () => {
    const store = new NflverseMemoryStore();
    store.put({
      metricId: "nfl.box.pass_yds",
      entityId: "player_1",
      asOf: "2025-11-01T00:00:00.000Z",
      value: 250,
    });
    store.put({
      metricId: "nfl.box.pass_yds",
      entityId: "player_1",
      asOf: "2025-11-08T00:00:00.000Z",
      value: 310,
    });
    const p = createNflverseMemoryProvider(store);
    const m = getMetricById("nfl.box.pass_yds")!;
    const mid = await p(m, "player_1", "2025-11-05T00:00:00.000Z");
    expect(mid).toBe(250);
    const late = await p(m, "player_1", "2025-11-10T00:00:00.000Z");
    expect(late).toBe(310);
  });
});
