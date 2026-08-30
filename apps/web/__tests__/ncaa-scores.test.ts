import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchNcaaScoresResilient } from "@/lib/data-sources/ncaa-scores";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => readFileSync(resolve(FIX, f), "utf8");

const json = (body: string) => ({ ok: true, status: 200, json: async () => JSON.parse(body) }) as unknown as Response;

describe("fetchNcaaScoresResilient", () => {
  it("serves from ESPN (primary) when it is healthy", async () => {
    const fetchImpl = (async (url: string) =>
      String(url).includes("henrygd") ? json("{}") : json(read("espn-ncaaf-scoreboard.json"))) as typeof fetch;
    const r = await fetchNcaaScoresResilient("ncaaf", { fetchImpl });
    expect(r.servedBy).toBe("primary");
    expect(r.degraded).toBe(false);
    expect(r.games.length).toBeGreaterThan(0);
    expect(r.games[0]!.source).toBe("espn-public-api");
  });

  it("falls back to henrygd when ESPN errors", async () => {
    const fetchImpl = (async (url: string) => {
      if (String(url).includes("henrygd")) return json(read("henrygd-scoreboard.json"));
      return { ok: false, status: 503, json: async () => ({}) } as unknown as Response;
    }) as typeof fetch;
    const r = await fetchNcaaScoresResilient("ncaaf", { fetchImpl });
    expect(r.servedBy).toBe("secondary");
    expect(r.degraded).toBe(true);
    expect(r.games[0]!.source).toBe("henrygd-ncaa");
  });

  it("falls back when ESPN returns an empty slate", async () => {
    const fetchImpl = (async (url: string) =>
      String(url).includes("henrygd") ? json(read("henrygd-scoreboard.json")) : json('{"events":[]}')) as typeof fetch;
    const r = await fetchNcaaScoresResilient("ncaab", { fetchImpl, henrygdPath: "basketball-men/d1" });
    expect(r.servedBy).toBe("secondary");
    expect(r.degraded).toBe(true);
  });
});
