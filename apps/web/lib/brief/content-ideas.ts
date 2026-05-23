/**
 * Content-ideas composer — turns today's pick slate into a list of
 * editorial angles the operator could write about. These are seed
 * ideas only; no auto-publish, no actual drafts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";
import type { SlatePickSnippet } from "./slate-overview.js";

const MODEL = "claude-haiku-4-5";
const VERSION = "content-ideas/v1";

const SYSTEM_PROMPT = `You generate editorial angle ideas for a sports content operator.
Given today's pick slate, produce 3-8 distinct angles a writer could pursue.
Each angle must be specific to the picks provided — no generic "X vs Y" filler.
Each angle gets: headline, angle (1 sentence rationale), audienceFit (FREE|PRO|ELITE).
Only reference what's in the supplied picks. Never invent stats or context.
Up to 8 ideas.`;

const SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          angle: { type: "string" },
          audienceFit: { type: "string", enum: ["FREE", "PRO", "ELITE"] },
        },
        required: ["headline", "angle", "audienceFit"],
        additionalProperties: false,
      },
    },
  },
  required: ["ideas"],
  additionalProperties: false,
} as const;

const MAX_IDEAS = 8;
const MAX_PICKS = 30;

export type ContentIdeaAudience = "FREE" | "PRO" | "ELITE";

export interface ContentIdea {
  readonly headline: string;
  readonly angle: string;
  readonly audienceFit: ContentIdeaAudience;
}

export interface ContentIdeasReport {
  readonly ideas: readonly ContentIdea[];
  readonly composerVersion: string;
  readonly model: string;
  readonly composedAt: string;
}

export interface ContentIdeasInput {
  readonly picks: readonly SlatePickSnippet[];
}

interface Raw {
  readonly ideas: ContentIdea[];
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

/**
 * Compose CONTENT_IDEAS items from today's pick slate. Throws on
 * empty picks (no spend on a no-slate day).
 */
export async function composeContentIdeas(
  input: ContentIdeasInput
): Promise<ContentIdeasReport> {
  if (input.picks.length === 0) {
    throw new Error("composeContentIdeas requires at least one pick");
  }
  const client = getClient();
  const picks = input.picks.slice(0, MAX_PICKS);

  const picksBlock = picks
    .map(
      (p, i) =>
        `${i + 1}. [${p.sport}] ${p.game} — ${p.pickType}: ${p.selection} (confidence ${p.confidence}/100, grade ${p.pickGrade})`
    )
    .join("\n");

  const response = await withTelemetry(
    { callSite: "content-ideas", model: MODEL },
    () =>
      client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [
          {
            role: "user",
            content: `SLATE PICKS:\n${picksBlock}\n\nReturn JSON matching the schema. 3-8 distinct angles, each tied to a specific pick.`,
          },
        ],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) throw new Error("No text content in content-ideas response");
  const parsed = JSON.parse(textBlock.text) as Raw;

  return {
    ideas: parsed.ideas.slice(0, MAX_IDEAS),
    composerVersion: VERSION,
    model: MODEL,
    composedAt: new Date().toISOString(),
  };
}
