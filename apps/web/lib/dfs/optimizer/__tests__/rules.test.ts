import { describe, it, expect } from "vitest";
import { applyRules, applyPortfolioRules } from "../rules";
import type { SolverPlayer, SolvedLineup } from "../solver";

// ── Helpers ────────────────────────────────────────────────────────────────

let _id = 0;
function pid(): string {
  return `r${++_id}`;
}

function makePlayer(
  overrides: Partial<SolverPlayer> & { position: string; team: string }
): SolverPlayer {
  return {
    id: pid(),
    name: overrides.name ?? `Player-${_id}`,
    position: overrides.position,
    team: overrides.team,
    opponent: overrides.opponent ?? "OPP",
    salary: overrides.salary ?? 5000,
    projection: overrides.projection ?? 15,
    floor: overrides.floor ?? 9,
    ceiling: overrides.ceiling ?? 21,
    ownership: overrides.ownership ?? 0.15,
    isLocked: overrides.isLocked ?? false,
    isExcluded: overrides.isExcluded ?? false,
  };
}

/**
 * Build a baseline 9-player lineup:
 * QB (A vs X), RB (B), RB (C), WR (A vs X), WR (B), WR (D), TE (A vs X), FLEX-RB (E), DST (W)
 */
function makeLineup(playerOverrides?: Partial<SolverPlayer[]>): SolverPlayer[] {
  const base: SolverPlayer[] = [
    makePlayer({ position: "QB", team: "A", opponent: "X", salary: 7500, projection: 22, ownership: 0.2 }),
    makePlayer({ position: "RB", team: "B", opponent: "Y", salary: 7000, projection: 18, ownership: 0.25 }),
    makePlayer({ position: "RB", team: "C", opponent: "Z", salary: 5500, projection: 15, ownership: 0.15 }),
    makePlayer({ position: "WR", team: "A", opponent: "X", salary: 7000, projection: 18, ownership: 0.22 }),
    makePlayer({ position: "WR", team: "B", opponent: "Y", salary: 6000, projection: 16, ownership: 0.18 }),
    makePlayer({ position: "WR", team: "D", opponent: "W", salary: 4500, projection: 12, ownership: 0.10 }),
    makePlayer({ position: "TE", team: "A", opponent: "X", salary: 4000, projection: 11, ownership: 0.12 }),
    makePlayer({ position: "RB", team: "E", opponent: "F", salary: 4000, projection: 10, ownership: 0.09 }),
    makePlayer({ position: "DST", team: "W", opponent: "D", salary: 3000, projection: 8, ownership: 0.08 }),
  ];

  if (playerOverrides) {
    for (let i = 0; i < playerOverrides.length; i++) {
      const override = playerOverrides[i];
      if (override !== undefined && i < base.length) {
        // Replace specific slot
        base[i] = { ...(base[i] as SolverPlayer), ...override };
      }
    }
  }

  return base;
}

