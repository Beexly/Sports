import { describe, expect, it, vi } from "vitest";
import {
  ActionNetworkClient,
  ActionNetworkError,
  isActionNetworkIngestEnabled,
  ACTION_NETWORK_SOURCE_ID,
} from "../action-network-client.js";
import { isIngestible } from "../source-registry.js";

/** Shape-faithful fixture: verified live 2026-09-18, game id 290803 (home BUF). */
const ACTION_NETWORK_FIXTURE = `
<html><head><title>NFL Public Betting</title></head><body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "scoreboardResponse": {
        "games": [
          {
            "gameId": 290803,
            "homeTeam": "BUF",
            "awayTeam": "MIA",
            "markets": [
              {
                "bookId": "draftkings",
                "outcome": "home",
                "betInfo": {
                  "tickets": { "value": 4120, "percent": 91 },
                  "money": { "value": 184500, "percent": 85 }
                },
                "moneyline": -239,
                "spread": -6.5,
                "total": 47.5
              },
              {
                "bookId": "fanduel",
                "outcome": "away",
                "betInfo": {
                  "tickets": { "value": 408, "percent": 9 },
                  "money": { "value": 32550, "percent": 15 }
                },
                "moneyline": 198
              }
            ]
          }
        ]
      }
    }
  }
}
</script>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
}

describe("Action Network client", () => {
  it("returns null and never fetches when the flag is off", async () => {
    expect(isActionNetworkIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new ActionNetworkClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getPublicBetting()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses the verified fixture: game 290803, BUF -239, tickets 91% / money 85%", async () => {
    const client = new ActionNetworkClient({ ACTION_NETWORK_INGEST: "1" }, okFetch(ACTION_NETWORK_FIXTURE));
    const res = await client.getPublicBetting();
    expect(res?.gameCount).toBe(1);
    const games = res?.games ?? [];
    expect(games).toHaveLength(1);
    const game = games[0];
    expect(game?.gameId).toBe(290803);
    expect(game?.homeTeam).toBe("BUF");
    expect(game?.awayTeam).toBe("MIA");
    const markets = game?.markets ?? [];
    expect(markets).toHaveLength(2);
    const ml = markets.find((m) => m.moneyline === -239);
    expect(ml?.bookId).toBe("draftkings");
    expect(ml?.betInfo?.tickets.percent).toBe(91);
    expect(ml?.betInfo?.money.percent).toBe(85);
    expect(ml?.spread).toBe(-6.5);
    expect(ml?.total).toBe(47.5);
  });

  it("returns empty games, without throwing, when __NEXT_DATA__ is missing", async () => {
    const client = new ActionNetworkClient(
      { ACTION_NETWORK_INGEST: "1" },
      okFetch("<html><body>no next-data script here</body></html>"),
    );
    const res = await client.getPublicBetting();
    expect(res?.games).toEqual([]);
    expect(res?.gameCount).toBe(0);
  });

  it("throws ActionNetworkError with the status on HTTP errors", async () => {
    const fetchImpl = (async () => new Response("error", { status: 503 })) as unknown as typeof fetch;
    const client = new ActionNetworkClient({ ACTION_NETWORK_INGEST: "1" }, fetchImpl);
    await expect(client.getPublicBetting()).rejects.toThrow(ActionNetworkError);
    try {
      await client.getPublicBetting();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ActionNetworkError);
      expect((err as ActionNetworkError).status).toBe(503);
    }
  });

  it("is registered ingestible in the source registry", () => {
    expect(ACTION_NETWORK_SOURCE_ID).toBe("action-network");
    expect(isIngestible("action-network")).toBe(true);
  });
});
