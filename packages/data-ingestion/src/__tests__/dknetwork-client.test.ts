import { describe, expect, it, vi } from "vitest";
import {
  DknNetworkClient,
  DknSplitsError,
  isDknSplitsIngestEnabled,
  DKN_SOURCE_ID,
} from "../dknetwork-client.js";
import { isIngestible } from "../source-registry.js";

/** Verified live 2026-09-18: PHI @ TEN — ML TEN +250 (2%/2%), PHI -310 (98%/98%); Spread PHI -7 -110 (94%/93%). */
const DKN_FIXTURE = `
<html><body>
<section data-game>
  <h2>PHI @ TEN</h2>
  <time datetime="2026-09-18T20:15:00Z">Sep 18, 8:15 PM ET</time>
  <h3>Moneyline</h3>
  <table data-market="moneyline">
    <thead><tr><th>Side</th><th>Odds</th><th>Handle %</th><th>Bets %</th></tr></thead>
    <tbody>
      <tr><td>TEN</td><td>+250</td><td>2%</td><td>2%</td></tr>
      <tr><td>PHI</td><td>-310</td><td>98%</td><td>98%</td></tr>
    </tbody>
  </table>
  <h3>Spread</h3>
  <table data-market="spread">
    <thead><tr><th>Side</th><th>Odds</th><th>Handle %</th><th>Bets %</th></tr></thead>
    <tbody>
      <tr><td>TEN +7</td><td>-110</td><td>6%</td><td>7%</td></tr>
      <tr><td>PHI -7</td><td>-110</td><td>94%</td><td>93%</td></tr>
    </tbody>
  </table>
  <h3>Total</h3>
  <table data-market="total">
    <thead><tr><th>Side</th><th>Odds</th><th>Handle %</th><th>Bets %</th></tr></thead>
    <tbody>
      <tr><td>Over 43.5</td><td>-110</td><td>80%</td><td>77%</td></tr>
      <tr><td>Under 43.5</td><td>-110</td><td>20%</td><td>23%</td></tr>
    </tbody>
  </table>
</section>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
}

describe("DK Network betting splits client", () => {
  it("returns null and never fetches when the flag is off", async () => {
    expect(isDknSplitsIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new DknNetworkClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getBettingSplits()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses the verified fixture: PHI @ TEN ML / spread / total splits", async () => {
    const client = new DknNetworkClient({ DKN_SPLITS_INGEST: "1" }, okFetch(DKN_FIXTURE));
    const games = await client.getBettingSplits("NFL");
    expect(games).toHaveLength(1);
    const game = games?.[0];
    expect(game?.matchup).toBe("PHI @ TEN");
    expect(game?.gameDate).toBe("2026-09-18T20:15:00Z");
    const ml = game?.moneyline ?? [];
    expect(ml).toHaveLength(2);
    expect(ml[0]).toMatchObject({ side: "TEN", odds: "+250", handlePct: 2, betsPct: 2 });
    expect(ml[1]).toMatchObject({ side: "PHI", odds: "-310", handlePct: 98, betsPct: 98 });
    const spread = game?.spread ?? [];
    const phiSpread = spread.find((s) => s.side === "PHI -7");
    expect(phiSpread).toMatchObject({ odds: "-110", handlePct: 94, betsPct: 93 });
    const total = game?.total ?? [];
    expect(total).toHaveLength(2);
    expect(total[0]).toMatchObject({ side: "Over 43.5", handlePct: 80, betsPct: 77 });
  });

  it("returns an empty array, without throwing, when no game sections exist", async () => {
    const client = new DknNetworkClient(
      { DKN_SPLITS_INGEST: "1" },
      okFetch("<html><body>no splits here</body></html>"),
    );
    expect(await client.getBettingSplits("NFL")).toEqual([]);
  });

  it("throws DknSplitsError with the status on HTTP errors", async () => {
    const fetchImpl = (async () => new Response("error", { status: 500 })) as unknown as typeof fetch;
    const client = new DknNetworkClient({ DKN_SPLITS_INGEST: "1" }, fetchImpl);
    await expect(client.getBettingSplits()).rejects.toThrow(DknSplitsError);
    try {
      await client.getBettingSplits();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DknSplitsError);
      expect((err as DknSplitsError).status).toBe(500);
    }
  });

  it("is registered ingestible in the source registry", () => {
    expect(DKN_SOURCE_ID).toBe("dkn-betting-splits");
    expect(isIngestible("dkn-betting-splits")).toBe(true);
  });
});
