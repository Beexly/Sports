/**
 * POST /api/cockpit/jarvis/ask — real, Claude-powered "Ask Jarvis" chat.
 *
 * Advisory only. This endpoint NEVER performs an action: it does not transition
 * tasks, publish, spend (beyond the metered Claude call itself), or call any
 * external system other than the Claude Messages API. It answers ONLY from the
 * live operating assessment + owner summary it grounds itself on, and is
 * instructed to admit gaps ("I don't have that wired yet") rather than invent.
 *
 * Auth: admin-only (mirrors apps/web/app/api/cockpit/tasks/[id]/route.ts).
 * Model: resolved via the model-router surface "brief" (templated owner
 *        summary read → Haiku tier). Cost is metered against the OTHER Claude
 *        API budget surface (reused — no new Prisma enum value), and the budget
 *        gate is respected (over budget → honest "paused" answer, not a 500).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildJarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import { loadJarvisAssessment } from "@/lib/cockpit/jarvis-data";
import { loadDailyCommand } from "@/lib/cockpit/daily-command/loader";
import { callClaudeMessages, ClaudeMessagesError } from "@/lib/claude-api/messages";
import { pickModelForSurface } from "@/lib/claude-api/model-router";
import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
} from "@/lib/claude-api/cost-monitor";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
} from "@/lib/claude-api/usage-store";

export const dynamic = "force-dynamic";

// Reuse the catch-all "OTHER" budget surface ($100/mo default). Avoids adding a
// Prisma enum value (which would require a DB migration + would break the locked
// cost-monitor / budget-migration tests). The model itself is routed via the
// "brief" model-router surface (Haiku tier — short, templated owner summary).
const COST_SURFACE = "OTHER" as const;
const MODEL_SURFACE = "brief" as const;

// Cap conversational history we forward to keep the prompt bounded.
const MAX_HISTORY = 8;
const MAX_QUESTION_CHARS = 2000;
const MAX_MESSAGE_CHARS = 1500;

type ChatRole = "user" | "assistant";

interface ChatTurn {
  readonly role: ChatRole;
  readonly content: string;
}

interface AskBody {
  question?: unknown;
  history?: unknown;
}

async function requireAdmin(): Promise<{ ok: true; email: string } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }
  return { ok: true, email: session.user.email ?? "unknown" };
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim();
    if (!text) continue;
    turns.push({ role, content: text.slice(0, MAX_MESSAGE_CHARS) });
  }
  return turns.slice(-MAX_HISTORY);
}

/**
 * Compact, JSON-shaped grounding context. Built from real loaders only — the
 * static operating assessment, the live launch assessment (best-effort), and
 * the Daily Command rollup. No fabricated metrics: any loader that fails is
 * simply omitted and recorded in `groundedOn`.
 */
async function buildGrounding(): Promise<{ context: string; groundedOn: string[] }> {
  const groundedOn: string[] = [];
  const grounding: Record<string, unknown> = {};

  try {
    const operating = buildJarvisOperatingAssessment();
    grounding["operatingAssessment"] = {
      companyHealth: operating.companyHealth,
      departmentHealth: operating.departmentHealth,
      topRisks: operating.topRisks,
      ownerDecisions: operating.ownerDecisions,
      safeAutonomousTasks: operating.safeAutonomousTasks,
      staleDataWarnings: operating.staleDataWarnings,
      publicGateStatus: operating.publicGateStatus,
      calibrationStatus: operating.calibrationStatus,
      revenueStatus: operating.revenueStatus,
      memoryStatus: operating.memoryStatus,
      claudeReview: operating.claudeReview,
      nextBestAction: operating.nextBestAction,
    };
    groundedOn.push("operating-assessment");
  } catch {
    // omit — never fabricate
  }

  try {
    const { assessment, performancePolicy } = await loadJarvisAssessment();
    grounding["launchAssessment"] = {
      launchStatus: assessment.launchStatus,
      confidenceLevel: assessment.confidenceLevel,
      readinessGates: assessment.readinessGateSummary,
      safetyWarnings: assessment.safetyWarnings.slice(0, 6),
      externalConfigWarnings: assessment.externalConfigWarnings.slice(0, 10),
      recommendedNextActions: assessment.recommendedNextActions.slice(0, 6),
      picksStatus: assessment.picksStatus,
      ingestionStatus: assessment.ingestionStatus,
      settlementStatus: assessment.settlementStatus,
      performanceStatus: assessment.performanceStatus,
      publicPerformancePolicy: {
        publicMessage: performancePolicy.publicMessage,
        operatorMessage: performancePolicy.operatorMessage,
      },
    };
    groundedOn.push("launch-assessment");
  } catch {
    // loadJarvisAssessment is best-effort; omit on failure
  }

  try {
    const command = await loadDailyCommand();
    grounding["dailyCommand"] = {
      headline: command.headline,
      dataMode: command.dataMode,
      lanes: command.lanes.map((lane) => ({
        title: lane.title,
        dataMode: lane.dataMode,
        fallbackReason: lane.fallbackReason,
        openExceptions: lane.cards.filter((c) => c.taskId !== null).length,
        topCards: lane.cards.slice(0, 4).map((c) => ({
          title: c.title,
          whyItMatters: c.whyItMatters,
          risk: c.risk,
        })),
      })),
      signalGauges: command.signalGauges,
    };
    groundedOn.push("daily-command");
  } catch {
    // never throws in practice; guard anyway
  }

  return { context: JSON.stringify(grounding), groundedOn };
}

