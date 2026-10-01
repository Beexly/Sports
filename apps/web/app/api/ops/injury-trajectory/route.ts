/**
 * GET /api/ops/injury-trajectory — READ-ONLY injury trajectory analysis.
 *
 * WHY. The real trajectory analyzer (`analyzeInjuryTrajectory`:
 * Wed/Thu/Fri practice dynamics, official-status anchors, positional spread
 * leverage, early-warning downgrade detection) had no production caller — the
 * only "injury trajectory" in any live path was an inline heuristic in
 * `real-signal-adapters.ts` that never imports the analyzer. This route is
 * the analyzer's first production caller: it reads the stored `injuries`
 * table, maps each row through the explicit, tested mapping in
 * `lib/ops/injury-trajectory-map.ts`, and runs the real analysis.
 *
 * QUERY PARAMS (all optional):
 * - `season=2026&week=5` — defaults to the latest week present in `injuries`.
 * - `team=KC` — filter to one team.
 *
 * HONEST DATA LIMITS (stated in the response, not hidden):
 * - The table stores one snapshot per player-week, so the Wed/Thu/Fri
 *   sequence the analyzer wants collapses to the Friday slot; Wed/Thu are
 *   undefined, and the early-warning downgrade detector cannot fire.
 * - Position leverage tiers are granted only to depthRank-1 players; the
 *   injury row alone never earns one.
 *
 * LAWS OBSERVED:
 * - READS ONLY. Bounded (500 rows). CRON_SECRET Bearer <redacted>.
 * - No gate, no env flag, no schema change. Nothing here touches scoring or
 *   publication; this is the observation layer the engine reads from.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  analyzeInjuryTrajectory,
  type InjuryTrajectoryAnalysis,
} from "@sports/prediction-engine";
import {
  toInjuryPracticeReport,
} from "@/lib/ops/injury-trajectory-map";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TAKE = 500;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const teamFilter = url.searchParams.get("team")?.toUpperCase() ?? null;

    // Resolve season/week: explicit params win, else the latest week stored.
    let season = Number(url.searchParams.get("season"));
    let week = Number(url.searchParams.get("week"));
    if (!Number.isFinite(season) || !Number.isFinite(week)) {
      const latest = await db.injury.findFirst({
        orderBy: [{ season: "desc" }, { week: "desc" }],
        select: { season: true, week: true },
      });
      if (!latest) {
        return NextResponse.json({
          success: true,
          data: { injuries: [], aggregates: null },
          note: "READ-ONLY. The injuries table is empty — nothing to analyze, and no rows were invented.",
        });
      }
      season = latest.season;
      week = latest.week;
    }

    const injuries = await db.injury.findMany({
      where: {
        season,
        week,
        ...(teamFilter ? { team: teamFilter } : {}),
      },
      select: {
        gsisId: true,
        playerName: true,
        team: true,
        position: true,
        reportStatus: true,
        practiceStatus: true,
        primaryInjury: true,
      },
      take: TAKE,
      orderBy: { playerName: "asc" },
    });

    // Depth-chart starters for the same season/week → leverage tiers.
    const gsisIds = [...new Set(injuries.map((i) => i.gsisId).filter(Boolean))] as string[];
    const starters = gsisIds.length > 0
      ? await db.depthChartEntry.findMany({
          where: { season, week, gsisId: { in: gsisIds }, depthRank: 1 },
          select: { gsisId: true },
        })
      : [];
    const starterGsis = new Set(starters.map((s) => s.gsisId));

    const analyzed = injuries.map((inj) => {
      const depthRankOne = !!inj.gsisId && starterGsis.has(inj.gsisId);
      const report = toInjuryPracticeReport(inj, depthRankOne);
      const analysis: InjuryTrajectoryAnalysis = analyzeInjuryTrajectory(report);
      return {
        playerName: inj.playerName,
        team: inj.team,
        position: inj.position,
        reportStatus: inj.reportStatus,
        practiceStatus: inj.practiceStatus,
        primaryInjury: inj.primaryInjury,
        positionTier: report.positionTier,
        estimatedPlayProbability: Number(analysis.estimatedPlayProbability.toFixed(3)),
        trajectoryTrend: analysis.trajectoryTrend,
        spreadImpactPointsIfOut: analysis.spreadImpactPointsIfOut,
        marketOverreactionFadePoints: Number(analysis.marketOverreactionFadePoints.toFixed(2)),
        hasEarlyWarningDowngrade: analysis.hasEarlyWarningDowngrade,
      };
    });

    const aggregates = {
      season,
      week,
      players: analyzed.length,
      estimatedOut: analyzed.filter((a) => a.estimatedPlayProbability < 0.15).length,
      estimatedDoubtful: analyzed.filter(
        (a) => a.estimatedPlayProbability >= 0.15 && a.estimatedPlayProbability < 0.5,
      ).length,
      estimatedQuestionable: analyzed.filter(
        (a) => a.estimatedPlayProbability >= 0.5 && a.estimatedPlayProbability < 0.9,
      ).length,
      estimatedProbable: analyzed.filter((a) => a.estimatedPlayProbability >= 0.9).length,
      totalSpreadLeverageIfAllOut: Number(
        analyzed.reduce((sum, a) => sum + a.spreadImpactPointsIfOut, 0).toFixed(1),
      ),
      leverageTiered: analyzed.filter((a) => a.positionTier !== "STARTER_OTHER").length,
    };

    return NextResponse.json({
      success: true,
      data: { injuries: analyzed, aggregates },
      note:
        "READ-ONLY. Each row ran through the real trajectory analyzer " +
        "(packages/prediction-engine/src/signals/bio/injury-trajectory.ts), not " +
        "the inline heuristic. LIMITS: the injuries table holds one snapshot " +
        "per player-week, so Wed/Thu practice slots are unknown and the " +
        "early-warning downgrade detector cannot fire from this data; leverage " +
        "tiers required a depthRank-1 depth-chart row. Map details: " +
        "apps/web/lib/ops/injury-trajectory-map.ts.",
    });
  } catch (error) {
    captureError(error, { route: "ops/injury-trajectory" });
    return NextResponse.json(
      { success: false, error: "injury-trajectory failed" },
      { status: 500 },
    );
  }
}
