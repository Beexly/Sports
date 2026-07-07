import { describe, it, expect } from "vitest";
import { getEntitlements } from "@sports/types";
import {
  loadDynastyProfile,
  type DynastyCountDb,
  type DynastyGates,
} from "@/lib/dynasty/load-dynasty-profile";

interface Counts {
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  beatClose: number;
  graded: number;
}

/** A db whose pick.count answers from a fixed set of real-shaped counts. */
function fakeDb(c: Counts): DynastyCountDb {
  return {
    pick: {
      count: async ({ where }) => {
        const result = where["result"];
        if (result && typeof result === "object" && "in" in (result as object)) return c.settled;
        if (result === "WIN") return c.wins;
        if (result === "LOSS") return c.losses;
        if (result === "PUSH") return c.pushes;
        const verdict = where["clvVerdict"];
        if (verdict === "BEAT_CLOSE") return c.beatClose;
        if (verdict && typeof verdict === "object" && "in" in (verdict as object)) return c.graded;
        return 0;
      },
    },
  };
}

const GATES_LIVE: DynastyGates = { performanceStatsEnabled: true, minSettledPicksForLearning: 25, calibrationActive: true };

describe("loadDynastyProfile — real record → profile", () => {
  it("returns the anonymous world for a signed-out viewer (entitlements null)", async () => {
    const profile = await loadDynastyProfile({ db: fakeDb({ settled: 999, wins: 999, losses: 0, pushes: 0, beatClose: 999, graded: 999 }), gates: GATES_LIVE, entitlements: null });
    expect(profile.authenticated).toBe(false);
    expect(profile.tier).toBe("FREE");
    expect(profile.vault.floorsEarned).toBe(0); // no proof leaks in for the anonymous world
  });

  it("maps canonical counts into rank, record, and CLV", async () => {
    const profile = await loadDynastyProfile({
      db: fakeDb({ settled: 120, wins: 70, losses: 45, pushes: 5, beatClose: 60, graded: 100 }),
      gates: GATES_LIVE,
      entitlements: getEntitlements("FREE"),
    });
    expect(profile.authenticated).toBe(true);
    expect(profile.vault.settledRecord).toBe("70-45-5");
    expect(profile.vault.clvBeatRate).toBeCloseTo(0.6, 5);
    // 120 settled + calibration live → PROVEN (but not Established: <500 settled).
    expect(profile.rank.id).toBe("PROVEN");
    expect(profile.vault.floors.find((f) => f.label === "Calibrated")!.earned).toBe(true);
    expect(profile.vault.proofPublic).toBe(true); // 120 ≥ minSettled(25) and stats enabled
  });

  it("honors the real calibration gate — calibration off keeps the Calibrated floor locked and rank Rookie", async () => {
    const profile = await loadDynastyProfile({
      db: fakeDb({ settled: 120, wins: 80, losses: 40, pushes: 0, beatClose: 70, graded: 100 }),
      gates: { performanceStatsEnabled: true, minSettledPicksForLearning: 25, calibrationActive: false },
      entitlements: getEntitlements("FREE"),
    });
    expect(profile.rank.id).toBe("ROOKIE"); // PROVEN needs published calibration
    expect(profile.vault.floors.find((f) => f.label === "Calibrated")!.earned).toBe(false);
  });

  it("unlocks the GM Tower on a real Fantasy entitlement", async () => {
    const profile = await loadDynastyProfile({
      db: fakeDb({ settled: 5, wins: 3, losses: 2, pushes: 0, beatClose: 0, graded: 0 }),
      gates: GATES_LIVE,
      entitlements: getEntitlements("FANTASY"),
    });
    expect(profile.districts.find((d) => d.id === "gm-tower")!.unlocked).toBe(true);
    expect(profile.vault.clvBeatRate).toBeNull(); // no graded picks yet
  });
});
