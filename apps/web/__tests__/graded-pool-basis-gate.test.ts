import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveNflWeek } from "@sports/data-ingestion";
import { buildGradedPool } from "@/lib/integrations/graded-pool";
import { evaluateProjectionBasis, MIN_GAMES_FOR_BASIS } from "@/lib/integrations/projection-basis";
import type { PlayerProfile } from "@/lib/intelligence/player-model";

/**
 * C-213 wiring. The gate is only worth having if the pool actually applies it.
 *
 * The scenario is tonight's: it is Week 1 of 2026, the process grade describes
 * the 2025 season, and there are no 2026 games. Every player with a real 2025
 * sample must SURVIVE - refusing here would mean no Week 1 board - and every
 * player too thin to project from must be excluded rather than invented.
 */
const profile = (name: string, games: number, fppg: number): PlayerProfile =>
  ({
    playerId: name, name, team: "KC", position: "WR",
    games, plays: games * 30, fantasyPpr: fppg * games, fppg,
    epaPerPlay: 0.05, touches: games * 6, wopr: 0.4, targetShare: 0.2,
    dakota: null, pacr: null, processGrade: 70, productionPct: 60, signal: "hold",
  }) as unknown as PlayerProfile;

const WEEK1_2026 = { targetSeason: 2026, targetWeek: 1, basisSeason: 2025 };

describe("the graded pool applies the basis gate", () => {
  it("KEEPS players with a real prior-season sample on Week 1 — the whole point", () => {
    const profiles = [profile("deep", 17, 14), profile("solid", 9, 11)];
    const pool = buildGradedPool(profiles, [], [], [], {}, WEEK1_2026);
    expect(pool.map((p) => p.name).sort()).toEqual(["deep", "solid"]);
  });

  it("excludes a player too thin to project from, rather than inventing a number", () => {
    const profiles = [
      profile("regular", 17, 14),
      profile("one-game-cameo", MIN_GAMES_FOR_BASIS - 1, 30), // huge fppg, tiny sample
    ];
    const pool = buildGradedPool(profiles, [], [], [], {}, WEEK1_2026);
    expect(pool.map((p) => p.name)).toEqual(["regular"]);
  });

  it("refuses the whole pool when the basis is two seasons behind", () => {
    const pool = buildGradedPool(
      [profile("stale", 17, 14)], [], [], [], {},
      { targetSeason: 2026, targetWeek: 1, basisSeason: 2024 },
    );
    expect(pool).toHaveLength(0);
  });

  it("refuses a prior-season basis once the season is genuinely underway", () => {
    // Week 1 on last season's numbers is correct. Week 9 on last season's
    // numbers, with eight weeks of current data unused, is not.
    const early = buildGradedPool([profile("p", 17, 14)], [], [], [], {}, WEEK1_2026);
    const late = buildGradedPool(
      [profile("p", 17, 14)], [], [], [], {},
      { targetSeason: 2026, targetWeek: 9, basisSeason: 2025 },
    );
    expect(early).toHaveLength(1);
    expect(late).toHaveLength(0);
  });

  it("is inert when no basis context is supplied, so existing callers are unchanged", () => {
    const profiles = [profile("thin", 1, 30), profile("stale-ok", 17, 14)];
    const pool = buildGradedPool(profiles, [], [], [], {});
    expect(pool).toHaveLength(2);
  });
});

describe("the gate is ON by default, not waiting to be opted into (C-220)", () => {
  /**
   * C-213 built the gate and made `basisContext` optional. No caller passed it
   * - not the API route, not the internal provider - so the gate never ran
   * anywhere in production: every player passed regardless of basis and
   * `basisLabel` was null on every response. It failed OPEN, which is the
   * direction that publishes an unsupported number.
   */
  it("derives the target frame unconditionally", () => {
    // Asserted at the source because loadGradedPool needs the network and no
    // test can call it without one. This is the WEAKER kind of assertion and
    // is labelled as such: it proves there is no branch that skips the gate,
    // not that the gate produces a particular verdict. The behavioural half is
    // the test below plus the buildGradedPool cases above.
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "integrations", "graded-pool.ts"),
      "utf8",
    );
    // The old shape, verbatim. If it comes back, the gate is off again.
    expect(src).not.toContain("? { ...basisContext, basisSeason: model.season }");
    expect(src).not.toContain("gateContext\n    ? evaluateProjectionBasis");
    expect(src).toContain("const gateContext = { ...target, basisSeason: model.season };");
    expect(src).toContain("resolveNflWeek(now)");
  });

  it("keeps a prior-season basis alive on the frame the default actually produces", () => {
    // The behavioural half, and the decision that matters tonight: build the
    // SAME context loadGradedPool builds, from the real calendar, and check
    // the verdict. If the default frame refused a 2025 basis there would be no
    // Week 1 board at all - the failure this asserts against is a gate that is
    // on and wrong, which is worse than one that is off.
    const opener = new Date("2026-09-10T00:20:00Z"); // NFL 2026 Week 1 kickoff
    const { season, week } = resolveNflWeek(opener);
    expect({ season, week }).toEqual({ season: 2026, week: 1 });

    const verdict = evaluateProjectionBasis({
      targetSeason: season,
      targetWeek: week,
      basisSeason: 2025,
      gamesBehind: MIN_GAMES_FOR_BASIS,
    });
    expect(verdict.ok).toBe(true);
    expect(verdict.label).toContain("2025");

    // And the pool built on that same frame keeps its players.
    const pool = buildGradedPool(
      [profile("real", 17, 14)], [], [], [], {},
      { targetSeason: season, targetWeek: week, basisSeason: 2025 },
    );
    expect(pool).toHaveLength(1);
  });
});
