import { describe, expect, it, vi } from "vitest";
import {
  VsinClient,
  VsinError,
  isVsinIngestEnabled,
  VSIN_SOURCE_ID,
} from "../vsin-client.js";
import { isIngestible } from "../source-registry.js";

/** Verified fixture shape: verified live 2026-09-18 splits-record and system lines. */
const VSIN_FIXTURE = `
<html><head>
<title>NFL Betting Splits Week 3 | VSiN</title>
<meta property="article:published_time" content="2026-09-18T09:00:00Z" />
</head><body>
<h1>NFL Betting Splits: Week 3 Report</h1>
<p>Welcome to this week's betting splits report.</p>
<p>Systems check: majority handle on spreads 141-138 ATS.</p>
<p>The bet-count record reads majority bets 133-145.</p>
<p>Our flagship system: &gt;68% handle on road side ATS: 70-50 ATS.</p>
<table>
  <tr><th>System</th><th>Record</th></tr>
  <tr><td>Majority handle</td><td>141-138</td></tr>
  <tr><td>Majority bets</td><td>133-145</td></tr>
</table>
</body></html>
`;

function okFetch(body: string) {
  return (async (_url: unknown) =>
    new Response(body, { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
}

describe("VSiN client", () => {
  it("returns null and never fetches when the flag is off", async () => {
    expect(isVsinIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new VsinClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.getSplitsArticle("https://vsin.com/nfl/article")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("extracts the headline, publish date, table, and verified splits lines", async () => {
    const client = new VsinClient({ VSIN_INGEST: "1" }, okFetch(VSIN_FIXTURE));
    const article = await client.getSplitsArticle("https://vsin.com/nfl/splits");
    expect(article?.headline).toBe("NFL Betting Splits: Week 3 Report");
    expect(article?.publishedAt).toBe("2026-09-18T09:00:00Z");
    const tables = article?.tables ?? [];
    expect(tables).toHaveLength(1);
    expect(tables[0]?.headers).toEqual(["System", "Record"]);
    expect(tables[0]?.rows).toEqual([
      ["Majority handle", "141-138"],
      ["Majority bets", "133-145"],
    ]);
    const lines = article?.splitsLines ?? [];
    expect(lines.some((l) => l.includes("majority handle on spreads 141-138 ATS"))).toBe(true);
    expect(lines.some((l) => l.includes("majority bets 133-145"))).toBe(true);
    expect(lines.some((l) => l.includes(">68% handle on road side ATS: 70-50 ATS"))).toBe(true);
    // The welcome paragraph has no "%" and must not be included.
    expect(lines.some((l) => l.includes("Welcome"))).toBe(false);
  });

  it("falls back to <title> and empty shapes when elements are missing", async () => {
    const client = new VsinClient(
      { VSIN_INGEST: "1" },
      okFetch("<html><head><title>Just a title</title></head><body><p>No percent here.</p></body></html>"),
    );
    const article = await client.getSplitsArticle("https://vsin.com/nfl/x");
    expect(article?.headline).toBe("Just a title");
    expect(article?.publishedAt).toBeNull();
    expect(article?.tables).toEqual([]);
    expect(article?.splitsLines).toEqual([]);
  });

  it("throws VsinError with the status on HTTP errors", async () => {
    const fetchImpl = (async () => new Response("error", { status: 404 })) as unknown as typeof fetch;
    const client = new VsinClient({ VSIN_INGEST: "1" }, fetchImpl);
    await expect(client.getSplitsArticle("https://vsin.com/nfl/x")).rejects.toThrow(VsinError);
    try {
      await client.getSplitsArticle("https://vsin.com/nfl/x");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(VsinError);
      expect((err as VsinError).status).toBe(404);
    }
  });

  it("is registered ingestible in the source registry", () => {
    expect(VSIN_SOURCE_ID).toBe("vsin-betting-splits");
    expect(isIngestible("vsin-betting-splits")).toBe(true);
  });
});
