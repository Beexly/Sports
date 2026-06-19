import { NextResponse } from "next/server";

import {
  validateBankrollInput,
  runBankrollOptimization,
} from "@/lib/lab/bankroll-optimizer";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — Bankroll & Kelly optimizer.
 *
 * POST a bankroll, a win probability (or let us derive the zero-edge price),
 * and a bet price; returns the Kelly stake, expected growth, and a Monte Carlo
 * bankroll trajectory with a risk-of-ruin estimate. This is a user-driven model
 * exploration tool — the response carries an honesty/responsible-gaming
 * disclaimer and makes no published-pick claim. Pure compute over the request
 * body: no DB, no secrets, no side effects.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const validated = validateBankrollInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runBankrollOptimization(validated);
  return NextResponse.json({ success: true, data });
}
