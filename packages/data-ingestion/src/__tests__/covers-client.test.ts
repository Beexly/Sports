import { describe, expect, it, vi } from "vitest";
import {
  CoversClient,
  CoversError,
  isCoversIngestEnabled,
  COVERS_ODDS_HISTORY_SOURCE_ID,
  COVERS_LIVE_ODDS_SOURCE_ID,
} from "../covers-client.js";
import { isIngestible } from "../source-registry.js";

/** Verified fixture shape: "Week 1: Favorites 13-3 (81.3%), O/U 9-7 (56.3%)". */
const COVERS_HISTORY_FIXTURE = `
<html><body>
<table>
  <thead><tr><th>Week</th><th>Favorites</th><th>Home Teams</th><th>O/U</th></tr></thead>
  <tbody>
    <tr><td>Week 1</td><td>Favorites 13-3 (81.3%)</td><td>Home Teams 8-8 (50.0%)</td><td>O/U 9-7 (56.3%)</td></tr>
    <tr><td>Week 2</td><td>Favorites 10-6 (62.5%)</td><td>Home Teams 7-9 (43.8%)</td><td>O/U 6-10 (37.5%)</td></tr>
  </tbody>
</table>
</body></html>
`;

const COVERS_LIVE_FIXTURE = `
<html><body>
<table>
  <thead><tr><th>Matchup</th><th>Consensus</th><th>Book</th><th>Moneyline</th><th>Spread</th><th>Total</th></tr></thead>
  <tbody>
    <tr><td>BUF @ KC</td><td>-6.5</td><td>DraftKings</td><td>-239</td><td>-6.5</td><td>O 47.5</td></tr>
    <tr><td></td><td></td><td>FanDuel</td><td>-250</td><td>-6.5</td><td>O 47.5</td></tr>
    <tr><td>PHI @ DAL</td><td>-3.0</td><td>DraftKings</td><td>-160</td><td>-3.0</td><td>U 51.5</td></tr>
  </tbody>
</table>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
}

describe("Covers client", () => {
  it("returns null and never fetches when the flag is off", async () => {
    expect(isCoversIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new CoversClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getOddsHistory(2026)).toBeNull();
    expect(await client.getLiveOdds()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses the season-history fixture to exact values", async () => {
    const client = new CoversClient({ COVERS_INGEST: "1" }, okFetch(COVERS_HISTORY_FIXTURE));
    const rows = await client.getOddsHistory(2026);
    expect(rows).toHaveLength(2);
    const week1 = rows?.[0];
    expect(week1?.week).toBe("Week 1");
    expect(week1?.favorites).toBe("13-3 (81.3%)");
    expect(week1?.homeTeams).toBe("8-8 (50.0%)");
    expect(week1?.overUnders).toBe("9-7 (56.3%)");
    expect(rows?.[1]?.week).toBe("Week 2");
  });

  it("parses the live-odds fixture: 2 games, BUF @ KC with 2 books", async () => {
    const client = new CoversClient({ COVERS_INGEST: "1" }, okFetch(COVERS_LIVE_FIXTURE));
    const games = await client.getLiveOdds();
    expect(games).toHaveLength(2);
    const buf = games?.[0];
    expect(buf?.matchup).toBe("BUF @ KC");
    expect(buf?.consensus).toBe("-6.5");
    const books = buf?.books ?? [];
    expect(books).toHaveLength(2);
    expect(books[0]).toMatchObject({ book: "DraftKings", moneyline: "-239", spread: "-6.5", total: "O 47.5" });
    expect(books[1]).toMatchObject({ book: "FanDuel", moneyline: "-250" });
    expect(games?.[1]?.matchup).toBe("PHI @ DAL");
    expect(games?.[1]?.books).toHaveLength(1);
  });

  it("returns empty arrays, without throwing, when no table is present", async () => {
    const client = new CoversClient(
      { COVERS_INGEST: "1" },
      okFetch("<html><body>maintenance, no tables</body></html>"),
    );
    expect(await client.getOddsHistory(2026)).toEqual([]);
    expect(await client.getLiveOdds()).toEqual([]);
  });

  it("throws CoversError with the status on HTTP errors", async () => {
    const fetchImpl = (async () => new Response("error", { status: 429 })) as unknown as typeof fetch;
    const client = new CoversClient({ COVERS_INGEST: "1" }, fetchImpl);
    await expect(client.getOddsHistory(2026)).rejects.toThrow(CoversError);
    try {
      await client.getLiveOdds();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CoversError);
      expect((err as CoversError).status).toBe(429);
    }
  });

  it("is registered ingestible in the source registry under both ids", () => {
    expect(COVERS_ODDS_HISTORY_SOURCE_ID).toBe("covers-odds-history");
    expect(COVERS_LIVE_ODDS_SOURCE_ID).toBe("covers-live-odds");
    expect(isIngestible("covers-odds-history")).toBe(true);
    expect(isIngestible("covers-live-odds")).toBe(true);
  });
});
