import { describe, it, expect, vi } from "vitest";
import {
  listPushSubscriptionsForUser,
  upsertPushSubscription,
  deletePushSubscription,
  isTableMissingError,
  isDatabaseUnreachableError,
} from "./subscription-db";

function row(
  overrides: Partial<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date }> = {},
) {
  return {
    id: "push-1",
    userId: "user-1",
    endpoint: "https://push.example.com/abc",
    p256dh: "p256dh-key",
    auth: "auth-key",
    createdAt: new Date("2026-07-19T00:00:00.000Z"),
    ...overrides,
  };
}

describe("isTableMissingError / isDatabaseUnreachableError", () => {
  it("recognizes Prisma P2021", () => {
    expect(isTableMissingError({ code: "P2021" })).toBe(true);
  });

  it("recognizes the raw Postgres message even without a code", () => {
    expect(
      isTableMissingError(new Error('relation "push_subscriptions" does not exist in the current database')),
    ).toBe(true);
  });

  it("does not misclassify an unrelated error", () => {
    expect(isTableMissingError(new Error("boom"))).toBe(false);
  });

  it("recognizes Prisma P1001", () => {
    expect(isDatabaseUnreachableError({ code: "P1001" })).toBe(true);
  });
});

describe("listPushSubscriptionsForUser", () => {
  it("returns stored rows on success", async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const result = await listPushSubscriptionsForUser({ pushSubscription: { findMany } }, "user-1");
    expect(result).toEqual({ ok: true, data: [row()] });
    expect(findMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("degrades to table_missing instead of throwing", async () => {
    const findMany = vi.fn().mockRejectedValue({ code: "P2021" });
    const result = await listPushSubscriptionsForUser({ pushSubscription: { findMany } }, "user-1");
    expect(result).toEqual({ ok: false, reason: "table_missing" });
  });
});

describe("upsertPushSubscription", () => {
  it("upserts keyed on endpoint", async () => {
    const upsert = vi.fn().mockResolvedValue(row());
    const result = await upsertPushSubscription(
      { pushSubscription: { upsert } },
      "user-1",
      "https://push.example.com/abc",
      "p256dh-key",
      "auth-key",
    );
    expect(result).toEqual({ ok: true, data: row() });
    expect(upsert).toHaveBeenCalledWith({
      where: { endpoint: "https://push.example.com/abc" },
      create: { userId: "user-1", endpoint: "https://push.example.com/abc", p256dh: "p256dh-key", auth: "auth-key" },
      update: { userId: "user-1", p256dh: "p256dh-key", auth: "auth-key" },
    });
  });

  it("degrades to unreachable instead of throwing", async () => {
    const upsert = vi.fn().mockRejectedValue({ code: "P1001" });
    const result = await upsertPushSubscription(
      { pushSubscription: { upsert } },
      "user-1",
      "https://push.example.com/abc",
      "p256dh-key",
      "auth-key",
    );
    expect(result).toEqual({ ok: false, reason: "unreachable" });
  });
});

describe("deletePushSubscription", () => {
  it("scopes deletion to (userId, endpoint) and reports deleted:true on a real delete", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const result = await deletePushSubscription(
      { pushSubscription: { deleteMany } },
      "user-1",
      "https://push.example.com/abc",
    );
    expect(result).toEqual({ ok: true, data: { deleted: true } });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", endpoint: "https://push.example.com/abc" },
    });
  });

  it("idempotent: deleting a non-owned or nonexistent endpoint returns deleted:false, not an error", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const result = await deletePushSubscription(
      { pushSubscription: { deleteMany } },
      "user-1",
      "https://push.example.com/someone-elses",
    );
    expect(result).toEqual({ ok: true, data: { deleted: false } });
  });

  it("degrades DB errors instead of throwing", async () => {
    const deleteMany = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await deletePushSubscription(
      { pushSubscription: { deleteMany } },
      "user-1",
      "https://push.example.com/abc",
    );
    expect(result).toEqual({ ok: false, reason: "error", message: "boom" });
  });
});
