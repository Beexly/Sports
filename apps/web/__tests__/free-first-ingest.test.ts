import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  fetchScoresFreeFirst,
  fetchWeatherFreeFirst,
  paidCallJustified,
  SOURCES_WITH_FREE_ADAPTER,
} from "@/lib/data-sources/free-first-ingest";

const FIX = resolve(__dirname, "fixtures");
const readFix = (f: string) => readFileSync(resolve(FIX, f), "utf8");

/** A fake fetch that returns a fixture JSON body, no network. */
function fakeFetch(body: string): typeof fetch {
  return (async () =>
    ({ ok: true, status: 200, json: async () => JSON.parse(body) }) as unknown as Response) as typeof fetch;
}

describe("free-first ingestion", () => {
  it("scores are served from the free ESPN source with provenance + no spend", async () => {
    const out = await fetchScoresFreeFirst("nfl", { fetchImpl: fakeFetch(readFix("espn-nfl-scoreboard.json")) });
    expect(out.usedSourceId).toBe("espn-public-api");
    expect(out.usedFree).toBe(true);
    expect(out.mustSpend).toBe(false);
    expect(out.data && out.data.length).toBeGreaterThan(0);
    expect(out.attribution).toContain("ESPN");
  });

  it("weather is served free from Open-Meteo with nearest-kickoff lookup", async () => {
    const fixture = JSON.parse(readFix("open-meteo.json"));
    const kickoff = fixture.hourly.time[1];
    const out = await fetchWeatherFreeFirst(39.05, -94.48, kickoff, {
      fetchImpl: fakeFetch(readFix("open-meteo.json")),
    });
    expect(out.usedSourceId).toBe("open-meteo");
    expect(out.usedFree).toBe(true);
    expect(out.data?.atKickoff?.time).toBe(kickoff);
    expect(out.attribution).toContain("Open-Meteo");
  });

  it("spend guard: scores never justify paid; odds currently do", () => {
    expect(paidCallJustified("scores", "nfl")).toBe(false);
    expect(paidCallJustified("weather", "ncaaf")).toBe(false);
    expect(paidCallJustified("odds", "nfl")).toBe(true); // free odds sources still gated
  });

  it("only declares an adapter for sources we actually implemented", () => {
    expect(SOURCES_WITH_FREE_ADAPTER.has("espn-public-api")).toBe(true);
    expect(SOURCES_WITH_FREE_ADAPTER.has("open-meteo")).toBe(true);
    expect(SOURCES_WITH_FREE_ADAPTER.has("the-odds-api")).toBe(false);
  });
});
