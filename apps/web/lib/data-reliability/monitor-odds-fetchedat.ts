/**
 * Query max(odds.fetchedAt) and optionally ping Healthchecks.io.
 * Env-gated via HC_ODDS_FETCHEDAT_PING_URL. Never throws to callers.
 */

import { db } from "@sports/db";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";
import {
  classifyOddsFetchedAt,
  type FetchedAtFreshness,
} from "@/lib/data-reliability/odds-fetchedat-staleness";

export interface MonitorFetchedAtResult {
  freshness: FetchedAtFreshness;
  pinged: "success" | "fail" | "none";
}

export async function monitorOddsFetchedAt(
  pingUrl?: string,
  now: Date = new Date(),
): Promise<MonitorFetchedAtResult> {
  try {
    const agg = await db.odds.aggregate({
      _max: { fetchedAt: true },
    });
    const maxFetchedAt = agg._max.fetchedAt ?? null;
    const freshness = classifyOddsFetchedAt(maxFetchedAt, now);

    if (!pingUrl) {
      return { freshness, pinged: "none" };
    }
    if (freshness.shouldAlert) {
      await pingHealthcheck(pingUrl, "fail");
      return { freshness, pinged: "fail" };
    }
    await pingHealthcheck(pingUrl, "success");
    return { freshness, pinged: "success" };
  } catch (err) {
    const freshness = classifyOddsFetchedAt(null, now);
    freshness.summary = `Failed to query odds.fetchedAt: ${
      err instanceof Error ? err.message : String(err)
    }`;
    if (pingUrl) {
      await pingHealthcheck(pingUrl, "fail");
      return { freshness, pinged: "fail" };
    }
    return { freshness, pinged: "none" };
  }
}
