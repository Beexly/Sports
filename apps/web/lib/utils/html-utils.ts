/**
 * HTML string utilities — pure, zero dependencies, no DOM.
 *
 * All operations are string-based so they run safely server-side (no jsdom,
 * no DOM globals). Covers escaping/encoding, tag building, text extraction,
 * allowlist sanitization, attribute parsing, formatting/truncation, and
 * structural helpers (tables, lists, meta tags, heading slugs).
 *
 * Security note: the sanitizer here is a pragmatic allowlist for trusted/
 * semi-trusted content (e.g. generated blog HTML). It is NOT a substitute for
 * a hardened sanitizer against hostile, attacker-controlled markup.
 */

// ---------------------------------------------------------------------------
// 1. Escaping & encoding
// ---------------------------------------------------------------------------

/** Void/self-closing HTML elements that never have a closing tag. */
const VOID_ELEMENTS = new Set<string>([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Common named HTML entities → their character. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  deg: "°",
  euro: "€",
  pound: "£",
  cent: "¢",
  yen: "¥",
  sect: "§",
  para: "¶",
  middot: "·",
  laquo: "«",
  raquo: "»",
  times: "×",
  divide: "÷",
  bull: "•",
  dagger: "†",
  permil: "‰",
  frasl: "⁄",
};

/**
 * Escape the five HTML-significant characters: & < > " '
 *
 * Ampersand is escaped first so we never double-escape generated entities.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Reverse of {@link escapeHtml}, plus numeric (`&#NN;`) and hex (`&#xNN;`)
 * character references and the common named entities. Ampersand is decoded
 * last to avoid premature collapse of entity sequences.
 */
export function unescapeHtml(input: string): string {
  let out = input;

  // Numeric decimal references: &#1234;
  out = out.replace(/&#(\d+);/g, (_match, dec: string) => {
    const code = Number.parseInt(dec, 10);
    return Number.isNaN(code) ? _match : String.fromCodePoint(code);
  });

  // Numeric hex references: &#x1F600; / &#X1f600;
  out = out.replace(/&#x([0-9a-fA-F]+);/gi, (_match, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return Number.isNaN(code) ? _match : String.fromCodePoint(code);
  });

  // Named entities (amp handled within the table; decode last via order below)
  out = out.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => {
    const value = NAMED_ENTITIES[name];
    return value !== undefined ? value : match;
  });

  return out;
}

/**
 * Escape a value destined for a double-quoted attribute. Same as
 * {@link escapeHtml} but additionally encodes the backtick (`) and equals (=)
 * which can be abused in unquoted/legacy contexts.
 */
export function escapeAttribute(input: string): string {
  return escapeHtml(input).replace(/`/g, "&#96;").replace(/=/g, "&#61;");
}

/**
 * Encode every non-ASCII character (code point > 127) as a decimal numeric
 * character reference (`&#NNNN;`). ASCII passes through untouched.
 */
export function encodeHtmlEntities(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    out += code > 127 ? `&#${code};` : ch;
  }
  return out;
}

/**
 * Remove all HTML tags, keeping the text between them. Does not decode
 * entities (use {@link extractText} for full text extraction).
 */
export function stripTags(html: string): string {
  return html.replace(/<\/?[a-zA-Z][^>]*>/g, "").replace(/<[^>]*>/g, "");
}

/**
 * Decode only the common named entities (no numeric references). Useful when
 * you specifically want named-entity decoding without touching `&#NN;`.
 */
export function decodeNamedEntities(input: string): string {
  return input.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => {
    const value = NAMED_ENTITIES[name];
    return value !== undefined ? value : match;
  });
}

// ---------------------------------------------------------------------------
// 2. Tag building
// ---------------------------------------------------------------------------

export type AttrValue = string | number | boolean;
export type AttrMap = Record<string, AttrValue>;

/**
 * Serialize an attribute map into a string with a leading space per attribute.
 *
 * - `false`, `null`, `undefined` values are skipped entirely.
 * - `true` renders as a bare boolean attribute (` disabled`).
 * - string/number values are escaped and double-quoted (` k="v"`).
 */
export function attrs(map: AttrMap): string {
  let out = "";
  for (const key of Object.keys(map)) {
    const value = map[key];
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      out += ` ${key}`;
      continue;
    }
    out += ` ${key}="${escapeAttribute(String(value))}"`;
  }
  return out;
}

/**
 * Build an HTML element string.
 *
 * Void elements (br, img, input, hr, meta, …) self-close when no content is
 * provided. Non-void elements always render an explicit closing tag.
 *
 * tag("br")                              → "<br />"
 * tag("img", { src: "x.png" })          → '<img src="x.png" />'
 * tag("a", { href: "/x" }, "Go")        → '<a href="/x">Go</a>'
 * tag("button", { disabled: true }, "X") → '<button disabled>X</button>'
 */
export function tag(name: string, attrMap?: AttrMap, content?: string): string {
  const attrString = attrMap ? attrs(attrMap) : "";
  const lower = name.toLowerCase();

  if (content === undefined || content === null) {
    if (VOID_ELEMENTS.has(lower)) {
      return `<${name}${attrString} />`;
    }
    return `<${name}${attrString}></${name}>`;
  }

  return `<${name}${attrString}>${content}</${name}>`;
}

