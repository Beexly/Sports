import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronAuth, checkCronAuth } from "@/lib/cron-auth";

describe("verifyCronAuth — constant-time Bearer token verification", () => {
  it("returns true for a valid token", () => {
    expect(verifyCronAuth("Bearer secret123", "secret123")).toBe(true);
  });

  it("returns false for wrong secret", () => {
    expect(verifyCronAuth("Bearer wrong", "secret123")).toBe(false);
  });

  it("returns false when Bearer prefix is missing", () => {
    expect(verifyCronAuth("secret123", "secret123")).toBe(false);
  });

  it("returns false for an empty header", () => {
    expect(verifyCronAuth("", "secret123")).toBe(false);
  });

  it("returns false for a token that is one character different", () => {
    expect(verifyCronAuth("Bearer secret124", "secret123")).toBe(false);
  });
});

describe("checkCronAuth — route-level guard", () => {
  const originalSecret = process.env["CRON_SECRET"];

  beforeEach(() => {
    process.env["CRON_SECRET"] = "test-cron-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env["CRON_SECRET"];
    } else {
      process.env["CRON_SECRET"] = originalSecret;
    }
  });

  it("returns null (pass) for a valid Authorization header", () => {
    const req = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    expect(checkCronAuth(req)).toBeNull();
  });

  it("returns 401 for an invalid token", async () => {
    const req = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = checkCronAuth(req);
    expect(res?.status).toBe(401);
  });

  it("returns 401 for a missing Authorization header", async () => {
    const req = new Request("http://localhost/api/cron/test");
    const res = checkCronAuth(req);
    expect(res?.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const req = new Request("http://localhost/api/cron/test", {
      headers: { authorization: "Bearer anything" },
    });
    const res = checkCronAuth(req);
    expect(res?.status).toBe(500);
  });
});
