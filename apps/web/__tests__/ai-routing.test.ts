import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  recommendRoute,
  shadowRecommend,
  isRouterShadowEnabled,
  isKnownEndpoint,
  selectLane,
  ROUTING_POLICY_VERSION,
  LANE_BUDGET_CEILINGS,
  ENDPOINT_REGISTRY,
  CURRENT_CLAUDE_ENDPOINT,
  FROZEN_EVAL_SUITE,
  EVAL_RUN_HISTORY,
  type RouteTaskProfile,
} from "@/lib/ai-routing";

/**
 * Model Portfolio Router — shadow-mode invariants (the 11 packet rules).
 * The router recommends; it never calls, never falls back, never touches
 * the production path.
 */

const base: RouteTaskProfile = {
  surface: "cockpit",
  taskType: "summarize",
  risk: "LOW",
  sensitivity: "INTERNAL",
  publicVisibility: false,
  requiresStructuredOutput: false,
  requiresTools: false,
  latencyTargetMs: null,
  budgetUsd: null,
  deterministicSolutionExists: false,
};

describe("router — deterministic lane selection", () => {
  it("same profile → same recommendation (deep equal)", () => {
    expect(recommendRoute(base)).toEqual(recommendRoute({ ...base }));
  });

  it("policy version is pinned on every recommendation", () => {
    expect(recommendRoute(base).policyVersion).toBe(ROUTING_POLICY_VERSION);
    expect(ROUTING_POLICY_VERSION).toBe("routing-policy/1.0.0");
  });
});

describe("router — critical/public tasks cannot take a cheap lane", () => {
  it("public visibility forces the high-stakes lane", () => {
    const r = recommendRoute({ ...base, publicVisibility: true });
    expect(r.lane).toBe("PUBLIC_HIGH_STAKES");
  });

  it("critical risk forces the high-stakes lane even with a tiny budget", () => {
    const r = recommendRoute({ ...base, risk: "CRITICAL", budgetUsd: 0.01 });
    expect(r.lane).toBe("PUBLIC_HIGH_STAKES");
    // Budget caps the ceiling but never downgrades the lane.
    expect(r.budgetCeilingUsd).toBe(0.01);
  });
});

describe("router — sensitive tasks never reach an external endpoint", () => {
  it("SENSITIVE routes to LOCAL_PRIVATE and blocks (no local endpoint exists)", () => {
    const r = recommendRoute({ ...base, sensitivity: "SENSITIVE" });
    expect(r.lane).toBe("LOCAL_PRIVATE");
    expect(r.blocked).toBe(true);
    expect(r.endpointId).toBeNull();
  });

  it("no registered endpoint trains on data (structural requirement)", () => {
    for (const e of ENDPOINT_REGISTRY) {
      expect(e.trainsOnData, e.id).toBe(false);
    }
  });
});

describe("router — deterministic tasks stay deterministic", () => {
  it("NO_MODEL when code already solves it, with zero budget", () => {
    const r = recommendRoute({ ...base, deterministicSolutionExists: true });
    expect(r.lane).toBe("NO_MODEL");
    expect(r.endpointId).toBeNull();
    expect(r.budgetCeilingUsd).toBe(0);
    expect(r.blocked).toBe(false);
  });
});

