import { describe, it, expect } from "vitest";
import {
  INTEGRITY_LEDGER,
  auditLedger,
  isPublicSafeAllowed,
  ledgerByCategory,
  type SystemEntry,
} from "@/lib/platform/integrity-ledger";

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

describe("integrity ledger — public-safe rule", () => {
  it("forbids PUBLIC_SAFE when not proven and no owner gate (no fake green)", () => {
    const e = entry({ publicSafeStatus: "YES", provenStatus: "NO", ownerGate: null });
    expect(isPublicSafeAllowed(e)).toBe(false);
    expect(auditLedger([e])).toHaveLength(1);
  });

  it("allows PUBLIC_SAFE when proven", () => {
    const e = entry({ publicSafeStatus: "YES", provenStatus: "YES", ownerGate: null });
    expect(isPublicSafeAllowed(e)).toBe(true);
    expect(auditLedger([e])).toHaveLength(0);
  });

  it("allows PUBLIC_SAFE when an explicit owner gate explains a staged/manual posture", () => {
    const e = entry({ publicSafeStatus: "YES", provenStatus: "NO", ownerGate: "gated behind owner approval" });
    expect(isPublicSafeAllowed(e)).toBe(true);
    expect(auditLedger([e])).toHaveLength(0);
  });

  it("treats an empty owner gate as no gate", () => {
    const e = entry({ publicSafeStatus: "YES", provenStatus: "NO", ownerGate: "   " });
    expect(isPublicSafeAllowed(e)).toBe(false);
  });

  it("the REAL ledger obeys its own public-safe rule (populated honestly)", () => {
    expect(auditLedger()).toEqual([]);
  });

  it("never marks a not-proven system PROVEN without evidence/verification", () => {
    for (const e of INTEGRITY_LEDGER) {
      if (e.provenStatus === "YES") {
        // A proven system must carry evidence refs and a verification date.
        expect(e.evidenceRefs.length, e.id).toBeGreaterThan(0);
        expect(e.lastVerifiedAt, e.id).not.toBeNull();
      }
    }
  });

  it("groups systems across all populated categories", () => {
    const groups = ledgerByCategory();
    expect(groups.length).toBeGreaterThanOrEqual(12);
    const total = groups.reduce((n, g) => n + g.systems.length, 0);
    expect(total).toBe(INTEGRITY_LEDGER.length);
  });
});
