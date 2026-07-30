/**
 * Dual CRON_SECRET / CRON_SECRET_PREVIOUS via shared cronAuthError.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cronAuthError, authorizeCronRequest } from "@/lib/cron/authorize";

describe("cronAuthError dual-secret", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env["CRON_SECRET"] = "primary-secret-value";
    process.env["CRON_SECRET_PREVIOUS"] = "previous-secret-value";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  function req(auth: string | null): Request {
    const headers = new Headers();
    if (auth) headers.set("authorization", auth);
    return new Request("http://localhost/api/cron/gamma", { headers });
  }

  it("401 without auth", () => {
    const r = cronAuthError(req(null));
    expect(r).not.toBeNull();
    expect(r!.status).toBe(401);
  });

  it("401 wrong secret", () => {
    const r = cronAuthError(req("Bearer wrong"));
    expect(r).not.toBeNull();
    expect(r!.status).toBe(401);
  });

  it("null (ok) on primary", () => {
    expect(cronAuthError(req("Bearer primary-secret-value"))).toBeNull();
  });

  it("null (ok) on previous during rotation", () => {
    expect(cronAuthError(req("Bearer previous-secret-value"))).toBeNull();
  });

  it("500 when neither secret configured", () => {
    delete process.env["CRON_SECRET"];
    delete process.env["CRON_SECRET_PREVIOUS"];
    const r = cronAuthError(req("Bearer anything"));
    expect(r).not.toBeNull();
    expect(r!.status).toBe(500);
  });

  it("authorizeCronRequest reports matched previous", () => {
    const r = authorizeCronRequest(req("Bearer previous-secret-value"));
    expect(r.ok).toBe(true);
    expect(r.matched).toBe("previous");
  });
});
