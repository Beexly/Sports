import { describe, expect, it } from "vitest";
import {
  FTN_STATSIQ_ATTRIBUTION,
  FTN_STATSIQ_BASE,
  FTN_STATSIQ_CATALOG_ID,
  FTN_STATSIQ_HOME_ID,
  FtnStatsIqClient,
  FtnStatsIqError,
  isFtnStatsIqIngestEnabled,
} from "../ftn-statsiq-client.js";
import { assertIngestible } from "../source-registry.js";

const ENV = { FTN_STATSIQ_INGEST: "1" };

/**
 * Fixtures built from real samples observed on the live Stats iQ API
 * 2026-09-18 (catalog: 9 categories, 751 columns; home: 2026 regular-season
 * cards). Only the fields the assertions need are included; the client's
 * defensive parsing fills the rest with defaults.
 */
const catalogFixture = {
  entitlementsPlan: "free",
  catalogRevision: 10,
  generatedAt: "2026-09-18T00:00:00Z",
  tables: [
    {
      slug: "passing",
      category: "Passing",
      columns: [
        {
          key: "nfl.passing.dropbacks",
          metricKey: "nfl.passing.dropbacks",
          metricSlug: "dropbacks",
          label: "DPBK",
          description:
            "Total quarterback dropback plays, including pass attempts, sacks, scrambles, and other dropback outcomes.",
          order: 3,
          featured: true,
          defaultSort: true,
          availability: "season",
          sortable: true,
          format: "number",
          decimals: 0,
          accessTier: "free",
        },
      ],
    },
  ],
};

const homeFixture = {
  season: 2026,
  seasonType: "regular",
  cards: [
    {
      slug: "passing-overview",
      category: "Passing",
      tableSlug: "passing",
      defaultSort: "nfl.passing.yards",
      columnKeys: ["nfl.passing.yards", "nfl.passing.touchdowns"],
      rows: [
        {
          entityId: 10063,
          entityName: "Josh Allen",
          entityType: "player",
          team: "Buffalo Bills",
          teamId: "BUF",
          value: 582,
          rank: 1,
          metrics: {
            "nfl.passing.yards": 582,
            "nfl.passing.touchdowns": 5,
          },
        },
      ],
    },
  ],
};