describe("router — health handling", () => {
  it("a DOWN endpoint is excluded and the recommendation blocks with a reason", () => {
    const r = recommendRoute(base, [
      { endpointId: CURRENT_CLAUDE_ENDPOINT.id, health: "DOWN", evidence: "probe: 503s" },
    ]);
    expect(r.blocked).toBe(true);
    expect(r.endpointId).toBeNull();
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it("UNKNOWN health is usable only for the current-production endpoint", () => {
    const r = recommendRoute(base);
    expect(r.endpointId).toBe(CURRENT_CLAUDE_ENDPOINT.id);
  });
});

describe("router — budget ceilings", () => {
  it("task budget caps below the lane ceiling; lane ceiling caps otherwise", () => {
    expect(recommendRoute({ ...base, budgetUsd: 0.5 }).budgetCeilingUsd).toBe(0.5);
    expect(recommendRoute(base).budgetCeilingUsd).toBe(LANE_BUDGET_CEILINGS.EXECUTE_BOUNDED);
  });
});

describe("router — fallback ordering without fallback calls", () => {
  it("fallbackOrder is data, and the current production endpoint ranks first", () => {
    const r = recommendRoute(base);
    expect(Array.isArray(r.fallbackOrder)).toBe(true);
    expect(r.endpointId).toBe(CURRENT_CLAUDE_ENDPOINT.id);
  });
});

describe("router — shadow mode cannot alter the current call", () => {
  it("the module performs no network calls anywhere (source-level pin)", () => {
    const dir = join(__dirname, "..", "lib", "ai-routing");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
      );
    for (const file of walk(dir)) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/\bfetch\s*\(/);
      expect(src, file).not.toMatch(/XMLHttpRequest|axios|undici/);
      expect(src, file).not.toMatch(/@anthropic-ai\/sdk|anthropic\(/i);
    }
  });

  it("recommendations are marked shadow and serializable", () => {
    const r = recommendRoute(base);
    expect(r.shadow).toBe(true);
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  it("shadowRecommend is null while the flag is off (default)", () => {
    expect(process.env["AI_MODEL_ROUTER_SHADOW_ENABLED"]).toBeUndefined();
    expect(isRouterShadowEnabled()).toBe(false);
    expect(shadowRecommend(base)).toBeNull();
  });

  it("no production call site consults the router yet (grep pin)", () => {
    // The shadow module ships un-wired: instrumentation is a later, logged,
    // non-branching step. This pin fails if someone wires it silently.
    const claudeApiDir = join(__dirname, "..", "lib", "claude-api");
    const walkFiles = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walkFiles(join(d, e.name)) : [join(d, e.name)]
      );
    for (const f of walkFiles(claudeApiDir)) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toContain("shadowRecommend");
      expect(src, f).not.toContain("ai-routing");
    }
  });
});

describe("router — unknown endpoints are blocked", () => {
  it("only registry endpoints are known", () => {
    expect(isKnownEndpoint(CURRENT_CLAUDE_ENDPOINT.id)).toBe(true);
    expect(isKnownEndpoint("openai-gpt-whatever")).toBe(false);
  });

  it("the registry contains exactly the current production endpoint", () => {
    expect(ENDPOINT_REGISTRY.length).toBe(1);
    expect(ENDPOINT_REGISTRY[0]!.isCurrentProduction).toBe(true);
  });
});

describe("router — reasons and lane logic", () => {
  it("every recommendation carries a non-empty reason", () => {
    const profiles: RouteTaskProfile[] = [
      base,
      { ...base, deterministicSolutionExists: true },
      { ...base, sensitivity: "SENSITIVE" },
      { ...base, publicVisibility: true },
      { ...base, taskType: "verify" },
      { ...base, requiresStructuredOutput: true },
      { ...base, risk: "HIGH" },
    ];
    for (const p of profiles) {
      expect(recommendRoute(p).reason.length).toBeGreaterThan(10);
    }
  });

  it("lane policy is ordered: sensitivity beats public, public beats verify", () => {
    expect(selectLane({ ...base, sensitivity: "SENSITIVE", publicVisibility: true }).lane).toBe("LOCAL_PRIVATE");
    expect(selectLane({ ...base, publicVisibility: true, taskType: "verify" }).lane).toBe("PUBLIC_HIGH_STAKES");
    expect(selectLane({ ...base, taskType: "verify" }).lane).toBe("VERIFY_INDEPENDENT");
  });
});

describe("router — frozen evals make claims impossible without runs", () => {
  it("no eval runs exist and no quality claim can be made without one", () => {
    expect(FROZEN_EVAL_SUITE.length).toBe(0);
    expect(EVAL_RUN_HISTORY.length).toBe(0);
  });
});
