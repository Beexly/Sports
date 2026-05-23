/**
 * Claude-powered semantic draft reviewer.
 *
 * The existing `scanForBannedPhrases` in lib/trust-claims.ts is a literal
 * substring/regex scanner — it catches "guaranteed" but misses "our system
 * never misses", which means the same thing. This reviewer complements it
 * by reading the draft and the banned-phrase list with Claude and returning
 * semantic findings (paraphrases, implications, hedged variants).
 *
 * DRAFT-only: never edits or publishes anything. Returns findings the
 * cockpit operator reviews before approving the draft.
 *
 * Cost / latency: uses Haiku — drafts are short, the task is structured
 * classification, operator UI is latency-sensitive. Sonnet is overkill here.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const REVIEWER_MODEL = "claude-haiku-4-5";
const REVIEWER_VERSION = "draft-reviewer/v1";

const MAX_FINDINGS = 20;
const MAX_DRAFT_CHARS = 12_000;
const MAX_BANNED_PHRASES = 100;

const SYSTEM_PROMPT = `You are a compliance reviewer for a sports-picks publishing platform.
You receive a DRAFT (operator-generated narrative content) and a BANNED_LIST (phrases the platform must never publish, even paraphrased).

Your job: read the DRAFT and flag any passage that means the same thing as a banned phrase — including paraphrases, hedged variants, and implications. Do not flag prose that is merely topically related.

Strict rules:
- Quote EXACT substrings from the DRAFT. Never invent, paraphrase, or compose quotes.
- Only check against the provided BANNED_LIST. Do not import your own compliance opinions.
- Severity: BLOCK = unambiguous violation that must be removed before publish. WARN = arguable / borderline / hedged. OK is unused in findings (only the verdict can be READY).
- Return at most 20 findings. If a draft has more, return the 20 most severe.
- Empty findings array is a valid and common answer.
- For each finding: name which banned phrase it semantically matches, explain in one sentence, then offer a compliant rewrite.`;

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["BLOCK", "WARN"] },
          quote: { type: "string" },
          bannedPhraseSemantic: { type: "string" },
          explanation: { type: "string" },
          suggestion: { type: "string" },
        },
        required: [
          "severity",
          "quote",
          "bannedPhraseSemantic",
          "explanation",
          "suggestion",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["findings"],
  additionalProperties: false,
} as const;

export type DraftReviewSeverity = "BLOCK" | "WARN";

export interface DraftReviewFinding {
  readonly severity: DraftReviewSeverity;
  readonly quote: string;
  readonly bannedPhraseSemantic: string;
  readonly explanation: string;
  readonly suggestion: string;
}

export type DraftReviewVerdict = "READY" | "REVISE" | "REJECT";

export interface DraftReviewSummary {
  readonly totalFindings: number;
  readonly blockingFindings: number;
  readonly verdict: DraftReviewVerdict;
}

export interface DraftReviewReport {
  readonly findings: readonly DraftReviewFinding[];
  readonly summary: DraftReviewSummary;
  readonly reviewerVersion: string;
  readonly model: string;
  readonly reviewedAt: string;
}

export interface DraftReviewInput {
  /** The full draft text to review. */
  readonly content: string;
  /** Banned phrases from the trust-claims registry. */
  readonly banned: readonly string[];
  /** Optional content kind hint (e.g. "DAILY_BRIEF_DRAFT") surfaced to the model. */
  readonly context?: string;
}

interface RawReport {
  readonly findings: DraftReviewFinding[];
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

function computeVerdict(findings: readonly DraftReviewFinding[]): DraftReviewVerdict {
  if (findings.length === 0) return "READY";
  if (findings.some((f) => f.severity === "BLOCK")) return "REJECT";
  return "REVISE";
}

export async function reviewDraft(
  input: DraftReviewInput
): Promise<DraftReviewReport> {
  const content = input.content.slice(0, MAX_DRAFT_CHARS);
  const banned = input.banned.slice(0, MAX_BANNED_PHRASES);
  if (banned.length === 0) {
    throw new Error("reviewDraft requires a non-empty banned phrase list");
  }
  if (content.trim().length === 0) {
    throw new Error("reviewDraft requires non-empty content");
  }

  const client = getClient();

  const bannedList = banned.map((b, i) => `${i + 1}. ${b}`).join("\n");
  const contextLine = input.context ? `\nCONTENT_KIND: ${input.context}\n` : "";

  // The system prompt + banned-list prefix are stable across reviews — split
  // into cacheable blocks so the operator iteration loop (review → edit →
  // re-review) hits the ephemeral cache within its 5-minute window. Only the
  // draft body changes per call.
  const cachedPrefix = `${contextLine}BANNED_LIST (semantic equivalents are also forbidden):
${bannedList}`;

  const variableSuffix = `

DRAFT:
"""
${content}
"""

Return JSON matching the schema. At most ${MAX_FINDINGS} findings. Empty findings array is fine when the draft is clean.`;

  const response = await withTelemetry(
    { callSite: "draft-reviewer", model: REVIEWER_MODEL },
    () =>
      client.messages.create({
        model: REVIEWER_MODEL,
        max_tokens: 4000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: REPORT_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: cachedPrefix,
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: variableSuffix },
            ],
          },
        ],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in draft-reviewer response");
  }

  const parsed = JSON.parse(textBlock.text) as RawReport;
  const findings = parsed.findings.slice(0, MAX_FINDINGS).map(
    (f): DraftReviewFinding => ({
      severity: f.severity,
      quote: f.quote,
      bannedPhraseSemantic: f.bannedPhraseSemantic,
      explanation: f.explanation,
      suggestion: f.suggestion,
    })
  );

  const blockingFindings = findings.filter((f) => f.severity === "BLOCK").length;

  return {
    findings,
    summary: {
      totalFindings: findings.length,
      blockingFindings,
      verdict: computeVerdict(findings),
    },
    reviewerVersion: REVIEWER_VERSION,
    model: REVIEWER_MODEL,
    reviewedAt: new Date().toISOString(),
  };
}