const fakeFetch = (fixture: unknown) =>
  (async (_url: unknown) =>
    new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

describe("FtnStatsIq ingest flag", () => {
  it("is off by default and returns null without fetching", async () => {
    expect(isFtnStatsIqIngestEnabled({})).toBe(false);
    const fetchImpl = fakeFetch(catalogFixture);
    const client = new FtnStatsIqClient({}, fetchImpl);
    expect(await client.getCatalog()).toBeNull();
    expect(await client.getHome()).toBeNull();
  });

  it("does not call fetch at all when the flag is off", async () => {
    let calls = 0;
    const counting = (async (_url: unknown) => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const client = new FtnStatsIqClient({}, counting);
    await client.getCatalog();
    await client.getHome();
    expect(calls).toBe(0);
  });
});

describe("FtnStatsIqClient getCatalog", () => {
  it("parses the verified catalog fixture into typed structures", async () => {
    const client = new FtnStatsIqClient(ENV, fakeFetch(catalogFixture));
    const catalog = await client.getCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog?.tables).toHaveLength(1);
    expect(catalog?.entitlementsPlan).toBe("free");
    expect(catalog?.catalogRevision).toBe(10);

    const table = catalog?.tables[0];
    expect(table?.slug).toBe("passing");
    expect(table?.columns).toHaveLength(1);

    const col = table?.columns[0];
    expect(col?.key).toBe("nfl.passing.dropbacks");
    expect(col?.label).toBe("DPBK");
    expect(col?.description).toBe(
      "Total quarterback dropback plays, including pass attempts, sacks, scrambles, and other dropback outcomes.",
    );
  });

  it("GETs the catalog path with the polite User-Agent", async () => {
    const seen: { url: unknown; init: unknown }[] = [];
    const spy = (async (url: unknown, init: unknown) => {
      seen.push({ url, init });
      return new Response(JSON.stringify(catalogFixture), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, spy);
    await client.getCatalog();
    expect(seen).toHaveLength(1);
    expect(String(seen[0]?.url)).toBe(`${FTN_STATSIQ_BASE}/catalog`);
    const headers = (seen[0]?.init as { headers?: Record<string, string> }).headers;
    expect(headers?.["User-Agent"]).toBe("GSE-DataIngestion/1.0");
  });

  it("degrades to an empty catalog on a malformed body instead of throwing", async () => {
    const badFetch = (async (_url: unknown) =>
      new Response("not json {{{", { status: 200 })) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, badFetch);
    const catalog = await client.getCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog?.tables).toEqual([]);
  });

  it("throws FtnStatsIqError with status 500 on a server error", async () => {
    const failing = (async (_url: unknown) =>
      new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, failing);
    await expect(client.getCatalog()).rejects.toThrow(FtnStatsIqError);
    await expect(client.getCatalog()).rejects.toMatchObject({ status: 500 });
  });
});

describe("FtnStatsIqClient getHome", () => {
  it("parses the verified home fixture into typed structures", async () => {
    const client = new FtnStatsIqClient(ENV, fakeFetch(homeFixture));
    const home = await client.getHome();
    expect(home).not.toBeNull();
    expect(home?.season).toBe(2026);
    expect(home?.seasonType).toBe("regular");
    expect(home?.cards).toHaveLength(1);

    const card = home?.cards[0];
    expect(card?.slug).toBe("passing-overview");
    expect(card?.columnKeys).toEqual(["nfl.passing.yards", "nfl.passing.touchdowns"]);
    expect(card?.rows).toHaveLength(1);

    const row = card?.rows[0];
    expect(row?.entityId).toBe(10063);
    expect(row?.entityName).toBe("Josh Allen");
    expect(row?.entityType).toBe("player");
    expect(row?.team).toBe("Buffalo Bills");
    expect(row?.rank).toBe(1);
    expect(row?.metrics["nfl.passing.yards"]).toBe(582);
    expect(row?.metrics["nfl.passing.touchdowns"]).toBe(5);
  });

  it("GETs the home path", async () => {
    const seen: unknown[] = [];
    const spy = (async (url: unknown) => {
      seen.push(url);
      return new Response(JSON.stringify(homeFixture), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, spy);
    await client.getHome();
    expect(seen).toHaveLength(1);
    expect(String(seen[0])).toBe(`${FTN_STATSIQ_BASE}/home`);
  });

  it("degrades to an empty snapshot on a malformed body instead of throwing", async () => {
    const badFetch = (async (_url: unknown) =>
      new Response("not json {{{", { status: 200 })) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, badFetch);
    const home = await client.getHome();
    expect(home).not.toBeNull();
    expect(home?.cards).toEqual([]);
  });

  it("throws FtnStatsIqError with status 500 on a server error", async () => {
    const failing = (async (_url: unknown) =>
      new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const client = new FtnStatsIqClient(ENV, failing);
    await expect(client.getHome()).rejects.toThrow(FtnStatsIqError);
    await expect(client.getHome()).rejects.toMatchObject({ status: 500 });
  });
});

describe("FTN Stats iQ registry guard", () => {
  it("exposes the registry IDs and attribution the client gates on", () => {
    expect(FTN_STATSIQ_CATALOG_ID).toBe("ftn-statsiq-catalog");
    expect(FTN_STATSIQ_HOME_ID).toBe("ftn-statsiq-home");
    expect(FTN_STATSIQ_ATTRIBUTION).toBe("Charting taxonomy via FTN Fantasy Stats iQ.");
    expect(assertIngestible(FTN_STATSIQ_CATALOG_ID).verdict).toBe("use-with-caution");
    expect(assertIngestible(FTN_STATSIQ_HOME_ID).verdict).toBe("use-with-caution");
  });

  it("assertIngestible throws for an unknown source id", () => {
    expect(() => assertIngestible("no-such-source")).toThrow(/Unknown data source/);
  });
});
