/**
 * Tests for the ADR 008 interim route error reporter.
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRateLimiter,
  captureRouteError,
  flushPendingReports,
  withErrorCapture,
} from "@/lib/observability/capture-route-error";
import { NextResponse } from "next/server";

describe("observability/capture-route-error", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    clearRateLimiter();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("posts the minimal sanitized report to the existing webhook", async () => {
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/errors";

    const error = new Error("checkout failed for user@example.com?token=abc123");
    error.stack =
      "Error: checkout failed\n    at checkout.ts:42:9\n    at sk_live_SECRET";

    captureRouteError(error, "/api/subscriptions/checkout", "critical");
    await flushPendingReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(init.body).toEqual(
      expect.stringContaining('"route":"/api/subscriptions/checkout"'),
    );

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      type: "route-error",
      route: "/api/subscriptions/checkout",
      errorClass: "Error",
      message: "checkout failed for ***@***.***?token=***",
      severity: "critical",
    });
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.stack).toContain("checkout.ts:42:9");
    expect(body.stack).toContain("sk_live_***");
    expect(body.stack).not.toContain("user@example.com");
    expect(body.stack).not.toContain("abc123");
    expect(body.stack).not.toContain("sk_live_SECRET");
  });

  it("falls back without logging request context", async () => {
    delete process.env.HEALTH_ALERT_WEBHOOK_URL;
    const logs: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    captureRouteError(
      new Error("failed while loading /api/picks?email=person@example.com"),
      "/api/picks",
    );
    await flushPendingReports();

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("route-error");
    expect(logs[0]).toContain("person@example.com");
  });

  it("rate-limits reports per route", async () => {
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/errors";

    for (let index = 0; index < 12; index += 1) {
      captureRouteError(new Error(`error ${index}`), "/api/test");
    }
    await flushPendingReports();

    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("wraps a route handler, reports once, and rethrows", async () => {
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/errors";
    const handler = withErrorCapture(
      "/api/performance",
      async () => {
        throw new Error("performance failure");
      },
      "error",
    );

    await expect(handler()).rejects.toThrow("performance failure");
    await flushPendingReports();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({
      route: "/api/performance",
      errorClass: "Error",
      message: "performance failure",
    });
  });

  it("passes successful handler responses through unchanged", async () => {
    const handler = withErrorCapture(
      "/api/picks",
      async () => NextResponse.json({ success: true }),
      "error",
    );

    const response = await handler();
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
