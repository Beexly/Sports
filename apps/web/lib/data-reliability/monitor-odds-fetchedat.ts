/**
 * Query MAX(odds.fetchedAt) and optionally ping Healthchecks.io.
 *
 * SCOPE, stated up front because conflating the two is the exact defect the
 * companion classifier exists to prevent: this is a DATA-PLANE OPS monitor over
 * the GLOBAL maximum fetchedAt. It answers "has anything refreshed recently",
 * never "is this candidate inside the 6h gate budget". A healthy result here is
 * NOT gate clearance — a single fresh row from one sport keeps the global max
 * young while every candidate on the board is stale. Per-candidate freshness is
 * `classifyCandidateOddsAge`, and that is what Phase C measures.
 *
 * Env-gated via HC_ODDS_FETCHEDAT_PING_URL; a complete no-op until it is set.
 * Never throws to callers — a monitor that can take down the cron it watches is
 * worse than no monitor.
 *
 * Ported from the superseded PR #221 onto the scoped classifier. #221's own
 * version called the pre-scope `classifyOddsFetchedAt` and shipped alongside a
 * cron-route rewrite that deleted that route's incident documentation; only the
 * capability is carried over here.
 */

import { db } from "@sports/db";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";
import {
  classifyGlobalMaxFetchedAt,
  type GlobalFetchedAtFreshness,
} from "@/lib/data-reliability/odds-fetchedat-staleness";

export interface MonitorFetchedAtResult {
  readonly freshness: GlobalFetchedAtFreshness;
  readonly pinged: "success" | "fail" | "none";
}

export async function monitorOddsFetchedAt(
  pingUrl?: string,
  now: Date = new Date(),
): Promise<MonitorFetchedAtResult> {
  try {
    const agg = await db.odds.aggregate({ _max: { fetchedAt: true } });
    const maxFetchedAt = agg._max.fetchedAt ?? null;
    const freshness = classifyGlobalMaxFetchedAt(maxFetchedAt, now);

    if (!pingUrl) return { freshness, pinged: "none" };

    if (freshness.shouldAlert) {
      await pingHealthcheck(pingUrl, "fail");
      return { freshness, pinged: "fail" };
    }
    await pingHealthcheck(pingUrl, "success");
    return { freshness, pinged: "success" };
  } catch (err) {
    // A query failure is NOT "fresh" and NOT "stale" — it is unknown, which the
    // classifier already reports as alerting. Reusing that path rather than
    // inventing a status keeps "we could not measure" distinct from "we
    // measured and it was bad".
    const base = classifyGlobalMaxFetchedAt(null, now);
    const freshness: GlobalFetchedAtFreshness = {
      ...base,
      summary: `Failed to query odds.fetchedAt: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
    if (pingUrl) {
      await pingHealthcheck(pingUrl, "fail");
      return { freshness, pinged: "fail" };
    }
    return { freshness, pinged: "none" };
  }
}