function makeSolvedLineup(players: SolverPlayer[], key?: string): SolvedLineup {
  const salary = players.reduce((s, p) => s + p.salary, 0);
  const projection = players.reduce((s, p) => s + p.projection, 0);
  const totalOwnership = players.reduce((s, p) => s + p.ownership, 0);
  return {
    players,
    salary,
    projection,
    floor: projection * 0.6,
    ceiling: projection * 1.4,
    totalOwnership,
    leverageScore: 1.0,
    stackTeam: null,
    stackCount: 0,
    objectiveScore: projection,
    lineupKey: key ?? players.map((p) => p.id).sort().join(","),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("applyRules()", () => {
  it("OWNERSHIP_CAP: exceeds cap → valid=false", () => {
    // Our default lineup has totalOwnership > 1.0 (sum ≈ 1.39)
    const lineup = makeLineup();
    const result = applyRules(
      lineup,
      [{ type: "OWNERSHIP_CAP", parameters: { maxTotalOwnership: 1.0 } }],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("OWNERSHIP_CAP: within cap → valid=true", () => {
    const lineup = makeLineup();
    // sum of ownerships ≈ 1.39, so 2.0 should pass
    const result = applyRules(
      lineup,
      [{ type: "OWNERSHIP_CAP", parameters: { maxTotalOwnership: 2.0 } }],
      []
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("GROUP_AT_LEAST: 2 of 3 players in lineup → valid=true", () => {
    const lineup = makeLineup();
    // Pick 3 player ids from the lineup; 2 of them should pass min=2
    const ids = [lineup[0]?.id ?? "", lineup[1]?.id ?? "", "nonexistent-id"];

    const result = applyRules(
      lineup,
      [{ type: "GROUP_AT_LEAST", parameters: { playerIds: ids, min: 2 } }],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("GROUP_AT_LEAST: only 1 of 3 players in lineup → valid=false when min=2", () => {
    const lineup = makeLineup();
    const ids = [lineup[0]?.id ?? "", "fake-1", "fake-2"];

    const result = applyRules(
      lineup,
      [{ type: "GROUP_AT_LEAST", parameters: { playerIds: ids, min: 2 } }],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("IF_PLAYER_THEN: player A in lineup, player B also in lineup → valid=true", () => {
    const lineup = makeLineup();
    const playerA = lineup[0];
    const playerB = lineup[1];
    expect(playerA).toBeDefined();
    expect(playerB).toBeDefined();
    if (!playerA || !playerB) return;

    const result = applyRules(
      lineup,
      [
        {
          type: "IF_PLAYER_THEN",
          parameters: { ifPlayerId: playerA.id, thenPlayerId: playerB.id },
        },
      ],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("IF_PLAYER_THEN: player A in lineup, player B NOT in lineup → valid=false", () => {
    const lineup = makeLineup();
    const playerA = lineup[0];
    expect(playerA).toBeDefined();
    if (!playerA) return;

    const result = applyRules(
      lineup,
      [
        {
          type: "IF_PLAYER_THEN",
          parameters: { ifPlayerId: playerA.id, thenPlayerId: "not-in-lineup" },
        },
      ],
      []
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("IF_PLAYER_THEN: player A not in lineup → rule passes regardless", () => {
    const lineup = makeLineup();
    const result = applyRules(
      lineup,
      [
        {
          type: "IF_PLAYER_THEN",
          parameters: {
            ifPlayerId: "absent-player",
            thenPlayerId: "also-absent",
          },
        },
      ],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("NO_QB_VS_DST: DST opposes QB → violation", () => {
    const lineup = makeLineup();
    // Default lineup: QB is on team A vs X; DST is team W vs D. No conflict.
    // Let's build one that conflicts: DST team X, QB opponent X
    const players = [...lineup];
    const dst = players[8];
    if (!dst) return;
    players[8] = { ...dst, team: "X", opponent: "A" }; // DST team X = QB.opponent

    const result = applyRules(
      players,
      [{ type: "NO_QB_VS_DST", parameters: {} }],
      []
    );
    expect(result.valid).toBe(false);
  });

  it("NO_QB_VS_DST: no conflict → valid", () => {
    const lineup = makeLineup();
    // QB team A, opponent X. DST team W, opponent D. No conflict.
    const result = applyRules(
      lineup,
      [{ type: "NO_QB_VS_DST", parameters: {} }],
      []
    );
    expect(result.valid).toBe(true);
  });

  it("EXPOSURE_MIN/MAX rules pass at lineup level", () => {
    const lineup = makeLineup();
    const result = applyRules(
      lineup,
      [
        { type: "EXPOSURE_MIN", parameters: { playerId: "any", minPct: 0.5 } },
        { type: "EXPOSURE_MAX", parameters: { playerId: "any", maxPct: 0.8 } },
      ],
      []
    );
    // These are portfolio-level only; lineup-level should always pass
    expect(result.valid).toBe(true);
  });
});

describe("applyPortfolioRules()", () => {
  it("EXPOSURE_MAX: player in 80% of lineups, rule maxPct=0.6 → violation", () => {
    // Build 10 lineups; one specific player appears in 8 of them (80%)
    const lineup = makeLineup();
    const highlightPlayer = lineup[0];
    expect(highlightPlayer).toBeDefined();
    if (!highlightPlayer) return;

    // Build 10 lineups, 8 include the player, 2 do not
    const lineups: SolvedLineup[] = [];
    for (let i = 0; i < 10; i++) {
      const players = makeLineup();
      if (i >= 8) {
        // Replace slot 0 with a different player
        players[0] = makePlayer({ position: "QB", team: "B", opponent: "Y" });
      } else {
        // Use the highlight player
        players[0] = { ...highlightPlayer };
      }
      lineups.push(makeSolvedLineup(players));
    }

    const result = applyPortfolioRules(
      lineups,
      [
        {
          type: "EXPOSURE_MAX",
          parameters: { playerId: highlightPlayer.id, maxPct: 0.6 },
        },
      ],
      10
    );

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("EXPOSURE_MAX: player in 50% of lineups, rule maxPct=0.6 → valid", () => {
    const lineup = makeLineup();
    const highlightPlayer = lineup[0];
    expect(highlightPlayer).toBeDefined();
    if (!highlightPlayer) return;

    // Build 10 lineups, 5 include the player
    const lineups: SolvedLineup[] = [];
    for (let i = 0; i < 10; i++) {
      const players = makeLineup();
      if (i >= 5) {
        players[0] = makePlayer({ position: "QB", team: "B", opponent: "Y" });
      } else {
        players[0] = { ...highlightPlayer };
      }
      lineups.push(makeSolvedLineup(players));
    }

    const result = applyPortfolioRules(
      lineups,
      [
        {
          type: "EXPOSURE_MAX",
          parameters: { playerId: highlightPlayer.id, maxPct: 0.6 },
        },
      ],
      10
    );

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("EXPOSURE_MIN: player below minimum exposure → violation", () => {
    const lineup = makeLineup();
    const player = lineup[0];
    expect(player).toBeDefined();
    if (!player) return;

    // Build 10 lineups, player appears in only 2 (20%)
    const lineups: SolvedLineup[] = [];
    for (let i = 0; i < 10; i++) {
      const players = makeLineup();
      if (i < 2) {
        players[0] = { ...player };
      } else {
        players[0] = makePlayer({ position: "QB", team: "B", opponent: "Y" });
      }
      lineups.push(makeSolvedLineup(players));
    }

    const result = applyPortfolioRules(
      lineups,
      [
        {
          type: "EXPOSURE_MIN",
          parameters: { playerId: player.id, minPct: 0.4 },
        },
      ],
      10
    );

    expect(result.valid).toBe(false);
  });
});
