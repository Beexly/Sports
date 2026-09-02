import { describe, expect, it } from "vitest";
import {
  buildMergePlan,
  findPickConflicts,
  groupDuplicateGames,
  selectCanonical,
  type MergeCandidateGame,
  type PickSummary,
} from "@/lib/ops/game-merge-plan";

/**
 * Production evidence (Neon, 2026-09-02): the same real contest exists up to
 * three times in `games` — Odds API hash id, TheRundown hex id, and TWO ESPN
 * id formats (`espn:<sportKey>:<id>` / `espn:<short>:<id>`) — each with its
 * own picks.
 *
 * The fixture below reproduces that exact 4-row / 3-feed-format shape. It
 * uses "St. Louis Cardinals" / "Milwaukee Brewers" rather than the literal
 * "Los Angeles Dodgers" / "San Francisco Giants" from the production report:
 * `groupDuplicateGames` deliberately reuses game-identity.ts's
 * `matchTeamSide` UNCHANGED, and that function's AMBIGUOUS_CITY_TOKENS guard
 * refuses to prefix-match a bare "Los Angeles" against ANY full team name
 * (MLB alone has two LA clubs — Dodgers and Angels) — weakening that guard
 * to force this one historical group to auto-merge would risk silently
 * merging two DIFFERENT real games elsewhere. "St. Louis" has no such
 * ambiguity (one MLB club) and is the same safe city already used for this
 * exact scenario in game-identity.test.ts.
 */

const HOUR = 60 * 60 * 1000;
const COMMENCE = new Date("2026-09-02T23:10:00.000Z");
const SPORT_ID = "sport-mlb";
const SPORT_KEY = "baseball_mlb";

function game(overrides: Partial<MergeCandidateGame>): MergeCandidateGame {
  return {
    id: "game-x",
    externalId: "x",
    sportId: SPORT_ID,
    sportKey: SPORT_KEY,
    homeTeamName: "St. Louis Cardinals",
    awayTeamName: "Milwaukee Brewers",
    commenceTime: COMMENCE,
    createdAt: COMMENCE,
    mergedIntoGameId: null,
    pickCount: 0,
    oddsCount: 0,
    oddsLineSnapshotCount: 0,
    ...overrides,
  };
}

function pick(overrides: Partial<PickSummary>): PickSummary {
  return {
    id: "pick-x",
    gameId: "game-x",
    pickType: "MONEYLINE",
    selection: "Cardinals -145",
    result: "PENDING",
    ...overrides,
  };
}

// ── The exact production pattern: 4 rows, 3 feed id formats ──
const oddsApiRow = game({
  id: "game-odds",
  externalId: "0f2c1d3e4a5b6c7d8e9f0a1b2c3d4e5f", // Odds API 32-hex
  commenceTime: COMMENCE,
  createdAt: new Date(COMMENCE.getTime() - 3 * HOUR),
  pickCount: 2,
  oddsCount: 12,
  oddsLineSnapshotCount: 4,
});
const rundownRow = game({
  id: "game-rundown",
  externalId: "a1b2c3d4e5f60718293a4b5c6d7e8f90", // TheRundown hex event_id
  homeTeamName: "St. Louis", // city-only, as TheRundown emits
  awayTeamName: "Milwaukee",
  commenceTime: new Date(COMMENCE.getTime() + 1 * HOUR),
  createdAt: new Date(COMMENCE.getTime() - 1 * HOUR),
  pickCount: 1,
});
const espnSportKeyRow = game({
  id: "game-espn-sportkey",
  externalId: "espn:baseball_mlb:401816772",
  commenceTime: new Date(COMMENCE.getTime() - 2 * HOUR),
  createdAt: new Date(COMMENCE.getTime() - 2 * HOUR),
  pickCount: 1,
});
const espnShortRow = game({
  id: "game-espn-short",
  externalId: "espn:mlb:401816772",
  commenceTime: new Date(COMMENCE.getTime() + 3 * HOUR),
  createdAt: COMMENCE,
  pickCount: 0,
});
const fourRowFixture = [oddsApiRow, rundownRow, espnSportKeyRow, espnShortRow];

