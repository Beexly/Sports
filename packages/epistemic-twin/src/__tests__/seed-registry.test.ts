import { describe, it, expect } from "vitest";
import { composeGraph, toCapabilityStatus } from "../axes.js";
import { buildSeedRegistry, SEED_CAPABILITY_IDS } from "../seed-registry.js";
import type { CapabilityNode } from "../axes.js";

const NOW = new Date("2026-07-19T12:00:00.000Z");

describe("seed registry", () => {
  it("has exactly the documented ~15 nodes, one per SEED_CAPABILITY_IDS entry", () => {
    const nodes = buildSeedRegistry(NOW);
    expect(nodes).toHaveLength(SEED_CAPABILITY_IDS.length);
    expect(nodes.length).toBeGreaterThanOrEqual(15);
    const ids = new Set(nodes.map((n) => n.id));
    for (const id of SEED_CAPABILITY_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("every dependency edge id refers to a node that exists in the registry", () => {
    const nodes = buildSeedRegistry(NOW);
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) {
      for (const dep of n.deps) {
        expect(ids.has(dep.id)).toBe(true);
      }
    }
  });

  it("composes without error on an all-healthy evidence set, every node healthy", () => {
    const nodes = buildSeedRegistry(NOW);
    const result = composeGraph(nodes, NOW);
    for (const id of SEED_CAPABILITY_IDS) {
      const composed = result.get(id);
      expect(composed).toBeDefined();
      expect(composed?.kind).toBe("healthy");
      expect(toCapabilityStatus(composed!)).toBe("healthy");
    }
  });

  it("flipping source:nflverse to unavailable makes route:/nflverse unavailable but leaves checkout/revenue healthy (blast-radius honesty)", () => {
    const nodes = buildSeedRegistry(NOW).map((n): CapabilityNode => {
      if (n.id === "source:nflverse") {
        return {
          ...n,
          evidence: { ...n.evidence, unavailable: true, reasons: ["oom_500"] },
        };
      }
      return n;
    });

    const result = composeGraph(nodes, NOW);

    expect(result.get("source:nflverse")?.kind).toBe("unavailable");
    expect(result.get("route:/nflverse")?.kind).toBe("unavailable");

    // Blast radius stays honest: revenue path is untouched.
    expect(result.get("route:/checkout")?.kind).toBe("healthy");
    expect(result.get("revenue:checkout")?.kind).toBe("healthy");
    expect(result.get("db:primary")?.kind).toBe("healthy");

    // Soft-dependent nodes degrade (capped at one notch), never disable.
    expect(result.get("report:nflverse-pbp")?.kind).toBe("impaired");
    expect(result.get("report:nflverse-ngs")?.kind).toBe("impaired");
    expect(result.get("report:nflverse-ftn")?.kind).toBe("impaired");
    expect(result.get("route:/home")?.kind).toBe("impaired");
    expect(result.get("route:/picks")?.kind).toBe("impaired");

    // Gates have no path to nflverse at all — untouched.
    expect(result.get("gate:PUBLISH_LEDGER")?.kind).toBe("healthy");
    expect(result.get("gate:SEALED_ENGINE_ENABLED")?.kind).toBe("healthy");

    // ingestion soft-depends on source:nflverse -> capped at one notch
    // (impaired). engine:settlement and proof:slate-commitment hard-depend
    // (transitively) on ingestion, so an impaired hard dep propagates as
    // impaired too — this is honest: settlement/proof are less trustworthy
    // when their upstream ingestion is running degraded, but they are never
    // falsely reported unavailable/gated/unknown just because a *soft*
    // upstream (nflverse) went down two hops away.
    expect(result.get("ingestion")?.kind).toBe("impaired");
    expect(result.get("engine:settlement")?.kind).toBe("impaired");
    expect(result.get("proof:slate-commitment")?.kind).toBe("impaired");
  });

  it("flipping gate:SEALED_ENGINE_ENABLED to owner_gated propagates gated (not unavailable) through engine:settlement to proof:slate-commitment", () => {
    const nodes = buildSeedRegistry(NOW).map((n): CapabilityNode => {
      if (n.id === "gate:SEALED_ENGINE_ENABLED") {
        return { ...n, evidence: { ...n.evidence, intent: "owner_gated" } };
      }
      return n;
    });

    const result = composeGraph(nodes, NOW);

    expect(result.get("gate:SEALED_ENGINE_ENABLED")?.kind).toBe("gated");
    expect(result.get("engine:settlement")?.kind).toBe("gated");
    expect(result.get("proof:slate-commitment")?.kind).toBe("gated");
    expect(toCapabilityStatus(result.get("engine:settlement")!)).toBe("owner_gated");

    // Revenue/checkout/home/picks are unaffected by this gate.
    expect(result.get("revenue:checkout")?.kind).toBe("healthy");
    expect(result.get("route:/checkout")?.kind).toBe("healthy");
  });

  it("flipping db:primary to unavailable is the widest blast radius (nearly everything hard-depends on it)", () => {
    const nodes = buildSeedRegistry(NOW).map((n): CapabilityNode => {
      if (n.id === "db:primary") {
        return { ...n, evidence: { ...n.evidence, unavailable: true } };
      }
      return n;
    });

    const result = composeGraph(nodes, NOW);
    expect(result.get("db:primary")?.kind).toBe("unavailable");
    expect(result.get("route:/checkout")?.kind).toBe("unavailable");
    expect(result.get("revenue:checkout")?.kind).toBe("unavailable");
    expect(result.get("route:/home")?.kind).toBe("unavailable");
    expect(result.get("route:/picks")?.kind).toBe("unavailable");
    expect(result.get("ingestion")?.kind).toBe("unavailable");
    expect(result.get("engine:settlement")?.kind).toBe("unavailable");
    expect(result.get("proof:slate-commitment")?.kind).toBe("unavailable");

    // source:nflverse itself has no dependency on db:primary — stays healthy.
    expect(result.get("source:nflverse")?.kind).toBe("healthy");
    expect(result.get("route:/nflverse")?.kind).toBe("healthy");
  });
});
