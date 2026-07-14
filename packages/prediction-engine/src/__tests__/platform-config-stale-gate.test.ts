import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPlatformConfig } from "../platform-config.js";
import { getReadinessGates } from "../readiness.js";

/**
 * Stale-Data Kill Switch — config wiring contract.
 *
 * The non-negotiable contract is fail-closed by default: with the env var unset
 * or empty, forceNoBetIfStale MUST be true. An operator can explicitly set a
 * false-like value only as an emergency override. The value is mirrored onto
 * the readiness gates exactly like every other config flag.
 */

describe("FORCE_NO_BET_IF_STALE gate", () => {
  const original = process.env["FORCE_NO_BET_IF_STALE"];

  beforeEach(() => {
    delete process.env["FORCE_NO_BET_IF_STALE"];
  });

  afterEach(() => {
    if (original === undefined) delete process.env["FORCE_NO_BET_IF_STALE"];
    else process.env["FORCE_NO_BET_IF_STALE"] = original;
  });

  it("defaults to true when the env var is unset", () => {
    expect(getPlatformConfig().forceNoBetIfStale).toBe(true);
  });

  it("defaults to true when the env var is empty", () => {
    process.env["FORCE_NO_BET_IF_STALE"] = "";
    expect(getPlatformConfig().forceNoBetIfStale).toBe(true);
  });

  it("enables on \"true\" and \"1\" (canonical parseBool truthy values)", () => {
    process.env["FORCE_NO_BET_IF_STALE"] = "true";
    expect(getPlatformConfig().forceNoBetIfStale).toBe(true);
    process.env["FORCE_NO_BET_IF_STALE"] = "1";
    expect(getPlatformConfig().forceNoBetIfStale).toBe(true);
  });

  it("stays off for non-truthy values", () => {
    for (const v of ["false", "0", "no", "yes", "TRUE-ish"]) {
      process.env["FORCE_NO_BET_IF_STALE"] = v;
      expect(getPlatformConfig().forceNoBetIfStale).toBe(false);
    }
  });

  it("is mirrored onto the readiness gates and defaults to true there too", () => {
    expect(getReadinessGates().forceNoBetIfStale).toBe(true);
    process.env["FORCE_NO_BET_IF_STALE"] = "true";
    expect(getReadinessGates().forceNoBetIfStale).toBe(true);
  });
});
