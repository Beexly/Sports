import { describe, it, expect } from "vitest";
import {
  truncate,
  excerpt,
  firstSentence,
  firstSentences,
  stripHtml,
  escapeHtml,
  highlightKeywords,
  titleCase,
  sentenceCase,
  countWords,
  countSentences,
  readingTimeMinutes,
  buildPickSummary,
  buildHeadline,
  listToProseEn,
  ordinal,
  pluralize,
  initCap,
  camelToKebab,
  kebabToCamel,
  camelToSnake,
  snakeToCamel,
  padStart,
  padEnd,
  countOccurrences,
  replaceAll,
  normalizeWhitespace,
  splitIntoChunks,
  buildMetaDescription,
} from "@/lib/utils/content-utils";

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------
describe("truncate", () => {
  it("returns original when text fits within maxLength", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("truncates to maxLength including ellipsis", () => {
    // "hello…" = 6 chars (5 + 1 for …), maxLength=8 means we can fit 7 chars + ellipsis
    const result = truncate("hello world", 8);
    expect(result.length).toBeLessThanOrEqual(8);
    expect(result.endsWith("…")).toBe(true);
  });

  it("breaks at word boundary", () => {
    expect(truncate("hello world foo", 11)).toBe("hello…");
  });

  it("uses custom ellipsis", () => {
    const result = truncate("hello world", 8, "...");
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("handles exact length — no truncation needed", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates single long word", () => {
    const result = truncate("superlongwordhere", 8);
    expect(result.length).toBeLessThanOrEqual(8);
    expect(result.endsWith("…")).toBe(true);
  });

  it("empty string stays empty", () => {
    expect(truncate("", 10)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// excerpt
// ---------------------------------------------------------------------------
describe("excerpt", () => {
  it("returns first maxWords words with ellipsis", () => {
    expect(excerpt("one two three four", 2)).toBe("one two…");
  });

  it("returns full text when word count is within limit", () => {
    expect(excerpt("one two", 5)).toBe("one two");
  });

  it("handles single word", () => {
    expect(excerpt("hello", 1)).toBe("hello");
  });

  it("empty string returns empty", () => {
    expect(excerpt("", 5)).toBe("");
  });

  it("custom ellipsis", () => {
    expect(excerpt("a b c d", 2, "...")).toBe("a b...");
  });
});

// ---------------------------------------------------------------------------
// firstSentence
// ---------------------------------------------------------------------------
describe("firstSentence", () => {
  it("extracts sentence ending with period", () => {
    expect(firstSentence("Hello world. Second sentence.")).toBe("Hello world.");
  });

  it("extracts sentence ending with exclamation", () => {
    expect(firstSentence("Great play! Keep going.")).toBe("Great play!");
  });

  it("extracts sentence ending with question mark", () => {
    expect(firstSentence("Who won? Nobody knows.")).toBe("Who won?");
  });

  it("returns whole text if no sentence terminator", () => {
    expect(firstSentence("No terminator here")).toBe("No terminator here");
  });

  it("trims whitespace", () => {
    expect(firstSentence("  Hello.  Rest.")).toBe("Hello.");
  });
});

// ---------------------------------------------------------------------------
// firstSentences
// ---------------------------------------------------------------------------
describe("firstSentences", () => {
  it("extracts exactly n sentences", () => {
    expect(firstSentences("A. B. C.", 2)).toBe("A. B.");
  });

  it("returns all sentences if fewer than n exist", () => {
    expect(firstSentences("Hello! World.", 5)).toBe("Hello! World.");
  });

  it("returns first sentence when n=1", () => {
    expect(firstSentences("One. Two. Three.", 1)).toBe("One.");
  });

  it("handles empty string", () => {
    expect(firstSentences("", 3)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------
describe("stripHtml", () => {
  it("removes simple tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes &amp;", () => {
    expect(stripHtml("a &amp; b")).toBe("a & b");
  });

  it("decodes &lt; and &gt;", () => {
    expect(stripHtml("&lt;div&gt;")).toBe("<div>");
  });

  it("decodes &quot;", () => {
    expect(stripHtml("say &quot;hello&quot;")).toBe('say "hello"');
  });

  it("decodes &nbsp;", () => {
    expect(stripHtml("a&nbsp;b")).toBe("a b");
  });

  it("decodes &#39;", () => {
    expect(stripHtml("it&#39;s")).toBe("it's");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("plain text")).toBe("plain text");
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe("escapeHtml", () => {
  it("escapes < and >", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes &", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("returns safe text unchanged", () => {
    expect(escapeHtml("safe text")).toBe("safe text");
  });
});

// ---------------------------------------------------------------------------
// highlightKeywords
// ---------------------------------------------------------------------------
describe("highlightKeywords", () => {
  it("wraps matched keyword in <mark>", () => {
    expect(highlightKeywords("The Chiefs won", ["Chiefs"])).toContain(
      "<mark>Chiefs</mark>"
    );
  });

  it("is case-insensitive", () => {
    expect(highlightKeywords("the chiefs won", ["Chiefs"])).toContain(
      "<mark>chiefs</mark>"
    );
  });

  it("matches whole words only", () => {
    const result = highlightKeywords("Chiefsman won", ["Chiefs"]);
    expect(result).not.toContain("<mark>");
  });

  it("wraps multiple keywords", () => {
    const result = highlightKeywords("Chiefs vs Raiders", ["Chiefs", "Raiders"]);
    expect(result).toContain("<mark>Chiefs</mark>");
    expect(result).toContain("<mark>Raiders</mark>");
  });

  it("uses custom tag", () => {
    expect(highlightKeywords("Chiefs win", ["Chiefs"], "strong")).toContain(
      "<strong>Chiefs</strong>"
    );
  });

  it("returns unchanged text when keywords array is empty", () => {
    expect(highlightKeywords("The Chiefs won", [])).toBe("The Chiefs won");
  });
});

// ---------------------------------------------------------------------------
// titleCase
// ---------------------------------------------------------------------------
describe("titleCase", () => {
  it("capitalizes each word", () => {
    expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
  });

  it("lowercases exception words mid-sentence", () => {
    expect(titleCase("chiefs at raiders")).toBe("Chiefs at Raiders");
  });

  it("always capitalizes first word even if it's an exception", () => {
    expect(titleCase("the kansas city chiefs")).toBe("The Kansas City Chiefs");
  });

  it("handles single word", () => {
    expect(titleCase("hello")).toBe("Hello");
  });

  it("handles already title-cased text", () => {
    expect(titleCase("Hello World")).toBe("Hello World");
  });
});

// ---------------------------------------------------------------------------
// sentenceCase
// ---------------------------------------------------------------------------
describe("sentenceCase", () => {
  it("capitalizes first character only", () => {
    expect(sentenceCase("hello world")).toBe("Hello world");
  });

  it("leaves rest of string unchanged", () => {
    expect(sentenceCase("hELLO WORLD")).toBe("HELLO WORLD");
  });

  it("empty string returns empty", () => {
    expect(sentenceCase("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------
describe("countWords", () => {
  it("counts words separated by single spaces", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("handles multiple spaces between words", () => {
    expect(countWords("  a   b  ")).toBe(2);
  });

  it("returns 1 for single word", () => {
    expect(countWords("hello")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// countSentences
// ---------------------------------------------------------------------------
describe("countSentences", () => {
  it("counts sentences with mixed terminators", () => {
    expect(countSentences("Hello world. How are you? Fine!")).toBe(3);
  });

  it("returns 0 for text with no terminators", () => {
    expect(countSentences("no terminator")).toBe(0);
  });

  it("counts single sentence", () => {
    expect(countSentences("Hello.")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// readingTimeMinutes
// ---------------------------------------------------------------------------
describe("readingTimeMinutes", () => {
  it("returns at least 1 minute for short text", () => {
    expect(readingTimeMinutes("hello world")).toBeGreaterThanOrEqual(1);
  });

  it("returns 1 minute for exactly 200 words at default wpm", () => {
    const text = "a ".repeat(200).trim();
    expect(readingTimeMinutes(text)).toBe(1);
  });

  it("returns proportional time for longer text", () => {
    const text = "word ".repeat(600).trim(); // 600 words / 200 wpm = 3 min
    expect(readingTimeMinutes(text)).toBe(3);
  });

  it("respects custom wpm", () => {
    const text = "word ".repeat(400).trim(); // 400 words / 400 wpm = 1 min
    expect(readingTimeMinutes(text, 400)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildPickSummary
// ---------------------------------------------------------------------------
describe("buildPickSummary", () => {
  it("includes pick and odds", () => {
    const result = buildPickSummary({ pick: "Chiefs -3.5", sport: "NFL", odds: "-110" });
    expect(result).toContain("Chiefs -3.5");
    expect(result).toContain("-110");
  });

  it("includes sport", () => {
    const result = buildPickSummary({ pick: "Chiefs -3.5", sport: "NFL", odds: "-110" });
    expect(result).toContain("NFL");
  });

  it("appends reasoning when provided", () => {
    const result = buildPickSummary({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      reasoning: "Strong home record.",
    });
    expect(result).toContain("Strong home record.");
  });

  it("omits reasoning when not provided", () => {
    const result = buildPickSummary({ pick: "Chiefs -3.5", sport: "NFL", odds: "-110" });
    expect(result).toBe("Chiefs -3.5 (-110) in NFL.");
  });

  it("truncates when maxLength provided", () => {
    const result = buildPickSummary({
      pick: "Chiefs -3.5",
      sport: "NFL",
      odds: "-110",
      reasoning: "Very detailed reasoning that goes on and on.",
      maxLength: 30,
    });
    expect(result.length).toBeLessThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// buildHeadline
// ---------------------------------------------------------------------------
describe("buildHeadline", () => {
  it("contains both team names", () => {
    const h = buildHeadline({ homeTeam: "Chiefs", awayTeam: "Raiders", sport: "NFL" });
    expect(h).toContain("Chiefs");
    expect(h).toContain("Raiders");
  });

  it("contains sport", () => {
    const h = buildHeadline({ homeTeam: "Chiefs", awayTeam: "Raiders", sport: "NFL" });
    expect(h).toContain("NFL");
  });

  it("includes game time when provided", () => {
    const h = buildHeadline({
      homeTeam: "Chiefs",
      awayTeam: "Raiders",
      sport: "NFL",
      gameTime: "8:20 PM ET",
    });
    expect(h).toContain("8:20 PM ET");
  });

  it("omits game time part when not provided", () => {
    const h = buildHeadline({ homeTeam: "Chiefs", awayTeam: "Raiders", sport: "NFL" });
    expect(h).not.toContain("|");
  });

  it("formats as away at home", () => {
    const h = buildHeadline({ homeTeam: "Chiefs", awayTeam: "Raiders", sport: "NFL" });
    expect(h).toBe("Raiders at Chiefs — NFL");
  });
});

// ---------------------------------------------------------------------------
// listToProseEn
// ---------------------------------------------------------------------------
describe("listToProseEn", () => {
  it("joins three items with Oxford comma", () => {
    expect(listToProseEn(["a", "b", "c"])).toBe("a, b, and c");
  });

  it("joins two items with 'and'", () => {
    expect(listToProseEn(["a", "b"])).toBe("a and b");
  });

  it("returns single item as-is", () => {
    expect(listToProseEn(["a"])).toBe("a");
  });

  it("returns empty string for empty array", () => {
    expect(listToProseEn([])).toBe("");
  });

  it("handles four items", () => {
    expect(listToProseEn(["a", "b", "c", "d"])).toBe("a, b, c, and d");
  });
});

// ---------------------------------------------------------------------------
// ordinal
// ---------------------------------------------------------------------------
describe("ordinal", () => {
  it("1 → '1st'", () => expect(ordinal(1)).toBe("1st"));
  it("2 → '2nd'", () => expect(ordinal(2)).toBe("2nd"));
  it("3 → '3rd'", () => expect(ordinal(3)).toBe("3rd"));
  it("4 → '4th'", () => expect(ordinal(4)).toBe("4th"));
  it("11 → '11th' (edge case)", () => expect(ordinal(11)).toBe("11th"));
  it("12 → '12th' (edge case)", () => expect(ordinal(12)).toBe("12th"));
  it("13 → '13th' (edge case)", () => expect(ordinal(13)).toBe("13th"));
  it("21 → '21st'", () => expect(ordinal(21)).toBe("21st"));
  it("22 → '22nd'", () => expect(ordinal(22)).toBe("22nd"));
  it("23 → '23rd'", () => expect(ordinal(23)).toBe("23rd"));
  it("100 → '100th'", () => expect(ordinal(100)).toBe("100th"));
  it("101 → '101st'", () => expect(ordinal(101)).toBe("101st"));
});

// ---------------------------------------------------------------------------
// pluralize
// ---------------------------------------------------------------------------
describe("pluralize", () => {
  it("returns '1 pick' for count=1", () => {
    expect(pluralize(1, "pick")).toBe("1 pick");
  });

  it("returns '3 picks' for count=3", () => {
    expect(pluralize(3, "pick")).toBe("3 picks");
  });

  it("returns '0 picks' for count=0", () => {
    expect(pluralize(0, "pick")).toBe("0 picks");
  });

  it("uses custom plural when provided", () => {
    expect(pluralize(2, "analysis", "analyses")).toBe("2 analyses");
  });

  it("uses singular for count=1 with custom plural", () => {
    expect(pluralize(1, "analysis", "analyses")).toBe("1 analysis");
  });
});

// ---------------------------------------------------------------------------
// initCap
// ---------------------------------------------------------------------------
describe("initCap", () => {
  it("capitalizes first character", () => {
    expect(initCap("hello")).toBe("Hello");
  });

  it("leaves rest unchanged", () => {
    expect(initCap("hELLO WORLD")).toBe("HELLO WORLD");
  });

  it("empty string returns empty", () => {
    expect(initCap("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// camelToKebab
// ---------------------------------------------------------------------------
describe("camelToKebab", () => {
  it("converts camelCase to kebab-case", () => {
    expect(camelToKebab("myPickCard")).toBe("my-pick-card");
  });

  it("handles single word", () => {
    expect(camelToKebab("pick")).toBe("pick");
  });

  it("handles leading uppercase", () => {
    expect(camelToKebab("MyPickCard")).toBe("my-pick-card");
  });
});

// ---------------------------------------------------------------------------
// kebabToCamel
// ---------------------------------------------------------------------------
describe("kebabToCamel", () => {
  it("converts kebab-case to camelCase", () => {
    expect(kebabToCamel("my-pick-card")).toBe("myPickCard");
  });

  it("handles single segment", () => {
    expect(kebabToCamel("pick")).toBe("pick");
  });
});

// ---------------------------------------------------------------------------
// camelToSnake
// ---------------------------------------------------------------------------
describe("camelToSnake", () => {
  it("converts camelCase to snake_case", () => {
    expect(camelToSnake("myPickCard")).toBe("my_pick_card");
  });

  it("handles single word", () => {
    expect(camelToSnake("pick")).toBe("pick");
  });
});

// ---------------------------------------------------------------------------
// snakeToCamel
// ---------------------------------------------------------------------------
describe("snakeToCamel", () => {
  it("converts snake_case to camelCase", () => {
    expect(snakeToCamel("my_pick_card")).toBe("myPickCard");
  });

  it("handles single segment", () => {
    expect(snakeToCamel("pick")).toBe("pick");
  });
});

// ---------------------------------------------------------------------------
// padStart / padEnd
// ---------------------------------------------------------------------------
describe("padStart", () => {
  it("pads on left with default space", () => {
    expect(padStart("5", 3)).toBe("  5");
  });

  it("pads with custom char", () => {
    expect(padStart("5", 3, "0")).toBe("005");
  });

  it("returns string unchanged if already at length", () => {
    expect(padStart("abc", 3)).toBe("abc");
  });
});

describe("padEnd", () => {
  it("pads on right with default space", () => {
    expect(padEnd("5", 3)).toBe("5  ");
  });

  it("pads with custom char", () => {
    expect(padEnd("5", 3, "0")).toBe("500");
  });
});

// ---------------------------------------------------------------------------
// countOccurrences
// ---------------------------------------------------------------------------
describe("countOccurrences", () => {
  it("counts non-overlapping occurrences", () => {
    expect(countOccurrences("hello hello hello", "hello")).toBe(3);
  });

  it("returns 0 when substring not found", () => {
    expect(countOccurrences("hello world", "xyz")).toBe(0);
  });

  it("returns 0 for empty substring", () => {
    expect(countOccurrences("hello", "")).toBe(0);
  });

  it("handles substring at start and end", () => {
    expect(countOccurrences("abcabc", "abc")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// replaceAll
// ---------------------------------------------------------------------------
describe("replaceAll", () => {
  it("replaces all literal occurrences", () => {
    expect(replaceAll("a-b-c", "-", "_")).toBe("a_b_c");
  });

  it("replaces nothing when search not found", () => {
    expect(replaceAll("hello", "x", "y")).toBe("hello");
  });

  it("handles empty search string", () => {
    expect(replaceAll("hello", "", "x")).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// normalizeWhitespace
// ---------------------------------------------------------------------------
describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeWhitespace("  a   b  ")).toBe("a b");
  });

  it("collapses tabs and newlines", () => {
    expect(normalizeWhitespace("a\t\tb\n\nc")).toBe("a b c");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// splitIntoChunks
// ---------------------------------------------------------------------------
describe("splitIntoChunks", () => {
  it("splits text at word boundaries", () => {
    const chunks = splitIntoChunks("a b c d e f", 5);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(5);
    }
  });

  it("returns single chunk when text fits", () => {
    expect(splitIntoChunks("hello", 10)).toEqual(["hello"]);
  });

  it("returns empty array for empty string", () => {
    expect(splitIntoChunks("", 10)).toEqual([]);
  });

  it("reconstructed text covers all words", () => {
    const text = "one two three four five six";
    const chunks = splitIntoChunks(text, 10);
    const joined = chunks.join(" ");
    expect(joined).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// buildMetaDescription
// ---------------------------------------------------------------------------
describe("buildMetaDescription", () => {
  it("strips HTML tags", () => {
    expect(buildMetaDescription("<p>Hello world</p>")).toBe("Hello world");
  });

  it("normalizes whitespace", () => {
    expect(buildMetaDescription("<p>  Hello   world  </p>")).toBe("Hello world");
  });

  it("truncates to maxLength (default 160)", () => {
    const longText = "word ".repeat(50); // ~250 chars
    const result = buildMetaDescription(longText);
    expect(result.length).toBeLessThanOrEqual(160);
  });

  it("respects custom maxLength", () => {
    const result = buildMetaDescription("<p>Hello world, this is a long text.</p>", 20);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("decodes HTML entities", () => {
    expect(buildMetaDescription("a &amp; b")).toBe("a & b");
  });
});
