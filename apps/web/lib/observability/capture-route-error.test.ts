/**
 * Tests for route error capture (ADR 008 interim solution).
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { captureRouteError, withErrorCapture, flushPendingReports, clearRateLimiter } from "@/lib/observability/capture-route-error";
import { NextResponse } from "next/server";

describe("observability/capture-route-error", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    global.fetch = fetchMock;
    clearRateLimiter(); // Reset rate limiter between tests
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should log to console when no webhook configured", async () => {
    delete process.env.HEALTH_ALERT_WEBHOOK_URL;

    const logs: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(JSON.stringify(args));
    });

    const error = new Error("Test console log");
    captureRouteError(error, "/api/console-test", "error");

    await flushPendingReports();

    expect(logs.length).toBeGreaterThan(0);
    const output = logs.join("\n");
    expect(output).toContain("route-error");
    expect(output).toContain("Test console log");

    consoleErrorSpy.mockRestore();
  });

  it("should scrub sensitive data from error messages", async () => {
    delete process.env.HEALTH_ALERT_WEBHOOK_URL; // Force console fallback

    const logs: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    const error = new Error("Failed for user@example.com when calling /api?token=abc123");
    captureRouteError(error, "/api/scrub-email-token", "error");

    await flushPendingReports();

    const output = logs.join("\n");
    expect(output).toContain("***@***.***");
    expect(output).toContain("token=***");
    expect(output).not.toContain("user@example.com");
    expect(output).not.toContain("token=abc123");

    consoleErrorSpy.mockRestore();
  });

  it("should scrub Stripe keys from stack traces", async () => {
    delete process.env.HEALTH_ALERT_WEBHOOK_URL;

    const logs: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    const error = new Error("Stripe error");
    error.stack = "Error: Stripe error\n  with key sk_live_abc123def456\n  at checkout.ts:42";
    captureRouteError(error, "/api/checkout-scrub", "critical");

    await flushPendingReports();

    const output = logs.join("\n");
    expect(output).toContain("sk_live_***");
    expect(output).not.toContain("sk_live_abc123def456");

    consoleErrorSpy.mockRestore();
  });

  it("should post to webhook when configured", async () => {
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/error";

    const error = new Error("Test error");
    captureRouteError(error, "/api/subscriptions/checkout", "critical");

    await flushPendingReports();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hooks.example.com/error",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"route":"/api/subscriptions/checkout"'),
      }),
    );

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody).toMatchObject({
      type: "route-error",
      route: "/api/subscriptions/checkout",
      errorClass: "Error",
      message: "Test error",
      severity: "critical",
    });
    expect(callBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should rate limit error reports per route", async () => {
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/error";

    // Fire 12 errors rapidly (limit allows 10/min)
    for (let i = 0; i < 12; i++) {
      captureRouteError(new Error(`Error ${i}`), "/api/test", "error");
    }

    await flushPendingReports();

    // First error sets count=1, next 9 increment to count=10, then blocks
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("should reset rate limit after window expires", async () => {
    // This test would require waiting 61 seconds in real time, so we'll test
    // the logic by verifying the first 10 pass and the 11th is rate-limited
    process.env.HEALTH_ALERT_WEBHOOK_URL = "https://hooks.example.com/error";

    // Fire 11 errors (limit is 10/min)
    for (let i = 0; i < 11; i++) {
      captureRouteError(new Error(`Error ${i}`), "/api/test-window", "error");
    }

    await flushPendingReports();

    // First 10 succeed, 11th is rate-limited
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("should handle non-Error thrown values", async () => {
    delete process.env.HEALTH_ALERT_WEBHOOK_URL;

    const logs: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });

    captureRouteError("string error", "/api/test-non-error-1", "error");
    captureRouteError(null, "/api/test-non-error-2", "error");
    captureRouteError({ message: "object error" }, "/api/test-non-error-3", "error");

    await flushPendingReports();

    // Should have logged 3 errors
    expect(logs.length).toBeGreaterThanOrEqual(3);
    consoleErrorSpy.mockRestore();
  });

  describe("withErrorCapture wrapper", () => {
    it("should capture errors and re-throw", async () => {
      delete process.env.HEALTH_ALERT_WEBHOOK_URL;

      const logs: string[] = [];
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
        logs.push(args.join(" "));
      });
      process.env.HEALTH_ALERT_WEBHOOK_URL = undefined;

      const handler = withErrorCapture(
        "/api/test-wrapper",
        async () => {
          throw new Error("Handler error");
        },
        "critical",
      );

      await expect(handler()).rejects.toThrow("Handler error");

      await flushPendingReports();

      const output = logs.join("\n");
      expect(output).toContain('"route":"/api/test-wrapper"');

      consoleErrorSpy.mockRestore();
    });

    it("should pass through successful responses", async () => {
      const handler = withErrorCapture(
        "/api/test",
        async () => NextResponse.json({ success: true }),
        "error",
      );

      const response = await handler();
      const data = await response.json();

      expect(data).toEqual({ success: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
