/**
 * Evidence Audit endpoint — /api/picks/[id]/audit
 *
 * Returns the forensic trail for a single pick:
 *  - Pick metadata (modelVersion, generatedAt, dataQualityScore, etc.)
 *  - PickSignalSnapshot (which signal categories were present at scoring)
 *  - SourceSnapshot list (raw provider payloads with hash + bytes + timestamp)
 *  - Bootstrap gates that were active at prediction time
 *
 * NEVER exposes:
 *  - Raw provider payload data (only SHA-256 hash prefix + byte count)
 *  - Kelly/stake values (forbidden by brand-safety v2)
 *  - True EV or fair probability (gated until source-backed)
 *  - Win-rate math or performance stats (gated by separate policy)
 *
 * Tier gating:
 *  - FREE → AuditPayloadSummary: counts + topology only, drives upgrade
 *  - PRO/ELITE → AuditPayloadDetailed: full signal flags, line movement,
 *    confidence at prediction, every SourceSnapshot hash
 *
 * Fails closed:
 *  - 503 if canExposePublicPicks gate is off
 *  - 404 if pick not found OR pick.isBootstrap (audit never exposes bootstrap-era data)
 *  - 404 if pick is not published
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import { buildPickPremortemNote } from "@/lib/premortem/build";
import type {
  AuditPayload,
  AuditPayloadDetailed,
  AuditPayloadSummary,
  AuditSignalCategoryRow,
  AuditSourceSnapshotInfo,
} from "@sports/types";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) {
    return NextResponse.json(bootstrapGateResponse("Evidence audit"), {
      status: 503,
    });
  }

  const pickId = context.params.id;
  if (!pickId || typeof pickId !== "string") {
    return NextResponse.json({ error: "invalid pick id" }, { status: 400 });
  }

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;

  const tier = entitlements?.tier ?? "FREE";
  const canSeeDetail = tier === "PRO" || tier === "ELITE";

  // Load pick + adjacent forensic rows.
  // We only audit picks that are (a) published, (b) non-bootstrap.
  const pick = await db.pick.findUnique({
    where: { id: pickId },
    include: {
      signalSnapshot: true,
      game: {
        include: {
          odds: {
            select: { ingestionRunId: true },
            orderBy: { fetchedAt: "desc" },
            take: 50, // bounded — last 50 odds rows for this game
          },
        },
      },
    },
  });

  if (!pick || !pick.isPublished || pick.isBootstrap) {
    return NextResponse.json({ error: "pick not found" }, { status: 404 });
  }

  // Collect distinct IngestionRun ids that produced odds for this game,
  // then load the SourceSnapshots those runs captured. This is the
  // forensic chain: pick → game → odds.ingestionRun → sourceSnapshots.
  const runIds = Array.from(
    new Set(
      (pick.game.odds ?? [])
        .map((o) => o.ingestionRunId)
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    )
  );

  const sourceSnapshotRows = runIds.length
    ? await db.sourceSnapshot.findMany({
        where: { ingestionRunId: { in: runIds } },
        orderBy: { fetchedAt: "desc" },
        take: 25,
        select: {
          id: true,
          provider: true,
          sourceKind: true,
          fetchedAt: true,
          payloadHash: true,
          payloadBytes: true,
          ingestionRunId: true,
        },
      })
    : [];

  const sourceSnapshots: AuditSourceSnapshotInfo[] = sourceSnapshotRows.map(
    (s) => ({
      id: s.id,
      provider: s.provider,
      sourceKind: String(s.sourceKind),
      fetchedAt: s.fetchedAt.toISOString(),
      payloadHashPrefix: s.payloadHash.slice(0, 12),
      payloadBytes: s.payloadBytes,
      ingestionRunId: s.ingestionRunId,
    })
  );

  const snapshot = pick.signalSnapshot;
  const preMortem = buildPickPremortemNote(
    {
      id: pick.id,
      selection: pick.selection,
      pickType: pick.pickType,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      consensusPct: pick.consensusPct,
      bookmakerCount: pick.bookmakerCount,
      riskLevel: pick.riskLevel,
      modelVersion: pick.modelVersion,
    },
    snapshot
      ? {
          id: snapshot.id,
          capturedAt: snapshot.capturedAt,
          hadLineMovementSignal: snapshot.hadLineMovementSignal,
          hadRestSignal: snapshot.hadRestSignal,
          hadScheduleSignal: snapshot.hadScheduleSignal,
          hadAtsFormSignal: snapshot.hadAtsFormSignal,
          hadH2HSignal: snapshot.hadH2HSignal,
          hadVenueSignal: snapshot.hadVenueSignal,
          hadWeatherSignal: snapshot.hadWeatherSignal,
          hadInjurySignal: snapshot.hadInjurySignal,
          bookmakerCount: snapshot.bookmakerCount,
          dataQualityScore: snapshot.dataQualityScore,
          lineMovementDelta: snapshot.lineMovementDelta,
          restAdvantageNet: snapshot.restAdvantageNet,
          atsFormSampleSize: snapshot.atsFormSampleSize,
          h2hSampleSize: snapshot.h2hSampleSize,
          scheduleDensityHome: snapshot.scheduleDensityHome,
          scheduleDensityAway: snapshot.scheduleDensityAway,
          modelVersion: snapshot.modelVersion,
        }
      : null
  );

  // Signal-category topology. Derived from the snapshot's hadXxx flags
  // when present; falls back to "ABSENT" otherwise so the audit always
  // renders a complete category list.
  const signalCategories: AuditSignalCategoryRow[] = [
    {
      category: "Market",
      status: snapshot?.hadOddsSignal ? "LIVE" : "ABSENT",
      description: "Live odds, book count, line movement",
    },
    {
      category: "Line movement",
      status: snapshot?.hadLineMovementSignal ? "LIVE" : "ABSENT",
      description: "Opening-line vs current-line delta",
    },
    {
      category: "Rest & schedule",
      status:
        snapshot?.hadRestSignal || snapshot?.hadScheduleSignal
          ? "LIVE"
          : "ABSENT",
      description: "Back-to-backs, rest gaps, density",
    },
    {
      category: "ATS form",
      status: snapshot?.hadAtsFormSignal ? "LIVE" : "ABSENT",
      description: "Canonical ATS form against the spread",
    },
    {
      category: "Head-to-head",
      status: snapshot?.hadH2HSignal ? "LIVE" : "ABSENT",
      description: "Recent matchup history",
    },
    {
      category: "Venue",
      status: snapshot?.hadVenueSignal ? "LIVE" : "ABSENT",
      description: "Venue-specific ATS form",
    },
    {
      category: "Players",
      status: snapshot?.hadPlayerSignal ? "SHADOW" : "ABSENT",
      description: "Lineups, injuries, starters (shadow until licensed)",
    },
    {
      category: "Officials",
      status: snapshot?.hadOfficialsSignal ? "SHADOW" : "ABSENT",
      description: "Referee / umpire tendencies (shadow)",
    },
    {
      category: "Venue environment",
      status: snapshot?.hadVenueEnvironmentSignal ? "SHADOW" : "ABSENT",
      description: "Weather, surface, altitude, park effects (shadow)",
    },
    {
      category: "Pace",
      status: snapshot?.hadPaceSignal ? "SHADOW" : "ABSENT",
      description: "Team rate / pace context (shadow)",
    },
    {
      category: "Milestones",
      status: snapshot?.hadMilestoneSignal ? "SHADOW" : "ABSENT",
      description: "Team/player milestone context (shadow)",
    },
  ];

  const liveCount = signalCategories.filter((c) => c.status === "LIVE").length;

  // ──────────────────────────────────────────────────────────────────
  // FREE tier: summary only. Counts + topology, no specific values.
  // Drives upgrade — proves the audit exists without giving the goods.
  // ──────────────────────────────────────────────────────────────────
  if (!canSeeDetail) {
    const summary: AuditPayloadSummary = {
      tier: "FREE",
      pickId: pick.id,
      generatedAt: pick.generatedAt.toISOString(),
      modelVersion: snapshot?.modelVersion ?? "",
      signalCategoryCount: signalCategories.length,
      signalCategoryActiveCount: liveCount,
      sourceSnapshotCount: sourceSnapshots.length,
      mostRecentSnapshotAt: sourceSnapshots[0]?.fetchedAt ?? null,
      mostRecentSnapshotProvider: sourceSnapshots[0]?.provider ?? null,
      upgradeRequiredForDetail: true,
    };
    const payload: AuditPayload = summary;
    return NextResponse.json({ success: true, audit: payload, preMortem });
  }

  // ──────────────────────────────────────────────────────────────────
  // PRO / ELITE tier: full forensic detail. Still NO raw payload data,
  // NO Kelly/stake math, NO true-EV — those remain hard-gated.
  // ──────────────────────────────────────────────────────────────────
  const detailed: AuditPayloadDetailed = {
    tier: tier === "ELITE" ? "ELITE" : "PRO",
    pickId: pick.id,
    generatedAt: pick.generatedAt.toISOString(),
    modelVersion: snapshot?.modelVersion ?? "",
    isBootstrap: snapshot?.isBootstrap ?? false,
    confidenceAtPrediction: snapshot?.confidenceAtPrediction ?? 0,
    dataQualityScore: snapshot?.dataQualityScore ?? 0,
    bookmakerCount: snapshot?.bookmakerCount ?? 0,
    lineMovementDelta: snapshot?.lineMovementDelta ?? null,
    restAdvantageNet: snapshot?.restAdvantageNet ?? null,
    atsFormSampleSize: snapshot?.atsFormSampleSize ?? null,
    h2hSampleSize: snapshot?.h2hSampleSize ?? null,
    scheduleDensityHome: snapshot?.scheduleDensityHome ?? null,
    scheduleDensityAway: snapshot?.scheduleDensityAway ?? null,
    signalCategories,
    sourceSnapshots,
    gatesAtPrediction: {
      canonicalHistory: gates.canPersistCanonicalHistory,
      derivedModelHistory: gates.canUseDerivedHistory,
      outcomeLearning: gates.canLearnFromOutcomes,
    },
  };
  const payload: AuditPayload = detailed;
  return NextResponse.json({ success: true, audit: payload, preMortem });
}
