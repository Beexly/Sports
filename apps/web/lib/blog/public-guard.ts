import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Fail-safe no-claim guard for public Blog copy.
 *
 * `BlogPost.excerpt` and `BlogPost.content` are authored CMS fields rendered
 * to the public marketing surface (the [slug] page, the index cards, and the
 * /api/blog route). The CI banned-phrase scanner only walks source files — it
 * never sees DB rows. There is no shared blog loader, so these helpers run the
 * same scanner at each public read site.
 *
 * Fail-safe posture: on ANY scanner hit we replace the entire string with a
 * calm placeholder. We never partially redact and never echo offending text
 * back out (that would leak the banned phrase).
 *
 * Pure: no I/O, no side effects.
 */

const EXCERPT_PLACEHOLDER =
  "This post is being re-reviewed before publication.";

const CONTENT_PLACEHOLDER =
  "This analysis is temporarily unavailable while it is re-reviewed.";

export function guardPublicExcerpt(excerpt: string): string {
  if (scanForBannedPhrases(excerpt).length === 0) {
    return excerpt;
  }
  return EXCERPT_PLACEHOLDER;
}

export function guardPublicContent(content: string): string {
  if (scanForBannedPhrases(content).length === 0) {
    return content;
  }
  return CONTENT_PLACEHOLDER;
}
