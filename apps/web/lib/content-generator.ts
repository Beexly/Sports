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
import { callClaudeMessages, ClaudeMessagesError } from "@/lib/claude-api/messages";
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

  let text: string;
  try {
    const result = await callClaudeMessages({
      apiKey,
      fetchImpl: options.fetchImpl,
      model: modelName,
      maxTokens: 2000,
      system: systemPrompt,
      user: userPrompt,
    });
    text = result.text;
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
