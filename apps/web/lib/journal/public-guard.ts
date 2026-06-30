import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Fail-safe no-claim guard for public Model Journal bodies.
 *
 * `db.modelJournalEntry.bodyMarkdown` is authored CMS text rendered verbatim
 * to public surfaces (the entry [slug] page, the index cold-open card, and the
 * RSS description). The CI banned-phrase scanner only walks source files — it
 * never sees DB rows. This guard runs the same scanner at read time so that no
 * banned-claim language can reach a public surface from the database.
 *
 * Fail-safe posture: on ANY scanner hit we replace the entire body with a calm,
 * on-brand placeholder. We never partially redact and we never echo the
 * offending text back out — that would leak the banned phrase.
 *
 * Pure: no I/O, no side effects.
 */

const REREVIEW_PLACEHOLDER =
  "This Journal entry is being re-reviewed before publication and is temporarily unavailable.";

export function guardPublicJournalBody(markdown: string): {
  readonly safe: boolean;
  readonly body: string;
} {
  const hits = scanForBannedPhrases(markdown);
  if (hits.length === 0) {
    return { safe: true, body: markdown };
  }
  return { safe: false, body: REREVIEW_PLACEHOLDER };
}
