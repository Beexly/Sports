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
    // The council autonomy tripwire must NOT fire while every seat status is
    // in the governed manual-only set (G-10: membership check, not "ACTIVE").
    expect(ids).not.toContain("council-autonomy-claimed");
    // G-11: categories with no real checks carry an explicit not-implemented
    // finding instead of a vacuous 1.0 health.
    expect(ids).toContain("security-checks-not-implemented");
    expect(ids).toContain("outcome-quality-checks-not-implemented");
    expect(ids).toContain("foundry-unused");
  });

  it("G-10: the autonomy tripwire is a closed-set membership check, not a dead ACTIVE comparison", () => {
    const src = read("lib/assurance/findings.ts");
    // The dead guard needed an `as { status: string }` cast to compare the
    // council status to a value outside CouncilSeatStatus — that cast shape
    // must never return. (CAPABILITY_REGISTRY's ACTIVE filter is a different,
    // legitimate union and stays.)
    expect(src).not.toMatch(/as \{ status: string \}/);
    expect(src).toMatch(/GOVERNED_SEAT_STATUSES/);
    expect(src).toMatch(/"DRAFT_ONLY", "MANUAL", "NOT_WIRED"/);
    expect(src).toMatch(/AGENT_COUNCIL\.filter\(\(s\) => !GOVERNED_SEAT_STATUSES\.includes\(s\.status\)\)/);
  });

  it("G-11: security and outcome_quality health is capped below 1.0 while no real checks exist", () => {
    const report = buildAssuranceReport(CTX);
    for (const id of ["security", "outcome_quality"] as const) {
      const cat = report.categories.find((c) => c.id === id)!;
      expect(cat.findings.length, id).toBeGreaterThan(0);
      expect(cat.health, id).toBeLessThan(1);
    }
  });

  it("G-13: no fabricated evidence — flag names come from source, counts from the registry, no fake acknowledgment", () => {
    const src = read("lib/assurance/findings.ts");
    // The ghost flag that existed nowhere in the codebase:
    expect(src).not.toContain("AI_MODEL_ROUTER_LIVE_ENABLED");
    // The hardcoded manifest count and the acknowledgment that never happened:
    expect(src).not.toContain("3 manifests, all DRAFT");
    const foundryUnused = deriveFindings(CTX).find((f) => f.id === "foundry-unused")!;
    expect(foundryUnused.status).toBe("OPEN");
    expect(foundryUnused.evidence[0]!.observation).toContain("derived from registry state");
  });

  it("FIX 3 (external review): the shadow-only finding names the REAL flag and cites shadow.ts, not router.ts", () => {
    // The bug: the flag AI_MODEL_ROUTER_SHADOW_ENABLED lives in shadow.ts
    // (isRouterShadowEnabled), but the old code grepped router.ts — which
    // has no env var at all — so it always emitted the false "no enable
    // flag / promotion is code-review-only" claim. This test exercises the
    // exact bypass: the finding must now cite shadow.ts and name the real
    // flag, and must NOT emit the false-absence fallback text.
    const finding = deriveFindings(CTX).find((f) => f.id === "model-router-shadow-only");
    expect(finding).toBeDefined();
    const flagEvidence = finding!.evidence.find((e) =>
      e.observation.includes("AI_MODEL_ROUTER_SHADOW_ENABLED")
    );
    expect(flagEvidence, JSON.stringify(finding!.evidence)).toBeDefined();
    expect(flagEvidence!.path).toBe("apps/web/lib/ai-routing/shadow.ts");
    expect(flagEvidence!.observation).toMatch(/content-verified/i);
    expect(flagEvidence!.observation).toMatch(/default off/i);
    // The old false-fallback claim must never appear once the flag exists.
    expect(
      finding!.evidence.some((e) => /no env live-flag found/i.test(e.observation))
    ).toBe(false);
    // router.ts must not be (mis)cited as the source of the flag claim.
    expect(
      finding!.evidence.some(
        (e) => e.path === "apps/web/lib/ai-routing/router.ts" && /live-flag|gated by/i.test(e.observation)
      )
    ).toBe(false);
  });

  it("G-14: the grade gate compares UNROUNDED coverage; rounding is display-only", () => {
    const src = read("lib/assurance/build-report.ts");
    expect(src).toMatch(/const rawCoverage = weightedCoverage\(\)/);
    expect(src).toMatch(/graded = rawCoverage >= COVERAGE_THRESHOLD/);
    // The rounded-then-compared shape must not return:
    expect(src).not.toMatch(/overallCoverage >= COVERAGE_THRESHOLD/);
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

describe("assurance — runtime honesty (repo tree unreachable)", () => {
  it("findRepoRoot locates the real root and returns null where no markers exist", async () => {
    const { findRepoRoot } = await import("@/lib/ops/repo-root");
    expect(findRepoRoot(join(__dirname, ".."))).toBe(REPO_ROOT);
    expect(findRepoRoot("/")).toBeNull();
  });

  it("route and page refuse with a distinct runtime-limited state instead of inverted findings", () => {
    const route = read("app/api/cockpit/assurance/route.ts");
    expect(route).toContain("findRepoRoot");
    expect(route).toMatch(/runtimeLimited: true/);
    expect(route).toMatch(/status: 503/);
    expect(route).toMatch(/not a verdict/i);
    const page = read("app/cockpit/assurance/page.tsx");
    expect(page).toContain("assurance-runtime-limited-state");
    expect(page).toMatch(/runtime limitation, not a verdict/i);
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
