/**
 * Competitor-inference evaluation harness.
 *
 * Asserts that nothing the product exposes — explanations, telemetry
 * events, friction prompts, source labels — would let a competitor
 * reconstruct the model's weights, thresholds, or aggregation logic.
 */

import { describe, it, expect } from "vitest";
import {
  PUBLIC_FORBIDDEN_TERMS,
  containsForbiddenForPublic,
} from "@/lib/explainability/levels";
import { renderExplanation, type ExplanationFact } from "@/lib/explainability/renderers";
import {
  FORBIDDEN_FIELD_KEYS,
  containsForbiddenField,
  stripForbiddenFields,
} from "@/lib/telemetry/privacy";
import { FRICTION_PROMPTS } from "@/lib/responsible-intelligence/friction";
import { PUBLIC_SOURCE_KEYS, publicSourceFor } from "@/lib/trust/source-labels";

describe("competitor inference: explainer output never reveals internals", () => {
  const FACTS: ExplanationFact[] = [
    { kind: "pass-decision", sport: "NBA", game: "BOS @ NYK", dominantReason: "stale-line", detail: "Line stopped updating." },
    { kind: "evidence-quality", source: "Galaxy model", freshness: "Fresh", hasFailureCase: true },
    { kind: "calibration-status", gated: true },
  ];

  it("renders every public level without revealing weights/thresholds/formulas", () => {
    for (const fact of FACTS) {
      for (const level of ["plain", "standard", "sharp", "technical-safe"] as const) {
        const r = renderExplanation(fact, level);
        expect(containsForbiddenForPublic(r.text)).toBeNull();
      }
    }
  });
});

describe("competitor inference: telemetry never leaks weights / prompts", () => {
  it("FORBIDDEN_FIELD_KEYS includes the methodology family", () => {
    for (const k of [
      "modelWeights",
      "promptText",
      "calibrationFormula",
      "factorThreshold",
    ]) {
      expect(FORBIDDEN_FIELD_KEYS.has(k)).toBe(true);
    }
  });

  it("containsForbiddenField catches a planted weight", () => {
    const payload = { name: "surface.viewed", surface: "today", factorThreshold: 0.42 };
    expect(containsForbiddenField(payload)).toBe("factorThreshold");
  });

  it("stripForbiddenFields removes a planted prompt", () => {
    const payload = { name: "explainer.opened", promptText: "leak attempt", surface: "picks" };
    const cleaned = stripForbiddenFields(payload) as Record<string, unknown>;
    expect(cleaned.promptText).toBeUndefined();
    expect(cleaned.surface).toBe("picks");
  });
});

describe("competitor inference: friction prompts only navigate, never reveal internals", () => {
  for (const prompt of FRICTION_PROMPTS) {
    it(`${prompt.id} body has no forbidden terms`, () => {
      expect(containsForbiddenForPublic(prompt.body)).toBeNull();
    });
  }
});

describe("competitor inference: public source labels are a closed set", () => {
  it("internal-only provider ids never reach the client as their internal name", () => {
    expect(PUBLIC_SOURCE_KEYS.has(publicSourceFor("the-odds-api"))).toBe(true);
    expect(PUBLIC_SOURCE_KEYS.has(publicSourceFor("galaxy-prediction-engine"))).toBe(true);
    expect(PUBLIC_SOURCE_KEYS.has(publicSourceFor("unknown-internal"))).toBe(true);
  });
});
