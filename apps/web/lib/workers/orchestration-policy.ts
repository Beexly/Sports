/**
 * Worker Orchestration Policy — the pure decisions behind durable job processing.
 *
 * Moving ingestion/settlement to workers only helps if the jobs are SAFE to retry:
 * an idempotency key dedupes a job run twice on the same scope (so a retried
 * settlement can't double-settle), a bounded exponential backoff governs retries, and
 * a clear dead-letter rule routes the unrecoverable to a failure ledger for review.
 * This is the pure core the BullMQ/queue wiring consumes — no I/O here.
 */

export interface JobSpec {
  readonly jobType: string; // "refresh-odds" | "settle-picks" | "generate-picks" | ...
  /** The scope this run operates on — e.g. `${sport}:${date}` or an ingestion-run id. */
  readonly scopeKey: string;
}

/**
 * Deterministic idempotency key for a job + scope. Same job on the same scope yields
 * the same key, so a queue can dedupe a re-enqueued run (preventing double work such as
 * double-settlement). Non-cryptographic; uniqueness within a job space is what matters.
 */
export function idempotencyKey(job: JobSpec): string {
  const raw = `${job.jobType}::${job.scopeKey}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${job.jobType}:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export type JobOutcome = "success" | "transient_failure" | "permanent_failure";

export interface RetryDecision {
  readonly retry: boolean;
  readonly delayMs: number;
  readonly deadLetter: boolean;
}

export interface RetryConfig {
  readonly maxAttempts?: number; // default 4
  readonly baseDelayMs?: number; // default 2000
  readonly maxDelayMs?: number; // default 60000
}

/**
 * Decide what to do after an attempt. Success → done. Permanent failure → dead-letter
 * immediately. Transient failure → retry with capped exponential backoff until
 * maxAttempts, then dead-letter. `attempt` is 1-based (the attempt that just ran).
 */
export function retryDecision(
  attempt: number,
  outcome: JobOutcome,
  config: RetryConfig = {}
): RetryDecision {
  const maxAttempts = config.maxAttempts ?? 4;
  const base = config.baseDelayMs ?? 2000;
  const cap = config.maxDelayMs ?? 60000;

  if (outcome === "success") {
    return { retry: false, delayMs: 0, deadLetter: false };
  }
  if (outcome === "permanent_failure") {
    return { retry: false, delayMs: 0, deadLetter: true };
  }
  // transient
  if (attempt >= maxAttempts) {
    return { retry: false, delayMs: 0, deadLetter: true };
  }
  const delayMs = Math.min(cap, base * 2 ** (attempt - 1));
  return { retry: true, delayMs, deadLetter: false };
}

export interface FailureLedgerEntry {
  readonly jobType: string;
  readonly scopeKey: string;
  readonly idempotencyKey: string;
  readonly attempt: number;
  readonly outcome: JobOutcome;
  readonly error: string;
  readonly atIso: string;
  readonly deadLettered: boolean;
}

/** Build a failure-ledger entry for a failed attempt (the dead-letter review trail). */
export function buildFailureEntry(
  job: JobSpec,
  attempt: number,
  outcome: JobOutcome,
  error: string,
  atIso: string,
  config: RetryConfig = {}
): FailureLedgerEntry {
  const decision = retryDecision(attempt, outcome, config);
  return {
    jobType: job.jobType,
    scopeKey: job.scopeKey,
    idempotencyKey: idempotencyKey(job),
    attempt,
    outcome,
    error,
    atIso,
    deadLettered: decision.deadLetter,
  };
}
