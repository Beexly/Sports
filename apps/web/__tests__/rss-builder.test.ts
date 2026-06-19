import { describe, it, expect } from "vitest";
import {
  escapeXml,
  buildRss2Feed,
  buildAtomFeed,
  type FeedOptions,
  type FeedItem,
} from "@/lib/distribution/rss-builder";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_OPTIONS: FeedOptions = {
  title: "Test Feed",
  link: "https://example.com",
  feedUrl: "https://example.com/feed.rss",
  description: "A test feed for unit testing.",
  language: "en-us",
  copyright: "© 2026 Example",
  ttl: 60,
};

const SAMPLE_ITEM: FeedItem = {
  title: "Test Pick: Chiefs -3.5",
  link: "https://example.com/picks/chiefs-vs-raiders",
  description: "Backing the Chiefs to cover at home.",
  pubDate: new Date("2026-06-19T12:00:00Z"),
  guid: "pick-001",
  author: "Galaxy GSN",
  category: "NFL",
};

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------

describe("escapeXml", () => {
  it("escapes ampersands", () => {
    expect(escapeXml("Cats & Dogs")).toBe("Cats &amp; Dogs");
  });

  it("escapes less-than", () => {
    expect(escapeXml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than", () => {
    expect(escapeXml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeXml("it's fine")).toBe("it&#39;s fine");
  });

  it("passes through plain text with no special characters", () => {
    expect(escapeXml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles multiple special characters in one string", () => {
    expect(escapeXml("<a href='#'>link & more</a>")).toBe(
      "&lt;a href=&#39;#&#39;&gt;link &amp; more&lt;/a&gt;"
    );
  });
});

// ---------------------------------------------------------------------------
// buildRss2Feed
// ---------------------------------------------------------------------------

describe("buildRss2Feed", () => {
  it("output starts with <?xml declaration", () => {
    const xml = buildRss2Feed(BASE_OPTIONS, []);
    expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")).toBe(
      true
    );
  });

  it('contains <rss version="2.0"', () => {
    const xml = buildRss2Feed(BASE_OPTIONS, []);
    expect(xml).toContain('<rss version="2.0"');
  });

  it("empty items produces valid XML with no <item> element", () => {
    const xml = buildRss2Feed(BASE_OPTIONS, []);
    expect(xml).not.toContain("<item>");
    // Still contains the channel structure
    expect(xml).toContain("<channel>");
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });

  it("with one item, output contains <item>", () => {
    const xml = buildRss2Feed(BASE_OPTIONS, [SAMPLE_ITEM]);
    expect(xml).toContain("<item>");
    expect(xml).toContain("</item>");
  });

  it("title is XML-escaped in channel", () => {
    const options: FeedOptions = {
      ...BASE_OPTIONS,
      title: "Feed & <Sports>",
    };
    const xml = buildRss2Feed(options, []);
    expect(xml).toContain("<title>Feed &amp; &lt;Sports&gt;</title>");
  });

  it("item title is XML-escaped", () => {
    const item: FeedItem = {
      ...SAMPLE_ITEM,
      title: 'Chiefs "cover" & win',
    };
    const xml = buildRss2Feed(BASE_OPTIONS, [item]);
    expect(xml).toContain(
      "<title>Chiefs &quot;cover&quot; &amp; win</title>"
    );
  });

  it("includes atom:link self-reference for feedUrl", () => {
    const xml = buildRss2Feed(BASE_OPTIONS, []);
    expect(xml).toContain(
      `<atom:link href="${BASE_OPTIONS.feedUrl}" rel="self" type="application/rss+xml"/>`
    );
  });

  it("item uses link as guid when guid not provided", () => {
    const item: FeedItem = {
      title: "No Guid Item",
      link: "https://example.com/no-guid",
      description: "No guid specified.",
      pubDate: new Date("2026-06-19T00:00:00Z"),
    };
    const xml = buildRss2Feed(BASE_OPTIONS, [item]);
    expect(xml).toContain(
      `<guid isPermaLink="false">https://example.com/no-guid</guid>`
    );
  });

  it("includes enclosure element when provided", () => {
    const item: FeedItem = {
      ...SAMPLE_ITEM,
      enclosure: {
        url: "https://example.com/audio.mp3",
        length: 12345,
        type: "audio/mpeg",
      },
    };
    const xml = buildRss2Feed(BASE_OPTIONS, [item]);
    expect(xml).toContain(
      `<enclosure url="https://example.com/audio.mp3" length="12345" type="audio/mpeg"/>`
    );
  });

  it("includes optional channel copyright", () => {
    const xml = buildRss2Feed(BASE_OPTIONS, []);
    expect(xml).toContain("<copyright>© 2026 Example</copyright>");
  });

  it("uses default ttl of 60 when not specified", () => {
    const options: FeedOptions = {
      ...BASE_OPTIONS,
      ttl: undefined,
    };
    // ttl defaults to 60
    const xml = buildRss2Feed(options, []);
    expect(xml).toContain("<ttl>60</ttl>");
  });
});

// ---------------------------------------------------------------------------
// buildAtomFeed
// ---------------------------------------------------------------------------

describe("buildAtomFeed", () => {
  it("output contains <feed xmlns", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, []);
    expect(xml).toContain("<feed xmlns");
  });

  it("output starts with <?xml declaration", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, []);
    expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")).toBe(
      true
    );
  });

  it("empty items produces no <entry> element", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, []);
    expect(xml).not.toContain("<entry>");
  });

  it("with one item, output contains <entry>", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, [SAMPLE_ITEM]);
    expect(xml).toContain("<entry>");
    expect(xml).toContain("</entry>");
  });

  it("includes feed title", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, []);
    expect(xml).toContain(`<title>${BASE_OPTIONS.title}</title>`);
  });

  it("includes self-link for feedUrl", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, []);
    expect(xml).toContain(
      `<link href="${BASE_OPTIONS.feedUrl}" rel="self"/>`
    );
  });

  it("entry author is wrapped in <author><name> tags", () => {
    const xml = buildAtomFeed(BASE_OPTIONS, [SAMPLE_ITEM]);
    expect(xml).toContain("<author>");
    expect(xml).toContain(`<name>${SAMPLE_ITEM.author}</name>`);
  });

  it("entry title is XML-escaped", () => {
    const item: FeedItem = {
      ...SAMPLE_ITEM,
      title: "Edge & <Advantage>",
    };
    const xml = buildAtomFeed(BASE_OPTIONS, [item]);
    expect(xml).toContain(
      "<title>Edge &amp; &lt;Advantage&gt;</title>"
    );
  });
});

