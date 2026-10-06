import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { csrfOriginCheck } from "@/lib/auth/csrf-origin-guard";

/**
 * POST   /api/mobile/v1/devices — register an APNs/Expo push token.
 * DELETE /api/mobile/v1/devices — release one.
 *
 * WHY THIS IS NOT `/api/push/subscribe`:
 * that route takes a browser's `PushSubscription.toJSON()` shape — an `endpoint`
 * URL plus `p256dh` and `auth` keys — and validates it with
 * `parsePushSubscriptionInput`. A native app has none of those. It has an APNs
 * device token (or an Expo push token wrapping one). Reusing the web route would
 * mean loosening its validator until it accepted two unrelated shapes, which is
 * how a validator stops validating.
 *
 * AUTH: required. A device token is a capability to deliver notifications to a
 * human, so it is tied to an account, never accepted anonymously.
 *
 * ENTITLEMENT: the token is STORED for any signed-in tier, but the SEND path
 * gates on `canGetAlerts` (Elite). Storing it is right — a FREE user who
 * upgrades should not have to reinstall to start receiving alerts — and the
 * gate belongs at dispatch, which is where `/api/watchlist` already puts it
 * ("the graded-only send gate is enforced independently in
 * lib/watchlist/alert-eligibility.ts at dispatch time, never inferred
 * client-side").
 *
 * UNIQUENESS: `pushToken` is globally unique. Re-registering the same device
 * upserts in place. A token that moves to a different account is REFUSED with a
 * generic 409 rather than re-owned, matching the information-leak rule the web
 * push route already follows (GSE-SEC-034).
 */

export const dynamic = "force-dynamic";

interface DeviceBody {
  pushToken?: unknown;
  platform?: unknown;
  appVersion?: unknown;
  buildNumber?: unknown;
  deviceModel?: unknown;
  locale?: unknown;
}

function parse(body: unknown): { ok: true; data: Required<DeviceBody> } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: ["Body must be a JSON object"] };
  }
  const b = body as DeviceBody;

  const pushToken = typeof b.pushToken === "string" ? b.pushToken.trim() : "";
  if (!/^[A-Za-z0-9-]{16,256}$/.test(pushToken)) {
    errors.push("pushToken must be a 16-256 character token");
  }
  const platform = typeof b.platform === "string" ? b.platform : "";
  if (platform !== "ios") errors.push('platform must be "ios"');

  const str = (v: unknown, max: number): string =>
    typeof v === "string" ? v.slice(0, max) : "";

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      pushToken,
      platform,
      appVersion: str(b.appVersion, 32),
      buildNumber: str(b.buildNumber, 16),
      deviceModel: str(b.deviceModel, 64),
      locale: str(b.locale, 16),
    },
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = csrfOriginCheck(request.headers.get("origin"), request.headers.get("referer"));
  // Native clients legitimately send no Origin header, unlike a browser, so a
  // missing Origin is ALLOWED here and a PRESENT one must still match. The web
  // route rejects a missing Origin because a browser always has one.
  if (request.headers.get("origin") && !csrf.ok) {
    return NextResponse.json({ success: false, error: csrf.reason }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  const limit = consumeRateLimit("mobile-devices", userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parse(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const existing = await db.mobileDevice.findUnique({ where: { pushToken: d.pushToken } });
    if (existing && existing.userId !== userId) {
      // Do not echo which account owns it — the same information-leak rule the
      // web push route states explicitly.
      return NextResponse.json(
        { success: false, error: "This device is already registered to another account." },
        { status: 409 },
      );
    }

    const row = existing
      ? await db.mobileDevice.update({
          where: { pushToken: d.pushToken },
          data: {
            appVersion: d.appVersion,
            buildNumber: d.buildNumber,
            deviceModel: d.deviceModel,
            locale: d.locale,
            lastSeenAt: new Date(),
          },
        })
      : await db.mobileDevice.create({
          data: {
            userId,
            pushToken: d.pushToken,
            platform: d.platform,
            appVersion: d.appVersion,
            buildNumber: d.buildNumber,
            deviceModel: d.deviceModel,
            locale: d.locale,
          },
        });

    return NextResponse.json({
      success: true,
      data: { id: row.id, createdAt: row.createdAt.toISOString(), reRegistered: Boolean(existing) },
    });
  } catch (error) {
    // A missing table is an honest 503, never a 500 — the pattern
    // `/api/push/subscribe` already established for an unapplied migration.
    const message = error instanceof Error ? error.message : String(error);
    if (/does not exist|relation .* does not exist|P2021/i.test(message)) {
      return NextResponse.json(
        {
          success: false,
          error: "Device registration is not available yet.",
          code: "table_absent",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Could not register this device. Try again." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const pushToken =
    typeof body === "object" && body !== null
      ? (body as { pushToken?: unknown }).pushToken
      : undefined;
  if (typeof pushToken !== "string" || pushToken.length < 16) {
    return NextResponse.json({ success: false, error: "pushToken is required" }, { status: 400 });
  }

  try {
    // Scoped by userId: a caller can only release their OWN token, so a guessed
    // token cannot be used to silence another account's alerts.
    const result = await db.mobileDevice.deleteMany({ where: { userId, pushToken } });
    return NextResponse.json({ success: true, data: { removed: result.count } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not release this device. Try again.", code: "table_absent" },
      { status: 503 },
    );
  }
}
