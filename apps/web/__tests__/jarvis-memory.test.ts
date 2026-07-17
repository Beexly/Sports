/**
 * Jarvis Memory Protocol — pure-logic tests
 *
 * NO live DB. All tests exercise the state machine, guards, conflict detector,
 * health formula, and the module surface (actions shape + cockpit page import).
 *
 * Source pin: apps/web/app/cockpit/page.tsx calls buildLiveMemoryStatus() —
 * the test below verifies that export is present and is async.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── State machine ────────────────────────────────────────────────────────────

import {
  ALL_MEMORY_STATES,
  canTransition,
  isTerminalState,
  ALLOWED_TRANSITIONS,
  type MemoryState,
} from "@/lib/jarvis/memory/states";

// ─── Guards ───────────────────────────────────────────────────────────────────

import {
  requiresOwnerApproval,
  assertConfirmationAllowed,
  assertCandidateOnly,
  SENSITIVE_SENSITIVITY_LEVELS,
  APPROVAL_REQUIRED_TYPES,
} from "@/lib/jarvis/memory/guards";

// ─── Errors ───────────────────────────────────────────────────────────────────

import {
  MemoryStoreUnavailableError,
  MemoryTransitionError,
  MemoryGuardError,
} from "@/lib/jarvis/memory/errors";

// ─── Conflict detection ───────────────────────────────────────────────────────

import { detectConflict, type MemoryForConflict } from "@/lib/jarvis/memory/conflict";

// ─── Intelligence state ───────────────────────────────────────────────────────

import {
  buildMemoryStatus,
  buildLiveMemoryStatus,
} from "@/lib/jarvis/intelligence-state";

// ─── Spec: all 8 states ───────────────────────────────────────────────────────

describe("memory state spec", () => {
  it("ALL_MEMORY_STATES contains exactly the 8 spec states", () => {
    const expected: MemoryState[] = [
      "candidate",
      "confirmed",
      "repeated_pattern",
      "conflicted",
      "stale",
      "superseded",
      "rejected",
      "expired",
    ];
    expect([...ALL_MEMORY_STATES].sort()).toEqual([...expected].sort());
    expect(ALL_MEMORY_STATES.length).toBe(8);
  });

  it("every state in ALL_MEMORY_STATES has a transition map entry", () => {
    for (const state of ALL_MEMORY_STATES) {
      expect(ALLOWED_TRANSITIONS.has(state), `missing map for ${state}`).toBe(true);
    }
  });
});

// ─── Spec: transition law ─────────────────────────────────────────────────────

describe("transition law", () => {
  it("rejected is terminal — no transitions allowed from it", () => {
    expect(isTerminalState("rejected")).toBe(true);
    expect(canTransition("rejected", "confirmed")).toBe(false);
    expect(canTransition("rejected", "candidate")).toBe(false);
    expect(canTransition("rejected", "expired")).toBe(false);
    for (const s of ALL_MEMORY_STATES) {
      expect(canTransition("rejected", s)).toBe(false);
    }
  });

  it("expired is terminal — no transitions allowed from it", () => {
    expect(isTerminalState("expired")).toBe(true);
    for (const s of ALL_MEMORY_STATES) {
      expect(canTransition("expired", s)).toBe(false);
    }
  });

  it("superseded is terminal", () => {
    expect(isTerminalState("superseded")).toBe(true);
    for (const s of ALL_MEMORY_STATES) {
      expect(canTransition("superseded", s)).toBe(false);
    }
  });

  it("candidate can transition to confirmed, rejected, or expired", () => {
    expect(canTransition("candidate", "confirmed")).toBe(true);
    expect(canTransition("candidate", "rejected")).toBe(true);
    expect(canTransition("candidate", "expired")).toBe(true);
  });

  it("candidate cannot skip to superseded or stale", () => {
    expect(canTransition("candidate", "superseded")).toBe(false);
    expect(canTransition("candidate", "stale")).toBe(false);
  });

  it("confirmed can reach superseded, stale, conflicted, expired", () => {
    expect(canTransition("confirmed", "superseded")).toBe(true);
    expect(canTransition("confirmed", "stale")).toBe(true);
    expect(canTransition("confirmed", "conflicted")).toBe(true);
    expect(canTransition("confirmed", "expired")).toBe(true);
  });

  it("conflicted can be resolved to confirmed, rejected, or expired — not silently overwritten", () => {
    expect(canTransition("conflicted", "confirmed")).toBe(true);
    expect(canTransition("conflicted", "rejected")).toBe(true);
    expect(canTransition("conflicted", "expired")).toBe(true);
    expect(canTransition("conflicted", "candidate")).toBe(false);
  });
});

// ─── Spec: sensitive category guard ──────────────────────────────────────────

describe("sensitive category guard", () => {
  const sensitiveTypes = [...APPROVAL_REQUIRED_TYPES];
  const sensitiveLevels = [...SENSITIVE_SENSITIVITY_LEVELS];

  it("public_claim_rule requires owner approval", () => {
    expect(
      requiresOwnerApproval({ memory_type: "public_claim_rule", sensitivity: "normal", owner_approval: false })
    ).toBe(true);
  });

  it("each sensitive sensitivity level requires owner approval", () => {
    for (const level of sensitiveLevels) {
      expect(
        requiresOwnerApproval({ memory_type: "episodic", sensitivity: level, owner_approval: false }),
        `sensitivity=${level} should require approval`
      ).toBe(true);
    }
  });

  it("normal episodic memory does NOT require owner approval", () => {
    expect(
      requiresOwnerApproval({ memory_type: "episodic", sensitivity: "normal", owner_approval: false })
    ).toBe(false);
  });

  it("assertConfirmationAllowed blocks sensitive memory without ownerApproval", () => {
    expect(() =>
      assertConfirmationAllowed(
        { memory_type: "public_claim_rule", sensitivity: "normal", owner_approval: false },
        "confirmed"
      )
    ).toThrow();
  });

  it("assertConfirmationAllowed passes sensitive memory WITH ownerApproval", () => {
    expect(() =>
      assertConfirmationAllowed(
        { memory_type: "public_claim_rule", sensitivity: "normal", owner_approval: true },
        "confirmed"
      )
    ).not.toThrow();
  });

  it("assertConfirmationAllowed is a no-op for non-confirmed transitions", () => {
    for (const type of sensitiveTypes) {
      expect(() =>
        assertConfirmationAllowed(
          { memory_type: type, sensitivity: "normal", owner_approval: false },
          "rejected"
        )
      ).not.toThrow();
    }
  });

  it("assertCandidateOnly throws for any non-candidate creation state", () => {
    const nonCandidates: MemoryState[] = ["confirmed", "rejected", "expired", "superseded", "stale", "conflicted"];
    for (const s of nonCandidates) {
      expect(() => assertCandidateOnly(s), `should throw for ${s}`).toThrow();
    }
  });

  it("assertCandidateOnly passes for candidate", () => {
    expect(() => assertCandidateOnly("candidate")).not.toThrow();
  });
});

// ─── Spec: supersession trail logic ──────────────────────────────────────────

describe("supersession trail logic (state machine layer)", () => {
  it("confirmed → superseded is an allowed transition", () => {
    expect(canTransition("confirmed", "superseded")).toBe(true);
  });

  it("repeated_pattern → superseded is allowed", () => {
    expect(canTransition("repeated_pattern", "superseded")).toBe(true);
  });

  it("superseded itself is terminal — trail does not allow further transitions", () => {
    expect(isTerminalState("superseded")).toBe(true);
  });

  it("rejected → superseded is NOT allowed — terminal states cannot be superseded", () => {
    expect(canTransition("rejected", "superseded")).toBe(false);
  });

  it("expired → superseded is NOT allowed", () => {
    expect(canTransition("expired", "superseded")).toBe(false);
  });
});

// ─── Spec: conservative conflict detection ────────────────────────────────────

describe("conservative conflict detection", () => {
  const confirmed: MemoryForConflict = {
    id: "mem-001",
    scope: "picks.gate",
    summary: "PUBLIC_PICKS_ENABLED was opened on 2026-05-01",
    memory_state: "confirmed",
  };

  it("detects conflict when new memory explicitly supersedes a confirmed one in same scope", () => {
    const newMemory: MemoryForConflict = {
      id: "mem-002",
      scope: "picks.gate",
      summary: "PUBLIC_PICKS_ENABLED was closed",
      memory_state: "candidate",
      supersedes_memory_id: "mem-001",
    };
    const conflicts = detectConflict(newMemory, [confirmed]);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]!.existingMemory.id).toBe("mem-001");
  });

  it("detects conflict when metadata.contradicts references confirmed memory id", () => {
    const newMemory: MemoryForConflict = {
      id: "mem-003",
      scope: "picks.gate",
      summary: "Gate policy reversed",
      memory_state: "candidate",
      metadata: { contradicts: "mem-001" },
    };
    const conflicts = detectConflict(newMemory, [confirmed]);
    expect(conflicts.length).toBe(1);
  });

  it("does NOT detect conflict across different scopes", () => {
    const newMemory: MemoryForConflict = {
      id: "mem-004",
      scope: "model.routing",  // different scope
      summary: "Model routing changed",
      memory_state: "candidate",
      supersedes_memory_id: "mem-001",
    };
    const conflicts = detectConflict(newMemory, [confirmed]);
    expect(conflicts.length).toBe(0);
  });

  it("does NOT flag conflict when no explicit supersedes or contradicts reference", () => {
    const newMemory: MemoryForConflict = {
      id: "mem-005",
      scope: "picks.gate",
      summary: "A different gate-related memory with no explicit link",
      memory_state: "candidate",
    };
    const conflicts = detectConflict(newMemory, [confirmed]);
    expect(conflicts.length).toBe(0);
  });

  it("does NOT flag conflict against rejected/expired memories (only confirmed/repeated_pattern)", () => {
    const rejected: MemoryForConflict = {
      id: "mem-006",
      scope: "picks.gate",
      summary: "Rejected memory",
      memory_state: "rejected",
    };
    const newMemory: MemoryForConflict = {
      id: "mem-007",
      scope: "picks.gate",
      summary: "New candidate",
      memory_state: "candidate",
      supersedes_memory_id: "mem-006",
    };
    const conflicts = detectConflict(newMemory, [rejected]);
    expect(conflicts.length).toBe(0);
  });

  it("supports metadata.contradicts as an array of ids", () => {
    const mem2: MemoryForConflict = {
      id: "mem-008",
      scope: "picks.gate",
      summary: "Another confirmed",
      memory_state: "confirmed",
    };
    const newMemory: MemoryForConflict = {
      id: "mem-009",
      scope: "picks.gate",
      summary: "Contradicts multiple",
      memory_state: "candidate",
      metadata: { contradicts: ["mem-001", "mem-008"] },
    };
    const conflicts = detectConflict(newMemory, [confirmed, mem2]);
    expect(conflicts.length).toBe(2);
  });
});

// ─── Spec: health score formula ───────────────────────────────────────────────

describe("health score formula", () => {
  /**
   * Formula: Math.max(0, 100 - 10 * conflicted - 5 * stale - 2 * candidates)
   * Documented in intelligence-state.ts WiredMemoryStatus.
   */

  function computeHealth(conflicted: number, stale: number, candidates: number): number {
    return Math.max(0, 100 - 10 * conflicted - 5 * stale - 2 * candidates);
  }

  it("100 with zero issues", () => {
    expect(computeHealth(0, 0, 0)).toBe(100);
  });

  it("one conflict costs 10 points", () => {
    expect(computeHealth(1, 0, 0)).toBe(90);
  });

  it("one stale costs 5 points", () => {
    expect(computeHealth(0, 1, 0)).toBe(95);
  });

  it("one candidate costs 2 points", () => {
    expect(computeHealth(0, 0, 1)).toBe(98);
  });

  it("floors at 0 — never negative", () => {
    expect(computeHealth(100, 100, 100)).toBe(0);
    expect(computeHealth(10, 0, 0)).toBe(0);
    expect(computeHealth(5, 10, 25)).toBe(0);
  });

  it("combined deduction: 2 conflicts + 3 stale + 5 candidates = 100-20-15-10 = 55", () => {
    expect(computeHealth(2, 3, 5)).toBe(55);
  });
});

