import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { withTelemetry, type TelemetryRecord } from "@/lib/ai/telemetry";

function captureLog(): { logs: TelemetryRecord[]; errs: TelemetryRecord[]; restore: () => void } {
  const logs: TelemetryRecord[] = [];
  const errs: TelemetryRecord[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (line: unknown) => {
    if (typeof line === "string") {
      try {
        logs.push(JSON.parse(line) as TelemetryRecord);
      } catch {
        // not our JSON line — ignore
      }
    }
  };
  console.error = (line: unknown) => {
    if (typeof line === "string") {
      try {
        errs.push(JSON.parse(line) as TelemetryRecord);
      } catch {
        // ignore
      }
    }
  };
  return {
    logs,
    errs,
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

describe("withTelemetry", () => {
  beforeEach(() => {
    // Force the "vercel-mode" branch so we skip filesystem writes in tests —
    // we only assert on what's emitted to stdout/stderr.
    process.env["VERCEL"] = "1";
  });

  afterEach(() => {
    delete process.env["VERCEL"];
  });

  it("captures usage fields from the wrapped response on success", async () => {
    const cap = captureLog();
    try {
      const result = await withTelemetry(
        { callSite: "test-call", model: "claude-haiku-4-5" },
        async () => ({
          usage: {
            input_tokens: 100,
            cache_creation_input_tokens: 200,
            cache_read_input_tokens: 50,
            output_tokens: 25,
          },
          content: ["whatever"],
        })
      );
      expect(result.content).toEqual(["whatever"]);
      expect(cap.logs).toHaveLength(1);
      const rec = cap.logs[0]!;
      expect(rec.callSite).toBe("test-call");
      expect(rec.model).toBe("claude-haiku-4-5");
      expect(rec.inputTokens).toBe(100);
      expect(rec.cacheCreationInputTokens).toBe(200);
      expect(rec.cacheReadInputTokens).toBe(50);
      expect(rec.outputTokens).toBe(25);
      expect(rec.status).toBe("ok");
      expect(rec.errorClass).toBeUndefined();
      expect(rec.latencyMs).toBeGreaterThanOrEqual(0);
      expect(rec.ts).toMatch(/T/);
    } finally {
      cap.restore();
    }
  });

  it("defaults missing usage fields to 0 (no NaN, no undefined leaks)", async () => {
    const cap = captureLog();
    try {
      await withTelemetry(
        { callSite: "minimal", model: "claude-sonnet-4-6" },
        async () => ({ content: [] } as unknown as { usage?: null })
      );
      expect(cap.logs).toHaveLength(1);
      const rec = cap.logs[0]!;
      expect(rec.inputTokens).toBe(0);
      expect(rec.cacheCreationInputTokens).toBe(0);
      expect(rec.cacheReadInputTokens).toBe(0);
      expect(rec.outputTokens).toBe(0);
    } finally {
      cap.restore();
    }
  });

  it("records {status: error, errorClass} and re-throws when the wrapped fn throws", async () => {
    const cap = captureLog();
    try {
      class CustomBoom extends Error {}
      await expect(
        withTelemetry(
          { callSite: "fail-call", model: "claude-haiku-4-5" },
          async () => {
            throw new CustomBoom("kaboom");
          }
        )
      ).rejects.toThrow("kaboom");

      expect(cap.errs).toHaveLength(1);
      const rec = cap.errs[0]!;
      expect(rec.status).toBe("error");
      expect(rec.errorClass).toBe("CustomBoom");
      expect(rec.callSite).toBe("fail-call");
      expect(rec.inputTokens).toBe(0);
    } finally {
      cap.restore();
    }
  });

  it("never swallows: success path goes to stdout, error path goes to stderr", async () => {
    const cap = captureLog();
    try {
      await withTelemetry(
        { callSite: "ok", model: "claude-haiku-4-5" },
        async () => ({ content: [], usage: { input_tokens: 1 } })
      );
      await expect(
        withTelemetry({ callSite: "ko", model: "claude-haiku-4-5" }, async () => {
          throw new Error("x");
        })
      ).rejects.toThrow();
      expect(cap.logs.map((r) => r.callSite)).toEqual(["ok"]);
      expect(cap.errs.map((r) => r.callSite)).toEqual(["ko"]);
    } finally {
      cap.restore();
    }
  });

  it("handles a non-Error throw (string, number) without crashing", async () => {
    const cap = captureLog();
    try {
      const nonErrorThrow = "string not error";
      await expect(
        withTelemetry({ callSite: "weird", model: "m" }, async () => {
          return Promise.reject(nonErrorThrow);
        })
      ).rejects.toBe(nonErrorThrow);
      expect(cap.errs).toHaveLength(1);
      expect(cap.errs[0]!.errorClass).toBe("Unknown");
    } finally {
      cap.restore();
    }
  });
});
