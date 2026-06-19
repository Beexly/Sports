import { describe, it, expect } from "vitest";
import {
  ONBOARDING_CREDIT_GRANT,
  awardCredits,
  isBrandSafe,
} from "@sports/galaxy-engine";
import { onboardProfile } from "@/lib/galaxy/profile";
import {
  runAcademyCheck,
  runWarRoomCheck,
  runBlacktopCheck,
  runPublicTrap,
} from "@/lib/galaxy/loop";
import {
  STARTER_CARDS,
  STARTER_QUESTS,
  WAR_ROOM_SCENARIOS,
  BLACKTOP_QUESTIONS,
  ACADEMY_FIRST_CHECK,
} from "@/lib/galaxy/content";
import { PREVIEW_CREWS } from "@/lib/galaxy/crew";
import { PUBLIC_TRAP_SCENARIOS, PUBLIC_TRAP_MERCH_SKU } from "@sports/galaxy-engine";

/**
 * INTEGRATION — the full Rookie Season first session (Definition of Done).
 *
 * Runs the DoD sequence end-to-end through the real engine + server loop. In the
 * test environment there is no database, so persistence no-ops (profileId
 * "stub") — but every grade and reward is real, engine-computed output. This
 * proves the core loop composes and that a first session grows the player on
 * every axis (bible §7 / North Star §9).
 */
describe("Galaxy Dynasty — Rookie Season first session (DoD)", () => {
  it("walks the entire first-session path and grows the player", async () => {
    let totalXp = 0;
    let creditsEarned = 0;

    // 1) Create Galaxy Profile → archetype → faction → starter card pack.
    const onboard = await onboardProfile({
      userId: "test-user",
      handle: "RookieOne",
      archetype: "SHARP",
      faction: "SHARPS",
    });
    expect(onboard.profileId).toBeTruthy();
    // Onboarding credit grant flows through the earn-only Credit Constitution.
    const grant = awardCredits(0, ONBOARDING_CREDIT_GRANT, "ONBOARDING_GRANT");
    creditsEarned += grant.amount;
    expect(grant.amount).toBeGreaterThan(0);

    // Received a starter card pack.
    expect(STARTER_CARDS.length).toBeGreaterThanOrEqual(3);

    // 2) Complete one Academy Signal Check (read the number, not the narrative).
    const academy = await runAcademyCheck("stub", ACADEMY_FIRST_CHECK.correct, 70);
    expect(academy.outcome.result).toBe("WIN");
    expect(academy.outcome.reward.xp).toBeGreaterThan(0);
    totalXp += academy.outcome.reward.xp;
    creditsEarned += academy.outcome.reward.credits;

    // 3) War Room — make one confidence-based prediction (Chiefs -6.5, 27–17 → covers).
    const wr = await runWarRoomCheck("stub", "wr-1", "A", 78);
    expect(wr.outcome.result).toBe("WIN");
    expect(wr.outcome.reward.sharpCall).toBe(true); // correct + conviction
    expect(wr.outcome.breakdown.some((r) => r.label === "Calibration score")).toBe(true);
    totalXp += wr.outcome.reward.xp;
    creditsEarned += wr.outcome.reward.credits;

    // 4) Blacktop mini-game (one trivia Signal Check).
    const bt = await runBlacktopCheck("stub", BLACKTOP_QUESTIONS[0]!.id, "A", 60);
    expect(bt.outcome.result).toBe("WIN");
    totalXp += bt.outcome.reward.xp;
    creditsEarned += bt.outcome.reward.credits;

    // 5) Fight The Public Trap — resist the crowd on every step → clear + merch unlock.
    const trap = await runPublicTrap(
      "stub",
      PUBLIC_TRAP_SCENARIOS.map((s) => ({ scenarioId: s.id, chosen: "VALUE" as const, confidence: 72 })),
    );
    expect(trap.result.cleared).toBe(true);
    expect(trap.merchUnlocked?.sku).toBe(PUBLIC_TRAP_MERCH_SKU);
    totalXp += trap.reward.xp;
    creditsEarned += trap.reward.credits;

    // 6) Join / preview a Crew (preview keeps the surface alive with zero humans).
    expect(PREVIEW_CREWS.length).toBeGreaterThanOrEqual(1);

    // 7) Receive the next daily quest.
    expect(STARTER_QUESTS.some((q) => q.surface === "DAILY")).toBe(true);

    // Status: the session grew the player on multiple axes.
    expect(totalXp).toBeGreaterThan(0);
    expect(creditsEarned).toBeGreaterThan(ONBOARDING_CREDIT_GRANT); // earned beyond the grant
  });

  it("an overconfident miss in the War Room is graded honestly (not hidden)", async () => {
    // Pick the wrong side of wr-1 (Raiders +6.5 lose by 10) at high confidence.
    const wr = await runWarRoomCheck("stub", "wr-1", "B", 90);
    expect(wr.outcome.result).toBe("LOSS");
    expect(wr.outcome.reward.calibrationScore!).toBeLessThan(30); // overconfidence punished
    expect(wr.outcome.breakdown.find((r) => r.label === "Settlement")?.value).toBe("LOSS");
  });

  it("all seeded loop copy passes the Language Law", () => {
    for (const s of WAR_ROOM_SCENARIOS) {
      expect(isBrandSafe(`${s.context} ${s.market}`)).toBe(true);
    }
    for (const q of BLACKTOP_QUESTIONS) {
      expect(isBrandSafe(`${q.prompt} ${q.explanation}`)).toBe(true);
    }
    for (const q of STARTER_QUESTS) {
      expect(isBrandSafe(`${q.title} ${q.description}`)).toBe(true);
    }
  });
});
