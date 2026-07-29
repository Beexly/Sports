/**
 * Jittered exponential backoff — pure core + runner.
 *
 * Use only for transient failures (Postgres 40001 / Prisma P2034 serialization,
 * deadlocks, brief network blips). NEVER retry refuse-default, validation, or
 * missing-opener paths.
 *
 * GSE binding: #236 slate opener uses RepeatableRead and does not require this.
 * Wire only if isolation is raised to Serializable or metrics show real P2034s.
 */

export type JitterKind = "none" | "equal" | "full" | "decorrelated";

export interface BackoffDelayParams {
  readonly kind: JitterKind;
  /** 1-based attempt index. */
  readonly attempt: number;
  readonly baseMs: number;
  readonly capMs: number;
  /** Required when kind === "decorrelated". */
  readonly prevSleepMs?: number;
  /** RNG in [0, 1). Inject for tests. */
  readonly random?: () => number;
}

export interface BackoffOptions {
  readonly kind?: JitterKind;
  readonly baseMs?: number;
  readonly capMs?: number;
  readonly maxAttempts?: number;
  /** Return true only for transient, safe-to-retry errors. */
  readonly isRetryable: (err: unknown) => boolean;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

export type BackoffFn<T> = (attempt: number) => Promise<T>;

export const BACKOFF_DEFAULTS = {
  kind: "full" as const satisfies JitterKind,
  baseMs: 20,
  capMs: 500,
  maxAttempts: 3,
};

export class BackoffExhaustedError extends Error {
  readonly cause: unknown;
  readonly attempts: number;
  constructor(cause: unknown, attempts: number) {
    super(`retry exhausted after ${attempts} attempt(s)`);
    this.name = "BackoffExhaustedError";
    this.cause = cause;
    this.attempts = attempts;
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expCap(attempt: number, baseMs: number, capMs: number): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
}

/**
 * Pure delay computation. No I/O.
 *
 * - none:          E
 * - equal:         E/2 + U(0, E/2)
 * - full:          U(0, E)          ← default
 * - decorrelated:  U(B, min(C, 3 * prev))
 */
export function computeBackoffMs(params: BackoffDelayParams): number {
  const rnd = params.random ?? Math.random;
  const { kind, attempt, baseMs, capMs } = params;

  if (baseMs < 0 || capMs < 0) {
    throw new RangeError("baseMs and capMs must be >= 0");
  }
  if (attempt < 1) {
    throw new RangeError("attempt must be >= 1");
  }

  const exp = expCap(attempt, baseMs, capMs);

  switch (kind) {
    case "none":
      return exp;
    case "equal":
      return exp / 2 + rnd() * (exp / 2);
    case "full":
      return rnd() * exp;
    case "decorrelated": {
      const prev = params.prevSleepMs ?? baseMs;
      const high = Math.min(capMs, prev * 3);
      return baseMs + rnd() * Math.max(0, high - baseMs);
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`unknown jitter kind: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Run `fn` until success or attempts exhausted.
 * Non-retryable errors throw immediately (no sleep).
 */
export async function withJitteredBackoff<T>(
  fn: BackoffFn<T>,
  opts: BackoffOptions,
): Promise<T> {
  const kind = opts.kind ?? BACKOFF_DEFAULTS.kind;
  const baseMs = opts.baseMs ?? BACKOFF_DEFAULTS.baseMs;
  const capMs = opts.capMs ?? BACKOFF_DEFAULTS.capMs;
  const maxAttempts = opts.maxAttempts ?? BACKOFF_DEFAULTS.maxAttempts;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;

  if (maxAttempts < 1) {
    throw new RangeError("maxAttempts must be >= 1");
  }

  let lastError: unknown;
  let prevSleepMs = baseMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (!opts.isRetryable(err) || attempt === maxAttempts) {
        break;
      }
      const delay = computeBackoffMs({
        kind,
        attempt,
        baseMs,
        capMs,
        prevSleepMs,
        random,
      });
      prevSleepMs = delay;
      await sleep(delay);
    }
  }

  if (opts.isRetryable(lastError)) {
    throw new BackoffExhaustedError(lastError, maxAttempts);
  }
  throw lastError;
}

/** Prisma / Postgres serialization + deadlock classifier. */
export function isSerializationFailure(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: unknown }).code);
    // P2034: transaction conflict / deadlock (Prisma)
    // P2028: transaction API error (sometimes wraps serialization)
    if (code === "P2034" || code === "P2028") return true;
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /could not serialize|serialization failure|40001|deadlock detected/i.test(
    msg,
  );
}
