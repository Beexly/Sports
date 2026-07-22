/**
 * Moderation server-action tests — Trusted Actor Model (Phase 1A).
 *
 * The negative tests are the point:
 *   - impersonation via a caller-supplied reporter id is UNREPRESENTABLE
 *     (fileReport derives the reporter from the session);
 *   - a cross-user appeal is rejected (ownership proof);
 *   - a malformed privileged session (empty subject id) THROWS and never writes;
 *   - actor / reviewer string spoofing on takeAction / decideAppeal is
 *     UNREPRESENTABLE (no such input field; identity comes from the session);
 *   - the different-reviewer rule is enforced on TRUSTED stable ids;
 *   - non-admin callers are denied admin-gated actions;
 *   - the anonymous-report path always persists reporterUserId = null and is
 *     rate-limited.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

function mockAdminSession(id = "admin-1") {
  mockAuth.mockResolvedValue({ user: { id, email: "admin@gsn.example", role: "ADMIN" } });
}
function mockUserSession(id: string) {
  mockAuth.mockResolvedValue({ user: { id, email: `${id}@example.com`, role: "USER" } });
}

vi.mock("@sports/db", () => ({
  db: {
    moderationReport: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    moderationAction: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
    },
    moderationAppeal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));

import {
  fileReport,
  fileAnonymousReport,
  takeAction,
  appealAction,
  decideAppeal,
  listOpenReports,
  listActions,
  auditLog,
} from "@/lib/community/moderation-actions";
import { UnauthenticatedError, ForbiddenError, InvalidActorError } from "@/lib/auth/actor";
import { resetAnonymousReportLimiter } from "@/lib/community/anon-report-limiter";

const SUSPEND_ACTION = {
  id: "a1",
  actor: "mod-original",
  targetUserId: "victim",
  contentRef: null,
  surface: null,
  action: "SUSPEND" as const,
  reason: "OTHER" as const,
  notes: null,
  reportId: null,
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetAnonymousReportLimiter();
  mockAdminSession();
});

// ─── Admin-gated actions reject unauthenticated / non-admin callers ────────────

describe("admin-gated actions require an ADMIN actor", () => {
  it("takeAction requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      takeAction({ targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow(UnauthenticatedError);
  });

  it("takeAction requires ADMIN role, not just any session", async () => {
    mockUserSession("u1");
    await expect(
      takeAction({ targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("decideAppeal requires ADMIN role", async () => {
    mockUserSession("u1");
    await expect(
      decideAppeal({ appealId: "ap1", decision: "upheld", status: "UPHELD" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("listOpenReports / listActions / auditLog require a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(listOpenReports()).rejects.toThrow(UnauthenticatedError);
    await expect(listActions("u1")).rejects.toThrow(UnauthenticatedError);
    await expect(auditLog("c1")).rejects.toThrow(UnauthenticatedError);
  });

  it("auth is checked before any DB call — unauthenticated calls never touch the store", async () => {
    mockAuth.mockResolvedValue(null);
    const { db } = await import("@sports/db");
    const spy = vi.spyOn(db.moderationAction, "findMany");
    await expect(listActions("u1")).rejects.toThrow(UnauthenticatedError);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─── Gap 5: malformed privileged session (empty subject) → throws, never writes ─

describe("malformed privileged session (empty subject id)", () => {
  it("takeAction throws InvalidActorError and never writes for an ADMIN session with an empty id", async () => {
    mockAdminSession(""); // privileged but malformed
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.moderationAction, "create");
    await expect(
      takeAction({ targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow(InvalidActorError);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("decideAppeal throws InvalidActorError and never reads/writes for an empty-subject admin", async () => {
    mockAdminSession("");
    const { db } = await import("@sports/db");
    const findSpy = vi.spyOn(db.moderationAppeal, "findUnique");
    const updateSpy = vi.spyOn(db.moderationAppeal, "update");
    await expect(
      decideAppeal({ appealId: "ap1", decision: "x", status: "UPHELD" })
    ).rejects.toThrow(InvalidActorError);
    expect(findSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

// ─── Gap 3: actor spoofing on takeAction is unrepresentable ────────────────────

describe("takeAction derives the actor from the trusted session, not the caller", () => {
  it("persists actor = the session subject id (and never a caller-supplied string)", async () => {
    mockAdminSession("admin-real");
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.moderationAction, "create").mockResolvedValue({} as never);
    // A caller trying to smuggle an `actor` field cannot: it is not in the type,
    // and even passed at runtime it is ignored.
    await takeAction({
      targetUserId: "u1",
      action: "NUDGE",
      reason: "OTHER",
      ...({ actor: "president-of-the-world" } as object),
    });
    const arg = createSpy.mock.calls[0]![0] as { data: { actor: string; actorType: string } };
    expect(arg.data.actor).toBe("admin-real");
    expect(arg.data.actorType).toBe("HUMAN");
  });
});

// ─── Gap 1: impersonation via caller-supplied reporter id is unrepresentable ────

describe("fileReport derives the reporter from the session", () => {
  it("persists reporterUserId = the session subject id", async () => {
    mockUserSession("reporter-real");
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.moderationReport, "create").mockResolvedValue({} as never);
    await fileReport({
      targetUserId: "u2",
      contentRef: "c1",
      surface: "chat",
      reason: "OTHER",
      // A smuggled reporterUserId is ignored — not part of the contract.
      ...({ reporterUserId: "someone-else" } as object),
    });
    const arg = createSpy.mock.calls[0]![0] as { data: { reporterUserId: string } };
    expect(arg.data.reporterUserId).toBe("reporter-real");
  });

  it("requires a session (an unauthenticated caller cannot file an *authenticated* report)", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      fileReport({ targetUserId: "u2", contentRef: "c1", surface: "chat", reason: "OTHER" })
    ).rejects.toThrow(UnauthenticatedError);
  });
});

// ─── Anonymous report: always null reporter + rate limited ─────────────────────

describe("fileAnonymousReport", () => {
  it("always persists reporterUserId = null, even with a session present", async () => {
    mockAdminSession("admin-1");
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.moderationReport, "create").mockResolvedValue({} as never);
    await fileAnonymousReport({
      targetUserId: "u2",
      contentRef: "c1",
      surface: "chat",
      reason: "OTHER",
      clientFingerprint: "fp-1",
    });
    const arg = createSpy.mock.calls[0]![0] as { data: { reporterUserId: string | null } };
    expect(arg.data.reporterUserId).toBeNull();
  });

  it("rejects a missing fingerprint (fail closed) and never writes", async () => {
    const { db } = await import("@sports/db");
    const createSpy = vi.spyOn(db.moderationReport, "create");
    await expect(
      fileAnonymousReport({ targetUserId: "u2", contentRef: "c1", surface: "chat", reason: "OTHER" })
    ).rejects.toThrow(/fingerprint/i);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("rate-limits a flood from one fingerprint", async () => {
    const { db } = await import("@sports/db");
    vi.spyOn(db.moderationReport, "create").mockResolvedValue({} as never);
    const cfg = { maxPerWindow: 3, windowMs: 60_000 };
    const body = { targetUserId: "u2", contentRef: "c1", surface: "chat", reason: "OTHER" as const, clientFingerprint: "flooder" };
    await fileAnonymousReport(body, cfg);
    await fileAnonymousReport(body, cfg);
    await fileAnonymousReport(body, cfg);
    await expect(fileAnonymousReport(body, cfg)).rejects.toThrow(/too many/i);
  });
});

// ─── Gap 2: cross-user appeal is rejected; appellant derived from session ──────

describe("appealAction proves ownership", () => {
  it("rejects an appeal of an action taken against a DIFFERENT user (cross-user appeal)", async () => {
    mockUserSession("attacker");
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAction.findUnique).mockResolvedValue(SUSPEND_ACTION as never);
    const createSpy = vi.spyOn(db.moderationAppeal, "create");
    await expect(
      appealAction({ actionId: "a1", grounds: "let me out" })
    ).rejects.toThrow(ForbiddenError);
    // The attacker never consumes the victim's single allowed appeal.
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("allows the actual target to appeal, persisting appellantId = session id", async () => {
    mockUserSession("victim");
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAction.findUnique).mockResolvedValue(SUSPEND_ACTION as never);
    vi.mocked(db.moderationAppeal.findUnique).mockResolvedValue(null);
    const createSpy = vi.spyOn(db.moderationAppeal, "create").mockResolvedValue({} as never);
    await appealAction({ actionId: "a1", grounds: "not me" });
    const arg = createSpy.mock.calls[0]![0] as { data: { appellantId: string } };
    expect(arg.data.appellantId).toBe("victim");
  });

  it("requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(appealAction({ actionId: "a1", grounds: "x" })).rejects.toThrow(UnauthenticatedError);
  });
});

// ─── Gap 4: different-reviewer rule enforced on TRUSTED stable ids ─────────────

describe("decideAppeal different-reviewer rule (trusted ids)", () => {
  const appealWithAction = {
    id: "ap1",
    actionId: "a1",
    appellantId: "victim",
    grounds: "g",
    status: "PENDING" as const,
    decidedBy: null,
    decision: null,
    decidedAt: null,
    slaDeadline: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    action: { ...SUSPEND_ACTION, actor: "admin-same" },
  };

  it("rejects when the trusted admin reviewer IS the original actor — cannot be bypassed with a fabricated string", async () => {
    // The reviewer's identity is the session subject id, not a caller field.
    mockAdminSession("admin-same");
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAppeal.findUnique).mockResolvedValue(appealWithAction as never);
    const updateSpy = vi.spyOn(db.moderationAppeal, "update");
    await expect(
      decideAppeal({ appealId: "ap1", decision: "upheld", status: "UPHELD" })
    ).rejects.toThrow(/different reviewer/i);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("allows a DIFFERENT trusted admin and persists decidedBy = reviewer session id", async () => {
    mockAdminSession("admin-different");
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAppeal.findUnique).mockResolvedValue(appealWithAction as never);
    const updateSpy = vi.spyOn(db.moderationAppeal, "update").mockResolvedValue({} as never);
    await decideAppeal({ appealId: "ap1", decision: "overturned", status: "OVERTURNED" });
    const arg = updateSpy.mock.calls[0]![0] as { data: { decidedBy: string; reviewerType: string } };
    expect(arg.data.decidedBy).toBe("admin-different");
    expect(arg.data.reviewerType).toBe("HUMAN");
  });
});

// ─── Happy path still enforces existing laws ───────────────────────────────────

describe("takeAction — happy path with an admin session", () => {
  it("persists a NUDGE action", async () => {
    mockAdminSession();
    const { db } = await import("@sports/db");
    vi.spyOn(db.moderationAction, "create").mockResolvedValue({} as never);
    await expect(
      takeAction({ targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).resolves.not.toThrow();
  });
});
