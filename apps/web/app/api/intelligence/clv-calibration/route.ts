import { NextResponse } from "next/server";
import { loadClvBacktest, type ClvBacktest, type ClvRollup } from "@/lib/intelligence/clv-calibration";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { MIN_HIT_RATE_SAMPLE } from "@/lib/intelligence/hit-rate-display";

export const dynamic = "force-dynamic";

/** A CLV rollup as served over the public JSON export: below
 * `MIN_HIT_RATE_SAMPLE` graded games, `beatCloseRate`/`meanClv` are redacted
 * to `null` and the directional `note` is replaced with an honest
 * insufficient-sample message, rather than asserting "beat the close on
 * average" off a handful of games. */
export type PublicClvRollup = Omit<ClvRollup, "meanClv" | "beatCloseRate"> & {
  readonly meanClv: number | null;
  readonly beatCloseRate: number | null;
};

/**
 * `rollupClv()` has no minimum-sample floor by design — it is core, reused
 * math with its own tests (clv-calibration.test.ts) asserting exact values
 * at count=1 and count=3. This JSON export is the public-facing boundary, and
 * is one click away via the "JSON" button on /intelligence/engines?engine=clv
 * even though the rendered ClvView never displays these rollup fields today.
 */
export function redactThinClvRollup(rollup: ClvRollup): PublicClvRollup {
  if (rollup.count >= MIN_HIT_RATE_SAMPLE) return rollup;
  return {
    ...rollup,
    meanClv: null,
    beatCloseRate: null,
    note: `Only ${rollup.count} graded game${rollup.count === 1 ? "" : "s"} so far — too few to claim beating or trailing the close. Self-grade, not a pick.`,
  };
}

export type PublicClvBacktest = Omit<ClvBacktest, "spread" | "total"> & {
  readonly spread: PublicClvRollup;
  readonly total: PublicClvRollup;
};

export function redactUnpublishedClvBacktest(backtest: ClvBacktest): PublicClvBacktest {
  return {
    ...backtest,
    spread: redactThinClvRollup(backtest.spread),
    total: redactThinClvRollup(backtest.total),
  };
}

export async function GET(): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("intelligence/clv-calibration");
  if (denied) return denied;
  const data = await loadClvBacktest();
  return NextResponse.json({ success: data.status !== "source-error", data: redactUnpublishedClvBacktest(data) });
}
