import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { ClaudeMessagesError } from "@/lib/claude-api/messages";
import { callClaude } from "@/lib/claude-api/provider-dispatch";
import type { LlmDispatchRecord } from "@/lib/claude-api/cost-policy";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import type { GameIntelligenceNode, UserLens } from "@/lib/intelligence-graph";
import {
  buildAskTheSlatePrelude,
  buildAskThisGamePrelude,
  buildExplainForMyLensPrelude,
  REFUSAL_TEMPLATES,
  SYSTEM_PROMPT,
  type ModelCourtMode,
  type RefusalKind,
} from "@/lib/intelligence-graph/model-court/prompts";

export interface ModelCourtLensContext {
  readonly kind: UserLens;
  readonly details: unknown;
}

export interface ModelCourtAnswerInput {
  readonly mode: ModelCourtMode;
  readonly question: string;
  readonly node?: GameIntelligenceNode;
  readonly slate?: unknown;
  readonly lens?: ModelCourtLensContext;
}

export interface ModelCourtAnswerOptions {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly model?: string;
  readonly monthlySpendUsd?: number;
  readonly budgetPolicy?: ClaudeApiBudgetPolicy;
  readonly budgetOverrideActive?: boolean;
  readonly recordUsage?: boolean;
  readonly usageClient?: ClaudeUsageStoreDb;
  readonly userId?: string | null;
}

export interface ModelCourtAnswer {
  readonly bodyMarkdown: string;
  readonly refusalKind: RefusalKind | null;
  readonly usedClaude: boolean;
  readonly modelName: string | null;
}

export class ModelCourtAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelCourtAnswerError";
  }
}

const CERTAINTY_PATTERNS = [
  /\bwill\b.*\bcover\b/i,
  /\bwill\b.*\bwin\b/i,
  /\bshould\b.*\bbet\b/i,
  /\bwho wins\b/i,
  /\bpredict\b/i,
] as const;

const PERSONAL_ADVICE_PATTERNS = [
  /\bbankroll\b/i,
  /\bstake\b/i,
  /\bbet size\b/i,
  /\bhow much\b.*\bbet\b/i,
  /\bhedge\b/i,
  /\bunit\b/i,
] as const;

const EV_PATTERNS = [
  /\bev\b/i,
  /\bexpected value\b/i,
  /\bkelly\b/i,
  /\bwin rate\b/i,
  /\bwin-rate\b/i,
  /\broi\b/i,
] as const;

const COMPETITOR_PATTERNS = [
  /\bcompare\b.*\b(other|operator|service|site)\b/i,
  /\bbetter than\b/i,
  /\bdraftkings\b.*\bfanduel\b/i,
  /\bfanduel\b.*\bdraftkings\b/i,
] as const;

const ANSWER_CITATION_PATTERN = /\(source:\s+[a-z0-9_-]+\s+at\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\)/i;

export async function answerModelCourtQuestion(
  input: ModelCourtAnswerInput,
  options: ModelCourtAnswerOptions
): Promise<ModelCourtAnswer> {
  const refusalKind = detectModelCourtRefusal(input);
  if (refusalKind) {
    return {
      bodyMarkdown: renderRefusal(refusalKind, input),
      refusalKind,
      usedClaude: false,
      modelName: null,
    };
  }

  const modelName = options.model ?? "claude-sonnet-4-6";
  const [monthlySpendUsd, budget] =
    typeof options.monthlySpendUsd === "number" && options.budgetPolicy
      ? [
          options.monthlySpendUsd,
          {
            policy: options.budgetPolicy,
            overrideActive: options.budgetOverrideActive ?? false,
          },
        ]
      : await Promise.all([
          getCurrentMonthClaudeSpendUsd("MODEL_COURT_ANSWER"),
          loadClaudeBudgetPolicy("MODEL_COURT_ANSWER"),
        ]);

  if (!budget.overrideActive) {
    const usage = evaluateClaudeBudgetUsage("MODEL_COURT_ANSWER", monthlySpendUsd, budget.policy);
    if (!usage.requestAllowed) {
      throw new ModelCourtAnswerError(
        usage.fallbackMessage ?? "The Model Court is at capacity for this billing cycle."
      );
    }
  }

  let dispatch: LlmDispatchRecord | null = null;
  try {
    const result = await callClaude(
      {
        apiKey: options.apiKey,
        fetchImpl: options.fetchImpl,
        model: modelName,
        maxTokens: 1200,
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        user: buildPromptUser(input),
        cache: { system: true },
      },
      undefined,
      { onDispatch: (record) => { dispatch = record; } },
    );
    const policyFailures = evaluateModelCourtAnswerPolicy(result.text);
    if (policyFailures.length > 0) {
      await maybeRecordModelCourtUsage({
        input,
        options,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `POLICY_${policyFailures[0]}`,
        dispatch,
      });
      throw new ModelCourtAnswerError(`Model Court answer failed policy validation: ${policyFailures.join(", ")}`);
    }

    await maybeRecordModelCourtUsage({
      input,
      options,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
      dispatch,
    });

    return {
      bodyMarkdown: result.text,
      refusalKind: null,
      usedClaude: true,
      modelName: result.modelName,
    };
  } catch (error) {
    if (error instanceof ClaudeMessagesError) {
      await maybeRecordModelCourtUsage({
        input,
        options,
        modelName: error.modelName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
        dispatch,
      });
    }
    throw new ModelCourtAnswerError(error instanceof Error ? error.message : "Model Court answer failed.");
  }
}

