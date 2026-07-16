import { scanPublicCopyForClaims } from "@/lib/trust-claims";

/**
 * Fail-safe no-claim guard for public Blog copy.
 *
 * `BlogPost.excerpt` and `BlogPost.content` are authored CMS fields rendered
 * to the public marketing surface (the [slug] page, the index cards, and the
 * /api/blog route). The CI banned-phrase scanner only walks source files — it
 * never sees DB rows. There is no shared blog loader, so these helpers run the
 * same scanner at each public read site.
 *
 * The scan is `scanPublicCopyForClaims`: the fixed banned-phrase list PLUS
 * the numeric-performance-claim detector (public-number-audit-2026-07-16,
 * #6) — a fixed word list alone lets "our picks hit 71% last month" through
 * untouched, since that sentence contains no banned WORD, only a number.
 *
 * Fail-safe posture: on ANY scanner hit we replace the entire string with a
 * calm placeholder. We never partially redact and never echo offending text
 * back out (that would leak the banned phrase or the numeric claim).
 *
 * Pure: no I/O, no side effects.
 */

const EXCERPT_PLACEHOLDER =
  "This post is being re-reviewed before publication.";

const CONTENT_PLACEHOLDER =
  "This analysis is temporarily unavailable while it is re-reviewed.";

const TITLE_PLACEHOLDER = "Model analysis";

/**
 * Fail-safe no-claim guard for public Blog titles and SEO fields.
 *
 * `BlogPost.title`, `.seoTitle`, and `.seoDescription` reach the public payload
 * (OG/<title>, list cards, /api/blog) without the banned-phrase scan that the
 * excerpt and content already get. This runs the same scanner at read time and,
 * on ANY hit, returns a calm placeholder rather than echoing offending text.
 * When clean, the value passes through byte-for-byte.
 */
export function guardPublicTitle(value: string): string {
  if (scanPublicCopyForClaims(value).length === 0) {
    return value;
  }
  return TITLE_PLACEHOLDER;
}

export function guardPublicExcerpt(excerpt: string): string {
  if (scanPublicCopyForClaims(excerpt).length === 0) {
    return excerpt;
  }
  return EXCERPT_PLACEHOLDER;
}

export function guardPublicContent(content: string): string {
  if (scanPublicCopyForClaims(content).length === 0) {
    return content;
  }
  return CONTENT_PLACEHOLDER;
}
