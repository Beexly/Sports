/**
 * Slate overview composer — first restored slice of the daily brief composer.
 *
 * Takes a small projection of today's picks and produces a 1-2 paragraph
 * "what does today look like" string the brief surfaces in its
 * `slateOverview.text` field. The existing brief stub stays in place
 * until a follow-on cycle wires this in; this helper is callable
 * standalone today (cockpit preview, tests, future composer).
 *
 * Quality vs cost: Sonnet 4.6. The slate overview is the brief's lead;
 * editorial pacing matters more than per-call cost (1 brief/day).
 */

import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import type { PickGrade, PickType } from "@sports/types";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const COMPOSER_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a sports analyst writing the lead paragraph of a daily betting brief.
You must ONLY reference the picks provided. Do not invent stats, records, or other games.
Use measured language — never "will win" or "guaranteed". Use phrases like "our model favors" or "the data suggests".
Keep the overview under 120 words. Two short paragraphs is the ceiling; one paragraph is fine.
Do not include a disclaimer or sign-off — the brief adds those separately.`;

const OVERVIEW_SCHEMA = {
  type: "object",
  properties: {
    slateOverview: { type: "string" },
  },
  required: ["slateOverview"],
  additionalProperties: false,
} as const;

export interface SlatePickSnippet {
  readonly sport: string;
  readonly game: string;
  readonly pickType: PickType;
  readonly selection: string;
  readonly confidence: number;
  readonly pickGrade: PickGrade;
}

export interface SlateOverviewInput {
  readonly date: string;
  readonly picks: readonly SlatePickSnippet[];
}

export interface SlateOverviewResult {
  readonly text: string;
  readonly model: string;
  readonly composedAt: string;
}

interface RawOverview {
  readonly slateOverview: string;
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

function parsePromptDate(input: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return new Date(year, month - 1, day);
  }
  return new Date(input);
}

export async function composeSlateOverview(
  input: SlateOverviewInput
): Promise<SlateOverviewResult> {
  if (input.picks.length === 0) {
    throw new Error("composeSlateOverview requires at least one pick");
  }

  const client = getClient();
  const dateDisplay = format(parsePromptDate(input.date), "MMMM d, yyyy");

  const picksByeSport = new Map<string, SlatePickSnippet[]>();
  for (const p of input.picks) {
    const bucket = picksByeSport.get(p.sport) ?? [];
    bucket.push(p);
    picksByeSport.set(p.sport, bucket);
  }

  const sportBlocks: string[] = [];
  for (const [sport, sportPicks] of picksByeSport) {
    const lines = sportPicks
      .map(
        (p, i) =>
          `  ${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} (confidence ${p.confidence}/100, grade ${p.pickGrade})`
      )
      .join("\n");
    sportBlocks.push(`${sport}:\n${lines}`);
  }

  const userPrompt = `Date: ${dateDisplay}

PICKS ON TODAY'S BOARD (your only source of truth — do not introduce others):
${sportBlocks.join("\n\n")}

Write the slate overview paragraph for the brief lead. Open with the date.
Reference the number of picks and the strongest grade present in measured language.
Do not list every pick — give the operator a 1-2 paragraph read.`;

  // Ephemeral caching on the system block — the system is identical across
  // calls and the slate-overview composer will grow as the brief composer
  // adds sections context. Cache is forward-investment as well as today's
  // marginal savings on repeat-call days.
  const response = await withTelemetry(
    { callSite: "slate-overview", model: COMPOSER_MODEL },
    () =>
      client.messages.create({
        model: COMPOSER_MODEL,
        max_tokens: 800,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: OVERVIEW_SCHEMA },
        },
        messages: [{ role: "user", content: userPrompt }],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in slate-overview response");
  }

  const parsed = JSON.parse(textBlock.text) as RawOverview;

  return {
    text: parsed.slateOverview,
    model: COMPOSER_MODEL,
    composedAt: new Date().toISOString(),
  };
}