/**
 * Build a self-closing void element regardless of the element name.
 *
 * voidTag("br")                  → "<br />"
 * voidTag("input", { type: "x" }) → '<input type="x" />'
 */
export function voidTag(name: string, attrMap?: AttrMap): string {
  const attrString = attrMap ? attrs(attrMap) : "";
  return `<${name}${attrString} />`;
}

/**
 * clsx-style class name joiner. Accepts strings, `{ className: condition }`
 * maps, and falsy values (skipped). Returns a space-joined string.
 *
 * classNames("a", false, { b: true, c: false }, "d") → "a b d"
 */
export function classNames(
  ...args: (string | Record<string, boolean> | undefined | null | false)[]
): string {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      if (arg.trim()) out.push(arg.trim());
      continue;
    }
    for (const key of Object.keys(arg)) {
      if (arg[key]) out.push(key);
    }
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// 3. Text extraction
// ---------------------------------------------------------------------------

/**
 * Extract clean reading text from HTML: strip tags, decode entities, and
 * collapse all runs of whitespace into single spaces (trimmed).
 */
export function extractText(html: string): string {
  const noScripts = removeScripts(html);
  const stripped = stripTags(noScripts);
  const decoded = unescapeHtml(stripped);
  return decoded.replace(/\s+/g, " ").trim();
}

/** Extract all `href` values from `<a>` anchors, in document order. */
export function extractLinks(html: string): string[] {
  const links: string[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    links.push(value);
  }
  return links;
}

/** Extract `<img>` sources with their alt text (empty string when absent). */
export function extractImages(html: string): { src: string; alt: string }[] {
  const images: { src: string; alt: string }[] = [];
  const re = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tagStr = match[0] ?? "";
    const src = getAttribute(tagStr, "src") ?? "";
    const alt = getAttribute(tagStr, "alt") ?? "";
    images.push({ src, alt });
  }
  return images;
}

/** Count words in the extracted reading text of an HTML fragment. */
export function wordCount(html: string): number {
  const text = extractText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Estimate reading time in minutes (rounded up, minimum 1 when there is any
 * text). Default reading speed is 200 words per minute.
 */
export function readingTimeMinutes(html: string, wpm = 200): number {
  const words = wordCount(html);
  if (words === 0) return 0;
  const rate = wpm > 0 ? wpm : 200;
  return Math.max(1, Math.ceil(words / rate));
}

// ---------------------------------------------------------------------------
// 4. Sanitization (allowlist)
// ---------------------------------------------------------------------------

const DEFAULT_ALLOWED_TAGS = [
  "p",
  "b",
  "i",
  "em",
  "strong",
  "a",
  "ul",
  "ol",
  "li",
  "br",
];

/**
 * Drop `<script>` and `<style>` blocks (including content), `on*` event-handler
 * attributes, and `javascript:` hrefs/srcs. A defense-in-depth pre-pass for the
 * allowlist sanitizer; also useful standalone.
 */
export function removeScripts(html: string): string {
  let out = html;

  // Remove <script>...</script> and <style>...</style> blocks, content and all.
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  // Unterminated/self-contained variants.
  out = out.replace(/<script\b[^>]*\/?>/gi, "");
  out = out.replace(/<style\b[^>]*\/?>/gi, "");

  // Strip on* event-handler attributes: onclick="...", onload='...', onx=foo
  out = out.replace(
    /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    "",
  );

  // Neutralize javascript: in href/src attribute values (quoted forms).
  out = out.replace(
    /\b(href|src)\s*=\s*"(?:\s*javascript:)[^"]*"/gi,
    '$1="#"',
  );
  out = out.replace(
    /\b(href|src)\s*=\s*'(?:\s*javascript:)[^']*'/gi,
    "$1='#'",
  );

  return out;
}

/**
 * Allowlist sanitizer. Removes any tag not in `allowedTags`, strips all
 * attributes except `href` on `<a>`, and runs {@link removeScripts} first.
 *
 * Default allowlist: p, b, i, em, strong, a, ul, ol, li, br.
 * Text content of disallowed tags is preserved; only the tags are removed.
 */
export function sanitizeHtml(
  html: string,
  allowedTags: string[] = DEFAULT_ALLOWED_TAGS,
): string {
  const allowed = new Set(allowedTags.map((t) => t.toLowerCase()));
  const cleaned = stripComments(removeScripts(html));

  return cleaned.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (match, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      if (!allowed.has(name)) return "";

      const isClosing = match.startsWith("</");
      if (isClosing) return `</${name}>`;

      const selfClose = VOID_ELEMENTS.has(name);

      // Only preserve href on anchors; drop every other attribute.
      if (name === "a") {
        const href = getAttribute(`<a${rawAttrs}>`, "href");
        if (href !== null) {
          // Re-run javascript: protection on the surviving href.
          const safeHref = /^\s*javascript:/i.test(href) ? "#" : href;
          return `<a href="${escapeAttribute(safeHref)}">`;
        }
        return "<a>";
      }

      return selfClose ? `<${name} />` : `<${name}>`;
    },
  );
}

