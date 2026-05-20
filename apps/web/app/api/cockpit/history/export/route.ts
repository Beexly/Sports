/**
 * /api/cockpit/history/export — CSV export of the forensic pick ledger.
 *
 * Admin-gated. Returns text/csv built by `buildHistoryCsv()` from the same
 * eligibility evaluator the /cockpit/history page uses. The intent is that
 * an operator can dump the current state of the ledger into a spreadsheet
 * for audit, reconciliation, or sharing without exposing the cockpit URL.
 *
 * Filters are read from the same query-string vocabulary as the page so
 * "export what I'm looking at" round-trips cleanly.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluatePickEligibility,
  buildHistoryCsv,
  type CsvExportRow,
  type HistoricalPickRow,
} from "@/lib/cockpit/history";

const RESULT_FILTERS = ["PENDING", "WIN", "LOSS", "PUSH", "VOID"] as const;
const TAKE = 500; // higher than the page so a single export captures more.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resultParam = (searchParams.get("result") ?? "ALL").toUpperCase();
  const bootstrapParam = searchParams.get("bootstrap");
  const publishedParam = searchParams.get("published");
  const sportParam = searchParams.get("sport");
  const modelParam = searchParams.get("model");
  const eligibleParam = searchParams.get("eligible");
  const learningParam = searchParams.get("learning");

  const where: Record<string, unknown> = {};
  if (
    RESULT_FILTERS.includes(resultParam as (typeof RESULT_FILTERS)[number]) &&
    resultParam !== "ALL"
  ) {
    where["result"] = resultParam;
  }
  if (bootstrapParam === "true") where["isBootstrap"] = true;
  if (bootstrapParam === "false") where["isBootstrap"] = false;
  if (publishedParam === "true") where["isPublished"] = true;
  if (publishedParam === "false") where["isPublished"] = false;
  if (modelParam) where["modelVersion"] = modelParam;
  if (sportParam) {
    where["game"] = {
      sport: { name: { contains: sportParam, mode: "insensitive" } },
    };
  }

  const gates = getReadinessGates();

  const picks = await db.pick.findMany({
    where,
    include: {
      game: { include: { sport: { select: { name: true } } } },
      signalSnapshot: {
        select: {
          id: true,
          dataQualityScore: true,
          eligibleForLearning: true,
          isBootstrap: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
    take: TAKE,
  });

  const rows: CsvExportRow[] = picks
    .map((p) => {
      const historicalRow: HistoricalPickRow = {
        id: p.id,
        result: p.result,
        isBootstrap: p.isBootstrap,
        isPublished: p.isPublished,
        settledAt: p.settledAt,
        hasSnapshot: p.signalSnapshot !== null,
        snapshotEligibleForLearning: p.signalSnapshot?.eligibleForLearning ?? null,
      };
      const eligibility = evaluatePickEligibility(historicalRow, {
        canExposePerformanceStats: gates.canExposePerformanceStats,
      });
      const row: CsvExportRow = {
        id: p.id,
        generatedAt: p.generatedAt,
        settledAt: p.settledAt,
        sport: p.game.sport.name,
        matchup: `${p.game.awayTeamName} @ ${p.game.homeTeamName}`,
        pickType: p.pickType,
        selection: p.selection,
        line: p.line,
        confidence: p.confidence,
        pickGrade: p.pickGrade,
        riskLevel: p.riskLevel,
        modelVersion: p.modelVersion,
        bookmakerCount: p.bookmakerCount,
        edgeScore: p.edgeScore,
        consensusPct: p.consensusPct,
        result: p.result,
        isBootstrap: p.isBootstrap,
        isPublished: p.isPublished,
        isFeatured: p.isFeatured,
        hasSnapshot: historicalRow.hasSnapshot,
        publicPerformanceEligible: eligibility.publicPerformanceEligible,
        learningEligible: eligibility.learningEligible,
        exclusionReasons: eligibility.exclusionReasons,
      };
      return row;
    })
    // Computed-field post-filters (the same way the page applies them).
    .filter((r) => {
      if (eligibleParam === "true" && !r.publicPerformanceEligible) return false;
      if (eligibleParam === "false" && r.publicPerformanceEligible) return false;
      if (learningParam === "true" && !r.learningEligible) return false;
      if (learningParam === "false" && r.learningEligible) return false;
      return true;
    });

  const csv = buildHistoryCsv(rows);
  const filename = `cockpit-history-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
