import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { sleep } from "./workflow";

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for string durations with units", async () => {
    let finished = false;
    const promise = sleep("100ms").then(() => {
      finished = true;
    });

    vi.advanceTimersByTime(99);
    await Promise.resolve();
    expect(finished).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(finished).toBe(true);
  });

  it("accepts numeric milliseconds", async () => {
    let finished = false;
    const promise = sleep(5).then(() => {
      finished = true;
    });

    vi.advanceTimersByTime(5);
    await promise;
    expect(finished).toBe(true);
  });

  it("throws for invalid duration strings", () => {
    expect(() => sleep("bad-value")).toThrow('Invalid duration "bad-value"');
  });
});
