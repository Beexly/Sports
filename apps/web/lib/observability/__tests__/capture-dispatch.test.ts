import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { captureError, captureEvent } from "@/lib/observability";

/**
 * Provider dispatch (R-10).
 *
 * With a provider key present, captureError/captureEvent must POST a minimal
 * payload to that provider — fire-and-forget, failures swallowed. Without a
 * key the inert contract holds exactly: local log line only, ZERO egress.
 * Every test stubs the global fetch so nothing ever leaves the box, and
 * asserts the key value never appears in any local log line.
 */

const ENV_KEYS = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_HOST",
] as const;

const TEST_DSN = "https://publickey123@o999.ingest.sentry.io/4242";
const TEST_POSTHOG_KEY = "phc_dispatch_test_key";

const savedEnv: Record<string, string | undefined> = {};
const fetchMock = vi.fn();

/** Let the fire-and-forget promise chain settle (and surface any unhandled rejection). */
async function flushDispatch(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function fetchCall(index: number): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls[index] ?? [];
  return { url: String(call[0]), init: (call[1] ?? {}) as RequestInit };
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 202 });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const prev = savedEnv[key];
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("inert-without-keys contract (zero egress)", () => {
  it("never calls fetch when no provider keys are set", async () => {
    captureError(new Error("boom"), { surface: "test" });
    captureEvent("pick_viewed", { pickId: "p1" });
    await flushDispatch();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not cross-wire providers: an event key alone never dispatches errors (and vice versa)", async () => {
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    captureError(new Error("boom"));
    await flushDispatch();
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env["POSTHOG_KEY"];
    process.env["SENTRY_DSN"] = TEST_DSN;
    captureEvent("pick_viewed");
    await flushDispatch();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("captureError dispatch with SENTRY_DSN", () => {
  it("POSTs a Sentry-compatible envelope to the ingest URL derived from the DSN", async () => {
    process.env["SENTRY_DSN"] = TEST_DSN;
    captureError(new Error("kaboom"), { surface: "picks" });
    await flushDispatch();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = fetchCall(0);
    expect(url).toBe("https://o999.ingest.sentry.io/api/4242/envelope/");
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const lines = String(init.body).split("\n");
    expect(lines).toHaveLength(3);
    const header = JSON.parse(lines[0] ?? "{}");
    expect(header.dsn).toBe(TEST_DSN);
    expect(typeof header.event_id).toBe("string");
    const item = JSON.parse(lines[1] ?? "{}");
    expect(item.type).toBe("event");
    const event = JSON.parse(lines[2] ?? "{}");
    expect(event.level).toBe("error");
    expect(event.exception.values[0].type).toBe("Error");
    expect(event.exception.values[0].value).toBe("kaboom");
    expect(event.extra.surface).toBe("picks");
  });

  it("still writes the local log line, tagged provider:configured, WITHOUT the key value", async () => {
    process.env["SENTRY_DSN"] = TEST_DSN;
    const errorSpy = vi.spyOn(console, "error");
    captureError(new Error("kaboom"), { surface: "picks" });
    await flushDispatch();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = String(errorSpy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("captured_error");
    expect(line).toContain('"provider":"configured"');
    expect(line).not.toContain("publickey123");
    expect(line).not.toContain(TEST_DSN);
  });

  it("does not egress (and does not throw) when the DSN is malformed", async () => {
    for (const badDsn of ["not-a-dsn", "https://o999.ingest.sentry.io/4242", "https://key@host/"]) {
      process.env["SENTRY_DSN"] = badDsn;
      expect(() => captureError(new Error("boom"))).not.toThrow();
    }
    await flushDispatch();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("captureEvent dispatch with POSTHOG_KEY", () => {
  it("POSTs to the PostHog capture API with the event name and properties", async () => {
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    captureEvent("pick_published", { pickId: "p1" });
    await flushDispatch();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = fetchCall(0);
    expect(url).toBe("https://us.i.posthog.com/capture/");
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(String(init.body));
    expect(body.api_key).toBe(TEST_POSTHOG_KEY);
    expect(body.event).toBe("pick_published");
    expect(body.distinct_id).toBe("server");
    expect(body.properties.pickId).toBe("p1");
  });

  it("honors a POSTHOG_HOST override (trailing slash trimmed)", async () => {
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    process.env["POSTHOG_HOST"] = "https://eu.i.posthog.com/";
    captureEvent("pick_published");
    await flushDispatch();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchCall(0).url).toBe("https://eu.i.posthog.com/capture/");
  });

  it("never puts the key in the local log line", async () => {
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    const logSpy = vi.spyOn(console, "log");
    captureEvent("pick_published", { pickId: "p1" });
    await flushDispatch();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = String(logSpy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("captured_event");
    expect(line).toContain('"provider":"configured"');
    expect(line).not.toContain(TEST_POSTHOG_KEY);
  });
});

describe("dispatch failures are swallowed (fire-and-forget)", () => {
  it("a rejecting fetch never throws into the caller's path", async () => {
    process.env["SENTRY_DSN"] = TEST_DSN;
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    fetchMock.mockRejectedValue(new Error("network down"));

    expect(() => captureError(new Error("boom"), { surface: "picks" })).not.toThrow();
    expect(() => captureEvent("pick_published")).not.toThrow();
    // Settling here would surface any unhandled rejection and fail the test.
    await flushDispatch();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a synchronously-throwing fetch never throws into the caller's path", async () => {
    process.env["SENTRY_DSN"] = TEST_DSN;
    process.env["POSTHOG_KEY"] = TEST_POSTHOG_KEY;
    fetchMock.mockImplementation(() => {
      throw new Error("fetch unavailable");
    });

    expect(() => captureError(new Error("boom"))).not.toThrow();
    expect(() => captureEvent("pick_published")).not.toThrow();
    await flushDispatch();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
