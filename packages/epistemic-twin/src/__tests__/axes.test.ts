import { describe, it, expect } from "vitest";
import {
  decayEvidence,
  composeOne,
  composeGraph,
  toCapabilityStatus,
  canActAsIf,
  TwinCycleError,
  SEVERITY_RANK,
  type CapabilityNode,
  type OwnEvidence,
  type OwnState,
  type ComposedState,
  type Severity,
} from "../axes.js";

const NOW = new Date("2026-07-19T12:00:00.000Z");
const HORIZON = 5 * 60 * 1000; // 5 minutes

function evidence(overrides: Partial<OwnEvidence> = {}): OwnEvidence {
  return {
    observedAt: NOW,
    freshnessHorizonMs: HORIZON,
    intent: "open",
    severityTags: [],
    unavailable: false,
    reasons: [],
    ...overrides,
  };
}

function node(id: string, overrides: Partial<CapabilityNode> = {}): CapabilityNode {
  return {
    id,
    deps: [],
    evidence: evidence(),
    ...overrides,
  };
}

function healthyState(id: string): ComposedState {
  return { id, kind: "healthy", reasons: [] };
}

// ---------------------------------------------------------------------------
// Decay
// ---------------------------------------------------------------------------

describe("decayEvidence", () => {
  it("fresh evidence passes through as its own kind", () => {
    const result = decayEvidence(evidence(), NOW);
    expect(result).toEqual({ kind: "healthy", reasons: [] });
  });

  it("fresh evidence within horizon (not expired) is not unknown", () => {
    const observedAt = new Date(NOW.getTime() - HORIZON + 1000);
    const result = decayEvidence(evidence({ observedAt }), NOW);
    expect(result.kind).not.toBe("unknown");
  });

  it("null observedAt decays to unknown with evidence_missing reason", () => {
    const result = decayEvidence(evidence({ observedAt: null }), NOW);
    expect(result.kind).toBe("unknown");
    expect(result.reasons).toContain("evidence_missing");
  });

  it("evidence older than freshnessHorizonMs decays to unknown with evidence_expired reason", () => {
    const observedAt = new Date(NOW.getTime() - HORIZON - 1);
    const result = decayEvidence(evidence({ observedAt }), NOW);
    expect(result.kind).toBe("unknown");
    expect(result.reasons).toContain("evidence_expired");
  });

  it("evidence exactly at the horizon boundary is still fresh (not expired)", () => {
    const observedAt = new Date(NOW.getTime() - HORIZON);
    const result = decayEvidence(evidence({ observedAt }), NOW);
    expect(result.kind).not.toBe("unknown");
  });

  it("gated intent (fresh evidence) decays to gated, taking priority over severity tags", () => {
    const result = decayEvidence(
      evidence({ intent: "proof_gated", severityTags: ["degraded"] }),
      NOW,
    );
    expect(result).toEqual({ kind: "gated", intent: "proof_gated", reasons: [] });
  });

  it("owner_gated intent decays to gated with owner_gated intent", () => {
    const result = decayEvidence(evidence({ intent: "owner_gated" }), NOW);
    expect(result).toEqual({ kind: "gated", intent: "owner_gated", reasons: [] });
  });

  it("unavailable flag (fresh, open intent) decays to unavailable", () => {
    const result = decayEvidence(evidence({ unavailable: true }), NOW);
    expect(result).toEqual({ kind: "unavailable", reasons: [] });
  });

  it("severity tags (fresh, open intent, not unavailable) decay to impaired with those tags", () => {
    const result = decayEvidence(evidence({ severityTags: ["degraded", "stale"] }), NOW);
    expect(result).toEqual({ kind: "impaired", tags: ["degraded", "stale"], reasons: [] });
  });

  it("no severity tags, open intent, not unavailable decays to healthy", () => {
    const result = decayEvidence(evidence(), NOW);
    expect(result.kind).toBe("healthy");
  });

  it("does not call Date.now() — is a pure function of injected now", () => {
    // Same evidence, two different injected `now`s straddling the horizon,
    // must produce different results purely from the parameter.
    const ev = evidence({ observedAt: NOW });
    const fresh = decayEvidence(ev, new Date(NOW.getTime() + 1000));
    const expired = decayEvidence(ev, new Date(NOW.getTime() + HORIZON + 1));
    expect(fresh.kind).not.toBe("unknown");
    expect(expired.kind).toBe("unknown");
  });

  it("PINNED: fresh unavailable evidence wins over a simultaneously-set gate intent (matches composeOne's rule 1-before-2 priority — a real fresh outage is never masked as mere intentional darkness)", () => {
    const result = decayEvidence(evidence({ unavailable: true, intent: "owner_gated" }), NOW);
    expect(result).toEqual({ kind: "unavailable", reasons: [] });
  });

  it("PINNED: gated intent survives observedAt going stale — gating is a structural/config fact, it does not expire like severity evidence (matches OwnEvidence.intent's own doc comment)", () => {
    const observedAt = new Date(NOW.getTime() - HORIZON - 1); // well past the horizon
    const result = decayEvidence(evidence({ observedAt, intent: "proof_gated" }), NOW);
    expect(result).toEqual({ kind: "gated", intent: "proof_gated", reasons: [] });
  });

  it("PINNED: gated intent survives a null observedAt (never-observed) — the config fact needs no timestamp to be true", () => {
    const result = decayEvidence(evidence({ observedAt: null, intent: "owner_gated" }), NOW);
    expect(result).toEqual({ kind: "gated", intent: "owner_gated", reasons: [] });
  });

  it("a STALE unavailable claim (not fresh) decays to unknown like any other stale severity evidence, and does NOT win over a fresh-independent gate", () => {
    const staleObservedAt = new Date(NOW.getTime() - HORIZON - 1);
    // unavailable alone, stale, open intent -> unknown (not unavailable).
    const staleUnavailable = decayEvidence(evidence({ observedAt: staleObservedAt, unavailable: true }), NOW);
    expect(staleUnavailable.kind).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// composeOne — each rule of the composition law individually
// ---------------------------------------------------------------------------

describe("composeOne — rule 1: unavailable", () => {
  it("own unavailable propagates to unavailable", () => {
    const own: OwnState = { kind: "unavailable", reasons: ["own_down"] };
    const result = composeOne("x", own, []);
    expect(result.kind).toBe("unavailable");
  });

  it("a hard dep composing unavailable propagates to unavailable", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unavailable", reasons: ["dep_down"] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "hard" }, composed: dep }]);
    expect(result.kind).toBe("unavailable");
    expect(result.reasons.some((r) => r.includes("dep"))).toBe(true);
  });

  it("a soft dep composing unavailable does NOT propagate unavailable", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unavailable", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).not.toBe("unavailable");
  });
});

describe("composeOne — rule 2: gated, with provenance", () => {
  it("own gated propagates as gated (never as fake outage)", () => {
    const own: OwnState = { kind: "gated", intent: "owner_gated", reasons: ["flag_off"] };
    const result = composeOne("x", own, []);
    expect(result).toEqual({ id: "x", kind: "gated", intent: "owner_gated", reasons: ["flag_off"] });
  });

  it("a hard dep composing gated propagates as gated with a provenance chain in reasons", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = {
      id: "gate:X",
      kind: "gated",
      intent: "proof_gated",
      reasons: ["awaiting_proof"],
    };
    const result = composeOne("x", own, [{ edge: { id: "gate:X", kind: "hard" }, composed: dep }]);
    expect(result.kind).toBe("gated");
    if (result.kind === "gated") {
      expect(result.intent).toBe("proof_gated");
      expect(result.reasons.some((r) => r.includes("gate:X"))).toBe(true);
      expect(result.reasons.some((r) => r.includes("awaiting_proof"))).toBe(true);
    }
  });

  it("gated takes priority over an unavailable soft dep (soft never gates, own gate still wins)", () => {
    const own: OwnState = { kind: "gated", intent: "proof_gated", reasons: [] };
    const softDep: ComposedState = { id: "soft", kind: "unavailable", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "soft", kind: "soft" }, composed: softDep }]);
    expect(result.kind).toBe("gated");
  });

  it("a soft dep composing gated does NOT propagate gated", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "gated", intent: "owner_gated", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).not.toBe("gated");
  });

  it("PINNED: own gated escapes an unavailable HARD dependency — never report an intentionally-dark capability as unavailable just because a dependency also has a real outage (contract §1: 'reporting a founder-gated capability as unavailable would be dishonest alarm')", () => {
    const own: OwnState = { kind: "gated", intent: "owner_gated", reasons: ["flag_off"] };
    const hardDep: ComposedState = { id: "dep", kind: "unavailable", reasons: ["real_outage"] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "hard" }, composed: hardDep }]);
    expect(result.kind).toBe("gated");
    if (result.kind === "gated") {
      expect(result.intent).toBe("owner_gated");
    }
  });

  it("own gated escapes even when unavailable AND gated hard deps are both present (own-gated wins outright, no fallthrough)", () => {
    const own: OwnState = { kind: "gated", intent: "proof_gated", reasons: [] };
    const hardUnavailable: ComposedState = { id: "dep-down", kind: "unavailable", reasons: [] };
    const hardGated: ComposedState = { id: "dep-gated", kind: "gated", intent: "owner_gated", reasons: [] };
    const result = composeOne("x", own, [
      { edge: { id: "dep-down", kind: "hard" }, composed: hardUnavailable },
      { edge: { id: "dep-gated", kind: "hard" }, composed: hardGated },
    ]);
    expect(result.kind).toBe("gated");
    if (result.kind === "gated") {
      expect(result.intent).toBe("proof_gated"); // OWN intent, not the hard dep's
    }
  });

  it("scope check: a HARD-DEP-sourced unavailable still beats a HARD-DEP-sourced gated when OWN is neither (the escape is only for OWN gating, not general gated-over-unavailable)", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const hardUnavailable: ComposedState = { id: "dep-down", kind: "unavailable", reasons: [] };
    const hardGated: ComposedState = { id: "dep-gated", kind: "gated", intent: "owner_gated", reasons: [] };
    const result = composeOne("x", own, [
      { edge: { id: "dep-down", kind: "hard" }, composed: hardUnavailable },
      { edge: { id: "dep-gated", kind: "hard" }, composed: hardGated },
    ]);
    expect(result.kind).toBe("unavailable"); // unchanged from before this fix
  });
});

