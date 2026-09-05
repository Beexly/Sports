import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  ADMIN_TRIGGER_REFRESH_LIMIT,
  ADMIN_TRIGGER_REFRESH_RATE_KEY,
  ADMIN_TRIGGER_REFRESH_WINDOW_MS,
  executeAdminRefresh,
} from "@/lib/admin/trigger-refresh";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Per-admin throttle on a route that fans out to The Odds API for EVERY sport.
  // That bills per call — a single admin looping this endpoint drains the shared
  // monthly odds budget for everyone (denial-of-wallet). Stop it at the door.
  // Shared with the admin dashboard's server action (SEC-01) so both entry
  // points enforce the identical budget.
  const limit = consumeRateLimit(
    ADMIN_TRIGGER_REFRESH_RATE_KEY,
    session.user.id,
    ADMIN_TRIGGER_REFRESH_LIMIT,
    ADMIN_TRIGGER_REFRESH_WINDOW_MS,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many refresh requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const outcome = await executeAdminRefresh("[trigger-refresh]");
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }

  return NextResponse.json({ success: true, results: outcome.results });
}
