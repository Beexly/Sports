import { describe, expect, it } from "vitest";
import type { SystemEntry } from "@/lib/platform/integrity-ledger";
import { lifecycleStageOf, rollupLifecycle } from "@/lib/platform/lifecycle-rollup";

/** Mirror of the integrity-ledger test helper — a built+wired baseline entry. */
function entry(overrides: Partial<SystemEntry> = {}): SystemEntry {
  return {
    id: "x",
    name: "X",
    category: "model",
    builtStatus: "YES",
    wiredStatus: "YES",
    provenStatus: "NO",
    publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: [],
    lastVerifiedAt: null,
    failureMode: "—",
    nextAction: "—",
    ...overrides,
  };
}

describe("lifecycleStageOf — monotonic ladder, no inflation", () => {
  it("not built => null (pre-draft)", () => {
    expect(lifecycleStageOf(entry({ builtStatus: "NO", wiredStatus: "NO" }))).toBeNull();
    expect(lifecycleStageOf(entry({ builtStatus: "PARTIAL", wiredStatus: "NO" }))).toBeNull();
  });

  it("built only => Draft", () => {
    expect(lifecycleStageOf(entry({ wiredStatus: "NO" }))).toBe("Draft");
    expect(lifecycleStageOf(entry({ wiredStatus: "PARTIAL" }))).toBe("Draft");
  });

  it("+wired (public-safe NO) => Verified", () => {
    expect(lifecycleStageOf(entry({ publicSafeStatus: "NO" }))).toBe("Verified");
  });

  it("+public-safe PARTIAL => Priced", () => {
    expect(lifecycleStageOf(entry({ publicSafeStatus: "PARTIAL" }))).toBe("Priced");
  });

  it("+public-safe YES but an owner gate is set => still Priced (not actually live)", () => {
    expect(
      lifecycleStageOf(entry({ publicSafeStatus: "YES", ownerGate: "gated behind owner approval" }))
    ).toBe("Priced");
  });

  it("+public-safe YES, no gate, not proven => Published", () => {
    expect(
      lifecycleStageOf(entry({ publicSafeStatus: "YES", ownerGate: null, provenStatus: "NO" }))
    ).toBe("Published");
    // an empty/whitespace gate counts as no gate
    expect(
      lifecycleStageOf(entry({ publicSafeStatus: "YES", ownerGate: "   ", provenStatus: "NO" }))
    ).toBe("Published");
  });

  it("+proven => Proven (only when all the way through)", () => {
    expect(
      lifecycleStageOf(entry({ publicSafeStatus: "YES", ownerGate: null, provenStatus: "YES" }))
    ).toBe("Proven");
  });
});

describe("rollupLifecycle — counts, pre-draft, total, dominant", () => {
  it("aggregates a mixed array at each system's furthest earned stage", () => {
    const systems: SystemEntry[] = [
      entry({ id: "pre1", builtStatus: "NO", wiredStatus: "NO" }), // pre-draft
      entry({ id: "pre2", builtStatus: "NO", wiredStatus: "NO" }), // pre-draft
      entry({ id: "d1", wiredStatus: "NO" }), // Draft
      entry({ id: "v1" }), // Verified (public-safe NO)
      entry({ id: "v2" }), // Verified
      entry({ id: "v3" }), // Verified
      entry({ id: "p1", publicSafeStatus: "PARTIAL" }), // Priced
      entry({ id: "pub1", publicSafeStatus: "YES", ownerGate: null }), // Published
      entry({ id: "prov1", publicSafeStatus: "YES", ownerGate: null, provenStatus: "YES" }), // Proven
    ];

    const r = rollupLifecycle(systems);

    expect(r.total).toBe(9);
    expect(r.preDraft).toBe(2);
    expect(r.counts).toEqual({
      Draft: 1,
      Verified: 3,
      Priced: 1,
      Published: 1,
      Proven: 1,
    });
    // dominant is the stage with the max earned count (Verified = 3)
    expect(r.dominant).toBe("Verified");
  });

  it("reports no dominant stage when nothing is drafted", () => {
    const r = rollupLifecycle([
      entry({ builtStatus: "NO", wiredStatus: "NO" }),
      entry({ builtStatus: "NO", wiredStatus: "NO" }),
    ]);
    expect(r.dominant).toBeNull();
    expect(r.preDraft).toBe(2);
    expect(r.total).toBe(2);
    expect(r.counts).toEqual({ Draft: 0, Verified: 0, Priced: 0, Published: 0, Proven: 0 });
  });
});
