import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { narratePick } from "@/lib/cockpit/pick-narrator";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ScoredPick } from "@sports/types";

/**
 * Cockpit pick-narrator API — admin-gated POST.
 *
 * Source-level invariants enforced by tests:
 *   - dynamic = "force-dynamic"
 *   - imports auth() and rejects non-admins with 403
 *   - delegates to narratePick (single source of truth)
 *   - rate-limited 10/min per user, fail-closed (Cycle 18)
 *   - no DB writes; no publishedAt anywhere
 *   - Cache-Control: no-store (every narrate call is fresh)
 */
export const dynamic = "force-dynamic";

interface NarrateBody {
  pick?: unknown;
}

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function looksLikeScoredPick(value: unknown): value is ScoredPick {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["pickType"] === "string" &&
    typeof v["selection"] === "string" &&
    typeof v["confidence"] === "number" &&
    typeof v["pickGrade"] === "string" &&
    typeof v["factorBreakdown"] === "object" &&
    v["factorBreakdown"] !== null
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const userId = session.user.email ?? session.user.id ?? "anon-admin";
  const limit = await checkRateLimit(userId, {
    route: "cockpit-pick-narrator",
    windowMs: 60_000,
    maxRequests: 10,
    failureMode: "fail-closed",
  });
  if (!limit.allowed) {
    return jsonNoStore(
      { error: "rate-limit-exceeded", resetAt: limit.resetAt, source: limit.source },
      429
    );
  }

  const body = (await req.json().catch(() => ({}))) as NarrateBody;

  if (!looksLikeScoredPick(body.pick)) {
    return jsonNoStore(
      {
        error:
          "pick must be a ScoredPick (with pickType, selection, confidence, pickGrade, factorBreakdown)",
      },
      400
    );
  }

  try {
    const report = await narratePick(body.pick);
    return jsonNoStore(report, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown narrator error";
    return jsonNoStore(
      { error: "narrator-failed", detail: message },
      500
    );
  }
}
