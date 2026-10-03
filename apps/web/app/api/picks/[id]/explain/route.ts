/**
 * "Ask the model why" — POST /api/picks/[id]/explain
 *
 * Returns a plain-language, strictly-grounded explanation of why the engine
 * surfaced this pick, built ONLY from the pick's stored FactorBreakdown (incl.
 * the independent-edge rationale) and its immutable PickSignalSnapshot. The
 * model never sees anything else, and the output is policy-validated before it
 * is returned (no betting advice, no certainty, must cite its grounding).
 *
 * Gating (fails closed):
 *  - 503 if canExposePublicPicks is off
 *  - 401 if not signed in; 403 unless PRO/ELITE (canSeeFactorBreakdown)
 *  - 503 if ANTHROPIC_API_KEY is not configured
 *  - 404 if the pick is missing, unpublished, or bootstrap-era
 *  - 422 if the generated answer fails policy; 503 if the monthly budget is spent
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import { parseFactorBreakdown } from "@/lib/picks/parse-factor-breakdown";
import { explainPick, PickExplanationError } from "@/lib/pick-explainer/explain";
import {
  DEFAULT_EXPLAIN_REGISTER,
  isExplainRegister,
  type ExplainRegister,
} from "@/lib/pick-explainer/prompts";
import type { GroundingSnapshot } from "@/lib/pick-explainer/grounding";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

const SIGNAL_KEYS = [
  "hadOddsSignal",
  "hadLineMovementSignal",
  "hadRestSignal",
  "hadScheduleSignal",
  "hadAtsFormSignal",
  "hadH2HSignal",
  "hadVenueSignal",
  "hadWeatherSignal",
  "hadInjurySignal",
  "hadRatingsSignal",
  "hadPlayerSignal",
  "hadOfficialsSignal",
  "hadVenueEnvironmentSignal",
  "hadPaceSignal",
  "hadMilestoneSignal",
] as const;

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) {
    return NextResponse.json(bootstrapGateResponse("Pick explanation"), { status: 503 });
  }

  const pickId = context.params.id;
  if (!pickId || typeof pickId !== "string") {
    return NextResponse.json({ error: "invalid pick id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const entitlements = await getUserEntitlements(session.user.id);
  if (!entitlements.canSeeFactorBreakdown) {
    return NextResponse.json(
      { error: "Pro or Elite required to ask the model why." },
      { status: 403 },
    );
  }

  // Per-user throttle in front of the paid Claude call: the shared monthly
  // budget gate alone can't stop one caller from looping this endpoint and
  // draining the org-wide budget for everyone (denial-of-wallet). This one is
  // the most important limiter in the file set to make DURABLE: in-memory it
  // was 10-per-5min PER WARM INSTANCE, so the wallet guard scaled with
  // horizontal scale — the exact spend it exists to bound. Fail-closed 503 on
  // store failure is unambiguous on a money path: never let a paid Claude call
  // through unmetered. The user id is fingerprinted by the helper before it
  // reaches the counters table (never stored raw).
  const limit = await consumePublicFormRateLimit("pick-explain", session.user.id, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      limit.status === 429
        ? { error: "Too many requests. Please wait a moment before asking again." }
        : { error: "Rate limit service unavailable. Please retry shortly." },
      { status: limit.status, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // Optional focused question (the grounded explanation is the default).
  let question: string | null = null;
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);

  // Optional reader register — invalid values are rejected, not coerced.
  let register: ExplainRegister = DEFAULT_EXPLAIN_REGISTER;
  if (body?.register !== undefined) {
    if (!isExplainRegister(body.register)) {
      return NextResponse.json({ error: "invalid register" }, { status: 400 });
    }
    register = body.register;
  }

  if (typeof body?.question === "string") {
    const q = body.question.trim();
    if (q.length > 280) {
      return NextResponse.json({ error: "question too long" }, { status: 400 });
    }
    if (q.length > 0) question = q;
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "claude-not-configured" }, { status: 503 });
  }

  const pick = await db.pick.findUnique({
    where: { id: pickId },
    include: {
      signalSnapshot: true,
      game: { include: { sport: { select: { key: true, name: true } } } },
    },
  });
  if (!pick || !pick.isPublished || pick.isBootstrap) {
    return NextResponse.json({ error: "pick not found" }, { status: 404 });
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

  try {
    const explanation = await explainPick({
      apiKey,
      question,
      register,
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
          factorBreakdown: parseFactorBreakdown(pick.factorBreakdown),
          clvKind: pick.clvKind,
          clvValue: pick.clvValue,
          clvVerdict: pick.clvVerdict,
        },
        snapshot: groundingSnapshot,
      },
    });
    return NextResponse.json({
      success: true,
      explanation: explanation.text,
      modelName: explanation.modelName,
      register,
    });
  } catch (err) {
    if (err instanceof PickExplanationError) {
      // BUDGET and UPSTREAM are both "the explainer cannot serve you right now",
      // not "your request was unprocessable" — 503 tells a caller to retry, 422
      // tells them not to bother. Every PickExplanationError message is authored
      // here; none carries upstream response text (see GSE-SEC-071 in explain.ts).
      const status = err.kind === "BUDGET" || err.kind === "UPSTREAM" ? 503 : 422;
      return NextResponse.json({ error: err.message, kind: err.kind }, { status });
    }
    return NextResponse.json({ error: "explanation failed" }, { status: 500 });
  }
}
