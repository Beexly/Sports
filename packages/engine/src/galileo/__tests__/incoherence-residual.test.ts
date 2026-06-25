import { describe, it, expect } from "vitest";
import { buildMarketSurface, type Quote } from "../../market-physics/market-surface.js";
import {
  computeStaticResiduals,
  computeTemporalResiduals,
  type ResidualContext,
} from "../incoherence-residual.js";

const T = "2024-09-08T16:00:00Z";
const two = (market: Quote["market"], outcome: string, point: number, extra: Partial<Quote> = {}): Quote[] => [
  { book: "pinnacle", market, outcome, point, price: -110, timestamp: T, ...extra },
  { book: "fanduel", market, outcome, point, price: -110, timestamp: T, ...extra },
];
function game(spreadHome: number, total: number, extra: Quote[] = []) {
  return buildMarketSurface("g", [
    ...two("spread", "HOME", spreadHome), ...two("spread", "AWAY", -spreadHome),
    ...two("total", "OVER", total), ...two("total", "UNDER", total),
    ...extra,
  ]);
}

describe("incoherence residuals — static", () => {
  it("scores a spread/total/team-total residual", () => {
    const s = game(-3, 45, [...two("team_total", "OVER", 28, { team: "KC" }), ...two("team_total", "UNDER", 28, { team: "KC" })]);
    const r = computeStaticResiduals(s, { homeTeam: "KC", awayTeam: "BUF" });
    expect(r.some((x) => x.residualType === "spread_total_team_total" && x.magnitude > 3)).toBe(true);
  });

  it("scores an alt-line curvature residual on a monotonicity break", () => {
    const ctx: ResidualContext = {
      altLadders: [{ market: "player_rush_yds:RB", rungs: [
        { point: 40, overImplied: 0.7 }, { point: 50, overImplied: 0.55 }, { point: 60, overImplied: 0.62 }, { point: 70, overImplied: 0.3 },
      ] }],
    };
    const r = computeStaticResiduals(game(-3, 45), ctx);
    expect(r.some((x) => x.residualType === "alt_line_curvature")).toBe(true);
  });

  it("scores a stale-book residual when one book is off consensus", () => {
    const s = buildMarketSurface("g", [
      ...two("total", "OVER", 45), ...two("total", "UNDER", 45),
      { book: "slowbook", market: "total", outcome: "OVER", point: 45, price: 130, timestamp: T },
      { book: "slowbook", market: "total", outcome: "UNDER", point: 45, price: -160, timestamp: T },
    ]);
    const r = computeStaticResiduals(s, {});
    expect(r.some((x) => x.residualType === "book_outlier_stale" && x.affectedBook === "slowbook")).toBe(true);
  });
});

describe("incoherence residuals — temporal", () => {
  it("flags game-total → prop lag (total moves, prop does not)", () => {
    const before = game(-3, 45, two("player_rush_yds", "OVER", 60, { player: "RB" }));
    const after = game(-3, 42, two("player_rush_yds", "OVER", 60, { player: "RB" })); // prop stale
    const r = computeTemporalResiduals(after, { before, transmissionPropKeys: ["player_rush_yds:RB"] });
    expect(r.some((x) => x.residualType === "game_total_to_prop" && x.expectedDirection === "down")).toBe(true);
  });

  it("flags QB passing → receptions lag (QB line drops, receptions stale)", () => {
    const before = game(-3, 45, [...two("player_pass_yds", "OVER", 280, { player: "QB" }), ...two("player_receptions", "OVER", 5.5, { player: "WR" })]);
    const after = game(-3, 45, [...two("player_pass_yds", "OVER", 255, { player: "QB" }), ...two("player_receptions", "OVER", 5.5, { player: "WR" })]);
    const r = computeTemporalResiduals(after, { before, qbKey: "player_pass_yds:QB", receptionKeys: ["player_receptions:WR"] });
    expect(r.some((x) => x.residualType === "qb_passing_to_receptions")).toBe(true);
  });

  it("flags role-change → prop lag", () => {
    const after = game(-3, 45);
    const r = computeTemporalResiduals(after, { before: after, roleLags: [{ propKey: "player_reception_yds:RB2", eventTime: "2024-09-08T14:00:00Z", movedSinceEvent: false }] });
    expect(r.some((x) => x.residualType === "role_change_to_prop_lag")).toBe(true);
  });
});
