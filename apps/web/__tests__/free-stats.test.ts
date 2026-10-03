import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FreeStats, TTL } from "@/lib/data-sources/free-stats";

const FIX = resolve(__dirname, "fixtures");
const readFix = (f: string) => readFileSync(resolve(FIX, f), "utf8");

/** Counting fake fetch — returns a fixture and records call count. */
function countingFetch(body: string): { fetch: typeof fetch; calls: () => number } {
  let calls = 0;
  const fn = (async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => JSON.parse(body) } as unknown as Response;
  }) as typeof fetch;
  return { fetch: fn, calls: () => calls };
}

describe("free-stats facade (cached, rate-limit safe)", () => {
  it("caches within the TTL and only hits the source once", async () => {
    const f = countingFetch(readFix("espn-nfl-scoreboard.json"));
    let now = 1_000_000;
    const fs = new FreeStats({ fetchImpl: f.fetch, clock: () => now });

    const a = await fs.scores("nfl");
    expect(a.cached).toBe(false);
    expect(a.data.length).toBeGreaterThan(0);

    const b = await fs.scores("nfl"); // within TTL
    expect(b.cached).toBe(true);
    expect(f.calls()).toBe(1); // source hit once

    now += TTL.scores + 1; // expire
    const c = await fs.scores("nfl");
    expect(c.cached).toBe(false);
    expect(f.calls()).toBe(2);
  });

  it("keys cache by sport + need (no cross-contamination)", async () => {
    const f = countingFetch(readFix("espn-nfl-standings.json"));
    const fs = new FreeStats({ fetchImpl: f.fetch, clock: () => 5 });
    await fs.standings("nfl");
    await fs.standings("nba");
    expect(f.calls()).toBe(2); // different sports → separate fetches
  });

  it("attaches provenance + attribution-bearing data", async () => {
    const f = countingFetch(readFix("open-meteo.json"));
    const fs = new FreeStats({ fetchImpl: f.fetch, clock: () => 0 });
    const w = await fs.weather(39.05, -94.48);
    expect(w.sourceId).toBe("open-meteo");
    expect(w.data.attribution).toContain("Open-Meteo");
  });

  it("clear() drops the cache", async () => {
    const f = countingFetch(readFix("espn-nfl-scoreboard.json"));
    const fs = new FreeStats({ fetchImpl: f.fetch, clock: () => 100 });
    await fs.scores("nfl");
    fs.clear();
    await fs.scores("nfl");
    expect(f.calls()).toBe(2);
  });
});
