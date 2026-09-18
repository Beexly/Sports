import { describe, expect, it, vi } from "vitest";

import {
  isPffGradesIngestEnabled,
  PffGradesClient,
  PffGradesError,
  PFF_ATTRIBUTION,
  PFF_BASE,
  PFF_SOURCE_ID,
} from "../pff-grades-client.js";

const ENABLED_ENV = { PFF_GRADES_INGEST: "1" } as NodeJS.ProcessEnv;

const MAHOMES_HTML = `<html><head></head><body><script id="__NEXT_DATA__" type="application/json">` +
  JSON.stringify({
    props: {
      pageProps: {
        player: { name: "Patrick Mahomes", team: "KC" },
        grades: [
          {
            season: "2024",
            facet: "offense",
            gradeValue: 87.2,
            gradeAverage: 87.2,
            gradeRank: 8,
            gradeRankTotal: 132,
            updatedAt: "2025-01-05T00:05:02.322Z",
          },
          {
            season: "2023",
            facet: "offense",
            gradeValue: 91.5,
            gradeAverage: 90.1,
            gradeRank: 2,
            gradeRankTotal: 130,
            updatedAt: "2024-02-12T00:00:00.000Z",
          },
        ],
        war: 3.41,
      },
    },
  }) +
  `</script></body></html>`;

/** Grades buried at a different nesting depth than the common pageProps path. */
const NESTED_HTML = `<html><body><script id="__NEXT_DATA__" type="application/json">` +
  JSON.stringify({
    props: {
      pageProps: {
        data: {
          playerStats: {
            seasonal: {
              grades: [
                {
                  season: 2024,
                  facet: "coverage",
                  gradeValue: 78.9,
                  gradeAverage: null,
                  gradeRank: 24,
                  gradeRankTotal: 200,
                  updatedAt: null,
                },
              ],
            },
          },
        },
      },
    },
  }) +
  `</script></body></html>`;

const NO_DATA_HTML = `<html><body><h1>Player page</h1><p>No embedded data here.</p></body></html>`;

function htmlFetch(html: string, status = 200): { fetch: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = vi.fn(async (url: unknown) => {
    urls.push(String(url));
    return new Response(html, { status, headers: { "content-type": "text/html" } });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, urls };
}

describe("isPffGradesIngestEnabled", () => {
  it("is off by default", () => {
    expect(isPffGradesIngestEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("is on with PFF_GRADES_INGEST=1", () => {
    expect(isPffGradesIngestEnabled(ENABLED_ENV)).toBe(true);
  });
});

describe("PffGradesClient", () => {
  it("returns null and never fetches when the flag is off", async () => {
    const { fetch, urls } = htmlFetch(MAHOMES_HTML);
    const client = new PffGradesClient({} as NodeJS.ProcessEnv, fetch);
    const result = await client.getPlayerGrades("patrick-mahomes", "12345");
    expect(result).toBeNull();
    expect(urls).toHaveLength(0);
  });

  it("parses the embedded grades exactly and cites the page", async () => {
    const { fetch, urls } = htmlFetch(MAHOMES_HTML);
    const client = new PffGradesClient(ENABLED_ENV, fetch);
    const result = await client.getPlayerGrades("patrick-mahomes", "12345");

    expect(result).not.toBeNull();
    expect(result?.playerSlug).toBe("patrick-mahomes");
    expect(result?.playerId).toBe("12345");
    expect(result?.playerName).toBe("Patrick Mahomes");
    expect(result?.team).toBe("KC");
    expect(result?.war).toBe(3.41);
    expect(result?.grades).toHaveLength(2);

    const first = result?.grades[0];
    expect(first).toMatchObject({
      season: "2024",
      facet: "offense",
      gradeValue: 87.2,
      gradeAverage: 87.2,
      gradeRank: 8,
      gradeRankTotal: 132,
      updatedAt: "2025-01-05T00:05:02.322Z",
    });

    const expectedUrl = `${PFF_BASE}/nfl/players/patrick-mahomes/12345`;
    expect(urls).toEqual([expectedUrl]);
    expect(result?.sourceUrl).toBe(expectedUrl);
    expect(Number.isNaN(Date.parse(result?.fetchedAt ?? ""))).toBe(false);
  });

  it("finds grades at a different nesting depth", async () => {
    const { fetch } = htmlFetch(NESTED_HTML);
    const client = new PffGradesClient(ENABLED_ENV, fetch);
    const result = await client.getPlayerGrades("some-player", "999");

    expect(result?.grades).toHaveLength(1);
    const first = result?.grades[0];
    expect(first).toMatchObject({
      season: "2024",
      facet: "coverage",
      gradeValue: 78.9,
      gradeAverage: null,
      gradeRank: 24,
      gradeRankTotal: 200,
      updatedAt: null,
    });
  });

  it("returns empty grades without throwing when __NEXT_DATA__ is absent", async () => {
    const { fetch } = htmlFetch(NO_DATA_HTML);
    const client = new PffGradesClient(ENABLED_ENV, fetch);
    const result = await client.getPlayerGrades("some-player", "999");

    expect(result).not.toBeNull();
    expect(result?.grades).toEqual([]);
    expect(result?.playerName).toBeNull();
    expect(result?.sourceUrl).toBe(`${PFF_BASE}/nfl/players/some-player/999`);
  });

  it("throws PffGradesError with status on HTTP 404", async () => {
    const { fetch } = htmlFetch("not found", 404);
    const client = new PffGradesClient(ENABLED_ENV, fetch);
    const promise = client.getPlayerGrades("no-such-player", "0");
    await expect(promise).rejects.toBeInstanceOf(PffGradesError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("URL-encodes slugs with weird characters", async () => {
    const { fetch, urls } = htmlFetch(MAHOMES_HTML);
    const client = new PffGradesClient(ENABLED_ENV, fetch);
    const slug = "josh allen/special?x=1";
    await client.getPlayerGrades(slug, "12 34");

    const url = urls[0] ?? "";
    expect(url).toContain(encodeURIComponent(slug));
    expect(url).toContain(encodeURIComponent("12 34"));
    expect(url).not.toContain("josh allen");
  });

  it("exports the expected constants", () => {
    expect(PFF_SOURCE_ID).toBe("pff");
    expect(PFF_BASE).toBe("https://www.pff.com");
    expect(PFF_ATTRIBUTION).toBe("Grades via Pro Football Focus public player pages.");
  });
});
