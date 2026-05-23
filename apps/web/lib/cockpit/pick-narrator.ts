/**
 * Pick narrator — cockpit-only editorial gloss on a deterministic pick.
 *
 * The math model's `reasoning` string in ScoredPick is correct but terse
 * (template-rendered from real numbers). Operators reviewing picks in the
 * cockpit benefit from a longer 2-3 sentence editorial read that cites
 * the actual factor breakdown — pacing, what drove the confidence, what
 * weakens it.
 *
 * Cockpit-only by intent: the public surface keeps the deterministic
 * `reasoning` text from scoring.ts unchanged. This module never feeds
 * the public renderer.
 *
 * Hard constraints (enforced by the system prompt):
 *   - ONLY reference what's in the supplied pick + factor breakdown
 *   - Never invent stats, scores, records, or game context not present
 *   - Cite specific factor names + their impact direction
 *   - Honest about uncertainty when factors conflict
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ScoredPick } from "@sports/types";
import { extractPickSources } from "@sports/prediction-engine";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const NARRATOR_MODEL = "claude-sonnet-4-6";
const NARRATOR_VERSION = "pick-narrator/v1";

const SYSTEM_PROMPT = `You are writing a 2-3 sentence editorial gloss on a sports pick for an internal operator dashboard.
You receive structured pick data: selection, line, confidence, grade, risk, and a factor breakdown.
You must ONLY reference what's in the supplied data. Never invent stats, scores, team records, or game context.
Cite specific factor names from the breakdown when explaining what drove confidence.
Use measured language — never "will win" or "guaranteed". Honest about uncertainty when factors conflict.
Lead with the strongest positive factor. End with the most relevant caveat if one exists in the data.
Output a single narrative string — no bullet lists.`;

const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    narrative: { type: "string" },
  },
  required: ["narrative"],
  additionalProperties: false,
} as const;

export interface PickNarrativeReport {
  readonly narrative: string;
  readonly sources: readonly string[];
  readonly narratorVersion: string;
  readonly model: string;
  readonly narratedAt: string;
}

interface RawNarrative {
  readonly narrative: string;
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

/**
 * Produce an operator-facing 2-3 sentence editorial gloss on the given
 * ScoredPick. Cites factors from the supplied breakdown only.
 */
export async function narratePick(
  pick: ScoredPick
): Promise<PickNarrativeReport> {
  const client = getClient();

  const sources = extractPickSources(pick);

  const factorsBlock = pick.factorBreakdown.factors
    .map((f) => {
      const evidence = f.evidence
        ? ` [source: ${f.evidence.sourceName}, ${f.evidence.activationStatus}, ${f.evidence.freshnessStatus}]`
        : "";
      return `- ${f.name} (${f.impact}, weight ${f.weight}): ${f.description}${evidence}`;
    })
    .join("\n");

  const sourcesLine = sources.length > 0 ? `\nSOURCES BACKING THIS PICK: ${sources.join(", ")}` : "";

  const userPrompt = `PICK:
- ${pick.pickType}: ${pick.selection}
- line: ${pick.line}
- confidence: ${pick.confidence}/100
- grade: ${pick.pickGrade}
- risk: ${pick.riskLevel}

FACTOR BREAKDOWN:
${factorsBlock}${sourcesLine}

Write a 2-3 sentence operator-facing editorial gloss. Reference factor names from the breakdown above. Do not invent stats or context.`;

  const response = await withTelemetry(
    { callSite: "pick-narrator", model: NARRATOR_MODEL },
    () =>
      client.messages.create({
        model: NARRATOR_MODEL,
        max_tokens: 600,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: NARRATIVE_SCHEMA },
        },
        messages: [{ role: "user", content: userPrompt }],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in pick-narrator response");
  }

  const parsed = JSON.parse(textBlock.text) as RawNarrative;

  return {
    narrative: parsed.narrative,
    sources,
    narratorVersion: NARRATOR_VERSION,
    model: NARRATOR_MODEL,
    narratedAt: new Date().toISOString(),
  };
}
