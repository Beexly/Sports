import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { ClaudeMessagesError } from "@/lib/claude-api/messages";
import { captureError } from "@/lib/observability/sentry";
import { callClaude } from "@/lib/claude-api/provider-dispatch";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import type { GameIntelligenceNode, UserLens } from "@/lib/intelligence-graph";
import {
  buildAskTheSlateContext,
  buildAskTheSlatePrelude,
  buildAskThisGameContext,
  buildAskThisGamePrelude,
  buildExplainForMyLensContext,
  buildExplainForMyLensPrelude,
  REFUSAL_TEMPLATES,
  SYSTEM_PROMPT,
  type ModelCourtMode,
  type RefusalKind,
} from "@/lib/intelligence-graph/model-court/prompts";
import { validateNumericClaims } from "@/lib/claude-api/numeric-guard";
import { sanitizePromptInput } from "@/lib/claude-api/prompt-sanitize";

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
  // SECURITY (GSE-SEC-057, Model Court): the reader's question is interpolated
  // raw at `User question:\n${question}` in every prelude builder. Unsanitized,
  // a Pro user can forge headings and fences inside the user turn and restructure
  // the instruction around the grounded evidence. The pick explainer has escaped
  // this input since GSE-SEC-057; the Model Court did not. Sanitize ONCE, here,
  // so refusal detection and the prompt see the same text — a question cannot use
  // a control character to split a banned phrase past `detectModelCourtRefusal`
  // and then reassemble it inside the prompt.
  //
  // This closes the STRUCTURE half of the injection. The GROUNDING half — a
  // question seeding numbers into the allowed set — is closed separately by
  // `buildPromptParts`, which keeps the question out of `groundingContext`.
  const safeInput: ModelCourtAnswerInput = {
    ...input,
    question: sanitizePromptInput(input.question),
  };

  const refusalKind = detectModelCourtRefusal(safeInput);
  if (refusalKind) {
    return {
      bodyMarkdown: renderRefusal(refusalKind, safeInput),
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

  try {
    const { promptUser, groundingContext } = buildPromptParts(safeInput);
    const result = await callClaude({
      apiKey: options.apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 1200,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      user: promptUser,
      cache: { system: true },
    });
    // GROUNDING: validate numbers against `groundingContext` — the evidence
    // ONLY — never against `promptUser`, which also carries the user's raw
    // question. Grounding on the prelude let a user seed their own statistic
    // ("why are they 11-1 ATS?") and have the model echo it back as fact.
    // A question is not evidence. Mirrors explainPick, which grounds on
    // `grounded.context` and deliberately excludes the reader's question.
    const policyFailures = evaluateModelCourtAnswerPolicy(result.text, groundingContext);
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
    });

    return {
      bodyMarkdown: result.text,
      refusalKind: null,
      usedClaude: true,
      modelName: result.modelName,
    };
  } catch (error) {
    if (error instanceof ModelCourtAnswerError) throw error;
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
      });
    }

    // SECURITY (GSE-SEC-071, ported from explainPick): do NOT put `error.message`
    // on the thrown error. `ClaudeMessagesError` is constructed as
    // `Claude API error: ${status} - ${await response.text()}` (messages.ts), so its
    // message carries the RAW upstream Anthropic response body — request ids,
    // account/quota detail, model names, internal error text. The Model Court route
    // returns `error.message` verbatim as a 422 body, which would hand all of that
    // to any authenticated Pro user who can open a game room.
    //
    // The detail is not lost: the status is ledgered above as `HTTP_<status>` and
    // the full error goes to Sentry here. The CALLER gets a generic message.
    captureError(error, {
      surface: "MODEL_COURT_ANSWER",
      upstreamStatus: error instanceof ClaudeMessagesError ? error.status : null,
      modelName: error instanceof ClaudeMessagesError ? error.modelName : null,
    });

    throw new ModelCourtAnswerError("The Model Court is temporarily unavailable. Please try again shortly.");
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

export function evaluateModelCourtAnswerPolicy(bodyMarkdown: string, groundingText?: string): string[] {
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
  if (groundingText !== undefined) {
    // Hand the guard the grounding TEXT, not a flattened list of values — the
    // KIND of each number lives in its label. See lib/claude-api/numeric-guard.ts.
    if (!validateNumericClaims(text, { text: groundingText }).grounded) {
      failures.push("UNGROUNDED_NUMERIC");
    }
  }

  return failures;
}

export interface ModelCourtPromptParts {
  /** Full user turn sent to the model: grounded context + the user's question. */
  readonly promptUser: string;
  /** Grounded evidence ONLY — the question is excluded. Guard against this. */
  readonly groundingContext: string;
}

export function buildPromptParts(input: ModelCourtAnswerInput): ModelCourtPromptParts {
  if (input.mode === "ASK_THE_SLATE") {
    const slate = input.slate ?? {};
    return {
      promptUser: buildAskTheSlatePrelude(slate, input.question),
      groundingContext: buildAskTheSlateContext(slate),
    };
  }
  if (input.mode === "EXPLAIN_FOR_MY_LENS") {
    if (!input.node || !input.lens) {
      throw new ModelCourtAnswerError("Model Court lens mode requires a game and lens context.");
    }
    const nodeContext = toCourtNodeContext(input.node);
    return {
      promptUser: buildExplainForMyLensPrelude(nodeContext, input.question, input.lens),
      groundingContext: buildExplainForMyLensContext(nodeContext, input.lens),
    };
  }
  if (!input.node) {
    throw new ModelCourtAnswerError("Model Court game mode requires a game context.");
  }
  const nodeContext = toCourtNodeContext(input.node);
  return {
    promptUser: buildAskThisGamePrelude(nodeContext, input.question),
    groundingContext: buildAskThisGameContext(nodeContext),
  };
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
    },
    args.options.usageClient
  );
}
