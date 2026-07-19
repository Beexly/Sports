import { describe, it, expect } from "vitest";
import { decayEvidence, composeOne, toCapabilityStatus, type CapabilityStatus } from "../axes.js";
import {
  op003ToOwnEvidence,
  type CapabilityStatusWire,
  type Op003CapabilityAtom,
} from "../adapt-op003.js";

const NOW = new Date("2026-07-19T12:00:00.000Z");

const ALL_WIRE_VALUES: readonly CapabilityStatusWire[] = [
  "healthy",
  "degraded",
  "stale",
  "unavailable",
  "proof_gated",
  "owner_gated",
  "unknown",
];

/** Full compose pipeline for a dependency-free node: decay -> composeOne(no deps) -> project. */
function roundTrip(atom: Op003CapabilityAtom, now: Date): CapabilityStatus {
  const evidence = op003ToOwnEvidence(atom);
  const own = decayEvidence(evidence, now);
  const composed = composeOne("cap:test", own, []);
  return toCapabilityStatus(composed);
}

describe("op003ToOwnEvidence — round-trip law (exhaustive over all 7 wire values)", () => {
  for (const status of ALL_WIRE_VALUES) {
    it(`toCapabilityStatus(compose(op003ToOwnEvidence(${status}))) on a dependency-free node returns ${status}`, () => {
      const atom: Op003CapabilityAtom = {
        status,
        reason: `test_reason_${status}`,
        evidence: "probe",
        observedAt: NOW,
      };
      expect(roundTrip(atom, NOW)).toBe(status);
    });
  }

  it("round-trips even with no reason/evidence supplied", () => {
    for (const status of ALL_WIRE_VALUES) {
      const atom: Op003CapabilityAtom = { status, observedAt: NOW };
      expect(roundTrip(atom, NOW)).toBe(status);
    }
  });

  it("round-trips with the timestamp supplied as an ISO string (the wire form)", () => {
    for (const status of ALL_WIRE_VALUES) {
      const atom: Op003CapabilityAtom = { status, observedAt: NOW.toISOString() };
      expect(roundTrip(atom, NOW)).toBe(status);
    }
  });
});

describe("op003ToOwnEvidence — observedAt coercion (Date | string | null | omitted)", () => {
  it("a valid ISO string coerces to the equivalent Date", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: NOW.toISOString() });
    expect(evidence.observedAt).toEqual(NOW);
  });

  it("a Date passes through unchanged", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: NOW });
    expect(evidence.observedAt).toEqual(NOW);
  });

  it("null maps to observedAt: null (evidence-missing — composes unknown)", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: null });
    expect(evidence.observedAt).toBeNull();
    expect(decayEvidence(evidence, NOW).kind).toBe("unknown");
  });

  it("an omitted observedAt behaves like null", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy" });
    expect(evidence.observedAt).toBeNull();
  });

  it("a garbage string is treated as NO evidence — null, never a fabricated timestamp", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: "not-a-timestamp" });
    expect(evidence.observedAt).toBeNull();
    expect(decayEvidence(evidence, NOW).kind).toBe("unknown");
  });

  it("an Invalid Date object also collapses to null", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: new Date("garbage") });
    expect(evidence.observedAt).toBeNull();
  });
});

