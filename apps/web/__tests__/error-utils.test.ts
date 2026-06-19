/**
 * Tests for error-utils.ts
 * Covers: error class hierarchy, Result monad, fromThrowable/fromPromise,
 * unwrap throws, unwrapOr fallback, toAppError coercion, HTTP status mapping,
 * error chain traversal, isRetryable classification, sports-specific factories.
 */
import { describe, it, expect } from "vitest";
import {
  // Base error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DataIntegrityError,
  TimeoutError,
  NetworkError,
  // Result types (constructors)
  ok,
  err,
  // Result utilities
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  map,
  mapErr,
  flatMap,
  resultAll,
  resultAny,
  fromThrowable,
  fromPromise,
  // Error inspection
  isAppError,
  isValidationError,
  isNotFoundError,
  isUnauthorizedError,
  isForbiddenError,
  isRateLimitError,
  isNetworkError,
  errorCode,
  errorMessage,
  errorStack,
  toAppError,
  serializeError,
  // Error chaining
  withContext,
  withCause,
  getRootCause,
  errorChain,
  formatErrorChain,
  // HTTP mapping
  toHttpStatus,
  fromHttpStatus,
  // Retry helpers
  isRetryable,
  retryAfterMs,
  shouldFallback,
  // Sports factories
  createPickNotFoundError,
  createEntitlementError,
  createStaleDataError,
  createRateLimitError,
} from "@/lib/utils/error-utils";

// ---------------------------------------------------------------------------
// AppError base class
// ---------------------------------------------------------------------------

describe("AppError", () => {
  it("constructs with required fields only", () => {
    const e = new AppError("something broke", "BROKE");
    expect(e.message).toBe("something broke");
    expect(e.code).toBe("BROKE");
    expect(e.statusCode).toBe(500);
    expect(e.context).toEqual({});
    expect(e.timestamp).toBeInstanceOf(Date);
    expect(e.cause).toBeUndefined();
  });

  it("accepts optional statusCode, context, and cause", () => {
    const cause = new Error("root");
    const e = new AppError("wrapped", "WRAPPED", {
      statusCode: 400,
      context: { field: "email" },
      cause,
    });
    expect(e.statusCode).toBe(400);
    expect(e.context).toEqual({ field: "email" });
    expect(e.cause).toBe(cause);
  });

  it("is an instanceof Error", () => {
    expect(new AppError("x", "X")).toBeInstanceOf(Error);
  });

  it("is an instanceof AppError", () => {
    expect(new AppError("x", "X")).toBeInstanceOf(AppError);
  });

  it("toJSON returns correct shape", () => {
    const e = new AppError("oops", "OOPS", { statusCode: 422, context: { a: 1 } });
    const j = e.toJSON();
    expect(j.message).toBe("oops");
    expect(j.code).toBe("OOPS");
    expect(j.statusCode).toBe(422);
    expect(j.context).toEqual({ a: 1 });
    expect(typeof j.timestamp).toBe("string");
    // ISO string round-trips
    expect(new Date(j.timestamp).toISOString()).toBe(j.timestamp);
  });

  it("toString returns formatted string", () => {
    const e = new AppError("bad thing", "BAD_THING");
    expect(e.toString()).toBe("AppError[BAD_THING]: bad thing");
  });

  it("name defaults to AppError", () => {
    expect(new AppError("x", "X").name).toBe("AppError");
  });
});

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------