export function detectModelCourtRefusal(input: ModelCourtAnswerInput): RefusalKind | null {
  const question = input.question.trim();

  if ((input.mode === "ASK_THIS_GAME" || input.mode === "EXPLAIN_FOR_MY_LENS") && !input.node) {
    return "GAME_NOT_IN_CONTEXT";
  }
  if (input.mode === "EXPLAIN_FOR_MY_LENS" && !input.lens) {
    return "GAME_NOT_IN_CONTEXT";
  }
  if (matchesAny(question, PERSONAL_ADVICE_PATTERNS)) {
    return "PERSONAL_ADVICE";
  }
  if (matchesAny(question, EV_PATTERNS)) {
    return "EV_KELLY_WINRATE";
  }
  if (matchesAny(question, COMPETITOR_PATTERNS)) {
    return "COMPETITOR_COMPARE";
  }
  if (matchesAny(question, CERTAINTY_PATTERNS)) {
    return "BETTING_CERTAINTY";
  }
  if (input.node && input.node.evidenceHealth.status === "THIN") {
    return "EVIDENCE_THIN";
  }
  if (input.node && input.node.evidenceHealth.score < 55) {
    return "EVIDENCE_THIN";
  }

  return null;
}

export function evaluateModelCourtAnswerPolicy(bodyMarkdown: string): string[] {
  const failures: string[] = [];
  const text = bodyMarkdown.trim();

  if (text.length === 0) {
    failures.push("EMPTY");
  }
  if (text.length > 4000) {
    failures.push("TOO_LONG");
  }
  if (!ANSWER_CITATION_PATTERN.test(text)) {
    failures.push("MISSING_CITATION");
  }
  if (matchesAny(text, CERTAINTY_PATTERNS)) {
    failures.push("BETTING_CERTAINTY");
  }
  if (matchesAny(text, PERSONAL_ADVICE_PATTERNS)) {
    failures.push("PERSONAL_ADVICE");
  }
  if (matchesAny(text, EV_PATTERNS)) {
    failures.push("EV_KELLY_WINRATE");
  }
  if (matchesAny(text, COMPETITOR_PATTERNS)) {
    failures.push("COMPETITOR_COMPARE");
  }

  return failures;
}

function buildPromptUser(input: ModelCourtAnswerInput): string {
  if (input.mode === "ASK_THE_SLATE") {
    return buildAskTheSlatePrelude(input.slate ?? {}, input.question);
  }
  if (input.mode === "EXPLAIN_FOR_MY_LENS") {
    if (!input.node || !input.lens) {
      throw new ModelCourtAnswerError("Model Court lens mode requires a game and lens context.");
    }
    return buildExplainForMyLensPrelude(toCourtNodeContext(input.node), input.question, input.lens);
  }
  if (!input.node) {
    throw new ModelCourtAnswerError("Model Court game mode requires a game context.");
  }
  return buildAskThisGamePrelude(toCourtNodeContext(input.node), input.question);
}

