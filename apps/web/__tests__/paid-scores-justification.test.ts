import { describe, expect, it } from "vitest";
import { paidScoresJustifiedSports } from "@/lib/odds/paid-scores-justification";

/**
 * C-109 (a): the settle-picks route passes settleSport the sports whose free
 * pass left overdue picks with no final. Only those may spend a paid scores
 * call; the spend guard refuses every other sport.
 */
describe("paidScoresJustifiedSports", () => {
  const finding = (sportKey: string, code: string, overdue = true) => ({ sportKey, code, overdue });

  it("is empty with no RCA report (the free result carries rca: null in tests and on error)", () => {
    expect([...paidScoresJustifiedSports(null)]).toEqual([]);
    expect([...paidScoresJustifiedSports(undefined)]).toEqual([]);
    expect([...paidScoresJustifiedSports({ findings: [] })]).toEqual([]);
  });

  it("justifies a sport with an overdue pick that has no final", () => {
    const s = paidScoresJustifiedSports({
      findings: [finding("baseball_mlb", "OVERDUE_NO_SCORE"), finding("americanfootball_nfl", "NO_TRUSTED_FINAL")],
    });
    expect([...s].sort()).toEqual(["americanfootball_nfl", "baseball_mlb"]);
  });

  it("never justifies within-grace, matching, orientation or dispute findings", () => {
    const s = paidScoresJustifiedSports({
      findings: [
        finding("baseball_mlb", "WITHIN_GRACE", false),
        finding("baseball_mlb", "NO_TRUSTED_FINAL", false),
        finding("soccer_usa_mls", "AMBIGUOUS_MATCHUP"),
        finding("soccer_usa_mls", "TEAM_ORIENT_FAIL"),
        finding("icehockey_nhl", "DISPUTED_SCORES"),
        finding("basketball_nba", "NOT_COMMENCED", false),
      ],
    });
    expect([...s]).toEqual([]);
  });

  it("dedupes a sport with several overdue findings", () => {
    const s = paidScoresJustifiedSports({
      findings: [finding("baseball_mlb", "OVERDUE_NO_SCORE"), finding("baseball_mlb", "OVERDUE_NO_SCORE")],
    });
    expect(s.size).toBe(1);
  });
});
