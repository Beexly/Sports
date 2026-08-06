/**
 * GSE Founding Waitlist — local submission handler.
 *
 * Validates the lead, enforces consent, and records to durable Postgres when
 * Neon is live (else local file in dev). It does NOT send any email, call any external
 * service, change pricing, touch Stripe, flip a flag, or publish anything. The
 * confirmation / follow-up emails in `docs/gse/` remain draft-only and
 * owner-gated.
 */

import { NextResponse } from "next/server";
import { validateWaitlistLead } from "@/lib/gse/waitlist-validation";
import { selectWaitlistStore } from "@/lib/gse/waitlist-store";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** True when the off-screen honeypot field was filled (bot signal). */
function isHoneypotTripped(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const website = (body as { website?: unknown }).website;
  return typeof website === "string" && website.trim() !== "";
}

/**
 * True when the form was submitted implausibly fast after render (bot signal). The
 * client sends `renderedAt` (ms epoch at mount); a human takes well over this to fill
 * name/email/role/sport/consent. Lenient: a missing/!finite value is NOT treated as a
 * bot, so the honeypot remains the primary gate.
 */
const MIN_SUBMIT_MS = 1500;
function isTooFast(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const renderedAt = (body as { renderedAt?: unknown }).renderedAt;
  if (typeof renderedAt !== "number" || !Number.isFinite(renderedAt)) return false;
  const elapsed = Date.now() - renderedAt;
  return elapsed >= 0 && elapsed < MIN_SUBMIT_MS;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Public unauthenticated endpoint: rate-limit per IP so a scripted client can't
  // flood the O(n) file-append store (the honeypot/timing checks are trivially
  // omitted by a non-browser caller). 5 submissions / minute / IP is ample for a human.
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

  // Anti-bot: silently accept and drop honeypot hits or implausibly-fast submits.
  // Normal-looking response, store nothing.
  if (isHoneypotTripped(body) || isTooFast(body)) {
    return NextResponse.json({ ok: true, status: "queued" }, { status: 200 });
  }

  const result = validateWaitlistLead(body);
  if (!result.success) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  // Defensive re-assert of the consent gate (schema already enforces it).
  if (result.data.consent !== true) {
    return NextResponse.json(
      { ok: false, errors: { consent: "Consent is required before joining" } },
      { status: 422 },
    );
  }

  try {
    const store = selectWaitlistStore();
    const { duplicate } = await store.record(result.data);
    return NextResponse.json(
      { ok: true, status: duplicate ? "already_queued" : "queued" },
      { status: 200 },
    );
  } catch (err) {
    // Persistence failed; never leak internals / stack.
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
