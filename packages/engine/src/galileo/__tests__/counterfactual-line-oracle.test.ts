import { describe, it, expect } from "vitest";
import { propagate, type OracleContext } from "../counterfactual-line-oracle.js";

const ctx: OracleContext = {
  homeTeam: "BUF",
  awayTeam: "KC",
  qbByTeam: { KC: "Mahomes", BUF: "Allen" },
  receiversByTeam: { KC: ["Worthy"], BUF: ["Shakir"] },
  deepReceiversByTeam: { KC: ["Worthy"] },
  rbByTeam: { KC: ["Pacheco"], BUF: ["Cook"] },
  backupRbByTeam: { KC: "Hunt" },
};

const has = (moves: ReturnType<typeof propagate>, market: string, dir: "up" | "down") =>
  moves.some((m) => m.market === market && m.direction === dir);

describe("counterfactual line oracle", () => {
  it("total drop ripples to team totals and skill props (down)", () => {
    const m = propagate({ kind: "total_shift", deltaPoints: -3 }, ctx);
    expect(has(m, "team_total:KC", "down")).toBe(true);
    expect(has(m, "player_pass_yds:Mahomes", "down")).toBe(true);
    expect(has(m, "player_rush_yds:Pacheco", "down")).toBe(true);
  });

  it("QB downgrade lowers passing/receiving, lifts RB rush, worsens the spread", () => {
    const m = propagate({ kind: "qb_downgrade", team: "KC", severity: 0.8 }, ctx);
    expect(has(m, "player_pass_yds:Mahomes", "down")).toBe(true);
    expect(has(m, "player_reception_yds:Worthy", "down")).toBe(true);
    expect(has(m, "player_rush_yds:Pacheco", "up")).toBe(true);
    expect(has(m, "team_total:KC", "down")).toBe(true);
    expect(m.some((x) => x.market === "spread")).toBe(true);
  });

  it("RB1 limited lowers his props and lifts the backup", () => {
    const m = propagate({ kind: "rb_limited", player: "Pacheco", team: "KC" }, ctx);
    expect(has(m, "player_rush_yds:Pacheco", "down")).toBe(true);
    expect(has(m, "player_rush_yds:Hunt", "up")).toBe(true);
  });

  it("worsening wind lowers passing + deep receivers + total, lifts rush", () => {
    const m = propagate({ kind: "wind_worsens", deltaMph: 15 }, ctx);
    expect(has(m, "player_pass_yds:Mahomes", "down")).toBe(true);
    expect(has(m, "player_reception_yds:Worthy", "down")).toBe(true);
    expect(has(m, "total", "down")).toBe(true);
    expect(has(m, "player_rush_yds:Pacheco", "up")).toBe(true);
  });

  it("spread shift softens the new underdog's RB rush", () => {
    const m = propagate({ kind: "spread_shift", deltaHome: 4 }, ctx); // home (BUF) becomes a bigger dog
    expect(has(m, "player_rush_yds:Cook", "down")).toBe(true);
  });
});
