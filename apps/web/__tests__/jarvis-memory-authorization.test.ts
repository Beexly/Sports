/**
 * Jarvis Memory Server Actions — authorization gate tests (P13-01).
 *
 * Every mutating Server Action in lib/jarvis/memory/actions.ts must re-check
 * the admin session BEFORE touching the database, because a "use server"
 * export is its own POST endpoint regardless of whether any UI currently
 * wires it up (see the doctrine quoted in cockpit/memory/page.tsx:24-28).
 *
 * These tests mock auth() to return a NON-admin / unauthenticated session and
 * assert that each mutator throws UnauthenticatedError / ForbiddenError BEFORE
 * db is touched. The three reader functions (recallRelevantMemory,
 * listMemoryByState, listMemoryConflicts) are intentionally left unguarded
 * per the P13-01 task — they are NOT tested here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock auth() — controls whether requireAdminActor throws ───────────────────
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ─── Mock the db client — track whether any mutator touched it ─────────────────
vi.mock("@sports/db", () => ({
  db: {
    jarvisMemoryEvent: {
      create: vi.fn().mockResolvedValue({ id: "mem-mock" }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ memory_state: "candidate" }),
      update: vi.fn().mockResolvedValue({ id: "mem-mock" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      $transaction: vi.fn(),
    },
    subagentRun: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "run-mock" }),
    },
    // Prisma namespace for error classes
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        readonly code: string;
        constructor(message: string, opts: { code: string }) {
          super(message);
          this.code = opts.code;
        }
      },
    },
  },
}));

import {
  createMemoryCandidate,
  confirmMemory,
  rejectMemory,
  expireMemory,
  supersedeMemory,
  linkMemoryToDecision,
  linkMemoryToAgentRun,
  // readers intentionally NOT imported — they remain unguarded per task scope
} from "@/lib/jarvis/memory/actions";
import { db } from "@sports/db";
import { UnauthenticatedError, ForbiddenError } from "@/lib/auth/actor";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function mockUnauthenticated() {
  mockAuth.mockResolvedValue(null);
}

function mockNonAdminUser() {
  mockAuth.mockResolvedValue({ user: { id: "user-1", email: "user@example.com", role: "USER" } });
}

/** A minimal valid input for createMemoryCandidate. */
function validCandidateInput() {
  return {
    memory_type: "observation",
    scope: "test",
    title: "T",
    summary: "S",
    actor: "test-actor",
    owner: "test-owner",
    confidence: 50,
    source_type: "test",
  };
}

/** The 7 mutators subject to the authorization gate. */
const mutators: { name: string; call: () => Promise<unknown> }[] = [
  {
    name: "createMemoryCandidate",
    call: () =>
      createMemoryCandidate(validCandidateInput() as never),
  },
  {
    name: "confirmMemory",
    call: () => confirmMemory("mem-1", false),
  },
  {
    name: "rejectMemory",
    call: () => rejectMemory("mem-1"),
  },
  {
    name: "expireMemory",
    call: () => expireMemory("mem-1"),
  },
  {
    name: "supersedeMemory",
    call: () => supersedeMemory("mem-old", validCandidateInput() as never),
  },
  {
    name: "linkMemoryToDecision",
    call: () => linkMemoryToDecision("mem-1", "dec-1"),
  },
  {
    name: "linkMemoryToAgentRun",
    call: () => linkMemoryToAgentRun("mem-1", "run-1"),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Auth gate: each mutator must throw BEFORE touching the DB ───────────────────

describe("P13-01: memory mutators are gated by requireAdminActor before DB", () => {
  it("throws UnauthenticatedError when no session (anonymous) for ALL 7 mutators", async () => {
    for (const { call } of mutators) {
      mockUnauthenticated();
      await expect(call()).rejects.toThrow(UnauthenticatedError);
      // The auth gate ran, but the DB must NOT have been touched.
      expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
      expect(db.jarvisMemoryEvent.update).not.toHaveBeenCalled();
      expect(db.jarvisMemoryEvent.findUniqueOrThrow).not.toHaveBeenCalled();
    }
  });

  it("throws ForbiddenError when session is a non-admin USER for ALL 7 mutators", async () => {
    for (const { call } of mutators) {
      mockNonAdminUser();
      await expect(call()).rejects.toThrow(ForbiddenError);
      // DB must not be reached on a failed admin check.
      expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
      expect(db.jarvisMemoryEvent.update).not.toHaveBeenCalled();
    }
  });

  it.each(mutators)(
    "$name throws before db when unauthenticated (isolated check)",
    async ({ call }) => {
      mockUnauthenticated();
      await expect(call()).rejects.toThrow();
      expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
      expect(db.jarvisMemoryEvent.update).not.toHaveBeenCalled();
      expect(db.jarvisMemoryEvent.updateMany).not.toHaveBeenCalled();
    }
  );
});
