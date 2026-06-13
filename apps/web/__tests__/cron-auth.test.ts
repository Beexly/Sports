import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronAuth } from "../lib/cron/auth";

function makeRequest(authHeader: string): Request {
  return new Request("http://localhost/api/cron/test", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("verifyCronAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, CRON_SECRET: "super-secret-token-32chars!" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null (authorized) when token matches", async () => {
    const req = makeRequest("Bearer super-secret-token-32chars!");
    expect(verifyCronAuth(req)).toBeNull();
  });

  it("returns 401 when token does not match", async () => {
    const req = makeRequest("Bearer wrong-token-of-equal-length!!!");
    const res = verifyCronAuth(req);
    expect(res?.status).toBe(401);
  });

  it("returns 401 for missing authorization header", async () => {
    const req = makeRequest("");
    const res = verifyCronAuth(req);
    expect(res?.status).toBe(401);
  });

  it("returns 401 when token length differs", async () => {
    const req = makeRequest("Bearer short");
    const res = verifyCronAuth(req);
    expect(res?.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET is not set", async () => {
    delete process.env["CRON_SECRET"];
    const req = makeRequest("Bearer anything");
    const res = verifyCronAuth(req);
    expect(res?.status).toBe(500);
  });

  it("returns 401 for token without Bearer prefix", async () => {
    const req = makeRequest("super-secret-token-32chars!");
    const res = verifyCronAuth(req);
    expect(res?.status).toBe(401);
  });
});
