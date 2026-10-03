import { describe, it, expect } from "vitest";
import {
  idempotencyKey,
  retryDecision,
  buildFailureEntry,
  type JobSpec,
} from "@/lib/workers/orchestration-policy";

const settle: JobSpec = { jobType: "settle-picks", scopeKey: "NFL:2026-09-14" };

describe("worker orchestration policy", () => {
  it("idempotency key is deterministic per job+scope (dedupes double-settlement)", () => {
    expect(idempotencyKey(settle)).toBe(idempotencyKey({ ...settle }));
    expect(idempotencyKey(settle)).not.toBe(idempotencyKey({ ...settle, scopeKey: "NFL:2026-09-15" }));
    expect(idempotencyKey(settle).startsWith("settle-picks:")).toBe(true);
  });

  it("does nothing on success", () => {
    const d = retryDecision(1, "success");
    expect(d).toEqual({ retry: false, delayMs: 0, deadLetter: false });
  });

  it("dead-letters a permanent failure immediately", () => {
    const d = retryDecision(1, "permanent_failure");
    expect(d.deadLetter).toBe(true);
    expect(d.retry).toBe(false);
  });

  it("retries a transient failure with capped exponential backoff", () => {
    expect(retryDecision(1, "transient_failure").delayMs).toBe(2000);
    expect(retryDecision(2, "transient_failure").delayMs).toBe(4000);
    expect(retryDecision(3, "transient_failure").delayMs).toBe(8000);
    expect(retryDecision(1, "transient_failure", { baseDelayMs: 50000, maxDelayMs: 60000 }).delayMs).toBe(50000);
    expect(retryDecision(2, "transient_failure", { baseDelayMs: 50000, maxDelayMs: 60000 }).delayMs).toBe(60000); // capped
  });

  it("dead-letters a transient failure once attempts are exhausted", () => {
    const d = retryDecision(4, "transient_failure", { maxAttempts: 4 });
    expect(d.retry).toBe(false);
    expect(d.deadLetter).toBe(true);
  });

  it("builds a failure-ledger entry carrying the idempotency key + dead-letter flag", () => {
    const e = buildFailureEntry(settle, 4, "transient_failure", "scores feed timeout", "2026-09-14T18:00:00.000Z", { maxAttempts: 4 });
    expect(e.idempotencyKey).toBe(idempotencyKey(settle));
    expect(e.deadLettered).toBe(true);
    expect(e.error).toMatch(/timeout/);
  });
});