describe("composeOne — rule 3: unknown contagion through hard edges", () => {
  it("own unknown propagates to unknown", () => {
    const own: OwnState = { kind: "unknown", reasons: ["evidence_expired"] };
    const result = composeOne("x", own, []);
    expect(result.kind).toBe("unknown");
  });

  it("a hard dep composing unknown propagates to unknown (ignorance is contagious)", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unknown", reasons: ["evidence_missing"] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "hard" }, composed: dep }]);
    expect(result.kind).toBe("unknown");
  });

  it("a soft dep composing unknown does NOT propagate unknown", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unknown", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).not.toBe("unknown");
  });
});

describe("composeOne — rule 4: degraded/stale, tag union, soft one-notch cap", () => {
  it("own impaired (rank 1) composes to impaired with the same tags", () => {
    const own: OwnState = { kind: "impaired", tags: ["degraded"], reasons: [] };
    const result = composeOne("x", own, []);
    expect(result).toEqual({ id: "x", kind: "impaired", tags: ["degraded"], reasons: [] });
  });

  it("a hard dep composing impaired propagates impaired", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "impaired", tags: ["stale"], reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "hard" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
    if (result.kind === "impaired") {
      expect(result.tags).toContain("stale");
    }
  });

  it("stale + degraded are same-rank different tags, both retained (union) when both present", () => {
    const own: OwnState = { kind: "impaired", tags: ["degraded"], reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "impaired", tags: ["stale"], reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "hard" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
    if (result.kind === "impaired") {
      expect(new Set(result.tags)).toEqual(new Set(["degraded", "stale"]));
    }
  });

  it("PINNED: a soft dep composing impaired-with-ONLY-stale caps the dependent at exactly 'degraded' — the dep's own tag granularity (e.g. bare 'stale') is never propagated through a soft edge", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "impaired", tags: ["stale"], reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
    if (result.kind === "impaired") {
      expect(result.tags).toEqual(["degraded"]); // NOT ["stale"] — soft edges cap, never propagate.
    }
  });

  it("a soft dep composing impaired-with-degraded also caps at exactly 'degraded' (idempotent — not a second/duplicate tag)", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "impaired", tags: ["degraded"], reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
    if (result.kind === "impaired") {
      expect(result.tags).toEqual(["degraded"]);
    }
  });

  it("a soft dep that is UNAVAILABLE still only degrades the dependent one notch, never disables", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unavailable", reasons: ["down"] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
    if (result.kind === "impaired") {
      expect(result.tags).toEqual(["degraded"]);
    }
  });

  it("a soft dep that is UNKNOWN still only degrades the dependent one notch, never unknown-ifies", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "unknown", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
  });

  it("a soft dep that is GATED still only degrades the dependent one notch, never gates", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "gated", intent: "owner_gated", reasons: [] };
    const result = composeOne("x", own, [{ edge: { id: "dep", kind: "soft" }, composed: dep }]);
    expect(result.kind).toBe("impaired");
  });
});

