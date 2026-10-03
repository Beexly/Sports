import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FreeStats } from "@/lib/data-sources/free-stats";
import { getCfbSnapshot, apTop25 } from "@/lib/data-sources/cfb-free";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => readFileSync(resolve(FIX, f), "utf8");

/** Routes each ESPN endpoint to the matching fixture, no network. */
function routedFetch(): typeof fetch {
  return (async (url: string) => {
    const u = String(url);
    let body = "{}";
    if (u.includes("/scoreboard")) body = read("espn-nfl-scoreboard.json");
    else if (u.includes("/rankings")) body = read("espn-cfb-rankings.json");
    else if (u.includes("/standings")) body = read("espn-nfl-standings.json");
    return { ok: true, status: 200, json: async () => JSON.parse(body) } as unknown as Response;
  }) as typeof fetch;
}

describe("free CFB snapshot", () => {
  it("composes scores + rankings + standings from the free ESPN source", async () => {
    const stats = new FreeStats({ fetchImpl: routedFetch(), clock: () => 1 });
    const snap = await getCfbSnapshot(stats);
    expect(snap.sport).toBe("ncaaf");
    expect(snap.sourceId).toBe("espn-public-api");
    expect(snap.scores.length).toBeGreaterThan(0);
    expect(snap.rankings.length).toBeGreaterThan(0);
    expect(snap.standings.teams.length).toBeGreaterThan(0);
    expect(snap.attribution).toContain("ESPN");
  });

  it("exposes the AP Top 25 from the snapshot", async () => {
    const stats = new FreeStats({ fetchImpl: routedFetch(), clock: () => 1 });
    const snap = await getCfbSnapshot(stats);
    const ap = apTop25(snap);
    expect(ap).not.toBeNull();
    expect(ap!.teams[0]!.rank).toBe(1);
  });
});
