import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static gating invariants for the "Ask the Edge" explainer route. Mirrors the
 * model-court-route source-scan style: assert the fail-closed gates exist in
 * the route source so a refactor can never silently open the surface.
 */
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/picks/[id]/explain/route.ts"),
  "utf8",
);
const grounding = fs.readFileSync(
  path.join(repoRoot, "apps/web/lib/pick-explainer/grounding.ts"),
  "utf8",
);
const prompts = fs.readFileSync(
  path.join(repoRoot, "apps/web/lib/pick-explainer/prompts.ts"),
  "utf8",
);

describe("Ask-the-Edge route — fail-closed gating", () => {
  it("is OFF by default behind an explicit feature flag", () => {
    expect(route).toContain('process.env["PICK_EXPLAINER_ENABLED"] !== "true"');
    // The flag check returns before any work — launch path is untouched.
    const flagIdx = route.indexOf("PICK_EXPLAINER_ENABLED");
    const authIdx = route.indexOf("await auth()");
    expect(flagIdx).toBeGreaterThan(-1);
    expect(flagIdx).toBeLessThan(authIdx);
  });

  it("is inert without the Claude key (503 claude-not-configured)", () => {
    expect(route).toContain('process.env["ANTHROPIC_API_KEY"]');
    expect(route).toContain("claude-not-configured");
  });

  it("requires auth + Pro-or-Elite entitlement", () => {
    expect(route).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(route).toContain("getUserEntitlements");
    expect(route).toContain("canSeeFactorBreakdown");
  });

  it("hides unpublished / bootstrap picks behind a 404", () => {
    expect(route).toContain("!pick.isPublished || pick.isBootstrap");
  });

  it("routes the LLM call only through the approved explainer service", () => {
    expect(route).toContain('from "@/lib/pick-explainer/explain"');
    expect(route).toContain("explainPick");
    // The route never calls the Anthropic endpoint or wrapper directly.
    expect(route).not.toContain("callClaudeMessages");
    expect(route).not.toContain("api.anthropic.com");
  });
});

describe("Ask-the-Edge — reveal-less by construction", () => {
  it("never asks the model to expose weights, recipe, or a Signal layer", () => {
    const sys = prompts.toLowerCase();
    expect(sys).not.toContain("signal layer");
    expect(sys).not.toContain("reveal the weight");
    // It explicitly forbids advice/certainty/EV framing.
    expect(prompts).toContain("NOT advice");
    expect(prompts).toContain("No certainty");
  });

  it("grounds ONLY on the stored factor breakdown + signal snapshot", () => {
    // The two citation tokens are the only grounding anchors.
    expect(grounding).toContain("factor_breakdown at");
    expect(grounding).toContain("signal_snapshot at");
    // No external fetch / network / DB import inside the pure grounder.
    expect(grounding).not.toContain("fetch(");
    expect(grounding).not.toContain("@sports/db");
  });
});
