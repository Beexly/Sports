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

/** Test-only escape hatch for vitest. */
export function __setClientForTests(client: Anthropic | undefined): void {
  clientSingleton = client;
}

export async function composeSlateOverview(
  input: SlateOverviewInput
): Promise<SlateOverviewResult> {
  if (input.picks.length === 0) {
    throw new Error("composeSlateOverview requires at least one pick");
  }

  const client = getClient();
  const dateDisplay = format(new Date(input.date), "MMMM d, yyyy");

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

  const response = await client.messages.create({
    model: COMPOSER_MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: OVERVIEW_SCHEMA },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

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