// ─── Spec: buildMemoryStatus not-wired posture ────────────────────────────────

describe("buildMemoryStatus (sync not-wired fallback)", () => {
  it("returns wired: false", () => {
    const m = buildMemoryStatus();
    expect(m.wired).toBe(false);
  });

  it("all ledger fields are null — not zeros", () => {
    const m = buildMemoryStatus();
    expect(m.candidatesAwaitingApproval).toBeNull();
    expect(m.conflicted).toBeNull();
    expect(m.stale).toBeNull();
    expect(m.expired).toBeNull();
    expect(m.healthScore).toBeNull();
    expect(m.lastWritten).toBeNull();
    expect(m.lastRecalled).toBeNull();
  });

  it("truth statement mentions no persistent memory", () => {
    expect(buildMemoryStatus().truth).toMatch(/no persistent memory/i);
  });
});

// ─── Spec: buildLiveMemoryStatus ─────────────────────────────────────────────

describe("buildLiveMemoryStatus (async, mocked DB)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("is exported and is async (returns a Promise)", async () => {
    // When the DB is unavailable (stub mode), it falls back to not-wired posture.
    // We just verify it resolves without throwing and returns a valid MemoryStatus.
    const result = await buildLiveMemoryStatus();
    // In test/stub mode the DB counts return 0 or the function falls back.
    // Either way: result.wired is a boolean, never undefined.
    expect(typeof result.wired).toBe("boolean");
    expect(result.truth.length).toBeGreaterThan(0);
    expect(result.protocolDocs.length).toBe(5);
  });

  it("never throws — DB errors collapse to not-wired posture", async () => {
    await expect(buildLiveMemoryStatus()).resolves.toBeDefined();
  });

  it("wired posture has numeric counts; not-wired posture has null counts", async () => {
    const result = await buildLiveMemoryStatus();
    if (result.wired) {
      expect(typeof result.candidatesAwaitingApproval).toBe("number");
      expect(typeof result.conflicted).toBe("number");
      expect(typeof result.stale).toBe("number");
      expect(typeof result.expired).toBe("number");
      expect(typeof result.healthScore).toBe("number");
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    } else {
      expect(result.candidatesAwaitingApproval).toBeNull();
      expect(result.conflicted).toBeNull();
      expect(result.stale).toBeNull();
      expect(result.expired).toBeNull();
      expect(result.healthScore).toBeNull();
    }
  });

  /**
   * Honesty regression pin (2026-07-17): buildLiveMemoryStatus() used to
   * report `wired: true` / "store healthy" whenever its COUNT queries
   * resolved without throwing — but @sports/db's stub client (active
   * whenever DATABASE_URL is unset/sentinel) resolves every count() to 0
   * without touching a real database. That silently overstated activation in
   * the default/no-DB environment. buildLiveMemoryStatus() now checks
   * isStubMode() first and short-circuits to the not-wired posture.
   *
   * We force isStubMode() → true here rather than assuming the ambient
   * environment is stub: local test runs leave DATABASE_URL unset (stub), but
   * CI's "Test, type-check, lint, Prisma" job runs the suite against a real
   * Postgres (db:push), so isStubMode() is false there and the un-forced call
   * would take the wired branch. Forcing stub mode exercises the exact
   * short-circuit this pin protects, deterministically in both environments.
   */
  it("under the stub db reports the honest not-wired posture, never a fake 'wired: true'", async () => {
    vi.resetModules();
    vi.doMock("@sports/db", async () => {
      const actual = await vi.importActual<typeof import("@sports/db")>("@sports/db");
      return { ...actual, isStubMode: () => true };
    });
    try {
      const { buildLiveMemoryStatus: buildUnderStub } = await import(
        "@/lib/jarvis/intelligence-state"
      );
      const result = await buildUnderStub();
      expect(result.wired).toBe(false);
      expect(result.store).toBe("Not Connected");
      expect(result.truth).toMatch(/no persistent memory/i);
      expect(result.candidatesAwaitingApproval).toBeNull();
      expect(result.healthScore).toBeNull();
    } finally {
      vi.doUnmock("@sports/db");
      vi.resetModules();
    }
  });
});

