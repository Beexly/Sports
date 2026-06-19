import { NextResponse } from "next/server";

import {
  validateMatchupCompareInput,
  runMatchupCompare,
} from "@/lib/lab/matchup-compare";
import { checkLabRateLimit } from "@/lib/lab/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — Multi-Sport Matchup Compare.
 *
 * POST a league plus two teams' season stats (win pct, points for/against per
 * game, strength of schedule, recent form); returns league-normalized power
 * ratings, an expected-margin frame with an 80% interval, a directional win
 * probability, and factor notes. This is a user-driven model exploration tool —
 * the response carries an honesty disclaimer, makes no published-pick claim, and
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

  const validated = validateMatchupCompareInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runMatchupCompare(validated);
  return NextResponse.json({ success: true, data });
}
