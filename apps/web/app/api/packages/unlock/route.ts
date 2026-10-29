import { NextResponse } from "next/server";
import { getPackageBySlug } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS, type CoachGameWriteup } from "@/lib/writeups/coach-writeup-engine";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("package") || searchParams.get("slug");
    const sessionId = searchParams.get("session_id");
    const whopToken = searchParams.get("whop_token") || searchParams.get("token");

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
      sessionId,
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

    // Match relevant writeups for package window
    const writeups: CoachGameWriteup[] = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
      if (pkg.windowSlot === "WEEKEND_PASS" || pkg.windowSlot === "WEEKLY_PASS") {
        return true;
      }
      if (pkg.windowSlot === "SUN_MAIN") {
        return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
      }
      return w.windowSlot === pkg.windowSlot;
    });

    return NextResponse.json({
      unlocked: true,
      authSource: verification.authSource,
      package: pkg,
      writeups,
    });
  } catch (error: any) {
    return NextResponse.json(
      { unlocked: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
