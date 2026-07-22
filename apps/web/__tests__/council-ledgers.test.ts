/**
 * Council Ledger Tests — pure / source-pin, no live DB.
 *
 * Covers:
 *   1. Seat validation rejects unknown seats.
 *   2. Review-states law: pending_review until parent reviews;
 *      only accepted / rejected / edited after that.
 *   3. Typed error: LedgerStoreUnavailableError.
 *   4. Async probe (buildLiveLedgerStatus) never throws.
 *   5. Schema source pins: models + @@map names exist in schema.prisma.
 *   6. Migration file for 20260613000000_council_ledgers exists.
 *   7. Panel still has the posture testid (source pin on component).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Imports under test ───────────────────────────────────────────────────────

import { LedgerStoreUnavailableError } from "@/lib/jarvis/ledgers";
import { buildLedgerStatus, buildLiveLedgerStatus } from "@/lib/jarvis/ledger-types";
import { AGENT_COUNCIL } from "@/lib/jarvis/agent-council";
import {
  UnauthenticatedError,
  ForbiddenError,
  resolveServiceActor,
  type VerifiedCredentialContext,
} from "@/lib/auth/actor";
// Raw (ungoverned) constructors are deliberately imported from the
// test-internal module: these tests prove the DENIAL paths hold even for an
// actor minted outside resolveServiceActor's governance.
import { serviceActor, systemActor } from "@/lib/auth/actor-test-internal";

const TEST_CREDENTIAL: VerifiedCredentialContext = {
  method: "TEST_HARNESS",
  verifiedBy: "__tests__/council-ledgers",
  verifiedAt: new Date(),
};

// ─── Mock auth() — default to a valid ADMIN session so the seat/confidence/
// review-state tests exercise validation logic, not the auth gate itself. The
// dedicated "actor authorization" describe block overrides this per-test.
// ─────────────────────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

function mockAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@gsn.example", role: "ADMIN" } });
}

// ─── Mock the db client ───────────────────────────────────────────────────────

vi.mock("@sports/db", () => {
  /** Structural stand-in for Prisma.PrismaClientKnownRequestError (code-carrying). */
  class MockPrismaClientKnownRequestError extends Error {
    readonly code: string;
    constructor(message: string, opts: { code: string; clientVersion?: string }) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = opts.code;
    }
  }
  return {
    db: {
      agentHandoff: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      subagentRun: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      jarvisMemoryEvent: {
        count: vi.fn().mockResolvedValue(0),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      actorReceipt: {
        create: vi.fn(),
      },
    },
    Prisma: { PrismaClientKnownRequestError: MockPrismaClientKnownRequestError },
    isStubMode: vi.fn().mockReturnValue(false),
    isDemoPicksEnabled: vi.fn().mockReturnValue(false),
  };
});

import { db } from "@sports/db";

// Default every test to an authenticated admin caller — the dedicated "actor
// authorization" block overrides mockAuth per-test to exercise the
// unauthenticated / non-admin / wrong-actor-type paths. Also (re-)arm the
// actor-receipt store: a nested describe calls vi.resetAllMocks(), so the
// default implementation must be restored before every test.
beforeEach(() => {
  mockAdminSession();
  vi.mocked(db.actorReceipt.create).mockResolvedValue({ id: "receipt-1" } as never);
});

// ─── 1. Seat validation ───────────────────────────────────────────────────────

// We test the seat-validation logic via the ledgers module's exported functions.
// Since the actual db calls would hit the mock, we test the guard path that
// throws *before* touching the db (assertValidSeat throws synchronously from the
// function's top, so we don't need the db at all for the rejection path).

import { logHandoff, logSubagentRun, reviewSubagentRun } from "@/lib/jarvis/ledgers";
import {
  logHandoffAs,
  reviewSubagentRunAs,
  SubagentRunAlreadyDecidedError,
} from "@/lib/jarvis/ledgers-core";