// ─── Spec: write-path status never overstates activation ────────────────────

describe("memory write-path status (buildMemoryStatus / buildLiveMemoryStatus)", () => {
  const ORIGINAL_ENV = process.env["JARVIS_MEMORY_WRITE_ENABLED"];

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
    } else {
      process.env["JARVIS_MEMORY_WRITE_ENABLED"] = ORIGINAL_ENV;
    }
  });

  it("buildMemoryStatus() reports writePath WIRED_GATED_OFF by default", () => {
    delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
    const m = buildMemoryStatus();
    expect(m.writePath).toBe("WIRED_GATED_OFF");
    expect(m.writePathTruth).toMatch(/gated OFF/i);
  });

  it("buildLiveMemoryStatus() reports writePath WIRED_GATED_OFF by default (stub db)", async () => {
    delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
    const m = await buildLiveMemoryStatus();
    expect(m.writePath).toBe("WIRED_GATED_OFF");
  });

  it("buildMemoryStatus() reports writePath WIRED_ACTIVE once the flag is 'true'", () => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "true";
    const m = buildMemoryStatus();
    expect(m.writePath).toBe("WIRED_ACTIVE");
    expect(m.writePathTruth).toMatch(/ACTIVE/);
  });

  it("writePath is independent of read-connectivity `wired` — both can be WIRED_GATED_OFF simultaneously with `wired: false`", () => {
    delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
    const m = buildMemoryStatus();
    expect(m.wired).toBe(false);
    expect(m.writePath).toBe("WIRED_GATED_OFF");
  });
});

