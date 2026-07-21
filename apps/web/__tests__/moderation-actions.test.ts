/**
 * Moderation server-action tests — no prior coverage existed for this module.
 *
 * Primary focus: the actor-authorization boundary added in this change.
 * takeAction/decideAppeal/listOpenReports/listActions/auditLog now require an
 * authenticated ADMIN session (requireAdminActor()); fileReport/appealAction
 * remain intentionally ungated (user-facing — anyone should be able to file a
 * report or appeal their own action).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

function mockAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@gsn.example", role: "ADMIN" } });
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
}));

import {
  fileReport,
  takeAction,
  appealAction,
  decideAppeal,
  listOpenReports,
  listActions,
  auditLog,
} from "@/lib/community/moderation-actions";
import { UnauthenticatedError, ForbiddenError } from "@/lib/auth/actor";

beforeEach(() => {
  mockAdminSession();
  vi.clearAllMocks();
  mockAdminSession(); // clearAllMocks wipes the mockResolvedValue too — reset after
});

describe("admin-gated actions reject unauthenticated/non-admin callers", () => {
  it("takeAction requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      takeAction({ actor: "mod1", targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow(UnauthenticatedError);
  });

  it("takeAction requires ADMIN role, not just any session", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "user@example.com", role: "USER" } });
    await expect(
      takeAction({ actor: "mod1", targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("decideAppeal requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      decideAppeal({ appealId: "a1", reviewer: "mod2", decision: "upheld", status: "UPHELD" })
    ).rejects.toThrow(UnauthenticatedError);
  });

  it("listOpenReports requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(listOpenReports()).rejects.toThrow(UnauthenticatedError);
  });

  it("listActions requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(listActions("u1")).rejects.toThrow(UnauthenticatedError);
  });

  it("auditLog requires a session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(auditLog("content-1")).rejects.toThrow(UnauthenticatedError);
  });

  it("auth is checked before any DB call — unauthenticated calls never touch the store", async () => {
    mockAuth.mockResolvedValue(null);
    const { db } = await import("@sports/db");
    const findManySpy = vi.spyOn(db.moderationAction, "findMany");
    await expect(listActions("u1")).rejects.toThrow(UnauthenticatedError);
    expect(findManySpy).not.toHaveBeenCalled();
  });
});

describe("user-facing actions remain ungated", () => {
  it("fileReport does not require a session", async () => {
    mockAuth.mockResolvedValue(null);
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationReport.create).mockResolvedValue({
      id: "r1",
      reporterUserId: null,
      targetUserId: "u1",
      contentRef: "c1",
      surface: "chat",
      reason: "OTHER",
      notes: null,
      status: "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedBy: null,
      resolvedAt: null,
    });
    await expect(
      fileReport({ targetUserId: "u1", contentRef: "c1", surface: "chat", reason: "OTHER" })
    ).resolves.not.toThrow();
  });

  it("appealAction does not require a session", async () => {
    mockAuth.mockResolvedValue(null);
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAction.findUnique).mockResolvedValue({
      id: "a1",
      actor: "mod1",
      targetUserId: "u1",
      contentRef: null,
      surface: null,
      action: "SUSPEND",
      reason: "OTHER",
      notes: null,
      reportId: null,
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
    });
    vi.mocked(db.moderationAppeal.findUnique).mockResolvedValue(null);
    vi.mocked(db.moderationAppeal.create).mockResolvedValue({
      id: "ap1",
      actionId: "a1",
      appellantId: "u1",
      grounds: "not me",
      status: "PENDING",
      slaDeadline: new Date(),
      decidedBy: null,
      decision: null,
      decidedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(
      appealAction({ actionId: "a1", appellantId: "u1", grounds: "not me" })
    ).resolves.not.toThrow();
  });
});

describe("takeAction — happy path with an admin session", () => {
  it("persists a NUDGE action", async () => {
    mockAdminSession();
    const { db } = await import("@sports/db");
    vi.mocked(db.moderationAction.create).mockResolvedValue({
      id: "act1",
      actor: "mod1",
      targetUserId: "u1",
      contentRef: null,
      surface: null,
      action: "NUDGE",
      reason: "OTHER",
      notes: null,
      reportId: null,
      expiresAt: null,
      createdAt: new Date(),
    });
    await expect(
      takeAction({ actor: "mod1", targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).resolves.not.toThrow();
  });

  it("still enforces the existing actor+reason law even for an authorized caller", async () => {
    mockAdminSession();
    await expect(
      takeAction({ actor: "", targetUserId: "u1", action: "NUDGE", reason: "OTHER" })
    ).rejects.toThrow();
  });
});
