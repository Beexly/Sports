import { describe, expect, it } from "vitest";
import { canMintSignalPicksNow } from "@/lib/cron/noon-lock-window-guard";
import { signUnlockCookie, verifyUnlockCookie } from "@/lib/packages/unlock-cookie";

describe("per-slug unlock cookies and Noon Lock window guard", () => {
  it("mints and verifies slug-bound unlock cookies while blocking cross-slug replay", () => {
    const nowMs = 1_760_000_000_000;
    const cookie = signUnlockCookie({
      sessionId: "cs_live_session_42",
      slug: "week8-snf-pack",
      nowMs,
      ttlMs: 60_000,
    });

    expect(cookie).toContain(".");
    expect(verifyUnlockCookie(cookie, "week8-snf-pack", nowMs + 1000)).toEqual({
      valid: true,
      sessionId: "cs_live_session_42",
    });

    // Cross-slug replay must fail closed.
    expect(verifyUnlockCookie(cookie, "vip-season-pass", nowMs + 1000)).toEqual({
      valid: false,
      sessionId: null,
    });

    // Expired cookies must fail closed.
    expect(verifyUnlockCookie(cookie, "week8-snf-pack", nowMs + 120_000)).toEqual({
      valid: false,
      sessionId: null,
    });

    // Tampered signatures must fail closed.
    const parts = cookie.split(".");
    const tampered = `${parts[0]}.${parts[1]}.0000${parts[2]?.slice(4) ?? ""}`;
    expect(verifyUnlockCookie(tampered, "week8-snf-pack", nowMs + 1000)).toEqual({
      valid: false,
      sessionId: null,
    });
  });

  it("permits production signal minting inside Noon Master Lock & blocks off-cadence hours", () => {
    const prodEnv = { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;

    // Wednesday 2026-11-18 12:05 America/Chicago == 18:05Z (CST is UTC-6)
    const wedNoon = new Date("2026-11-18T18:05:00.000Z");
    const req = new Request("https://www.galaxysportsedge.com/api/cron/generate-signal-slate");
    expect(canMintSignalPicksNow(req, wedNoon, prodEnv)).toEqual({
      allowed: true,
      reason: "within_canonical_seal_window",
    });

    // Tuesday 2026-11-17 03:15 America/Chicago == 09:15Z (off-cadence)
    const tueOffHours = new Date("2026-11-17T09:15:00.000Z");
    expect(canMintSignalPicksNow(req, tueOffHours, prodEnv)).toEqual({
      allowed: false,
      reason: "outside_canonical_noon_or_t90_window",
    });

    // Explicit manual lockWindow override permits execution cleanly
    const overrideReq = new Request(
      "https://www.galaxysportsedge.com/api/cron/generate-signal-slate?lockWindow=1",
    );
    expect(canMintSignalPicksNow(overrideReq, tueOffHours, prodEnv)).toEqual({
      allowed: true,
      reason: "query_window_override",
    });
  });
});
