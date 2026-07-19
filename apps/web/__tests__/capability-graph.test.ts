import { afterEach, describe, expect, it, vi } from "vitest";
import {
  composeCapabilityGraph,
  projectCapabilityGraph,
  graphCanActAsIf,
} from "@/lib/health/capability-graph";
import type { CapabilityState } from "@/lib/health/capability-state";

/**
 * apps/web-side wiring of @sports/epistemic-twin (P2). The composition law
 * itself is pinned exhaustively in packages/epistemic-twin's own test suite
 * — these tests are about THIS module's responsibility: mapping the health
 * route's 4 OP-003 leaf atoms + the 2 real founder gate env vars onto the
 * frozen seed registry correctly, and projecting the result back to the wire
 * form. No composition-law re-litigation here.
 */

const NOW = new Date("2026-07-19T12:00:00Z");

function atom(capabilityId: string, status: CapabilityState["status"], observedAt = NOW): CapabilityState {
  return {
    capabilityId,
    status,
    reason: `test:${capabilityId}`,
    observedAt: observedAt.toISOString(),
    evidence: status === "unknown" ? "none" : "probe",
  };
}

const ALL_HEALTHY_ATOMS: CapabilityState[] = [
  atom("database", "healthy"),
  atom("ingestion", "healthy"),
  atom("settlement", "healthy"),
  atom("nflverse-reports", "healthy"),
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("composeCapabilityGraph — gate wiring", () => {
  it("gate nodes compose 'gated' (owner_gated) when the real env var is unset — default-off honesty", () => {
    delete process.env["SEALED_ENGINE_ENABLED"];
    delete process.env["PUBLISH_LEDGER"];

    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);
    const sealed = graph.composed.get("gate:SEALED_ENGINE_ENABLED");
    const publish = graph.composed.get("gate:PUBLISH_LEDGER");

    expect(sealed?.kind).toBe("gated");
    expect(sealed?.kind === "gated" && sealed.intent).toBe("owner_gated");
    expect(publish?.kind).toBe("gated");
  });

  it("a closed gate propagates as 'gated' to its hard-dependent nodes, not 'unavailable'", () => {
    delete process.env["SEALED_ENGINE_ENABLED"];
    delete process.env["PUBLISH_LEDGER"];

    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);

    // engine:settlement hard-deps on gate:SEALED_ENGINE_ENABLED.
    expect(graph.composed.get("engine:settlement")?.kind).toBe("gated");
    // proof:slate-commitment hard-deps on engine:settlement AND gate:PUBLISH_LEDGER —
    // transitively gated, never misreported as a real outage.
    expect(graph.composed.get("proof:slate-commitment")?.kind).toBe("gated");
  });

  it("gate nodes compose 'healthy' (open) when the real env var is exactly \"true\"", () => {
    vi.stubEnv("SEALED_ENGINE_ENABLED", "true");
    vi.stubEnv("PUBLISH_LEDGER", "true");

    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);

    expect(graph.composed.get("gate:SEALED_ENGINE_ENABLED")?.kind).toBe("healthy");
    expect(graph.composed.get("gate:PUBLISH_LEDGER")?.kind).toBe("healthy");
    expect(graph.composed.get("engine:settlement")?.kind).toBe("healthy");
  });
});

describe("composeCapabilityGraph — the exact production incident this contract exists to prevent", () => {
  it("source:nflverse unavailable propagates to route:/nflverse as unavailable", () => {
    const atoms = [
      atom("database", "healthy"),
      atom("ingestion", "healthy"),
      atom("settlement", "healthy"),
      atom("nflverse-reports", "unavailable"),
    ];
    const graph = composeCapabilityGraph(atoms, NOW);

    expect(graph.composed.get("source:nflverse")?.kind).toBe("unavailable");
    expect(graph.composed.get("route:/nflverse")?.kind).toBe("unavailable");
  });

  it("blast-radius honesty: source:nflverse unavailable does NOT take down revenue:checkout", () => {
    vi.stubEnv("SEALED_ENGINE_ENABLED", "true");
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const atoms = [
      atom("database", "healthy"),
      atom("ingestion", "healthy"),
      atom("settlement", "healthy"),
      atom("nflverse-reports", "unavailable"),
    ];
    const graph = composeCapabilityGraph(atoms, NOW);

    // route:/checkout has no direct probe, so it's honestly "unknown" — but
    // NOT "unavailable". The load-bearing assertion is that nflverse's
    // outage never taints it via a fabricated dependency edge.
    expect(graph.composed.get("route:/checkout")?.kind).not.toBe("unavailable");
    expect(graph.composed.get("revenue:checkout")?.kind).not.toBe("unavailable");
  });

  it("database unavailable propagates to ingestion, engine:settlement, and revenue:checkout (real hard deps)", () => {
    const atoms = [
      atom("database", "unavailable"),
      atom("ingestion", "healthy"),
      atom("settlement", "healthy"),
      atom("nflverse-reports", "healthy"),
    ];
    const graph = composeCapabilityGraph(atoms, NOW);

    expect(graph.composed.get("db:primary")?.kind).toBe("unavailable");
    // route:/checkout hard-deps db:primary directly.
    expect(graph.composed.get("route:/checkout")?.kind).toBe("unavailable");
    expect(graph.composed.get("revenue:checkout")?.kind).toBe("unavailable");
  });
});