describe("composeOne — rule 5: healthy", () => {
  it("healthy own + no deps composes healthy", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const result = composeOne("x", own, []);
    expect(result).toEqual({ id: "x", kind: "healthy", reasons: [] });
  });

  it("healthy own + all-healthy deps composes healthy", () => {
    const own: OwnState = { kind: "healthy", reasons: [] };
    const dep: ComposedState = { id: "dep", kind: "healthy", reasons: [] };
    const result = composeOne("x", own, [
      { edge: { id: "dep", kind: "hard" }, composed: dep },
      { edge: { id: "dep2", kind: "soft" }, composed: { id: "dep2", kind: "healthy", reasons: [] } },
    ]);
    expect(result.kind).toBe("healthy");
  });
});

// ---------------------------------------------------------------------------
// composeGraph
// ---------------------------------------------------------------------------

describe("composeGraph", () => {
  it("composes a simple linear chain", () => {
    const nodes: CapabilityNode[] = [
      node("a"),
      node("b", { deps: [{ id: "a", kind: "hard" }] }),
      node("c", { deps: [{ id: "b", kind: "hard" }] }),
    ];
    const result = composeGraph(nodes, NOW);
    expect(result.get("a")?.kind).toBe("healthy");
    expect(result.get("b")?.kind).toBe("healthy");
    expect(result.get("c")?.kind).toBe("healthy");
  });

  it("detects a direct cycle (a -> b -> a) and throws TwinCycleError naming the cycle", () => {
    const nodes: CapabilityNode[] = [
      node("a", { deps: [{ id: "b", kind: "hard" }] }),
      node("b", { deps: [{ id: "a", kind: "hard" }] }),
    ];
    expect(() => composeGraph(nodes, NOW)).toThrow(TwinCycleError);
    try {
      composeGraph(nodes, NOW);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(TwinCycleError);
      const cycleErr = err as InstanceType<typeof TwinCycleError>;
      expect(cycleErr.cycle).toContain("a");
      expect(cycleErr.cycle).toContain("b");
    }
  });

  it("detects a longer cycle (a -> b -> c -> a) and names it", () => {
    const nodes: CapabilityNode[] = [
      node("a", { deps: [{ id: "b", kind: "hard" }] }),
      node("b", { deps: [{ id: "c", kind: "soft" }] }),
      node("c", { deps: [{ id: "a", kind: "hard" }] }),
    ];
    expect(() => composeGraph(nodes, NOW)).toThrow(TwinCycleError);
  });

  it("does not stack-overflow or infinite-loop on a self-cycle", () => {
    const nodes: CapabilityNode[] = [node("a", { deps: [{ id: "a", kind: "hard" }] })];
    expect(() => composeGraph(nodes, NOW)).toThrow(TwinCycleError);
  });

  it("a missing dependency composes as unknown with a missing_dependency reason", () => {
    const nodes: CapabilityNode[] = [node("a", { deps: [{ id: "ghost", kind: "hard" }] })];
    const result = composeGraph(nodes, NOW);
    expect(result.get("a")?.kind).toBe("unknown");
    expect(result.get("a")?.reasons.some((r) => r.includes("missing_dependency:ghost"))).toBe(true);
  });

  it("a missing SOFT dependency only degrades (never unknown-ifies) the dependent", () => {
    const nodes: CapabilityNode[] = [node("a", { deps: [{ id: "ghost", kind: "soft" }] })];
    const result = composeGraph(nodes, NOW);
    expect(result.get("a")?.kind).toBe("impaired");
  });

  it("is deterministic: same inputs twice produce deep-equal outputs", () => {
    const nodes: CapabilityNode[] = [
      node("a", { evidence: evidence({ severityTags: ["stale"] }) }),
      node("b", { deps: [{ id: "a", kind: "soft" }] }),
      node("c", { deps: [{ id: "a", kind: "hard" }, { id: "b", kind: "hard" }] }),
    ];
    const r1 = composeGraph(nodes, NOW);
    const r2 = composeGraph(nodes, NOW);
    expect(Array.from(r1.entries())).toEqual(Array.from(r2.entries()));
  });

  it("shares the diamond dependency correctly (a <- b, a <- c, d <- b,c)", () => {
    const nodes: CapabilityNode[] = [
      node("a", { evidence: evidence({ unavailable: true }) }),
      node("b", { deps: [{ id: "a", kind: "hard" }] }),
      node("c", { deps: [{ id: "a", kind: "hard" }] }),
      node("d", { deps: [{ id: "b", kind: "hard" }, { id: "c", kind: "hard" }] }),
    ];
    const result = composeGraph(nodes, NOW);
    expect(result.get("a")?.kind).toBe("unavailable");
    expect(result.get("b")?.kind).toBe("unavailable");
    expect(result.get("c")?.kind).toBe("unavailable");
    expect(result.get("d")?.kind).toBe("unavailable");
  });
});

