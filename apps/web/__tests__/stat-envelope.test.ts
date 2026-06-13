import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PLAYER_VIEWS } from "@/lib/players/views";

/**
 * Stat envelope — the stat commandment as a typed contract on MetricTerm
 * (definition + known weakness + decision use; source/timestamp live at
 * view level). Enforcement grows surface by surface: this test pins which
 * views are FULLY enveloped so rollout can never silently regress.
 */

const FULLY_ENVELOPED_VIEWS = ["production"];

describe("stat envelope contract", () => {
  it("the explainer renders weakness and decision-use when present", () => {
    const src = readFileSync(
      join(__dirname, "..", "components", "ui", "metric-explainer.tsx"),
      "utf8",
    );
    expect(src).toContain("Known weakness:");
    expect(src).toContain("Decision use:");
    expect(src).toMatch(/weakness\?: ReactNode/);
    expect(src).toMatch(/decisionUse\?: ReactNode/);
  });

  for (const slug of FULLY_ENVELOPED_VIEWS) {
    it(`the ${slug} view is fully enveloped — every metric carries weakness + decision use`, () => {
      const view = PLAYER_VIEWS.find((v) => v.slug === slug);
      expect(view).toBeDefined();
      expect(view!.explainer && view!.explainer.length).toBeTruthy();
      for (const term of view!.explainer!) {
        expect(term.weakness, `term missing weakness in ${slug}`).toBeTruthy();
        expect(term.decisionUse, `term missing decisionUse in ${slug}`).toBeTruthy();
      }
    });
  }

  it("envelope language stays honest — no projection promises in decision-use lines", () => {
    for (const view of PLAYER_VIEWS) {
      for (const term of view.explainer ?? []) {
        const text = [term.decisionUse, term.weakness]
          .filter((x): x is string => typeof x === "string")
          .join(" ");
        expect(text).not.toMatch(/guarantee|lock|can't lose|sure thing/i);
      }
    }
  });
});
