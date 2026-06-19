import { NextResponse } from "next/server";

import {
  validateWeatherImpactInput,
  runWeatherImpactExplorer,
} from "@/lib/lab/weather-impact-explorer";
import { checkLabRateLimit } from "@/lib/lab/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Galaxy Lab — Weather Impact Explorer.
 *
 * POST a sport plus game-day conditions (temperature, wind speed + direction,
 * precipitation, humidity, snow, stadium type); returns the modeled impact —
 * overall impact level + score, a wind/temp/precip component breakdown, a
 * total/scoring adjustment on a neutral reference total, the football
 * passing-game impact, the MLB ballpark wind in/out read, and a plain-language
 * summary. This is a user-driven educational model explorer — the response
 * carries an honesty disclaimer, makes no published-pick claim, models weather
 * only, and computes purely from the request body: no DB, no secrets, no side
 * effects.
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

  const validated = validateWeatherImpactInput(body);
  if ("error" in validated) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const data = runWeatherImpactExplorer(validated);
  return NextResponse.json({ success: true, data });
}
