/**
 * Content Publishing Worker
 * Generates and publishes blog posts based on today's picks.
 * Runs daily after pick generation.
 */

import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import type { ContentGenerationInput } from "@sports/types";
import { endOfDay, format, startOfDay } from "date-fns";

const PUBLISH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const GAMBLING_DISCLAIMER =
  "This article is for informational and entertainment purposes only. " +
  "SportsPicks Pro does not guarantee any outcomes. Sports betting involves risk. " +
  "Please gamble responsibly and only bet what you can afford to lose.";

async function generateAndPublishContent(): Promise<void> {
  const gates = getReadinessGates();
  if (!gates.canPublishContent) {
    console.log("[content-worker] Content publishing disabled (bootstrap mode). Set PUBLIC_BLOG_ENABLED=true to enable.");
    return;
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    console.warn("[content-worker] ANTHROPIC_API_KEY not set — skipping content generation");
    return;
  }

  // Use immutable helpers — `Date.prototype.setHours` mutates in place, which
  // caused `todayEnd` to be computed off a Date already truncated to midnight.
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const dateStr = format(now, "yyyy-MM-dd");

  // Get today's canonical (non-bootstrap) picks grouped by sport.
  // Bootstrap-era picks are excluded — content must only cite picks that
  // count toward real performance history.
  const picks = await db.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      generatedAt: { gte: todayStart, lte: todayEnd },
      confidence: { gte: 60 }, // Only high-quality picks in content
    },
    include: {
      game: {
        include: { sport: true },
      },
    },
    orderBy: { confidence: "desc" },
    take: 20,
  });

  if (picks.length === 0) {
    console.log("[content-worker] No picks available for content generation");
    return;
  }

  // Group by sport
  const bySport: Record<string, typeof picks> = {};
  for (const pick of picks) {
    const sportName = pick.game.sport.name;
    if (!bySport[sportName]) bySport[sportName] = [];
    bySport[sportName].push(pick);
  }

  for (const [sportName, sportPicks] of Object.entries(bySport)) {
    const slug = `${sportName.toLowerCase()}-picks-${dateStr}`;

    // Check if post already exists for today (slug is @unique in the schema)
    const existing = await db.blogPost.findUnique({
      where: { slug },
    });
    if (existing) {
      console.log(`[content-worker] Post already exists for ${sportName} ${dateStr}`);
      continue;
    }

    try {
      console.log(
        `[content-worker] Generating content for ${sportName} (${sportPicks.length} picks)...`
      );

      const input: ContentGenerationInput = {
        date: dateStr,
        sport: sportName,
        picks: sportPicks.map((p) => ({
          game: `${p.game.homeTeamName} vs ${p.game.awayTeamName}`,
          pickType: p.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
          selection: p.selection,
          line: p.line,
          confidence: p.confidence,
          reasoning: p.reasoning,
        })),
      };

      const content = await callClaudeForContent(input, apiKey);

      await db.blogPost.create({
        data: {
          title: content.title,
          slug,
          excerpt: content.excerpt,
          content: content.content,
          sport: sportName,
          tags: content.tags,
          seoTitle: content.seoTitle,
          seoDescription: content.seoDescription,
          status: "PUBLISHED",
          publishedAt: new Date(),
          relatedPickIds: sportPicks.map((p) => p.id),
          modelVersion: "claude-sonnet-4-6",
        },
      });

      console.log(`[content-worker] Published post: ${slug}`);
    } catch (err) {
      console.error(
        `[content-worker] Failed to generate content for ${sportName}: ${err instanceof Error ? err.message : err}`
      );
    }

    // Delay between API calls
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function callClaudeForContent(
  input: ContentGenerationInput,
  apiKey: string
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
}> {
  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");
  const picksSummary = input.picks
    .map(
      (p, i) =>
        `${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} (Line: ${p.line}, Confidence: ${p.confidence}/100)\n   Reasoning: ${p.reasoning}`
    )
    .join("\n\n");

  const systemPrompt = `You are a sports analyst writing data-backed analysis.
You must ONLY reference the data provided. Do not invent statistics, scores, or records.
Use measured language — never say "will win" or "guaranteed".
Always include the provided disclaimer at the end.`;

  const userPrompt = `Write a sports analysis blog post for ${input.sport} picks on ${dateDisplay}.

PICKS DATA (ONLY source of truth — do not invent any other data):
${picksSummary}

Requirements:
- Title: SEO-friendly, include sport and date
- Excerpt: 2 paragraph preview (free content)
- Content: Full 4-6 paragraph analysis using ONLY the provided data above
- End with this disclaimer: "${GAMBLING_DISCLAIMER}"
- SEO title under 60 chars
- SEO description under 155 chars
- 3-5 relevant tags

Respond ONLY with valid JSON:
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
  if (!textContent) throw new Error("No text in Claude response");

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) throw new Error("Could not parse JSON from Claude");

  return JSON.parse(jsonMatch[0]) as {
    title: string;
    excerpt: string;
    content: string;
    seoTitle: string;
    seoDescription: string;
    tags: string[];
  };
}

async function main(): Promise<void> {
  console.log("[content-worker] Worker starting...");

  // Recursive setTimeout prevents overlapping runs if Claude requests run long.
  const runAndSchedule = async (): Promise<void> => {
    try {
      await generateAndPublishContent();
    } catch (err) {
      console.error(
        "[content-worker] Error:",
        err instanceof Error ? err.message : err
      );
    } finally {
      setTimeout(runAndSchedule, PUBLISH_INTERVAL_MS);
    }
  };

  await runAndSchedule();
}

main().catch((err) => {
  console.error("[content-worker] Fatal error:", err);
  process.exit(1);
});
