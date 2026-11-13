/**
 * POST /api/parlay-mri/xray — run the public same-game parlay X-Ray.
 * GET  /api/parlay-mri/xray — read the browser's remaining quota (no compute).
 *
 * Quota doctrine: 1 free X-Ray per browser (httpOnly signed cookie counter),
 * then email capture (/api/parlay-mri/unlock) grants 3 more, then the UI is
 * told to upsell /packages. Quota transitions are pure (lib/parlay/quota.ts).
 *
 * The math is the engine's fitted SGP dependence model, wired through
 * lib/parlay/xray.ts — this route only validates, meters and formats.
 * Rate limiting follows lib/api/rate-limit.ts (clientIp is the only sanctioned
 * key source). This route is PUBLIC by launch doctrine — it is not part of
 * the internal-surface fence registry.
 */

import { NextResponse } from "next/server";
import { clientIp, consumeRateLimit } from "@/lib/api/rate-limit";
import { computeXrayResult, parseXrayRequest } from "@/lib/parlay/xray";
import { consumeXray, quotaSummary } from "@/lib/parlay/quota";
import {
  XRAY_QUOTA_COOKIE,
  readQuotaStateFromRequest,
  signQuotaState,
  xrayQuotaCookieOptions,
} from "@/lib/parlay/quota-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const rl = consumeRateLimit("parlay-mri-quota", clientIp(request), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }
  const state = readQuotaStateFromRequest(request);
  return NextResponse.json({ ok: true, quota: quotaSummary(state) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const rl = consumeRateLimit("parlay-mri-xray", clientIp(request), 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseXrayRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
  }

  const state = readQuotaStateFromRequest(request);
  const summary = quotaSummary(state);
  if (summary.exhausted) {
    // Exact exhausted contract: after the free scan → email capture prompt;
    // after the email grant is spent too → upsell:true → /packages CTA.
    return NextResponse.json(
      {
        ok: false,
        quota: "exhausted",
        freeUsed: summary.freeUsed,
        remaining: 0,
        upsell: summary.upsell,
      },
      { status: 200 },
    );
  }

  const result = computeXrayResult(parsed.legs, parsed.bookQuote);
  const consumed = consumeXray(state);
  const res = NextResponse.json({
    ok: true,
    result,
    quota: quotaSummary(consumed.state),
  });
  res.cookies.set(XRAY_QUOTA_COOKIE, signQuotaState(consumed.state), xrayQuotaCookieOptions);
  return res;
}