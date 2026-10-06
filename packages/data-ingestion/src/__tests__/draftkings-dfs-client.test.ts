import { describe, expect, it, vi } from "vitest";
import {
  DRAFTKINGS_DFS_ATTRIBUTION,
  DRAFTKINGS_DFS_BASE,
  DRAFTKINGS_DFS_CONTESTS_SOURCE_ID,
  DRAFTKINGS_DFS_PLAYERS_SOURCE_ID,
  DraftKingsDfsClient,
  DraftKingsDfsError,
  isDraftKingsDfsIngestEnabled,
} from "../draftkings-dfs-client.js";
import { assertIngestible } from "../source-registry.js";

const ENV = { DRAFTKINGS_DFS_INGEST: "1" };

/**
 * Fixtures built from the verified live DraftKings website endpoints
 * 2026-09-18: getcontests (8,661 live NFL contests; sample id 195648008,
 * dg 153428, po 3000000) and getavailableplayers (dg 153428: 670 players;
 * sample Bijan Robinson RB ATL vs CAR, salary 8200, ppg 31.3).
 */
const CONTESTS_FIXTURE = {
  Contests: [
    {
      id: 195648008,
      dg: 153428,
      name: "NFL $3M Fantasy Football Millionaire [$1M to 1st]",
      po: 3000000,
      entries: 150000,
      maxEntries: 150000,
      start: "2026-09-20T17:00:00Z",
      gameType: "Classic",
    },
    {
      id: 195648009,
      dg: 153428,
      name: "NFL $100K Mini-Max",
      po: 100000,
      entries: 5000,
      maxEntries: 20000,
      start: "2026-09-20T17:00:00Z",
      gameType: "Classic",
    },
  ],
};

const PLAYERS_FIXTURE = {
  playerList: [
    {
      pid: 1001,
      fn: "Bijan",
      ln: "Robinson",
      pn: "RB",
      s: 8200,
      ppg: 31.3,
      tid: 1,
      matchup: "ATL vs CAR",
      jersey: "7",
      draftable: true,
    },
    {
      pid: 1002,
      fn: "Josh",
      ln: "Allen",
      pn: "QB",
      s: 7800,
      ppg: 27.1,
      tid: 2,
      matchup: "BUF vs MIA",
      jersey: "17",
      draftable: true,
    },
  ],
};

function okFetch(handler: (url: string) => unknown) {
  return (async (url: unknown) =>
    new Response(JSON.stringify(handler(String(url))), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function fixtureFetch() {
  return okFetch((url) =>
    url.includes("getavailableplayers") ? PLAYERS_FIXTURE : CONTESTS_FIXTURE,
  );
}

describe("DraftKings DFS client", () => {
  it("exposes the registry identity, base, and attribution", () => {
    expect(DRAFTKINGS_DFS_CONTESTS_SOURCE_ID).toBe("draftkings-getcontests");
    expect(DRAFTKINGS_DFS_PLAYERS_SOURCE_ID).toBe("draftkings-getavailableplayers");
    expect(DRAFTKINGS_DFS_BASE).toBe("https://www.draftkings.com");
    expect(DRAFTKINGS_DFS_ATTRIBUTION).toContain("DraftKings");
    expect(assertIngestible("draftkings-getcontests").baseUrl).toBe(DRAFTKINGS_DFS_BASE);
    expect(assertIngestible("draftkings-getavailableplayers").baseUrl).toBe(DRAFTKINGS_DFS_BASE);
  });

  it("returns null and never fetches when the flag is off", async () => {
    expect(isDraftKingsDfsIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new DraftKingsDfsClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getContests()).toBeNull();
    expect(await client.getAvailablePlayers(153428)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses the verified contests fixture to exact values", async () => {
    const client = new DraftKingsDfsClient(ENV, fixtureFetch());
    const contests = await client.getContests();
    expect(contests).toHaveLength(2);
    const first = contests?.[0];
    expect(first?.id).toBe(195648008);
    expect(first?.draftGroupId).toBe(153428);
    expect(first?.name).toBe("NFL $3M Fantasy Football Millionaire [$1M to 1st]");
    expect(first?.prizePool).toBe(3000000);
  });

  it("parses the verified player-pool fixture to exact values", async () => {
    const seen: string[] = [];
    const client = new DraftKingsDfsClient(
      ENV,
      okFetch((url) => {
        seen.push(url);
        return PLAYERS_FIXTURE;
      }),
    );
    const players = await client.getAvailablePlayers(153428);
    expect(players).toHaveLength(2);
    const bijan = players?.[0];
    expect(bijan?.firstName).toBe("Bijan");
    expect(bijan?.lastName).toBe("Robinson");
    expect(bijan?.position).toBe("RB");
    expect(bijan?.salary).toBe(8200);
    expect(bijan?.ppg).toBe(31.3);
    expect(bijan?.matchup).toBe("ATL vs CAR");
    // draftGroupId is passed through to the URL, never hardcoded.
    expect(seen[0]).toContain("draftGroupId=153428");
  });

  it("rejects an invalid draftGroupId without fetching", async () => {
    const fetchImpl = vi.fn();
    const client = new DraftKingsDfsClient(ENV, fetchImpl as unknown as typeof fetch);
    await expect(client.getAvailablePlayers(0)).rejects.toBeInstanceOf(DraftKingsDfsError);
    await expect(client.getAvailablePlayers(-5)).rejects.toBeInstanceOf(DraftKingsDfsError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("degrades malformed bodies to empty lists, never throws", async () => {
    const client = new DraftKingsDfsClient(ENV, okFetch(() => "not json shaped"));
    expect(await client.getContests()).toEqual([]);
    expect(await client.getAvailablePlayers(153428)).toEqual([]);
  });

  it("throws DraftKingsDfsError with status on HTTP 500", async () => {
    const fetch500 = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new DraftKingsDfsClient(ENV, fetch500);
    await expect(client.getContests()).rejects.toMatchObject({ status: 500 });
    await expect(client.getAvailablePlayers(153428)).rejects.toMatchObject({ status: 500 });
  });

  it("assertIngestible throws for an unknown source id", () => {
    expect(() => assertIngestible("no-such-source")).toThrow(/Unknown data source/);
  });
});
