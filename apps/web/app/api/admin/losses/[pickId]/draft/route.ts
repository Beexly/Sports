/**
 * Operator-triggered loss-autopsy DRAFT — POST /api/admin/losses/[pickId]/draft
 *
 * Generates a grounded autopsy draft for a settled LOSS and saves it as
 * status=DRAFT, isPublic=false. It NEVER publishes — an operator reviews and
 * publishes via the existing cockpit/losses workflow. Auto-publish is forbidden.
 *
 * Admin-only. Refuses to overwrite an autopsy that has already moved past DRAFT.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { db } from "@sports/db";
import type { FactorBreakdown } from "@sports/types";
import { SIGNAL_LABELS, type GroundingSnapshot } from "@/lib/pick-explainer/grounding";
import { draftLossAutopsy, LossAutopsyDraftError } from "@/lib/loss-autopsy/draft";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { pickId: string };
}

const SIGNAL_KEYS = Object.keys(SIGNAL_LABELS);

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Denial-of-wallet guard: each call is a paid Claude generation (mirrors the
  // studio-generate limiter). Backs up the org-wide monthly budget gate.
  const limit = consumeRateLimit("loss-autopsy-draft", session.user.id, 20, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate-limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const pickId = context.params.pickId;
  if (!pickId || typeof pickId !== "string") {
    return NextResponse.json({ error: "invalid pick id" }, { status: 400 });
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "claude-not-configured" }, { status: 503 });
  }

  const pick = await db.pick.findUnique({
    where: { id: pickId },
    include: {
      signalSnapshot: true,
      lossAutopsy: true,
      game: { include: { sport: { select: { key: true, name: true } } } },
    },
  });
  if (!pick) {
    return NextResponse.json({ error: "pick not found" }, { status: 404 });
  }
  if (pick.result !== "LOSS") {
    return NextResponse.json({ error: "autopsies are only drafted for losses" }, { status: 422 });
  }
  if (pick.lossAutopsy && pick.lossAutopsy.status !== "DRAFT") {
    return NextResponse.json(
      { error: `autopsy is already ${pick.lossAutopsy.status}; refusing to overwrite` },
      { status: 409 },
    );
  }

  const snap = pick.signalSnapshot;
  const groundingSnapshot: GroundingSnapshot | null = snap
    ? {
        capturedAt: snap.capturedAt,
        confidenceAtPrediction: snap.confidenceAtPrediction,
        dataQualityScore: snap.dataQualityScore,
        bookmakerCount: snap.bookmakerCount,
        lineMovementDelta: snap.lineMovementDelta,
        settlementResult: snap.settlementResult,
        signalFlags: Object.fromEntries(
          SIGNAL_KEYS.map((k) => [k, Boolean((snap as unknown as Record<string, unknown>)[k])]),
        ),
      }
    : null;

  let drafted;
  try {
    drafted = await draftLossAutopsy({
      apiKey,
      gameId: pick.gameId,
      userId: session.user.id === "dev-admin" ? null : session.user.id,
      grounding: {
        game: {
          homeTeamName: pick.game.homeTeamName,
          awayTeamName: pick.game.awayTeamName,
          sport: pick.game.sport?.key ?? pick.game.sport?.name ?? "sport",
          commenceTime: pick.game.commenceTime,
        },
        pick: {
          pickType: pick.pickType,
          selection: pick.selection,
          line: pick.line,
          confidence: pick.confidence,
          edgeScore: pick.edgeScore,
          modelVersion: pick.modelVersion,
          generatedAt: pick.generatedAt,
          result: pick.result,
          factorBreakdown: (pick.factorBreakdown as unknown as FactorBreakdown | null) ?? null,
          clvKind: pick.clvKind,
          clvValue: pick.clvValue,
          clvVerdict: pick.clvVerdict,
        },
        snapshot: groundingSnapshot,
      },
    });
  } catch (err) {
    if (err instanceof LossAutopsyDraftError) {
      const status = err.kind === "BUDGET" ? 503 : err.kind === "NOT_SETTLED" ? 422 : 422;
      return NextResponse.json({ error: err.message, kind: err.kind }, { status });
    }
    return NextResponse.json({ error: "draft failed" }, { status: 500 });
  }

  const { draft } = drafted;
  const authorEmail = session.user.email ?? session.user.id ?? "operator";
  const evidenceRefs = {
    generatedBy: "claude",
    modelName: drafted.modelName,
    surface: "LOSS_AUTOPSY_DRAFT",
    pickId: pick.id,
  };

  // Persist as DRAFT only. Never sets status=PUBLISHED or isPublic=true.
  const saved = await db.lossAutopsy.upsert({
    where: { pickId: pick.id },
    create: {
      pickId: pick.id,
      authorEmail,
      status: "DRAFT",
      headline: draft.headline,
      whatWeSaw: draft.whatWeSaw,
      whatHappened: draft.whatHappened,
      whatWeLearned: draft.whatWeLearned,
      rootCause: draft.rootCause,
      lessonTags: draft.lessonTags,
      modelVersion: pick.modelVersion,
      isPublic: false,
      evidenceRefs,
    },
    update: {
      // Only ever refreshes an existing DRAFT (guarded above). Keeps it private.
      headline: draft.headline,
      whatWeSaw: draft.whatWeSaw,
      whatHappened: draft.whatHappened,
      whatWeLearned: draft.whatWeLearned,
      rootCause: draft.rootCause,
      lessonTags: draft.lessonTags,
      modelVersion: pick.modelVersion,
      evidenceRefs,
    },
  });

  return NextResponse.json({
    success: true,
    status: saved.status,
    isPublic: saved.isPublic,
    draft,
    note: "Saved as DRAFT for operator review. Not published.",
  });
}
