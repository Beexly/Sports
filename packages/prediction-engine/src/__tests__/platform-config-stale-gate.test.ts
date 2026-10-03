import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPlatformConfig } from "../platform-config.js";
import { getReadinessGates } from "../readiness.js";

/**
 * Stale-Data Kill Switch — config wiring contract.
 *
 * The FORCE_NO_BET_IF_STALE gate ships DARK. The non-negotiable here is the
 * DEFAULT: with the env var unset (or empty), forceNoBetIfStale MUST be false,
 * which is what keeps the public picks surface byte-for-byte identical to today.
 * It must also follow the canonical parseBool wiring (true/1 enable, anything
 * else off) and be mirrored onto the readiness gates exactly like every other
 * config flag.
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

  it("defaults to false when the env var is unset", () => {
    expect(getPlatformConfig().forceNoBetIfStale).toBe(false);
  });

  it("defaults to false when the env var is empty", () => {
    process.env["FORCE_NO_BET_IF_STALE"] = "";
    expect(getPlatformConfig().forceNoBetIfStale).toBe(false);
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

  it("is mirrored onto the readiness gates and defaults to false there too", () => {
    expect(getReadinessGates().forceNoBetIfStale).toBe(false);
    process.env["FORCE_NO_BET_IF_STALE"] = "true";
    expect(getReadinessGates().forceNoBetIfStale).toBe(true);
  });
});