// ---------------------------------------------------------------------------
// Projection — exhaustive over composed-state shapes
// ---------------------------------------------------------------------------

describe("toCapabilityStatus", () => {
  it("unavailable -> unavailable", () => {
    expect(toCapabilityStatus({ id: "x", kind: "unavailable", reasons: [] })).toBe("unavailable");
  });
  it("gated proof_gated -> proof_gated", () => {
    expect(toCapabilityStatus({ id: "x", kind: "gated", intent: "proof_gated", reasons: [] })).toBe(
      "proof_gated",
    );
  });
  it("gated owner_gated -> owner_gated", () => {
    expect(toCapabilityStatus({ id: "x", kind: "gated", intent: "owner_gated", reasons: [] })).toBe(
      "owner_gated",
    );
  });
  it("unknown -> unknown", () => {
    expect(toCapabilityStatus({ id: "x", kind: "unknown", reasons: [] })).toBe("unknown");
  });
  it("impaired [degraded] -> degraded", () => {
    expect(toCapabilityStatus({ id: "x", kind: "impaired", tags: ["degraded"], reasons: [] })).toBe(
      "degraded",
    );
  });
  it("impaired [stale] -> stale", () => {
    expect(toCapabilityStatus({ id: "x", kind: "impaired", tags: ["stale"], reasons: [] })).toBe("stale");
  });
  it("impaired [degraded, stale] -> degraded (deterministic tie-break)", () => {
    expect(
      toCapabilityStatus({ id: "x", kind: "impaired", tags: ["degraded", "stale"], reasons: [] }),
    ).toBe("degraded");
    expect(
      toCapabilityStatus({ id: "x", kind: "impaired", tags: ["stale", "degraded"], reasons: [] }),
    ).toBe("degraded");
  });
  it("healthy -> healthy", () => {
    expect(toCapabilityStatus({ id: "x", kind: "healthy", reasons: [] })).toBe("healthy");
  });
});

