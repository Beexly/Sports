import { describe, it, expect } from "vitest";
import { isAdminSession, ADMIN_ONLY_MESSAGE } from "@/lib/auth/require-admin";

describe("isAdminSession", () => {
  it("accepts a session whose user role is ADMIN", () => {
    expect(isAdminSession({ user: { role: "ADMIN" } })).toBe(true);
  });

  it("rejects null / undefined / missing user", () => {
    expect(isAdminSession(null)).toBe(false);
    expect(isAdminSession(undefined)).toBe(false);
    expect(isAdminSession({})).toBe(false);
    expect(isAdminSession({ user: null })).toBe(false);
  });

  it("rejects non-admin roles and missing role", () => {
    expect(isAdminSession({ user: { role: "USER" } })).toBe(false);
    expect(isAdminSession({ user: { role: "PREMIUM" } })).toBe(false);
    expect(isAdminSession({ user: { role: null } })).toBe(false);
    expect(isAdminSession({ user: {} })).toBe(false);
  });

  it("exposes a stable message constant", () => {
    expect(ADMIN_ONLY_MESSAGE).toMatch(/admin/i);
  });
});
