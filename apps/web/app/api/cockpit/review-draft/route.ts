import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reviewDraft } from "@/lib/content/draft-reviewer";
import { getBannedPhraseList } from "@/lib/trust-claims";

/**
 * Cockpit semantic draft reviewer — admin-gated POST.
 *
 * Source-level invariants (enforced by cockpit-review-draft-api.test.ts):
 *   - dynamic = "force-dynamic"
 *   - imports auth() and rejects non-admins with 403
 *   - delegates to reviewDraft + getBannedPhraseList (single sources of truth)
 *   - no DB writes; never emits hype / automation language anywhere in this file
 *   - Cache-Control: no-store (reviews are per-draft and never cached)
 *
 * Body shape: { content: string; context?: string }
 * Success: 200 DraftReviewReport
 * 4xx: structured { error }
 */

export const dynamic = "force-dynamic";

const MAX_CONTENT_CHARS = 12_000;

interface ReviewRequestBody {
  content?: unknown;
  context?: unknown;
}

function jsonNoStore(body: unknown, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return jsonNoStore(
      { error: "Admin role required for cockpit endpoints" },
      403
    );
  }

  const body = (await req.json().catch(() => ({}))) as ReviewRequestBody;

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    return jsonNoStore({ error: "content is required" }, 400);
  }
  if (body.content.length > MAX_CONTENT_CHARS) {
    return jsonNoStore(
      { error: `content exceeds ${MAX_CONTENT_CHARS} character limit` },
      400
    );
  }
  if (body.context !== undefined && typeof body.context !== "string") {
    return jsonNoStore({ error: "context must be a string when provided" }, 400);
  }

  const banned = getBannedPhraseList();

  try {
    const report = await reviewDraft({
      content: body.content,
      banned,
      ...(typeof body.context === "string" ? { context: body.context } : {}),
    });
    return jsonNoStore(report, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown reviewer error";
    return jsonNoStore({ error: "reviewer-failed", detail: message }, 500);
  }
}
