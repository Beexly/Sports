import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifySignal,
  fetchLiveWire,
  parseRssItems,
  type RssFeedConfig,
} from "@/lib/news/rss";

afterEach(() => {
  vi.restoreAllMocks();
});

const FEED: RssFeedConfig = {
  url: "https://feed.example/rss",
  source: "Wire Test",
  tier: "Verified",
  team: "NFL",
};

describe("parseRssItems", () => {
  it("extracts titles + dates from RSS 2.0 items, decoding entities and CDATA", () => {
    const xml = `<rss><channel>
      <item><title><![CDATA[Star RB ruled out for Sunday]]></title><pubDate>Wed, 02 Jul 2026 10:00:00 GMT</pubDate></item>
      <item><title>Ace traded to contender &amp; more</title><pubDate>Wed, 02 Jul 2026 09:00:00 GMT</pubDate></item>
    </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Star RB ruled out for Sunday");
    expect(items[1]!.title).toBe("Ace traded to contender & more");
    expect(items[0]!.pubDate).toContain("2026");
  });

  it("handles Atom entries and missing dates", () => {
    const xml = `<feed><entry><title>Closer suspended 10 games</title><updated>2026-07-02T10:00:00Z</updated></entry>
      <entry><title>No date here, gets null</title></entry></feed>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[1]!.pubDate).toBeNull();
  });
});

describe("classifySignal (conservative: no match -> null, never a guess)", () => {
  it("classifies the taxonomy's real patterns", () => {
    expect(classifySignal("Star RB ruled out for Sunday")).toBe("injury-out");
    expect(classifySignal("Veteran WR activated off IR")).toBe("injury-return");
    expect(classifySignal("Ace traded to contender")).toBe("trade");
    expect(classifySignal("Closer suspended 10 games")).toBe("suspension");
    expect(classifySignal("Rookie named the starter for week 1")).toBe("role-up");
    expect(classifySignal("QB benched after slow start")).toBe("role-down");
    expect(classifySignal("Wind and rain expected, game delayed")).toBe("weather");
  });

  it("drops unclassifiable headlines", () => {
    expect(classifySignal("Ten takeaways from a wild Tuesday")).toBeNull();
    expect(classifySignal("Power rankings, version 214")).toBeNull();
  });
});

describe("fetchLiveWire", () => {
  it("returns an unconfigured result without making a network call", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await expect(fetchLiveWire([])).resolves.toEqual({
      status: "UNCONFIGURED",
      items: [],
      configuredFeedCount: 0,
      successfulFeedCount: 0,
      failedFeedCount: 0,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches, classifies, drops the unclassifiable + undated, sorts by freshness", async () => {
    const now = new Date("2026-07-02T12:00:00Z");
    const xml = `<rss><channel>
      <item><title>Star RB ruled out for Sunday</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item>
      <item><title>Ten takeaways from Tuesday</title><pubDate>Wed, 02 Jul 2026 11:30:00 GMT</pubDate></item>
      <item><title>Ace traded to contender</title><pubDate>Wed, 02 Jul 2026 09:00:00 GMT</pubDate></item>
      <item><title>Closer suspended 10 games</title></item>
    </channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

    const result = await fetchLiveWire([FEED], now);
    expect(result.status).toBe("AVAILABLE");
    expect(result.items.map((item) => item.signal)).toEqual(["injury-out", "trade"]);
    expect(result.items[0]!.minutesAgo).toBe(60);
    expect(result.items[0]!.source).toBe("Wire Test");
    expect(result.items[0]!.tier).toBe("Verified");
  });

  it("returns successful items and reports a partial source outage", async () => {
    const downFeed = { ...FEED, url: "https://down.example/rss", source: "Down" };
    const upFeed = { ...FEED, url: "https://up.example/rss", source: "Up" };
    const xml = `<rss><channel><item><title>Star RB ruled out</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("down.example")
        ? Promise.reject(new Error("feed down"))
        : new Response(xml, { status: 200 }),
    );
    const result = await fetchLiveWire(
      [downFeed, upFeed],
      new Date("2026-07-02T12:00:00Z"),
    );
    expect(result.status).toBe("AVAILABLE");
    expect(result.successfulFeedCount).toBe(1);
    expect(result.failedFeedCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.source).toBe("Up");
  });

  it("returns outage when every configured feed fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unavailable", { status: 503 }),
    );
    const result = await fetchLiveWire([FEED]);
    expect(result).toEqual({
      status: "OUTAGE",
      items: [],
      configuredFeedCount: 1,
      successfulFeedCount: 0,
      failedFeedCount: 1,
    });
  });

  it("distinguishes a successful empty feed from an outage", async () => {
    const xml = `<rss><channel><item><title>Power rankings for July</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));
    const result = await fetchLiveWire([FEED], new Date("2026-07-02T12:00:00Z"));
    expect(result.status).toBe("AVAILABLE");
    expect(result.items).toEqual([]);
    expect(result.successfulFeedCount).toBe(1);
  });

  it("rejects feed timestamps beyond the allowed future clock skew", async () => {
    const xml = `<rss><channel>
      <item><title>Star RB ruled out in the future</title><pubDate>2030-07-02T12:00:00Z</pubDate></item>
      <item><title>Ace traded to contender</title><pubDate>2026-07-02T12:02:00Z</pubDate></item>
    </channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));
    const result = await fetchLiveWire([FEED], new Date("2026-07-02T12:00:00Z"));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.headline).toBe("Ace traded to contender");
    expect(result.items[0]!.minutesAgo).toBe(0);
  });
});
