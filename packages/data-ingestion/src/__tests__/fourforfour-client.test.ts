import { describe, expect, it } from "vitest";
import {
  FOURFORFOUR_ATTRIBUTION,
  FOURFORFOUR_BASE,
  FOURFORFOUR_SOURCE_ID,
  FourforFourClient,
  FourforFourError,
} from "../fourforfour-client.js";
import { assertIngestible } from "../source-registry.js";

const CHEATSHEET_FIXTURE = `<!doctype html><html><body>
<h2>Overall Rankings</h2>
<table>
<caption>Overall</caption>
<thead><tr><th>Rank</th><th>Pos</th><th>Player</th><th>Bye</th><th>FF Pts</th><th>ADP</th></tr></thead>
<tbody>
<tr><td>1</td><td>RB</td><td>Jahmyr Gibbs</td><td>8</td><td>250.9</td><td>1</td></tr>
<tr><td>2</td><td>WR</td><td>Ja&#39;Marr Chase</td><td>10</td><td>248.1</td><td>2</td></tr>
</tbody>
</table>
<h2>Quarterbacks</h2>
<table>
<caption>QB</caption>
<thead><tr><th>Rank</th><th>Pos</th><th>Player</th><th>Bye</th><th>FF Pts</th><th>ADP</th></tr></thead>
<tbody>
<tr><td>1</td><td>QB</td><td>Josh Allen</td><td>7</td><td>410.2</td><td>12</td></tr>
</tbody>
</table>
</body></html>`;

function okFetch(body: string): typeof fetch {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

describe("4for4 cheat sheet", () => {
  it("exposes the registry identity, base, and attribution", () => {
    expect(FOURFORFOUR_SOURCE_ID).toBe("fourforfour-cheatsheet");
    expect(FOURFORFOUR_BASE).toBe("https://www.4for4.com/fantasy-football-cheat-sheet");
    expect(FOURFORFOUR_ATTRIBUTION).toBe("Rankings via 4for4.");
    expect(assertIngestible("fourforfour-cheatsheet").baseUrl).toBe(FOURFORFOUR_BASE);
  });

  it("parses the verified fixture tables to exact values", async () => {
    const client = new FourforFourClient(okFetch(CHEATSHEET_FIXTURE));
    const { sections } = await client.getCheatsheet();
    expect(sections).toHaveLength(2);

    const overall = sections[0];
    expect(overall?.title).toBe("Overall");
    const gibbs = overall?.entries[0];
    expect(gibbs?.rank).toBe(1);
    expect(gibbs?.pos).toBe("RB");
    expect(gibbs?.player).toBe("Jahmyr Gibbs");
    expect(gibbs?.bye).toBe(8);
    expect(gibbs?.ffPts).toBe(250.9);
    expect(gibbs?.adp).toBe(1);

    const chase = overall?.entries[1];
    expect(chase?.player).toBe("Ja'Marr Chase");

    const qb = sections[1];
    expect(qb?.title).toBe("QB");
    expect(qb?.entries).toHaveLength(1);
    expect(qb?.entries[0]?.player).toBe("Josh Allen");
  });

  it("builds the URL from variant and season", async () => {
    let seen = "";
    const spy = (async (url: unknown) => {
      seen = String(url);
      return new Response(CHEATSHEET_FIXTURE, { status: 200 });
    }) as unknown as typeof fetch;
    const client = new FourforFourClient(spy);
    await client.getCheatsheet("espn", 2025);
    expect(seen).toBe("https://www.4for4.com/fantasy-football-cheat-sheet/espn/2025");
  });

  it("returns empty sections on a page with no parseable tables, no throw", async () => {
    const client = new FourforFourClient(okFetch("<html><body>no tables here</body></html>"));
    await expect(client.getCheatsheet()).resolves.toEqual({ sections: [] });
  });

  it("throws FourforFourError with status on HTTP 500", async () => {
    const fetch500 = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new FourforFourClient(fetch500);
    try {
      await client.getCheatsheet();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FourforFourError);
      expect((err as FourforFourError).status).toBe(500);
    }
  });

  it("assertIngestible rejects unknown sources", () => {
    expect(() => assertIngestible("no-such-source")).toThrow();
  });
});