describe("groupDuplicateGames", () => {
  it("groups all 4 feed-format rows for the same contest into one duplicate group", () => {
    const groups = groupDuplicateGames(fourRowFixture);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.members.map((m) => m.id).sort()).toEqual(
      ["game-espn-short", "game-espn-sportkey", "game-odds", "game-rundown"].sort(),
    );
  });

  it("excludes rows already aliased (mergedIntoGameId set) from further grouping", () => {
    const aliased = { ...rundownRow, mergedIntoGameId: "game-odds" };
    const groups = groupDuplicateGames([oddsApiRow, aliased, espnSportKeyRow]);
    // Only oddsApiRow + espnSportKeyRow remain eligible and still match.
    expect(groups).toHaveLength(1);
    expect(groups[0]!.members.map((m) => m.id).sort()).toEqual(
      ["game-espn-sportkey", "game-odds"].sort(),
    );
  });

  it("does not group a genuinely different game (no team-pair match)", () => {
    const other = game({
      id: "game-other",
      externalId: "espn:mlb:999",
      homeTeamName: "Chicago Cubs",
      awayTeamName: "Cincinnati Reds",
    });
    const groups = groupDuplicateGames([oddsApiRow, other]);
    expect(groups).toHaveLength(0);
  });

  it("does not group a same-team-pair game outside the 18h window", () => {
    const farAway = game({
      id: "game-far",
      externalId: "espn:mlb:2",
      commenceTime: new Date(COMMENCE.getTime() + 25 * HOUR),
    });
    const groups = groupDuplicateGames([oddsApiRow, farAway]);
    expect(groups).toHaveLength(0);
  });

  it("never auto-groups a bare ambiguous city (Los Angeles) — same fail-closed rule as game-identity.ts", () => {
    const dodgers = game({
      id: "game-dodgers",
      externalId: "espn:mlb:1",
      homeTeamName: "Los Angeles Dodgers",
      awayTeamName: "San Francisco Giants",
    });
    const rundownLA = game({
      id: "game-rundown-la",
      externalId: "rundown-la",
      homeTeamName: "Los Angeles",
      awayTeamName: "San Francisco",
      commenceTime: new Date(COMMENCE.getTime() + 1 * HOUR),
    });
    expect(groupDuplicateGames([dodgers, rundownLA])).toHaveLength(0);
  });
});

describe("selectCanonical", () => {
  it("picks the row with the most picks as canonical", () => {
    const { canonical, aliases } = selectCanonical(fourRowFixture);
    expect(canonical.id).toBe("game-odds"); // 2 picks — the most
    expect(aliases.map((a) => a.id).sort()).toEqual(
      ["game-espn-short", "game-espn-sportkey", "game-rundown"].sort(),
    );
  });

  it("falls back to most odds/odds_line_snapshot child rows on a pick-count tie", () => {
    const a = game({ id: "a", externalId: "a", pickCount: 1, oddsCount: 5 });
    const b = game({ id: "b", externalId: "b", pickCount: 1, oddsCount: 20 });
    const { canonical } = selectCanonical([a, b]);
    expect(canonical.id).toBe("b");
  });

  it("prefers a non-espn externalId when picks and child-row counts tie", () => {
    const espnRow = game({ id: "espn", externalId: "espn:mlb:1" });
    const oddsRow = game({ id: "odds-api", externalId: "32hexlikeid00000000000000000000" });
    const { canonical } = selectCanonical([espnRow, oddsRow]);
    expect(canonical.id).toBe("odds-api");
  });

  it("falls back to the oldest createdAt as the final tie-break", () => {
    const newer = game({ id: "newer", externalId: "n", createdAt: new Date(COMMENCE.getTime() + HOUR) });
    const older = game({ id: "older", externalId: "o", createdAt: new Date(COMMENCE.getTime() - HOUR) });
    const { canonical } = selectCanonical([newer, older]);
    expect(canonical.id).toBe("older");
  });

  it("resolves the canonical's team names to the LONGEST across the whole group, never just the winner's own", () => {
    const { resolvedHomeTeamName, resolvedAwayTeamName } = selectCanonical(fourRowFixture);
    // oddsApiRow (the winner) already carries full names; rundownRow's
    // city-only names must never win even though they lose on pickCount too.
    expect(resolvedHomeTeamName).toBe("St. Louis Cardinals");
    expect(resolvedAwayTeamName).toBe("Milwaukee Brewers");
  });
});