const SYSTEM_PREAMBLE = [
  "You are Jarvis, the owner-facing operating assistant for the Galaxy Sports Edge platform.",
  "You speak ONLY to the platform owner inside a private admin cockpit.",
  "",
  "HARD RULES:",
  "- You are ADVISORY ONLY. You cannot and must not take any action: no approving or transitioning tasks, no publishing, no spending, no sending of messages, no external calls. If asked to do something, explain that you can only advise and the owner must act in the cockpit.",
  "- Answer ONLY from the GROUNDING CONTEXT below (the live operating state). Do not invent metrics, revenue, accuracy figures, win rates, or status that is not present in the context.",
  "- If the answer is not in the grounding context, say plainly: \"I don't have that wired yet.\" and, if useful, name what would need to be instrumented. Honesty over confidence.",
  "- Never fabricate numbers. If a metric is labeled NOT_WIRED, DESIGNED, UNKNOWN, or stub/demo, say so rather than guessing.",
  "- Be concise and direct — this is an operator console. Lead with the answer, then the why.",
  "",
  "GROUNDING CONTEXT (the only source of truth — JSON):",
].join("\n");

function buildUserPrompt(question: string, history: ChatTurn[], context: string): string {
  const transcript =
    history.length > 0
      ? history
          .map((t) => `${t.role === "user" ? "Owner" : "Jarvis"}: ${t.content}`)
          .join("\n")
      : "(no prior turns)";
  return [
    `GROUNDING CONTEXT:\n${context}`,
    "",
    `CONVERSATION SO FAR:\n${transcript}`,
    "",
    `OWNER'S QUESTION:\n${question}`,
    "",
    "Answer the owner's question using only the grounding context above. If it isn't covered, say you don't have it wired yet.",
  ].join("\n");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json().catch(() => ({}))) as AskBody;
  if (typeof body.question !== "string" || body.question.trim().length === 0) {
    return NextResponse.json(
      { error: "question is required (non-empty string)" },
      { status: 400 }
    );
  }
  const question = body.question.trim().slice(0, MAX_QUESTION_CHARS);
  const history = sanitizeHistory(body.history);

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey || apiKey.trim() === "") {
    // Honest degrade — not a hard error. Chat just can't reach the model.
    return NextResponse.json({
      answer:
        "I can't reach the model right now — ANTHROPIC_API_KEY is not configured, so live chat is paused. The cockpit panels still show the real operating state.",
      modelName: pickModelForSurface(MODEL_SURFACE),
      groundedOn: [],
    });
  }

  // Budget gate — over budget returns an honest "paused" answer, never a 500.
  try {
    const [monthlySpendUsd, budget] = await Promise.all([
      getCurrentMonthClaudeSpendUsd(COST_SURFACE),
      loadClaudeBudgetPolicy(COST_SURFACE),
    ]);
    if (!budget.overrideActive) {
      const usage = evaluateClaudeBudgetUsage(COST_SURFACE, monthlySpendUsd, budget.policy);
      if (!usage.requestAllowed) {
        return NextResponse.json({
          answer:
            "Jarvis chat is paused — the Claude API budget for this billing cycle is exhausted. The cockpit panels still reflect the real operating state, and chat resumes next cycle (or with an owner budget override).",
          modelName: pickModelForSurface(MODEL_SURFACE),
          groundedOn: [],
          budgetPaused: true,
        });
      }
    }
  } catch {
    // If the budget probe itself fails (e.g. DB unreachable), fall through and
    // attempt the call — the metered call is small and the gate is best-effort.
  }

  const { context, groundedOn } = await buildGrounding();
  const modelName = pickModelForSurface(MODEL_SURFACE);

  const ledger = async (args: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    success: boolean;
    errorKind: string | null;
  }): Promise<void> => {
    try {
      await recordClaudeApiCall({
        surface: COST_SURFACE,
        modelName,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
        userId: guard.email,
        gameId: null,
        templateKind: "JARVIS_ASK",
        durationMs: args.durationMs,
        success: args.success,
        errorKind: args.errorKind,
      });
    } catch {
      // A ledger failure must never break the owner's request.
    }
  };

  try {
    const result = await callClaudeMessages({
      apiKey,
      surface: MODEL_SURFACE,
      maxTokens: 600,
      temperature: 0.2,
      system: SYSTEM_PREAMBLE + "\n" + context,
      user: buildUserPrompt(question, history, context),
    });

    await ledger({
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
    });

    return NextResponse.json({
      answer: result.text,
      modelName: result.modelName,
      groundedOn,
    });
  } catch (error) {
    if (error instanceof ClaudeMessagesError) {
      await ledger({
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
      });
    }
    // Honest degrade rather than a raw 500 — chat is advisory and non-critical.
    return NextResponse.json({
      answer:
        "I hit an error reaching the model and couldn't answer that. Nothing was changed. Try again in a moment — the cockpit panels still show the real operating state.",
      modelName,
      groundedOn,
      errored: true,
    });
  }
}
