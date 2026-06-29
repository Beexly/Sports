/**
 * GSE Founding Waitlist — local submission handler.
 *
 * Local-only: validates the lead, enforces the consent gate, and records it to
 * the local-file fallback store. It does NOT send any email, call any external
 * service, change pricing, touch Stripe, flip a flag, or publish anything. The
 * confirmation / follow-up emails in `docs/gse/` remain draft-only and
 * owner-gated.
 */

import { NextResponse } from "next/server";
import { validateWaitlistLead } from "@/lib/gse/waitlist-validation";
import { createWaitlistStore } from "@/lib/gse/waitlist-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
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
    const store = createWaitlistStore();
    const { duplicate } = await store.record(result.data);
    return NextResponse.json(
      { ok: true, status: duplicate ? "already_queued" : "queued" },
      { status: 200 },
    );
  } catch {
    // Local persistence failed; never leak internals.
    return NextResponse.json(
      { ok: false, error: "Could not record locally" },
      { status: 500 },
    );
  }
}
