/**
 * Server-side loader for the two-doctrines board.
 *
 * One seam for /, /board, /picks and /api/board so the four surfaces can never
 * drift. STALENESS_LAW: a load failure is NOT an error page - it composes the
 * PASS doctrine with a resting board. No "temporarily unavailable" anywhere.
 *
 * Confidence on Zone 1 plays is public doctrine (WP-5): every PLAY shows its
 * integer XX/100 to every viewer. The paid selection/line stays gated by the
 * viewer's real canSeePremiumPicks entitlement, redacted server-side.
 */

import type { Entitlements } from "@sports/types";
import { getEntitlements } from "@sports/types";
import { loadBoardState } from "./state";
import { loadBoardPasses } from "./passes";
import { composeDoctrineBoard, type DoctrineBoard } from "./staleness-law";

export async function loadDoctrineBoard(
  viewerEntitlements?: Entitlements,
): Promise<DoctrineBoard> {
  const base = viewerEntitlements ?? getEntitlements("FREE");
  const doctrineEntitlements: Entitlements = { ...base, canSeeConfidence: true };

  let state: Awaited<ReturnType<typeof loadBoardState>> | null = null;
  let passes: Awaited<ReturnType<typeof loadBoardPasses>> | null = null;
  try {
    state = await loadBoardState(new Date(), doctrineEntitlements);
  } catch {
    state = null; // PASS doctrine, never an outage page
  }
  try {
    passes = await loadBoardPasses(new Date(), { includeNoBetDetail: false });
  } catch {
    passes = null;
  }

  return composeDoctrineBoard({
    state,
    passes,
    viewerCanSeeSelection: base.canSeePremiumPicks === true,
  });
}