// ─── Source pin: cockpit page calls buildLiveMemoryStatus ────────────────────

describe("cockpit page source pin", () => {
  it("buildLiveMemoryStatus is exported from intelligence-state", () => {
    // This import would fail at module level if the export was missing.
    expect(typeof buildLiveMemoryStatus).toBe("function");
  });

  it("buildLiveMemoryStatus is async (returns a Promise when called)", () => {
    const result = buildLiveMemoryStatus();
    expect(result).toBeInstanceOf(Promise);
    // Clean up the promise
    return result;
  });
});

// ─── P2025 masking — linkMemoryToAgentRun ────────────────────────────────────

describe("linkMemoryToAgentRun — P2025 not-found is not masked as connectivity failure", () => {
  it("source pin: P2025 branch throws a plain Error before wrapDbError wraps it", () => {
    // Source pin: verify the P2025 guard is in the file
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/jarvis/memory/actions.ts"),
      "utf-8"
    );
    expect(src).toMatch(/P2025/);
    expect(src).toMatch(/Record not found|not found/i);
    // The guard must appear before wrapDbError in linkMemoryToAgentRun
    const linkFnIdx = src.indexOf("export async function linkMemoryToAgentRun");
    const p2025Idx = src.indexOf("P2025", linkFnIdx);
    const wrapIdx = src.indexOf("wrapDbError", linkFnIdx);
    expect(p2025Idx).toBeGreaterThan(linkFnIdx);
    expect(p2025Idx).toBeLessThan(wrapIdx);
  });

  it("source pin: P2025 guard also present in confirmMemory and rejectMemory", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/jarvis/memory/actions.ts"),
      "utf-8"
    );
    const p2025Count = (src.match(/P2025/g) ?? []).length;
    // At minimum: confirmMemory, rejectMemory, expireMemory, linkMemoryToAgentRun
    expect(p2025Count).toBeGreaterThanOrEqual(4);
  });
});

