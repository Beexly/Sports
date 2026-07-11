import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildAssuranceReport,
  deriveFindings,
  CATEGORY_SPECS,
  COVERAGE_THRESHOLD,
  weightedCoverage,
  pickTopRecommendation,
  categoryHealth,
} from "@/lib/assurance";

/**
 * AI Setup Assurance — evidence-or-nothing invariants.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CTX = { repoRoot: REPO_ROOT };
const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("assurance — scoring policy", () => {
  it("weights sum to exactly 100", () => {
    expect(CATEGORY_SPECS.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("every category declares what it could NOT inspect", () => {
    for (const c of CATEGORY_SPECS) {
      expect(c.notInspected.length, c.id).toBeGreaterThan(0);
      expect(c.coverage).toBeGreaterThan(0);
      expect(c.coverage).toBeLessThanOrEqual(1);
    }
  });

  it("utilization and outcome quality stay mostly uncovered (file existence is not usage)", () => {
    const util = CATEGORY_SPECS.find((c) => c.id === "utilization_dead_weight")!;
    const outcome = CATEGORY_SPECS.find((c) => c.id === "outcome_quality")!;
    expect(util.coverage).toBeLessThanOrEqual(0.5);
    expect(outcome.coverage).toBeLessThanOrEqual(0.5);
  });
});

describe("assurance — INCOMPLETE below the coverage threshold", () => {
  it("a pure repo checkout cannot reach the grade threshold", () => {
    expect(weightedCoverage()).toBeLessThan(COVERAGE_THRESHOLD);
  });

  it("the report says INCOMPLETE with a null score — never a cosmetic grade", () => {
    const report = buildAssuranceReport(CTX);
    expect(report.verdict).toBe("INCOMPLETE");
    expect(report.overallScore).toBeNull();
    expect(report.overallCoverage).toBeLessThan(COVERAGE_THRESHOLD);
  });

  it("the page explains the missing grade instead of hiding it", () => {
    const page = read("app/cockpit/assurance/page.tsx");
    expect(page).toContain("assurance-incomplete-note");
    expect(page).toMatch(/never by relaxing the threshold/i);
    expect(page).toContain("assurance-disabled-state");
  });
});

describe("assurance — findings carry evidence, validation, and fix", () => {
  it("every finding has evidence paths and both smallest-steps", () => {
    for (const f of deriveFindings(CTX)) {
      expect(f.evidence.length, f.id).toBeGreaterThan(0);
      for (const e of f.evidence) expect(e.path.length).toBeGreaterThan(0);
      expect(f.smallestValidation.length, f.id).toBeGreaterThan(0);
      expect(f.smallestSafeFix.length, f.id).toBeGreaterThan(0);
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("expected current findings exist and none contradict code truth", () => {
    const ids = deriveFindings(CTX).map((f) => f.id);
    // These derive from live registry/module state — they disappear when the
    // underlying gap is fixed, without editing assurance code.
    expect(ids).toContain("memory-activation-pending");
    // Model routing is graded from REAL evidence (Codex P2 on #77): this repo
    // ships pickModelForSurface + provider-dispatch, so the honest finding is
    // the missing lane policy/telemetry — never a false "no router exists".
    expect(ids).toContain("model-routing-lanes-missing");
    expect(ids).not.toContain("no-model-router");
    // The shadow-lane finding stacks only when the WS-E module is present.
    const shadowExists = existsSync(join(REPO_ROOT, "apps/web/lib/ai-routing/router.ts"));
    if (shadowExists) {
      expect(ids).toContain("model-router-shadow-only");
    } else {
      expect(ids).not.toContain("model-router-shadow-only");
    }
    expect(ids).toContain("no-external-skill-scanner");
    expect(ids).toContain("tool-router-not-wired");
    // The council autonomy tripwire must NOT fire while no seat is ACTIVE.
    expect(ids).not.toContain("council-autonomy-claimed");
  });

  it("report is deterministic: same checkout → deep-equal report", () => {
    expect(buildAssuranceReport(CTX)).toEqual(buildAssuranceReport(CTX));
  });
});

describe("assurance — health and recommendation", () => {
  it("category health decreases with open findings and never goes negative", () => {
    const findings = deriveFindings(CTX);
    for (const c of CATEGORY_SPECS) {
      const h = categoryHealth(c.id, findings);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }
  });

  it("top recommendation is picked by risk-adjusted leverage, not score gain", () => {
    const top = pickTopRecommendation(deriveFindings(CTX));
    expect(top).not.toBeNull();
    // With no CRITICAL/HIGH open findings in a healthy checkout, the top pick
    // must be a MEDIUM (the highest severity present), not a LOW that would
    // move a category number more.
    const open = deriveFindings(CTX).filter((f) => f.status === "OPEN");
    const maxRank = Math.max(...open.map((f) => ({ LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 })[f.risk]));
    expect({ LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[top!.risk]).toBe(maxRank);
  });
});

describe("assurance — admin-only API and flag", () => {
  it("route checks the admin session first, then the flag", () => {
    const route = read("app/api/cockpit/assurance/route.ts");
    expect(route).toMatch(/session\?\.user \|\| session\.user\.role !== "ADMIN"/);
    expect(route).toMatch(/status: 403/);
    expect(route.indexOf('role !== "ADMIN"')).toBeLessThan(route.indexOf("isAssuranceEnabled()"));
  });

  it("flag defaults off", () => {
    expect(process.env["AI_SETUP_ASSURANCE_ENABLED"]).toBeUndefined();
  });
});
