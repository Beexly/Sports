/**
 * Pure parser + validator for a loss-autopsy draft returned by the model.
 * Enforces the LossAutopsy shape, a valid root cause, a grounding citation, and
 * the shared no-fabrication/no-advice language ban. A draft that fails is never
 * persisted.
 */

import { detectBannedLanguage } from "@/lib/pick-explainer/policy";

export const LOSS_ROOT_CAUSES = [
  "DATA_GAP",
  "STALE_LINE",
  "INJURY_SHOCK",
  "WEATHER",
  "OFFICIATING",
  "VARIANCE",
  "MODEL_DRIFT",
  "HUMAN_OVERRIDE",
  "OTHER",
] as const;
export type LossRootCause = (typeof LOSS_ROOT_CAUSES)[number];

export interface LossAutopsyDraft {
  readonly headline: string;
  readonly whatWeSaw: string;
  readonly whatHappened: string;
  readonly whatWeLearned: string;
  readonly rootCause: LossRootCause;
  readonly lessonTags: string[];
}

export type LossAutopsyParseFailure =
  | "INVALID_JSON"
  | "EMPTY_SECTION"
  | "HEADLINE_TOO_LONG"
  | "INVALID_ROOT_CAUSE"
  | "MISSING_CITATION"
  | "BANNED_LANGUAGE";

export type LossAutopsyParseResult =
  | { readonly ok: true; readonly draft: LossAutopsyDraft }
  | { readonly ok: false; readonly failures: LossAutopsyParseFailure[] };

const CITATION =
  /\(source:\s*(?:factor_breakdown|signal_snapshot)\s+at\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\)/i;

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

export function parseLossAutopsyDraft(raw: string): LossAutopsyParseResult {
  let obj: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(stripFences(raw));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, failures: ["INVALID_JSON"] };
    }
    obj = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, failures: ["INVALID_JSON"] };
  }

  const str = (k: string): string => (typeof obj[k] === "string" ? (obj[k] as string).trim() : "");
  const headline = str("headline");
  const whatWeSaw = str("whatWeSaw");
  const whatHappened = str("whatHappened");
  const whatWeLearned = str("whatWeLearned");
  const rootCause = str("rootCause");

  const failures: LossAutopsyParseFailure[] = [];
  if (!headline || !whatWeSaw || !whatHappened || !whatWeLearned) failures.push("EMPTY_SECTION");
  if (headline.length > 140) failures.push("HEADLINE_TOO_LONG");
  if (!LOSS_ROOT_CAUSES.includes(rootCause as LossRootCause)) failures.push("INVALID_ROOT_CAUSE");

  const body = [whatWeSaw, whatHappened, whatWeLearned].join("\n");
  if (!CITATION.test(body)) failures.push("MISSING_CITATION");
  if (detectBannedLanguage([headline, body].join("\n")).length > 0) failures.push("BANNED_LANGUAGE");

  if (failures.length > 0) return { ok: false, failures: Array.from(new Set(failures)) };

  const lessonTags = Array.isArray(obj["lessonTags"])
    ? (obj["lessonTags"] as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    ok: true,
    draft: { headline, whatWeSaw, whatHappened, whatWeLearned, rootCause: rootCause as LossRootCause, lessonTags },
  };
}
