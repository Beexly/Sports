import { describe, expect, it } from "vitest";
import {
  TeamRankingsClient,
  TEAMRANKINGS_RATINGS_SOURCE_ID,
  TEAMRANKINGS_TRENDS_SOURCE_ID,
} from "../teamrankings-client.js";

const RATINGS_HTML = `
<html><body>
<table>
  <tr><th>Rank</th><th>Team</th><th>Rating</th><th>Proj W</th><th>Proj L</th><th>Make Playoffs %</th><th>Win SB %</th></tr>
  <tr><td>1</td><td>Buffalo</td><td>5.8</td><td>11.7</td><td>5.3</td><td>88.1%</td><td>11.6%</td></tr>
  <tr><td>2</td><td>Kansas City</td><td>5.1</td><td>11.0</td><td>6.0</td><td>84.2%</td><td>9.8%</td></tr>
</table>
</body></html>
`;

const TRENDS_HTML = `
<html><body>
<table>
  <tr><th>Team</th><th>Last 5</th><th>Since Bye</th></tr>
  <tr><td>Buffalo</td><td>4-1</td><td>7-2</td></tr>
  <tr><td>Denver</td><td>2-3</td><td>3-6</td></tr>
</table>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

describe("TeamRankings ratings", () => {
  it("parses the verified Buffalo row exactly", async () => {
    const client = new TeamRankingsClient(okFetch(RATINGS_HTML));
    const rows = await client.getRatings();
    expect(rows).toHaveLength(2);
    const buffalo = rows[0];
    expect(buffalo?.rank).toBe(1);
    expect(buffalo?.team).toBe("Buffalo");
    expect(buffalo?.rating).toBe(5.8);
    expect(buffalo?.projW).toBe(11.7);
    expect(buffalo?.projL).toBe(5.3);
    expect(buffalo?.playoffsPct).toBe(88.1);
    expect(buffalo?.winSbPct).toBe(11.6);
    const kc = rows[1];
    expect(kc?.rank).toBe(2);
    expect(kc?.team).toBe("Kansas City");
    expect(kc?.rating).toBe(5.1);
  });

  it("returns [] when the page has no ratings table", async () => {
    const client = new TeamRankingsClient(okFetch("<html><body><p>no table</p></body></html>"));
    expect(await client.getRatings()).toEqual([]);
  });

  it("carries the registered source ids", () => {
    expect(TEAMRANKINGS_RATINGS_SOURCE_ID).toBe("teamrankings-ratings");
    expect(TEAMRANKINGS_TRENDS_SOURCE_ID).toBe("teamrankings-trends");
  });
});

describe("TeamRankings trends", () => {
  it("returns generic team + values rows", async () => {
    const client = new TeamRankingsClient(okFetch(TRENDS_HTML));
    const rows = await client.getTrends();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.team).toBe("Buffalo");
    expect(rows[0]?.values).toEqual(["4-1", "7-2"]);
    expect(rows[1]?.team).toBe("Denver");
    expect(rows[1]?.values).toEqual(["2-3", "3-6"]);
  });

  it("returns [] when the page has no table", async () => {
    const client = new TeamRankingsClient(okFetch("<html><body>empty</body></html>"));
    expect(await client.getTrends()).toEqual([]);
  });
});
