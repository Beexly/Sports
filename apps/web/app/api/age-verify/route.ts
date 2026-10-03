/**
 * POST /api/age-verify — sets the 21+ attestation cookie and bounces back to
 * the requested surface. Excluded from middleware by the matcher's api/ rule.
 *
 * "next" is validated with safeAgeRedirect: same-origin relative paths only,
 * so this route can never be pointed at an external host.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  AGE_COOKIE,
  AGE_COOKIE_MAX_AGE_SECONDS,
  safeAgeRedirect,
} from "@/lib/age-verify/surface";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData().catch(() => null);
  const next = safeAgeRedirect(form?.get("next")?.toString());
  const under21 = form?.get("answer") === "under";

  const target = under21 ? "/responsible-play" : next;
  const res =
    target === "/responsible-play"
      ? NextResponse.redirect(new URL("/responsible-play", request.url), 303)
      : NextResponse.redirect(new URL(target, request.url), 303);

  if (!under21) {
    res.cookies.set(AGE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AGE_COOKIE_MAX_AGE_SECONDS,
    });
  }
  return res;
}