describe("op003ToOwnEvidence — per-status mapping detail", () => {
  it('"healthy" maps to open intent, no severity tags, not unavailable', () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: NOW });
    expect(evidence).toMatchObject({
      observedAt: NOW,
      intent: "open",
      severityTags: [],
      unavailable: false,
    });
  });

  it('"degraded" maps to severityTags: ["degraded"]', () => {
    const evidence = op003ToOwnEvidence({ status: "degraded", observedAt: NOW });
    expect(evidence.severityTags).toEqual(["degraded"]);
    expect(evidence.intent).toBe("open");
  });

  it('"stale" maps to severityTags: ["stale"] — never bundled with "degraded"', () => {
    const evidence = op003ToOwnEvidence({ status: "stale", observedAt: NOW });
    expect(evidence.severityTags).toEqual(["stale"]);
  });

  it('"unavailable" maps to unavailable: true, open intent', () => {
    const evidence = op003ToOwnEvidence({ status: "unavailable", observedAt: NOW });
    expect(evidence.unavailable).toBe(true);
    expect(evidence.intent).toBe("open");
  });

  it('"proof_gated" maps to intent: "proof_gated"', () => {
    const evidence = op003ToOwnEvidence({
      status: "proof_gated",
      observedAt: NOW,
      reason: "awaiting_proof",
    });
    expect(evidence.intent).toBe("proof_gated");
    expect(evidence.reasons).toContain("awaiting_proof");
  });

  it('"owner_gated" maps to intent: "owner_gated"', () => {
    const evidence = op003ToOwnEvidence({
      status: "owner_gated",
      observedAt: NOW,
      reason: "flag_off",
    });
    expect(evidence.intent).toBe("owner_gated");
    expect(evidence.reasons).toContain("flag_off");
  });

  it('"unknown" forces observedAt to null regardless of the supplied observedAt (evidence-missing semantics)', () => {
    const evidence = op003ToOwnEvidence({ status: "unknown", observedAt: NOW });
    expect(evidence.observedAt).toBeNull();
  });

  it("the optional atom capabilityId is pass-through only — it does not affect the mapping", () => {
    const withId = op003ToOwnEvidence({ capabilityId: "db:primary", status: "degraded", observedAt: NOW });
    const withoutId = op003ToOwnEvidence({ status: "degraded", observedAt: NOW });
    expect(withId).toEqual(withoutId);
  });

  it("evidence and reason both propagate into OwnEvidence.reasons as provenance", () => {
    const evidence = op003ToOwnEvidence({
      status: "degraded",
      observedAt: NOW,
      evidence: "counter",
      reason: "elevated_p99",
    });
    expect(evidence.reasons).toEqual(["evidence_kind:counter", "elevated_p99"]);
  });

  it("gated values carry intent + provenance reason through decay/composition", () => {
    const evidence = op003ToOwnEvidence({
      status: "proof_gated",
      observedAt: NOW,
      reason: "slate_not_committed",
    });
    const own = decayEvidence(evidence, NOW);
    expect(own.kind).toBe("gated");
    if (own.kind === "gated") {
      expect(own.intent).toBe("proof_gated");
      expect(own.reasons).toContain("slate_not_committed");
    }
  });

  it("a custom freshnessHorizonMs is honored by downstream decay", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: NOW }, 1000);
    expect(evidence.freshnessHorizonMs).toBe(1000);
    const expired = decayEvidence(evidence, new Date(NOW.getTime() + 2000));
    expect(expired.kind).toBe("unknown");
  });

  it("the default freshness horizon is exactly 5 minutes (300000 ms) — pinned against silent drift from the seed registry's default", () => {
    const evidence = op003ToOwnEvidence({ status: "healthy", observedAt: NOW });
    expect(evidence.freshnessHorizonMs).toBe(5 * 60 * 1000);
  });

  it("an out-of-vocabulary wire status composes honest unknown with an unrecognized_status reason — never undefined, never a crash", () => {
    // Wire payloads are cast past the type system at real boundaries; if the
    // hand-synced apps/web enum ever gains a value this package lacks, the
    // atom must degrade to unknown, not crash downstream.
    const rogue = {
      status: "maintenance" as unknown as CapabilityStatusWire,
      reason: "planned window",
      observedAt: NOW,
    };
    const evidence = op003ToOwnEvidence(rogue);
    expect(evidence.observedAt).toBeNull();
    expect(evidence.reasons).toContain("unrecognized_status:maintenance");
    expect(evidence.reasons).toContain("planned window");
    const own = decayEvidence(evidence, NOW);
    expect(own.kind).toBe("unknown");
    expect(toCapabilityStatus(composeOne("cap:test", own, []))).toBe("unknown");
  });

  it("PINNED: a non-unknown atom WITHOUT a timestamp composes unknown, not its wire status (no timestamp = no evidence; producers must stamp the read time)", () => {
    for (const status of ["proof_gated", "owner_gated", "unavailable", "degraded", "stale", "healthy"] as const) {
      const evidence = op003ToOwnEvidence({ status });
      expect(evidence.observedAt).toBeNull();
      const own = decayEvidence(evidence, NOW);
      expect(own.kind).toBe("unknown");
    }
  });

  it("an OP-003 CapabilityState-shaped value passes straight in with ZERO silent field loss", () => {
    // Mirrors apps/web/lib/health/capability-state.ts's CapabilityState
    // exactly: {capabilityId, status, reason, observedAt: ISO string,
    // evidence}. Every field must land: evidence -> provenance reason,
    // reason -> reason, observedAt string -> coerced Date. If the atom's
    // field names ever drift from the wire shape again, this test is the
    // tripwire (structural typing would otherwise drop mismatched optional
    // fields without any compile error).
    const wireShaped = {
      capabilityId: "db:primary",
      status: "degraded",
      reason: "elevated latency",
      observedAt: NOW.toISOString(),
      evidence: "probe",
    } as const;
    const result = op003ToOwnEvidence(wireShaped);
    expect(result.observedAt).toEqual(NOW);
    expect(result.severityTags).toEqual(["degraded"]);
    expect(result.reasons).toEqual(["evidence_kind:probe", "elevated latency"]);
  });
});
