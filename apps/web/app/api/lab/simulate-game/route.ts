import { NextResponse } from "next/server";

import {
  validateGameSimInput,
  runGameSimulation,
} from "@/lib/lab/game-simulator";
import { checkLabRateLimit } from "@/lib/lab/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — Monte Carlo game simulator.
 *
 * POST a matchup's ratings (and optional market line); returns the simulated
 * outcome distribution. This is a user-driven model exploration tool — the
 * response carries an honesty disclaimer and makes no published-pick claim.
 * Pure compute over the request body: no DB, no secrets, no side effects.
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

  const validated = validateGameSimInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runGameSimulation(validated);
  return NextResponse.json({ success: true, data });
}