describe("seat validation", () => {
  it("rejects an unknown sourceSeat in logHandoff", async () => {
    await expect(
      logHandoff({
        sourceSeat: "UNKNOWN_SEAT_XYZ",
        targetSeat: "jarvis",
        reason: "test",
        taskType: "test",
        evidenceText: "none",
        authorityTier: 1,
      })
    ).rejects.toThrow('Unknown agent seat "UNKNOWN_SEAT_XYZ"');
  });

  it("rejects an unknown targetSeat in logHandoff", async () => {
    await expect(
      logHandoff({
        sourceSeat: "jarvis",
        targetSeat: "DOES_NOT_EXIST",
        reason: "test",
        taskType: "test",
        evidenceText: "none",
        authorityTier: 1,
      })
    ).rejects.toThrow('Unknown agent seat "DOES_NOT_EXIST"');
  });

  it("accepts a valid seat id", async () => {
    // AGENT_COUNCIL always has at least 23 members — index access is safe.
    const sourceSeatId = AGENT_COUNCIL[0]!.id;
    const targetSeatId = AGENT_COUNCIL[1]!.id;
    await expect(
      logHandoff({
        sourceSeat: sourceSeatId,
        targetSeat: targetSeatId,
        reason: "routing test",
        taskType: "pick-research",
        evidenceText: "n/a",
        authorityTier: 1,
      })
    ).resolves.not.toThrow();
  });

  it("accepts a valid seat codename", async () => {
    // Codenames should be accepted too (JARVIS, SCOUT, etc.)
    await expect(
      logHandoff({
        sourceSeat: "JARVIS",
        targetSeat: "SCOUT",
        reason: "routing test",
        taskType: "pick-research",
        evidenceText: "n/a",
        authorityTier: 1,
      })
    ).resolves.not.toThrow();
  });

  it("rejects an unknown parentSeat in logSubagentRun", async () => {
    await expect(
      logSubagentRun({
        subagentId: "scout-injury-context",
        parentSeat: "NOT_A_REAL_SEAT",
        task: "test task",
        inputContext: "{}",
        outputArtifactRef: "draft://test",
        confidence: 70,
        uncertainty: "unknown",
        prohibitedActionsChecked: true,
      })
    ).rejects.toThrow('Unknown agent seat "NOT_A_REAL_SEAT"');
  });

  it("rejects an unknown reviewerSeat in reviewSubagentRun", async () => {
    await expect(
      reviewSubagentRun("run-id-123", "TOTALLY_FAKE_SEAT", "accepted")
    ).rejects.toThrow('Unknown agent seat "TOTALLY_FAKE_SEAT"');
  });
});

// ─── 1b. Confidence validation ────────────────────────────────────────────────

