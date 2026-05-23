/**
 * Content generator using the official Anthropic SDK.
 *
 * Claude is ONLY used for writing narrative content. Pick data is the source
 * of truth — Claude never generates picks. The system prompt enforces this
 * and the JSON schema below constrains output to a single editorial shape.
 *
 * Hard Rule §6 compliance: retries + timeouts + typed errors come from the
 * SDK; output is validated by `output_config.format` instead of regex JSON
 * extraction.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  BlogPostKind,
  ContentGenerationInput,
  GeneratedContent,
} from "@sports/types";
import { generateSlug } from "./utils.js";
import { format } from "date-fns";
import { BRAND_NAME } from "./brand.js";
import {
  reviewDraft,
  type DraftReviewReport,
} from "./content/draft-reviewer.js";
import { getBannedPhraseList } from "./trust-claims.js";

const GAMBLING_DISCLAIMER =
  "This article is for informational and entertainment purposes only. " +
  `${BRAND_NAME} does not guarantee any outcomes. Sports betting involves risk. ` +
  "Please gamble responsibly and only bet what you can afford to lose.";

const SYSTEM_PROMPT = `You are a sports analyst writing data-backed analysis for a sports picks website.
You must ONLY reference the data provided to you. Do not invent statistics, scores, or records.
Use measured language — never say "will win" or "guaranteed". Use phrases like "our model favors" or "the data suggests".
Always include the provided disclaimer at the end.`;

/**
 * Per-kind user-prompt opener. Pick selection / sources / output schema
 * are shared across kinds — only the framing changes.
 */
const KIND_FRAMING: Record<BlogPostKind, (sport: string, dateDisplay: string) => string> = {
  DAILY_PICKS: (sport, dateDisplay) =>
    `Write a sports analysis blog post for ${sport} picks on ${dateDisplay}.`,
  WEEKLY_RECAP: (sport, dateDisplay) =>
    `Write a weekly recap of ${sport} picks covering the period ending ${dateDisplay}. ` +
    `Each pick below is provided with its reasoning at prediction time. ` +
    `Frame the post as a look back at how the slate was called, not a forward-looking preview.`,
};

const POST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    content: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "excerpt",
    "content",
    "seoTitle",
    "seoDescription",
    "tags",
  ],
  additionalProperties: false,
} as const;

interface ParsedPost {
  readonly title: string;
  readonly excerpt: string;
  readonly content: string;
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly tags: readonly string[];
}

let clientSingleton: Anthropic | undefined;

function getClient(): Anthropic {
  if (clientSingleton) return clientSingleton;
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  clientSingleton = new Anthropic({ apiKey, maxRetries: 3 });
  return clientSingleton;
}

/** Test-only escape hatch so a vitest spec can swap in a mocked client. */
export function __setClientForTests(client: Anthropic | undefined): void {
  clientSingleton = client;
}

export async function generateBlogPost(
  input: ContentGenerationInput
): Promise<GeneratedContent> {
  const client = getClient();

  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");
  const picksSummary = input.picks
    .map(
      (p, i) =>
        `${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} (Line: ${p.line}, Confidence: ${p.confidence}/100)\n   Reasoning: ${p.reasoning}`
    )
    .join("\n\n");

  const sources = input.sources ?? [];
  const sourcesBlock = sources.length > 0
    ? `\n\nSOURCES BACKING THIS SLATE (echo these verbatim; do not add others):
${sources.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
    : "";

  const sourcesRequirement = sources.length > 0
    ? `\n- Append a single line "Sources: ${sources.join(", ")}" immediately before the disclaimer`
    : "";

  const kind: BlogPostKind = input.kind ?? "DAILY_PICKS";
  const framing = KIND_FRAMING[kind](input.sport, dateDisplay);

  const userPrompt = `${framing}

PICKS DATA (this is your ONLY source of truth — do not invent any other data):
${picksSummary}${sourcesBlock}

Requirements:
- Title: Make it SEO-friendly, include sport and date
- Excerpt: 2 paragraph summary (free preview)
- Content: Full analysis (4-6 paragraphs) referencing only the above data${sourcesRequirement}
- Include this disclaimer at end: "${GAMBLING_DISCLAIMER}"
- SEO title (under 60 chars)
- SEO description (under 155 chars)
- Tags: 3-5 relevant tags`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: POST_SCHEMA },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in Claude response");
  }

  const parsed = JSON.parse(textBlock.text) as ParsedPost;

  return {
    title: parsed.title,
    slug: generateSlug(`${input.sport}-picks-${input.date}`),
    excerpt: parsed.excerpt,
    content: parsed.content,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    tags: [...parsed.tags],
  };
}

/**
 * Generated post bundled with the reviewer's verdict + findings.
 * Callers decide what to do per verdict (operator queue, log, reject).
 */
export interface BlogPostWithReview {
  readonly post: GeneratedContent;
  readonly review: DraftReviewReport;
}

/**
 * Generate a blog post and immediately scan it with the semantic reviewer.
 *
 * Does not throw on REJECT — returns the report so each caller can choose
 * its own policy (cockpit shows findings, batch worker logs and continues,
 * tests inspect the report directly).
 */
export async function generateAndReviewBlogPost(
  input: ContentGenerationInput
): Promise<BlogPostWithReview> {
  const post = await generateBlogPost(input);

  const reviewable = [
    post.title,
    post.excerpt,
    post.content,
    post.seoTitle,
    post.seoDescription,
  ].join("\n\n");

  const review = await reviewDraft({
    content: reviewable,
    banned: getBannedPhraseList(),
    context: "BLOG_POST",
  });

  return { post, review };
}