// ---------------------------------------------------------------------------
// Route-level smoke test: confirm buildRss2Feed returns non-empty valid-ish XML
// (Tests the same function used by the route handlers without needing Next.js.)
// ---------------------------------------------------------------------------

describe("feed route output (via buildRss2Feed)", () => {
  it("picks route feed returns valid-ish RSS with correct channel metadata", () => {
    const options: FeedOptions = {
      title: "Galaxy Sports Edge — Recent Picks",
      link: "https://galaxysportsedge.com",
      feedUrl: "https://galaxysportsedge.com/feeds/picks",
      description:
        "Sports intelligence picks. Public analysis only — not financial advice.",
      language: "en-us",
      copyright: `© ${new Date().getFullYear()} Galaxy Sports Edge`,
      ttl: 60,
    };

    const xml = buildRss2Feed(options, []);

    expect(xml).toContain("Galaxy Sports Edge");
    expect(xml).toContain("galaxysportsedge.com/feeds/picks");
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("</rss>");
  });

  it("blog route feed returns valid-ish RSS with correct channel metadata", () => {
    const options: FeedOptions = {
      title: "Galaxy Sports Edge — Intelligence Blog",
      link: "https://galaxysportsedge.com",
      feedUrl: "https://galaxysportsedge.com/feeds/blog",
      description: "Sports analysis and intelligence insights.",
      language: "en-us",
      copyright: `© ${new Date().getFullYear()} Galaxy Sports Edge`,
      ttl: 60,
    };

    const xml = buildRss2Feed(options, []);

    expect(xml).toContain("Intelligence Blog");
    expect(xml).toContain("galaxysportsedge.com/feeds/blog");
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("</rss>");
  });
});
