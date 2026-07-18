import { revalidatePath } from "next/cache";

/**
 * Journal distribution revalidation.
 *
 * Single entry point for cache invalidation when a Model Journal entry
 * changes public visibility (publish or retract). Invalidates every
 * surface that lists or syndicates published entries so a newly
 * published entry appears — and a retracted one disappears — without a
 * redeploy:
 *
 * - `/journal`          public archive index (ISR, 300s window)
 * - `/journal/rss.xml`  RSS feed route
 * - `/sitemap.xml`      sitemap with per-entry journal URLs
 * - `/journal/<slug>`   the entry page itself (and its 410 tombstone path)
 *
 * Each call is individually guarded: cache invalidation must never fail
 * the underlying publish/retract transition. Returns the paths that
 * were successfully revalidated for auditability.
 */

const JOURNAL_DISTRIBUTION_PATHS: readonly string[] = [
  "/journal",
  "/journal/rss.xml",
  "/sitemap.xml",
];

export function revalidateJournalDistribution(slug?: string): readonly string[] {
  const paths = slug
    ? [...JOURNAL_DISTRIBUTION_PATHS, `/journal/${slug}`, `/journal/retracted/${slug}`]
    : [...JOURNAL_DISTRIBUTION_PATHS];

  const revalidated: string[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch {
      // Outside a request scope (e.g. unit tests) revalidatePath throws;
      // the state transition itself must still succeed.
    }
  }
  return revalidated;
}