/** Remove HTML comments (`<!-- ... -->`), including multi-line ones. */
export function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

// ---------------------------------------------------------------------------
// 5. Attribute parsing
// ---------------------------------------------------------------------------

/**
 * Parse the attributes of a single tag string into a map. Boolean attributes
 * (no `=`) map to an empty string. Values are entity-decoded.
 *
 * parseAttributes('<a href="x" class="y" hidden>')
 *   → { href: "x", class: "y", hidden: "" }
 */
export function parseAttributes(tagString: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Isolate the inside of the first tag: <name ...attrs...>
  const inner = tagString.replace(/^\s*<\/?[a-zA-Z][a-zA-Z0-9]*/, "").replace(/\/?>\s*$/, "");

  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    const key = match[1];
    if (!key) continue;
    if (match[2] === undefined) {
      // Boolean attribute (no value).
      result[key.toLowerCase()] = "";
    } else {
      const raw = match[3] ?? match[4] ?? match[5] ?? "";
      result[key.toLowerCase()] = unescapeHtml(raw);
    }
  }
  return result;
}

/** Get a single attribute value from a tag string, or null if absent. */
export function getAttribute(tagString: string, name: string): string | null {
  const attrsMap = parseAttributes(tagString);
  const key = name.toLowerCase();
  return Object.prototype.hasOwnProperty.call(attrsMap, key)
    ? (attrsMap[key] ?? "")
    : null;
}

/** True if the tag's `class` attribute contains the given class name. */
export function hasClass(tagString: string, className: string): boolean {
  const cls = getAttribute(tagString, "class");
  if (cls === null) return false;
  return cls.split(/\s+/).includes(className);
}

// ---------------------------------------------------------------------------
// 6. Formatting & truncation
// ---------------------------------------------------------------------------

/**
 * Truncate plain text to `maxLength` characters (including the suffix),
 * preferring a word boundary so words are not cut mid-way. Appends `suffix`
 * (default "…") only when truncation actually occurs.
 */
export function truncateHtml(
  text: string,
  maxLength: number,
  suffix = "…",
): string {
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;

  const budget = Math.max(0, maxLength - suffix.length);
  if (budget === 0) return suffix.slice(0, maxLength);

  let slice = text.slice(0, budget);

  // Back up to the last whitespace boundary, unless the next char is itself a
  // boundary (meaning we already cut cleanly between words).
  const nextChar = text.charAt(budget);
  if (!/\s/.test(nextChar)) {
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 0) {
      slice = slice.slice(0, lastSpace);
    }
  }

  return slice.replace(/\s+$/, "") + suffix;
}

/** Convert newlines to `<br />` tags. Both `\r\n` and `\n` are handled. */
export function nl2br(text: string): string {
  return text.replace(/\r\n|\r|\n/g, "<br />");
}

/** Wrap bare http(s) URLs in `<a href="…">…</a>`. */
export function linkify(text: string): string {
  return text.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/gi, (url) => {
    // Use escapeHtml (not escapeAttribute) so URL chars like '=' survive while
    // quotes/angle brackets are still neutralized inside the attribute.
    const safe = escapeHtml(url);
    return `<a href="${safe}">${escapeHtml(url)}</a>`;
  });
}

/**
 * Wrap case-insensitive occurrences of `terms` in a highlight tag (`<mark>` by
 * default). Terms are matched as literal substrings; overlapping handling is
 * left-to-right per term in array order.
 */
export function highlightTerms(
  text: string,
  terms: string[],
  wrapTag = "mark",
): string {
  let out = text;
  for (const term of terms) {
    if (!term) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "gi");
    out = out.replace(re, `<${wrapTag}>$1</${wrapTag}>`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 7. Structure helpers
// ---------------------------------------------------------------------------

/**
 * Build a complete `<table>` with `<thead>`/`<tbody>`. All header and cell
 * values are HTML-escaped. Numbers are stringified.
 */
export function tableFromRows(
  headers: string[],
  rows: (string | number)[][],
): string {
  const headCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const thead = `<thead><tr>${headCells}</tr></thead>`;

  const bodyRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => `<td>${escapeHtml(String(cell))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const tbody = `<tbody>${bodyRows}</tbody>`;

  return `<table>${thead}${tbody}</table>`;
}

/** Build a `<ul>` (default) or `<ol>` list from escaped item strings. */
export function listFromItems(items: string[], ordered = false): string {
  const wrapper = ordered ? "ol" : "ul";
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${wrapper}>${lis}</${wrapper}>`;
}

/** Build a `<meta name="…" content="…" />` tag with escaped attributes. */
export function metaTag(name: string, content: string): string {
  return `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(content)}" />`;
}

/**
 * Slugify heading text for use as an anchor `id`: lowercase, collapse runs of
 * non-alphanumerics to single hyphens, trim leading/trailing hyphens.
 *
 * slugifyHeading("Week 15: NFL Preview!") → "week-15-nfl-preview"
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
