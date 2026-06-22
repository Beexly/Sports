import { describe, it, expect } from "vitest";
import { solve, modeDefaults } from "../solver";
import type { SolverPlayer } from "../solver";

// ── Player factory ─────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId(): string {
  return `p${++_idCounter}`;
}

function makePlayer(
  overrides: Partial<SolverPlayer> & { position: string; team: string; opponent: string; salary: number }
): SolverPlayer {
  const projection = overrides.projection ?? 20;
  return {
    id: nextId(),
    name: overrides.name ?? `Player-${_idCounter}`,
    position: overrides.position,
    team: overrides.team,
    opponent: overrides.opponent,
    salary: overrides.salary,
    projection,
    floor: overrides.floor ?? projection * 0.6,
    ceiling: overrides.ceiling ?? projection * 1.4,
    ownership: overrides.ownership ?? 0.15,
    isLocked: overrides.isLocked ?? false,
    isExcluded: overrides.isExcluded ?? false,
  };
}

/**
 * Build a realistic player pool.
 * Teams A, B, C each have a QB + WRs/TEs so stacking works.
 * DSTs from teams W, X, Y, Z (oppose teams A, B, C, A respectively).
 */
function makePlayers(opts?: {
  qbs?: number;
  rbs?: number;
  wrs?: number;
  tes?: number;
  dsts?: number;
}): SolverPlayer[] {
  const {
    qbs = 3,
    rbs = 8,
    wrs = 12,
    tes = 4,
    dsts = 4,
  } = opts ?? {};

  const players: SolverPlayer[] = [];

  // QB salaries 7000–9000, on teams A, B, C (cycling)
  const qbTeams = ["A", "B", "C"];
  const qbOpponents = ["X", "Y", "Z"];
  for (let i = 0; i < qbs; i++) {
    const team = qbTeams[i % qbTeams.length] ?? "A";
    const opponent = qbOpponents[i % qbOpponents.length] ?? "X";
    players.push(
      makePlayer({
        position: "QB",
        team,
        opponent,
        salary: 7000 + i * 700,
        projection: 22 + i * 2,
        ownership: 0.15 + i * 0.05,
      })
    );
  }

  // RBs: 4500–8500, mixed teams
  const rbTeams = ["A", "B", "C", "D", "E", "X", "Y", "Z"];
  for (let i = 0; i < rbs; i++) {
    const team = rbTeams[i % rbTeams.length] ?? "A";
    // opponent is the team that opposes them
    const opponent = rbTeams[(i + 4) % rbTeams.length] ?? "B";
    players.push(
      makePlayer({
        position: "RB",
        team,
        opponent,
        salary: 4500 + i * 500,
        projection: 14 + i,
        ownership: 0.1 + i * 0.02,
      })
    );
  }

  // WRs: 3500–8000, include some from QB teams (A, B, C) for stacking
  for (let i = 0; i < wrs; i++) {
    // First 6 WRs are on QB teams (2 per team)
    const team =
      i < 6
        ? (qbTeams[Math.floor(i / 2) % qbTeams.length] ?? "A")
        : ["D", "E", "F", "X", "Y", "Z"][i - 6] ?? "D";
    const opponent =
      i < 6
        ? (qbOpponents[Math.floor(i / 2) % qbOpponents.length] ?? "X")
        : "A";
    players.push(
      makePlayer({
        position: "WR",
        team,
        opponent,
        salary: 3500 + i * 400,
        projection: 12 + i,
        ownership: 0.08 + i * 0.02,
      })
    );
  }

  // TEs: 2500–6500, include one on team A for TE stack
  const teTeams = ["A", "B", "C", "D"];
  const teOpponents = ["X", "Y", "Z", "E"];
  for (let i = 0; i < tes; i++) {
    players.push(
      makePlayer({
        position: "TE",
        team: teTeams[i % teTeams.length] ?? "A",
        opponent: teOpponents[i % teOpponents.length] ?? "X",
        salary: 2500 + i * 1000,
        projection: 10 + i * 2,
        ownership: 0.1 + i * 0.05,
      })
    );
  }

  // DSTs: 2500–4000
  // DST teams W, X, Y, Z. Opponents = C, A, B, A (intentionally first DST opposes team C/Z)
  const dstTeams = ["W", "X", "Y", "Z"];
  const dstOpponents = ["C", "A", "B", "D"];
  for (let i = 0; i < dsts; i++) {
    players.push(
      makePlayer({
        position: "DST",
        team: dstTeams[i % dstTeams.length] ?? "W",
        opponent: dstOpponents[i % dstOpponents.length] ?? "A",
        salary: 2500 + i * 500,
        projection: 8 + i,
        ownership: 0.1 + i * 0.05,
      })
    );
  }

  return players;
}

