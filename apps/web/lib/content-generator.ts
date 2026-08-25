/**
 * Content generator using Claude API (or Cerebras free-lane when enabled).
 * IMPORTANT: LLMs are ONLY used for writing narrative content.
 * Pick data is the source of truth; models never generate picks.
 */

import type { ContentGenerationInput, GeneratedContent } from "@sports/types";
import { format } from "date-fns";
import { BRAND_NAME } from "./brand.js";
import { generateSlug } from "./utils.js";
import {
  estimateClaudeCostUsd,
  evaluateClaudeBudgetUsage,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import { validateNumericClaims, type GroundedValue } from "@/lib/claude-api/numeric-guard";
import { ClaudeMessagesError } from "@/lib/claude-api/messages";
import { jynxComplete } from "@/lib/claude-api/jynx-complete";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
  type ClaudeUsageStoreDb,
} from "@/lib/claude-api/usage-store";

const GAMBLING_DISCLAIMER =
  "This article is for informational and entertainment purposes only. " +
  `${BRAND_NAME} does not guarantee any outcomes. Sports betting involves risk. ` +
  "Please gamble responsibly and only bet what you can afford to lose.";

export interface BlogGenerationOptions {
  readonly fetchImpl?: typeof fetch;
  readonly monthlySpendUsd?: number;
  readonly budgetPolicy?: ClaudeApiBudgetPolicy;
  readonly budgetOverrideActive?: boolean;
  readonly recordUsage?: boolean;
  readonly usageClient?: ClaudeUsageStoreDb;
  readonly userId?: string | null;
  /** Inject env for free-lane tests (defaults to process.env). */
  readonly env?: Record<string, string | undefined>;
}

