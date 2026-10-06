import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadBoardState, redactBoardConfidence } from "@/lib/board/state";
import { clientIp } from "@/lib/api/rate-limit";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { getReadinessGates } from "@sports/prediction-engine";

/**
 * GET /api/mobile/v1/bootstrap — the native client's cold-start payload.
 *
 * WHY THIS EXISTS: the app needs the board, the brief, the viewer's tier and a
 * freshness anchor before it can render its first useful screen. Fetching four
 * endpoints means four cold TLS handshakes on a cellular radio. One aggregated
 * call, one connection, one render.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   · It computes NOTHING. Every field is the result of an existing loader:
 *     `loadBoardState`, the readiness gates, and `getUserEntitlements`. A
 *     second implementation of any of these is the drift this repo documents
 *     having been burned by (see the placement note in
 *     `lib/picks/adverse-edge-suppression.ts`).
 *   · It does not return picks. Picks are a separate, heavier query with their
 *     own pagination and filters, and folding them in would make the cold start
 *     as slow as the slowest surface. The app fetches `/api/picks` on the
 *     Picks tab, after first paint.
 *   · It does not cache. `force-dynamic`, like every other route that reads
 *     entitlement-scoped data.
 *
 * RATE LIMIT: IP-keyed and generous (120/min) because this is called on every
 * launch and on every foreground. It uses the DURABLE limiter, not the
 * in-memory one, for the same reason `/api/picks` does: on serverless, an
 * in-memory limiter multiplies its ceiling by the warm-instance count.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limit = await consumePublicFormRateLimit("mobile-bootstrap", clientIp(req), 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          limit.status === 429
            ? "Too many requests. Please wait and try again."
            : "Rate limit service unavailable. Please retry shortly.",
        code: limit.status === 429 ? "rate_limited" : "rate_limit_store_unavailable",
      },
      { status: limit.status, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  // Anonymous readers resolve through the SAME function signed-in users do.
  // CLAUDE.md records that a hand-rolled fallback is "exactly how the two FREE
  // definitions drifted apart" — never re-inline it.
  const entitlements = userId
    ? await getUserEntitlements(userId).catch(() => null)
    : undefined;
  if (userId && !entitlements) {
    return NextResponse.json(
      { success: false, error: "Could not resolve your account. Try again.", code: "account_unresolved" },
      { status: 503 },
    );
  }

  const gates = getReadinessGates();

  // The board is public and always attempted. A board failure must not take the
  // whole payload down: the app renders the shell plus an honest board state
  // rather than nothing at all.
  let board: Awaited<ReturnType<typeof loadBoardState>> | null = null;
  let boardError: string | null = null;
  try {
    const payload = await loadBoardState(new Date(), entitlements);
    const canSeeConfidence = entitlements?.canSeeConfidence ?? false;
    board = canSeeConfidence ? payload : redactBoardConfidence(payload);
  } catch {
    boardError = "board_unavailable";
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        board,
        boardError,
        brief: null, // Written by the brief loader; see the note below.
        account: {
          tier: entitlements?.tier ?? "FREE",
          alertsEligible: entitlements?.canGetAlerts ?? false,
          canSeeConfidence: entitlements?.canSeeConfidence ?? false,
          dailyPickLimit: entitlements?.dailyPickLimit ?? 2,
        },
        gates: {
          publicPicks: gates.canExposePublicPicks,
          forceNoBetIfStale: gates.forceNoBetIfStale,
        },
        serverTime: new Date().toISOString(),
        modelVersion: board?.data.modelVersion ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/*
 * NOTE ON `brief: null`
 *
 * The brief loader lives behind `PUBLIC_BLOG_ENABLED` and a readiness gate, and
 * its shape is owned by the content surface, not by this route. Wiring it here
 * would couple the cold start to the content pipeline's gate — a brief outage
 * would then delay the board.
 *
 * So the client fetches `/api/brief` separately, on the Brief tab where it is
 * actually read. If a future revision wants it in the payload, the change is to
 * await the same loader `/api/brief` awaits — never to re-derive the text.
 */
