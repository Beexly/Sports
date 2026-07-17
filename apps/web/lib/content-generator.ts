/**
 * Content generator using Claude API.
 * IMPORTANT: Claude is ONLY used for writing narrative content.
 * Pick data is the source of truth; Claude never generates picks.
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
import { extractNumericClaims, validateNumericClaims } from "@/lib/claude-api/numeric-guard";
import { ClaudeMessagesError } from "@/lib/claude-api/messages";
import { callClaude } from "@/lib/claude-api/provider-dispatch";
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

export async function generateBlogPost(
  input: ContentGenerationInput,
  options: BlogGenerationOptions = {}
): Promise<GeneratedContent> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");
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

  const modelName = "claude-sonnet-4-6";
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
    const result = await callClaude({
      apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 2000,
      system: systemPrompt,
      user: userPrompt,
      cache: { system: true },
    });
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

    const policy = evaluateGeneratedBlogPolicy(parsed, { promptText: userPrompt });
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
  grounding?: { readonly promptText: string },
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
  // the source prompt (the model's only data). Blocks a hallucinated stat before it
  // could ever be persisted/published. Only runs when the caller supplies grounding.
  if (grounding) {
    const allowed = extractNumericClaims(grounding.promptText).map((c) => c.value);
    if (!validateNumericClaims(publicText, { allowed }).grounded) {
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

  await recordClaudeApiCall(
    {
      surface: "BLOG_GENERATION",
      modelName: args.modelName,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      estimatedCostUsd: estimateClaudeCostUsd(args.inputTokens, args.outputTokens),
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