type ParsedBlogGeneration = {
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

type BlogGenerationPolicyReason =
  | "MISSING_FIELD"
  | "MISSING_DISCLAIMER"
  | "CERTAINTY_LANGUAGE"
  | "INVALID_TAGS"
  | "UNGROUNDED_NUMERIC";

export interface BlogGenerationPolicyResult {
  readonly allowed: boolean;
  readonly reason: BlogGenerationPolicyReason | null;
}

/**
 * What the numeric guard is allowed to treat as "this number came from real data".
 *
 * `dataText` is the PICKS DATA block ONLY — deliberately NOT the assembled user
 * prompt. The prompt wraps the data in formatting requirements ("4-6 paragraphs",
 * "3-5 relevant tags") whose numbers are record-shaped, so grounding on the whole
 * prompt whitelists 3/4/5/6 and lets the model launder a fabricated record
 * ("Boston is 4-6 as a road favorite") through the platform's own instructions.
 * An instruction is not evidence.
 */
export interface BlogNumericGrounding {
  /** The PICKS DATA block the model was given. Never the surrounding prompt. */
  readonly dataText: string;
  /**
   * Structured numeric values read straight off the pick records (the source of
   * truth). Needed because a signed line renders as "-3.5" and the claim
   * extractor skips a digit preceded by "-", so the real line would otherwise be
   * absent from the grounding set while legitimate copy ("laying 3.5") reads as
   * fabricated. Both the signed value and its magnitude are the SAME real
   * number — nothing the picks do not actually hold is added here.
   *
   * Typed as `magnitude`, which is the kind the claim extractor assigns to a
   * bare number in prose, and `COMPATIBLE_KINDS.magnitude` is `["magnitude"]`
   * alone. So a line grounds "laying 3.5" and grounds nothing else — it cannot
   * be borrowed to justify a record, a percentage, or a money figure that
   * happens to share the digits.
   */
  readonly values: readonly GroundedValue[];
}

/**
 * Derives the data-only grounding set for a blog generation. Callers must build
 * it from the pick records, never from the prompt they assembled.
 */
export function buildBlogNumericGrounding(
  input: ContentGenerationInput,
  picksDataBlock: string,
): BlogNumericGrounding {
  return {
    dataText: picksDataBlock,
    values: input.picks.flatMap((pick): readonly GroundedValue[] => [
      { value: pick.line, kind: "magnitude" },
      { value: Math.abs(pick.line), kind: "magnitude" },
    ]),
  };
}

/** True when model id is a Claude Anthropic id (billable at Claude rates). */
function isAnthropicClaudeModel(modelName: string): boolean {
  return modelName.startsWith("claude-") || modelName.includes("anthropic");
}

export async function generateBlogPost(
  input: ContentGenerationInput,
  options: BlogGenerationOptions = {}
): Promise<GeneratedContent> {
  const env = options.env ?? process.env;
  const apiKey = env["ANTHROPIC_API_KEY"]?.trim() ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");
  // The DATA block — the model's only source of truth, and the only text the
  // numeric guard grounds on. Kept as its own binding so it can be handed to the
  // guard without the surrounding prompt instructions.
  const picksSummary = input.picks
    .map(
      (p, i) =>
        `${i + 1}. ${p.game} - ${p.pickType}: ${p.selection} (Line: ${p.line}, Confidence: ${p.confidence}/100)\n   Reasoning: ${p.reasoning}`
    )
    .join("\n\n");

  const systemPrompt = `You are a sports analyst writing data-backed analysis for a sports picks website.
You must ONLY reference the data provided to you. Do not invent statistics, scores, or records.
Use measured language; never say "will win" or "guaranteed". Use phrases like "our model favors" or "the data suggests".
Always include the provided disclaimer at the end.`;

  const userPrompt = `Write a sports analysis blog post for ${input.sport} picks on ${dateDisplay}.

PICKS DATA (this is your ONLY source of truth; do not invent any other data):
${picksSummary}

Requirements:
- Title: Make it SEO-friendly, include sport and date
- Excerpt: 2 paragraph summary (free preview)
- Content: Full analysis (4-6 paragraphs) referencing only the above data
- Include this disclaimer at end: "${GAMBLING_DISCLAIMER}"
- SEO title (under 60 chars)
- SEO description (under 155 chars)
- Tags: 3-5 relevant tags

Respond ONLY with valid JSON in this exact format:
{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "tags": ["...", "..."]
}`;

  // Anthropic path default; free-lane uses Cerebras model when enabled for surface "content".
  const anthropicModelName = "claude-sonnet-4-6";
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
          getCurrentMonthClaudeSpendUsd("BLOG_GENERATION"),
          loadClaudeBudgetPolicy("BLOG_GENERATION"),
        ]);

  if (!budget.overrideActive) {
    const usage = evaluateClaudeBudgetUsage("BLOG_GENERATION", monthlySpendUsd, budget.policy);
    if (!usage.requestAllowed) {
      throw new Error(usage.fallbackMessage ?? "Blog drafting is paused while the API budget recovers.");
    }
  }

  let parsed: ParsedBlogGeneration;
  try {
    // Free-lane (Cerebras) when CONTENT_FREE_LANE_ENABLED + key + surface content;
    // else callClaude (Bedrock / Vertex / Anthropic). Policy + numeric-guard unchanged.
    const result = await jynxComplete(
      {
        apiKey,
        fetchImpl: options.fetchImpl,
        surface: "content",
        model: anthropicModelName,
        maxTokens: 2000,
        system: systemPrompt,
        user: userPrompt,
        cache: { system: true },
      },
      env,
    );
    try {
      parsed = parseGeneratedBlogResponse(result.text);
    } catch {
      await maybeRecordBlogUsage({
        options,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: "PARSE_ERROR",
      });
      throw new Error("Could not parse JSON from Claude response");
    }

    // GROUNDING: validate numbers against the PICKS DATA block only — never the
    // assembled `userPrompt`, which also carries this file's own formatting
    // requirements ("4-6 paragraphs", "3-5 relevant tags"). Those are
    // record-shaped, so grounding on the prompt let the platform's instructions
    // whitelist 3/4/5/6 for the model to echo back as a team record.
    const policy = evaluateGeneratedBlogPolicy(parsed, buildBlogNumericGrounding(input, picksSummary));
    if (!policy.allowed) {
      await maybeRecordBlogUsage({
        options,
        modelName: result.modelName,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: result.durationMs,
        success: false,
        errorKind: `POLICY_${policy.reason ?? "UNKNOWN"}`,
      });
      throw new Error("Generated blog post failed policy validation.");
    }

    await maybeRecordBlogUsage({
      options,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      success: true,
      errorKind: null,
    });
  } catch (error) {
    if (error instanceof ClaudeMessagesError) {
      await maybeRecordBlogUsage({
        options,
        modelName: error.modelName,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: error.durationMs,
        success: false,
        errorKind: `HTTP_${error.status}`,
      });
    }
    throw error;
  }

  return {
    title: parsed.title,
    slug: generateSlug(`${input.sport}-picks-${input.date}`),
    excerpt: parsed.excerpt,
    content: parsed.content,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    tags: parsed.tags,
  };
}

