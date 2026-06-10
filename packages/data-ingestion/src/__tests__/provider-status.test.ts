import { describe, it, expect } from "vitest";
import {
  classifyProviderError,
  isProviderFailureStatus,
  PROVIDER_JOB_STATUS,
  PROVIDER_FAILURE_STATUSES,
} from "../provider-status.js";
import { OddsApiError, providerStatusFromError } from "../odds-api-client.js";

/**
 * Provider job-truth classifier — fail-closed trust contract (Phase 2).
 *
 * These tests pin the mapping the ingestion pipeline keys off of so a
 * provider 401/403/429/5xx/timeout can never be silently reclassified as
 * a benign outcome. The classifier is pure, so every case is exhaustive.
 */
describe("classifyProviderError", () => {
  it("maps 401 and 403 to PROVIDER_AUTH_FAILED", () => {
    expect(classifyProviderError({ status: 401 })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED
    );
    expect(classifyProviderError({ status: 403 })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED
    );
  });

  it("accepts a bare status number as well as an input object", () => {
    expect(classifyProviderError(401)).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED
    );
    expect(classifyProviderError(503)).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );
  });

  it("maps 5xx to PROVIDER_UNAVAILABLE", () => {
    for (const status of [500, 502, 503, 504, 599]) {
      expect(classifyProviderError({ status })).toBe(
        PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
      );
    }
  });

  it("treats a 429 with a retry-after as a transient RATE_LIMITED", () => {
    expect(
      classifyProviderError({ status: 429, headers: { "retry-after": "30" } })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
  });

  it("treats a 429 with x-ratelimit headers as RATE_LIMITED", () => {
    expect(
      classifyProviderError({
        status: 429,
        headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "60" },
      })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
  });

  it("treats a 429 with positive x-requests-remaining as RATE_LIMITED (throttled, not spent)", () => {
    expect(
      classifyProviderError({
        status: 429,
        headers: { "x-requests-remaining": "120" },
      })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
  });

  it("treats a 429 with x-requests-remaining: 0 as QUOTA_EXHAUSTED", () => {
    expect(
      classifyProviderError({
        status: 429,
        headers: { "x-requests-remaining": "0" },
      })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED);
  });

  it("defaults a signal-less 429 to QUOTA_EXHAUSTED (founder-actionable)", () => {
    expect(classifyProviderError({ status: 429 })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED
    );
  });

  it("reads headers case-insensitively and from a real Headers object", () => {
    expect(
      classifyProviderError({ status: 429, headers: { "Retry-After": "5" } })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
    expect(
      classifyProviderError({
        status: 429,
        headers: new Headers({ "retry-after": "5" }),
      })
    ).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
  });

  it("maps network/timeout failures (no HTTP status) to PROVIDER_UNAVAILABLE", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(classifyProviderError({ status: null, error: abort })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );

    const fetchFail = new TypeError("fetch failed");
    expect(classifyProviderError({ status: null, error: fetchFail })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );

    const dns = Object.assign(new Error("getaddrinfo ENOTFOUND api"), {
      code: "ENOTFOUND",
    });
    expect(classifyProviderError({ status: null, error: dns })).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );
  });

  it("returns UNKNOWN for a missing status with no recognizable error", () => {
    expect(classifyProviderError({ status: null })).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
    expect(classifyProviderError({ status: null, error: new Error("weird") })).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
  });

  it("returns UNKNOWN for non-auth/quota 4xx and unexpected 2xx/3xx", () => {
    expect(classifyProviderError({ status: 404 })).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
    expect(classifyProviderError({ status: 400 })).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
    expect(classifyProviderError({ status: 200 })).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
  });
});

describe("isProviderFailureStatus", () => {
  it("is true for every provider-failure status", () => {
    for (const status of PROVIDER_FAILURE_STATUSES) {
      expect(isProviderFailureStatus(status)).toBe(true);
    }
  });

  it("is false for non-provider-failure statuses", () => {
    expect(isProviderFailureStatus(PROVIDER_JOB_STATUS.LIVE)).toBe(false);
    expect(isProviderFailureStatus(PROVIDER_JOB_STATUS.DB_UNAVAILABLE)).toBe(
      false
    );
    expect(isProviderFailureStatus(PROVIDER_JOB_STATUS.UNKNOWN)).toBe(false);
  });
});

describe("OddsApiError + providerStatusFromError", () => {
  it("classifies the status onto providerStatus at construction time", () => {
    const authErr = new OddsApiError("nope", 401);
    expect(authErr.providerStatus).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED
    );

    const downErr = new OddsApiError("upstream down", 503);
    expect(downErr.providerStatus).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );
  });

  it("honors an explicitly provided providerStatus override", () => {
    const err = new OddsApiError(
      "throttled",
      429,
      0,
      PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED
    );
    expect(err.providerStatus).toBe(PROVIDER_JOB_STATUS.PROVIDER_RATE_LIMITED);
  });

  it("extracts the carried status from an OddsApiError", () => {
    const err = new OddsApiError("nope", 403);
    expect(providerStatusFromError(err)).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED
    );
  });

  it("classifies a raw network error as PROVIDER_UNAVAILABLE", () => {
    const fetchFail = new TypeError("fetch failed");
    expect(providerStatusFromError(fetchFail)).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );
  });

  it("falls back to UNKNOWN for an unrecognized error", () => {
    expect(providerStatusFromError(new Error("???"))).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
    expect(providerStatusFromError("a string")).toBe(
      PROVIDER_JOB_STATUS.UNKNOWN
    );
  });
});
