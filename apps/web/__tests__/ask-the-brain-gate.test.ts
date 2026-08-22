import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  canLaunchPublicBrain,
  ASK_THE_BRAIN_PREREQUISITES,
  type AskTheBrainPrerequisites,
} from "@/lib/launch/ask-the-brain-gate";

/**
 * S5 — the public Ask-the-Brain surface does not exist yet, and cannot
 * launch until all four prerequisites are independently true.
 */

const ALL_TRUE: AskTheBrainPrerequisites = {
  evidenceVaultTested: true,
  claimGovernanceTested: true,
  methodologyPagesLive: true,
  cockpitQaQualityGatePassed: true,
};

describe("ASK_THE_BRAIN_PREREQUISITES — today's honest state", () => {
  it("is hard-coded false on every prerequisite", () => {
    expect(Object.values(ASK_THE_BRAIN_PREREQUISITES)).toEqual([false, false, false, false]);
  });
});

describe("canLaunchPublicBrain", () => {
  it("is blocked with all four reasons when nothing is ready (today's real state)", () => {
    const d = canLaunchPublicBrain();
    expect(d.canLaunch).toBe(false);
    expect(d.missing.sort()).toEqual(
      [
        "cockpitQaQualityGatePassed",
        "claimGovernanceTested",
        "evidenceVaultTested",
        "methodologyPagesLive",
      ].sort(),
    );
  });

  it("requires ALL FOUR — three true is still blocked", () => {
    const d = canLaunchPublicBrain({ ...ALL_TRUE, methodologyPagesLive: false });
    expect(d.canLaunch).toBe(false);
    expect(d.missing).toEqual(["methodologyPagesLive"]);
  });

  it("launches only when every prerequisite is true", () => {
    const d = canLaunchPublicBrain(ALL_TRUE);
    expect(d.canLaunch).toBe(true);
    expect(d.missing).toEqual([]);
  });

  it("each prerequisite is individually load-bearing", () => {
    for (const key of Object.keys(ALL_TRUE) as (keyof AskTheBrainPrerequisites)[]) {
      const d = canLaunchPublicBrain({ ...ALL_TRUE, [key]: false });
      expect(d.canLaunch, key).toBe(false);
      expect(d.missing, key).toEqual([key]);
    }
  });
});

/**
 * Route-absence assertion — mirrors the filesystem-walk pattern in
 * no-fake-percentages.test.ts's walkSurfaces. Directly checks the repo state
 * rather than trusting the gate module alone: even a correct gate is only
 * half the contract if a route already exists that ignores it.
 */
describe("no public route exists for Ask-the-Brain outside /cockpit", () => {
  const repoRoot = resolve(__dirname, "..");
  const APP_DIR = resolve(repoRoot, "app");
  const ROUTE_NAME_PATTERN = /(ask|brain|qa)/i;

  function topLevelRouteDirs(dir: string): string[] {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return [];
    }
    return entries.filter((entry) => {
      const full = join(dir, entry);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        return false;
      }
      return stat.isDirectory();
    });
  }

  it("no top-level app/ route directory matches /(ask|brain|qa)/i, except cockpit's own subtree", () => {
    const routes = topLevelRouteDirs(APP_DIR).filter((r) => r !== "cockpit");
    const offenders = routes.filter((r) => ROUTE_NAME_PATTERN.test(r));
    expect(offenders).toEqual([]);
  });

  it("cockpit MAY contain ask/brain/qa-named routes (internal, not gated by this module)", () => {
    // Sanity check on the pattern itself, not a requirement — this just
    // proves the regex isn't accidentally too narrow to ever match anything.
    expect(ROUTE_NAME_PATTERN.test("ask")).toBe(true);
    expect(ROUTE_NAME_PATTERN.test("brain")).toBe(true);
    expect(ROUTE_NAME_PATTERN.test("qa")).toBe(true);
    expect(ROUTE_NAME_PATTERN.test("dashboard")).toBe(false);
  });
});
