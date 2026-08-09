import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { cronAuthError, isVercelPlatformCron } from "@/lib/cron/authorize";

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
