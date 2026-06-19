import { NextResponse } from "next/server";

import {
  validatePaceScheduleInput,
  runPaceScheduleOptimization,
} from "@/lib/lab/pace-schedule-optimizer";
import { checkLabRateLimit } from "@/lib/lab/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — Pace & Schedule advantage optimizer.
 *
 * POST a matchup's rest situation (days rest, back-to-back flags) and an
 * optional tempo estimate; returns the rest/pace margin-shift frame with a
 * confidence interval. This is a user-driven model exploration tool — the
 * response carries an honesty disclaimer, makes no published-pick claim, and
 * excludes real injury/availability data. Pure compute over the request body:
 * no DB, no secrets, no side effects.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const rate = checkLabRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded — please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const validated = validatePaceScheduleInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runPaceScheduleOptimization(validated);
  return NextResponse.json({ success: true, data });
}
