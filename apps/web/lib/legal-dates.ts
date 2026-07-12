/**
 * Legal document revision dates — the single source of truth for the
 * "Last updated" line rendered on the legal pages (Terms, Privacy).
 *
 * These MUST be STATIC constants. They are the honest record of when each
 * document's legal TEXT was last revised, and they back the material-change /
 * change-notice clauses inside those documents ("if a change is material, we
 * will notify you...", "your continued use after a change takes effect
 * constitutes acceptance").
 *
 * NEVER compute these from `new Date()`. A render-time date claims the
 * document was "updated today" on every single page load, which silently
 * defeats the change-notice clauses: a reader can never tell when the terms
 * actually changed. Bump a date here ONLY when the corresponding legal text
 * is genuinely revised — never for markup, styling, or whitespace edits.
 *
 * Values are ISO `YYYY-MM-DD` calendar dates. Render them with
 * {@link formatLegalDate}.
 */

/**
 * Terms of Service — legal text last revised 2026-06-20 (the date the v1
 * terms were authored). The later 2026-07-01 edit only added an
 * `id="main-content"` accessibility hook to `<main>`; it did not touch the
 * legal text, so the "last updated" date must not move for it.
 */
export const TERMS_LAST_UPDATED = "2026-06-20";

/**
 * Privacy Policy — legal text last revised 2026-07-01 (copy edits to the
 * policy body: punctuation/wording in the billing and data-rights sections).
 */
export const PRIVACY_LAST_UPDATED = "2026-07-01";

/**
 * Format a static ISO calendar date (`YYYY-MM-DD`) as a human-readable
 * string, e.g. `"June 20, 2026"`, matching the legal pages' existing style.
 *
 * The date is pinned to UTC (`T00:00:00Z` + `timeZone: "UTC"`) so the output
 * is deterministic regardless of the server's local timezone: the input is a
 * fixed calendar date, not an instant, so it must never shift by a day. The
 * output depends only on its argument, never on the current clock — so it
 * cannot drift.
 */
export function formatLegalDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
