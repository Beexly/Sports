import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifySignal,
  fetchLiveWire,
  fetchLiveWireWithHealth,
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

  it("the per-feed cap bounds what is KEPT, not what is scanned", async () => {
    // Devin Review, PR #819. The loop used to run over
    // `parseRssItems(xml).slice(0, 40)` — truncating BEFORE classification — so
    // a feed that opened with 40 headlines we do not classify dropped every
    // qualifying report behind them. The wire read empty while real injury news
    // sat in the feed, and the empty-state copy then blamed the publication bar
    // for an omission the bar had not made.
    process.env["NEWS_RSS_FEEDS"] = "https://feed.example/rss|Wire Test|Verified|NFL";
    const now = new Date("2026-07-02T12:00:00Z");
    const filler = Array.from(
      { length: 45 },
      (_, i) =>
        `<item><title>Ten takeaways from Tuesday number ${i}</title>` +
        `<pubDate>Wed, 02 Jul 2026 11:30:00 GMT</pubDate></item>`,
    ).join("");
    const xml = `<rss><channel>${filler}
      <item><title>Star RB ruled out for Sunday</title><pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item>
    </channel></rss>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

    const wire = await fetchLiveWire(now);
    // The one qualifying report sits at position 46, past the old cap of 40.
    expect(wire).toHaveLength(1);
    expect(wire![0]!.signal).toBe("injury-out");
  });

  it("still caps the kept items per feed", async () => {
    // The bound must survive the move. Fifty qualifying reports, cap is 40.
    process.env["NEWS_RSS_FEEDS"] = "https://feed.example/rss|Wire Test|Verified|NFL";
    const items = Array.from(
      { length: 50 },
      (_, i) =>
        `<item><title>Star RB number ${i} ruled out for Sunday</title>` +
        `<pubDate>Wed, 02 Jul 2026 11:00:00 GMT</pubDate></item>`,
    ).join("");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(`<rss><channel>${items}</channel></rss>`, { status: 200 }),
    );
    const wire = await fetchLiveWire(new Date("2026-07-02T12:00:00Z"));
    expect(wire).toHaveLength(40);
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

describe("fetchLiveWireWithHealth — a dead wire is not a quiet wire", () => {
  /**
   * The per-feed task RETURNS an empty array for almost every failure (SSRF
   * refusal, non-ok response, refused redirect) and Promise.allSettled absorbs
   * the ones that throw. So "every configured feed returned HTTP 500" resolves
   * as a perfectly fulfilled `[]`, identical in shape to a genuinely quiet
   * live wire. Only the reached count separates them, and the page renders a
   * different sentence for each: "no fresh reports" vs "feed unavailable".
   *
   * Caught by Devin Review on PR #819 against an earlier version of this fix
   * that only trapped a throw, which meant a total outage still rendered as
   * "the wire is live and nothing has landed". (Devin Review, PR #819.)
   */
  const ORIGINAL = process.env["NEWS_RSS_FEEDS"];
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["NEWS_RSS_FEEDS"];
    else process.env["NEWS_RSS_FEEDS"] = ORIGINAL;
    vi.restoreAllMocks();
  });

  it("reports reached 0 when every configured feed answers with an error", async () => {
    process.env["NEWS_RSS_FEEDS"] =
      "https://a.example.com/rss|A|Insider|NFL;https://b.example.com/rss|B|Beat|NFL";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, headers: new Headers() }),
    );

    const health = await fetchLiveWireWithHealth(new Date("2026-09-14T00:00:00Z"));
    expect(health.items).toEqual([]);
    expect(health.configured).toBe(2);
    // The whole point: an empty wire with reached 0 is an OUTAGE, and the page
    // must be able to tell that from a live wire that simply has no news.
    expect(health.reached).toBe(0);
  });

  it("follows a RELATIVE redirect instead of counting a healthy feed as offline", async () => {
    // `Location: /feed.xml` is resolved against the feed URL. Before this, the
    // location went straight to validateEndpointUrl, whose `new URL(location)`
    // throws on a relative string, so the feed was refused and reached stayed
    // 0 — rendering a reachable feed as "feed unavailable".
    process.env["NEWS_RSS_FEEDS"] = "https://a.example.com/rss|A|Insider|NFL";
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        calls.push(String(url));
        if (calls.length === 1) {
          return {
            ok: false,
            status: 301,
            headers: new Headers({ location: "/moved.xml" }),
          };
        }
        return { ok: true, status: 200, headers: new Headers(), text: async () => "<rss></rss>" };
      }),
    );

    const health = await fetchLiveWireWithHealth(new Date("2026-09-14T00:00:00Z"));
    // The redirect was resolved to an absolute same-origin URL and followed.
    expect(calls[1]).toBe("https://a.example.com/moved.xml");
    // And the feed counts as reached, so the page does not claim an outage.
    expect(health.reached).toBe(1);
  });

  it("refuses a PROTOCOL-RELATIVE redirect that leaves the origin", async () => {
    // `//other.example/x` looks relative but resolves to a DIFFERENT origin, so
    // "relative implies same-origin" was never true. The resolved URL is what
    // gets validated, and an origin hop is not followed blind.
    process.env["NEWS_RSS_FEEDS"] = "https://a.example.com/rss|A|Insider|NFL";
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        calls.push(String(url));
        return {
          ok: false,
          status: 302,
          headers: new Headers({ location: "//169.254.169.254/latest/meta-data" }),
        };
      }),
    );

    const health = await fetchLiveWireWithHealth(new Date("2026-09-14T00:00:00Z"));
    // Exactly one call: the feed itself. The metadata host is never fetched.
    expect(calls).toHaveLength(1);
    expect(health.reached).toBe(0);
  });

  it("reports no feeds configured as null, distinct from an outage", async () => {
    delete process.env["NEWS_RSS_FEEDS"];
    const health = await fetchLiveWireWithHealth();
    expect(health.items).toBeNull();
    expect(health.configured).toBe(0);
    // configured 0 must never be read as an outage — there is nothing to reach.
    expect(health.reached).toBe(0);
  });
});