describe("findPickConflicts / buildMergePlan — pending-pick conflict reporting", () => {
  it("reports a same-pickType conflict between canonical and an alias, and flags disagreeing sides", () => {
    const picksByGameId = new Map<string, readonly PickSummary[]>([
      [
        "game-odds",
        [
          pick({ id: "pick-odds-ml", gameId: "game-odds", pickType: "MONEYLINE", selection: "Cardinals -145" }),
          pick({ id: "pick-odds-total", gameId: "game-odds", pickType: "TOTAL", selection: "Over 8.5" }),
        ],
      ],
      [
        "game-rundown",
        [pick({ id: "pick-rundown-ml", gameId: "game-rundown", pickType: "MONEYLINE", selection: "Brewers +130" })],
      ],
      [
        "game-espn-sportkey",
        [pick({ id: "pick-espn-spread", gameId: "game-espn-sportkey", pickType: "SPREAD", selection: "Cardinals -1.5" })],
      ],
    ]);

    const { canonical, aliases } = selectCanonical(fourRowFixture);
    const conflicts = findPickConflicts(canonical, aliases, picksByGameId);

    // Only the MONEYLINE pair conflicts (same pickType on canonical + an
    // alias); the SPREAD pick on game-espn-sportkey has no canonical
    // counterpart and must NOT be reported.
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      aliasGameId: "game-rundown",
      canonicalPickId: "pick-odds-ml",
      aliasPickId: "pick-rundown-ml",
      pickType: "MONEYLINE",
      sidesAgree: false,
    });
  });

  it("buildMergePlan surfaces the same conflict end-to-end and counts it", () => {
    const picksByGameId = new Map<string, readonly PickSummary[]>([
      [
        "game-odds",
        [pick({ id: "pick-odds-ml", gameId: "game-odds", pickType: "MONEYLINE", selection: "Cardinals -145" })],
      ],
      [
        "game-rundown",
        [pick({ id: "pick-rundown-ml", gameId: "game-rundown", pickType: "MONEYLINE", selection: "Brewers +130" })],
      ],
    ]);

    const plan = buildMergePlan(fourRowFixture, picksByGameId, { now: COMMENCE });

    expect(plan.groupCount).toBe(1);
    expect(plan.aliasCount).toBe(3);
    expect(plan.conflictCount).toBe(1);
    expect(plan.groups[0]!.canonicalId).toBe("game-odds");
    expect(plan.groups[0]!.pickConflicts).toHaveLength(1);
    expect(plan.groups[0]!.pickConflicts[0]!.sidesAgree).toBe(false);
    expect(plan.generatedAt).toBe(COMMENCE.toISOString());
  });

  it("does not report a conflict when a PENDING alias pick's type has no canonical counterpart", () => {
    const picksByGameId = new Map<string, readonly PickSummary[]>([
      [
        "game-espn-sportkey",
        [pick({ id: "pick-spread-only", gameId: "game-espn-sportkey", pickType: "SPREAD", selection: "Cardinals -1.5" })],
      ],
    ]);
    const { canonical, aliases } = selectCanonical(fourRowFixture);
    expect(findPickConflicts(canonical, aliases, picksByGameId)).toHaveLength(0);
  });

  it("does not report a SETTLED (non-PENDING) alias pick even when the type matches", () => {
    const picksByGameId = new Map<string, readonly PickSummary[]>([
      ["game-odds", [pick({ id: "pick-odds-ml", gameId: "game-odds", pickType: "MONEYLINE", selection: "Cardinals -145" })]],
      [
        "game-rundown",
        [
          pick({
            id: "pick-rundown-ml-settled",
            gameId: "game-rundown",
            pickType: "MONEYLINE",
            selection: "Brewers +130",
            result: "LOSS",
          }),
        ],
      ],
    ]);
    const { canonical, aliases } = selectCanonical(fourRowFixture);
    expect(findPickConflicts(canonical, aliases, picksByGameId)).toHaveLength(0);
  });

  it("marks sidesAgree true when both selections normalize to the same text", () => {
    const picksByGameId = new Map<string, readonly PickSummary[]>([
      ["game-odds", [pick({ id: "pick-odds-ml", gameId: "game-odds", pickType: "MONEYLINE", selection: "Cardinals -145" })]],
      [
        "game-rundown",
        [pick({ id: "pick-rundown-ml", gameId: "game-rundown", pickType: "MONEYLINE", selection: "  Cardinals -145  " })],
      ],
    ]);
    const { canonical, aliases } = selectCanonical(fourRowFixture);
    const conflicts = findPickConflicts(canonical, aliases, picksByGameId);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.sidesAgree).toBe(true);
  });
});