describe("confidence validation in logSubagentRun", () => {
  const base = {
    subagentId: "scout-injury-context",
    parentSeat: "scout",
    task: "check injury",
    inputContext: "{}",
    outputArtifactRef: "draft://artifact/1",
    uncertainty: "low",
    prohibitedActionsChecked: true,
  };

  it("rejects NaN confidence before touching the db", async () => {
    await expect(
      logSubagentRun({ ...base, confidence: Number.NaN })
    ).rejects.toThrow(/Invalid confidence.*0.*100/i);
  });

  it("rejects Infinity confidence", async () => {
    await expect(
      logSubagentRun({ ...base, confidence: Number.POSITIVE_INFINITY })
    ).rejects.toThrow(/Invalid confidence/i);
  });

  it("rejects confidence above 100", async () => {
    await expect(
      logSubagentRun({ ...base, confidence: 250 })
    ).rejects.toThrow(/Invalid confidence/i);
  });

  it("rejects negative confidence", async () => {
    await expect(
      logSubagentRun({ ...base, confidence: -5 })
    ).rejects.toThrow(/Invalid confidence/i);
  });

  it("does not call db.create when confidence is out of range", async () => {
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.subagentRun, "create");
    createSpy.mockClear();
    await expect(
      logSubagentRun({ ...base, confidence: Number.NaN })
    ).rejects.toThrow(/Invalid confidence/i);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("accepts a valid boundary confidence of 0 and 100", async () => {
    await expect(
      logSubagentRun({ ...base, confidence: 0 })
    ).resolves.not.toThrow();
    await expect(
      logSubagentRun({ ...base, confidence: 100 })
    ).resolves.not.toThrow();
  });
});

// ─── 2. Review-states law ─────────────────────────────────────────────────────

describe("review-states law", () => {
  it("subagent outputs start as pending_review (logSubagentRun always creates with pending_review)", async () => {
    const { db } = await import("@sports/db");
    // Verify the create call uses pending_review
    const createSpy = vi.spyOn(db.subagentRun, "create");
    await logSubagentRun({
      subagentId: "scout-injury-context",
      parentSeat: "scout",
      task: "check injury",
      inputContext: "{}",
      outputArtifactRef: "draft://artifact/1",
      confidence: 80,
      uncertainty: "low",
      prohibitedActionsChecked: true,
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parent_review_status: "pending_review",
        }),
      })
    );
  });

  it("reviewSubagentRun transitions to accepted when called by parent", async () => {
    const { db } = await import("@sports/db");

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-abc",
      parent_seat: "scout",
      parent_review_status: "pending_review",
      subagent_id: "scout-injury-context",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 80,
      uncertainty: "low",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: null,
      reviewer_type: null,
      reviewer_email: null,
      policy_version: null,
      actor_receipt_id: null,
      reviewer_receipt_id: null,
    });

    const updateSpy = vi.spyOn(db.subagentRun, "update");
    await reviewSubagentRun("run-abc", "scout", "accepted");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parent_review_status: "accepted" }),
      })
    );
  });

  it("reviewSubagentRun transitions to rejected", async () => {
    const { db } = await import("@sports/db");

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-def",
      parent_seat: "scout",
      parent_review_status: "pending_review",
      subagent_id: "scout-injury-context",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 80,
      uncertainty: "low",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: null,
      reviewer_type: null,
      reviewer_email: null,
      policy_version: null,
      actor_receipt_id: null,
      reviewer_receipt_id: null,
    });

    const updateSpy = vi.spyOn(db.subagentRun, "update");
    await reviewSubagentRun("run-def", "scout", "rejected");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parent_review_status: "rejected" }),
      })
    );
  });

  it("reviewSubagentRun transitions to edited", async () => {
    const { db } = await import("@sports/db");

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-ghi",
      parent_seat: "tal",
      parent_review_status: "pending_review",
      subagent_id: "tal-schema-drift",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 70,
      uncertainty: "medium",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: null,
      reviewer_type: null,
      reviewer_email: null,
      policy_version: null,
      actor_receipt_id: null,
      reviewer_receipt_id: null,
    });

    const updateSpy = vi.spyOn(db.subagentRun, "update");
    await reviewSubagentRun("run-ghi", "tal", "edited");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parent_review_status: "edited" }),
      })
    );
  });

  it("reviewSubagentRun rejects a non-parent reviewer", async () => {
    const { db } = await import("@sports/db");

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-xyz",
      parent_seat: "scout",
      parent_review_status: "pending_review",
      subagent_id: "scout-injury-context",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 80,
      uncertainty: "low",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: null,
      reviewer_type: null,
      reviewer_email: null,
      policy_version: null,
      actor_receipt_id: null,
      reviewer_receipt_id: null,
    });

    // TAL is not the parent seat for this run (scout is)
    await expect(reviewSubagentRun("run-xyz", "tal", "accepted")).rejects.toThrow(
      /not the parent seat/
    );
  });

  it("REFUSES to overwrite an already-decided run — decision + reviewer attribution are immutable", async () => {
    const { db } = await import("@sports/db");
    vi.mocked(db.subagentRun.update).mockClear();
    vi.mocked(db.actorReceipt.create).mockClear();

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-decided",
      parent_seat: "scout",
      parent_review_status: "accepted", // already decided by an earlier reviewer
      subagent_id: "scout-injury-context",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 80,
      uncertainty: "low",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: "admin-earlier",
      reviewer_type: "HUMAN",
      reviewer_email: "earlier@gsn.example",
      policy_version: "v1",
      actor_receipt_id: null,
      reviewer_receipt_id: "receipt-earlier",
    });

    await expect(reviewSubagentRun("run-decided", "scout", "rejected")).rejects.toThrow(
      SubagentRunAlreadyDecidedError
    );
    // The earlier decision was never touched…
    expect(db.subagentRun.update).not.toHaveBeenCalled();
    // …and no orphan receipt was minted for the refused overwrite.
    expect(db.actorReceipt.create).not.toHaveBeenCalled();
  });

  it("a concurrent decision between read and write is NOT overwritten (atomic WHERE → P2025 → AlreadyDecided)", async () => {
    const { db, Prisma } = await import("@sports/db");

    vi.mocked(db.subagentRun.findUniqueOrThrow).mockResolvedValueOnce({
      id: "run-race",
      parent_seat: "scout",
      parent_review_status: "pending_review", // pending at read time…
      subagent_id: "scout-injury-context",
      task: "t",
      input_context: "{}",
      output_artifact_ref: "ref",
      confidence: 80,
      uncertainty: "low",
      evidence: [],
      prohibited_actions_checked: true,
      created_at: new Date(),
      updated_at: new Date(),
      actor_subject_id: null,
      actor_type: null,
      actor_email: null,
      reviewer_subject_id: null,
      reviewer_type: null,
      reviewer_email: null,
      policy_version: null,
      actor_receipt_id: null,
      reviewer_receipt_id: null,
    });
    // …but the guarded UPDATE (WHERE parent_review_status = 'pending_review')
    // matches no row because a concurrent reviewer decided first.
    vi.mocked(db.subagentRun.update).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("No record found", {
        code: "P2025",
        clientVersion: "5.22.0",
      })
    );

    await expect(reviewSubagentRun("run-race", "scout", "accepted")).rejects.toThrow(
      SubagentRunAlreadyDecidedError
    );
  });

  it("source pin: the review UPDATE carries the atomic pending_review guard in its WHERE", () => {
    const src = readFileSync(resolve(__dirname, "../lib/jarvis/ledgers-core.ts"), "utf-8");
    expect(src).toMatch(
      /where:\s*\{\s*id:\s*runId,\s*parent_review_status:\s*"pending_review"\s*\}/
    );
  });
});

