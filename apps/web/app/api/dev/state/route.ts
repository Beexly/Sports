import { NextResponse } from "next/server";
import { getReadinessGates } from "@sports/prediction-engine";
import { isStubMode, isDemoPicksEnabled, SAMPLE_PICK_COUNT } from "@sports/db";

/**
 * /api/dev/state — small JSON snapshot of dev-mode flags + readiness
 * gates so an operator can curl the running server and instantly see
 * what mode it's in. Disabled in production (returns 404).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env["NODE_ENV"] === "production") {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const gates = getReadinessGates();
  return NextResponse.json({
    nodeEnv: process.env["NODE_ENV"] ?? "unknown",
    appVersion: process.env["npm_package_version"] ?? "dev",
    timestamp: new Date().toISOString(),
    stubMode: isStubMode(),
    demoPicksEnabled: isDemoPicksEnabled(),
    samplePickCount: SAMPLE_PICK_COUNT,
    devFakeAdmin: process.env["DEV_FAKE_ADMIN"] === "true",
    gates: {
      canExposePublicPicks: gates.canExposePublicPicks,
      canExposePerformanceStats: gates.canExposePerformanceStats,
      canPersistCanonicalHistory: gates.canPersistCanonicalHistory,
      isBootstrapMode: gates.isBootstrapMode,
      minSettledPicksForLearning: gates.minSettledPicksForLearning,
    },
    externalConfig: {
      databaseUrlSet: !!process.env["DATABASE_URL"] && process.env["DATABASE_URL"] !== "stub",
      theOddsApiKeySet: !!process.env["THE_ODDS_API_KEY"],
      anthropicApiKeySet: !!process.env["ANTHROPIC_API_KEY"],
      googleOauthSet: !!process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_ID"] !== "dev-noop",
      stripeSet: !!process.env["STRIPE_SECRET_KEY"],
    },
  });
}
