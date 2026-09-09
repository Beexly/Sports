import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * C-247. The reconciliation behind `npm run ops:verify-scores`, tested on the
 * shapes that actually appear in the data rather than on invented ones.
 *
 * The real defect it exists to surface: on 2026-09-08, 25 of 169 MLB game rows
 * marked FINAL held a score ESPN's own API contradicted, and one game's score
 * appeared on every fixture in a consecutive-day series. The Phillies fixture
 * below is that case, with its real numbers.
 */

import {
  findSelfContradictions,
  formatReconciliation,
  reconcileScores,
  sourceEventId,
  type SourceFinal,
  type StoredGame,
} from "../../../scripts/ops/lib/score-reconciliation";

function game(over: Partial<StoredGame> & Pick<StoredGame, "id">): StoredGame {
  return {
    externalId: `espn:mlb:${over.id}`,
    commenceTime: new Date("2026-09-07T17:06:00.000Z"),
    homeTeamName: "Philadelphia Phillies",
    awayTeamName: "Atlanta Braves",
    homeScore: 4,
    awayScore: 2,
    settledPicks: 0,
    ...over,
  };
}

describe("the source event id survives the id schemes actually in the table", () => {
  it("reads the same event out of both espn sport prefixes", () => {
    // The same fixture is stored under both, so keying on the sport segment
    // would compare a row against nothing and call it healthy.
    expect(sourceEventId("espn:mlb:401816843")).toBe("401816843");
    expect(sourceEventId("espn:baseball_mlb:401816843")).toBe("401816843");
  });

  it("refuses ids that are not the source's rather than guessing", () => {
    // A bare content hash is real: e6fa25c7c3e50e466694d127f6c929ba appears on
    // a duplicate Phillies fixture. Guessing an event id from it would invent a
    // comparison.
    expect(sourceEventId("e6fa25c7c3e50e466694d127f6c929ba")).toBeNull();
    expect(sourceEventId("therundown:mlb:123")).toBeNull();
    expect(sourceEventId(null)).toBeNull();
    expect(sourceEventId("espn:mlb:")).toBeNull();
  });
});

describe("reconciling stored finals against the source", () => {
  it("finds the consecutive-day series defect with its real numbers", () => {
    // Sep 5 genuinely ended 4-2. Its score is on all three rows; Sep 6 really
    // finished 4-5 and Sep 7 really finished 1-0.
    const stored: StoredGame[] = [
      game({ id: "401816813", commenceTime: new Date("2026-09-05T22:05:00Z"), settledPicks: 2 }),
      game({ id: "401816828", commenceTime: new Date("2026-09-06T17:11:48Z"), settledPicks: 2 }),
      game({ id: "401816843", commenceTime: new Date("2026-09-07T17:06:00Z"), settledPicks: 1 }),
    ];
    const finals: SourceFinal[] = [
      { eventId: "401816813", homeScore: 4, awayScore: 2 },
      { eventId: "401816828", homeScore: 4, awayScore: 5 },
      { eventId: "401816843", homeScore: 1, awayScore: 0 },
    ];

    const r = reconcileScores(stored, finals);

    expect(r.compared).toBe(3);
    expect(r.uncomparable).toBe(0);
    expect(r.mismatches.map((m) => m.eventId).sort()).toEqual(["401816828", "401816843"]);
    expect(r.settledPicksAffected).toBe(3);

    // Sep 6: we say the home team won 4-2, the source says they LOST 4-5.
    const sep6 = r.mismatches.find((m) => m.eventId === "401816828")!;
    expect(sep6.winnerDiffers).toBe(true);
    // Sep 7: both have the home team winning, so the winner does NOT differ
    // even though the score is wrong. A spread or total on it is still graded
    // against the wrong margin, which is why the count is separate.
    const sep7 = r.mismatches.find((m) => m.eventId === "401816843")!;
    expect(sep7.winnerDiffers).toBe(false);
    expect(r.settledPicksOnWinnerFlip).toBe(2);
  });

  it("counts a row it could not key as UNCOMPARABLE, never as agreement", () => {
    // The failure mode that would make this whole tool a liar: silently
    // skipping what it cannot see and reporting a clean bill of health.
    const stored: StoredGame[] = [
      game({ id: "a", externalId: "e6fa25c7c3e50e466694d127f6c929ba" }),
      game({ id: "b", externalId: "espn:mlb:999999" }), // source has no such event
    ];
    const r = reconcileScores(stored, [{ eventId: "401816843", homeScore: 1, awayScore: 0 }]);

    expect(r.compared).toBe(0);
    expect(r.uncomparable).toBe(2);
    expect(r.mismatches).toEqual([]);
    expect(formatReconciliation(r).join("\n")).toContain("not evidence of health");
  });

  it("does not count a row with no stored score in either bucket", () => {
    // Nothing to contradict, so it is not a mismatch. It is also not
    // "compared": counting it would pad the denominator and flatter the rate.
    const r = reconcileScores(
      [game({ id: "401816843", homeScore: null, awayScore: null })],
      [{ eventId: "401816843", homeScore: 1, awayScore: 0 }],
    );
    expect(r.compared).toBe(0);
    expect(r.uncomparable).toBe(0);
    expect(r.mismatches).toEqual([]);
  });

  it("treats a tie as its own outcome when deciding whether the winner differs", () => {
    const r = reconcileScores(
      [game({ id: "401816843", homeScore: 3, awayScore: 3 })],
      [{ eventId: "401816843", homeScore: 4, awayScore: 3 }],
    );
    expect(r.mismatches[0]?.winnerDiffers).toBe(true);
  });

  it("reports nothing when every stored final agrees", () => {
    const r = reconcileScores(
      [game({ id: "401816813", homeScore: 4, awayScore: 2 })],
      [{ eventId: "401816813", homeScore: 4, awayScore: 2 }],
    );
    expect(r.compared).toBe(1);
    expect(r.mismatches).toEqual([]);
    expect(formatReconciliation(r).join("\n")).not.toContain("WINNER DIFFERS");
  });
});

