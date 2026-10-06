import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PICK_GRADE_LABELS, RISK_LEVEL_LABELS } from "@sports/types";

/**
 * FE-11: the dashboard used to render the raw Prisma enum values for a
 * pick's grade and risk level (e.g. "ELITE_PLAY", "HIGH_VARIANCE") because
 * GradeBadge's own style map only recognized "A"/"B"/"C" — a mismatch with
 * every real value, so every grade badge fell through its own fallback
 * style and printed the raw enum. Both now go through the shared
 * PICK_GRADE_LABELS / RISK_LEVEL_LABELS maps from @sports/types (the same
 * ones components/picks/pick-card.tsx already uses), so the dashboard and
 * the public pick card can never drift into showing different labels for
 * the same enum value.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

describe("/dashboard pick grade and risk level labels", () => {
  it("imports the shared label maps rather than reinventing them", () => {
    expect(src).toMatch(/PICK_GRADE_LABELS/);
    expect(src).toMatch(/RISK_LEVEL_LABELS/);
    expect(src).toMatch(/from\s+"@sports\/types"/);
  });

  it("never renders a raw PickGrade/RiskLevel enum value directly", () => {
    expect(src).not.toMatch(/\{pick\.riskLevel\}/);
    expect(src).not.toMatch(/\{grade\}/);
  });

  it("the shared maps cover every enum value with a human-readable label", () => {
    for (const grade of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"] as const) {
      expect(PICK_GRADE_LABELS[grade].label).not.toMatch(/^[A-Z_]+$/);
    }
    for (const risk of [
      "LOW_RISK",
      "MODERATE",
      "HIGH_VARIANCE",
      "INJURY_RISK",
      "LINE_STEAM",
    ] as const) {
      expect(RISK_LEVEL_LABELS[risk].label).not.toMatch(/^[A-Z_]+$/);
    }
  });
});