function parseGeneratedBlogResponse(text: string): ParsedBlogGeneration {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    throw new Error("Could not parse JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string;
    excerpt: string;
    content: string;
    seoTitle: string;
    seoDescription: string;
    tags: string[];
  };

  return parsed;
}

export function evaluateGeneratedBlogPolicy(
  post: ParsedBlogGeneration,
  grounding?: BlogNumericGrounding,
): BlogGenerationPolicyResult {
  const fields = [
    post.title,
    post.excerpt,
    post.content,
    post.seoTitle,
    post.seoDescription,
  ];

  if (fields.some((field) => typeof field !== "string" || field.trim().length === 0)) {
    return { allowed: false, reason: "MISSING_FIELD" };
  }

  if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 5) {
    return { allowed: false, reason: "INVALID_TAGS" };
  }

  if (post.tags.some((tag) => typeof tag !== "string" || tag.trim().length === 0)) {
    return { allowed: false, reason: "INVALID_TAGS" };
  }

  if (!post.content.includes("Please gamble responsibly and only bet what you can afford to lose.")) {
    return { allowed: false, reason: "MISSING_DISCLAIMER" };
  }

  const certaintyPatterns = [
    /\bwill win\b/i,
    /\bfree money\b/i,
    /\bcannot miss\b/i,
    /\bsure thing\b/i,
    new RegExp(`\\b${"lo"}${"ck"}\\b`, "i"),
    /\bhammer\b/i,
  ];
  const publicText = [post.title, post.excerpt, post.content, post.seoTitle, post.seoDescription].join("\n");
  if (certaintyPatterns.some((pattern) => pattern.test(publicText))) {
    return { allowed: false, reason: "CERTAINTY_LANGUAGE" };
  }

  // Numeric grounding: every stat-shaped number in the copy must have appeared in
  // the PICKS DATA the model was given (the model's only source of truth). Blocks a
  // hallucinated stat before it could ever be persisted/published. Only runs when
  // the caller supplies grounding.
  if (grounding) {
    // Grounding TEXT, not flattened values — the kind of each number lives in
    // its label, and flattening is exactly what discarded the meaning. See
    // lib/claude-api/numeric-guard.ts. The text is `dataText` (the PICKS DATA
    // block) and never the assembled prompt: see BlogNumericGrounding above for
    // why an instruction is not evidence.
    if (
      !validateNumericClaims(publicText, {
        text: grounding.dataText,
        values: grounding.values,
      }).grounded
    ) {
      return { allowed: false, reason: "UNGROUNDED_NUMERIC" };
    }
  }

  return { allowed: true, reason: null };
}

async function maybeRecordBlogUsage(args: {
  readonly options: BlogGenerationOptions;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly durationMs: number;
  readonly success: boolean;
  readonly errorKind: string | null;
}): Promise<void> {
  if (!args.options.recordUsage) return;

  // Free-lane / non-Claude providers: do not invent Anthropic $ for gpt-oss ids.
  const estimatedCostUsd = isAnthropicClaudeModel(args.modelName)
    ? estimateClaudeCostUsd(args.inputTokens, args.outputTokens)
    : 0;

  await recordClaudeApiCall(
    {
      surface: "BLOG_GENERATION",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd,
      userId: args.options.userId ?? null,
      gameId: null,
      templateKind: null,
      durationMs: args.durationMs,
      success: args.success,
      errorKind: args.errorKind,
    },
    args.options.usageClient
  );
}
