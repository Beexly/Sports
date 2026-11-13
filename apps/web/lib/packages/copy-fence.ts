/**
 * Public-copy fence helpers (GSE owner directive 2026-11-13).
 *
 * Customer-facing surfaces must never quote win rates, season records, or
 * unit gains — the verified record lives at /record and is linked, never
 * re-quoted. Legacy catalog entries still carry record banners in their
 * description strings; surfaces we render scrub them at render time with
 * `scrubPackageCopy` so the underlying catalog data stays backward-compatible
 * for other consumers (homepage, pricing page, tests).
 *
 * Also banned in customer copy: "lock", "guaranteed", "risk-free".
 * Confidence is always an integer XX/100, never a percentage.
 */

/** W-L-P record strings like "36-13-1" or "47-19-1". */
const RECORD_PATTERN = /\b\d{1,3}\s*-\s*\d{1,3}\s*-\s*\d{1,3}\b/;
/** Any percentage (win rates, stake sizing, etc.). */
const PERCENT_PATTERN = /\d{1,3}(?:\.\d+)?\s*%/;
/** Unit gains/losses like "+20.14u" or "-3.5u". */
const UNITS_PATTERN = /[+-]\d+(?:\.\d+)?\s*u\b/i;
/** Banned hype words. */
const BANNED_WORDS_PATTERN = /\b(lock|locked|locks|guaranteed|risk[- ]free)\b/i;

/** True when the text carries a record banner, win rate, or unit gain. */
export function containsBannedRecordCopy(text: string): boolean {
  return (
    RECORD_PATTERN.test(text) || PERCENT_PATTERN.test(text) || UNITS_PATTERN.test(text)
  );
}

/** True when the text uses banned hype words ("lock", "guaranteed", ...). */
export function containsBannedWords(text: string): boolean {
  return BANNED_WORDS_PATTERN.test(text);
}

/**
 * Remove record/percentage/unit sentences from legacy catalog copy and point
 * readers at the verified record instead. Sentence-granular so the remaining
 * product description stays intact.
 */
export function scrubPackageCopy(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => !containsBannedRecordCopy(s));
  let out = kept.join(" ").replace(/\s{2,}/g, " ").trim();
  if (kept.length < sentences.length) {
    out = `${out ? `${out} ` : ""}See the verified record for every graded play.`;
  }
  return out;
}

/**
 * Scrub banned hype words out of legacy badges without inventing claims.
 * "Lock of the Week" becomes a neutral headline label; other lock wording
 * becomes plain "in the pack" language.
 */
export function scrubBadge(badge: string | undefined): string | undefined {
  if (!badge) return badge;
  return badge
    .replace(/\block of the week\b/gi, "Headline Play of the Week")
    .replace(/\bunbreakable\b/gi, "Headline")
    .replace(/\blocked\b/gi, "in the pack")
    .replace(/\block\b/gi, "top play");
}

/** Convenience: scrub description + badge together for render-time use. */
export function scrubOfferingCopy<T extends { description: string; badge?: string }>(
  offering: T,
): T {
  return {
    ...offering,
    description: scrubPackageCopy(offering.description),
    badge: scrubBadge(offering.badge),
  };
}