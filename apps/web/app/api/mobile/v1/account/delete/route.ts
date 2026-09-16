import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { db } from "@sports/db";
import { consumeRateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/mobile/v1/account/delete
 *
 * App Store Review guideline 5.1.1(v): an app that lets a user create an account
 * must let them delete it FROM INSIDE THE APP. A link to a web form does not
 * satisfy it. This route is that requirement's server half.
 *
 * ── WHAT IS DELETED ──────────────────────────────────────────────────────────
 * The account row, which cascades to sessions, subscriptions, watchlist entries
 * and registered devices.
 *
 * ── WHAT IS KEPT, AND WHY ────────────────────────────────────────────────────
 * Published picks are NOT deleted.
 *
 * They were published, they settled, and they appear in a track record whose
 * entire claim is that it is checkable. Deleting them would remove results from
 * that record — and it would do so selectively, in whichever direction the
 * deleting users happened to fall. That is the shape of a flattering edit, even
 * when nobody intended one.
 *
 * So the account is severed from the picks rather than the picks being removed.
 * Picks carry no user identifier today (`Pick` has no owner FK); if one is ever
 * added, this route must null it rather than cascade, and that constraint is
 * written here so the next person does not have to rediscover the reasoning.
 *
 * The client states this distinction on screen BEFORE the user confirms
 * (`app/settings.tsx`), because a user deserves to know what survives the
 * action they are about to take.
 *
 * ── IDEMPOTENCY ──────────────────────────────────────────────────────────────
 * Deleting an already-deleted account is a success, not a 404. The user asked
 * for the account to be gone; it is gone. Reporting an error would invite a
 * retry loop against an action that cannot succeed.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email ?? null;

  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const limit = consumeRateLimit("mobile-account-delete", userId, 3, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = body as { confirm?: unknown; confirmation?: unknown };
  if (parsed.confirm !== true) {
    return NextResponse.json(
      { success: false, error: "Deletion must be explicitly confirmed." },
      { status: 400 },
    );
  }

  /*
   * The typed confirmation is the account's own email.
   *
   * This is a server-side check, not a UI nicety: the client's input field can
   * be bypassed with a single curl, so the guard has to live here to mean
   * anything. Comparing against the SESSION's email (never a body-supplied one)
   * is what makes it a confirmation rather than a field.
   */
  const supplied = typeof parsed.confirmation === "string" ? parsed.confirmation.trim().toLowerCase() : "";
  if (!email || supplied !== email.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        error: "The confirmation did not match the account email.",
        code: "confirmation_mismatch",
      },
      { status: 400 },
    );
  }

  try {
    // HARD delete of the account row. Everything account-scoped cascades from
    // the User FK (sessions, accounts, subscriptions, watchlist, devices), which
    // is why the cascade is declared on the relation rather than cleaned up here
    // — a manual cleanup list is a list that goes stale.
    await db.user.delete({ where: { id: userId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // P2025 = record not found. Already deleted is success; see the header.
    if (!/P2025/.test(message)) {
      return NextResponse.json(
        { success: false, error: "Could not delete the account. Nothing was changed." },
        { status: 503 },
      );
    }
  }

  // Drop the session cookie too. Leaving a valid session pointing at a deleted
  // user means the next request authenticates against nothing and produces a
  // confusing 503 on every surface.
  try {
    await signOut({ redirect: false });
  } catch {
    // A failed sign-out does not undo the deletion; the client also clears its
    // own Keychain entry on success.
  }

  return NextResponse.json({
    success: true,
    data: {
      deleted: true,
      // Stated explicitly so the client can render it without re-deriving the
      // policy: the published record survives, unlinked.
      retained: "published_picks_unlinked",
    },
  });
}
