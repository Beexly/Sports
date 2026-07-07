import { describe, it, expect } from "vitest";
import {
  deriveDynastyProfile,
  anonymousDynastyProfile,
  DYNASTY_RANKS,
  DYNASTY_DISTRICTS,
  DYNASTY_RANK_THRESHOLDS,
  VIG_BREAK_EVEN_CLV,
  type DynastyProofInput,
} from "@/lib/dynasty/dynasty-progression";

/** A signed-in player with fully-controllable real facts. */
function player(overrides: Partial<DynastyProofInput["proof"]> = {}, entOverrides: Partial<DynastyProofInput["entitlements"]> = {}, tier: DynastyProofInput["tier"] = "FREE"): DynastyProofInput {
  return {
    tier,
    authenticated: true,
    entitlements: { canUseFantasyFull: false, canUseClvLedger: false, canGetAlerts: false, ...entOverrides },
    proof: {
      canonicalSettledCount: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      clvBeatRate: null,
      hasPublishedCalibration: false,
      performanceStatsPublic: false,
      ...overrides,
    },
  };
}

describe("Galaxy Dynasty — the named ladder", () => {
  it("names a four-rung ladder in ascending order, mirroring the pricing ladder", () => {
    expect(DYNASTY_RANKS.map((r) => r.id)).toEqual(["ROOKIE", "PROVEN", "ESTABLISHED", "AUTHORITY"]);
    DYNASTY_RANKS.forEach((r, i) => expect(r.order).toBe(i));
  });

  it("pins the break-even close rate to the same 52.4% used across GSN", () => {
    expect(VIG_BREAK_EVEN_CLV).toBe(0.524);
  });
});

describe("Galaxy Dynasty — rank is derived from real proof, not invented XP", () => {
  it("a new signed-in player is a Rookie needing settled picks + calibration to advance", () => {
    const p = deriveDynastyProfile(player());
    expect(p.rank.id).toBe("ROOKIE");
    expect(p.rank.next).toBe("PROVEN");
    expect(p.rank.progressToNext).toBe(0);
    expect(p.rank.requirementForNext).toContain("settled picks");
    expect(p.rank.requirementForNext).toContain("calibration");
  });

  it("PROVEN requires BOTH ≥100 settled AND a published calibration", () => {
    // 100 settled but no calibration → still Rookie.
    expect(deriveDynastyProfile(player({ canonicalSettledCount: 100 })).rank.id).toBe("ROOKIE");
    // calibration but too few settled → still Rookie.
    expect(deriveDynastyProfile(player({ canonicalSettledCount: 99, hasPublishedCalibration: true })).rank.id).toBe("ROOKIE");
    // both → PROVEN.
    expect(deriveDynastyProfile(player({ canonicalSettledCount: 100, hasPublishedCalibration: true })).rank.id).toBe("PROVEN");
  });

  it("ESTABLISHED requires ≥500 settled AND beating the close — and is a true ladder above PROVEN", () => {
    // 500 settled + beats close but NO calibration → cannot skip PROVEN, stays Rookie.
    const skipper = deriveDynastyProfile(player({ canonicalSettledCount: 500, clvBeatRate: 0.55, hasPublishedCalibration: false }));
    expect(skipper.rank.id).toBe("ROOKIE");

    // All gates below satisfied → ESTABLISHED.
    const est = deriveDynastyProfile(player({ canonicalSettledCount: 500, clvBeatRate: VIG_BREAK_EVEN_CLV, hasPublishedCalibration: true }));
    expect(est.rank.id).toBe("ESTABLISHED");
    expect(est.rank.next).toBe("AUTHORITY");
  });

  it("a beat rate just under 52.4% does not clear ESTABLISHED", () => {
    const p = deriveDynastyProfile(player({ canonicalSettledCount: 500, clvBeatRate: 0.523, hasPublishedCalibration: true }));
    expect(p.rank.id).toBe("PROVEN");
    expect(p.rank.requirementForNext).toContain("52.4%");
  });

  it("AUTHORITY needs the deep sample and sustained close-beating", () => {
    const p = deriveDynastyProfile(
      player({ canonicalSettledCount: DYNASTY_RANK_THRESHOLDS.authoritySettled, clvBeatRate: 0.55, hasPublishedCalibration: true })
    );
    expect(p.rank.id).toBe("AUTHORITY");
    expect(p.rank.next).toBeNull();
    expect(p.rank.progressToNext).toBe(1);
    expect(p.rank.requirementForNext).toBeNull();
  });

  it("progressToNext is a composite that stays honest when one requirement lags", () => {
    // Halfway to 100 settled, calibration present → composite capped by the settled fraction (0.5).
    const p = deriveDynastyProfile(player({ canonicalSettledCount: 50, hasPublishedCalibration: true }));
    expect(p.rank.progressToNext).toBeCloseTo(0.5, 5);
    // Calibration missing → composite floored at 0 regardless of settled count.
    const q = deriveDynastyProfile(player({ canonicalSettledCount: 90, hasPublishedCalibration: false }));
    expect(q.rank.progressToNext).toBe(0);
  });
});

