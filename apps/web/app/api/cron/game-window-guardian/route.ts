import { NextResponse } from "next/server";
import {
  LIVE_PACKAGE_CATALOG,
  WEEK8_SPECIALTY_PACK_TIERS,
  WEEK10_TNF_KICKOFF_UTC,
  WEEK10_SUN_MAIN_KICKOFF_UTC,
  WEEK10_MNF_KICKOFF_UTC,
  isWindowOpenBeforeKickoff,
} from "@/lib/packages/catalog";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface GameWindowGuardianReport {
  ok: boolean;
  routine: "game-window-guardian";
  llmTokensUsed: 0;
  evaluatedAtUtc: string;
  activeWeek: number;
  merkleRootSha256: string;
  windowChecks: {
    tnfKickoffUtc: string;
    tnfOpen: boolean;
    sunMainKickoffUtc: string;
    sunMainOpen: boolean;
    mnfKickoffUtc: string;
    mnfOpen: boolean;
  };
  expiredForSaleViolations: string[];
  leakedPathViolations: string[];
  ledgerArithmeticConsistent: boolean;
  reconciledScopes: {
    week8Staked: string;
    week8Base: string;
    week8AllIn: string;
    weeks8To9Staked: string;
    weeks8To9AllIn: string;
  };
}

export function evaluateGameWindowGuardian(now: Date = new Date()): GameWindowGuardianReport {
  const slate = getCurrentWeek10Slate();
  const s = slate.scopes;

  const tnfOpen = isWindowOpenBeforeKickoff(WEEK10_TNF_KICKOFF_UTC, now);
  const sunMainOpen = isWindowOpenBeforeKickoff(WEEK10_SUN_MAIN_KICKOFF_UTC, now);
  const mnfOpen = isWindowOpenBeforeKickoff(WEEK10_MNF_KICKOFF_UTC, now);

  const allPacks = [...LIVE_PACKAGE_CATALOG, ...WEEK8_SPECIALTY_PACK_TIERS];
  const expiredForSaleViolations: string[] = [];
  const leakedPathViolations: string[] = [];

  for (const pkg of allPacks) {
    if (pkg.windowSlot === "TNF" && !tnfOpen && pkg.forSale) {
      expiredForSaleViolations.push(`${pkg.slug}: TNF pack still forSale after ${WEEK10_TNF_KICKOFF_UTC}`);
    }
    if (pkg.windowSlot === "SUN_MAIN" && !sunMainOpen && pkg.forSale) {
      expiredForSaleViolations.push(`${pkg.slug}: SUN_MAIN pack still forSale after ${WEEK10_SUN_MAIN_KICKOFF_UTC}`);
    }
    if ((pkg.windowSlot === "MNF" || pkg.windowSlot === "FULL_WEEK") && !mnfOpen && pkg.forSale) {
      expiredForSaleViolations.push(`${pkg.slug}: ${pkg.windowSlot} pack still forSale after ${WEEK10_MNF_KICKOFF_UTC}`);
    }
    const serialized = JSON.stringify(pkg);
    if (/Dad_Top20|data\/dfs\/|Golden Ratio Technologies|Golden State Insights|62-23-1|71\.2%/i.test(serialized)) {
      leakedPathViolations.push(`${pkg.slug}: contains banned phrase or leaked internal path`);
    }
  }

  const ledgerArithmeticConsistent =
    s.week8_staked_main_and_tnf.record === "36-13-1" &&
    s.week8_staked_main_and_tnf.n === 50 &&
    s.week8_base_with_mnf_main.record === "38-13-1" &&
    s.week8_base_with_mnf_main.n === 52 &&
    s.week8_all_in_with_gated_props.record === "47-19-1" &&
    s.week8_all_in_with_gated_props.n === 67 &&
    s.weeks8_9_cumulative_staked.record === "43-17-1" &&
    s.weeks8_9_cumulative_staked.n === 61 &&
    s.weeks8_9_cumulative_all_in.record === "54-23-1" &&
    s.weeks8_9_cumulative_all_in.n === 78;

  const ok =
    slate.activeWeek === 10 &&
    expiredForSaleViolations.length === 0 &&
    leakedPathViolations.length === 0 &&
    ledgerArithmeticConsistent;

  return {
    ok,
    routine: "game-window-guardian",
    llmTokensUsed: 0,
    evaluatedAtUtc: now.toISOString(),
    activeWeek: slate.activeWeek,
    merkleRootSha256: slate.merkleRootSha256,
    windowChecks: {
      tnfKickoffUtc: WEEK10_TNF_KICKOFF_UTC,
      tnfOpen,
      sunMainKickoffUtc: WEEK10_SUN_MAIN_KICKOFF_UTC,
      sunMainOpen,
      mnfKickoffUtc: WEEK10_MNF_KICKOFF_UTC,
      mnfOpen,
    },
    expiredForSaleViolations,
    leakedPathViolations,
    ledgerArithmeticConsistent,
    reconciledScopes: {
      week8Staked: `${s.week8_staked_main_and_tnf.record} (${s.week8_staked_main_and_tnf.net_units_display}, n=${s.week8_staked_main_and_tnf.n})`,
      week8Base: `${s.week8_base_with_mnf_main.record} (${s.week8_base_with_mnf_main.net_units_display}, n=${s.week8_base_with_mnf_main.n})`,
      week8AllIn: `${s.week8_all_in_with_gated_props.record} (${s.week8_all_in_with_gated_props.net_units_display}, n=${s.week8_all_in_with_gated_props.n})`,
      weeks8To9Staked: `${s.weeks8_9_cumulative_staked.record} (${s.weeks8_9_cumulative_staked.net_units_display}, n=${s.weeks8_9_cumulative_staked.n})`,
      weeks8To9AllIn: `${s.weeks8_9_cumulative_all_in.record} (${s.weeks8_9_cumulative_all_in.net_units_display}, n=${s.weeks8_9_cumulative_all_in.n})`,
    },
  };
}

export async function GET() {
  const report = evaluateGameWindowGuardian();
  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}
