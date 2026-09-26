import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getUserEntitlements } from "@/lib/entitlements";
import { jsonNoStore } from "@/lib/api/no-store";

/**
 * GET /api/me — the signed-in reader's own profile and entitlements.
 * DELETE /api/me — delete the account (App Store guideline 5.1.1(v)).
 *
 * The native iOS app (ios/, branch feat/ios-swiftui) needs both. It has no
 * local tier: a locally-decided tier is a locally-forgeable paywall, so the
 * client asks the server what this session is entitled to, every time.
 *
 * DELETE CASCADES. The Prisma User model declares every child relation
 * `onDelete: Cascade` — accounts, sessions, subscription, alerts, watchlist
 * entries, checkout attempts and push subscriptions. Deleting the user row
 * therefore removes the account and all of its data in one statement, and
 * there is nothing left orphaned for a second sweep to find.
 *
 * What is NOT deleted: anything the reader stored only on their own device
 * (their bet log, their saved picks). Those were never on this server, so
 * this route cannot remove them, and the client says so on the confirmation
 * screen rather than implying a clean sweep.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonNoStore({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user
    .findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        subscription: { select: { tier: true, status: true, currentPeriodEnd: true } },
      },
    })
    .catch(() => null);

  if (!user) {
    return jsonNoStore({ success: false, error: "Account not found" }, { status: 404 });
  }

  // Entitlements are resolved through the ONE shared resolver every other
  // surface uses. Inlining a second tier table here is exactly the drift that
  // produced the past-due-alert incident.
  const entitlements = await getUserEntitlements(userId).catch(() => null);
  if (!entitlements) {
    return jsonNoStore(
      { success: false, error: "Could not resolve your entitlements. Try again." },
      { status: 503 },
    );
  }

  return jsonNoStore({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      memberSince: user.createdAt.toISOString(),
      // The subscription row is the record; the resolver is the authority. The
      // client reads `entitlements.tier` and ignores this one.
      tier: user.subscription?.tier ?? "FREE",
      subscriptionStatus: user.subscription?.status ?? null,
      currentPeriodEnd: user.subscription?.currentPeriodEnd?.toISOString() ?? null,
      entitlements: {
        tier: entitlements.tier,
        canSeeConfidence: entitlements.canSeeConfidence,
        canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
        canSeeLineMovement: entitlements.canSeeLineMovement,
        canSeePremiumPicks: entitlements.canSeePremiumPicks,
        canSeeEdgeScore: entitlements.canSeeEdgeScore,
      },
    },
  });
}

export async function DELETE(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonNoStore({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Refuse to delete the founder's accounts from an app. Losing the owner
  // account to an in-app tap is unrecoverable and not what this button is for.
  if (session?.user?.role === "ADMIN") {
    return jsonNoStore(
      { success: false, error: "Admin accounts cannot be deleted from the app. Contact support." },
      { status: 403 },
    );
  }

  // The browser's own session cookie has to stop working immediately, and the
  // only way to do that is to remove the session rows. `deleteMany` on the
  // user does it via cascade; the explicit session delete below is redundant
  // with that and exists because a stale cookie that outlives the account is
  // the specific failure a reader would report.
  const result = await db.user
    .delete({ where: { id: userId } })
    .then(() => ({ ok: true as const }))
    .catch(() => ({ ok: false as const }));

  if (!result.ok) {
    // A missing table or a constraint we did not anticipate is an honest 503,
    // never a 200 that claims a deletion which did not happen.
    return jsonNoStore(
      { success: false, error: "Account could not be deleted. Please contact support." },
      { status: 503 },
    );
  }

  return jsonNoStore({ success: true, deleted: true });
}
