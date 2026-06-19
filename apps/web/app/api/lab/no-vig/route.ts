import { NextResponse } from "next/server";

import {
  validateNoVigInput,
  runNoVigCalculation,
} from "@/lib/lab/no-vig-calculator";
import { checkLabRateLimit } from "@/lib/lab/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — No-Vig Fair Odds & Hold Calculator.
 *
 * POST one or more books, each with the American prices for a market's sides
 * (two-way or n-way); returns each book's raw implied probabilities, total
 * overround and hold/vig %, the vig-free fair probabilities and fair (no-vig)
 * American odds per side, plus a consensus fair line (median) across books.
 * This is a user-driven educational calculator — the response carries an
 * honesty disclaimer, makes no published-pick claim, and computes purely from
 * the prices in the request body: no DB, no secrets, no side effects.
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

  const validated = validateNoVigInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runNoVigCalculation(validated);
  return NextResponse.json({ success: true, data });
}