describe("ValidationError", () => {
  it("is instanceof AppError and ValidationError", () => {
    const e = new ValidationError("invalid email");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(ValidationError);
  });

  it("has code VALIDATION_ERROR and statusCode 400", () => {
    const e = new ValidationError("bad input");
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.statusCode).toBe(400);
  });

  it("accepts field and value opts", () => {
    const e = new ValidationError("field required", { field: "name", value: "" });
    expect(e.field).toBe("name");
    expect(e.value).toBe("");
  });

  it("field and value are undefined when not supplied", () => {
    const e = new ValidationError("nope");
    expect(e.field).toBeUndefined();
    expect(e.value).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// NotFoundError
// ---------------------------------------------------------------------------

describe("NotFoundError", () => {
  it("is instanceof AppError and NotFoundError", () => {
    expect(new NotFoundError("User")).toBeInstanceOf(AppError);
    expect(new NotFoundError("User")).toBeInstanceOf(NotFoundError);
  });

  it("has code NOT_FOUND and statusCode 404", () => {
    const e = new NotFoundError("Post");
    expect(e.code).toBe("NOT_FOUND");
    expect(e.statusCode).toBe(404);
  });

  it("formats message without id", () => {
    expect(new NotFoundError("Game").message).toBe("Game not found");
  });

  it("formats message with id", () => {
    expect(new NotFoundError("Pick", "abc-123").message).toBe(
      "Pick with id 'abc-123' not found"
    );
  });

  it("stores resource", () => {
    const e = new NotFoundError("Team", 99);
    expect(e.resource).toBe("Team");
  });

  it("accepts numeric id", () => {
    expect(new NotFoundError("Player", 7).message).toBe(
      "Player with id '7' not found"
    );
  });
});

// ---------------------------------------------------------------------------
// UnauthorizedError
// ---------------------------------------------------------------------------

describe("UnauthorizedError", () => {
  it("is instanceof AppError and UnauthorizedError", () => {
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new UnauthorizedError()).toBeInstanceOf(UnauthorizedError);
  });

  it("has statusCode 401 and code UNAUTHORIZED", () => {
    const e = new UnauthorizedError();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe("UNAUTHORIZED");
  });

  it("defaults message to Unauthorized", () => {
    expect(new UnauthorizedError().message).toBe("Unauthorized");
  });

  it("accepts action opt", () => {
    const e = new UnauthorizedError("must sign in", { action: "view_picks" });
    expect(e.action).toBe("view_picks");
  });
});

// ---------------------------------------------------------------------------
// ForbiddenError
// ---------------------------------------------------------------------------

describe("ForbiddenError", () => {
  it("is instanceof AppError and ForbiddenError", () => {
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(ForbiddenError);
  });

  it("has statusCode 403 and code FORBIDDEN", () => {
    const e = new ForbiddenError();
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe("FORBIDDEN");
  });

  it("accepts resource and action opts", () => {
    const e = new ForbiddenError("no access", { resource: "pick", action: "read" });
    expect(e.resource).toBe("pick");
    expect(e.action).toBe("read");
  });
});

// ---------------------------------------------------------------------------
// ConflictError
// ---------------------------------------------------------------------------

describe("ConflictError", () => {
  it("is instanceof AppError and ConflictError", () => {
    expect(new ConflictError("already exists")).toBeInstanceOf(AppError);
    expect(new ConflictError("already exists")).toBeInstanceOf(ConflictError);
  });

  it("has statusCode 409 and code CONFLICT", () => {
    const e = new ConflictError("conflict");
    expect(e.statusCode).toBe(409);
    expect(e.code).toBe("CONFLICT");
  });

  it("accepts conflictingId", () => {
    const e = new ConflictError("dup", { conflictingId: "abc" });
    expect(e.conflictingId).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------

describe("RateLimitError", () => {
  it("is instanceof AppError and RateLimitError", () => {
    const e = new RateLimitError("slow down", { retryAfterMs: 5000, limit: 10, remaining: 0 });
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(RateLimitError);
  });

  it("has statusCode 429 and code RATE_LIMIT", () => {
    const e = new RateLimitError("rate limited", { retryAfterMs: 3000, limit: 100, remaining: 0 });
    expect(e.statusCode).toBe(429);
    expect(e.code).toBe("RATE_LIMIT");
  });

  it("stores retryAfterMs, limit, remaining", () => {
    const e = new RateLimitError("too fast", { retryAfterMs: 2000, limit: 50, remaining: 3 });
    expect(e.retryAfterMs).toBe(2000);
    expect(e.limit).toBe(50);
    expect(e.remaining).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// ExternalServiceError
// ---------------------------------------------------------------------------

describe("ExternalServiceError", () => {
  it("is instanceof AppError and ExternalServiceError", () => {
    const e = new ExternalServiceError("API down", "stripe");
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(ExternalServiceError);
  });

  it("has statusCode 502 and code EXTERNAL_SERVICE_ERROR", () => {
    const e = new ExternalServiceError("failed", "odds-api");
    expect(e.statusCode).toBe(502);
    expect(e.code).toBe("EXTERNAL_SERVICE_ERROR");
  });

  it("stores service and originalError", () => {
    const orig = new Error("network timeout");
    const e = new ExternalServiceError("service failed", "payments", { originalError: orig });
    expect(e.service).toBe("payments");
    expect(e.originalError).toBe(orig);
  });
});

// ---------------------------------------------------------------------------
// DataIntegrityError
// ---------------------------------------------------------------------------

describe("DataIntegrityError", () => {
  it("is instanceof AppError and DataIntegrityError", () => {
    const e = new DataIntegrityError("mismatch");
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(DataIntegrityError);
  });

  it("has statusCode 500 and code DATA_INTEGRITY_ERROR", () => {
    const e = new DataIntegrityError("bad data");
    expect(e.statusCode).toBe(500);
    expect(e.code).toBe("DATA_INTEGRITY_ERROR");
  });

  it("stores field, expected, actual", () => {
    const e = new DataIntegrityError("value mismatch", {
      field: "score",
      expected: 100,
      actual: 200,
    });
    expect(e.field).toBe("score");
    expect(e.expected).toBe(100);
    expect(e.actual).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// TimeoutError
// ---------------------------------------------------------------------------

describe("TimeoutError", () => {
  it("is instanceof AppError and TimeoutError", () => {
    const e = new TimeoutError("timed out", 5000);
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(TimeoutError);
  });

  it("has statusCode 504 and code TIMEOUT", () => {
    const e = new TimeoutError("timeout", 3000);
    expect(e.statusCode).toBe(504);
    expect(e.code).toBe("TIMEOUT");
  });

  it("stores timeoutMs", () => {
    const e = new TimeoutError("request timed out", 10000);
    expect(e.timeoutMs).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// NetworkError
// ---------------------------------------------------------------------------

describe("NetworkError", () => {
  it("is instanceof AppError and NetworkError", () => {
    const e = new NetworkError("connection refused");
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(NetworkError);
  });

  it("has statusCode 503 and code NETWORK_ERROR", () => {
    const e = new NetworkError("down");
    expect(e.statusCode).toBe(503);
    expect(e.code).toBe("NETWORK_ERROR");
  });

  it("stores url and method", () => {
    const e = new NetworkError("fetch failed", { url: "https://api.example.com", method: "GET" });
    expect(e.url).toBe("https://api.example.com");
    expect(e.method).toBe("GET");
  });

  it("url and method are undefined when not provided", () => {
    const e = new NetworkError("error");
    expect(e.url).toBeUndefined();
    expect(e.method).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Result constructors
// ---------------------------------------------------------------------------

describe("ok()", () => {
  it("returns Ok with value", () => {
    const r = ok(42);
    expect(r.success).toBe(true);
    expect(r.value).toBe(42);
  });

  it("works with objects", () => {
    const r = ok({ x: 1 });
    expect(r.value).toEqual({ x: 1 });
  });

  it("works with null", () => {
    const r = ok(null);
    expect(r.value).toBeNull();
  });
});

describe("err()", () => {
  it("returns Err with error", () => {
    const e = new AppError("bad", "BAD");
    const r = err(e);
    expect(r.success).toBe(false);
    expect(r.error).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// isOk / isErr
// ---------------------------------------------------------------------------

describe("isOk / isErr", () => {
  it("isOk returns true for Ok", () => {
    expect(isOk(ok(1))).toBe(true);
  });

  it("isOk returns false for Err", () => {
    expect(isOk(err(new AppError("x", "X")))).toBe(false);
  });

  it("isErr returns true for Err", () => {
    expect(isErr(err(new AppError("x", "X")))).toBe(true);
  });

  it("isErr returns false for Ok", () => {
    expect(isErr(ok("hello"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unwrap
// ---------------------------------------------------------------------------

describe("unwrap()", () => {
  it("returns value for Ok", () => {
    expect(unwrap(ok("hello"))).toBe("hello");
  });

  it("throws error for Err", () => {
    const e = new AppError("bang", "BANG");
    expect(() => unwrap(err(e))).toThrow(e);
  });

  it("throws the exact error instance", () => {
    const e = new ValidationError("bad");
    expect(() => unwrap(err(e))).toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// unwrapOr
// ---------------------------------------------------------------------------

describe("unwrapOr()", () => {
  it("returns value on Ok", () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
  });

  it("returns fallback on Err", () => {
    expect(unwrapOr(err(new AppError("x", "X")), 99)).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// unwrapOrElse
// ---------------------------------------------------------------------------

describe("unwrapOrElse()", () => {
  it("returns value on Ok", () => {
    expect(unwrapOrElse(ok(10), () => -1)).toBe(10);
  });

  it("calls fn with error on Err", () => {
    const e = new AppError("oops", "OOPS");
    const result = unwrapOrElse(err(e), (caught) => caught.message.length);
    expect(result).toBe("oops".length);
  });
});

// ---------------------------------------------------------------------------
// map()
// ---------------------------------------------------------------------------

describe("map()", () => {
  it("transforms Ok value", () => {
    const r = map(ok(2), (v) => v * 3);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(6);
  });

  it("passes Err through unchanged", () => {
    const e = new AppError("fail", "FAIL");
    const r = map(err(e), (v: number) => v * 10);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(e);
  });
});

// ---------------------------------------------------------------------------
// mapErr()
// ---------------------------------------------------------------------------

describe("mapErr()", () => {
  it("transforms Err", () => {
    const e = new AppError("original", "ORIG");
    const r = mapErr(err(e), (orig) => new AppError(`wrapped: ${orig.message}`, "WRAPPED"));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.message).toBe("wrapped: original");
      expect(r.error.code).toBe("WRAPPED");
    }
  });

  it("passes Ok through unchanged", () => {
    const r = mapErr(ok("value"), (e: AppError) => new AppError(`wrapped: ${e.message}`, "W"));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe("value");
  });
});

// ---------------------------------------------------------------------------
// flatMap()
// ---------------------------------------------------------------------------

describe("flatMap()", () => {
  it("chains Ok to Ok", () => {
    const r = flatMap(ok(3), (v) => ok(v + 1));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(4);
  });

  it("chains Ok to Err", () => {
    const e = new AppError("inner fail", "FAIL");
    const r = flatMap(ok(3), () => err(e));
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(e);
  });

  it("passes Err through without calling fn", () => {
    const e = new AppError("outer fail", "FAIL");
    let called = false;
    const r = flatMap(err(e), (_v: number) => {
      called = true;
      return ok(99);
    });
    expect(called).toBe(false);
    expect(isErr(r)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resultAll()
// ---------------------------------------------------------------------------

describe("resultAll()", () => {
  it("returns Ok array when all Ok", () => {
    const r = resultAll([ok(1), ok(2), ok(3)]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual([1, 2, 3]);
  });

  it("returns first Err when any Err", () => {
    const e1 = new AppError("first fail", "F1");
    const e2 = new AppError("second fail", "F2");
    const r = resultAll([ok(1), err(e1), err(e2)]);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(e1);
  });

  it("empty array returns Ok with empty array", () => {
    const r = resultAll([]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resultAny()
// ---------------------------------------------------------------------------

describe("resultAny()", () => {
  it("returns first Ok when at least one Ok", () => {
    const e = new AppError("fail", "FAIL");
    const r = resultAny([err(e), ok(42), ok(100)]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it("returns Err with all errors when all Err", () => {
    const e1 = new AppError("e1", "E1");
    const e2 = new AppError("e2", "E2");
    const r = resultAny([err(e1), err(e2)]);
    expect(isErr(r)).toBe(true);
  });

  it("empty array returns Err with empty errors", () => {
    const r = resultAny([]);
    expect(isErr(r)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fromThrowable()
// ---------------------------------------------------------------------------

describe("fromThrowable()", () => {
  it("returns Ok for non-throwing function", () => {
    const r = fromThrowable(() => 42);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it("returns Err for throwing function", () => {
    const r = fromThrowable(() => {
      throw new Error("boom");
    });
    expect(isErr(r)).toBe(true);
  });

  it("uses mapError if provided", () => {
    const r = fromThrowable(
      () => { throw new Error("raw"); },
      (e) => new ValidationError(errorMessage(e))
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error).toBeInstanceOf(ValidationError);
      expect(r.error.message).toBe("raw");
    }
  });

  it("catches thrown strings", () => {
    const r = fromThrowable(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string error";
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.message).toBe("string error");
  });
});

// ---------------------------------------------------------------------------
// fromPromise()
// ---------------------------------------------------------------------------

describe("fromPromise()", () => {
  it("returns Ok for resolved promise", async () => {
    const r = await fromPromise(Promise.resolve("done"));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe("done");
  });

  it("returns Err for rejected promise", async () => {
    const r = await fromPromise(Promise.reject(new Error("rejected")));
    expect(isErr(r)).toBe(true);
  });

  it("uses mapError if provided", async () => {
    const r = await fromPromise(
      Promise.reject(new Error("async fail")),
      (e) => new NetworkError(errorMessage(e))
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error).toBeInstanceOf(NetworkError);
      expect(r.error.message).toBe("async fail");
    }
  });
});

// ---------------------------------------------------------------------------
// Error inspection: isAppError / isValidationError / etc.
// ---------------------------------------------------------------------------

describe("Error type guards", () => {
  it("isAppError returns true for AppError and subclasses", () => {
    expect(isAppError(new AppError("x", "X"))).toBe(true);
    expect(isAppError(new ValidationError("x"))).toBe(true);
    expect(isAppError(new NotFoundError("res"))).toBe(true);
  });

  it("isAppError returns false for plain Error", () => {
    expect(isAppError(new Error("plain"))).toBe(false);
  });

  it("isAppError returns false for non-errors", () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError(42)).toBe(false);
  });

  it("isValidationError", () => {
    expect(isValidationError(new ValidationError("x"))).toBe(true);
    expect(isValidationError(new AppError("x", "X"))).toBe(false);
  });

  it("isNotFoundError", () => {
    expect(isNotFoundError(new NotFoundError("x"))).toBe(true);
    expect(isNotFoundError(new ValidationError("x"))).toBe(false);
  });

  it("isUnauthorizedError", () => {
    expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
    expect(isUnauthorizedError(new ForbiddenError())).toBe(false);
  });

  it("isForbiddenError", () => {
    expect(isForbiddenError(new ForbiddenError())).toBe(true);
    expect(isForbiddenError(new UnauthorizedError())).toBe(false);
  });

  it("isRateLimitError", () => {
    const e = new RateLimitError("limited", { retryAfterMs: 1000, limit: 10, remaining: 0 });
    expect(isRateLimitError(e)).toBe(true);
    expect(isRateLimitError(new AppError("x", "X"))).toBe(false);
  });

  it("isNetworkError", () => {
    expect(isNetworkError(new NetworkError("down"))).toBe(true);
    expect(isNetworkError(new TimeoutError("timeout", 5000))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errorCode / errorMessage / errorStack
// ---------------------------------------------------------------------------

describe("errorCode()", () => {
  it("returns code for AppError", () => {
    expect(errorCode(new AppError("x", "MY_CODE"))).toBe("MY_CODE");
  });

  it("returns undefined for plain Error", () => {
    expect(errorCode(new Error("plain"))).toBeUndefined();
  });

  it("returns undefined for non-error values", () => {
    expect(errorCode("str")).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
  });
});

describe("errorMessage()", () => {
  it("returns message for Error", () => {
    expect(errorMessage(new Error("the msg"))).toBe("the msg");
  });

  it("returns string for string input", () => {
    expect(errorMessage("raw string")).toBe("raw string");
  });

  it("returns 'Unknown error' for other types", () => {
    expect(errorMessage(null)).toBe("Unknown error");
    expect(errorMessage(undefined)).toBe("Unknown error");
    expect(errorMessage(42)).toBe("Unknown error");
  });
});

describe("errorStack()", () => {
  it("returns stack for Error", () => {
    const e = new Error("stackable");
    expect(typeof errorStack(e)).toBe("string");
  });

  it("returns undefined for non-errors", () => {
    expect(errorStack("str")).toBeUndefined();
    expect(errorStack(null)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// toAppError()
// ---------------------------------------------------------------------------

describe("toAppError()", () => {
  it("returns AppError as-is", () => {
    const e = new AppError("x", "X");
    expect(toAppError(e)).toBe(e);
  });

  it("wraps plain Error", () => {
    const e = new Error("plain");
    const converted = toAppError(e);
    expect(converted).toBeInstanceOf(AppError);
    expect(converted.message).toBe("plain");
    expect(converted.cause).toBe(e);
  });

  it("converts string to AppError", () => {
    const converted = toAppError("string error");
    expect(converted).toBeInstanceOf(AppError);
    expect(converted.message).toBe("string error");
  });

  it("converts number to AppError using String()", () => {
    const converted = toAppError(42);
    expect(converted.message).toBe("42");
  });

  it("handles null", () => {
    const converted = toAppError(null);
    expect(converted.message).toBe("Unknown error");
  });

  it("handles undefined", () => {
    const converted = toAppError(undefined);
    expect(converted.message).toBe("Unknown error");
  });

  it("uses fallbackCode when provided", () => {
    const converted = toAppError("oops", "CUSTOM_CODE");
    expect(converted.code).toBe("CUSTOM_CODE");
  });

  it("uses UNKNOWN_ERROR as default fallback code", () => {
    const converted = toAppError("err");
    expect(converted.code).toBe("UNKNOWN_ERROR");
  });
});

// ---------------------------------------------------------------------------
// serializeError()
// ---------------------------------------------------------------------------

describe("serializeError()", () => {
  it("serializes AppError", () => {
    const e = new AppError("fail", "FAIL", { statusCode: 400 });
    const s = serializeError(e);
    expect(s.message).toBe("fail");
    expect(s.code).toBe("FAIL");
    expect(typeof s.stack).toBe("string");
  });

  it("serializes plain Error", () => {
    const e = new Error("plain");
    const s = serializeError(e);
    expect(s.message).toBe("plain");
    expect(s.code).toBeUndefined();
  });

  it("serializes cause chain", () => {
    const cause = new AppError("root cause", "ROOT");
    const e = new AppError("top error", "TOP", { cause });
    const s = serializeError(e);
    expect(s.cause).toBeDefined();
    expect(s.cause?.message).toBe("root cause");
    expect(s.cause?.code).toBe("ROOT");
  });

  it("serializes string as message", () => {
    const s = serializeError("raw string");
    expect(s.message).toBe("raw string");
    expect(s.code).toBeUndefined();
    expect(s.stack).toBeUndefined();
  });

  it("serializes null as Unknown error", () => {
    const s = serializeError(null);
    expect(s.message).toBe("Unknown error");
  });
});

// ---------------------------------------------------------------------------
// withContext()
// ---------------------------------------------------------------------------

describe("withContext()", () => {
  it("merges context onto error", () => {
    const e = new AppError("x", "X", { context: { a: 1 } });
    const e2 = withContext(e, { b: 2 });
    expect(e2.context).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate original", () => {
    const e = new AppError("x", "X", { context: { a: 1 } });
    withContext(e, { b: 2 });
    expect(e.context).toEqual({ a: 1 });
  });

  it("new context keys override old ones", () => {
    const e = new AppError("x", "X", { context: { a: 1 } });
    const e2 = withContext(e, { a: 99 });
    expect(e2.context.a).toBe(99);
  });

  it("preserves message, code, statusCode", () => {
    const e = new AppError("msg", "CODE", { statusCode: 422 });
    const e2 = withContext(e, { extra: true });
    expect(e2.message).toBe("msg");
    expect(e2.code).toBe("CODE");
    expect(e2.statusCode).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// withCause()
// ---------------------------------------------------------------------------

describe("withCause()", () => {
  it("sets cause on error", () => {
    const cause = new Error("root");
    const e = new AppError("x", "X");
    const e2 = withCause(e, cause);
    expect(e2.cause).toBe(cause);
  });

  it("does not mutate original", () => {
    const cause = new Error("root");
    const e = new AppError("x", "X");
    withCause(e, cause);
    expect(e.cause).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getRootCause()
// ---------------------------------------------------------------------------

describe("getRootCause()", () => {
  it("returns itself when no cause", () => {
    const e = new AppError("x", "X");
    expect(getRootCause(e)).toBe(e);
  });

  it("traverses cause chain", () => {
    const root = new Error("root");
    const mid = new AppError("mid", "MID", { cause: root });
    const top = new AppError("top", "TOP", { cause: mid });
    expect(getRootCause(top)).toBe(root);
  });

  it("returns plain Error when chain ends at non-AppError", () => {
    const plain = new Error("leaf");
    const wrapped = new AppError("wrapper", "W", { cause: plain });
    expect(getRootCause(wrapped)).toBe(plain);
  });
});

// ---------------------------------------------------------------------------
// errorChain()
// ---------------------------------------------------------------------------

describe("errorChain()", () => {
  it("returns single-element array for no cause", () => {
    const e = new AppError("x", "X");
    expect(errorChain(e)).toEqual([e]);
  });

  it("returns full chain outermost to root", () => {
    const root = new Error("root");
    const mid = new AppError("mid", "MID", { cause: root });
    const top = new AppError("top", "TOP", { cause: mid });
    const chain = errorChain(top);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(top);
    expect(chain[1]).toBe(mid);
    expect(chain[2]).toBe(root);
  });
});

// ---------------------------------------------------------------------------
// formatErrorChain()
// ---------------------------------------------------------------------------

describe("formatErrorChain()", () => {
  it("formats single error", () => {
    const e = new Error("only error");
    expect(formatErrorChain(e)).toBe("only error");
  });

  it("formats two-level chain", () => {
    const root = new Error("root msg");
    const top = new AppError("top msg", "TOP", { cause: root });
    const formatted = formatErrorChain(top);
    expect(formatted).toContain("top msg");
    expect(formatted).toContain("caused by: root msg");
  });

  it("formats three-level chain", () => {
    const root = new Error("root");
    const mid = new AppError("mid", "MID", { cause: root });
    const top = new AppError("top", "TOP", { cause: mid });
    const formatted = formatErrorChain(top);
    const lines = formatted.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("top");
    expect(lines[1]).toContain("caused by: mid");
    expect(lines[2]).toContain("caused by: root");
  });
});

// ---------------------------------------------------------------------------
// toHttpStatus()
// ---------------------------------------------------------------------------

describe("toHttpStatus()", () => {
  it("returns AppError.statusCode", () => {
    expect(toHttpStatus(new AppError("x", "X", { statusCode: 422 }))).toBe(422);
  });

  it("returns 404 for NotFoundError", () => {
    expect(toHttpStatus(new NotFoundError("res"))).toBe(404);
  });

  it("returns 401 for UnauthorizedError", () => {
    expect(toHttpStatus(new UnauthorizedError())).toBe(401);
  });

  it("returns 403 for ForbiddenError", () => {
    expect(toHttpStatus(new ForbiddenError())).toBe(403);
  });

  it("returns 400 for ValidationError", () => {
    expect(toHttpStatus(new ValidationError("bad"))).toBe(400);
  });

  it("returns 429 for RateLimitError", () => {
    const e = new RateLimitError("limited", { retryAfterMs: 1000, limit: 10, remaining: 0 });
    expect(toHttpStatus(e)).toBe(429);
  });

  it("returns 500 for non-AppError", () => {
    expect(toHttpStatus(new Error("plain"))).toBe(500);
    expect(toHttpStatus("string")).toBe(500);
    expect(toHttpStatus(null)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// fromHttpStatus()
// ---------------------------------------------------------------------------

describe("fromHttpStatus()", () => {
  it("400 → ValidationError", () => {
    expect(fromHttpStatus(400)).toBeInstanceOf(ValidationError);
  });

  it("401 → UnauthorizedError", () => {
    expect(fromHttpStatus(401)).toBeInstanceOf(UnauthorizedError);
  });

  it("403 → ForbiddenError", () => {
    expect(fromHttpStatus(403)).toBeInstanceOf(ForbiddenError);
  });

  it("404 → NotFoundError", () => {
    expect(fromHttpStatus(404)).toBeInstanceOf(NotFoundError);
  });

  it("409 → ConflictError", () => {
    expect(fromHttpStatus(409)).toBeInstanceOf(ConflictError);
  });

  it("429 → RateLimitError", () => {
    expect(fromHttpStatus(429)).toBeInstanceOf(RateLimitError);
  });

  it("500 → ExternalServiceError", () => {
    expect(fromHttpStatus(500)).toBeInstanceOf(ExternalServiceError);
  });

  it("503 → ExternalServiceError", () => {
    expect(fromHttpStatus(503)).toBeInstanceOf(ExternalServiceError);
  });

  it("uses custom message", () => {
    const e = fromHttpStatus(404, "Pick not found");
    expect(e.message).toBe("Pick not found");
  });

  it("other 4xx → generic AppError", () => {
    const e = fromHttpStatus(418);
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe("HTTP_418");
  });
});

// ---------------------------------------------------------------------------
// isRetryable()
// ---------------------------------------------------------------------------

describe("isRetryable()", () => {
  it("RateLimitError is retryable", () => {
    const e = new RateLimitError("limited", { retryAfterMs: 1000, limit: 10, remaining: 0 });
    expect(isRetryable(e)).toBe(true);
  });

  it("NetworkError is retryable", () => {
    expect(isRetryable(new NetworkError("down"))).toBe(true);
  });

  it("TimeoutError is retryable", () => {
    expect(isRetryable(new TimeoutError("timed out", 5000))).toBe(true);
  });

  it("AppError with status 429 is retryable", () => {
    expect(isRetryable(new AppError("x", "X", { statusCode: 429 }))).toBe(true);
  });

  it("AppError with status 503 is retryable", () => {
    expect(isRetryable(new AppError("x", "X", { statusCode: 503 }))).toBe(true);
  });

  it("AppError with status 504 is retryable", () => {
    expect(isRetryable(new AppError("x", "X", { statusCode: 504 }))).toBe(true);
  });

  it("ValidationError is NOT retryable", () => {
    expect(isRetryable(new ValidationError("bad input"))).toBe(false);
  });

  it("NotFoundError is NOT retryable", () => {
    expect(isRetryable(new NotFoundError("resource"))).toBe(false);
  });

  it("ForbiddenError is NOT retryable", () => {
    expect(isRetryable(new ForbiddenError())).toBe(false);
  });

  it("UnauthorizedError is NOT retryable", () => {
    expect(isRetryable(new UnauthorizedError())).toBe(false);
  });

  it("ConflictError is NOT retryable", () => {
    expect(isRetryable(new ConflictError("conflict"))).toBe(false);
  });

  it("plain Error is NOT retryable", () => {
    expect(isRetryable(new Error("plain"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// retryAfterMs()
// ---------------------------------------------------------------------------

describe("retryAfterMs()", () => {
  it("returns RateLimitError.retryAfterMs", () => {
    const e = new RateLimitError("limited", { retryAfterMs: 7500, limit: 10, remaining: 0 });
    expect(retryAfterMs(e)).toBe(7500);
  });

  it("returns 1000 for non-RateLimitError", () => {
    expect(retryAfterMs(new NetworkError("down"))).toBe(1000);
    expect(retryAfterMs(new AppError("x", "X"))).toBe(1000);
    expect(retryAfterMs(new Error("plain"))).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// shouldFallback()
// ---------------------------------------------------------------------------

describe("shouldFallback()", () => {
  it("returns true for ExternalServiceError", () => {
    expect(shouldFallback(new ExternalServiceError("down", "payments"))).toBe(true);
  });

  it("returns false for ValidationError", () => {
    expect(shouldFallback(new ValidationError("bad"))).toBe(false);
  });

  it("returns false for UnauthorizedError", () => {
    expect(shouldFallback(new UnauthorizedError())).toBe(false);
  });

  it("returns false for ForbiddenError", () => {
    expect(shouldFallback(new ForbiddenError())).toBe(false);
  });

  it("returns false for NotFoundError", () => {
    expect(shouldFallback(new NotFoundError("res"))).toBe(false);
  });

  it("returns false for generic AppError", () => {
    expect(shouldFallback(new AppError("x", "X"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sports-specific factories
// ---------------------------------------------------------------------------

describe("createPickNotFoundError()", () => {
  it("returns NotFoundError for pick id", () => {
    const e = createPickNotFoundError("pick-abc-123");
    expect(e).toBeInstanceOf(NotFoundError);
    expect(e.resource).toBe("Pick");
    expect(e.message).toContain("pick-abc-123");
    expect(e.statusCode).toBe(404);
  });
});

describe("createEntitlementError()", () => {
  it("returns ForbiddenError with tier context", () => {
    const e = createEntitlementError("free", "pro");
    expect(e).toBeInstanceOf(ForbiddenError);
    expect(e.statusCode).toBe(403);
    expect(e.message).toContain("free");
    expect(e.message).toContain("pro");
    expect(e.context.tier).toBe("free");
    expect(e.context.requiredTier).toBe("pro");
  });
});

describe("createStaleDataError()", () => {
  it("returns DataIntegrityError with stale data info", () => {
    const e = createStaleDataError("odds-api", 600, 300);
    expect(e).toBeInstanceOf(DataIntegrityError);
    expect(e.field).toBe("timestamp");
    expect(e.context.source).toBe("odds-api");
    expect(e.context.ageSeconds).toBe(600);
    expect(e.context.maxAgeSeconds).toBe(300);
    expect(e.message).toContain("odds-api");
    expect(e.message).toContain("600");
    expect(e.message).toContain("300");
  });
});

describe("createRateLimitError()", () => {
  it("returns RateLimitError with endpoint context", () => {
    const e = createRateLimitError("/api/picks", 100, 60000);
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.limit).toBe(100);
    expect(e.retryAfterMs).toBe(60000);
    expect(e.remaining).toBe(0);
    expect(e.context.endpoint).toBe("/api/picks");
    expect(e.context.windowMs).toBe(60000);
    expect(e.message).toContain("/api/picks");
  });
});

// ---------------------------------------------------------------------------
// Additional integration / edge cases
// ---------------------------------------------------------------------------

describe("Result monad composition", () => {
  it("pipeline: ok -> map -> flatMap -> map succeeds", () => {
    const r = flatMap(
      map(ok(10), (v) => v * 2),
      (v) => map(ok(v), (v2) => v2 + 1)
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(21);
  });

  it("pipeline short-circuits on first Err", () => {
    const e = new AppError("fail", "F");
    const r = flatMap(
      map<number, number, AppError>(err(e), (v) => v * 2),
      (v) => ok(v + 1)
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe(e);
  });
});

describe("Error class hierarchy cross-checks", () => {
  it("ValidationError is not instanceof NotFoundError", () => {
    expect(new ValidationError("x")).not.toBeInstanceOf(NotFoundError);
  });

  it("NotFoundError is not instanceof ValidationError", () => {
    expect(new NotFoundError("x")).not.toBeInstanceOf(ValidationError);
  });

  it("RateLimitError is not instanceof TimeoutError", () => {
    const e = new RateLimitError("x", { retryAfterMs: 1000, limit: 10, remaining: 0 });
    expect(e).not.toBeInstanceOf(TimeoutError);
  });

  it("ExternalServiceError is not instanceof NetworkError", () => {
    expect(new ExternalServiceError("x", "svc")).not.toBeInstanceOf(NetworkError);
  });
});

describe("AppError.toJSON round-trip", () => {
  it("JSON.stringify / parse round-trips key fields", () => {
    const e = new AppError("test error", "TEST", { statusCode: 422, context: { a: 1 } });
    const parsed = JSON.parse(JSON.stringify(e.toJSON())) as ReturnType<AppError["toJSON"]>;
    expect(parsed.message).toBe("test error");
    expect(parsed.code).toBe("TEST");
    expect(parsed.statusCode).toBe(422);
    expect(parsed.context).toEqual({ a: 1 });
  });
});

describe("fromThrowable with complex return types", () => {
  it("captures object return value", () => {
    const r = fromThrowable(() => ({ picks: [1, 2, 3] }));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.picks).toHaveLength(3);
  });
});

describe("resultAll preserves order", () => {
  it("returns values in input order", () => {
    const r = resultAll([ok("a"), ok("b"), ok("c")]);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toEqual(["a", "b", "c"]);
  });
});
