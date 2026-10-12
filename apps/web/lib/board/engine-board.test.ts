import { describe, expect, it } from "vitest";
import {
  buildEngineBoardView,
  loadEngineBoard,
} from "@/lib/board/engine-board";

/*
 * Fixture board, shaped the way the derived-board scanner documents its
 * output: per game, the engine's own derived lines (projected margin,
 * total, team totals) alongside book lines and derived-vs-book diffs.
 * The book and diff fields exist in this fixture precisely to prove
 * they never cross into the public view. The numbers are fixture
 * inputs; the tests assert the mapping, not the numbers' truth.
 */

const GENERATED_AT = "2026-10-12T21:30:00+00:00";
const BEFORE_KICKOFF = new Date("2026-10-12T22:00:00Z");
// After BOTH fixture kickoffs (00:15Z and 20:05Z on 2026-10-13), while
// the artifact itself is still inside its freshness window — so the
// stale reading comes from the expired slate, not the artifact's age.
const AFTER_KICKOFF = new Date("2026-10-14T00:00:00Z");

function artifact(overrides: Record<string, unknown> = {}) {
  return {
    label: "DIAGNOSTIC",
    is_pick: false,
    is_edge_claim: false,
    generated_at: GENERATED_AT,
    games: [
      {
        event_id: "401872994",
        name: "Buffalo Bills at Los Angeles Rams",
        commence_time: "2026-10-13T00:15Z",
        home_team: "Los Angeles Rams",
        away_team: "Buffalo Bills",
        derived: {
          spread: -3.5,
          total: 54.5,
          team_totals: { home: 29.0, away: 25.5 },
          first_half_total: 27.5,
          alt_lines: [44.5, 49.5, 59.5],
        },
        book: { dk_spread: -3.5, dk_total: 54.5, booksum: 1.0445 },
        diff: { diff_total: 0.0, edge_pct: 0.0, kelly_quarter: 0.0 },
      },
      {
        // The scanner's alternate key spelling, pinned so it cannot drift.
        id: "401872995",
        matchup: "Kansas City Chiefs at Denver Broncos",
        kickoff: "2026-10-13T20:05Z",
        home_team: "Denver Broncos",
        away_team: "Kansas City Chiefs",
        engine: {
          projected_spread: 2.5,
          projected_total: 47.5,
          projected_team_totals: { home: 22.5, away: 25.0 },
        },
        book: { dk_spread: 3.0, dk_total: 48.5 },
      },
    ],
    ...overrides,
  };
}

const FLAG_ON = { liveBoardOn: true } as const;
const FLAG_OFF = { liveBoardOn: false } as const;