/**
 * Build a larger 60-player pool.
 */
function makePlayersLarge(): SolverPlayer[] {
  return makePlayers({ qbs: 6, rbs: 14, wrs: 22, tes: 10, dsts: 8 });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("solve()", () => {
  it("generates 10 lineups in CASH mode, each with 9 players, salary ≤ 50000, no duplicate ids", () => {
    const players = makePlayers();
    const result = solve(players, "CASH", 10);

    expect(result.lineups).toHaveLength(10);

    for (const lineup of result.lineups) {
      expect(lineup.players).toHaveLength(9);
      expect(lineup.salary).toBeLessThanOrEqual(50_000);

      const ids = lineup.players.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(9);
    }
  });

  it("SMALL_FIELD_GPP: each lineup QB has ≥1 WR or TE from same team (stack enforced)", () => {
    const players = makePlayers();
    const result = solve(players, "SMALL_FIELD_GPP", 5, {
      stackRequired: true,
      minStackSize: 1,
    });

    expect(result.lineups.length).toBeGreaterThan(0);

    for (const lineup of result.lineups) {
      const qb = lineup.players.find((p) => p.position === "QB");
      expect(qb).toBeDefined();
      if (!qb) continue;

      const stackMates = lineup.players.filter(
        (p) => p.team === qb.team && (p.position === "WR" || p.position === "TE")
      );
      expect(stackMates.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("noQbVsDst: no lineup has DST team === QB.opponent", () => {
    const players = makePlayers();
    const result = solve(players, "CASH", 5, { noQbVsDst: true });

    expect(result.lineups.length).toBeGreaterThan(0);

    for (const lineup of result.lineups) {
      const qb = lineup.players.find((p) => p.position === "QB");
      const dst = lineup.players.find((p) => p.position === "DST");

      if (!qb || !dst) continue;

      expect(dst.team).not.toBe(qb.opponent);
    }
  });

  it("locked player appears in all 5 lineups", () => {
    const players = makePlayers();
    const lockedPlayer = players.find((p) => p.position === "QB");
    expect(lockedPlayer).toBeDefined();
    if (!lockedPlayer) return;

    const playersWithLock = players.map((p) =>
      p.id === lockedPlayer.id ? { ...p, isLocked: true } : p
    );

    const result = solve(playersWithLock, "CASH", 5);

    expect(result.lineups.length).toBeGreaterThan(0);
    for (const lineup of result.lineups) {
      const found = lineup.players.some((p) => p.id === lockedPlayer.id);
      expect(found).toBe(true);
    }
  });

  it("excluded player appears in none of the 5 lineups", () => {
    const players = makePlayers();
    // Exclude a QB
    const excludedPlayer = players.find((p) => p.position === "WR");
    expect(excludedPlayer).toBeDefined();
    if (!excludedPlayer) return;

    const playersWithExclude = players.map((p) =>
      p.id === excludedPlayer.id ? { ...p, isExcluded: true } : p
    );

    const result = solve(playersWithExclude, "CASH", 5);

    expect(result.lineups.length).toBeGreaterThan(0);
    for (const lineup of result.lineups) {
      const found = lineup.players.some((p) => p.id === excludedPlayer.id);
      expect(found).toBe(false);
    }
  });

  it("exposure: no player appears in >60% of 20 lineups (≤12 lineups) at maxExposure=0.6", () => {
    const players = makePlayers();
    const result = solve(players, "CASH", 20, { maxExposure: 0.6 });

    expect(result.lineups.length).toBeGreaterThan(0);

    const count = result.lineups.length;
    const maxAllowed = Math.ceil(count * 0.6);

    for (const exposure of Object.values(result.exposure)) {
      const usedCount = Math.round(exposure * count);
      expect(usedCount).toBeLessThanOrEqual(maxAllowed);
    }
  });

  it("generates 150 lineups from 60-player pool without error", () => {
    const players = makePlayersLarge();
    const result = solve(players, "LARGE_FIELD_GPP", 150, { maxExposure: 0.8 });

    // Should have 150 lineups (some might have warnings for duplicates)
    expect(result.lineups).toHaveLength(150);
  });

  it("modeDefaults returns correct weights for CASH", () => {
    const defaults = modeDefaults("CASH");
    expect(defaults.weights?.meanProjection).toBe(0.7);
    expect(defaults.weights?.floor).toBe(0.2);
    expect(defaults.stackRequired).toBe(false);
  });

  it("modeDefaults returns stackRequired=true for GPP modes", () => {
    for (const mode of ["SMALL_FIELD_GPP", "LARGE_FIELD_GPP", "CONTRARIAN", "LEVERAGE"] as const) {
      const defaults = modeDefaults(mode);
      expect(defaults.stackRequired).toBe(true);
    }
  });
});
