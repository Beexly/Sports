import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  unescapeHtml,
  escapeAttribute,
  encodeHtmlEntities,
  stripTags,
  decodeNamedEntities,
  tag,
  voidTag,
  attrs,
  classNames,
  extractText,
  extractLinks,
  extractImages,
  wordCount,
  readingTimeMinutes,
  sanitizeHtml,
  removeScripts,
  stripComments,
  parseAttributes,
  getAttribute,
  hasClass,
  truncateHtml,
  nl2br,
  linkify,
  highlightTerms,
  tableFromRows,
  listFromItems,
  metaTag,
  slugifyHeading,
} from "@/lib/utils/html-utils";

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
  it("escapes less-than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });
  it("escapes greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });
  it("escapes double quote", () => {
    expect(escapeHtml('say "hi"')).toBe("say &quot;hi&quot;");
  });
  it("escapes single quote", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
  it("escapes all five at once", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
  it("escapes ampersand before other entities (no double escape)", () => {
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });
  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
  it("escapes a script tag payload", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });
  it("handles repeated specials", () => {
    expect(escapeHtml("&&&")).toBe("&amp;&amp;&amp;");
  });
});

// ---------------------------------------------------------------------------
// unescapeHtml
// ---------------------------------------------------------------------------

describe("unescapeHtml", () => {
  it("decodes amp", () => {
    expect(unescapeHtml("a &amp; b")).toBe("a & b");
  });
  it("decodes lt and gt", () => {
    expect(unescapeHtml("&lt;b&gt;")).toBe("<b>");
  });
  it("decodes quot", () => {
    expect(unescapeHtml("&quot;x&quot;")).toBe('"x"');
  });
  it("decodes &#39; to single quote", () => {
    expect(unescapeHtml("it&#39;s")).toBe("it's");
  });
  it("decodes decimal numeric reference", () => {
    expect(unescapeHtml("&#65;&#66;&#67;")).toBe("ABC");
  });
  it("decodes hex numeric reference", () => {
    expect(unescapeHtml("&#x41;&#x42;")).toBe("AB");
  });
  it("decodes uppercase hex marker", () => {
    expect(unescapeHtml("&#X41;")).toBe("A");
  });
  it("decodes emoji via hex codepoint", () => {
    expect(unescapeHtml("&#x1F600;")).toBe("\u{1F600}");
  });
  it("decodes nbsp to space", () => {
    expect(unescapeHtml("a&nbsp;b")).toBe("a b");
  });
  it("leaves unknown named entity intact", () => {
    expect(unescapeHtml("&unknownentity;")).toBe("&unknownentity;");
  });
  it("returns empty unchanged", () => {
    expect(unescapeHtml("")).toBe("");
  });
  it("round-trips with escapeHtml", () => {
    const original = `<a href="x">'&'</a>`;
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
  it("round-trips complex unicode text", () => {
    const original = `Quotes "a" 'b' & <tags> 5 > 3`;
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
  it("ignores malformed numeric ref", () => {
    expect(unescapeHtml("&#;")).toBe("&#;");
  });
});

// ---------------------------------------------------------------------------
// escapeAttribute
// ---------------------------------------------------------------------------

describe("escapeAttribute", () => {
  it("escapes html specials", () => {
    expect(escapeAttribute(`"x"`)).toBe("&quot;x&quot;");
  });
  it("escapes backtick", () => {
    expect(escapeAttribute("`x`")).toBe("&#96;x&#96;");
  });
  it("escapes equals", () => {
    expect(escapeAttribute("a=b")).toBe("a&#61;b");
  });
  it("escapes ampersand", () => {
    expect(escapeAttribute("a&b")).toBe("a&amp;b");
  });
  it("handles empty string", () => {
    expect(escapeAttribute("")).toBe("");
  });
  it("escapes quotes and angle brackets", () => {
    expect(escapeAttribute(`<"'>`)).toBe("&lt;&quot;&#39;&gt;");
  });
});

// ---------------------------------------------------------------------------
// encodeHtmlEntities
// ---------------------------------------------------------------------------

describe("encodeHtmlEntities", () => {
  it("leaves ASCII unchanged", () => {
    expect(encodeHtmlEntities("hello")).toBe("hello");
  });
  it("encodes accented chars", () => {
    expect(encodeHtmlEntities("café")).toBe("caf&#233;");
  });
  it("encodes copyright sign", () => {
    expect(encodeHtmlEntities("©")).toBe("&#169;");
  });
  it("encodes emoji as full codepoint", () => {
    expect(encodeHtmlEntities("\u{1F600}")).toBe("&#128512;");
  });
  it("mixes ASCII and non-ASCII", () => {
    expect(encodeHtmlEntities("a©b")).toBe("a&#169;b");
  });
  it("handles empty string", () => {
    expect(encodeHtmlEntities("")).toBe("");
  });
  it("leaves digits and punctuation", () => {
    expect(encodeHtmlEntities("a1!?")).toBe("a1!?");
  });
});

// ---------------------------------------------------------------------------
// stripTags
// ---------------------------------------------------------------------------

describe("stripTags", () => {
  it("removes a simple tag", () => {
    expect(stripTags("<b>bold</b>")).toBe("bold");
  });
  it("removes nested tags keeping text", () => {
    expect(stripTags("<div><p>Hi <b>there</b></p></div>")).toBe("Hi there");
  });
  it("removes self-closing tags", () => {
    expect(stripTags("a<br/>b")).toBe("ab");
  });
  it("removes tags with attributes", () => {
    expect(stripTags('<a href="x" class="y">link</a>')).toBe("link");
  });
  it("handles text with no tags", () => {
    expect(stripTags("plain text")).toBe("plain text");
  });
  it("handles empty string", () => {
    expect(stripTags("")).toBe("");
  });
  it("removes multiple tags", () => {
    expect(stripTags("<h1>Title</h1><p>Body</p>")).toBe("TitleBody");
  });
  it("keeps angle bracket content of attributes intact textually", () => {
    expect(stripTags('<img src="a.png" alt="cat" />text')).toBe("text");
  });
});

// ---------------------------------------------------------------------------
// decodeNamedEntities
// ---------------------------------------------------------------------------

describe("decodeNamedEntities", () => {
  it("decodes amp lt gt", () => {
    expect(decodeNamedEntities("&lt;a &amp; b&gt;")).toBe("<a & b>");
  });
  it("decodes copy and reg", () => {
    expect(decodeNamedEntities("&copy;&reg;")).toBe("©®");
  });
  it("decodes nbsp", () => {
    expect(decodeNamedEntities("a&nbsp;b")).toBe("a b");
  });
  it("does not decode numeric references", () => {
    expect(decodeNamedEntities("&#65;")).toBe("&#65;");
  });
  it("leaves unknown entities", () => {
    expect(decodeNamedEntities("&foo;")).toBe("&foo;");
  });
  it("handles empty string", () => {
    expect(decodeNamedEntities("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// tag
// ---------------------------------------------------------------------------

describe("tag", () => {
  it("builds a simple tag with content", () => {
    expect(tag("p", undefined, "hello")).toBe("<p>hello</p>");
  });
  it("builds a tag with attributes and content", () => {
    expect(tag("a", { href: "/x" }, "Go")).toBe('<a href="/x">Go</a>');
  });
  it("self-closes br with no content", () => {
    expect(tag("br")).toBe("<br />");
  });
  it("self-closes img with no content", () => {
    expect(tag("img", { src: "x.png" })).toBe('<img src="x.png" />');
  });
  it("self-closes hr", () => {
    expect(tag("hr")).toBe("<hr />");
  });
  it("self-closes input", () => {
    expect(tag("input", { type: "text" })).toBe('<input type="text" />');
  });
  it("self-closes meta", () => {
    expect(tag("meta", { charset: "utf-8" })).toBe('<meta charset="utf-8" />');
  });
  it("renders empty non-void tag with closing tag", () => {
    expect(tag("div")).toBe("<div></div>");
  });
  it("renders boolean true attribute as bare", () => {
    expect(tag("button", { disabled: true }, "X")).toBe(
      "<button disabled>X</button>",
    );
  });
  it("omits boolean false attribute", () => {
    expect(tag("button", { disabled: false }, "X")).toBe("<button>X</button>");
  });
  it("renders numeric attribute", () => {
    expect(tag("td", { colspan: 2 }, "x")).toBe('<td colspan="2">x</td>');
  });
  it("escapes attribute values", () => {
    expect(tag("a", { title: '"q"' }, "L")).toBe(
      '<a title="&quot;q&quot;">L</a>',
    );
  });
  it("treats void element with content as a normal element", () => {
    expect(tag("br", undefined, "x")).toBe("<br>x</br>");
  });
  it("handles case-insensitive void detection", () => {
    expect(tag("BR")).toBe("<BR />");
  });
});

// ---------------------------------------------------------------------------
// voidTag
// ---------------------------------------------------------------------------

describe("voidTag", () => {
  it("self-closes br", () => {
    expect(voidTag("br")).toBe("<br />");
  });
  it("self-closes any name", () => {
    expect(voidTag("custom")).toBe("<custom />");
  });
  it("includes attributes", () => {
    expect(voidTag("img", { src: "a.png", alt: "x" })).toBe(
      '<img src="a.png" alt="x" />',
    );
  });
  it("handles no attributes", () => {
    expect(voidTag("hr")).toBe("<hr />");
  });
});

// ---------------------------------------------------------------------------
// attrs
// ---------------------------------------------------------------------------

describe("attrs", () => {
  it("serializes a single string attribute", () => {
    expect(attrs({ href: "/x" })).toBe(' href="/x"');
  });
  it("serializes multiple attributes preserving order", () => {
    expect(attrs({ id: "a", class: "b" })).toBe(' id="a" class="b"');
  });
  it("serializes number values", () => {
    expect(attrs({ tabindex: 0 })).toBe(' tabindex="0"');
  });
  it("renders true as bare attribute", () => {
    expect(attrs({ disabled: true })).toBe(" disabled");
  });
  it("skips false attribute", () => {
    expect(attrs({ disabled: false })).toBe("");
  });
  it("escapes values", () => {
    expect(attrs({ title: '"q"' })).toBe(' title="&quot;q&quot;"');
  });
  it("returns empty string for empty map", () => {
    expect(attrs({})).toBe("");
  });
  it("mixes true, false and string", () => {
    expect(attrs({ a: "1", b: false, c: true })).toBe(' a="1" c');
  });
});

// ---------------------------------------------------------------------------
// classNames
// ---------------------------------------------------------------------------

describe("classNames", () => {
  it("joins plain strings", () => {
    expect(classNames("a", "b")).toBe("a b");
  });
  it("skips falsy values", () => {
    expect(classNames("a", false, null, undefined, "b")).toBe("a b");
  });
  it("includes truthy map keys", () => {
    expect(classNames({ a: true, b: false, c: true })).toBe("a c");
  });
  it("mixes strings and maps", () => {
    expect(classNames("base", { active: true, hidden: false })).toBe(
      "base active",
    );
  });
  it("returns empty string when nothing truthy", () => {
    expect(classNames(false, null, undefined)).toBe("");
  });
  it("returns empty string with no args", () => {
    expect(classNames()).toBe("");
  });
  it("trims whitespace-only string", () => {
    expect(classNames("  ", "a")).toBe("a");
  });
  it("preserves order of strings then maps", () => {
    expect(classNames("a", { b: true }, "c")).toBe("a b c");
  });
});

// ---------------------------------------------------------------------------
// extractText
// ---------------------------------------------------------------------------

describe("extractText", () => {
  it("strips tags", () => {
    expect(extractText("<p>Hello</p>")).toBe("Hello");
  });
  it("decodes entities", () => {
    expect(extractText("<p>a &amp; b</p>")).toBe("a & b");
  });
  it("collapses whitespace", () => {
    expect(extractText("<p>a    b\n\n  c</p>")).toBe("a b c");
  });
  it("strips nested tags and decodes", () => {
    expect(extractText("<div><b>Hi</b>&nbsp;<i>there</i></div>")).toBe(
      "Hi there",
    );
  });
  it("removes script content", () => {
    expect(extractText("<p>Visible</p><script>var x=1</script>")).toBe(
      "Visible",
    );
  });
  it("trims leading and trailing whitespace", () => {
    expect(extractText("   <p>  x  </p>   ")).toBe("x");
  });
  it("handles empty string", () => {
    expect(extractText("")).toBe("");
  });
  it("handles plain text", () => {
    expect(extractText("just text")).toBe("just text");
  });
});

// ---------------------------------------------------------------------------
// extractLinks
// ---------------------------------------------------------------------------

describe("extractLinks", () => {
  it("extracts a single href", () => {
    expect(extractLinks('<a href="/x">x</a>')).toEqual(["/x"]);
  });
  it("extracts multiple hrefs in order", () => {
    expect(
      extractLinks('<a href="/a">a</a><a href="/b">b</a>'),
    ).toEqual(["/a", "/b"]);
  });
  it("handles single-quoted hrefs", () => {
    expect(extractLinks("<a href='/x'>x</a>")).toEqual(["/x"]);
  });
  it("handles unquoted hrefs", () => {
    expect(extractLinks("<a href=/x>x</a>")).toEqual(["/x"]);
  });
  it("ignores anchors without href", () => {
    expect(extractLinks("<a name='top'>x</a>")).toEqual([]);
  });
  it("works with extra attributes", () => {
    expect(
      extractLinks('<a class="c" href="/x" target="_blank">x</a>'),
    ).toEqual(["/x"]);
  });
  it("returns empty array for no links", () => {
    expect(extractLinks("<p>no links</p>")).toEqual([]);
  });
  it("handles empty string", () => {
    expect(extractLinks("")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractImages
// ---------------------------------------------------------------------------

describe("extractImages", () => {
  it("extracts src and alt", () => {
    expect(extractImages('<img src="a.png" alt="A" />')).toEqual([
      { src: "a.png", alt: "A" },
    ]);
  });
  it("defaults alt to empty when missing", () => {
    expect(extractImages('<img src="a.png" />')).toEqual([
      { src: "a.png", alt: "" },
    ]);
  });
  it("extracts multiple images", () => {
    expect(
      extractImages('<img src="a.png" alt="A"><img src="b.png" alt="B">'),
    ).toEqual([
      { src: "a.png", alt: "A" },
      { src: "b.png", alt: "B" },
    ]);
  });
  it("handles single quotes", () => {
    expect(extractImages("<img src='a.png' alt='A'>")).toEqual([
      { src: "a.png", alt: "A" },
    ]);
  });
  it("returns empty for no images", () => {
    expect(extractImages("<p>no imgs</p>")).toEqual([]);
  });
  it("handles empty string", () => {
    expect(extractImages("")).toEqual([]);
  });
  it("defaults src to empty when missing", () => {
    expect(extractImages('<img alt="A" />')).toEqual([{ src: "", alt: "A" }]);
  });
});

// ---------------------------------------------------------------------------
// wordCount
// ---------------------------------------------------------------------------

describe("wordCount", () => {
  it("counts words in text", () => {
    expect(wordCount("<p>one two three</p>")).toBe(3);
  });
  it("counts across tags", () => {
    expect(wordCount("<b>one</b> <i>two</i>")).toBe(2);
  });
  it("collapses extra whitespace", () => {
    expect(wordCount("a    b   c")).toBe(3);
  });
  it("returns 0 for empty string", () => {
    expect(wordCount("")).toBe(0);
  });
  it("returns 0 for tags-only", () => {
    expect(wordCount("<br/><hr/>")).toBe(0);
  });
  it("ignores script content", () => {
    expect(wordCount("<p>one two</p><script>a b c d</script>")).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// readingTimeMinutes
// ---------------------------------------------------------------------------

describe("readingTimeMinutes", () => {
  it("rounds up partial minutes", () => {
    const html = `<p>${"word ".repeat(250)}</p>`;
    expect(readingTimeMinutes(html)).toBe(2);
  });
  it("returns 1 for short content", () => {
    expect(readingTimeMinutes("<p>a few words here</p>")).toBe(1);
  });
  it("returns 0 for empty content", () => {
    expect(readingTimeMinutes("")).toBe(0);
  });
  it("respects custom wpm", () => {
    const html = `<p>${"word ".repeat(100)}</p>`;
    expect(readingTimeMinutes(html, 100)).toBe(1);
  });
  it("computes exactly at default wpm boundary", () => {
    const html = `<p>${"word ".repeat(200)}</p>`;
    expect(readingTimeMinutes(html)).toBe(1);
  });
  it("falls back to default for non-positive wpm", () => {
    const html = `<p>${"word ".repeat(200)}</p>`;
    expect(readingTimeMinutes(html, 0)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removeScripts
// ---------------------------------------------------------------------------

describe("removeScripts", () => {
  it("removes script block and content", () => {
    expect(removeScripts("<p>x</p><script>alert(1)</script>")).toBe("<p>x</p>");
  });
  it("removes style block and content", () => {
    expect(removeScripts("<p>x</p><style>.a{color:red}</style>")).toBe(
      "<p>x</p>",
    );
  });
  it("removes onclick handlers", () => {
    expect(removeScripts('<a onclick="evil()">x</a>')).toBe("<a>x</a>");
  });
  it("removes onload handlers (single quotes)", () => {
    expect(removeScripts("<img onload='evil()' src='a.png'>")).toBe(
      "<img src='a.png'>",
    );
  });
  it("neutralizes javascript: href (double quotes)", () => {
    expect(removeScripts('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a href="#">x</a>',
    );
  });
  it("neutralizes javascript: href (single quotes)", () => {
    expect(removeScripts("<a href='javascript:alert(1)'>x</a>")).toBe(
      "<a href='#'>x</a>",
    );
  });
  it("leaves safe href untouched", () => {
    expect(removeScripts('<a href="/safe">x</a>')).toBe('<a href="/safe">x</a>');
  });
  it("removes multiline script", () => {
    expect(removeScripts("<script>\nvar a=1;\nvar b=2;\n</script>x")).toBe("x");
  });
  it("handles empty string", () => {
    expect(removeScripts("")).toBe("");
  });
  it("removes uppercase SCRIPT", () => {
    expect(removeScripts("<SCRIPT>x</SCRIPT>y")).toBe("y");
  });
  it("strips arbitrary on* handler with unquoted value", () => {
    expect(removeScripts("<div onmouseover=hack>x</div>")).toBe(
      "<div>x</div>",
    );
  });
});

// ---------------------------------------------------------------------------
// stripComments
// ---------------------------------------------------------------------------

describe("stripComments", () => {
  it("removes a comment", () => {
    expect(stripComments("a<!-- note -->b")).toBe("ab");
  });
  it("removes multiline comment", () => {
    expect(stripComments("a<!--\nmany\nlines\n-->b")).toBe("ab");
  });
  it("removes multiple comments", () => {
    expect(stripComments("<!--a-->x<!--b-->y")).toBe("xy");
  });
  it("leaves text without comments", () => {
    expect(stripComments("plain")).toBe("plain");
  });
  it("handles empty string", () => {
    expect(stripComments("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------

describe("sanitizeHtml", () => {
  it("keeps allowed tags", () => {
    expect(sanitizeHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("removes disallowed tags, keeps text", () => {
    expect(sanitizeHtml("<div><p>hi</p></div>")).toBe("<p>hi</p>");
  });
  it("strips attributes on allowed tags", () => {
    expect(sanitizeHtml('<p class="x" id="y">hi</p>')).toBe("<p>hi</p>");
  });
  it("preserves href on anchors", () => {
    expect(sanitizeHtml('<a href="/x" class="c">x</a>')).toBe(
      '<a href="/x">x</a>',
    );
  });
  it("removes anchor attributes other than href", () => {
    expect(sanitizeHtml('<a target="_blank" href="/x">x</a>')).toBe(
      '<a href="/x">x</a>',
    );
  });
  it("renders anchor with no href as bare", () => {
    expect(sanitizeHtml('<a name="top">x</a>')).toBe("<a>x</a>");
  });
  it("removes script tags entirely", () => {
    expect(sanitizeHtml("<p>x</p><script>evil()</script>")).toBe("<p>x</p>");
  });
  it("strips javascript: href in sanitized anchor", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a href="#">x</a>',
    );
  });
  it("respects custom allowlist", () => {
    expect(sanitizeHtml("<span>x</span><p>y</p>", ["span"])).toBe(
      "<span>x</span>y",
    );
  });
  it("keeps allowed formatting tags", () => {
    expect(sanitizeHtml("<strong>a</strong><em>b</em>")).toBe(
      "<strong>a</strong><em>b</em>",
    );
  });
  it("self-closes allowed void br", () => {
    expect(sanitizeHtml("a<br>b")).toBe("a<br />b");
  });
  it("keeps list structure", () => {
    expect(sanitizeHtml("<ul><li>a</li><li>b</li></ul>")).toBe(
      "<ul><li>a</li><li>b</li></ul>",
    );
  });
  it("removes comments", () => {
    expect(sanitizeHtml("<p>x<!-- c --></p>")).toBe("<p>x</p>");
  });
  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });
  it("escapes href value", () => {
    expect(sanitizeHtml('<a href="/a&b">x</a>')).toBe('<a href="/a&amp;b">x</a>');
  });
});

// ---------------------------------------------------------------------------
// parseAttributes
// ---------------------------------------------------------------------------

describe("parseAttributes", () => {
  it("parses double-quoted attributes", () => {
    expect(parseAttributes('<a href="x" class="y">')).toEqual({
      href: "x",
      class: "y",
    });
  });
  it("parses single-quoted attributes", () => {
    expect(parseAttributes("<a href='x'>")).toEqual({ href: "x" });
  });
  it("parses unquoted attributes", () => {
    expect(parseAttributes("<a href=x>")).toEqual({ href: "x" });
  });
  it("parses boolean attribute as empty string", () => {
    expect(parseAttributes("<input disabled>")).toEqual({ disabled: "" });
  });
  it("lowercases attribute names", () => {
    expect(parseAttributes('<a HREF="x">')).toEqual({ href: "x" });
  });
  it("decodes entity in value", () => {
    expect(parseAttributes('<a title="a&amp;b">')).toEqual({ title: "a&b" });
  });
  it("returns empty object for tag without attributes", () => {
    expect(parseAttributes("<p>")).toEqual({});
  });
  it("handles self-closing tag", () => {
    expect(parseAttributes('<img src="a.png" />')).toEqual({ src: "a.png" });
  });
  it("parses multiple mixed attributes", () => {
    expect(parseAttributes('<input type="text" required value=hi>')).toEqual({
      type: "text",
      required: "",
      value: "hi",
    });
  });
});

// ---------------------------------------------------------------------------
// getAttribute
// ---------------------------------------------------------------------------

describe("getAttribute", () => {
  it("returns attribute value", () => {
    expect(getAttribute('<a href="x">', "href")).toBe("x");
  });
  it("returns null for missing attribute", () => {
    expect(getAttribute('<a href="x">', "class")).toBeNull();
  });
  it("is case-insensitive on name", () => {
    expect(getAttribute('<a HREF="x">', "href")).toBe("x");
  });
  it("returns empty string for boolean attribute", () => {
    expect(getAttribute("<input disabled>", "disabled")).toBe("");
  });
  it("returns null on empty tag", () => {
    expect(getAttribute("<p>", "id")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasClass
// ---------------------------------------------------------------------------

describe("hasClass", () => {
  it("detects a present class", () => {
    expect(hasClass('<div class="a b c">', "b")).toBe(true);
  });
  it("returns false for absent class", () => {
    expect(hasClass('<div class="a b">', "c")).toBe(false);
  });
  it("returns false when no class attribute", () => {
    expect(hasClass("<div>", "a")).toBe(false);
  });
  it("matches a single class", () => {
    expect(hasClass('<div class="only">', "only")).toBe(true);
  });
  it("does not match partial class names", () => {
    expect(hasClass('<div class="active">', "act")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// truncateHtml
// ---------------------------------------------------------------------------

describe("truncateHtml", () => {
  it("returns text unchanged when within limit", () => {
    expect(truncateHtml("short", 20)).toBe("short");
  });
  it("truncates and appends default suffix", () => {
    expect(truncateHtml("hello world foo", 11)).toBe("hello…");
  });
  it("does not cut mid-word", () => {
    const out = truncateHtml("the quick brown fox", 12);
    expect(out).toBe("the quick…");
  });
  it("uses custom suffix", () => {
    expect(truncateHtml("hello world", 9, "...")).toBe("hello...");
  });
  it("returns empty for non-positive maxLength", () => {
    expect(truncateHtml("hello", 0)).toBe("");
  });
  it("handles empty text", () => {
    expect(truncateHtml("", 10)).toBe("");
  });
  it("cuts cleanly at a word boundary", () => {
    expect(truncateHtml("one two three", 8)).toBe("one two…");
  });
  it("respects suffix length in budget", () => {
    const out = truncateHtml("abcdefghij", 5);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.endsWith("…")).toBe(true);
  });
  it("handles text exactly at limit", () => {
    expect(truncateHtml("exact", 5)).toBe("exact");
  });
});

// ---------------------------------------------------------------------------
// nl2br
// ---------------------------------------------------------------------------

describe("nl2br", () => {
  it("converts \\n to br", () => {
    expect(nl2br("a\nb")).toBe("a<br />b");
  });
  it("converts \\r\\n to br", () => {
    expect(nl2br("a\r\nb")).toBe("a<br />b");
  });
  it("converts multiple newlines", () => {
    expect(nl2br("a\nb\nc")).toBe("a<br />b<br />c");
  });
  it("leaves text without newlines", () => {
    expect(nl2br("abc")).toBe("abc");
  });
  it("handles empty string", () => {
    expect(nl2br("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// linkify
// ---------------------------------------------------------------------------

describe("linkify", () => {
  it("wraps a bare http url", () => {
    expect(linkify("see http://example.com now")).toBe(
      'see <a href="http://example.com">http://example.com</a> now',
    );
  });
  it("wraps an https url", () => {
    expect(linkify("https://example.com")).toBe(
      '<a href="https://example.com">https://example.com</a>',
    );
  });
  it("does not include trailing punctuation", () => {
    expect(linkify("visit https://example.com.")).toBe(
      'visit <a href="https://example.com">https://example.com</a>.',
    );
  });
  it("wraps multiple urls", () => {
    expect(linkify("a http://x.com b http://y.com")).toBe(
      'a <a href="http://x.com">http://x.com</a> b <a href="http://y.com">http://y.com</a>',
    );
  });
  it("leaves text without urls", () => {
    expect(linkify("no links here")).toBe("no links here");
  });
  it("handles empty string", () => {
    expect(linkify("")).toBe("");
  });
  it("wraps url with path and query", () => {
    expect(linkify("https://x.com/a/b?c=1")).toBe(
      '<a href="https://x.com/a/b?c=1">https://x.com/a/b?c=1</a>',
    );
  });
});

// ---------------------------------------------------------------------------
// highlightTerms
// ---------------------------------------------------------------------------

describe("highlightTerms", () => {
  it("wraps a matching term in mark", () => {
    expect(highlightTerms("hello world", ["world"])).toBe(
      "hello <mark>world</mark>",
    );
  });
  it("is case-insensitive", () => {
    expect(highlightTerms("Hello World", ["world"])).toBe(
      "Hello <mark>World</mark>",
    );
  });
  it("wraps multiple terms", () => {
    expect(highlightTerms("a b c", ["a", "c"])).toBe(
      "<mark>a</mark> b <mark>c</mark>",
    );
  });
  it("uses a custom wrap tag", () => {
    expect(highlightTerms("hi there", ["there"], "strong")).toBe(
      "hi <strong>there</strong>",
    );
  });
  it("leaves text without matches", () => {
    expect(highlightTerms("nothing", ["xyz"])).toBe("nothing");
  });
  it("escapes regex special characters in terms", () => {
    expect(highlightTerms("a.b.c", ["."])).toBe(
      "a<mark>.</mark>b<mark>.</mark>c",
    );
  });
  it("ignores empty terms", () => {
    expect(highlightTerms("abc", [""])).toBe("abc");
  });
  it("handles empty term list", () => {
    expect(highlightTerms("abc", [])).toBe("abc");
  });
  it("highlights all occurrences", () => {
    expect(highlightTerms("aa", ["a"])).toBe("<mark>a</mark><mark>a</mark>");
  });
});

// ---------------------------------------------------------------------------
// tableFromRows
// ---------------------------------------------------------------------------

describe("tableFromRows", () => {
  it("builds a full table", () => {
    expect(tableFromRows(["A", "B"], [["1", "2"]])).toBe(
      "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>",
    );
  });
  it("stringifies numeric cells", () => {
    expect(tableFromRows(["N"], [[5]])).toBe(
      "<table><thead><tr><th>N</th></tr></thead><tbody><tr><td>5</td></tr></tbody></table>",
    );
  });
  it("escapes header cells", () => {
    expect(tableFromRows(["<b>"], [])).toContain("<th>&lt;b&gt;</th>");
  });
  it("escapes body cells", () => {
    expect(tableFromRows(["x"], [["<i>"]])).toContain("<td>&lt;i&gt;</td>");
  });
  it("handles multiple rows", () => {
    const out = tableFromRows(["A"], [["1"], ["2"]]);
    expect(out).toContain("<tr><td>1</td></tr><tr><td>2</td></tr>");
  });
  it("handles empty rows", () => {
    expect(tableFromRows(["A"], [])).toBe(
      "<table><thead><tr><th>A</th></tr></thead><tbody></tbody></table>",
    );
  });
  it("handles empty headers and rows", () => {
    expect(tableFromRows([], [])).toBe(
      "<table><thead><tr></tr></thead><tbody></tbody></table>",
    );
  });
});

// ---------------------------------------------------------------------------
// listFromItems
// ---------------------------------------------------------------------------

describe("listFromItems", () => {
  it("builds an unordered list by default", () => {
    expect(listFromItems(["a", "b"])).toBe("<ul><li>a</li><li>b</li></ul>");
  });
  it("builds an ordered list when requested", () => {
    expect(listFromItems(["a"], true)).toBe("<ol><li>a</li></ol>");
  });
  it("escapes item content", () => {
    expect(listFromItems(["<x>"])).toBe("<ul><li>&lt;x&gt;</li></ul>");
  });
  it("handles empty list", () => {
    expect(listFromItems([])).toBe("<ul></ul>");
  });
  it("handles empty ordered list", () => {
    expect(listFromItems([], true)).toBe("<ol></ol>");
  });
});

// ---------------------------------------------------------------------------
// metaTag
// ---------------------------------------------------------------------------

describe("metaTag", () => {
  it("builds a meta tag", () => {
    expect(metaTag("description", "hi")).toBe(
      '<meta name="description" content="hi" />',
    );
  });
  it("escapes content", () => {
    expect(metaTag("description", '"q"')).toBe(
      '<meta name="description" content="&quot;q&quot;" />',
    );
  });
  it("escapes name", () => {
    expect(metaTag('a"b', "x")).toBe(
      '<meta name="a&quot;b" content="x" />',
    );
  });
  it("handles empty content", () => {
    expect(metaTag("keywords", "")).toBe(
      '<meta name="keywords" content="" />',
    );
  });
});

// ---------------------------------------------------------------------------
// slugifyHeading
// ---------------------------------------------------------------------------

describe("slugifyHeading", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyHeading("Hello World")).toBe("hello-world");
  });
  it("strips punctuation", () => {
    expect(slugifyHeading("Week 15: NFL Preview!")).toBe("week-15-nfl-preview");
  });
  it("collapses multiple separators", () => {
    expect(slugifyHeading("a   ---   b")).toBe("a-b");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugifyHeading("  !hi!  ")).toBe("hi");
  });
  it("removes diacritics", () => {
    expect(slugifyHeading("Café Olé")).toBe("cafe-ole");
  });
  it("handles empty string", () => {
    expect(slugifyHeading("")).toBe("");
  });
  it("handles all-punctuation input", () => {
    expect(slugifyHeading("!!!")).toBe("");
  });
  it("keeps alphanumerics", () => {
    expect(slugifyHeading("Top 10 Picks 2026")).toBe("top-10-picks-2026");
  });
});
