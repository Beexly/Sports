import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  BRIEF_RESPONSIBLE_GAMING_NOTE,
  composeBriefAsync,
} from "@/lib/brief/compose";
import type { SlatePickSnippet } from "@/lib/brief/slate-overview";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Internal cockpit brief API — admin-gated.
 *
 * Preserves source-level invariants:
 *   - imports auth() helper
 *   - rejects requests where role !== "ADMIN" with a 401
 *   - GET is read-only — does not touch the DB
 *   - POST composes a preview brief from operator-supplied picks; it
 *     does NOT write to the DB and does NOT set publishedAt
 *   - Cache-Control: no-store on POST success (preview, never cached)
 */
export const dynamic = "force-dynamic";

interface BriefComposeBody {
  date?: unknown;
  picks?: unknown;
}

function isSlatePick(value: unknown): value is SlatePickSnippet {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["sport"] === "string" &&
    typeof v["game"] === "string" &&
    typeof v["pickType"] === "string" &&
    typeof v["selection"] === "string" &&
    typeof v["confidence"] === "number" &&
    typeof v["pickGrade"] === "string"
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "rebuilding",
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.email ?? session.user.id ?? "anon-admin";
  const limit = await checkRateLimit(userId, {
    route: "cockpit-brief",
    windowMs: 60_000,
    maxRequests: 10,
    failureMode: "fail-closed",
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate-limit-exceeded", resetAt: limit.resetAt, source: limit.source },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as BriefComposeBody;

  if (typeof body.date !== "string" || body.date.trim().length === 0) {
    return NextResponse.json({ error: "date is required (string)" }, { status: 400 });
  }
  if (!Array.isArray(body.picks)) {
    return NextResponse.json({ error: "picks is required (array)" }, { status: 400 });
  }

  const validPicks = body.picks.filter(isSlatePick);
  if (validPicks.length !== body.picks.length) {
    return NextResponse.json(
      { error: "every pick must include sport, game, pickType, selection, confidence, pickGrade" },
      { status: 400 }
    );
  }

  try {
    const brief = await composeBriefAsync({
      date: body.date,
      picks: validPicks,
    });
    const res = NextResponse.json(brief, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown composer error";
    return NextResponse.json(
      { error: "composer-failed", detail: message },
      { status: 500 }
    );
  }
}
