/**
 * Since-Last-Visit — cookie-driven delta brief.
 *
 * Reads a `lastSeenAt` cookie. Computes how many picks were published,
 * how many settled, how many autopsies await, since that timestamp.
 *
 * Cookie-only. No DB writes. No telemetry escalation. First-time
 * visitors get an honest first-visit copy state.
 */

import { cookies } from "next/headers";
import { db } from "@sports/db";

export const LAST_SEEN_COOKIE = "gse_last_seen";

export interface SinceLastVisitBrief {
  readonly isFirstVisit: boolean;
  readonly lastSeenAt: string | null;
  readonly picksPublishedSince: number;
  readonly picksSettledSince: number;
  readonly autopsiesWaiting: number;
  readonly computedAt: string;
}

const MAX_LOOKBACK_DAYS = 30;

export async function loadSinceLastVisit(now = new Date()): Promise<SinceLastVisitBrief> {
  const cookieStore = cookies();
  const cookie = cookieStore.get(LAST_SEEN_COOKIE);
  const rawLastSeen = cookie?.value ?? null;
  const parsed = rawLastSeen ? new Date(rawLastSeen) : null;
  const isValid = parsed !== null && !Number.isNaN(parsed.getTime());

  if (!isValid) {
    return {
      isFirstVisit: true,
      lastSeenAt: null,
      picksPublishedSince: 0,
      picksSettledSince: 0,
      autopsiesWaiting: 0,
      computedAt: now.toISOString(),
    };
  }

  const lastSeen = parsed!;
  const cap = new Date(now);
  cap.setDate(cap.getDate() - MAX_LOOKBACK_DAYS);
  const since = lastSeen < cap ? cap : lastSeen;

  const [published, settled, autopsies] = await Promise.all([
    db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          NOT: { modelVersion: "v5.0.0-seed" },
          generatedAt: { gte: since },
        },
      })
      .catch(() => 0),
    db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          NOT: { modelVersion: "v5.0.0-seed" },
          result: { in: ["WIN", "LOSS", "PUSH"] },
          settledAt: { gte: since },
        },
      })
      .catch(() => 0),
    db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          result: { in: ["WIN", "LOSS", "PUSH"] },
          settledAt: { gte: since },
        },
      })
      .catch(() => 0),
  ]);

  return {
    isFirstVisit: false,
    lastSeenAt: lastSeen.toISOString(),
    picksPublishedSince: published,
    picksSettledSince: settled,
    autopsiesWaiting: autopsies,
    computedAt: now.toISOString(),
  };
}
