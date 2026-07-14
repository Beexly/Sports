import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import { loadGameRoom } from "@/lib/game-room/load";
import {
  answerModelCourtQuestion,
  detectModelCourtRefusal,
  ModelCourtAnswerError,
  type ModelCourtAnswerInput,
} from "@/lib/intelligence-graph/model-court/answer";
import type { ModelCourtMode } from "@/lib/intelligence-graph/model-court/prompts";
import type { UserLens } from "@/lib/intelligence-graph";

export const dynamic = "force-dynamic";

interface RouteContext {
  readonly params: {
    readonly gameId: string;
  };
}

interface ModelCourtBody {
  readonly question?: unknown;
  readonly mode?: unknown;
  readonly lens?: unknown;
}

const GAME_SCOPED_MODES = new Set<ModelCourtMode>(["ASK_THIS_GAME", "EXPLAIN_FOR_MY_LENS"]);
const LENSES = new Set<UserLens>(["FANTASY", "FAN", "BETTOR", "CREATOR", "ANALYST"]);

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  // Per-user throttle in front of the paid Claude call (denial-of-wallet): one
  // caller must not be able to loop this and drain the shared monthly budget.
  const limit = consumeRateLimit("model-court", session.user.id, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "rate-limited", message: "Too many requests. Please wait a moment before asking again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const entitlements = await getUserEntitlements(session.user.id);
  if (!entitlements.canSeeFactorBreakdown) {
    return NextResponse.json(
      {
        success: false,
        error: "subscription-required",
        message: "Model Court answers require Pro or Elite access.",
      },
      { status: 403 }
    );
  }

  let body: ModelCourtBody;
  try {
    body = (await request.json()) as ModelCourtBody;
  } catch {
    return NextResponse.json({ success: false, error: "invalid-json" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const mode = normalizeMode(body.mode);
  const lens = normalizeLens(body.lens);
  if (question.length < 3 || question.length > 500 || !mode) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid-request",
        message: "question must be 3-500 characters, and mode must be ASK_THIS_GAME or EXPLAIN_FOR_MY_LENS.",
      },
      { status: 400 }
    );
  }
  if (mode === "EXPLAIN_FOR_MY_LENS" && !lens) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid-lens",
        message: "lens must be one of FANTASY, FAN, BETTOR, CREATOR, or ANALYST.",
      },
      { status: 400 }
    );
  }

  // Pass the caller's real entitlements to the shared room loader so the paid
  // full premium room node is built for this request. The tier check above
  // already rejects callers below PRO/ELITE.
  const room = await loadGameRoom(context.params.gameId, {
    canSeePremiumPicks: entitlements.canSeePremiumPicks,
    canSeeConfidence: entitlements.canSeeConfidence,
    canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
    canSeeLineMovement: entitlements.canSeeLineMovement,
  });
  if (!room) {
    return NextResponse.json({ success: false, error: "game-not-found" }, { status: 404 });
  }

  const input: ModelCourtAnswerInput = {
    mode,
    question,
    node: room.node,
    lens: lens ? { kind: lens, details: room.lenses.find((item) => item.lens === lens) ?? null } : undefined,
  };
  const refusalKind = detectModelCourtRefusal(input);
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!refusalKind && !apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "claude-not-configured",
        message: "Model Court generation is paused until ANTHROPIC_API_KEY is configured.",
      },
      { status: 503 }
    );
  }

  try {
    const answer = await answerModelCourtQuestion(input, {
      apiKey: apiKey ?? "not-configured",
      recordUsage: true,
      userId: session.user.id === "dev-admin" ? null : session.user.id,
    });

    return NextResponse.json({
      success: true,
      answer,
      policy: {
        citationsRequired: true,
        personalAdviceBlocked: true,
        publicClaimsLimited: true,
      },
    });
  } catch (error) {
    if (error instanceof ModelCourtAnswerError) {
      return NextResponse.json(
        { success: false, error: "generation-failed", message: error.message },
        { status: 422 }
      );
    }
    // Shape any other failure into a controlled 500, matching every sibling
    // route, instead of re-throwing into an uncontrolled Next error path.
    return NextResponse.json(
      { success: false, error: "generation-failed", message: "Model Court could not answer right now." },
      { status: 500 }
    );
  }
}

function normalizeMode(value: unknown): ModelCourtMode | null {
  if (typeof value !== "string") return "ASK_THIS_GAME";
  return GAME_SCOPED_MODES.has(value as ModelCourtMode) ? (value as ModelCourtMode) : null;
}

function normalizeLens(value: unknown): UserLens | null {
  if (typeof value !== "string") return null;
  return LENSES.has(value as UserLens) ? (value as UserLens) : null;
}
