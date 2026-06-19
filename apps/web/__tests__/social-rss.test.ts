import { describe, it, expect } from "vitest";

// Social text imports
import {
  PLATFORM_LIMITS,
  countChars,
  fitsPlatform,
  truncateForPlatform,
  buildPickShareText,
  generateHashtags,
  appendHashtags,
  buildOddsChangeAlert,
  buildGamePreviewText,
  estimateReadingTime,
  wordCount,
  stripEmoji,
  platformUrl,
} from "@/lib/utils/social-text";

// RSS builder imports
import {
  escapeXml,
  formatRssDate,
  buildRssItem,
  buildRssFeed,
  validateRssItem,
  buildPickFeed,
  type RssItem,
  type RssFeed,
} from "@/lib/utils/rss-builder";

// ---------------------------------------------------------------------------
// PLATFORM_LIMITS
// ---------------------------------------------------------------------------

describe("PLATFORM_LIMITS", () => {
  it("twitter has maxChars 280", () => {
    expect(PLATFORM_LIMITS.twitter.maxChars).toBe(280);
  });

  it("bluesky has maxChars 300", () => {
    expect(PLATFORM_LIMITS.bluesky.maxChars).toBe(300);
  });

  it("threads has maxChars 500", () => {
    expect(PLATFORM_LIMITS.threads.maxChars).toBe(500);
  });

  it("telegram has maxChars 4096", () => {
    expect(PLATFORM_LIMITS.telegram.maxChars).toBe(4096);
  });

  it("twitter urlLength is 23", () => {
    expect(PLATFORM_LIMITS.twitter.urlLength).toBe(23);
  });

  it("threads urlLength is 0 (raw length)", () => {
    expect(PLATFORM_LIMITS.threads.urlLength).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// countChars
// ---------------------------------------------------------------------------

describe("countChars", () => {
  it("plain text on twitter equals text.length", () => {
    const text = "Hello World";
    expect(countChars(text, "twitter")).toBe(text.length);
  });

  it("plain text on threads equals text.length", () => {
    const text = "Hello World";
    expect(countChars(text, "threads")).toBe(text.length);
  });

  it("URL on twitter is counted as 23 chars", () => {
    const url = "https://galaxysportsedge.com/picks/chiefs-vs-raiders";
    // url.length > 23, so effective length should be 23
    expect(countChars(url, "twitter")).toBe(23);
  });

  it("URL on threads is counted at full length", () => {
    const url = "https://example.com/abc";
    expect(countChars(url, "threads")).toBe(url.length);
  });

  it("text + URL on bluesky: URL counted as 23", () => {
    const text = "Check this out: https://example.com/very-long-path";
    const withoutUrl = "Check this out: ";
    expect(countChars(text, "bluesky")).toBe(withoutUrl.length + 23);
  });

  it("multiple URLs on twitter each counted as 23", () => {
    const text = "https://a.com https://b.com";
    expect(countChars(text, "twitter")).toBe(23 + 1 + 23); // space between
  });

  it("empty string returns 0 for all platforms", () => {
    expect(countChars("", "twitter")).toBe(0);
    expect(countChars("", "telegram")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fitsPlatform
// ---------------------------------------------------------------------------

describe("fitsPlatform", () => {
  it("short text fits twitter", () => {
    expect(fitsPlatform("Hello!", "twitter")).toBe(true);
  });

  it("500-char text does not fit twitter (limit 280)", () => {
    const text = "a".repeat(500);
    expect(fitsPlatform(text, "twitter")).toBe(false);
  });

  it("280-char text fits twitter exactly", () => {
    const text = "a".repeat(280);
    expect(fitsPlatform(text, "twitter")).toBe(true);
  });

  it("281-char text does not fit twitter", () => {
    const text = "a".repeat(281);
    expect(fitsPlatform(text, "twitter")).toBe(false);
  });

  it("500-char text fits threads (limit 500)", () => {
    const text = "a".repeat(500);
    expect(fitsPlatform(text, "threads")).toBe(true);
  });

  it("4096-char text fits telegram", () => {
    const text = "a".repeat(4096);
    expect(fitsPlatform(text, "telegram")).toBe(true);
  });

  it("4097-char text does not fit telegram", () => {
    const text = "a".repeat(4097);
    expect(fitsPlatform(text, "telegram")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// truncateForPlatform
// ---------------------------------------------------------------------------

describe("truncateForPlatform", () => {
  it("returns original text if it fits", () => {
    const text = "Short text";
    expect(truncateForPlatform(text, "twitter")).toBe(text);
  });

  it("truncated text fits within platform limit", () => {
    const text = "a".repeat(400);
    const result = truncateForPlatform(text, "twitter");
    expect(countChars(result, "twitter")).toBeLessThanOrEqual(280);
  });

  it("suffix is appended when text is truncated", () => {
    const text = "a".repeat(400);
    const result = truncateForPlatform(text, "twitter");
    expect(result.endsWith("…")).toBe(true);
  });

  it("custom suffix is appended", () => {
    const text = "a".repeat(400);
    const result = truncateForPlatform(text, "twitter", "...");
    expect(result.endsWith("...")).toBe(true);
  });

  it("truncated result still fits platform after truncation", () => {
    const text = "x".repeat(600);
    const result = truncateForPlatform(text, "threads");
    expect(countChars(result, "threads")).toBeLessThanOrEqual(500);
  });

  it("text that just fits is not truncated (no suffix added)", () => {
    const text = "b".repeat(280);
    const result = truncateForPlatform(text, "twitter");
    expect(result).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// buildPickShareText
// ---------------------------------------------------------------------------

describe("buildPickShareText", () => {
  it("returns a ShareText with the pick info in text", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      platform: "twitter",
    });
    expect(result.text).toContain("Chiefs -3.5");
    expect(result.text).toContain("NFL");
    expect(result.text).toContain("-110");
  });

  it("fits=true for short picks on twitter", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      platform: "twitter",
    });
    expect(result.fits).toBe(true);
  });

  it("platform is set correctly on result", () => {
    const result = buildPickShareText({
      pick: "Lakers ML",
      sport: "NBA",
      odds: "+150",
      platform: "bluesky",
    });
    expect(result.platform).toBe("bluesky");
  });

  it("confidence >= 80 adds 'High confidence' text", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      confidence: 85,
      platform: "twitter",
    });
    expect(result.text).toContain("High confidence");
  });

  it("confidence < 80 does not add 'High confidence'", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      confidence: 70,
      platform: "twitter",
    });
    expect(result.text).not.toContain("High confidence");
  });

  it("url is appended when provided", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      platform: "twitter",
      url: "https://example.com/picks/1",
    });
    expect(result.text).toContain("https://example.com/picks/1");
  });

  it("charCount is set on result", () => {
    const result = buildPickShareText({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      platform: "twitter",
    });
    expect(typeof result.charCount).toBe("number");
    expect(result.charCount).toBeGreaterThan(0);
  });

  it("truncated=false for short picks", () => {
    const result = buildPickShareText({
      pick: "ML",
      sport: "NFL",
      odds: "-110",
      platform: "twitter",
    });
    expect(result.truncated).toBe(false);
  });

  it("text starts with 🎯", () => {
    const result = buildPickShareText({
      pick: "Over 48.5",
      sport: "NFL",
      odds: "-115",
      platform: "threads",
    });
    expect(result.text.startsWith("🎯")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateHashtags
// ---------------------------------------------------------------------------

describe("generateHashtags", () => {
  it('generateHashtags("NFL") returns array containing "#NFL"', () => {
    expect(generateHashtags("NFL")).toContain("#NFL");
  });

  it('generateHashtags("NBA") returns array containing "#NBA"', () => {
    expect(generateHashtags("NBA")).toContain("#NBA");
  });

  it('generateHashtags("MLB") returns array containing "#MLB"', () => {
    expect(generateHashtags("MLB")).toContain("#MLB");
  });

  it('generateHashtags("NHL") returns array containing "#NHL"', () => {
    expect(generateHashtags("NHL")).toContain("#NHL");
  });

  it('generateHashtags("NCAAB") returns array containing "#NCAAB"', () => {
    expect(generateHashtags("NCAAB")).toContain("#NCAAB");
  });

  it('generateHashtags("EPL") returns array containing "#EPL"', () => {
    expect(generateHashtags("EPL")).toContain("#EPL");
  });

  it('generateHashtags("CFB") returns array containing "#CFB"', () => {
    expect(generateHashtags("CFB")).toContain("#CFB");
  });

  it("maxTags limits the output count", () => {
    const tags = generateHashtags("NBA", { maxTags: 1 });
    expect(tags).toHaveLength(1);
  });

  it("maxTags:2 returns exactly 2 tags", () => {
    const tags = generateHashtags("NFL", { maxTags: 2 });
    expect(tags).toHaveLength(2);
  });

  it("includeGeneral:true adds #GalaxySportsEdge", () => {
    const tags = generateHashtags("NFL", { includeGeneral: true });
    expect(tags).toContain("#GalaxySportsEdge");
  });

  it("includeGeneral:false does not add #GalaxySportsEdge (default)", () => {
    const tags = generateHashtags("NFL");
    expect(tags).not.toContain("#GalaxySportsEdge");
  });

  it("unknown sport falls back gracefully", () => {
    const tags = generateHashtags("WNBA");
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// appendHashtags
// ---------------------------------------------------------------------------

describe("appendHashtags", () => {
  it("adds hashtags separated by newline", () => {
    const result = appendHashtags("Pick text", ["#NFL"], "twitter");
    expect(result).toContain("\n#NFL");
  });

  it("does not exceed platform char limit", () => {
    const text = "a".repeat(250);
    const hashtags = ["#NFL", "#NFLPicks", "#SportsBetting", "#GalaxySportsEdge"];
    const result = appendHashtags(text, hashtags, "twitter");
    expect(countChars(result, "twitter")).toBeLessThanOrEqual(280);
  });

  it("appends multiple hashtags when space allows", () => {
    const result = appendHashtags("Short", ["#NFL", "#NBA"], "telegram");
    expect(result).toContain("#NFL");
    expect(result).toContain("#NBA");
  });

  it("respects custom maxChars override", () => {
    const text = "Hello";
    const result = appendHashtags(text, ["#NFL", "#NBA"], "twitter", 15);
    // With limit 15 there's barely room, so at most 1 or 0 tags should fit
    expect(countChars(result, "twitter")).toBeLessThanOrEqual(15);
  });

  it("returns original text when no hashtags provided", () => {
    const text = "Hello World";
    expect(appendHashtags(text, [], "twitter")).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// buildOddsChangeAlert
// ---------------------------------------------------------------------------

describe("buildOddsChangeAlert", () => {
  it("up direction includes 📈", () => {
    const alert = buildOddsChangeAlert({
      team: "Chiefs",
      line: "-3.5",
      oldOdds: "-110",
      newOdds: "-115",
      direction: "up",
    });
    expect(alert).toContain("📈");
  });

  it("down direction includes 📉", () => {
    const alert = buildOddsChangeAlert({
      team: "Raiders",
      line: "+3.5",
      oldOdds: "-105",
      newOdds: "+100",
      direction: "down",
    });
    expect(alert).toContain("📉");
  });

  it("contains team name", () => {
    const alert = buildOddsChangeAlert({
      team: "Chiefs",
      line: "-3.5",
      oldOdds: "-110",
      newOdds: "-115",
      direction: "up",
    });
    expect(alert).toContain("Chiefs");
  });

  it("contains old and new odds with arrow", () => {
    const alert = buildOddsChangeAlert({
      team: "Chiefs",
      line: "-3.5",
      oldOdds: "-110",
      newOdds: "-115",
      direction: "up",
    });
    expect(alert).toContain("-110→-115");
  });

  it("starts with ⚡ Line move:", () => {
    const alert = buildOddsChangeAlert({
      team: "Chiefs",
      line: "-3.5",
      oldOdds: "-110",
      newOdds: "-115",
      direction: "up",
    });
    expect(alert.startsWith("⚡ Line move:")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildGamePreviewText
// ---------------------------------------------------------------------------

describe("buildGamePreviewText", () => {
  it("contains both team names", () => {
    const text = buildGamePreviewText({
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      sport: "NFL",
      gameTime: "Sunday 1pm ET",
    });
    expect(text).toContain("Chiefs");
    expect(text).toContain("Raiders");
  });

  it("uses @ separator between away and home", () => {
    const text = buildGamePreviewText({
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      sport: "NFL",
      gameTime: "Sunday 1pm ET",
    });
    expect(text).toContain("Raiders @ Chiefs");
  });

  it("includes sport", () => {
    const text = buildGamePreviewText({
      homeTeam: "Lakers",
      awayTeam: "Celtics",
      sport: "NBA",
      gameTime: "Tonight 7:30pm ET",
    });
    expect(text).toContain("NBA");
  });

  it("includes spread when provided", () => {
    const text = buildGamePreviewText({
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      sport: "NFL",
      gameTime: "Sunday 1pm ET",
      spread: "Chiefs -3.5",
    });
    expect(text).toContain("Chiefs -3.5");
  });

  it("no spread when not provided", () => {
    const text = buildGamePreviewText({
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      sport: "NFL",
      gameTime: "Sunday 1pm ET",
    });
    // Should not have trailing | at the end
    expect(text.trim().endsWith("|")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// estimateReadingTime
// ---------------------------------------------------------------------------

describe("estimateReadingTime", () => {
  it("returns small number for very short text", () => {
    const seconds = estimateReadingTime("hello world", 200);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThan(5);
  });

  it("200-word text at 200 WPM takes ~60 seconds", () => {
    const text = Array(200).fill("word").join(" ");
    expect(estimateReadingTime(text, 200)).toBe(60);
  });

  it("empty string returns 0", () => {
    expect(estimateReadingTime("", 200)).toBe(0);
  });

  it("default wordsPerMinute is 200", () => {
    const text = Array(100).fill("word").join(" ");
    // 100 words at 200 WPM = 30 seconds
    expect(estimateReadingTime(text)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// wordCount
// ---------------------------------------------------------------------------

describe("wordCount", () => {
  it('"one two three" → 3', () => {
    expect(wordCount("one two three")).toBe(3);
  });

  it("empty string → 0", () => {
    expect(wordCount("")).toBe(0);
  });

  it("multiple spaces between words → still correct count", () => {
    expect(wordCount("one  two   three")).toBe(3);
  });

  it("single word → 1", () => {
    expect(wordCount("hello")).toBe(1);
  });

  it("leading/trailing whitespace is ignored", () => {
    expect(wordCount("  hello world  ")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// stripEmoji
// ---------------------------------------------------------------------------

describe("stripEmoji", () => {
  it('removes football emoji from "Hello 🏈 World"', () => {
    const result = stripEmoji("Hello 🏈 World");
    expect(result).not.toContain("🏈");
  });

  it("plain text is unchanged", () => {
    expect(stripEmoji("Hello World")).toBe("Hello World");
  });

  it("removes fire emoji", () => {
    const result = stripEmoji("🔥 Hot pick!");
    expect(result).not.toContain("🔥");
  });

  it("removes target emoji", () => {
    const result = stripEmoji("🎯 Chiefs -3.5");
    expect(result).not.toContain("🎯");
  });

  it("removes lightning emoji", () => {
    const result = stripEmoji("⚡ Line move");
    expect(result).not.toContain("⚡");
  });
});

// ---------------------------------------------------------------------------
// platformUrl
// ---------------------------------------------------------------------------

describe("platformUrl", () => {
  it('twitter → contains "twitter.com"', () => {
    expect(platformUrl("twitter", "galaxysportsedge")).toContain("twitter.com");
  });

  it('bluesky → contains "bsky.app"', () => {
    expect(platformUrl("bluesky", "galaxysportsedge")).toContain("bsky.app");
  });

  it('threads → contains "threads.net"', () => {
    expect(platformUrl("threads", "galaxysportsedge")).toContain("threads.net");
  });

  it('telegram → contains "t.me"', () => {
    expect(platformUrl("telegram", "galaxysportsedge")).toContain("t.me");
  });

  it("includes handle in URL", () => {
    const url = platformUrl("twitter", "galaxysportsedge");
    expect(url).toContain("galaxysportsedge");
  });

  it("threads URL includes @ prefix for handle", () => {
    const url = platformUrl("threads", "galaxysportsedge");
    expect(url).toContain("@galaxysportsedge");
  });
});

// ---------------------------------------------------------------------------
// RSS: escapeXml
// ---------------------------------------------------------------------------

describe("escapeXml", () => {
  it('"a & b < c" → "a &amp; b &lt; c"', () => {
    expect(escapeXml("a & b < c")).toBe("a &amp; b &lt; c");
  });

  it("escapes ampersand", () => {
    expect(escapeXml("Cats & Dogs")).toBe("Cats &amp; Dogs");
  });

  it("escapes less-than", () => {
    expect(escapeXml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than", () => {
    expect(escapeXml("a > b")).toBe("a &gt; b");
  });

  it('escapes double quotes', () => {
    expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("passes plain text unchanged", () => {
    expect(escapeXml("Hello World 123")).toBe("Hello World 123");
  });
});

// ---------------------------------------------------------------------------
// RSS: formatRssDate
// ---------------------------------------------------------------------------

describe("formatRssDate", () => {
  it("formats epoch (new Date(0)) and contains +0000", () => {
    const result = formatRssDate(new Date(0));
    expect(result).toContain("+0000");
  });

  it("formats a known date correctly", () => {
    // Mon Jan 01 2024 00:00:00 UTC
    const result = formatRssDate(new Date("2024-01-01T00:00:00Z"));
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });

  it("accepts a string input", () => {
    const result = formatRssDate("2024-06-19T12:00:00Z");
    expect(result).toContain("+0000");
  });

  it("accepts a number input", () => {
    const result = formatRssDate(0);
    expect(result).toContain("+0000");
  });

  it("day abbreviation is present", () => {
    const result = formatRssDate(new Date("2024-01-01T00:00:00Z"));
    // Jan 1 2024 was a Monday
    expect(result.startsWith("Mon")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RSS: buildRssItem
// ---------------------------------------------------------------------------

describe("buildRssItem", () => {
  const item: RssItem = {
    title: "Chiefs -3.5 vs Raiders",
    link: "https://example.com/picks/1",
    description: "Back the Chiefs at home.",
    pubDate: new Date("2024-01-01T12:00:00Z"),
    guid: "pick-001",
    author: "Galaxy GSN",
    category: "NFL",
  };

  it("produces valid XML containing <item>", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("<item>");
    expect(xml).toContain("</item>");
  });

  it("title is wrapped in CDATA", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("<![CDATA[Chiefs -3.5 vs Raiders]]>");
  });

  it("description is wrapped in CDATA", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("<![CDATA[Back the Chiefs at home.]]>");
  });

  it("link is present", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("https://example.com/picks/1");
  });

  it("author is present", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("<author>Galaxy GSN</author>");
  });

  it("category is present", () => {
    const xml = buildRssItem(item);
    expect(xml).toContain("<category>NFL</category>");
  });

  it("guid falls back to link when not provided", () => {
    const noGuid: RssItem = {
      title: "No Guid",
      link: "https://example.com/no-guid",
      description: "Test",
    };
    const xml = buildRssItem(noGuid);
    expect(xml).toContain("https://example.com/no-guid");
  });

  it("enclosure element when provided", () => {
    const withEnclosure: RssItem = {
      ...item,
      enclosure: {
        url: "https://example.com/audio.mp3",
        type: "audio/mpeg",
        length: 12345,
      },
    };
    const xml = buildRssItem(withEnclosure);
    expect(xml).toContain("audio.mp3");
    expect(xml).toContain("audio/mpeg");
  });
});

// ---------------------------------------------------------------------------
// RSS: buildRssFeed
// ---------------------------------------------------------------------------

describe("buildRssFeed", () => {
  const feed: RssFeed = {
    title: "Galaxy Sports Edge — Picks Feed",
    link: "https://example.com",
    description: "Sports picks and analysis",
    language: "en-us",
    ttl: 60,
    items: [
      {
        title: "Chiefs -3.5",
        link: "https://example.com/picks/1",
        description: "Back the Chiefs.",
        pubDate: new Date("2024-01-01T12:00:00Z"),
      },
    ],
  };

  it('starts with "<?xml"', () => {
    const xml = buildRssFeed(feed);
    expect(xml.startsWith("<?xml")).toBe(true);
  });

  it('contains <rss version="2.0">', () => {
    const xml = buildRssFeed(feed);
    expect(xml).toContain('<rss version="2.0">');
  });

  it("contains <channel> tag", () => {
    const xml = buildRssFeed(feed);
    expect(xml).toContain("<channel>");
  });

  it("contains </rss> closing tag", () => {
    const xml = buildRssFeed(feed);
    expect(xml).toContain("</rss>");
  });

  it("contains all items", () => {
    const multiFeed: RssFeed = {
      ...feed,
      items: [
        { title: "Pick A", link: "https://ex.com/a", description: "A" },
        { title: "Pick B", link: "https://ex.com/b", description: "B" },
      ],
    };
    const xml = buildRssFeed(multiFeed);
    expect(xml).toContain("Pick A");
    expect(xml).toContain("Pick B");
  });

  it("empty items produces feed with no <item> elements", () => {
    const emptyFeed: RssFeed = { ...feed, items: [] };
    const xml = buildRssFeed(emptyFeed);
    expect(xml).not.toContain("<item>");
  });

  it("includes language when provided", () => {
    const xml = buildRssFeed(feed);
    expect(xml).toContain("<language>en-us</language>");
  });

  it("includes ttl when provided", () => {
    const xml = buildRssFeed(feed);
    expect(xml).toContain("<ttl>60</ttl>");
  });

  it("includes lastBuildDate when provided", () => {
    const withDate: RssFeed = {
      ...feed,
      lastBuildDate: new Date("2024-06-19T00:00:00Z"),
    };
    const xml = buildRssFeed(withDate);
    expect(xml).toContain("<lastBuildDate>");
  });
});

// ---------------------------------------------------------------------------
// RSS: validateRssItem
// ---------------------------------------------------------------------------

describe("validateRssItem", () => {
  it("returns non-empty errors for empty title", () => {
    const errors = validateRssItem({
      title: "",
      link: "http://x.com",
      description: "y",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns empty errors for valid item", () => {
    const errors = validateRssItem({
      title: "t",
      link: "http://x.com",
      description: "d",
    });
    expect(errors).toHaveLength(0);
  });

  it("returns error for empty description", () => {
    const errors = validateRssItem({
      title: "Title",
      link: "http://x.com",
      description: "",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error when link does not start with http", () => {
    const errors = validateRssItem({
      title: "Title",
      link: "ftp://x.com",
      description: "Desc",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns error for empty link", () => {
    const errors = validateRssItem({
      title: "Title",
      link: "",
      description: "Desc",
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("https link is accepted", () => {
    const errors = validateRssItem({
      title: "Title",
      link: "https://x.com",
      description: "Desc",
    });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RSS: buildPickFeed
// ---------------------------------------------------------------------------

describe("buildPickFeed", () => {
  const picks = [
    {
      id: "pick-1",
      title: "Chiefs -3.5",
      description: "Back the Chiefs at home.",
      sport: "NFL",
      confidence: 80,
      publishedAt: new Date("2024-06-19T12:00:00Z"),
    },
    {
      id: "pick-2",
      title: "Lakers ML",
      description: "Lakers to win outright.",
      sport: "NBA",
      confidence: 72,
      publishedAt: new Date("2024-06-19T13:00:00Z"),
    },
  ];

  it("returns feed with correct title", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks });
    expect(feed.title).toBe("Galaxy Sports Edge — Picks Feed");
  });

  it("items count matches picks count", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks });
    expect(feed.items.length).toBe(picks.length);
  });

  it("items have correct link based on baseUrl and id", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks });
    expect(feed.items[0]?.link).toBe("https://example.com/picks/pick-1");
  });

  it("feed description is set", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks });
    expect(typeof feed.description).toBe("string");
    expect(feed.description.length).toBeGreaterThan(0);
  });

  it("empty picks produces feed with no items", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks: [] });
    expect(feed.items).toHaveLength(0);
  });

  it("items include sport as category", () => {
    const feed = buildPickFeed({ baseUrl: "https://example.com", picks });
    expect(feed.items[0]?.category).toBe("NFL");
  });
});
