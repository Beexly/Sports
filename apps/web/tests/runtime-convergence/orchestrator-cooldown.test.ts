/**
 * C44 — Orchestrator Cooldown Test
 *
 * Asserts that the runtime resolver suppresses bet CTAs and upsell
 * when the user mode is post-loss-cooldown or in-restraint.
 */

import { describe, it, expect } from "vitest";
import { resolveNextBest } from "@/lib/experience/runtime-resolver";

describe("Orchestrator — post-loss-cooldown mode suppresses actions", () => {
  it("suppressBetCTA is true in post-loss-cooldown", () => {
    const result = resolveNextBest({
      route: "/today",
      userMode: "post-loss-cooldown",
    });
    expect(result.suppressBetCTA).toBe(true);
  });

  it("suppressUpsell is true in post-loss-cooldown", () => {
    const result = resolveNextBest({
      route: "/today",
      userMode: "post-loss-cooldown",
    });
    expect(result.suppressUpsell).toBe(true);
  });

  it("suppressBetCTA is true in in-restraint mode", () => {
    const result = resolveNextBest({
      route: "/picks",
      userMode: "in-restraint",
    });
    expect(result.suppressBetCTA).toBe(true);
  });

  it("suppressBetCTA is false in returning-scan mode (default)", () => {
    const result = resolveNextBest({
      route: "/today",
      userMode: "returning-scan",
    });
    expect(result.suppressBetCTA).toBe(false);
  });
});
