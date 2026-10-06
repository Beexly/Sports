import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifySignal,
  fetchLiveWire,
  fetchLiveWireRead,
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

describe("fetchLiveWireRead", () => {
  /**
   * The whole point: "the wire is down" and "the wire is up and quiet" produce
   * the same empty item list, so they have to be told apart by something else.
   * /the-beat renders the second as "No fresh reports", which asserts the wire
   * is working; during a total outage that sentence is false.
   */
  it("distinguishes every feed being down from a quiet wire", async () => {
    process.env["NEWS_RSS_FEEDS"] =
      "https://a.example/rss|A|Beat|NFL; https://b.example/rss|B|Beat|NFL";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const down = await fetchLiveWireRead(new Date("2026-07-02T12:00:00Z"));
    expect(down.items).toEqual([]);
    expect(down.attempted).toBe(2);
    expect(down.ok).toBe(0);
    expect(down.unavailable).toBe(true);
    expect(down.unconfigured).toBe(false);
  });

  it("a feed that answers with nothing classifiable is quiet, NOT unavailable", async () => {
    process.env["NEWS_RSS_FEEDS"] = "https://a.example/rss|A|Beat|NFL";
    // Real document, real 200, nothing that classifies. Empty is the answer.
    const xml = `<rss><channel><item><title>Ten takeaways from Tuesday</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

    const quiet = await fetchLiveWireRead(new Date("2026-07-02T12:00:00Z"));
    expect(quiet.items).toEqual([]);
    expect(quiet.ok).toBe(1);
    expect(quiet.unavailable).toBe(false);
  });

  it("counts a non-ok status as a feed that did not answer", async () => {
    process.env["NEWS_RSS_FEEDS"] = "https://a.example/rss|A|Beat|NFL";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 503 }));

    const read = await fetchLiveWireRead(new Date("2026-07-02T12:00:00Z"));
    expect(read.ok).toBe(0);
    expect(read.unavailable).toBe(true);
  });

  it("a partial outage is available, because something answered", async () => {
    process.env["NEWS_RSS_FEEDS"] =
      "https://down.example/rss|Down|Beat|NFL; https://up.example/rss|Up|Beat|NFL";
    const xml = `<rss><channel><item><title>Star RB ruled out</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item></channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("down.example")
        ? Promise.reject(new Error("feed down"))
        : new Response(xml, { status: 200 }),
    );

    const read = await fetchLiveWireRead(new Date("2026-07-02T12:00:00Z"));
    expect(read.attempted).toBe(2);
    expect(read.ok).toBe(1);
    expect(read.unavailable).toBe(false);
    expect(read.items).toHaveLength(1);
  });

  it("unconfigured is its own state, and is the ONLY one that may show the sample", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const read = await fetchLiveWireRead();
    expect(read.unconfigured).toBe(true);
    expect(read.attempted).toBe(0);
    // Not unavailable: nothing was asked for, so nothing failed. Conflating the
    // two would put the labeled fictional sample on the page during an outage,
    // which is the defect c71542292 fixed one layer up.
    expect(read.unavailable).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
