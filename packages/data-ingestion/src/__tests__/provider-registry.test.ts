import { describe, it, expect } from "vitest";
import {
  ODDS_PROVIDER_REGISTRY,
  THE_ODDS_API_PROVIDER,
  ODDS_API_IO_FALLBACK,
  API_SPORTS_FALLBACK,
  PRIMARY_PROVIDER_ENV_VAR,
  FALLBACK_STUB_STATUS,
  isEnvVarPresent,
  fallbackStubStatus,
  resolveProviderOrder,
  resolvePrimaryProvider,
  type EnvLike,
} from "../provider-registry.js";
import { PROVIDER_JOB_STATUS } from "../provider-status.js";

/**
 * Multi-provider failover registry (scaffold). These tests pin the three
 * properties the scaffold must guarantee:
 *   1. The Odds API resolves as PRIMARY with the standard env.
 *   2. An unconfigured fallback is excluded entirely, and "using" a stub is
 *      classified as the inert PROVIDER_UNAVAILABLE — never a masked success.
 *   3. Ordering is deterministic for a given env.
 * The registry is pure (env-presence only), so every case is exhaustive and
 * free of I/O.
 */

const PRIMARY_ONLY: EnvLike = { [PRIMARY_PROVIDER_ENV_VAR]: "present-key" };

describe("resolveProviderOrder — primary", () => {
  it("resolves The Odds API as the sole primary with the standard env", () => {
    const order = resolveProviderOrder(PRIMARY_ONLY);
    expect(order).toHaveLength(1);
    expect(order[0]?.id).toBe("the-odds-api");
    expect(order[0]?.role).toBe("primary");
    expect(order[0]?.priority).toBe(0);
  });

  it("matches today's single-provider behavior: only the primary, no fallbacks", () => {
    const order = resolveProviderOrder(PRIMARY_ONLY);
    expect(order.map((p) => p.id)).toEqual(["the-odds-api"]);
    expect(order.every((p) => p.role === "primary")).toBe(true);
  });

  it("resolvePrimaryProvider returns The Odds API for the standard env", () => {
    expect(resolvePrimaryProvider(PRIMARY_ONLY)?.id).toBe("the-odds-api");
  });

  it("returns an empty order and null primary when nothing is configured", () => {
    expect(resolveProviderOrder({})).toEqual([]);
    expect(resolvePrimaryProvider({})).toBeNull();
  });
});

describe("resolveProviderOrder — fallbacks are inert until keyed", () => {
  it("excludes an unconfigured fallback entirely", () => {
    const order = resolveProviderOrder(PRIMARY_ONLY);
    expect(order.map((p) => p.id)).not.toContain("odds-api-io");
    expect(order.map((p) => p.id)).not.toContain("api-sports");
  });

  it("includes a fallback only once its own env var is present", () => {
    const env: EnvLike = {
      [PRIMARY_PROVIDER_ENV_VAR]: "present-key",
      [ODDS_API_IO_FALLBACK.envVar]: "fallback-key",
    };
    const order = resolveProviderOrder(env);
    expect(order.map((p) => p.id)).toEqual(["the-odds-api", "odds-api-io"]);
    // The unkeyed fallback stays excluded.
    expect(order.map((p) => p.id)).not.toContain("api-sports");
  });

  it("never resolves a fallback without the primary key (the primary is unconfigured)", () => {
    const env: EnvLike = { [API_SPORTS_FALLBACK.envVar]: "fallback-key" };
    const order = resolveProviderOrder(env);
    // The primary is absent, so only the configured fallback resolves.
    expect(order.map((p) => p.id)).toEqual(["api-sports"]);
    expect(resolvePrimaryProvider(env)?.id).toBe("api-sports");
  });

  it("can resolve primary-only on request, excluding even configured fallbacks", () => {
    const env: EnvLike = {
      [PRIMARY_PROVIDER_ENV_VAR]: "present-key",
      [ODDS_API_IO_FALLBACK.envVar]: "fallback-key",
    };
    const order = resolveProviderOrder(env, { includeFallbacks: false });
    expect(order.map((p) => p.id)).toEqual(["the-odds-api"]);
  });

  it("classifies invoking an inert fallback stub as PROVIDER_UNAVAILABLE", () => {
    expect(fallbackStubStatus()).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE
    );
    expect(FALLBACK_STUB_STATUS).toBe(PROVIDER_JOB_STATUS.PROVIDER_UNAVAILABLE);
  });
});

describe("resolveProviderOrder — deterministic ordering", () => {
  const FULLY_CONFIGURED: EnvLike = {
    [PRIMARY_PROVIDER_ENV_VAR]: "present-key",
    [ODDS_API_IO_FALLBACK.envVar]: "io-key",
    [API_SPORTS_FALLBACK.envVar]: "sports-key",
  };

  it("orders by ascending priority: primary first, then fallbacks", () => {
    const order = resolveProviderOrder(FULLY_CONFIGURED);
    expect(order.map((p) => p.id)).toEqual([
      "the-odds-api",
      "odds-api-io",
      "api-sports",
    ]);
    const priorities = order.map((p) => p.priority);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it("is stable across repeated calls for the same env", () => {
    const a = resolveProviderOrder(FULLY_CONFIGURED).map((p) => p.id);
    const b = resolveProviderOrder(FULLY_CONFIGURED).map((p) => p.id);
    expect(a).toEqual(b);
  });

  it("does not mutate the underlying registry", () => {
    const before = ODDS_PROVIDER_REGISTRY.map((p) => p.id);
    resolveProviderOrder(FULLY_CONFIGURED);
    const after = ODDS_PROVIDER_REGISTRY.map((p) => p.id);
    expect(after).toEqual(before);
  });

  it("declares distinct priorities so ties never decide the order", () => {
    const priorities = ODDS_PROVIDER_REGISTRY.map((p) => p.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
  });
});

describe("registry shape + presence-only config", () => {
  it("has exactly one primary and the rest fallbacks", () => {
    const primaries = ODDS_PROVIDER_REGISTRY.filter(
      (p) => p.role === "primary"
    );
    expect(primaries).toHaveLength(1);
    expect(primaries[0]).toBe(THE_ODDS_API_PROVIDER);
    expect(
      ODDS_PROVIDER_REGISTRY.filter((p) => p.role === "fallback").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("isEnvVarPresent treats absent and blank vars as not configured", () => {
    expect(isEnvVarPresent({ K: "value" }, "K")).toBe(true);
    expect(isEnvVarPresent({}, "K")).toBe(false);
    expect(isEnvVarPresent({ K: "" }, "K")).toBe(false);
    expect(isEnvVarPresent({ K: "   " }, "K")).toBe(false);
    expect(isEnvVarPresent({ K: undefined }, "K")).toBe(false);
  });

  it("isConfigured is presence-only: a blank value does not enable a provider", () => {
    expect(
      THE_ODDS_API_PROVIDER.isConfigured({ [PRIMARY_PROVIDER_ENV_VAR]: "" })
    ).toBe(false);
    expect(
      THE_ODDS_API_PROVIDER.isConfigured({
        [PRIMARY_PROVIDER_ENV_VAR]: "x",
      })
    ).toBe(true);
    expect(API_SPORTS_FALLBACK.isConfigured({})).toBe(false);
  });
});
