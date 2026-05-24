/**
 * Slate pre-mortem composer.
 *
 * A single pick can be sound; a slate can be systemically biased even
 * when every pick is individually sound. Pre-mortem catches the slate-
 * level risks BEFORE the brief reaches the operator queue.
 *
 * Concrete risk kinds the model is asked to look for — concentration
 * across home/away, single-source dependence, confidence clumps that
 * imply correlated bets, line-movement contradictions visible in the
 * supplied data, low-data-quality clusters.
 *
 * Surfaced as a new BriefSection (type MANUAL_REVIEW) so the operator
 * sees it next to the slate overview, not in a separate panel they
 * could forget to open.
 */

import Anthropic from "@anthropic-ai/sdk";
import { format } from "date-fns";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";
import type { SlatePickSnippet } from "./slate-overview.js";

const PRE_MORTEM_MODEL = "claude-sonnet-4-6";
const PRE_MORTEM_VERSION = "pre-mortem/v1";

export type SlateRiskKind =
  | "HOME_BIAS"
  | "AWAY_BIAS"
  | "SINGLE_SOURCE_DEPENDENCE"
  | "CONFIDENCE_CONCENTRATION"
  | "LINE_MOVEMENT_CONTRADICTION"
  | "LOW_DATA_QUALITY_CLUSTER"
  | "CONFIDENCE_GRADE_MISMATCH"
  | "OTHER";

export type SlateRiskSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface SlateRisk {
  readonly kind: SlateRiskKind;
  readonly severity: SlateRiskSeverity;
  readonly observation: string;
  readonly affectedCount: number;
}

export interface PreMortemReport {
  readonly risks: readonly SlateRisk[];
  readonly summary: string;
  readonly composerVersion: string;
  readonly model: string;
  readonly composedAt: string;
}

const RISK_KIND_VALUES: SlateRiskKind[] = [
  "HOME_BIAS",
  "AWAY_BIAS",
  "SINGLE_SOURCE_DEPENDENCE",
  "CONFIDENCE_CONCENTRATION",
  "LINE_MOVEMENT_CONTRADICTION",
  "LOW_DATA_QUALITY_CLUSTER",
  "CONFIDENCE_GRADE_MISMATCH",
  "OTHER",
];

const SYSTEM_PROMPT = `You are a risk analyst doing a pre-mortem on a slate of sports picks.
You must ONLY reference the picks provided. Do not invent data.
Look for systemic risks that affect MULTIPLE picks (not single-pick concerns):
  - HOME_BIAS / AWAY_BIAS — concentration on one side
  - SINGLE_SOURCE_DEPENDENCE — every pick citing the same source
  - CONFIDENCE_CONCENTRATION — many picks bunched at the top end
  - LINE_MOVEMENT_CONTRADICTION — line is moving against our pick
  - LOW_DATA_QUALITY_CLUSTER — picks built on weak evidence
  - CONFIDENCE_GRADE_MISMATCH — grades don't match the confidence numbers
  - OTHER — only when none of the above fit; describe specifically

Honest empty risks array is preferred over inventing risks.
Summary: 1-2 sentences. Up to 8 risks. affectedCount = how many picks this risk touches.
Severity guidance: HIGH = could change the operator's publish decision. MEDIUM = worth noting. LOW = trivial.`;

const PRE_MORTEM_SCHEMA = {
  type: "object",
  properties: {
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: RISK_KIND_VALUES },
          severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          observation: { type: "string" },
          affectedCount: { type: "integer", minimum: 0 },
        },
        required: ["kind", "severity", "observation", "affectedCount"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["risks", "summary"],
  additionalProperties: false,
} as const;

const MAX_RISKS = 8;
const MAX_PICKS = 40;

interface RawPreMortem {
  readonly risks: SlateRisk[];
  readonly summary: string;
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

export interface PreMortemInput {
  readonly date: string;
  readonly picks: readonly SlatePickSnippet[];
  readonly sources?: readonly string[];
}

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

export async function composePreMortem(
  input: PreMortemInput
): Promise<PreMortemReport> {
  if (input.picks.length === 0) {
    throw new Error("composePreMortem requires at least one pick");
  }

  const client = getClient();

  const picks = input.picks.slice(0, MAX_PICKS);
  const sources = input.sources ?? [];
  const dateDisplay = format(parsePromptDate(input.date), "MMMM d, yyyy");

  const picksBlock = picks
    .map(
      (p, i) =>
        `${i + 1}. [${p.sport}] ${p.game} — ${p.pickType}: ${p.selection} (confidence ${p.confidence}/100, grade ${p.pickGrade})`
    )
    .join("\n");

  const sourcesBlock =
    sources.length > 0 ? `\nSOURCES CITED: ${sources.join(", ")}\n` : "";

  const userPrompt = `Date: ${dateDisplay}

SLATE PICKS:
${picksBlock}${sourcesBlock}

Return JSON matching the schema. Look at the slate as a whole — flag SYSTEMIC risks (multiple picks), not single-pick concerns. Up to ${MAX_RISKS} risks. Empty risks array is fine when the slate is structurally healthy.`;

  const response = await withTelemetry(
    { callSite: "pre-mortem", model: PRE_MORTEM_MODEL },
    () =>
      client.messages.create({
        model: PRE_MORTEM_MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: PRE_MORTEM_SCHEMA },
        },
        messages: [{ role: "user", content: userPrompt }],
      })
  );

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) {
    throw new Error("No text content in pre-mortem response");
  }

  const parsed = JSON.parse(textBlock.text) as RawPreMortem;
  const risks = parsed.risks.slice(0, MAX_RISKS);

  return {
    risks,
    summary: parsed.summary,
    composerVersion: PRE_MORTEM_VERSION,
    model: PRE_MORTEM_MODEL,
    composedAt: new Date().toISOString(),
  };
}

/** Filter to only HIGH + MEDIUM risks (the ones worth surfacing in the brief). */
export function actionableRisks(
  report: PreMortemReport
): readonly SlateRisk[] {
  return report.risks.filter(
    (r) => r.severity === "HIGH" || r.severity === "MEDIUM"
  );
}
