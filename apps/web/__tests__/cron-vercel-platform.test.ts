import { describe, expect, it, afterEach } from "vitest";
import { cronAuthError, cronAuthErrorBearerOnly, isVercelPlatformCron } from "@/lib/cron/authorize";

describe("vercel platform cron auth", () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env = { ...prev };
  });

  it("accepts x-vercel-cron on VERCEL=1 without bearer", () => {
    process.env["VERCEL"] = "1";
    process.env["CRON_SECRET"] = "secret";
    const req = new Request("https://example.com/api/cron/board-fill", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(isVercelPlatformCron(req)).toBe(true);
    expect(cronAuthError(req)).toBeNull();
  });

  it("rejects spoofed x-vercel-cron off Vercel", () => {
    delete process.env["VERCEL"];
    process.env["CRON_SECRET"] = "secret";
    const req = new Request("https://example.com/api/cron/board-fill", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(isVercelPlatformCron(req)).toBe(false);
    expect(cronAuthError(req)?.status).toBe(401);
  });
});

  it("bearer_only rejects platform header without Bearer", () => {
    process.env["VERCEL"] = "1";
    process.env["CRON_SECRET"] = "secret";
    const req = new Request("https://example.com/api/cron/autonomy-cycle", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(cronAuthErrorBearerOnly(req)?.status).toBe(401);
    expect(cronAuthError(req, { mode: "bearer_only" })?.status).toBe(401);
  });

  it("bearer_only accepts Bearer on Vercel", () => {
    process.env["VERCEL"] = "1";
    process.env["CRON_SECRET"] = "secret";
    const req = new Request("https://example.com/api/cron/autonomy-cycle", {
      headers: {
        "x-vercel-cron": "1",
        authorization: "Bearer secret",
      },
    });
    expect(cronAuthErrorBearerOnly(req)).toBeNull();
  });

  it("CRON_REQUIRE_BEARER forces bearer globally", () => {
    process.env["VERCEL"] = "1";
    process.env["CRON_SECRET"] = "secret";
    process.env["CRON_REQUIRE_BEARER"] = "true";
    const platformOnly = new Request("https://example.com/api/cron/board-fill", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(cronAuthError(platformOnly)?.status).toBe(401);
    const withBearer = new Request("https://example.com/api/cron/board-fill", {
      headers: { "x-vercel-cron": "1", authorization: "Bearer secret" },
    });
    expect(cronAuthError(withBearer)).toBeNull();
  });