describe("composeCapabilityGraph — absence of coverage is not green", () => {
  it("nodes with no direct probe (routes, reports) compose 'unknown' when nothing overrides them, never a fabricated 'healthy'", () => {
    vi.stubEnv("SEALED_ENGINE_ENABLED", "true");
    vi.stubEnv("PUBLISH_LEDGER", "true");
    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);

    // route:/home, route:/picks, route:/checkout, revenue:checkout, the 3
    // nflverse reports, and proof:slate-commitment have no matching OP-003
    // atom in ALL_HEALTHY_ATOMS. Per the composition law, a node's own
    // "unknown" (no evidence) wins over healthy dependency state (rule 3
    // fires before rule 4/5) — this module must not silently fabricate
    // healthy status for uncovered nodes.
    for (const id of [
      "route:/home",
      "route:/picks",
      "route:/checkout",
      "revenue:checkout",
      "report:nflverse-pbp",
      "report:nflverse-ngs",
      "report:nflverse-ftn",
    ]) {
      expect(graph.composed.get(id)?.kind).toBe("unknown");
    }
  });
});

describe("projectCapabilityGraph", () => {
  it("projects all 15 seed nodes to the OP-003 wire enum with reasons", () => {
    delete process.env["SEALED_ENGINE_ENABLED"];
    delete process.env["PUBLISH_LEDGER"];
    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);
    const projected = projectCapabilityGraph(graph);

    expect(projected).toHaveLength(15);
    const dbEntry = projected.find((e) => e.capabilityId === "db:primary");
    expect(dbEntry?.status).toBe("healthy");
    expect(Array.isArray(dbEntry?.reasons)).toBe(true);

    const gateEntry = projected.find((e) => e.capabilityId === "gate:SEALED_ENGINE_ENABLED");
    expect(gateEntry?.status).toBe("owner_gated");
  });
});

describe("graphCanActAsIf", () => {
  it("returns true when a healthy capability meets the requested floor", () => {
    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);
    expect(graphCanActAsIf("db:primary", "degraded", graph)).toBe(true);
    expect(graphCanActAsIf("db:primary", "healthy", graph)).toBe(true);
  });

  it("returns false for an unavailable capability against a healthy-only floor, true against a loose floor", () => {
    // `atLeast` is the worst state the caller will tolerate, not a minimum
    // requirement — "unavailable" IS the worst rank, so tolerating down to
    // unavailable trivially accepts anything. The meaningful floor is
    // "healthy": an unavailable capability must fail that one.
    const atoms = [
      atom("database", "unavailable"),
      atom("ingestion", "healthy"),
      atom("settlement", "healthy"),
      atom("nflverse-reports", "healthy"),
    ];
    const graph = composeCapabilityGraph(atoms, NOW);
    expect(graphCanActAsIf("db:primary", "healthy", graph)).toBe(false);
    expect(graphCanActAsIf("db:primary", "unavailable", graph)).toBe(true);
  });

  it("returns false for a gated capability — acting through a gate would violate it, not merely risk an outage", () => {
    delete process.env["SEALED_ENGINE_ENABLED"];
    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);
    expect(graphCanActAsIf("gate:SEALED_ENGINE_ENABLED", "unavailable", graph)).toBe(false);
  });

  it("returns false for an unknown (uncovered) capability — no evidence is not permission to act", () => {
    const graph = composeCapabilityGraph(ALL_HEALTHY_ATOMS, NOW);
    expect(graphCanActAsIf("route:/home", "unavailable", graph)).toBe(false);
  });
});
