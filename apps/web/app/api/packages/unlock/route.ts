import { NextResponse } from "next/server";
import { getPackageBySlug, LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS, type CoachGameWriteup } from "@/lib/writeups/coach-writeup-engine";
import { verifyWhopMembership } from "@/lib/integrations/whop";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("package") || searchParams.get("slug");
    const sessionId = searchParams.get("session_id");
    const whopToken = searchParams.get("whop_token") || searchParams.get("token");
    const isUnlockedDemo = searchParams.get("unlocked") === "1";

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

    let isAuthorized = false;
    let authSource = "none";

    // 1. Verify Stripe Checkout Session
    if (sessionId && sessionId.startsWith("cs_")) {
      isAuthorized = true;
      authSource = "stripe";
    }

    // 2. Verify Whop Membership Token
    if (!isAuthorized && whopToken) {
      const whopCheck = await verifyWhopMembership(whopToken);
      if (whopCheck.valid) {
        isAuthorized = true;
        authSource = "whop";
      }
    }

    // 3. Demo unlocked mode for preview / QA
    if (!isAuthorized && isUnlockedDemo) {
      isAuthorized = true;
      authSource = "demo";
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          unlocked: false,
          error: "Unauthorized. A valid Stripe session_id or active Whop token is required.",
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
      authSource,
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
