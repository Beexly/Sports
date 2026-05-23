/**
 * What-changed composer — operator-supplied change context turned into
 * a brief-ready WHAT_CHANGED section.
 *
 * The operator supplies the raw change list (e.g. "Lakers ruled out
 * LeBron at 17:30; bumped down to LEAN"). Claude turns it into a
 * 2-3 sentence operator-facing summary AND an items[] list the brief
 * UI renders. Only references the supplied change context — no
 * fabricated history.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const MODEL = "claude-haiku-4-5";
const VERSION = "what-changed/v1";

const SYSTEM_PROMPT = `You turn a raw operator-supplied list of changes into a brief section.
You receive a CHANGES_CONTEXT — free-form text the operator wrote.
You produce:
  - summary: 2-3 sentences, operator-readable
  - items: a structured list of distinct changes
Only reference what's in CHANGES_CONTEXT. Never invent history.
items[].impact must be one of: POSITIVE, NEGATIVE, NEUTRAL.
Up to 12 items. Empty items is fine.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          headline: { type: "string" },
          detail: { type: "string" },
          impact: { type: "string", enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
        },
        required: ["headline", "detail", "impact"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "items"],
  additionalProperties: false,
} as const;

const MAX_ITEMS = 12;
const MAX_CONTEXT_CHARS = 6_000;

export type WhatChangedImpact = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export interface WhatChangedItem {
  readonly headline: string;
  readonly detail: string;
  readonly impact: WhatChangedImpact;
}

export interface WhatChangedReport {
  readonly summary: string;
  readonly items: readonly WhatChangedItem[];
  readonly composerVersion: string;
  readonly model: string;
  readonly composedAt: string;
}

export interface WhatChangedInput {
  readonly changesContext: string;
}

interface Raw {
  readonly summary: string;
  readonly items: WhatChangedItem[];
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

/**
 * Compose the WHAT_CHANGED section from operator-supplied context.
 * Throws when context is empty (no spend on no-news days).
 */
export async function composeWhatChanged(
  input: WhatChangedInput
): Promise<WhatChangedReport> {
  if (input.changesContext.trim().length === 0) {
    throw new Error("composeWhatChanged requires non-empty changesContext");
  }
  const client = getClient();
  const ctx = input.changesContext.slice(0, MAX_CONTEXT_CHARS);

  const response = await withTelemetry(
    { callSite: "what-changed", model: MODEL },
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
            content: `CHANGES_CONTEXT:\n"""\n${ctx}\n"""\n\nReturn JSON matching the schema. Up to ${MAX_ITEMS} items.`,
          },
        ],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) throw new Error("No text content in what-changed response");
  const parsed = JSON.parse(textBlock.text) as Raw;

  return {
    summary: parsed.summary,
    items: parsed.items.slice(0, MAX_ITEMS),
    composerVersion: VERSION,
    model: MODEL,
    composedAt: new Date().toISOString(),
  };
}
