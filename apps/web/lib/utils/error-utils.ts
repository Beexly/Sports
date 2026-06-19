/**
 * Typed error hierarchy, Result monad, HTTP mapping, retry classification,
 * and sports-platform error factories.
 *
 * Pure TypeScript — zero npm dependencies. No `any`. All catch boundaries
 * use `unknown`. All error-creation functions are pure (no I/O).
 */

// ---------------------------------------------------------------------------
// Base error classes
// ---------------------------------------------------------------------------

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context: Record<string, unknown>;
  readonly timestamp: Date;
  readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    opts?: {
      statusCode?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = opts?.statusCode ?? 500;
    this.context = opts?.context ?? {};
    this.timestamp = new Date();
    if (opts?.cause !== undefined) {
      this.cause = opts.cause;
    }
    // Restore prototype chain broken by extending Error in some envs
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): {
    message: string;
    code: string;
    statusCode: number;
    context: Record<string, unknown>;
    timestamp: string;
  } {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }

  toString(): string {
    return `AppError[${this.code}]: ${this.message}`;
  }
}

export class ValidationError extends AppError {
  readonly field?: string;
  readonly value?: unknown;

  constructor(
    message: string,
    opts?: {
      field?: string;
      value?: unknown;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "VALIDATION_ERROR", {
      statusCode: 400,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "ValidationError";
    this.field = opts?.field;
    this.value = opts?.value;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  readonly resource: string;

  constructor(resource: string, id?: string | number) {
    const message =
      id !== undefined
        ? `${resource} with id '${id}' not found`
        : `${resource} not found`;
    super(message, "NOT_FOUND", { statusCode: 404 });
    this.name = "NotFoundError";
    this.resource = resource;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  readonly action?: string;

  constructor(
    message = "Unauthorized",
    opts?: { action?: string; context?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, "UNAUTHORIZED", {
      statusCode: 401,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "UnauthorizedError";
    this.action = opts?.action;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ForbiddenError extends AppError {
  readonly resource?: string;
  readonly action?: string;

  constructor(
    message = "Forbidden",
    opts?: {
      resource?: string;
      action?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "FORBIDDEN", {
      statusCode: 403,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "ForbiddenError";
    this.resource = opts?.resource;
    this.action = opts?.action;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConflictError extends AppError {
  readonly conflictingId?: string;

  constructor(
    message: string,
    opts?: {
      conflictingId?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "CONFLICT", {
      statusCode: 409,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "ConflictError";
    this.conflictingId = opts?.conflictingId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterMs: number;
  readonly limit: number;
  readonly remaining: number;

  constructor(
    message: string,
    opts: {
      retryAfterMs: number;
      limit: number;
      remaining: number;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "RATE_LIMIT", {
      statusCode: 429,
      context: opts.context ?? {},
      cause: opts.cause,
    });
    this.name = "RateLimitError";
    this.retryAfterMs = opts.retryAfterMs;
    this.limit = opts.limit;
    this.remaining = opts.remaining;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExternalServiceError extends AppError {
  readonly service: string;
  readonly originalError?: Error;

  constructor(
    message: string,
    service: string,
    opts?: {
      originalError?: Error;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR", {
      statusCode: 502,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "ExternalServiceError";
    this.service = service;
    this.originalError = opts?.originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DataIntegrityError extends AppError {
  readonly field?: string;
  readonly expected?: unknown;
  readonly actual?: unknown;

  constructor(
    message: string,
    opts?: {
      field?: string;
      expected?: unknown;
      actual?: unknown;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "DATA_INTEGRITY_ERROR", {
      statusCode: 500,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "DataIntegrityError";
    this.field = opts?.field;
    this.expected = opts?.expected;
    this.actual = opts?.actual;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TimeoutError extends AppError {
  readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    opts?: { context?: Record<string, unknown>; cause?: Error }
  ) {
    super(message, "TIMEOUT", {
      statusCode: 504,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends AppError {
  readonly url?: string;
  readonly method?: string;

  constructor(
    message: string,
    opts?: {
      url?: string;
      method?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, "NETWORK_ERROR", {
      statusCode: 503,
      context: opts?.context ?? {},
      cause: opts?.cause,
    });
    this.name = "NetworkError";
    this.url = opts?.url;
    this.method = opts?.method;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Result type (monadic — no exceptions)
// ---------------------------------------------------------------------------

export type Ok<T> = { success: true; value: T; error?: never };
export type Err<E = AppError> = { success: false; value?: never; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

// ---------------------------------------------------------------------------
// Result constructors
// ---------------------------------------------------------------------------

export function ok<T>(value: T): Ok<T> {
  return { success: true, value };
}

export function err<E extends Error = AppError>(error: E): Err<E> {
  return { success: false, error };
}

// ---------------------------------------------------------------------------
// Result type guards
// ---------------------------------------------------------------------------

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.success === true;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.success === false;
}

// ---------------------------------------------------------------------------
// Result utilities
// ---------------------------------------------------------------------------

export function unwrap<T, E extends Error>(r: Result<T, E>): T {
  if (isOk(r)) return r.value;
  throw r.error;
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return isOk(r) ? r.value : fallback;
}

export function unwrapOrElse<T, E>(r: Result<T, E>, fn: (e: E) => T): T {
  return isOk(r) ? r.value : fn(r.error);
}

export function map<T, U, E>(
  r: Result<T, E>,
  fn: (v: T) => U
): Result<U, E> {
  if (isOk(r)) return ok(fn(r.value));
  return r as unknown as Err<E>;
}

export function mapErr<T, E, F extends Error>(
  r: Result<T, E>,
  fn: (e: E) => F
): Result<T, F> {
  if (isErr(r)) return err(fn(r.error));
  return r as unknown as Ok<T>;
}

export function flatMap<T, U, E>(
  r: Result<T, E>,
  fn: (v: T) => Result<U, E>
): Result<U, E> {
  if (isOk(r)) return fn(r.value);
  return r as unknown as Err<E>;
}

export function resultAll<T, E extends Error>(
  results: Result<T, E>[]
): Result<T[], E> {
  const values: T[] = [];
  for (const r of results) {
    if (isErr(r)) return r;
    values.push(r.value);
  }
  return ok(values);
}

export function resultAny<T, E extends Error>(
  results: Result<T, E>[]
): Result<T, E[]> {
  const errors: E[] = [];
  for (const r of results) {
    if (isOk(r)) return ok(r.value);
    errors.push(r.error);
  }
  return err(errors as unknown as E);
}

export function fromThrowable<T>(
  fn: () => T,
  mapError?: (e: unknown) => AppError
): Result<T, AppError> {
  try {
    return ok(fn());
  } catch (e: unknown) {
    return err(mapError ? mapError(e) : toAppError(e));
  }
}

export async function fromPromise<T>(
  p: Promise<T>,
  mapError?: (e: unknown) => AppError
): Promise<Result<T, AppError>> {
  try {
    return ok(await p);
  } catch (e: unknown) {
    return err(mapError ? mapError(e) : toAppError(e));
  }
}

// ---------------------------------------------------------------------------
// Error inspection and classification
// ---------------------------------------------------------------------------

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export function isValidationError(e: unknown): e is ValidationError {
  return e instanceof ValidationError;
}

export function isNotFoundError(e: unknown): e is NotFoundError {
  return e instanceof NotFoundError;
}

export function isUnauthorizedError(e: unknown): e is UnauthorizedError {
  return e instanceof UnauthorizedError;
}

export function isForbiddenError(e: unknown): e is ForbiddenError {
  return e instanceof ForbiddenError;
}

export function isRateLimitError(e: unknown): e is RateLimitError {
  return e instanceof RateLimitError;
}

export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

export function errorCode(e: unknown): string | undefined {
  if (isAppError(e)) return e.code;
  return undefined;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

export function errorStack(e: unknown): string | undefined {
  if (e instanceof Error) return e.stack;
  return undefined;
}

export function toAppError(e: unknown, fallbackCode = "UNKNOWN_ERROR"): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof Error) {
    return new AppError(e.message, fallbackCode, { cause: e });
  }
  if (typeof e === "string") {
    return new AppError(e, fallbackCode);
  }
  if (e !== null && e !== undefined) {
    return new AppError(String(e), fallbackCode);
  }
  return new AppError("Unknown error", fallbackCode);
}

export function serializeError(e: unknown): {
  message: string;
  code?: string;
  stack?: string;
  cause?: { message: string; code?: string };
} {
  const message = errorMessage(e);
  const code = errorCode(e);
  const stack = errorStack(e);

  let cause: { message: string; code?: string } | undefined;
  if (isAppError(e) && e.cause instanceof Error) {
    cause = {
      message: e.cause.message,
      code: isAppError(e.cause) ? e.cause.code : undefined,
    };
  }

  return {
    message,
    ...(code !== undefined ? { code } : {}),
    ...(stack !== undefined ? { stack } : {}),
    ...(cause !== undefined ? { cause } : {}),
  };
}

// ---------------------------------------------------------------------------
// Error chaining and context
// ---------------------------------------------------------------------------

export function withContext(
  error: AppError,
  context: Record<string, unknown>
): AppError {
  const merged = { ...error.context, ...context };
  // Rebuild using exact subclass constructor shape:
  const next = new AppError(error.message, error.code, {
    statusCode: error.statusCode,
    context: merged,
    cause: error.cause,
  });
  // Copy prototype so isinstance checks still work for subclasses
  Object.setPrototypeOf(next, Object.getPrototypeOf(error));
  next.name = error.name;
  return next;
}

export function withCause(error: AppError, cause: Error): AppError {
  const next = new AppError(error.message, error.code, {
    statusCode: error.statusCode,
    context: error.context,
    cause,
  });
  Object.setPrototypeOf(next, Object.getPrototypeOf(error));
  next.name = error.name;
  return next;
}

export function getRootCause(e: Error): Error {
  let current: Error = e;
  while (
    current instanceof AppError &&
    current.cause instanceof Error
  ) {
    current = current.cause;
  }
  // Also handle native Error.cause (ES2022)
  while (
    !(current instanceof AppError) &&
    (current as { cause?: unknown }).cause instanceof Error
  ) {
    current = (current as { cause: Error }).cause;
  }
  return current;
}

export function errorChain(e: Error): Error[] {
  const chain: Error[] = [e];
  let current: Error = e;
  while (true) {
    const next: unknown =
      current instanceof AppError
        ? current.cause
        : (current as { cause?: unknown }).cause;
    if (next instanceof Error) {
      chain.push(next);
      current = next;
    } else {
      break;
    }
  }
  return chain;
}

export function formatErrorChain(e: Error): string {
  const chain = errorChain(e);
  return chain
    .map((err, i) =>
      i === 0 ? err.message : `${"  ".repeat(i)}caused by: ${err.message}`
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// HTTP error mapping
// ---------------------------------------------------------------------------

export function toHttpStatus(e: unknown): number {
  if (isAppError(e)) return e.statusCode;
  return 500;
}

export function fromHttpStatus(status: number, message?: string): AppError {
  switch (status) {
    case 400:
      return new ValidationError(message ?? "Bad Request");
    case 401:
      return new UnauthorizedError(message ?? "Unauthorized");
    case 403:
      return new ForbiddenError(message ?? "Forbidden");
    case 404:
      if (message !== undefined) {
        return new AppError(message, "NOT_FOUND", { statusCode: 404 });
      }
      return new NotFoundError("Resource");
    case 409:
      return new ConflictError(message ?? "Conflict");
    case 429:
      return new RateLimitError(message ?? "Too Many Requests", {
        retryAfterMs: 1000,
        limit: 0,
        remaining: 0,
      });
    default:
      if (status >= 500) {
        return new ExternalServiceError(
          message ?? `Service error (${status})`,
          "http",
          { context: { status } }
        );
      }
      return new AppError(message ?? `HTTP ${status}`, `HTTP_${status}`, {
        statusCode: status,
      });
  }
}

// ---------------------------------------------------------------------------
// Retry helpers
// ---------------------------------------------------------------------------

export function isRetryable(e: unknown): boolean {
  // Non-retryable classes take priority
  if (
    e instanceof ValidationError ||
    e instanceof NotFoundError ||
    e instanceof ForbiddenError ||
    e instanceof UnauthorizedError ||
    e instanceof ConflictError
  ) {
    return false;
  }

  if (
    e instanceof RateLimitError ||
    e instanceof NetworkError ||
    e instanceof TimeoutError
  ) {
    return true;
  }

  // Status code heuristics for generic AppErrors
  if (isAppError(e)) {
    const s = e.statusCode;
    return s === 429 || s === 503 || s === 504;
  }

  return false;
}

export function retryAfterMs(e: unknown): number {
  if (e instanceof RateLimitError) return e.retryAfterMs;
  return 1000;
}

export function shouldFallback(e: unknown): boolean {
  if (
    e instanceof ValidationError ||
    e instanceof UnauthorizedError ||
    e instanceof ForbiddenError ||
    e instanceof NotFoundError
  ) {
    return false;
  }
  if (e instanceof ExternalServiceError) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Sports platform specific factories
// ---------------------------------------------------------------------------

export function createPickNotFoundError(pickId: string): NotFoundError {
  return new NotFoundError("Pick", pickId);
}

export function createEntitlementError(
  tier: string,
  requiredTier: string
): ForbiddenError {
  return new ForbiddenError(
    `Your current tier '${tier}' does not have access. Required tier: '${requiredTier}'.`,
    {
      resource: "pick",
      action: "view",
      context: { tier, requiredTier },
    }
  );
}

export function createStaleDataError(
  source: string,
  ageSeconds: number,
  maxAgeSeconds: number
): DataIntegrityError {
  return new DataIntegrityError(
    `Data from '${source}' is stale: age ${ageSeconds}s exceeds max ${maxAgeSeconds}s`,
    {
      field: "timestamp",
      expected: `<= ${maxAgeSeconds}s`,
      actual: `${ageSeconds}s`,
      context: { source, ageSeconds, maxAgeSeconds },
    }
  );
}

export function createRateLimitError(
  endpoint: string,
  limit: number,
  windowMs: number
): RateLimitError {
  return new RateLimitError(
    `Rate limit exceeded on endpoint '${endpoint}': ${limit} requests per ${windowMs}ms`,
    {
      retryAfterMs: windowMs,
      limit,
      remaining: 0,
      context: { endpoint, windowMs },
    }
  );
}
