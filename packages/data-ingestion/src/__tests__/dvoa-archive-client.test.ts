import { describe, expect, it } from "vitest";
import {
  DvoaArchiveClient,
  DvoaArchiveError,
  FO_WAYBACK_DVOA_1983_SOURCE_ID,
  parseDvoaCsv,
} from "../dvoa-archive-client.js";

/** Real verified row from the local timeseries extract. */
const REAL_WAS_ROW =
  "2025,1,2025-09-09,WAS,,1,81.5%,,18.1%,3,1-0,36.4%,2,-45.6%,3,-0.5%,19,https://ftnfantasy.com/nfl/week-1-dvoa-commanders-start-on-top";

const CSV_FIXTURE = [
  "season,week,articleDate,team,variant,rank,totalDvoa,prevRank,dave,daveRank,wl,offDvoa,offRank,defDvoa,defRank,stDvoa,stRank,sourceUrl",
  REAL_WAS_ROW,
  // Quoted field containing a comma must not split the row.
  '2025,2,2025-09-16,"Team,Name",,2,50.0%,,10.0%,5,2-0,20.0%,4,-30.0%,8,0.0%,10,https://example.com/x',
].join("\n");

const HTML_1983 = `
<html><body>
<table>
  <tr><th>RK</th><th>TEAM</th><th>TOTAL DVOA</th><th>NON-ADJ DVOA</th><th>W-L</th>
      <th>OFF DVOA</th><th>OFF RK</th><th>DEF DVOA</th><th>DEF RK</th><th>ST DVOA</th><th>ST RK</th></tr>
  <tr><td>1</td><td>WAS</td><td>37.2%</td><td>38.8%</td><td>14-2</td>
      <td>24.7%</td><td>1</td><td>-9.5%</td><td>5</td><td>3.0%</td><td>6</td></tr>
  <tr><td>2</td><td>SFO</td><td>30.1%</td><td>29.9%</td><td>10-6</td>
      <td>18.2%</td><td>2</td><td>-8.4%</td><td>6</td><td>3.5%</td><td>4</td></tr>
</table>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

function errFetch(status: number) {
  return (async (_url: unknown) => new Response("gone", { status })) as unknown as typeof fetch;
}

describe("parseDvoaCsv", () => {
  it("parses the real WAS row exactly", () => {
    const rows = parseDvoaCsv(CSV_FIXTURE);
    expect(rows).toHaveLength(2);
    const was = rows[0];
    expect(was?.season).toBe(2025);
    expect(was?.week).toBe(1);
    expect(was?.articleDate).toBe("2025-09-09");
    expect(was?.team).toBe("WAS");
    expect(was?.variant).toBeNull();
    expect(was?.rank).toBe(1);
    expect(was?.totalDvoa).toBe("81.5%");
    expect(was?.totalDvoaPct).toBe(81.5);
    expect(was?.prevRank).toBeNull();
    expect(was?.dave).toBe("18.1%");
    expect(was?.daveRank).toBe(3);
    expect(was?.wl).toBe("1-0");
    expect(was?.offDvoa).toBe("36.4%");
    expect(was?.offRank).toBe(2);
    expect(was?.defDvoa).toBe("-45.6%");
    expect(was?.defDvoaPct).toBe(-45.6);
    expect(was?.defRank).toBe(3);
    expect(was?.stDvoa).toBe("-0.5%");
    expect(was?.stRank).toBe(19);
    expect(was?.sourceUrl).toBe("https://ftnfantasy.com/nfl/week-1-dvoa-commanders-start-on-top");
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseDvoaCsv(CSV_FIXTURE);
    const quoted = rows[1];
    expect(quoted?.team).toBe("Team,Name");
    expect(quoted?.rank).toBe(2);
    expect(quoted?.totalDvoaPct).toBe(50);
    expect(quoted?.sourceUrl).toBe("https://example.com/x");
  });

  it("skips blank lines and the header line", () => {
    expect(parseDvoaCsv("\n" + CSV_FIXTURE + "\n\n")).toHaveLength(2);
    expect(parseDvoaCsv("")).toEqual([]);
  });
});

describe("DvoaArchiveClient.getFo1983Final", () => {
  it("parses the verified WAS 37.2%/38.8% row exactly", async () => {
    const client = new DvoaArchiveClient(okFetch(HTML_1983));
    const rows = await client.getFo1983Final();
    expect(rows).toHaveLength(2);
    const was = rows?.[0];
    expect(was?.rank).toBe(1);
    expect(was?.team).toBe("WAS");
    expect(was?.totalDvoa).toBe("37.2%");
    expect(was?.nonAdjDvoa).toBe("38.8%");
    expect(was?.wl).toBe("14-2");
    expect(was?.offDvoa).toBe("24.7%");
    expect(was?.offRank).toBe(1);
    expect(was?.defDvoa).toBe("-9.5%");
    expect(was?.defRank).toBe(5);
    expect(was?.stDvoa).toBe("3.0%");
    expect(was?.stRank).toBe(6);
  });

  it("returns null when the page has no DVOA table", async () => {
    const client = new DvoaArchiveClient(okFetch("<html><body><p>archived?</p></body></html>"));
    expect(await client.getFo1983Final()).toBeNull();
  });

  it("throws DvoaArchiveError on HTTP error", async () => {
    const client = new DvoaArchiveClient(errFetch(404));
    await expect(client.getFo1983Final()).rejects.toThrow(DvoaArchiveError);
    await expect(client.getFo1983Final()).rejects.toThrow(/HTTP 404/);
  });

  it("carries the registered source id", () => {
    expect(FO_WAYBACK_DVOA_1983_SOURCE_ID).toBe("fo-wayback-dvoa-1983");
  });
});
