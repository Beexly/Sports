import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveNflWeek } from "@sports/data-ingestion";
import { buildGradedPool } from "@/lib/integrations/graded-pool";
import {
  evaluateProjectionBasis,
  MIN_GAMES_FOR_BASIS,
  PRIOR_SEASON_GRACE_WEEKS,
} from "@/lib/integrations/projection-basis";
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

describe("the gate must not empty the paid pool as the season advances (C-223)", () => {
  /**
   * The regression C-220 introduced, found in review and rated RED. Turning the
   * gate on made the TARGET advance week by week while `loadPlayerModel` stayed
   * pinned to `latestNflverseInspectionSeason()` — the completed-REG floor,
   * which is deliberately conservative and correct for a stats page. The moment
   * targetWeek passed PRIOR_SEASON_GRACE_WEEKS every player was refused, the
   * paid provider went silently empty, and every fantasy tool fell back to the
   * illustrative pool. Fixed at the source: the pool now asks nflverse for the
   * TARGET season.
   */
  it("refuses a prior-season basis after the grace window — the behaviour that broke it", () => {
    const week4 = { targetSeason: 2026, targetWeek: PRIOR_SEASON_GRACE_WEEKS + 1, basisSeason: 2025 };
    expect(evaluateProjectionBasis({ ...week4, gamesBehind: 17 }).ok).toBe(false);
    // And the pool built on that frame is genuinely empty — this is correct
    // behaviour for a stale basis, and it is why the SEASON REQUESTED matters.
    expect(buildGradedPool([profile("real", 17, 14)], [], [], [], {}, week4)).toHaveLength(0);
  });

  it("keeps the pool alive at the same week once the basis is the target season", () => {
    // The fix, stated as a property: at Week 4 a CURRENT-season basis passes.
    // loadGradedPool now requests target.targetSeason from loadPlayerModel, and
    // loadPlayerModel already falls back to the newest season actually present
    // when the requested one has no REG rows — so Weeks 1-3 still resolve to
    // the prior season and still label it as prior-season basis.
    const week4Current = { targetSeason: 2026, targetWeek: 4, basisSeason: 2026 };
    const verdict = evaluateProjectionBasis({ ...week4Current, gamesBehind: 4 });
    expect(verdict.ok).toBe(true);
    expect(buildGradedPool([profile("real", 4, 14)], [], [], [], {}, week4Current)).toHaveLength(1);
  });

  it("asks the source for the target season, not the completed-REG floor", () => {
    // Source-level, because loadGradedPool needs the network. The old call was
    // `loadPlayerModel({ fetcher })`, which silently took the floor default.
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "integrations", "graded-pool.ts"),
      "utf8",
    );
    expect(src).toContain("loadPlayerModel({ fetcher, season: target.targetSeason })");
    expect(src).not.toContain("await loadPlayerModel({ fetcher });");
  });

  it("reports a refused pool as degraded, never as a healthy empty one", () => {
    // Also from review: status "live" + count 0 + error null made a total
    // refusal indistinguishable from an ordinary empty slate, and the API
    // forwarded success: true.
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "integrations", "graded-pool.ts"),
      "utf8",
    );
    expect(src).toContain('status: refused ? "source-error" : "live"');
    expect(src).toContain("error: poolVerdict.ok ? null : poolVerdict.reason");
  });

  it("never prints a game count it did not measure", () => {
    // The label used to pass MIN_GAMES_FOR_BASIS, so every response claimed
    // exactly four games regardless of the real samples — provenance invented
    // from a constant, by the gate whose whole job is preventing that.
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "integrations", "graded-pool.ts"),
      "utf8",
    );
    expect(src).not.toContain("gamesBehind: MIN_GAMES_FOR_BASIS");
    expect(src).toContain("Math.min(...survivingGames)");

    // And the label itself reports the real minimum, not the floor.
    const label = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: 17,
    });
    expect(label.ok && label.label).toContain("17 games");
  });

  it("does not claim zero current-season games once the season has started", () => {
    // Weeks 2 and 3 are inside the grace window, and the parenthetical used to
    // be unconditional — telling a customer "no 2026 games played yet" after
    // two weeks of 2026 football.
    const wk1 = evaluateProjectionBasis({ targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: 17 });
    expect(wk1.ok && wk1.label).toContain("no 2026 games played yet");
    const wk3 = evaluateProjectionBasis({ targetSeason: 2026, targetWeek: 3, basisSeason: 2025, gamesBehind: 17 });
    expect(wk3.ok && wk3.label).not.toContain("no 2026 games played yet");
    expect(wk3.ok && wk3.label).toContain("Week 3");
  });
});
