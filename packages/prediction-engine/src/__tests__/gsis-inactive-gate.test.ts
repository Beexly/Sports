import { describe, it, expect } from "vitest";
import {
  evaluateInactiveGate,
  resolveGsisId,
  CANONICAL_GSIS_CROSSWALK,
  type PlayerIdentity
} from "../signals/roster/gsis-inactive-gate";

describe("GSIS Inactive Gate & Sovereign Identification Sieve", () => {
  const INACTIVE_FEED = new Set<string>([
    "00-0034844", // Saquon Barkley
    "00-0034796", // Lamar Jackson
    "00-0036322", // Justin Jefferson
  ]);

  it("resolves various name aliases for Saquon Barkley to exact GSIS ID 00-0034844", () => {
    expect(resolveGsisId({ id: "p1", name: "Saquon Barkley", team: "PHI" })).toBe("00-0034844");
    expect(resolveGsisId({ id: "p2", name: "Barkley, Saquon", team: "PHI" })).toBe("00-0034844");
    expect(resolveGsisId({ id: "p3", name: "S. Barkley", team: "PHI" })).toBe("00-0034844");
  });

  it("blocks all aliases of an inactive player", () => {
    const p1: PlayerIdentity = { id: "p1", name: "Saquon Barkley", team: "PHI" };
    const p2: PlayerIdentity = { id: "p2", name: "Barkley, Saquon", team: "PHI" };
    const p3: PlayerIdentity = { id: "p3", name: "S. Barkley", team: "PHI" };

    expect(evaluateInactiveGate(p1, INACTIVE_FEED).isEligible).toBe(false);
    expect(evaluateInactiveGate(p2, INACTIVE_FEED).isEligible).toBe(false);
    expect(evaluateInactiveGate(p3, INACTIVE_FEED).isEligible).toBe(false);
    expect(evaluateInactiveGate(p1, INACTIVE_FEED).status).toBe("INACTIVE_OFFICIAL");
  });

  it("distinguishes Marvin Harrison Jr. from Marvin Harrison (Senior) without suffix collisions", () => {
    // Marvin Harrison Jr. (Cardinals)
    const mhj: PlayerIdentity = { id: "mhj", name: "Marvin Harrison Jr.", team: "ARI" };
    // Senior (Hall of Fame)
    const mhSr: PlayerIdentity = { id: "mhsr", name: "Marvin Harrison", team: "IND" };

    const gsisMhj = resolveGsisId(mhj);
    const gsisSr = resolveGsisId(mhSr);

    expect(gsisMhj).toBe("00-0039912");
    expect(gsisSr).toBe("00-0007137");
    expect(gsisMhj).not.toBe(gsisSr);

    // If Senior is in inactive feed, Junior is NOT blocked
    const inactiveSenior = new Set<string>(["00-0007137"]);
    const resMhj = evaluateInactiveGate(mhj, inactiveSenior);
    expect(resMhj.isEligible).toBe(true);
    expect(resMhj.status).toBe("ACTIVE");

    // If Junior is in inactive feed, Senior is blocked if evaluated
    const inactiveJunior = new Set<string>(["00-0039912"]);
    expect(evaluateInactiveGate(mhj, inactiveJunior).isEligible).toBe(false);
    expect(evaluateInactiveGate(mhSr, inactiveJunior).isEligible).toBe(true);
  });

  it("fails closed to INACTIVE for unresolvable player IDs", () => {
    const unknownPlayer: PlayerIdentity = {
      id: "unknown_999",
      name: "Phantom Ghost Player",
      team: "FA"
    };

    const res = evaluateInactiveGate(unknownPlayer, INACTIVE_FEED);
    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("UNRESOLVED_ID_FAIL_CLOSED");
    expect(res.reason).toContain("failed GSIS ID resolution");
  });

  it("passes active players with verified GSIS IDs", () => {
    const activePlayer: PlayerIdentity = {
      id: "ceedee",
      name: "CeeDee Lamb",
      team: "DAL"
    };

    const res = evaluateInactiveGate(activePlayer, INACTIVE_FEED);
    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("ACTIVE");
    expect(res.gsisId).toBe("00-0036358");
  });
});