// ─── 2b. P2025 masking — reviewSubagentRun ────────────────────────────────────

describe("reviewSubagentRun — P2025 not-found is not masked as connectivity failure", () => {
  it("source pin: P2025 guard is present in reviewSubagentRunAs, before wrapDbError", () => {
    // The write implementation (incl. the P2025 guard) now lives in the core
    // module; ledgers.ts is a thin auth-resolving wrapper over it.
    const src = readFileSync(
      resolve(__dirname, "../lib/jarvis/ledgers-core.ts"),
      "utf-8"
    );
    // P2025 check must exist in the file
    expect(src).toMatch(/P2025/);
    // The guard must throw a plain Error (not wrapped as LedgerStoreUnavailableError)
    expect(src).toMatch(/throw new Error\([^)]*not found/i);
    // The P2025 guard must appear before wrapDbError in reviewSubagentRunAs
    const reviewFnIdx = src.indexOf("export async function reviewSubagentRunAs");
    const p2025Idx = src.indexOf("P2025", reviewFnIdx);
    const wrapIdx = src.indexOf("wrapDbError", reviewFnIdx);
    expect(p2025Idx).toBeGreaterThan(reviewFnIdx);
    expect(p2025Idx).toBeLessThan(wrapIdx);
  });

  it("source pin: P2025 guard checks PrismaClientKnownRequestError instanceof + code", () => {
    const src = readFileSync(
      resolve(__dirname, "../lib/jarvis/ledgers-core.ts"),
      "utf-8"
    );
    expect(src).toContain("PrismaClientKnownRequestError");
    expect(src).toContain('"P2025"');
  });
});

// ─── 3. Typed error ───────────────────────────────────────────────────────────

describe("LedgerStoreUnavailableError", () => {
  it("is an instance of Error", () => {
    const err = new LedgerStoreUnavailableError(new Error("boom"));
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(LedgerStoreUnavailableError);
  });

  it("has code LEDGER_STORE_UNAVAILABLE", () => {
    const err = new LedgerStoreUnavailableError("no conn");
    expect(err.code).toBe("LEDGER_STORE_UNAVAILABLE");
  });

  it("includes the cause message", () => {
    const err = new LedgerStoreUnavailableError(new Error("table not found"));
    expect(err.message).toContain("table not found");
  });

  it("name is LedgerStoreUnavailableError", () => {
    const err = new LedgerStoreUnavailableError();
    expect(err.name).toBe("LedgerStoreUnavailableError");
  });
});

// ─── 4. Async probe never throws ─────────────────────────────────────────────

