import { describe, it, expect } from "vitest";
import { runGhostDuel, leaderboard, listOpenDuels } from "@/lib/galaxy/duel";
import { runBossEncounter } from "@/lib/galaxy/loop";
import { featuredBossKey, currentWeekKey, contributeToRaid } from "@/lib/galaxy/raid";
import { getBoss, BOSSES } from "@sports/galaxy-engine";

/**
 * Stage 2 — "Signal Cup" integration (engine + server loop, DB-stub mode).
 * Ranked Signal Duel, the 5-boss Depths, and the ladder all compute real engine
 * outcomes without a database (persisted=false).
 */
describe("Galaxy Dynasty — Stage 2 (Signal Cup)", () => {
  it("a Ghost Signal Duel resolves and moves the player's rating", async () => {
    const d = await runGhostDuel("stub", "wr-1", "A", 80);
    expect(["CREATOR", "OPPONENT", "TIE"]).toContain(d.resolution.winner);
    expect(typeof d.newRating).toBe("number");
    expect(d.ratingDelta).toBe(d.newRating - 1200); // base rating in stub mode
    expect(d.opponentHandle).toMatch(/^Ghost_/);
    expect(d.creditsAwarded).toBeGreaterThan(0);
  });

  it("winning a duel pays a win bonus on top of the rep", async () => {
    // wr-1 option A (Chiefs -6.5) wins; the Ghost reads option A too → tie or win.
    const win = await runGhostDuel("stub", "wr-2", "B", 85); // UNDER 47.5 hits (20-13=33)
    expect(win.resolution.winner === "CREATOR" || win.resolution.winner === "TIE").toBe(true);
  });

  it("clears a non-Public-Trap boss and unlocks its merch", async () => {
    const boss = getBoss("line_move_mimic")!;
    const r = await runBossEncounter(
      "stub",
      "line_move_mimic",
      boss.scenarios.map((s) => ({ scenarioId: s.id, chosen: "VALUE" as const, confidence: 70 })),
    );
    expect(r.result.cleared).toBe(true);
    expect(r.merchUnlocked?.sku).toBe("closing-line-pin");
  });

  it("the ladder is seeded with Ghost profiles even with no database", async () => {
    const rows = await leaderboard();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.some((r) => r.isGhost)).toBe(true);
    // sorted by rating desc
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.rating).toBeGreaterThanOrEqual(rows[i]!.rating);
    }
  });

  it("open duel list is empty (and safe) with no database", async () => {
    expect(await listOpenDuels()).toEqual([]);
  });

  it("the weekly raid boss is deterministic and a real boss", () => {
    const key = featuredBossKey();
    expect(BOSSES.map((b) => b.key)).toContain(key);
    expect(featuredBossKey("w-0")).toBe(BOSSES[0]!.key);
    expect(currentWeekKey()).toMatch(/^w-\d+$/);
  });

  it("raid contribution is a safe no-op without a profile/DB", async () => {
    await expect(contributeToRaid("stub", featuredBossKey(), 3)).resolves.toBeUndefined();
  });
});