function toCourtNodeContext(node: GameIntelligenceNode): Record<string, unknown> {
  const bootstrapSharePct = bootstrapShare(node);

  return {
    matchup: node.matchup,
    sport: node.sport,
    startsAt: node.commenceTime,
    status: "tracked",
    edgeIndex: node.marketPulse.edgeIndex ?? "n/a",
    publishThresholdCleared: node.marketPulse.publishedPickCount > 0,
    gateDecisionOutcome: node.marketPulse.gatedByBootstrap ? "gated" : "canonical",
    gateDecisionReason: node.marketPulse.gatedByBootstrap ? "bootstrap data present" : "canonical evidence available",
    evidenceHealthGrade: node.evidenceHealth.status,
    evidenceFreshnessSeconds: "n/a",
    bootstrapSharePct,
    booksPolled: node.marketPulse.bookmakerCoverage,
    booksReporting: node.marketPulse.bookmakerCoverage,
    consensus: "n/a",
    lineMovement: movementSummary(node),
    volatility: "n/a",
    sharpMoneySignal: "n/a",
    picksSummary: pickSummary(node),
    premortemText: `/room/${node.id}#premortem`,
    evidenceRefsList: evidenceRefs(node),
  };
}

function renderRefusal(kind: RefusalKind, input: ModelCourtAnswerInput): string {
  const node = input.node;
  const replacements: Record<string, string> = {
    grade: node?.evidenceHealth.status ?? "thin",
    bootstrapSharePct: node ? String(bootstrapShare(node)) : "100",
    premortemLink: node ? `/room/${node.id}#premortem` : "/board",
    ledgerLink: "/ledger",
    edgeIndex: node?.marketPulse.edgeIndex === null || typeof node?.marketPulse.edgeIndex === "undefined"
      ? "n/a"
      : String(node.marketPulse.edgeIndex),
    publishStatus: node?.marketPulse.publishedPickCount ? "cleared" : "not cleared",
    gateOrPickContext: node ? pickSummary(node) : "No game evidence is attached.",
    premortemTextOrLink: node ? `/room/${node.id}#premortem` : "/board",
    gameId: node?.id ?? "unknown",
  };

  return REFUSAL_TEMPLATES[kind].replace(/\{\{([a-zA-Z0-9]+)\}\}/g, (_match, key: string) => {
    return replacements[key] ?? "n/a";
  });
}

function movementSummary(node: GameIntelligenceNode): string {
  const spread = node.marketPulse.lineMovementSpread;
  const total = node.marketPulse.lineMovementTotal;
  if (spread === null && total === null) return "n/a";
  return `spread ${spread ?? "n/a"}, total ${total ?? "n/a"}`;
}

function pickSummary(node: GameIntelligenceNode): string {
  if (node.picks.length === 0) return "No published picks attached.";
  return node.picks
    .map((pick) =>
      [
        pick.selection,
        pick.market,
        `confidence ${pick.confidence}`,
        `edge ${pick.edgeScore}`,
        pick.isBootstrap ? "bootstrap" : "canonical",
      ].join(" | ")
    )
    .join("\n");
}

function evidenceRefs(node: GameIntelligenceNode): string {
  return [
    `(source: intelligence-graph at ${node.commenceTime})`,
    `(source: evidence-health at ${node.commenceTime})`,
  ].join("\n");
}

function bootstrapShare(node: GameIntelligenceNode): number {
  const { sourceCount, bootstrapCount } = node.evidenceHealth;
  if (sourceCount <= 0) return 100;
  return Math.round((bootstrapCount / sourceCount) * 100);
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

async function maybeRecordModelCourtUsage(args: {
  readonly input: ModelCourtAnswerInput;
  readonly options: ModelCourtAnswerOptions;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly success: boolean;
  readonly errorKind: string | null;
  readonly dispatch: LlmDispatchRecord | null;
}): Promise<void> {
  if (!args.options.recordUsage) return;

  await recordClaudeApiCall(
    {
      surface: "MODEL_COURT_ANSWER",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
      userId: args.options.userId ?? null,
      gameId: args.input.node?.id ?? null,
      templateKind: args.input.mode,
      durationMs: args.durationMs,
      success: args.success,
      errorKind: args.errorKind,
      dispatch: args.dispatch,
    },
    args.options.usageClient
  );
}