describe("Galaxy Dynasty — districts embody real GSN surfaces", () => {
  it("exposes six districts mapped to real routes", () => {
    expect(DYNASTY_DISTRICTS).toHaveLength(6);
    const routes = DYNASTY_DISTRICTS.map((d) => d.gsnRoute);
    expect(routes).toContain("/vault");
    expect(routes).toContain("/the-beat");
    expect(routes).toContain("/fantasy");
  });

  it("public districts are always walkable; Blacktop & Vault open on the first settled pick", () => {
    const fresh = deriveDynastyProfile(player());
    const byId = Object.fromEntries(fresh.districts.map((d) => [d.id, d]));
    expect(byId["rookie-plaza"]!.unlocked).toBe(true);
    expect(byId["the-beat"]!.unlocked).toBe(true);
    expect(byId["the-depths"]!.unlocked).toBe(true);
    expect(byId["blacktop"]!.unlocked).toBe(false);
    expect(byId["the-vault"]!.unlocked).toBe(false);
    expect(byId["blacktop"]!.lockReason).toBeTruthy();

    const active = deriveDynastyProfile(player({ canonicalSettledCount: 1 }));
    const activeById = Object.fromEntries(active.districts.map((d) => [d.id, d]));
    expect(activeById["blacktop"]!.unlocked).toBe(true);
    expect(activeById["the-vault"]!.unlocked).toBe(true);
  });

  it("GM Tower is gated by the real Fantasy entitlement, not by tier name guessing", () => {
    expect(deriveDynastyProfile(player({}, { canUseFantasyFull: false })).districts.find((d) => d.id === "gm-tower")!.unlocked).toBe(false);
    expect(deriveDynastyProfile(player({}, { canUseFantasyFull: true }), ).districts.find((d) => d.id === "gm-tower")!.unlocked).toBe(true);
  });
});

describe("Galaxy Dynasty — the Vault is the player's real record", () => {
  it("floors are earned by real thresholds and reported as W-L-P", () => {
    const p = deriveDynastyProfile(player({ canonicalSettledCount: 120, wins: 70, losses: 45, pushes: 5, hasPublishedCalibration: true, clvBeatRate: 0.53 }));
    expect(p.vault.settledRecord).toBe("70-45-5");
    expect(p.vault.winRate).toBeCloseTo(70 / 115, 5);
    const earned = p.vault.floors.filter((f) => f.earned).map((f) => f.label);
    expect(earned).toContain("Foundation");
    expect(earned).toContain("Century");
    expect(earned).toContain("Calibrated");
    expect(earned).toContain("Beats the Close");
    expect(earned).not.toContain("Established"); // only 120 settled
  });

  it("win rate is null with no decided picks (pushes don't count)", () => {
    const p = deriveDynastyProfile(player({ wins: 0, losses: 0, pushes: 3, canonicalSettledCount: 3 }));
    expect(p.vault.winRate).toBeNull();
  });
});

describe("Galaxy Dynasty — fail-closed anonymous world", () => {
  it("a signed-out viewer gets FREE, zero proof, and no leaked premium state", () => {
    const p = anonymousDynastyProfile();
    expect(p.authenticated).toBe(false);
    expect(p.tier).toBe("FREE");
    expect(p.rank.id).toBe("ROOKIE");
    expect(p.vault.floorsEarned).toBe(0);
    expect(p.summary).toContain("Sign in");
    // Nothing gated is unlocked.
    expect(p.districts.find((d) => d.id === "gm-tower")!.unlocked).toBe(false);
    expect(p.districts.find((d) => d.id === "blacktop")!.unlocked).toBe(false);
  });
});
