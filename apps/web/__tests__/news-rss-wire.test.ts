import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifySignal,
  fetchLiveWire,
  parseFeedConfig,
  parseRssItems,
} from "@/lib/news/rss";

/**
 * The live RSS wire is the first real crawler lane. Honesty rules under test:
 * dark-by-default (no env -> null -> the labeled sample renders), headlines
 * that do not classify are DROPPED (never guessed), items without a parseable
 * upstream date are dropped (no fake freshness), stale items age out.
 */

const SAVED = process.env["NEWS_RSS_FEEDS"];
beforeEach(() => {
  delete process.env["NEWS_RSS_FEEDS"];
});
afterEach(() => {
  if (SAVED === undefined) delete process.env["NEWS_RSS_FEEDS"];
  else process.env["NEWS_RSS_FEEDS"] = SAVED;
  vi.restoreAllMocks();
});

describe("parseFeedConfig", () => {
  it("parses url|source|tier|team entries and defaults sensibly", () => {
    const feeds = parseFeedConfig(
      "https://a.example/rss|ESPN NFL|Aggregator|NFL; https://b.example/rss|Team Feed",
    );
    expect(feeds).toHaveLength(2);
    expect(feeds[0]).toMatchObject({ source: "ESPN NFL", tier: "Aggregator", team: "NFL" });
    expect(feeds[1]).toMatchObject({ tier: "Aggregator", team: "League" });
  });

  it("skips malformed, non-https, and invalid-tier entries safely", () => {
    const feeds = parseFeedConfig(
      "http://insecure.example/rss|X; |missing-url; https://ok.example/rss|OK|GodTier|NFL",
    );
    expect(feeds).toHaveLength(1);
    expect(feeds[0]!.tier).toBe("Aggregator"); // invalid tier floors to Aggregator
  });

  it("returns [] for unset/empty", () => {
    expect(parseFeedConfig(undefined)).toEqual([]);
    expect(parseFeedConfig("  ")).toEqual([]);
  });
});

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
  it("is dark by default: no env -> null, no network call", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await fetchLiveWire()).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches, classifies, drops the unclassifiable + undated, sorts by freshness", async () => {
    process.env["NEWS_RSS_FEEDS"] = "https://feed.example/rss|Wire Test|Verified|NFL";
    const now = new Date("2026-07-02T12:00:00Z");
    const xml = `<rss><channel>
      <item><title>Star RB ruled out for Sunday</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item>
      <item><title>Ten takeaways from Tuesday</title><pubDate>Wed, 02 Jul 2026 11:30:00 GMT</pubDate></item>
      <item><title>Ace traded to contender</title><pubDate>Wed, 02 Jul 2026 09:00:00 GMT</pubDate></item>
      <item><title>Closer suspended 10 games</title></item>
    </channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

    const wire = await fetchLiveWire(now);
    expect(wire).not.toBeNull();
    expect(wire!.map((i) => i.signal)).toEqual(["injury-out", "trade"]); // takeaways + dateless dropped
    expect(wire![0]!.minutesAgo).toBe(60);
    expect(wire![0]!.source).toBe("Wire Test");
    expect(wire![0]!.tier).toBe("Verified");
  });

  it("fails soft: a feed outage returns what succeeded, never throws", async () => {
    process.env["NEWS_RSS_FEEDS"] =
      "https://down.example/rss|Down|Beat|NFL; https://up.example/rss|Up|Beat|NFL";
    const xml = `<rss><channel><item><title>Star RB ruled out</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("down.example")
        ? Promise.reject(new Error("feed down"))
        : new Response(xml, { status: 200 }),
    );
    const wire = await fetchLiveWire(new Date("2026-07-02T12:00:00Z"));
    expect(wire).toHaveLength(1);
    expect(wire![0]!.source).toBe("Up");
  });
});