// ---------------------------------------------------------------------------
// canActAsIf
// ---------------------------------------------------------------------------

describe("canActAsIf", () => {
  const composed = new Map<string, ComposedState>([
    ["healthy-node", { id: "healthy-node", kind: "healthy", reasons: [] }],
    ["impaired-node", { id: "impaired-node", kind: "impaired", tags: ["degraded"], reasons: [] }],
    ["unavailable-node", { id: "unavailable-node", kind: "unavailable", reasons: [] }],
    ["unknown-node", { id: "unknown-node", kind: "unknown", reasons: [] }],
    ["gated-node", { id: "gated-node", kind: "gated", intent: "proof_gated", reasons: [] }],
  ]);

  it("missing capability id -> false", () => {
    expect(canActAsIf("nope", "healthy", composed)).toBe(false);
  });

  it("unknown capability -> false regardless of atLeast", () => {
    expect(canActAsIf("unknown-node", "unavailable", composed)).toBe(false);
  });

  it("gated capability -> false regardless of atLeast", () => {
    expect(canActAsIf("gated-node", "unavailable", composed)).toBe(false);
  });

  it("healthy node satisfies atLeast=healthy/degraded/stale/unavailable", () => {
    (["healthy", "degraded", "stale", "unavailable"] as Severity[]).forEach((atLeast) => {
      expect(canActAsIf("healthy-node", atLeast, composed)).toBe(true);
    });
  });

  it("impaired node fails atLeast=healthy but passes atLeast=degraded/stale/unavailable", () => {
    expect(canActAsIf("impaired-node", "healthy", composed)).toBe(false);
    expect(canActAsIf("impaired-node", "degraded", composed)).toBe(true);
    expect(canActAsIf("impaired-node", "stale", composed)).toBe(true);
    expect(canActAsIf("impaired-node", "unavailable", composed)).toBe(true);
  });

  it("unavailable node fails atLeast=healthy/degraded/stale but passes atLeast=unavailable", () => {
    expect(canActAsIf("unavailable-node", "healthy", composed)).toBe(false);
    expect(canActAsIf("unavailable-node", "degraded", composed)).toBe(false);
    expect(canActAsIf("unavailable-node", "stale", composed)).toBe(false);
    expect(canActAsIf("unavailable-node", "unavailable", composed)).toBe(true);
  });

  it("SEVERITY_RANK degraded and stale share rank 1", () => {
    expect(SEVERITY_RANK.degraded).toBe(SEVERITY_RANK.stale);
  });
});

