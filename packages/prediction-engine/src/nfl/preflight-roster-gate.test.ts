import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNamesClean,
  loadStage0Config,
  PreflightRosterGateError,
  teamsWithQb1Out,
  type Stage0Config,
} from "./preflight-roster-gate.js";

const baseCfg = (over: Partial<Stage0Config> = {}): Stage0Config => ({
  week: 9,
  as_of: "2026-11-04",
  max_age_days: 3,
  blocked_statuses: ["OUT", "IR"],
  excluded_players: [
    { name: "Lamar Jackson", team: "BAL", position: "QB", reason: "IR" },
    { name: "Tyler Huntley", team: "BAL", position: "QB", reason: "season-ending" },
    { name: "Some Receiver", team: "JAX", position: "WR", reason: "IR" },
  ],
  traded_players: [{ name: "Jacoby Brissett", from: "ARI", to: "BAL", date: "2026-11-04" }],
  confirmed_qb1: { BAL: "Joe Fagnano" },
  ...over,
});

function writeCfg(cfg: Stage0Config): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "stage0-")), "cfg.json");
  fs.writeFileSync(p, JSON.stringify(cfg));
  return p;
}

describe("Stage 0 preflight roster gate", () => {
  it("rejects output that contains an excluded player (Lamar Jackson regression)", () => {
    expect(() => assertNamesClean(["Trevor Lawrence", "Lamar Jackson"], baseCfg())).toThrow(
      PreflightRosterGateError,
    );
  });

  it("rejects traded-away players and matches names case/punctuation-insensitively", () => {
    expect(() => assertNamesClean(["jacoby brissett"], baseCfg())).toThrow(/blocked players/);
    expect(() => assertNamesClean(["Tyler  HUNTLEY"], baseCfg())).toThrow(/blocked players/);
  });

  it("passes a clean lineup", () => {
    expect(() => assertNamesClean(["Trevor Lawrence", "Joe Fagnano"], baseCfg())).not.toThrow();
  });

  it("only vacates QB1 for excluded QBs", () => {
    const m = teamsWithQb1Out(baseCfg());
    expect([...m.keys()]).toEqual(["BAL"]);
    expect(m.get("BAL")).toEqual(["Lamar Jackson", "Tyler Huntley"]);
  });

  it("refuses a stale config and a missing config", () => {
    const stale = writeCfg(baseCfg());
    expect(() => loadStage0Config(stale, new Date("2026-11-20T00:00:00Z"))).toThrow(/days old/);
    expect(() => loadStage0Config("/nonexistent/stage0.json")).toThrow(/missing/);
  });

  it("accepts a fresh config", () => {
    const fresh = writeCfg(baseCfg());
    expect(loadStage0Config(fresh, new Date("2026-11-05T12:00:00Z")).week).toBe(9);
  });

  it("the real Week 9 config loads and blocks the players that caused the incident", () => {
    const real = path.resolve(__dirname, "../../../../data/nflverse/week9_live_roster_transactions_and_starters_2026.json");
    const cfg = JSON.parse(fs.readFileSync(real, "utf-8")) as Stage0Config;
    expect(() =>
      assertNamesClean(["Lamar Jackson", "Tyler Huntley", "Jacoby Brissett"], cfg),
    ).toThrow(PreflightRosterGateError);
    expect(cfg.confirmed_qb1.BAL).toBe("Joe Fagnano");
  });
});
