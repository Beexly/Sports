import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";

export const dynamic = "force-dynamic";

interface ScanBody {
  readonly bodyMarkdown?: unknown;
}

async function requireAdmin(): Promise<{ readonly ok: true; userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return { ok: true, userId: session.user.id };
}

export async function POST(
  req: Request,
  _context: { readonly params: { readonly id: string } | Promise<{ readonly id: string }> }
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  // Per-admin throttle on this DB-reading compliance scan (defense-in-depth;
  // same bucket pattern as subscriptions/checkout, keyed by admin id at 10/min).
  // Limit copied from subscriptions/checkout — ample for a human operator.
  const limit = consumeRateLimit("cockpit-journal-scan", guard.userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as ScanBody;
  const bodyMarkdown = typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : "";

  if (bodyMarkdown.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "bodyMarkdown-required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: scanModelJournalMarkdown(bodyMarkdown),
    policy: {
      externalDistribution: false,
      note: "Scan only. No publish, send, or teaser action is triggered.",
    },
  });
}
