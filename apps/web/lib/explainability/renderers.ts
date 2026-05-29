/**
 * Explanation renderers — pure functions that take a structured fact
 * and render it at a target explanation level.
 *
 * No I/O. No prompt invocation. Renderers exist so that public-safe
 * explanations are derived deterministically from canonical data,
 * never from free-form model output.
 */

import {
  containsForbiddenForPublic,
  isPublicLevel,
  type ExplanationLevel,
} from "./levels";

/** A structured fact the renderer is allowed to express. */
export type ExplanationFact =
  | {
      kind: "pass-decision";
      sport: string;
      game: string;
      dominantReason: string; // e.g. "stale-line"
      detail: string;
    }
  | {
      kind: "evidence-quality";
      source: string;
      freshness: string;
      hasFailureCase: boolean;
    }
  | {
      kind: "calibration-status";
      gated: boolean;
      sampleCount?: number;
    };

export interface RenderedExplanation {
  readonly level: ExplanationLevel;
  readonly text: string;
  /** True only if the rendered text is safe to publish at this level. */
  readonly publicSafe: boolean;
}

export function renderExplanation(
  fact: ExplanationFact,
  level: ExplanationLevel,
): RenderedExplanation {
  const text = textFor(fact, level);
  if (isPublicLevel(level)) {
    const hit = containsForbiddenForPublic(text);
    if (hit) {
      return { level, text: scrubFor(fact, level), publicSafe: true };
    }
  }
  return { level, text, publicSafe: isPublicLevel(level) };
}

function textFor(fact: ExplanationFact, level: ExplanationLevel): string {
  switch (fact.kind) {
    case "pass-decision":
      if (level === "plain")
        return `${fact.game}: pass. The signal field did not clear the gate.`;
      if (level === "standard")
        return `${fact.game}: pass — dominant reason ${fact.dominantReason}.`;
      if (level === "sharp" || level === "technical-safe")
        return `${fact.game}: pass — ${fact.dominantReason}. ${fact.detail}`;
      if (level === "academy")
        return `${fact.game}: pass. ${fact.detail} See the No-Bet doctrine module for the underlying principle.`;
      return `[operator] ${fact.game}: pass; reason=${fact.dominantReason}.`;
    case "evidence-quality": {
      const head = `source ${fact.source}, freshness ${fact.freshness}`;
      const tail = fact.hasFailureCase ? " · failure case attached" : "";
      if (level === "plain") return `Evidence: ${head}.${tail}`;
      if (level === "standard") return `Evidence chain: ${head}${tail}.`;
      return `Evidence: ${head}${tail}.`;
    }
    case "calibration-status":
      if (fact.gated)
        return `Calibration report is gated — sample below publication threshold.`;
      return `Calibration report is published; sample size ${fact.sampleCount ?? "—"}.`;
  }
}

/** Fallback renderer for when the primary text trips the forbidden filter. */
function scrubFor(fact: ExplanationFact, _level: ExplanationLevel): string {
  switch (fact.kind) {
    case "pass-decision":
      return `${fact.game}: pass. See methodology for the underlying gating logic.`;
    case "evidence-quality":
      return `Evidence: source ${fact.source}, freshness ${fact.freshness}.`;
    case "calibration-status":
      return fact.gated
        ? "Calibration report is gated."
        : "Calibration report is published.";
  }
}