describe("buildLiveLedgerStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns connected posture with counts when db succeeds", async () => {
    const { db } = await import("@sports/db");
    vi.mocked(db.agentHandoff.count).mockResolvedValue(5);
    vi.mocked(db.subagentRun.count)
      .mockResolvedValueOnce(12)   // total
      .mockResolvedValueOnce(3);   // pending_review

    const status = await buildLiveLedgerStatus();
    expect(status.storeAvailable).toBe(true);
    if (status.storeAvailable) {
      expect(status.handoffLedger).toBe("connected");
      expect(status.subagentRunLedger).toBe("connected");
      expect(status.handoffCount).toBe(5);
      expect(status.subagentRunCount).toBe(12);
      expect(status.pendingReviewCount).toBe(3);
    }
  });

  it("returns not-connected posture without throwing when db fails", async () => {
    const { db } = await import("@sports/db");
    vi.mocked(db.agentHandoff.count).mockRejectedValue(new Error("DB down"));

    const status = await buildLiveLedgerStatus();
    expect(status.storeAvailable).toBe(false);
    expect(status.handoffLedger).toBe("not_connected");
  });

  it("never throws even when db throws synchronously-shaped errors", async () => {
    const { db } = await import("@sports/db");
    vi.mocked(db.agentHandoff.count).mockImplementation(() => {
      throw new Error("sync crash");
    });

    await expect(buildLiveLedgerStatus()).resolves.not.toThrow();
  });
});

// ─── Sync fallback ────────────────────────────────────────────────────────────

describe("buildLedgerStatus (sync fallback)", () => {
  it("returns not_connected posture", () => {
    const status = buildLedgerStatus();
    expect(status.storeAvailable).toBe(false);
    expect(status.handoffLedger).toBe("not_connected");
    expect(status.subagentRunLedger).toBe("not_connected");
  });
});

// ─── 5. Schema source pins ────────────────────────────────────────────────────

const SCHEMA_PATH = resolve(__dirname, "../../../packages/db/prisma/schema.prisma");
const schemaText = readFileSync(SCHEMA_PATH, "utf-8");

describe("schema source pins", () => {
  it('contains model AgentHandoff', () => {
    expect(schemaText).toMatch(/model AgentHandoff\s*\{/);
  });

  it('contains model SubagentRun', () => {
    expect(schemaText).toMatch(/model SubagentRun\s*\{/);
  });

  it('AgentHandoff has @@map("agent_handoffs")', () => {
    expect(schemaText).toContain('@@map("agent_handoffs")');
  });

  it('SubagentRun has @@map("subagent_runs")', () => {
    expect(schemaText).toContain('@@map("subagent_runs")');
  });

  it('JarvisMemoryEvent has related_agent_run_id field', () => {
    expect(schemaText).toMatch(/related_agent_run_id\s+String\?/);
  });

  it('JarvisMemoryEvent has agent_run relation', () => {
    expect(schemaText).toContain('"MemoryAgentRunLink"');
  });

  it('AgentHandoffStatus enum is defined', () => {
    expect(schemaText).toMatch(/enum AgentHandoffStatus\s*\{/);
  });

  it('SubagentParentReviewStatus enum is defined', () => {
    expect(schemaText).toMatch(/enum SubagentParentReviewStatus\s*\{/);
  });
});

// ─── 6. Migration file exists ─────────────────────────────────────────────────

describe("migration file", () => {
  it("20260613000000_council_ledgers/migration.sql exists", () => {
    const migrationPath = resolve(
      __dirname,
      "../../../packages/db/prisma/migrations/20260613000000_council_ledgers/migration.sql"
    );
    const content = readFileSync(migrationPath, "utf-8");
    expect(content).toContain("agent_handoffs");
    expect(content).toContain("subagent_runs");
    expect(content).toContain("AgentHandoffStatus");
    expect(content).toContain("SubagentParentReviewStatus");
  });
});

// ─── 7. Panel posture testid ──────────────────────────────────────────────────

const PANEL_PATH = resolve(
  __dirname,
  "../components/cockpit/agent-council-panel.tsx"
);
const panelText = readFileSync(PANEL_PATH, "utf-8");

describe("agent council panel", () => {
  it('still has data-testid="council-ledger-posture"', () => {
    expect(panelText).toContain('data-testid="council-ledger-posture"');
  });

  it("panel accepts a ledger prop", () => {
    expect(panelText).toContain("ledger: LedgerStatus");
  });
});

// ─── 8. Trusted-actor authorization — the auth boundary itself ────────────────
//
// Every other block relies on the top-level beforeEach admin session so it can
// test seat/confidence/review-state logic in isolation. These tests exercise
// the boundary directly: no session, non-admin session, wrong actor type, and
// that auth runs BEFORE any domain validation.

describe("trusted-actor authorization", () => {
  const validHandoff = {
    sourceSeat: "jarvis",
    targetSeat: "scout",
    reason: "test",
    taskType: "test",
    evidenceText: "n/a",
    authorityTier: 1,
  };

  it("logHandoff rejects with UnauthenticatedError when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(logHandoff(validHandoff)).rejects.toThrow(UnauthenticatedError);
  });

  it("logHandoff rejects with ForbiddenError for a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@example.com", role: "USER" } });
    await expect(logHandoff(validHandoff)).rejects.toThrow(ForbiddenError);
  });

  it("logHandoff checks auth BEFORE seat validation — an unauthenticated caller never learns their seat was invalid", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      logHandoff({ ...validHandoff, sourceSeat: "TOTALLY_INVALID_SEAT" })
    ).rejects.toThrow(UnauthenticatedError);
    await expect(
      logHandoff({ ...validHandoff, sourceSeat: "TOTALLY_INVALID_SEAT" })
    ).rejects.not.toThrow(/Unknown agent seat/);
  });

  it("logSubagentRun rejects with UnauthenticatedError when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      logSubagentRun({
        subagentId: "scout-injury-context",
        parentSeat: "scout",
        task: "t",
        inputContext: "{}",
        outputArtifactRef: "ref",
        confidence: 80,
        uncertainty: "low",
        prohibitedActionsChecked: true,
      })
    ).rejects.toThrow(UnauthenticatedError);
  });

  it("reviewSubagentRun rejects with ForbiddenError for a non-admin session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@example.com", role: "USER" } });
    await expect(reviewSubagentRun("run-1", "scout", "accepted")).rejects.toThrow(ForbiddenError);
  });

  it("an authenticated admin persists as the trusted audit actor on logHandoff", async () => {
    mockAdminSession();
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.agentHandoff, "create");
    createSpy.mockClear();
    await logHandoff(validHandoff);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actor_subject_id: "admin-1",
          actor_type: "HUMAN",
          actor_email: "admin@gsn.example",
        }),
      })
    );
  });
});

