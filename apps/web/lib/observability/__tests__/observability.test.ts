import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logger,
  createChildLogger,
  captureError,
  captureEvent,
  isErrorCaptureEnabled,
  isEventCaptureEnabled,
} from "@/lib/observability";

/**
 * The observability layer must be a safe no-op without provider keys:
 * helpers never throw, never egress, and produce correctly-shaped local logs.
 */

const PROVIDER_KEYS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  // Snapshot then clear every provider key so the default state is "no keys".
  for (const key of PROVIDER_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  // Keep the logger emitting (debug-level events) so we can assert shape.
  savedEnv["LOG_LEVEL"] = process.env["LOG_LEVEL"];
  process.env["LOG_LEVEL"] = "debug";
});

afterEach(() => {
  for (const key of [...PROVIDER_KEYS, "LOG_LEVEL"]) {
    const prev = savedEnv[key];
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
  vi.restoreAllMocks();
});

describe("capture enablement (presence-only, no keys)", () => {
  it("reports both capture providers disabled when no env keys are set", () => {
    expect(isErrorCaptureEnabled()).toBe(false);
    expect(isEventCaptureEnabled()).toBe(false);
  });

  it("treats an empty-string env key as not configured", () => {
    process.env["SENTRY_DSN"] = "";
    expect(isErrorCaptureEnabled()).toBe(false);
  });

  it("flips to enabled once a provider key is present", () => {
    process.env["POSTHOG_KEY"] = "phc_test";
    expect(isEventCaptureEnabled()).toBe(true);
  });
});

describe("captureError no-op without keys", () => {
  it("does not throw for Error or non-Error inputs", () => {
    expect(() => captureError(new Error("boom"))).not.toThrow();
    expect(() => captureError("plain string")).not.toThrow();
    expect(() => captureError(undefined)).not.toThrow();
    expect(() => captureError({ weird: true }, { surface: "test" })).not.toThrow();
  });

  it("emits a local error line tagged provider:none and never egresses", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captureError(new Error("kaboom"), { surface: "picks" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("captured_error");
    expect(line).toContain('"provider":"none"');
    expect(line).toContain("kaboom");
  });

  it("stays a no-op for every wired seam surface (boundaries + catch sites)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // The surface tags wired into the error boundaries and catch seams.
    const surfaces = [
      { surface: "global", digest: "d1" },
      { surface: "app-root", digest: "d2" },
      { surface: "cockpit", digest: "d3" },
      { surface: "cron:refresh-odds", sport: "nfl" },
      { surface: "board:state", degraded: "board_data_unavailable" },
      { surface: "board:passes", degraded: "pass_list_unavailable" },
      { surface: "health:database" },
      { surface: "health:ingestion" },
    ] as const;
    for (const context of surfaces) {
      expect(() => captureError(new Error("seam"), context)).not.toThrow();
    }
    // One local log line per call, all tagged provider:none (no egress).
    expect(spy).toHaveBeenCalledTimes(surfaces.length);
    for (const call of spy.mock.calls) {
      const line = String(call[0] ?? "");
      expect(line).toContain("captured_error");
      expect(line).toContain('"provider":"none"');
    }
  });
});

describe("captureEvent no-op without keys", () => {
  it("does not throw with or without props", () => {
    expect(() => captureEvent("pick_viewed")).not.toThrow();
    expect(() => captureEvent("pick_viewed", { pickId: "p1" })).not.toThrow();
  });

  it("emits a local debug line tagged provider:none", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    captureEvent("pick_published", { pickId: "p1" });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("captured_event");
    expect(line).toContain("pick_published");
    expect(line).toContain('"provider":"none"');
  });
});

describe("logger shape and level threshold", () => {
  it("routes warn/error to the matching console sink", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.warn("a_warning");
    logger.error("an_error");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("includes the message and merged fields in output", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("hello", { a: 1 });
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("hello");
    expect(line).toContain('"a":1');
  });

  it("child loggers stamp bindings onto every entry", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const child = createChildLogger({ requestId: "req-1" });
    child.info("scoped");
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("scoped");
    expect(line).toContain('"requestId":"req-1"');
  });

  it("drops entries below the configured LOG_LEVEL", () => {
    process.env["LOG_LEVEL"] = "warn";
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    // A fresh logger reads LOG_LEVEL at construction time.
    const scoped = createChildLogger({});
    scoped.info("should_be_dropped");
    scoped.debug("also_dropped");
    expect(spy).not.toHaveBeenCalled();
  });

  it("never throws on circular field structures", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(() => logger.info("circular", circular)).not.toThrow();
  });
});
