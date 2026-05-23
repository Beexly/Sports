/**
 * Counter-narrative composer.
 *
 * The structural anti-slop move: for any generated draft, produce a
 * skeptical counter-take that argues against the picks using ONLY the
 * data already in the draft. Surfaced together with the celebratory
 * take so the operator can't accidentally publish a one-sided post.
 *
 * Not a contrarian-for-its-own-sake exercise. The model is constrained
 * to flag concerns that are present in the supplied data — confidence
 * concentration, single-source dependence, line-movement contradictions
 * visible in the picks. If the slate is genuinely clean, the
 * counter-take says so honestly rather than inventing red flags.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const COUNTER_MODEL = "claude-sonnet-4-6";
const COUNTER_VERSION = "counter-narrative/v1";

const SYSTEM_PROMPT = `You are a skeptical sports analyst who challenges the celebratory framing of a draft post.
You must ONLY reference the picks and sources provided. Do not invent skepticism — find concrete concerns in the actual data.
Concerns to look for, in order of priority:
  1. Confidence concentration — many picks bunched at the top end suggests model over-fitting or correlated bets.
  2. Single-source dependence — every pick citing the same source means a single data outage takes the slate down.
  3. Line-movement contradictions — public/sharp money moving against our pick is a real signal.
  4. Confidence vs. grade mismatch — a STRONG_PLAY at 65 confidence is suspect; an ELITE_PLAY at 60 is suspect.
  5. Same-side concentration — every pick on home teams, every pick on overs, etc.

If the slate is genuinely clean (you find no concrete concerns), say so directly — do NOT invent red flags to look balanced.
Severity guidance: HIGH = could meaningfully change the operator's publish decision. MEDIUM = worth noting. LOW = trivial.
Quote exact pick identifiers from the input — never paraphrase a pick's selection.
The counterTake should be 2-4 sentences. Measured tone — not contrarian for its own sake.`;

const COUNTER_SCHEMA = {
  type: "object",
  properties: {
    counterTake: { type: "string" },
    redFlags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          pick: { type: "string" },
          concern: { type: "string" },
          severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        },
        required: ["pick", "concern", "severity"],
        additionalProperties: false,
      },
    },
  },
  required: ["counterTake", "redFlags"],
  additionalProperties: false,
} as const;

const MAX_RED_FLAGS = 12;
const MAX_PICKS = 20;
const MAX_DRAFT_CHARS = 6_000;

export type CounterFlagSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface CounterRedFlag {
  readonly pick: string;
  readonly concern: string;
  readonly severity: CounterFlagSeverity;
}

export interface CounterNarrativeReport {
  readonly counterTake: string;
  readonly redFlags: readonly CounterRedFlag[];
  readonly composerVersion: string;
  readonly model: string;
  readonly composedAt: string;
}

export interface CounterPickSnippet {
  readonly game: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
}

export interface CounterNarrativeInput {
  /** The picks the draft is about — same shape the generator received. */
  readonly picks: readonly CounterPickSnippet[];
  /** The generated draft text (title + excerpt + content). */
  readonly draft: string;
  /** Optional source names cited in the draft. */
  readonly sources?: readonly string[];
}

interface RawCounter {
  readonly counterTake: string;
  readonly redFlags: CounterRedFlag[];
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

export async function composeCounterNarrative(
  input: CounterNarrativeInput
): Promise<CounterNarrativeReport> {
  if (input.picks.length === 0) {
    throw new Error("composeCounterNarrative requires at least one pick");
  }
  if (input.draft.trim().length === 0) {
    throw new Error("composeCounterNarrative requires non-empty draft text");
  }

  const client = getClient();

  const picks = input.picks.slice(0, MAX_PICKS);
  const sources = input.sources ?? [];
  const draft = input.draft.slice(0, MAX_DRAFT_CHARS);

  const picksBlock = picks
    .map(
      (p, i) =>
        `${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} @ line ${p.line} (confidence ${p.confidence}/100)`
    )
    .join("\n");

  const sourcesLine =
    sources.length > 0 ? `\nSOURCES CITED: ${sources.join(", ")}\n` : "";

  const userPrompt = `PICKS:
${picksBlock}${sourcesLine}

DRAFT:
"""
${draft}
"""

Return JSON matching the schema. Counter-take should be 2-4 sentences. Up to ${MAX_RED_FLAGS} red flags. Empty redFlags array is a valid + honest answer when the slate is clean.`;

  const response = await withTelemetry(
    { callSite: "counter-narrative", model: COUNTER_MODEL },
    () =>
      client.messages.create({
        model: COUNTER_MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: COUNTER_SCHEMA },
        },
        messages: [{ role: "user", content: userPrompt }],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in counter-narrative response");
  }

  const parsed = JSON.parse(textBlock.text) as RawCounter;
  const redFlags = parsed.redFlags.slice(0, MAX_RED_FLAGS);

  return {
    counterTake: parsed.counterTake,
    redFlags,
    composerVersion: COUNTER_VERSION,
    model: COUNTER_MODEL,
    composedAt: new Date().toISOString(),
  };
}