// ---------------------------------------------------------------------------
// Monotonicity property test — worsening any single input never improves any
// composed output. Exhaustive over a small fixed graph + a seeded evidence
// enumeration (no randomness).
// ---------------------------------------------------------------------------

describe("monotonicity", () => {
  // a (root) -> b (hard on a), c (soft on a), d (hard on b, hard on c)
  function graphWithAState(aOverride: Partial<OwnEvidence>): CapabilityNode[] {
    return [
      node("a", { evidence: evidence(aOverride) }),
      node("b", { deps: [{ id: "a", kind: "hard" }] }),
      node("c", { deps: [{ id: "a", kind: "soft" }] }),
      node("d", { deps: [{ id: "b", kind: "hard" }, { id: "c", kind: "hard" }] }),
    ];
  }

  function outcomeRank(s: ComposedState | undefined): number {
    if (!s) return 4;
    switch (s.kind) {
      case "healthy":
        return 0;
      case "impaired":
        return 1;
      case "gated":
        return 2;
      case "unknown":
        return 3;
      case "unavailable":
        return 4;
    }
  }

  // Ordered from best to worst; each transition must never rank-decrease any
  // downstream composed node.
  const transitions: { name: string; evidenceOverride: Partial<OwnEvidence> }[] = [
    { name: "healthy", evidenceOverride: {} },
    { name: "impaired", evidenceOverride: { severityTags: ["degraded"] } },
    { name: "unavailable", evidenceOverride: { unavailable: true } },
  ];

  it("worsening node a from healthy -> impaired -> unavailable never improves b, c, or d", () => {
    const results = transitions.map((t) => composeGraph(graphWithAState(t.evidenceOverride), NOW));
    for (let i = 1; i < results.length; i++) {
      for (const id of ["a", "b", "c", "d"]) {
        const prevRank = outcomeRank(results[i - 1]!.get(id));
        const currRank = outcomeRank(results[i]!.get(id));
        expect(currRank).toBeGreaterThanOrEqual(prevRank);
      }
    }
  });

  it("worsening node a from healthy -> unknown never improves b, c, or d", () => {
    const healthyResult = composeGraph(graphWithAState({}), NOW);
    const unknownResult = composeGraph(graphWithAState({ observedAt: null }), NOW);
    for (const id of ["a", "b", "c", "d"]) {
      expect(outcomeRank(unknownResult.get(id))).toBeGreaterThanOrEqual(outcomeRank(healthyResult.get(id)));
    }
  });

  it("worsening node a from healthy -> gated never improves b, c, or d", () => {
    const healthyResult = composeGraph(graphWithAState({}), NOW);
    const gatedResult = composeGraph(graphWithAState({ intent: "owner_gated" }), NOW);
    for (const id of ["a", "b", "c", "d"]) {
      expect(outcomeRank(gatedResult.get(id))).toBeGreaterThanOrEqual(outcomeRank(healthyResult.get(id)));
    }
  });
});
