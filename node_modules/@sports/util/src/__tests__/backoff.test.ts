import { describe, it, expect, vi } from "vitest";
import {
  computeBackoffMs,
  withJitteredBackoff,
  BackoffExhaustedError,
  isSerializationFailure,
  BACKOFF_DEFAULTS,
} from "../backoff";

describe("computeBackoffMs", () => {
  const zero = () => 0;
  const half = () => 0.5;

  it("none: pure exponential then cap", () => {
    expect(computeBackoffMs({ kind: "none", attempt: 1, baseMs: 20, capMs: 500, random: zero })).toBe(20);
    expect(computeBackoffMs({ kind: "none", attempt: 2, baseMs: 20, capMs: 500, random: zero })).toBe(40);
    expect(computeBackoffMs({ kind: "none", attempt: 3, baseMs: 20, capMs: 500, random: zero })).toBe(80);
    expect(computeBackoffMs({ kind: "none", attempt: 10, baseMs: 20, capMs: 500, random: zero })).toBe(500);
  });

  it("full: U(0, E) — zero rng → 0", () => {
    expect(computeBackoffMs({ kind: "full", attempt: 1, baseMs: 20, capMs: 500, random: zero })).toBe(0);
    expect(computeBackoffMs({ kind: "full", attempt: 2, baseMs: 20, capMs: 500, random: half })).toBe(20);
  });

  it("equal: E/2 + U(0, E/2)", () => {
    expect(computeBackoffMs({ kind: "equal", attempt: 1, baseMs: 20, capMs: 500, random: zero })).toBe(10);
    expect(computeBackoffMs({ kind: "equal", attempt: 1, baseMs: 20, capMs: 500, random: half })).toBe(15);
  });

  it("decorrelated: U(B, min(C, 3*prev))", () => {
    expect(
      computeBackoffMs({
        kind: "decorrelated",
        attempt: 1,
        baseMs: 20,
        capMs: 500,
        prevSleepMs: 20,
        random: zero,
      }),
    ).toBe(20);
    expect(
      computeBackoffMs({
        kind: "decorrelated",
        attempt: 2,
        baseMs: 20,
        capMs: 500,
        prevSleepMs: 20,
        random: half,
      }),
    ).toBe(40);
  });

  it("rejects invalid attempt / negative delays", () => {
    expect(() =>
      computeBackoffMs({ kind: "full", attempt: 0, baseMs: 20, capMs: 500 }),
    ).toThrow(RangeError);
    expect(() =>
      computeBackoffMs({ kind: "full", attempt: 1, baseMs: -1, capMs: 500 }),
    ).toThrow(RangeError);
  });
});

describe("withJitteredBackoff", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await withJitteredBackoff(fn, {
      isRetryable: () => true,
      sleep: async () => {},
      random: () => 0,
    });
    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries retryable errors then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "P2034" }))
      .mockResolvedValueOnce("ok");
    const sleeps: number[] = [];
    const result = await withJitteredBackoff(fn, {
      isRetryable: isSerializationFailure,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0,
      kind: "none",
      baseMs: 20,
      capMs: 500,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([20]);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("refuse-default"));
    await expect(
      withJitteredBackoff(fn, {
        isRetryable: () => false,
        maxAttempts: 5,
        sleep: async () => {},
      }),
    ).rejects.toThrow("refuse-default");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws BackoffExhaustedError after maxAttempts", async () => {
    const err = Object.assign(new Error("serialize"), { code: "P2034" });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(
      withJitteredBackoff(fn, {
        isRetryable: isSerializationFailure,
        maxAttempts: 3,
        kind: "full",
        sleep: async () => {},
        random: () => 0,
      }),
    ).rejects.toBeInstanceOf(BackoffExhaustedError);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("isSerializationFailure", () => {
  it("detects Prisma P2034 and message patterns", () => {
    expect(isSerializationFailure({ code: "P2034", message: "x" })).toBe(true);
    expect(isSerializationFailure(new Error("could not serialize access"))).toBe(true);
    expect(isSerializationFailure(new Error("SQLSTATE 40001"))).toBe(true);
    expect(isSerializationFailure(new Error("refuse-default"))).toBe(false);
    expect(isSerializationFailure(null)).toBe(false);
  });
});

describe("BACKOFF_DEFAULTS", () => {
  it("pins full jitter + tight budget", () => {
    expect(BACKOFF_DEFAULTS.kind).toBe("full");
    expect(BACKOFF_DEFAULTS.baseMs).toBe(20);
    expect(BACKOFF_DEFAULTS.capMs).toBe(500);
    expect(BACKOFF_DEFAULTS.maxAttempts).toBe(3);
  });
});
