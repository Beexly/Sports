/**
 * Explainability evaluation harness.
 *
 * Asserts that the Explainability Ladder produces public-safe text at
 * every public level, scrubs forbidden terms, and renders Academy and
 * Operator levels without bleeding into public surfaces.
 */

import { describe, it, expect } from "vitest";
import {
  EXPLANATION_LEVELS,
  isPublicLevel,
  containsForbiddenForPublic,
  PUBLIC_FORBIDDEN_TERMS,
} from "@/lib/explainability/levels";
import { renderExplanation, type ExplanationFact } from "@/lib/explainability/renderers";

const PASS_FACT: ExplanationFact = {
  kind: "pass-decision",
  sport: "NBA",
  game: "BOS @ NYK",
  dominantReason: "stale-line",
  detail: "Line stopped updating beyond the freshness threshold.",
};

const EVIDENCE_FACT: ExplanationFact = {
  kind: "evidence-quality",
  source: "Galaxy model",
  freshness: "Fresh",
  hasFailureCase: true,
};

const CAL_FACT: ExplanationFact = {
  kind: "calibration-status",
  gated: true,
};

describe("explainability: public levels never leak forbidden terms", () => {
  it.each(EXPLANATION_LEVELS.filter(isPublicLevel))(
    "%s renders pass without forbidden terms",
    (level) => {
      const r = renderExplanation(PASS_FACT, level);
      expect(containsForbiddenForPublic(r.text)).toBeNull();
      expect(r.publicSafe).toBe(true);
    },
  );

  it.each(EXPLANATION_LEVELS.filter(isPublicLevel))(
    "%s renders evidence without forbidden terms",
    (level) => {
      const r = renderExplanation(EVIDENCE_FACT, level);
      expect(containsForbiddenForPublic(r.text)).toBeNull();
    },
  );

  it.each(EXPLANATION_LEVELS.filter(isPublicLevel))(
    "%s renders calibration status without forbidden terms",
    (level) => {
      const r = renderExplanation(CAL_FACT, level);
      expect(containsForbiddenForPublic(r.text)).toBeNull();
    },
  );
});

describe("explainability: forbidden term detector", () => {
  for (const term of PUBLIC_FORBIDDEN_TERMS) {
    it(`detects '${term}' in arbitrary text`, () => {
      expect(containsForbiddenForPublic(`some text including ${term} mixed in`)).toBe(term);
    });
  }
});

describe("explainability: level taxonomy completeness", () => {
  it("declares 6 levels", () => {
    expect(EXPLANATION_LEVELS.length).toBe(6);
  });

  it("has at least one public level", () => {
    expect(EXPLANATION_LEVELS.filter(isPublicLevel).length).toBeGreaterThan(0);
  });

  it("operator-only is not public", () => {
    expect(isPublicLevel("operator-only")).toBe(false);
  });
});
