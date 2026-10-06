import { describe, expect, it } from "vitest";
import {
  KEEPTRADECUT_ATTRIBUTION,
  KEEPTRADECUT_BASE,
  KEEPTRADECUT_SOURCE_ID,
  KeepTradeCutClient,
  KeepTradeCutError,
} from "../keeptradecut-client.js";
import { assertIngestible } from "../source-registry.js";

const KTC_FIXTURE = `<!doctype html><html><head><title>Dynasty Rankings</title></head><body>
<script id="ktc-players" type="application/json">
{"players":[
{"playerName":"Josh Allen","playerID":101,"position":"QB","team":"BUF","age":30,"draftYear":2018,"byeWeek":7,"injury":null,
 "oneQB":{"value":7475,"rank":11,"tier":2},"superflex":{"value":9998,"rank":1,"tier":1},"tePremium":null,"adp":null,"trend30d":5},
{"playerName":"Brock Bowers","playerID":202,"position":"TE","team":"LV","age":23,"draftYear":2024,"byeWeek":10,"injury":null,
 "oneQB":null,"superflex":{"value":6400,"rank":28,"tier":3},"tePremium":{"value":8886,"rank":1},"adp":null,"trend30d":null}
]}
</script>
</body></html>`;

function okFetch(body: string): typeof fetch {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

describe("KeepTradeCut dynasty rankings", () => {
  it("exposes the registry identity, base, and attribution", () => {
    expect(KEEPTRADECUT_SOURCE_ID).toBe("keeptradecut-dynasty");
    expect(KEEPTRADECUT_BASE).toBe("https://keeptradecut.com");
    expect(KEEPTRADECUT_ATTRIBUTION).toBe("Dynasty values via KeepTradeCut.");
    expect(assertIngestible("keeptradecut-dynasty").baseUrl).toBe(KEEPTRADECUT_BASE);
  });

  it("parses the verified fixture to exact values", async () => {
    const client = new KeepTradeCutClient(okFetch(KTC_FIXTURE));
    const { players } = await client.getDynastyRankings();
    expect(players).toHaveLength(2);

    const allen = players[0];
    expect(allen?.playerName).toBe("Josh Allen");
    expect(allen?.oneQB?.value).toBe(7475);
    expect(allen?.oneQB?.rank).toBe(11);
    expect(allen?.superflex?.value).toBe(9998);
    expect(allen?.superflex?.rank).toBe(1);

    const bowers = players[1];
    expect(bowers?.playerName).toBe("Brock Bowers");
    expect(bowers?.tePremium?.value).toBe(8886);
    expect(bowers?.tePremium?.rank).toBe(1);
  });

  it("returns empty players on a missing or malformed embed, no throw", async () => {
    const missing = new KeepTradeCutClient(okFetch("<html><body>no ktc-players script</body></html>"));
    await expect(missing.getDynastyRankings()).resolves.toEqual({ players: [] });

    const malformed = new KeepTradeCutClient(okFetch('<script id="ktc-players">not json {{{</script>'));
    await expect(malformed.getDynastyRankings()).resolves.toEqual({ players: [] });
  });

  it("throws KeepTradeCutError with status on HTTP 500", async () => {
    const fetch500 = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new KeepTradeCutClient(fetch500);
    try {
      await client.getDynastyRankings();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(KeepTradeCutError);
      expect((err as KeepTradeCutError).status).toBe(500);
    }
  });

  it("assertIngestible rejects unknown sources", () => {
    expect(() => assertIngestible("no-such-source")).toThrow();
  });
});
