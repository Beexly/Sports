import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReadinessGates } from "@sports/prediction-engine";

/**
 * PUBLIC_PICKS and FORCE_NO_BET_IF_STALE are INDEPENDENT flags.
 *
 * operating-kernel.ts once carried a comment claiming the stale kill switch was
 * "auto-on with PUBLIC_PICKS". It is not: platform-config reads
 * FORCE_NO_BET_IF_STALE straight from the env with default false, and
 * public-freshness-gate is only consulted when forceNoBetIfStale is true.
 * Believing the old comment is exactly how a stale public board ships, so pin
 * the real coupling (there is none) as behaviour rather than prose.
 */
describe("FORCE_NO_BET_IF_STALE does not ride along with PUBLIC_PICKS", () => {
  const saved = {
    stale: process.env["FORCE_NO_BET_IF_STALE"],
    picks: process.env["PUBLIC_PICKS_ENABLED"],
  };

  beforeEach(() => {
    delete process.env["FORCE_NO_BET_IF_STALE"];
    delete process.env["PUBLIC_PICKS_ENABLED"];
  });

  afterEach(() => {
    if (saved.stale === undefined) delete process.env["FORCE_NO_BET_IF_STALE"];
    else process.env["FORCE_NO_BET_IF_STALE"] = saved.stale;
    if (saved.picks === undefined) delete process.env["PUBLIC_PICKS_ENABLED"];
    else process.env["PUBLIC_PICKS_ENABLED"] = saved.picks;
  });

  it("defaults to false when nothing is set", () => {
    expect(getReadinessGates().forceNoBetIfStale).toBe(false);
  });

  it("STAYS false when PUBLIC_PICKS_ENABLED is turned on alone", () => {
    process.env["PUBLIC_PICKS_ENABLED"] = "true";
    // The load-bearing assertion: opening the public surface does NOT arm the
    // staleness kill switch. Both flags must be flipped, together, by hand.
    expect(getReadinessGates().forceNoBetIfStale).toBe(false);
  });

  it("arms only when FORCE_NO_BET_IF_STALE itself is set", () => {
    process.env["FORCE_NO_BET_IF_STALE"] = "true";
    expect(getReadinessGates().forceNoBetIfStale).toBe(true);
  });
});
