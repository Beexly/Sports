/**
 * GSE Founding Waitlist — local submission handler.
 *
 * Validates the lead, enforces consent, and records to durable Postgres when
 * Neon is live (else local file in dev). Optional welcome email when
 * WAITLIST_WELCOME_EMAIL=true + Resend configured — never blocks durability.
 */

import { NextResponse } from "next/server";
import { validateWaitlistLead } from "@/lib/gse/waitlist-validation";
import { selectWaitlistStore } from "@/lib/gse/waitlist-store";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { sendWaitlistWelcomeEmail } from "@/lib/gse/waitlist-welcome-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHoneypotTripped(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const website = (body as { website?: unknown }).website;
  return typeof website === "string" && website.trim() !== "";
}

const MIN_SUBMIT_MS = 1500;
function isTooFast(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const renderedAt = (body as { renderedAt?: unknown }).renderedAt;
  if (typeof renderedAt !== "number" || !Number.isFinite(renderedAt)) return false;
  const elapsed = Date.now() - renderedAt;
  return elapsed >= 0 && elapsed < MIN_SUBMIT_MS;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const rl = await consumePublicFormRateLimit("waitlist", ip, 5, 60_000);
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

  if (isHoneypotTripped(body) || isTooFast(body)) {
    return NextResponse.json({ ok: true, status: "queued" }, { status: 200 });
  }

  const result = validateWaitlistLead(body);
  if (!result.success) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  if (result.data.consent !== true) {
    return NextResponse.json(
      { ok: false, errors: { consent: "Consent is required before joining" } },
      { status: 422 },
    );
  }

  try {
    const store = selectWaitlistStore();
    const { duplicate } = await store.record(result.data);

    if (!duplicate) {
      void sendWaitlistWelcomeEmail(result.data.email, {
        name: result.data.fullName,
      });
    }

    return NextResponse.json(
      { ok: true, status: duplicate ? "already_queued" : "queued" },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const unavailable = /unavailable|durable database/i.test(msg);
    return NextResponse.json(
      {
        ok: false,
        error: unavailable
          ? "Subscribe storage is unavailable on this host (database not configured)."
          : "Could not record subscription. Try again shortly.",
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
