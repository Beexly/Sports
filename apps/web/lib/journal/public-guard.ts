import { scanPublicCopyForClaims } from "@/lib/trust-claims";

/**
 * Fail-safe no-claim guard for public Model Journal bodies.
 *
 * `db.modelJournalEntry.bodyMarkdown` is authored CMS text rendered verbatim
 * to public surfaces (the entry [slug] page, the index cold-open card, and the
 * RSS description). The CI banned-phrase scanner only walks source files — it
 * never sees DB rows. This guard runs the same scanner at read time so that no
 * banned-claim language can reach a public surface from the database.
 *
 * Uses `scanPublicCopyForClaims` (fixed banned-phrase list PLUS the numeric-
 * performance-claim detector), matching `apps/web/lib/blog/public-guard.ts` --
 * a word-list-only scan lets "the model closed 12-3 ATS, a 71% cover rate"
 * through untouched, since that sentence contains no banned WORD, only
 * numbers (CLAUDE.md rule #2: no fabricated stats).
 *
 * Fail-safe posture: on ANY scanner hit we replace the entire body with a calm,
 * on-brand placeholder. We never partially redact and we never echo the
 * offending text back out — that would leak the banned phrase.
 *
 * Pure: no I/O, no side effects.
 */

const REREVIEW_PLACEHOLDER =
  "This Journal entry is being re-reviewed before publication and is temporarily unavailable.";

const TITLE_PLACEHOLDER = "Model Journal entry";

/**
 * Collapse soft line-wraps into spaces before scanning. The underlying
 * scanners split on newlines and test each physical line independently, so a banned
 * phrase hard-wrapped across a newline (e.g. "...a sure\nthing...") would slip
 * the scan even though markdown renders the soft wrap as one continuous claim to
 * the reader. Joining single newlines — but NOT blank-line paragraph breaks —
 * reproduces what the reader sees, so an editor line-wrap can't evade the guard.
 */
function collapseSoftWraps(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/([^\n])\n(?!\n)/g, "$1 ");
}

export function guardPublicJournalBody(markdown: string): {
  readonly safe: boolean;
  readonly body: string;
} {
  const hits = scanPublicCopyForClaims(collapseSoftWraps(markdown));
  if (hits.length === 0) {
    return { safe: true, body: markdown };
  }
  return { safe: false, body: REREVIEW_PLACEHOLDER };
}

/**
 * Fail-safe no-claim guard for public Model Journal titles.
 *
 * The CMS `title` is emitted to RSS, sitemap, OG/<title>, and <h1> without the
 * banned-phrase scan that bodies already get. This runs the same scanner at
 * read time and, on ANY hit, returns a calm placeholder rather than echoing the
 * offending text. When clean, the title passes through byte-for-byte.
 */
export function guardPublicJournalTitle(title: string): string {
  if (scanPublicCopyForClaims(collapseSoftWraps(title)).length === 0) {
    return title;
  }
  return TITLE_PLACEHOLDER;
}
