/**
 * POST /api/parlay-mri/unlock — email capture that grants 3 more X-Rays.
 *
 * Storage follows the GSE waitlist pattern (app/api/waitlist/route.ts):
 * selectWaitlistStore() → durable Postgres gse_waitlist_leads when Neon is
 * live, local file in dev/stub, honest 503 when no durable store exists.
 * The lead is tagged source "parlay-mri" (utmSource + path). Responses are
 * identical for new and duplicate addresses (no enumeration oracle).
 *
 * The unlock itself is an idempotent signed httpOnly cookie grant — see
 * lib/parlay/quota.ts (pure transitions) and quota-cookie.ts (HMAC).
 * Rate limiting follows the waitlist route: durable public-form limiter
 * keyed by clientIp().
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { selectWaitlistStore } from "@/lib/gse/waitlist-store";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { clientIp } from "@/lib/api/rate-limit";
import { quotaSummary, unlockWithEmail } from "@/lib/parlay/quota";
import {
  XRAY_QUOTA_COOKIE,
  readQuotaStateFromRequest,
  signQuotaState,
  xrayQuotaCookieOptions,
} from "@/lib/parlay/quota-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unlockSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const rl = await consumePublicFormRateLimit("parlay-mri-unlock", clientIp(request), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      { status: rl.status, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 422 },
    );
  }
  const email = parsed.data.email;

  const state = readQuotaStateFromRequest(request);
  const next = unlockWithEmail(state, email);

  try {
    const store = selectWaitlistStore();
    await store.record({
      email,
      fullName: "Parlay X-Ray visitor",
      role: "bettor",
      sportInterests: ["nfl"],
      consent: true,
      utmSource: "parlay-mri",
      path: "/parlay-mri",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const unavailable = /unavailable|durable database/i.test(msg);
    return NextResponse.json(
      {
        ok: false,
        error: unavailable
          ? "Email storage is unavailable on this host. Try again shortly."
          : "Could not save your email. Try again shortly.",
      },
      { status: unavailable ? 503 : 500 },
    );
  }

  const res = NextResponse.json({ ok: true, quota: quotaSummary(next) });
  res.cookies.set(XRAY_QUOTA_COOKIE, signQuotaState(next), xrayQuotaCookieOptions);
  return res;
}