/**
 * C-249. A second, cheaper detector found while measuring C-247: over 30 days,
 * 302 MLB event ids and 75 MLS event ids have more than one row, and 18 MLB
 * plus 1 MLS of those hold DISAGREEING scores across their own duplicates. The
 * database contradicts itself, so no source is needed to know one is wrong.
 *
 * It is complementary rather than redundant. It needs no network and cannot be
 * fooled by a board that has aged out, but it only sees duplicated fixtures and
 * cannot say WHICH score is right. The source comparison sees single rows,
 * which this one is blind to.
 */
describe("the same fixture stored twice with two different scores", () => {
  it("flags a fixture whose own duplicates disagree", () => {
    const rows: StoredGame[] = [
      game({ id: "row-a", externalId: "espn:mlb:401816843", homeScore: 4, awayScore: 2, settledPicks: 1 }),
      game({ id: "row-b", externalId: "espn:baseball_mlb:401816843", homeScore: 1, awayScore: 0, settledPicks: 2 }),
    ];
    const found = findSelfContradictions(rows);

    expect(found).toHaveLength(1);
    expect(found[0]?.eventId).toBe("401816843");
    expect(found[0]?.scores.sort()).toEqual(["1-0", "4-2"]);
    // Both rows' picks are counted: each duplicate carries its own.
    expect(found[0]?.settledPicks).toBe(3);
    expect(found[0]?.gameIds.sort()).toEqual(["row-a", "row-b"]);
  });

  it("says nothing about duplicates that agree", () => {
    // Duplication on its own is a separate problem. This detector is about
    // contradiction, and reporting agreement as a finding would bury the signal.
    const rows: StoredGame[] = [
      game({ id: "row-a", externalId: "espn:mlb:401816813", homeScore: 4, awayScore: 2 }),
      game({ id: "row-b", externalId: "espn:baseball_mlb:401816813", homeScore: 4, awayScore: 2 }),
    ];
    expect(findSelfContradictions(rows)).toEqual([]);
  });

  it("needs two rows: a lone wrong score is invisible to it", () => {
    // Stated as a test because it is the limit that makes the source
    // comparison necessary as well. Neither detector subsumes the other.
    const rows: StoredGame[] = [game({ id: "row-a", homeScore: 4, awayScore: 2 })];
    expect(findSelfContradictions(rows)).toEqual([]);
  });

  it("ignores rows it cannot key, rather than grouping them together", () => {
    // Two unkeyable rows are not "the same event". Bucketing them under a
    // shared null key would manufacture a contradiction out of two unrelated
    // fixtures.
    const rows: StoredGame[] = [
      game({ id: "row-a", externalId: "e6fa25c7c3e50e466694d127f6c929ba", homeScore: 4, awayScore: 2 }),
      game({ id: "row-b", externalId: "1f0e3dad99908345f7439f8ffabdffc4", homeScore: 1, awayScore: 0 }),
    ];
    expect(findSelfContradictions(rows)).toEqual([]);
  });
});

/**
 * C-250, Devin, on the tool shipped for C-247/C-248 itself.
 *
 * `StoredGame.settledPicks` is documented as PUBLISHED picks carrying a graded
 * result, and the query behind it filtered only on `result`. A withdrawn pick
 * still counted toward the damage, so the audit overstated the published
 * exposure.
 *
 * It would have been most wrong exactly when somebody was repairing things.
 * Unpublishing is a real remediation lane in this repo
 * (`ops:stale-picks:unpublish`, `unpublish-corrupted-picks`), so every pick
 * pulled out of the record would have gone on inflating the number that is
 * supposed to demonstrate the repair worked.
 *
 * Asserted at the source because the miscount lives in the Prisma selection,
 * not in the pure function: the pure side receives `settledPicks` already
 * computed and cannot tell a good count from a bad one. Comments are stripped
 * first - C-241 in this repo shipped an assertion that passed on the fix's own
 * comment, and the comment beside this fix names the very field being checked.
 */
describe("the audit counts published picks, not withdrawn ones", () => {
  const script = readFileSync(
    resolve(__dirname, "..", "..", "..", "scripts", "ops", "verify-stored-scores.ts"),
    "utf8",
  )
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("filters the settled-pick count on isPublished", () => {
    expect(script).toContain("picks: { where: { isPublished: true, result:");
  });

  it("has no graded-result count that omits the published filter", () => {
    // The shape the bug had. Pinned so it cannot come back by a different edit.
    const counts = script.match(/picks:\s*\{\s*where:\s*\{[^}]*\}/g) ?? [];
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) {
      expect(c, `a pick count omits isPublished: ${c}`).toContain("isPublished");
    }
  });
});
