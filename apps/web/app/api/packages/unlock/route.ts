import { NextResponse } from "next/server";
import { getPackageBySlug } from "@/lib/packages/catalog";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  filterWriteupsForWindowSlot,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";
import { signUnlockCookie, verifyUnlockCookie } from "@/lib/packages/unlock-cookie";

function extractCookieValue(cookieHeader: string, cookieName: string): string | null {
  if (!cookieHeader || !cookieName) return null;
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === cookieName) {
      const raw = part.slice(eqIdx + 1).trim();
      try {
        return raw ? decodeURIComponent(raw) : null;
      } catch {
        return raw || null;
      }
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("package") || searchParams.get("slug");
    const sessionId = searchParams.get("session_id");
    const whopToken = searchParams.get("whop_token") || searchParams.get("token");

    const cookieHeader = req.headers.get("cookie") || "";
    const rawSlugCookie = slug ? extractCookieValue(cookieHeader, `gse_unlock_${slug}`) : null;
    const verifiedCookie = slug ? verifyUnlockCookie(rawSlugCookie, slug) : { valid: false, sessionId: null };
    const effectiveSessionId = sessionId || (verifiedCookie.valid ? verifiedCookie.sessionId : null);

    if (!slug) {
      return NextResponse.json(
        { unlocked: false, error: "Missing required 'package' parameter." },
        { status: 400 },
      );
    }

    const pkg = getPackageBySlug(slug);
    if (!pkg) {
      return NextResponse.json(
        { unlocked: false, error: `Package '${slug}' not found.` },
        { status: 404 },
      );
    }

    const verification = await verifyPackagePurchase({
      sessionId: effectiveSessionId,
      whopToken,
      slug: pkg.slug,
    });

    if (!verification.authorized) {
      return NextResponse.json(
        {
          unlocked: false,
          error: "Unauthorized. A verified paid Stripe session_id or active Whop membership token is required.",
        },
        { status: 401 },
      );
    }

    // Match relevant writeups for package window via shared filter helper
    const writeups: CoachGameWriteup[] = filterWriteupsForWindowSlot(
      LIVE_SLATE_COACH_WRITEUPS,
      pkg.windowSlot,
    );

    const res = NextResponse.json({
      unlocked: true,
      authSource: verification.authSource,
      package: pkg,
      writeups,
    });

    if (effectiveSessionId) {
      const signedCookieVal = signUnlockCookie({
        sessionId: effectiveSessionId,
        slug: pkg.slug,
      });
      if (signedCookieVal) {
        const isProd = process.env.NODE_ENV === "production";
        res.cookies.set(`gse_unlock_${pkg.slug}`, signedCookieVal, {
          httpOnly: true,
          secure: isProd,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
        });
      }
    }

    return res;
  } catch {
    // The declaration was unused (eslint no-unused-vars) and the message was
    // deliberately generic: a public unlock endpoint does not echo internals.
    return NextResponse.json(
      { unlocked: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