// ─── Honesty reconciliation: write path is present but gated OFF ────────────

/**
 * apps/web/lib/jarvis/memory/write-gate.ts adds an autonomous write entry
 * point (recordMemoryEvent()) that did not exist before. No existing test in
 * this suite asserted the ABSENCE of a memory write function — the "memory
 * is not activated" honesty claims here and in JARVIS_MEMORY_PROTOCOL.md
 * were always about default-OFF activation, not about the write code not
 * existing. These pins make that reconciliation explicit: the write path is
 * present in source, but default-gated OFF, so no writes occur unless a
 * founder sets JARVIS_MEMORY_WRITE_ENABLED=true.
 */
describe("write path — present in source, gated OFF by default", () => {
  it("write-gate.ts exists and exports recordMemoryEvent", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../lib/jarvis/memory/write-gate.ts"),
      "utf-8"
    );
    expect(src).toMatch(/export async function recordMemoryEvent/);
    expect(src).toMatch(/JARVIS_MEMORY_WRITE_ENABLED/);
  });

  it("recordMemoryEvent defaults to disabled with zero DB writes (no env override)", async () => {
    delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
    const { recordMemoryEvent } = await import("@/lib/jarvis/memory/write-gate");
    const db = {
      jarvisMemoryEvent: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };
    const result = await recordMemoryEvent({
      db,
      memory_type: "decision",
      scope: "test",
      title: "t",
      summary: "s",
      source_type: "test",
      actor: "test",
      owner: "test",
      confidence: 50,
    });
    expect(result).toEqual({ enabled: false, recorded: false });
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });
});

// ─── Error types ──────────────────────────────────────────────────────────────

describe("error types", () => {
  it("MemoryStoreUnavailableError has correct name and code", () => {
    const err = new MemoryStoreUnavailableError(new Error("connection refused"));
    expect(err.name).toBe("MemoryStoreUnavailableError");
    expect(err.code).toBe("MEMORY_STORE_UNAVAILABLE");
    expect(err.message).toMatch(/connection refused/);
  });

  it("MemoryTransitionError has correct name and code", () => {
    const err = new MemoryTransitionError("rejected", "confirmed");
    expect(err.name).toBe("MemoryTransitionError");
    expect(err.code).toBe("MEMORY_TRANSITION_INVALID");
    expect(err.message).toMatch(/rejected/);
    expect(err.message).toMatch(/confirmed/);
  });

  it("MemoryGuardError has correct name and code", () => {
    const err = new MemoryGuardError("guard violation");
    expect(err.name).toBe("MemoryGuardError");
    expect(err.code).toBe("MEMORY_GUARD_VIOLATION");
  });
});
