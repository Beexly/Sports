import { describe, expect, it } from "vitest";
import {
  buildSgpProjectionsView,
  loadSgpProjections,
} from "@/lib/projections/sgp-projections";

const GENERATED_AT = "2026-10-12T20:36:28+00:00";
const BEFORE_KICKOFF = new Date("2026-10-12T21:00:00Z");
const AFTER_KICKOFF = new Date("2026-10-13T02:00:00Z");

function stack(probability: number) {
  return {
    legs: [
      "Passing yards (QB) over 250.5",
      "Passing TDs (QB) over 1.5",
      "Receiving yards (WR) over 75.5",
      "Anytime TD (WR)",
    ],
    scaled: {
      fair_probability: probability,
      fair_american: 257,
      correlation_lift: 0.64,
      leg_probabilities: [0.89, 0.67, 0.7, 0.4],
    },
    unscaled_control: { fair_probability: 0.11 },
  };
}

function artifact(overrides: Record<string, unknown> = {}) {
  return {
    label: "DIAGNOSTIC",
    is_pick: false,
    is_edge_claim: false,
    rvc_cleared: false,
    generated_at: GENERATED_AT,
    provenance: { engine: { module: "internal", draws: 50000 } },
    games: [
      {
        event_id: "401872994",
        name: "Buffalo Bills at Los Angeles Rams",
        commence_time: "2026-10-13T00:15Z",
        state: "pre",
        home_team: "Los Angeles Rams",
        away_team: "Buffalo Bills",
        home_abbr: "LAR",
        away_abbr: "BUF",
        complete_prices: true,
        prices: { moneyline: { home: -175, away: 145 } },
        devig: { moneyline_home_away: { shin_z: 0.04 } },
        sgp_stacks: { LAR: stack(0.28048), BUF: stack(0.1986) },
      },
      {
        event_id: "401872980",
        name: "Tampa Bay Buccaneers at Dallas Cowboys",
        commence_time: "2026-10-09T00:15Z",
        state: "post",
        home_team: "Dallas Cowboys",
        away_team: "Tampa Bay Buccaneers",
        home_abbr: "DAL",
        away_abbr: "TB",
        complete_prices: false,
        sgp_stacks: {},
        skip_reason: "game state is post, not pre",
      },
    ],
    ...overrides,
  };
}

describe("sgp projections public view", () => {
  it("maps an upcoming priced game and ranks its stacks highest first", () => {
    const view = buildSgpProjectionsView(artifact(), BEFORE_KICKOFF);

    expect(view.meta).toEqual({ state: "live", dataError: null });
    expect(view.data.generatedAt).toBe(GENERATED_AT);
    expect(view.data.games).toHaveLength(1);
    const [game] = view.data.games;
    expect(game?.matchup).toBe("Buffalo Bills at Los Angeles Rams");
    expect(game?.stacks.map((s) => s.teamAbbr)).toEqual(["LAR", "BUF"]);
    expect(game?.stacks[0]?.teamName).toBe("Los Angeles Rams");
    expect(game?.stacks[0]?.projectedProbability).toBeCloseTo(0.28048);
  });

  it("never lets artifact internals cross into the public view", () => {
    const view = buildSgpProjectionsView(artifact(), BEFORE_KICKOFF);
    const serialized = JSON.stringify(view).toLowerCase();

    for (const internal of [
      "fair_american",
      "fairamerican",
      "devig",
      "shin",
      "correlation",
      "leg_probabilities",
      "provenance",
      "moneyline",
      "unscaled",
    ]) {
      expect(serialized).not.toContain(internal);
    }
  });

  it("refuses an artifact that claims to be a pick or an edge claim", () => {
    for (const overrides of [{ is_pick: true }, { is_edge_claim: true }]) {
      const view = buildSgpProjectionsView(artifact(overrides), BEFORE_KICKOFF);
      expect(view.data.games).toEqual([]);
      expect(view.meta.dataError).toBe("ARTIFACT_INVALID");
    }
  });

  it("refuses malformed artifacts instead of guessing", () => {
    for (const bad of [null, "nope", 42, { games: "not-an-array" }, {}]) {
      const view = buildSgpProjectionsView(bad, BEFORE_KICKOFF);
      expect(view.data.games).toEqual([]);
      expect(view.meta.dataError).toBe("ARTIFACT_INVALID");
    }
  });

  it("reads stale, with no rows, once every stacked game has kicked off", () => {
    const view = buildSgpProjectionsView(artifact(), AFTER_KICKOFF);

    expect(view.meta.state).toBe("stale");
    expect(view.data.games).toEqual([]);
  });

  it("reads empty when no game carries stacks", () => {
    const view = buildSgpProjectionsView(
      artifact({
        games: [
          {
            event_id: "1",
            name: "Some Game",
            commence_time: "2026-10-13T00:15Z",
            state: "pre",
            complete_prices: false,
            sgp_stacks: {},
          },
        ],
      }),
      BEFORE_KICKOFF,
    );

    expect(view.meta.state).toBe("empty");
    expect(view.data.games).toEqual([]);
  });

  it("skips stacks whose probability or legs are not usable", () => {
    const view = buildSgpProjectionsView(
      artifact({
        games: [
          {
            event_id: "401872994",
            name: "Buffalo Bills at Los Angeles Rams",
            commence_time: "2026-10-13T00:15Z",
            state: "pre",
            home_team: "Los Angeles Rams",
            away_team: "Buffalo Bills",
            home_abbr: "LAR",
            away_abbr: "BUF",
            complete_prices: true,
            sgp_stacks: {
              LAR: { legs: [], scaled: { fair_probability: 0.5 } },
              BUF: stack(1.5),
            },
          },
        ],
      }),
      BEFORE_KICKOFF,
    );

    expect(view.meta.state).toBe("empty");
    expect(view.data.games).toEqual([]);
  });
});

describe("bundled snapshot through the request loader", () => {
  it("serves the current snapshot as live projections before kickoff", () => {
    const view = loadSgpProjections(BEFORE_KICKOFF);

    expect(view.meta).toEqual({ state: "live", dataError: null });
    expect(view.data.games.length).toBeGreaterThan(0);
    for (const game of view.data.games) {
      const probabilities = game.stacks.map((s) => s.projectedProbability);
      for (const p of probabilities) {
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }
      expect(probabilities).toEqual(
        [...probabilities].sort((a, b) => b - a),
      );
    }
  });

  it("takes the same snapshot down after the slate kicks off", () => {
    const view = loadSgpProjections(new Date("2026-10-14T00:00:00Z"));

    expect(view.meta.state).not.toBe("live");
    expect(view.data.games).toEqual([]);
  });
});