describe("engine board public view", () => {
  it("maps an upcoming slate to projections only, ordered by kickoff", () => {
    const view = buildEngineBoardView(artifact(), BEFORE_KICKOFF, FLAG_ON);

    expect(view.meta.state).toBe("live");
    expect(view.meta.dataError).toBeNull();
    expect(view.meta.boardClass?.state).toBe("HAS_ROWS");
    expect(view.data.generatedAt).toBe(GENERATED_AT);
    expect(view.data.games).toHaveLength(2);

    const [rams, broncos] = view.data.games;
    expect(rams?.matchup).toBe("Buffalo Bills at Los Angeles Rams");
    expect(rams?.homeTeam).toBe("Los Angeles Rams");
    expect(rams?.awayTeam).toBe("Buffalo Bills");
    expect(rams?.projectedTotal).toBe(54.5);
    expect(rams?.projectedMarginHome).toBe(-3.5);
    expect(rams?.projectedHomeTotal).toBe(29.0);
    expect(rams?.projectedAwayTotal).toBe(25.5);

    expect(broncos?.matchup).toBe("Kansas City Chiefs at Denver Broncos");
    expect(broncos?.projectedMarginHome).toBe(2.5);
    expect(broncos?.projectedTotal).toBe(47.5);
  });

  it("never lets book lines, diffs, or split lines cross into the view", () => {
    const view = buildEngineBoardView(artifact(), BEFORE_KICKOFF, FLAG_ON);
    const serialized = JSON.stringify(view).toLowerCase();

    for (const internal of [
      "book",
      "dk_",
      "diff",
      "edge_pct",
      "kelly",
      "booksum",
      "first_half",
      "alt_lines",
    ]) {
      expect(serialized).not.toContain(internal);
    }
  });

  it("renders no rows while the founder flag is off, however fresh", () => {
    const view = buildEngineBoardView(artifact(), BEFORE_KICKOFF, FLAG_OFF);

    expect(view.meta.state).toBe("held");
    expect(view.data.games).toEqual([]);
    expect(view.meta.boardClass?.state).toBe("HONEST_EMPTY_LIVE_BOARD_OFF");
    expect(view.meta.boardClass?.honestEmpty).toBe(true);
  });

  it("reads stale, with no rows, once every game has kicked off", () => {
    const view = buildEngineBoardView(artifact(), AFTER_KICKOFF, FLAG_ON);

    expect(view.meta.state).toBe("stale");
    expect(view.meta.character).toBe("stale_refreshing");
    expect(view.data.games).toEqual([]);
  });

  it("reads stale when the artifact itself is older than the freshness window", () => {
    const view = buildEngineBoardView(
      artifact({ generated_at: "2026-10-01T00:00:00+00:00" }),
      BEFORE_KICKOFF,
      FLAG_ON,
    );

    expect(view.meta.state).toBe("stale");
    expect(view.data.games).toEqual([]);
  });

  it("refuses an artifact that claims to be a pick or an edge claim", () => {
    for (const overrides of [{ is_pick: true }, { is_edge_claim: true }]) {
      const view = buildEngineBoardView(
        artifact(overrides),
        BEFORE_KICKOFF,
        FLAG_ON,
      );
      expect(view.meta.state).toBe("invalid");
      expect(view.meta.dataError).toBe("ARTIFACT_INVALID");
      expect(view.data.games).toEqual([]);
    }
  });

  it("refuses malformed artifacts instead of guessing", () => {
    for (const bad of [
      null,
      "nope",
      42,
      { games: "not-an-array" },
      // A non-empty board with no generation time cannot be classified.
      { games: [{ home_team: "A", away_team: "B" }] },
    ]) {
      const view = buildEngineBoardView(bad, BEFORE_KICKOFF, FLAG_ON);
      expect(view.meta.state).toBe("invalid");
      expect(view.data.games).toEqual([]);
    }
  });

  it("skips games whose derived lines are missing or partial", () => {
    const view = buildEngineBoardView(
      artifact({
        games: [
          {
            event_id: "x1",
            commence_time: "2026-10-13T00:15Z",
            home_team: "Los Angeles Rams",
            away_team: "Buffalo Bills",
            // Book lines only — no engine projection. Never reconstructed.
            book: { dk_spread: -3.5, dk_total: 54.5 },
          },
          {
            event_id: "x2",
            commence_time: "2026-10-13T00:15Z",
            home_team: "Denver Broncos",
            away_team: "Kansas City Chiefs",
            derived: { spread: 2.5, total: 47.5, team_totals: { home: 22.5 } },
          },
        ],
      }),
      BEFORE_KICKOFF,
      FLAG_ON,
    );

    expect(view.meta.state).toBe("empty");
    expect(view.meta.boardClass?.state).toBe("HONEST_EMPTY_NO_ELIGIBLE");
    expect(view.data.games).toEqual([]);
  });
});

describe("bundled snapshot through the request loader", () => {
  it("serves the current snapshot as held while the flag is off", () => {
    // Test env carries no LIVE_BOARD, and the flag's only truthy value is
    // an explicit "true" — so the request loader must hold the board.
    const view = loadEngineBoard(BEFORE_KICKOFF);

    expect(view.meta.state).toBe("held");
    expect(view.data.games).toEqual([]);
    expect(view.meta.dataError).toBeNull();
  });
});
