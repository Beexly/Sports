/**
 * Content generator using Claude API.
 * IMPORTANT: Claude is ONLY used for writing narrative content.
 * Pick data is the source of truth — Claude never generates picks.
 */

import type { ContentGenerationInput, GeneratedContent } from "@sports/types";
import { generateSlug } from "./utils.js";
import { format } from "date-fns";
import { BRAND_NAME } from "./brand.js";

const GAMBLING_DISCLAIMER =
  "This article is for informational and entertainment purposes only. " +
  `${BRAND_NAME} does not guarantee any outcomes. Sports betting involves risk. ` +
  "Please gamble responsibly and only bet what you can afford to lose.";

export async function generateBlogPost(
  input: ContentGenerationInput
): Promise<GeneratedContent> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");
  const picksSummary = input.picks
    .map(
      (p, i) =>
        `${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} (Line: ${p.line}, Confidence: ${p.confidence}/100)\n   Reasoning: ${p.reasoning}`
    )
    .join("\n\n");

  const systemPrompt = `You are a sports analyst writing data-backed analysis for a sports picks website.
You must ONLY reference the data provided to you. Do not invent statistics, scores, or records.
Use measured language — never say "will win" or "guaranteed". Use phrases like "our model favors" or "the data suggests".
Always include the provided disclaimer at the end.`;

  const userPrompt = `Write a sports analysis blog post for ${input.sport} picks on ${dateDisplay}.

PICKS DATA (this is your ONLY source of truth — do not invent any other data):
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${error}`);
  }

  const result = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent) {
    throw new Error("No text content in Claude response");
  }

  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
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
