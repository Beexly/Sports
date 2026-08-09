/**
 * Internal Operator Dashboard API
 *
 * Returns a complete snapshot of system health, picks, signals, and performance
 * for the internal operator dashboard. Admin-only. No public exposure.
 *
 * All dates returned as ISO strings for safe JSON serialization.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";


export const dynamic = "force-dynamic";

// ─── Shared types (imported by dashboard-view.tsx) ────────────────────────

export type DepthLabel = "THIN" | "MEDIUM" | "DEEP";

export type RunSummary = {
  id: string;
  sport: string | null;
  status: string;
  gamesUpserted: number;
  oddsInserted: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
};

export type GameSummary = {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  bookmakerCoverageMax: number;
  dataQualityScore: number;
  lineMovementSpread: number | null;
  picks: Array<{
    id: string;
    pickType: string;
    confidence: number;
    pickGrade: string;
    isBootstrap: boolean;
    depth: DepthLabel;
  }>;
};

export type SnapshotDetail = {
  hadOddsSignal: boolean;
  hadLineMovementSignal: boolean;
  hadRestSignal: boolean;
  hadScheduleSignal: boolean;
  hadAtsFormSignal: boolean;
  hadH2HSignal: boolean;
  hadVenueSignal: boolean;
  hadWeatherSignal: boolean;
  hadInjurySignal: boolean;
  hadRatingsSignal: boolean;
  bookmakerCount: number;
  dataQualityScore: number;
  lineMovementDelta: number | null;
  restAdvantageNet: number | null;
  atsFormSampleSize: number | null;
  h2hSampleSize: number | null;
  scheduleDensityHome: number | null;
  scheduleDensityAway: number | null;
  usedDerivedHistory: boolean;
  usedScheduleSignal: boolean;
  eligibleForLearning: boolean;
  modelVersion: string;
};

export type PickSummary = {
  id: string;
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  pickType: string;
  selection: string;
  line: number | null;
  confidence: number;
  edgeScore: number;
  pickGrade: string;
  riskLevel: string;
  tier: string;
  bookmakerCount: number;
  dataQualityScore: number;
  isBootstrap: boolean;
  isFeatured: boolean;
  depth: DepthLabel;
  isPublicEligible: boolean;
  willBeLearningEligible: boolean;
  reasoningShort: string | null;
  reasoning: string;
  factorBreakdown: Record<string, number> | null;
  modelVersion: string;
  generatedAt: string;
  dataFreshnessAt: string | null;
  snapshot: SnapshotDetail | null;
};

export type SettledSummary = {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  pickType: string;
  selection: string;
  line: number | null;
  confidence: number;
  pickGrade: string;
  result: string;
  isBootstrap: boolean;
  depth: DepthLabel;
  eligibleForLearning: boolean;
  settledAt: string;
  bookmakerCount: number;
  dataQualityScore: number;
};

export type PerfBand = {
  label: string;
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number | null;
};

export type PerformanceData = {
  sampleSizeWarning: boolean;
  canonicalTotal: number;
  overall: { wins: number; losses: number; pushes: number; winRate: number | null };
  bySport: PerfBand[];
  byPickType: PerfBand[];
  byGrade: PerfBand[];
  byConfidenceBand: PerfBand[];
  byDepth: PerfBand[];
};

export type SignalCoverage = {
  totalGameSignals: number;
  byCategory: Array<{ category: string; count: number }>;
  snapshots: {
    total: number;
    canonical: number;
    learningEligible: number;
    withAtsForm: number;
    withH2H: number;
    withSchedule: number;
    withLineMovement: number;
    withRest: number;
    withVenue: number;
  };
  depthDistribution: { thin: number; medium: number; deep: number };
};

export type DashboardData = {
  fetchedAt: string;
  systemHealth: {
    mode: "BOOTSTRAP" | "CANONICAL";
    gates: {
      canPersistCanonicalHistory: boolean;
      canUseDerivedHistory: boolean;
      canExposePublicPicks: boolean;
      canPromoteFeaturedPicks: boolean;
      canPublishContent: boolean;
      canExposePerformanceStats: boolean;
      canLearnFromOutcomes: boolean;
    };
    latestRun: RunSummary | null;
    latestSuccessAt: string | null;
    latestSettlementAt: string | null;
    canonicalPickCount: number;
    bootstrapPickCount: number;
    warnings: string[];
  };
  recentRuns: RunSummary[];
  upcomingGames: GameSummary[];
  currentPicks: PickSummary[];
  recentlySettled: SettledSummary[];
  performance: PerformanceData;
  signalCoverage: SignalCoverage;
};

// ─── Helpers ──────────────────────────────────────────────────────────────

type SnapFields = {
  bookmakerCount: number;
  dataQualityScore: number;
  hadAtsFormSignal: boolean;
  hadH2HSignal: boolean;
  hadScheduleSignal: boolean;
  hadLineMovementSignal: boolean;
  hadRestSignal: boolean;
  hadVenueSignal: boolean;
};

function computeDepth(snap: SnapFields | null, bookmakerCount: number): DepthLabel {
  if (!snap) {
    if (bookmakerCount < 3) return "THIN";
    if (bookmakerCount >= 7) return "DEEP";
    return "MEDIUM";
  }
  const active = [
    snap.hadLineMovementSignal,
    snap.hadRestSignal,
    snap.hadScheduleSignal,
    snap.hadAtsFormSignal,
    snap.hadH2HSignal,
    snap.hadVenueSignal,
  ].filter(Boolean).length;
  const books = snap.bookmakerCount;
  if (active <= 1 || books < 3) return "THIN";
  if (active >= 4 && books >= 6) return "DEEP";
  return "MEDIUM";
}

function winRate(wins: number, losses: number): number | null {
  const decisive = wins + losses;
  return decisive > 0 ? Math.round((wins / decisive) * 1000) / 10 : null;
}

type PerfPick = {
  result: string;
  confidence: number;
  pickType: string;
  pickGrade: string;
  sport: string;
  depth: DepthLabel;
};

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
}

function summarize(picks: PerfPick[]): { wins: number; losses: number; pushes: number; total: number; winRate: number | null } {
  const wins = picks.filter((p) => p.result === "WIN").length;
  const losses = picks.filter((p) => p.result === "LOSS").length;
  const pushes = picks.filter((p) => p.result === "PUSH").length;
  return { wins, losses, pushes, total: picks.length, winRate: winRate(wins, losses) };
}

function confidenceBand(c: number): string {
  if (c >= 90) return "90-100";
  if (c >= 80) return "80-89";
  if (c >= 70) return "70-79";
  if (c >= 60) return "60-69";
  return "50-59";
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const gates = getReadinessGates();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const [
    recentRunsRaw,
    latestSuccessfulRaw,
    latestSettledRaw,
    pickCountsRaw,
    upcomingGamesRaw,
    currentPicksRaw,
    recentlySettledRaw,
    signalGroupedRaw,
    allSnapshotsRaw,
    settledCanonicalRaw,
  ] = await Promise.all([
    // Last 15 ingestion runs
    db.ingestionRun.findMany({ orderBy: { startedAt: "desc" }, take: 15 }),

    // Latest successful run (for freshness check)
    db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
    }),

    // Latest settled pick (for settlement timestamp)
    db.pick.findFirst({
      where: { settledAt: { not: null } },
      orderBy: { settledAt: "desc" },
      select: { settledAt: true },
    }),

    // Bootstrap vs canonical pick counts
    db.pick.groupBy({ by: ["isBootstrap"], _count: { id: true } }),

    // Upcoming + very recent games (±2h / +48h window) with picks
    db.game.findMany({
      where: { commenceTime: { gte: twoHoursAgo, lte: twoDaysFromNow } },
      include: {
        sport: { select: { displayName: true } },
        picks: {
          select: {
            id: true,
            pickType: true,
            confidence: true,
            pickGrade: true,
            isBootstrap: true,
            bookmakerCount: true,
            signalSnapshot: {
              select: {
                bookmakerCount: true,
                dataQualityScore: true,
                hadAtsFormSignal: true,
                hadH2HSignal: true,
                hadScheduleSignal: true,
                hadLineMovementSignal: true,
                hadRestSignal: true,
                hadVenueSignal: true,
              },
            },
          },
        },
      },
      orderBy: { commenceTime: "asc" },
      take: 30,
    }),

    // Pending picks from the last 7 days — full detail for the picks table
    db.pick.findMany({
      where: {
        result: "PENDING",
        generatedAt: { gte: sevenDaysAgo },
      },
      include: {
        game: { include: { sport: { select: { displayName: true } } } },
        signalSnapshot: true,
      },
      orderBy: { generatedAt: "desc" },
      take: 120,
    }).then((rows) => [...rows].sort(comparePicksByRanking).slice(0, 60)),

    // Recently settled picks
    db.pick.findMany({
      where: {
        result: { in: ["WIN", "LOSS", "PUSH"] },
        settledAt: { gte: sevenDaysAgo },
      },
      include: {
        game: { include: { sport: { select: { displayName: true } } } },
        signalSnapshot: {
          select: {
            bookmakerCount: true,
            dataQualityScore: true,
            hadAtsFormSignal: true,
            hadH2HSignal: true,
            hadScheduleSignal: true,
            hadLineMovementSignal: true,
            hadRestSignal: true,
            hadVenueSignal: true,
            eligibleForLearning: true,
          },
        },
      },
      orderBy: { settledAt: "desc" },
      take: 30,
    }),

    // GameSignal counts by category
    db.gameSignal.groupBy({ by: ["sourceCategory"], _count: { id: true } }),

    // All PickSignalSnapshots (for coverage stats — manageable at current scale)
    db.pickSignalSnapshot.findMany({
      select: {
        isBootstrap: true,
        eligibleForLearning: true,
        hadAtsFormSignal: true,
        hadH2HSignal: true,
        hadScheduleSignal: true,
        hadLineMovementSignal: true,
        hadRestSignal: true,
        hadVenueSignal: true,
        bookmakerCount: true,
        dataQualityScore: true,
      },
    }),

    // Settled canonical picks for performance aggregation
    db.pick.findMany({
      where: { result: { in: ["WIN", "LOSS", "PUSH"] }, isBootstrap: false },
      select: {
        result: true,
        confidence: true,
        pickType: true,
        pickGrade: true,
        bookmakerCount: true,
        game: { select: { sport: { select: { key: true } } } },
        signalSnapshot: {
          select: {
            hadAtsFormSignal: true,
            hadH2HSignal: true,
            hadScheduleSignal: true,
            hadLineMovementSignal: true,
            hadRestSignal: true,
            hadVenueSignal: true,
            bookmakerCount: true,
            dataQualityScore: true,
          },
        },
      },
    }),
  ]);

  // ── Shape: ingestion runs ─────────────────────────────────────────────────
  const shapeRun = (run: (typeof recentRunsRaw)[0]): RunSummary => ({
    id: run.id,
    sport: run.sport,
    status: run.status,
    gamesUpserted: run.gamesUpserted,
    oddsInserted: run.oddsInserted,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs:
      run.completedAt ? run.completedAt.getTime() - run.startedAt.getTime() : null,
  });
  const recentRuns = recentRunsRaw.map(shapeRun);
  const latestRun = recentRunsRaw[0] ? shapeRun(recentRunsRaw[0]) : null;

  // ── Pick counts by bootstrap flag ─────────────────────────────────────────
  let canonicalPickCount = 0;
  let bootstrapPickCount = 0;
  for (const g of pickCountsRaw) {
    if (g.isBootstrap) bootstrapPickCount = g._count.id;
    else canonicalPickCount = g._count.id;
  }

  // ── Warnings ──────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (gates.isBootstrapMode) {
    warnings.push(
      "BOOTSTRAP MODE: All picks carry isBootstrap=true. Confidence is uncalibrated against real outcomes. Do not expose publicly."
    );
  }
  if (!gates.canUseDerivedHistory) {
    warnings.push(
      "Derived history is OFF: ATS form, H2H form, and venue splits are excluded from scoring."
    );
  }
  const lastSuccessMs = latestSuccessfulRaw?.completedAt?.getTime();
  if (!lastSuccessMs || now.getTime() - lastSuccessMs > 2 * 60 * 60 * 1000) {
    warnings.push("No successful ingestion in the last 2 hours — data may be stale.");
  }
  if (canonicalPickCount === 0 && !gates.isBootstrapMode) {
    warnings.push("Canonical mode is active but zero canonical picks exist yet.");
  }

  // ── Upcoming games ────────────────────────────────────────────────────────
  const upcomingGames: GameSummary[] = upcomingGamesRaw.map((game) => ({
    id: game.id,
    sport: game.sport.displayName,
    homeTeam: game.homeTeamName,
    awayTeam: game.awayTeamName,
    commenceTime: game.commenceTime.toISOString(),
    status: game.status,
    bookmakerCoverageMax: game.bookmakerCoverageMax,
    dataQualityScore: game.dataQualityScore,
    lineMovementSpread: game.lineMovementSpread,
    picks: game.picks.map((p) => ({
      id: p.id,
      pickType: p.pickType,
      confidence: p.confidence,
      pickGrade: p.pickGrade,
      isBootstrap: p.isBootstrap,
      depth: computeDepth(p.signalSnapshot, p.bookmakerCount),
    })),
  }));

  // ── Current picks ─────────────────────────────────────────────────────────
  const currentPicks: PickSummary[] = currentPicksRaw.map((pick) => {
    const snap = pick.signalSnapshot;
    const snapFields: SnapFields | null = snap
      ? {
          bookmakerCount: snap.bookmakerCount,
          dataQualityScore: snap.dataQualityScore,
          hadAtsFormSignal: snap.hadAtsFormSignal,
          hadH2HSignal: snap.hadH2HSignal,
          hadScheduleSignal: snap.hadScheduleSignal,
          hadLineMovementSignal: snap.hadLineMovementSignal,
          hadRestSignal: snap.hadRestSignal,
          hadVenueSignal: snap.hadVenueSignal,
        }
      : null;

    let factorBreakdown: Record<string, number> | null = null;
    if (
      pick.factorBreakdown !== null &&
      typeof pick.factorBreakdown === "object" &&
      !Array.isArray(pick.factorBreakdown)
    ) {
      factorBreakdown = pick.factorBreakdown as Record<string, number>;
    }

    return {
      id: pick.id,
      gameId: pick.gameId,
      sport: pick.game.sport.displayName,
      homeTeam: pick.game.homeTeamName,
      awayTeam: pick.game.awayTeamName,
      commenceTime: pick.game.commenceTime.toISOString(),
      pickType: pick.pickType,
      selection: pick.selection,
      line: pick.line,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      pickGrade: pick.pickGrade,
      riskLevel: pick.riskLevel,
      tier: pick.tier,
      bookmakerCount: pick.bookmakerCount,
      dataQualityScore: snap?.dataQualityScore ?? pick.game.dataQualityScore,
      isBootstrap: pick.isBootstrap,
      isFeatured: pick.isFeatured,
      depth: computeDepth(snapFields, pick.bookmakerCount),
      isPublicEligible: !pick.isBootstrap && gates.canExposePublicPicks,
      willBeLearningEligible: !pick.isBootstrap && gates.canLearnFromOutcomes,
      reasoningShort: pick.reasoningShort,
      reasoning: pick.reasoning,
      factorBreakdown,
      modelVersion: pick.modelVersion,
      generatedAt: pick.generatedAt.toISOString(),
      dataFreshnessAt: pick.dataFreshnessAt?.toISOString() ?? null,
      snapshot: snap
        ? {
            hadOddsSignal: snap.hadOddsSignal,
            hadLineMovementSignal: snap.hadLineMovementSignal,
            hadRestSignal: snap.hadRestSignal,
            hadScheduleSignal: snap.hadScheduleSignal,
            hadAtsFormSignal: snap.hadAtsFormSignal,
            hadH2HSignal: snap.hadH2HSignal,
            hadVenueSignal: snap.hadVenueSignal,
            hadWeatherSignal: snap.hadWeatherSignal,
            hadInjurySignal: snap.hadInjurySignal,
            hadRatingsSignal: snap.hadRatingsSignal,
            bookmakerCount: snap.bookmakerCount,
            dataQualityScore: snap.dataQualityScore,
            lineMovementDelta: snap.lineMovementDelta,
            restAdvantageNet: snap.restAdvantageNet,
            atsFormSampleSize: snap.atsFormSampleSize,
            h2hSampleSize: snap.h2hSampleSize,
            scheduleDensityHome: snap.scheduleDensityHome,
            scheduleDensityAway: snap.scheduleDensityAway,
            usedDerivedHistory: snap.usedDerivedHistory,
            usedScheduleSignal: snap.usedScheduleSignal,
            eligibleForLearning: snap.eligibleForLearning,
            modelVersion: snap.modelVersion,
          }
        : null,
    };
  });

  // ── Recently settled ──────────────────────────────────────────────────────
  const recentlySettled: SettledSummary[] = recentlySettledRaw.map((pick) => {
    const snap = pick.signalSnapshot;
    const snapFields: SnapFields | null = snap
      ? {
          bookmakerCount: snap.bookmakerCount,
          dataQualityScore: snap.dataQualityScore,
          hadAtsFormSignal: snap.hadAtsFormSignal,
          hadH2HSignal: snap.hadH2HSignal,
          hadScheduleSignal: snap.hadScheduleSignal,
          hadLineMovementSignal: snap.hadLineMovementSignal,
          hadRestSignal: snap.hadRestSignal,
          hadVenueSignal: snap.hadVenueSignal,
        }
      : null;
    return {
      id: pick.id,
      sport: pick.game.sport.displayName,
      homeTeam: pick.game.homeTeamName,
      awayTeam: pick.game.awayTeamName,
      pickType: pick.pickType,
      selection: pick.selection,
      line: pick.line,
      confidence: pick.confidence,
      pickGrade: pick.pickGrade,
      result: pick.result,
      isBootstrap: pick.isBootstrap,
      depth: computeDepth(snapFields, pick.bookmakerCount),
      eligibleForLearning: snap?.eligibleForLearning ?? false,
      settledAt: pick.settledAt!.toISOString(),
      bookmakerCount: pick.bookmakerCount,
      dataQualityScore: snap?.dataQualityScore ?? pick.game.dataQualityScore,
    };
  });

  // ── Performance (canonical only) ──────────────────────────────────────────
  const perfPicks: PerfPick[] = settledCanonicalRaw.map((p) => ({
    result: p.result,
    confidence: p.confidence,
    pickType: p.pickType,
    pickGrade: p.pickGrade,
    sport: p.game.sport.key,
    depth: computeDepth(
      p.signalSnapshot
        ? {
            bookmakerCount: p.signalSnapshot.bookmakerCount,
            dataQualityScore: p.signalSnapshot.dataQualityScore,
            hadAtsFormSignal: p.signalSnapshot.hadAtsFormSignal,
            hadH2HSignal: p.signalSnapshot.hadH2HSignal,
            hadScheduleSignal: p.signalSnapshot.hadScheduleSignal,
            hadLineMovementSignal: p.signalSnapshot.hadLineMovementSignal,
            hadRestSignal: p.signalSnapshot.hadRestSignal,
            hadVenueSignal: p.signalSnapshot.hadVenueSignal,
          }
        : null,
      p.bookmakerCount
    ),
  }));

  const overall = summarize(perfPicks);
  const bySport = Object.entries(groupBy(perfPicks, (p) => p.sport)).map(
    ([sport, picks]) => ({ label: sport, ...summarize(picks) })
  );
  const byPickType = Object.entries(groupBy(perfPicks, (p) => p.pickType)).map(
    ([pickType, picks]) => ({ label: pickType, ...summarize(picks) })
  );
  const byGrade = Object.entries(groupBy(perfPicks, (p) => p.pickGrade)).map(
    ([grade, picks]) => ({ label: grade, ...summarize(picks) })
  );
  const byConfidenceBand = Object.entries(
    groupBy(perfPicks, (p) => confidenceBand(p.confidence))
  )
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([band, picks]) => ({ label: band, ...summarize(picks) }));
  const byDepth = Object.entries(groupBy(perfPicks, (p) => p.depth)).map(
    ([depth, picks]) => ({ label: depth, ...summarize(picks) })
  );

  const performance: PerformanceData = {
    sampleSizeWarning: perfPicks.length < 30,
    canonicalTotal: perfPicks.length,
    overall,
    bySport,
    byPickType,
    byGrade,
    byConfidenceBand,
    byDepth,
  };

  // ── Signal coverage ───────────────────────────────────────────────────────
  const totalGameSignals = signalGroupedRaw.reduce((s, g) => s + g._count.id, 0);
  const depthDist = { thin: 0, medium: 0, deep: 0 };
  for (const snap of allSnapshotsRaw) {
    const d = computeDepth(snap, snap.bookmakerCount);
    if (d === "THIN") depthDist.thin++;
    else if (d === "MEDIUM") depthDist.medium++;
    else depthDist.deep++;
  }

  const signalCoverage: SignalCoverage = {
    totalGameSignals,
    byCategory: signalGroupedRaw.map((g) => ({
      category: g.sourceCategory,
      count: g._count.id,
    })),
    snapshots: {
      total: allSnapshotsRaw.length,
      canonical: allSnapshotsRaw.filter((s) => !s.isBootstrap).length,
      learningEligible: allSnapshotsRaw.filter((s) => s.eligibleForLearning).length,
      withAtsForm: allSnapshotsRaw.filter((s) => s.hadAtsFormSignal).length,
      withH2H: allSnapshotsRaw.filter((s) => s.hadH2HSignal).length,
      withSchedule: allSnapshotsRaw.filter((s) => s.hadScheduleSignal).length,
      withLineMovement: allSnapshotsRaw.filter((s) => s.hadLineMovementSignal).length,
      withRest: allSnapshotsRaw.filter((s) => s.hadRestSignal).length,
      withVenue: allSnapshotsRaw.filter((s) => s.hadVenueSignal).length,
    },
    depthDistribution: depthDist,
  };

  // ── Assemble ──────────────────────────────────────────────────────────────
  const data: DashboardData = {
    fetchedAt: now.toISOString(),
    systemHealth: {
      mode: gates.isBootstrapMode ? "BOOTSTRAP" : "CANONICAL",
      gates: {
        canPersistCanonicalHistory: gates.canPersistCanonicalHistory,
        canUseDerivedHistory: gates.canUseDerivedHistory,
        canExposePublicPicks: gates.canExposePublicPicks,
        canPromoteFeaturedPicks: gates.canPromoteFeaturedPicks,
        canPublishContent: gates.canPublishContent,
        canExposePerformanceStats: gates.canExposePerformanceStats,
        canLearnFromOutcomes: gates.canLearnFromOutcomes,
      },
      latestRun,
      latestSuccessAt: latestSuccessfulRaw?.completedAt?.toISOString() ?? null,
      latestSettlementAt: latestSettledRaw?.settledAt?.toISOString() ?? null,
      canonicalPickCount,
      bootstrapPickCount,
      warnings,
    },
    recentRuns,
    upcomingGames,
    currentPicks,
    recentlySettled,
    performance,
    signalCoverage,
  };

  return NextResponse.json(data);
}
