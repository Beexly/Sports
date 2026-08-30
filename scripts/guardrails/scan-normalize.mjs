/**
 * Shared copy-gate normalization (adversarial finding O-3.x, remainder pass).
 *
 * One pipeline for every copy gate so an evasion closed in one scanner can
 * never survive in another. Layers, in order:
 *
 *   1. NFKC — compatibility forms (fullwidth, ligatures) fold to ASCII.
 *   2. Invisibles — zero-width characters and soft hyphens are DELETED so a
 *      phrase cannot be split invisibly.
 *   3. Confusables — common CROSS-SCRIPT homoglyphs (Cyrillic/Greek letters
 *      that render identically to Latin) fold to their Latin lookalikes.
 *      NFKC does NOT do this. The map is the high-traffic set, not all of
 *      Unicode TR39 — it is documented as a floor, and unknown non-Latin
 *      letters inside otherwise-Latin words are NOT excused by it.
 *   4. Quote folding — curly/modifier apostrophes and quotes → ASCII.
 *   5. Whitespace — all horizontal Unicode whitespace collapses to a space.
 *
 * Plus one alternate VIEW for source files:
 *
 *   collapseStringJoins("gu" + "aranteed")  → "guaranteed"
 *   collapseStringJoins(`guar${x}anteed`)   → "guaranteed"
 *
 * A string-literal concatenation or template interpolation that SPLITS a
 * banned phrase joins back together in this view; gates scan both views and
 * a hit in either is a hit.
 */

// Cyrillic + Greek homoglyphs → Latin. Keys are the actual non-Latin code
// points; values are what a reader sees.
const CONFUSABLES = new Map(Object.entries({
  // Cyrillic lowercase
  "а": "a", // а
  "е": "e", // е
  "о": "o", // о
  "р": "p", // р
  "с": "c", // с
  "у": "y", // у
  "х": "x", // х
  "і": "i", // і (Ukrainian)
  "ј": "j", // ј
  "һ": "h", // һ
  "ԁ": "d", // ԁ
  "ԛ": "q", // ԛ
  "ԝ": "w", // ԝ
  // Cyrillic uppercase
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M",
  "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T",
  "Х": "X", "І": "I", "Ј": "J", "Ѕ": "S",
  // Greek lowercase
  "ο": "o", // ο
  "α": "a", // α (close in many fonts)
  "ν": "v", // ν
  "υ": "u", // υ
  "ι": "i", // ι
  "κ": "k", // κ
  "ρ": "p", // ρ
  // Greek uppercase (identical glyphs)
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H",
  "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O",
  "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
}));

const CONFUSABLE_RE = new RegExp(
  `[${[...CONFUSABLES.keys()].join("")}]`,
  "g"
);

export function foldConfusables(text) {
  return text.replace(CONFUSABLE_RE, (ch) => CONFUSABLES.get(ch) ?? ch);
}

/** Full normalization pipeline for one line of scanned text. */
export function normalizeScanLine(line) {
  return foldConfusables(
    line
      .normalize("NFKC")
      .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, "")
  )
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\S\r\n]+/g, " ");
}

/**
 * Alternate view: join string-literal concatenations and blank template
 * interpolations so a phrase split across literals re-forms.
 *   "guaran" + "teed"   → "guaranteed"   (quote-plus-quote removed)
 *   `guar${expr}anteed` → "guaranteed"   (interpolation removed)
 * Applied AFTER normalizeScanLine by callers. Interpolations may hold nested
 * braces-free expressions only — good enough for the evasion shape, and a
 * non-matching brace never widens the blanking.
 */
export function collapseStringJoins(line) {
  return line
    .replace(/["'`]\s*\+\s*["'`]/g, "")
    .replace(/\$\{[^{}]*\}/g, "");
}