// ─── 9. SERVICE / SYSTEM actors on background (core) write paths ───────────────
//
// Background/non-interactive callers do NOT go through the "use server" surface;
// they call the core functions with a governed SERVICE/SYSTEM actor. logHandoff
// permits all actor types; reviewSubagentRunAs is HUMAN-only.

describe("service/system actors on core write paths", () => {
  it("a GOVERNED SERVICE actor (resolveServiceActor) may log a handoff and is recorded as actor_type SERVICE", async () => {
    const createSpy = vi.spyOn(db.agentHandoff, "create");
    createSpy.mockClear();
    const actor = resolveServiceActor({
      principalId: "service:pick-generation-worker",
      verifiedCredentialContext: TEST_CREDENTIAL,
      operation: "jarvis:log-handoff",
      runId: "run-42",
    });
    await logHandoffAs(actor, {
      sourceSeat: "jarvis",
      targetSeat: "scout",
      reason: "background routing",
      taskType: "pick-research",
      evidenceText: "n/a",
      authorityTier: 1,
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actor_subject_id: "service:pick-generation-worker",
          actor_type: "SERVICE",
        }),
      })
    );
  });

  it("a SERVICE actor is DENIED reviewing a subagent run (HUMAN-only) with ForbiddenError", async () => {
    const actor = serviceActor({ subjectId: "service:auto-reviewer" });
    await expect(
      reviewSubagentRunAs(actor, "run-1", "scout", "accepted")
    ).rejects.toThrow(ForbiddenError);
  });

  it("a SYSTEM actor is DENIED reviewing a subagent run (HUMAN-only)", async () => {
    const actor = systemActor({ subjectId: "system:sweep" });
    await expect(
      reviewSubagentRunAs(actor, "run-1", "scout", "accepted")
    ).rejects.toThrow(ForbiddenError);
  });

  it("the HUMAN-only denial happens before any db read", async () => {
    const { db } = await import("@sports/db");
    const findSpy = vi.spyOn(db.subagentRun, "findUniqueOrThrow");
    findSpy.mockClear();
    const actor = serviceActor({ subjectId: "service:auto-reviewer" });
    await expect(
      reviewSubagentRunAs(actor, "run-1", "scout", "accepted")
    ).rejects.toThrow(ForbiddenError);
    expect(findSpy).not.toHaveBeenCalled();
  });
});
