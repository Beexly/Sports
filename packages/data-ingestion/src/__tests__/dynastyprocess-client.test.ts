import { describe, expect, it } from "vitest";
import {
  DYNASTYPROCESS_ATTRIBUTION,
  DYNASTYPROCESS_BASE,
  DYNASTYPROCESS_SOURCE_ID,
  DynastyProcessClient,
  DynastyProcessError,
} from "../dynastyprocess-client.js";
import { assertIngestible } from "../source-registry.js";

const PLAYERS_FIXTURE = `player,pos,team,age,draft_year,ecr_1qb,ecr_2qb,ecr_pos,value_1qb,value_2qb,scrape_date,fp_id
"Ja'Marr Chase",WR,CIN,26,2021,1,1,1,10256,9034,2026-09-11,17564
"Johnson, Calvin",WR,DET,40,2007,999,999,999,10,10,2026-09-11,999
`;

const PICKS_FIXTURE = `Pick,Value_1QB,Value_2QB
2026 Early 1st,5000,4500
2026 Late 1st,3000,2700
`;

function okFetch(body: string): typeof fetch {
  return (async (url: unknown) => {
    const u = String(url);
    if (u.endsWith("values-picks.csv")) return new Response(PICKS_FIXTURE, { status: 200 });
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
}

describe("DynastyProcess values", () => {
  it("exposes the registry identity, base, and attribution", () => {
    expect(DYNASTYPROCESS_SOURCE_ID).toBe("dynastyprocess-values");
    expect(DYNASTYPROCESS_BASE).toBe(
      "https://raw.githubusercontent.com/dynastyprocess/data/master/files",
    );
    expect(DYNASTYPROCESS_ATTRIBUTION).toBe("Dynasty values via DynastyProcess (CC/open data).");
    expect(assertIngestible("dynastyprocess-values").baseUrl).toBe(DYNASTYPROCESS_BASE);
  });

  it("parses the verified player-values fixture to exact values", async () => {
    const client = new DynastyProcessClient(okFetch(PLAYERS_FIXTURE));
    const { players } = await client.getPlayerValues();
    expect(players).toHaveLength(2);

    const chase = players[0];
    expect(chase?.player).toBe("Ja'Marr Chase");
    expect(chase?.value1qb).toBe(10256);
    expect(chase?.value2qb).toBe(9034);
    expect(chase?.ecr1qb).toBe(1);
    expect(chase?.scrapeDate).toBe("2026-09-11");
    expect(chase?.pos).toBe("WR");
    expect(chase?.team).toBe("CIN");

    // Quoted field containing a comma must not split the row.
    const calvin = players[1];
    expect(calvin?.player).toBe("Johnson, Calvin");
    expect(calvin?.value1qb).toBe(10);
  });

  it("parses pick values with case-insensitive headers", async () => {
    const client = new DynastyProcessClient(okFetch(PLAYERS_FIXTURE));
    const { picks } = await client.getPickValues();
    expect(picks).toHaveLength(2);

    const first = picks[0];
    expect(first?.pick).toBe("2026 Early 1st");
    expect(first?.value1qb).toBe(5000);
    expect(first?.value2qb).toBe(4500);
  });

  it("returns empty rows on empty/malformed CSV, no throw", async () => {
    // NOTE: the shared okFetch helper URL-maps values-picks.csv to PICKS_FIXTURE,
    // so the empty-body case needs a fetch that returns "" for every URL.
    const blankFetch = (async () => new Response("", { status: 200 })) as unknown as typeof fetch;
    const empty = new DynastyProcessClient(blankFetch);
    await expect(empty.getPlayerValues()).resolves.toEqual({ players: [] });
    await expect(empty.getPickValues()).resolves.toEqual({ picks: [] });

    const garbage = new DynastyProcessClient(okFetch("not,a,csv\nrow with no meaning"));
    await expect(garbage.getPlayerValues()).resolves.toEqual({ players: [] });
  });

  it("throws DynastyProcessError with status on HTTP 500", async () => {
    const fetch500 = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new DynastyProcessClient(fetch500);
    try {
      await client.getPlayerValues();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DynastyProcessError);
      expect((err as DynastyProcessError).status).toBe(500);
    }
    try {
      await client.getPickValues();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DynastyProcessError);
      expect((err as DynastyProcessError).status).toBe(500);
    }
  });

  it("assertIngestible rejects unknown sources", () => {
    expect(() => assertIngestible("no-such-source")).toThrow();
  });
});
