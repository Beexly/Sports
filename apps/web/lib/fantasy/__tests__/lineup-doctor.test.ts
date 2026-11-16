import { describe, expect, it } from "vitest";
import {
  auditAndRepairDfsLineup,
  redactLineupDoctorForFreeViewer,
  type LineupDoctorPoolPlayer,
  type Stage0TruthSnapshot,
} from "../lineup-doctor";

const STAGE0_FIXTURE: Stage0TruthSnapshot = {
  season: 2026,
  week: 10,
  confirmedQb1: {
    HOU: "C.J. Stroud",
    BAL: "Jacoby Brissett",
    CIN: "Joe Burrow",
  },
  excludedPlayers: [
    { name: "Tee Higgins", team: "CIN", position: "WR", reason: "OUT - Hamstring" },
    { name: "Lamar Jackson", team: "BAL", position: "QB", reason: "IR - Thumb" },
  ],
  kickoffByTeam: {
    HOU: "2026-11-15T18:00:00Z",
    BUF: "2026-11-15T18:00:00Z",
    SF: "2026-11-15T21:25:00Z",
    GB: "2026-11-15T18:00:00Z",
    LV: "2026-11-15T21:25:00Z",
    MIN: "2026-11-15T18:00:00Z",
    CIN: "2026-11-16T01:20:00Z",
    BAL: "2026-11-17T01:15:00Z",
  },
};

const POOL_FIXTURE: readonly LineupDoctorPoolPlayer[] = [
  { id: "qb1", name: "C.J. Stroud", pos: "QB", team: "HOU", opp: "CLE", salary: 5900, projectedPoints: 22.5, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "qb2", name: "Lamar Jackson", pos: "QB", team: "BAL", opp: "LAC", salary: 7600, projectedPoints: 24.0, kickoffUtc: "2026-11-17T01:15:00Z" },
  { id: "rb1", name: "James Cook III", pos: "RB", team: "BUF", opp: "NYJ", salary: 7400, projectedPoints: 22.4, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "rb2", name: "Christian McCaffrey", pos: "RB", team: "SF", opp: "DAL", salary: 8500, projectedPoints: 21.1, kickoffUtc: "2026-11-15T21:25:00Z" },
  { id: "rb3", name: "Ashton Jeanty", pos: "RB", team: "LV", opp: "SEA", salary: 5400, projectedPoints: 16.6, kickoffUtc: "2026-11-15T21:25:00Z" },
  { id: "wr1", name: "Matthew Golden", pos: "WR", team: "GB", opp: "MIN", salary: 7300, projectedPoints: 15.7, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "wr2", name: "Khalil Shakir", pos: "WR", team: "BUF", opp: "NYJ", salary: 5300, projectedPoints: 11.6, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "wr3", name: "Xavier Hutchinson", pos: "WR", team: "HOU", opp: "CLE", salary: 4000, projectedPoints: 11.6, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "wr4", name: "Tee Higgins", pos: "WR", team: "CIN", opp: "PIT", salary: 6400, projectedPoints: 15.0, kickoffUtc: "2026-11-16T01:20:00Z" },
  { id: "wr5", name: "Zay Flowers", pos: "WR", team: "BAL", opp: "LAC", salary: 6100, projectedPoints: 14.8, kickoffUtc: "2026-11-17T01:15:00Z" },
  { id: "te1", name: "Dalton Schultz", pos: "TE", team: "HOU", opp: "CLE", salary: 3400, projectedPoints: 12.9, kickoffUtc: "2026-11-15T18:00:00Z" },
  { id: "te2", name: "Mark Andrews", pos: "TE", team: "BAL", opp: "LAC", salary: 4600, projectedPoints: 12.2, kickoffUtc: "2026-11-17T01:15:00Z" },
  { id: "dst1", name: "Vikings DST", pos: "DST", team: "MIN", opp: "GB", salary: 2800, projectedPoints: 7.6, kickoffUtc: "2026-11-15T18:00:00Z" },
];

describe("Stage-0 DraftKings Lineup Doctor", () => {
  it("validates legal 2-TE Classic roster and assigns latest-kickoff TE2 to FLEX", () => {
    const report = auditAndRepairDfsLineup(
      {
        contestType: "classic",
        players: [
          "C.J. Stroud",
          "James Cook III",
          "Christian McCaffrey",
          "Matthew Golden",
          "Khalil Shakir",
          "Xavier Hutchinson",
          "Dalton Schultz",
          "Mark Andrews",
          "Vikings DST",
        ],
      },
      STAGE0_FIXTURE,
      POOL_FIXTURE,
    );

    expect(report.ok).toBe(true);
    expect(report.totalSalary).toBe(49_200);
    expect(report.recommendedFlexPlayer).toBe("Mark Andrews");
    expect(report.slots.find((s) => s.resolvedName === "Mark Andrews")?.assignedSlot).toBe("FLEX");
  });

  it("flags Stage-0 excluded players, recommends salary-legal 1-swap repair, and redacts FREE view", () => {
    const report = auditAndRepairDfsLineup(
      {
        contestType: "classic",
        players: [
          "C.J. Stroud",
          "James Cook III",
          "Christian McCaffrey",
          "Tee Higgins",
          "Khalil Shakir",
          "Xavier Hutchinson",
          "Dalton Schultz",
          "Ashton Jeanty",
          "Vikings DST",
        ],
      },
      STAGE0_FIXTURE,
      POOL_FIXTURE,
    );

    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.includes("Tee Higgins") && i.includes("Stage-0 excluded"))).toBe(true);
    expect(report.suggestedSwaps).toHaveLength(1);
    expect(report.suggestedSwaps?.[0]?.addName).toBe("Matthew Golden");
    expect(report.repairedLineup?.some((s) => s.resolvedName === "Matthew Golden")).toBe(true);

    const freeView = redactLineupDoctorForFreeViewer(report, false);
    expect(freeView.ok).toBe(false);
    expect(freeView.issues.length).toBeGreaterThan(0);
    expect(freeView.projectedPoints).toBeNull();
    expect(freeView.suggestedSwaps).toBeNull();
    expect(freeView.repairedLineup).toBeNull();
    expect(freeView.requiresUpgradeForRepairs).toBe(true);
  });

  it("enforces 1.5x Captain multiplier in Showdown mode", () => {
    const report = auditAndRepairDfsLineup(
      {
        contestType: "showdown",
        players: [
          { name: "Christian McCaffrey", slot: "CPT" },
          "C.J. Stroud",
          "James Cook III",
          "Matthew Golden",
          "Zay Flowers",
          "Mark Andrews",
        ],
      },
      STAGE0_FIXTURE,
      POOL_FIXTURE,
    );

    expect(report.totalSalary).toBe(Math.round(8500 * 1.5) + 5900 + 7400 + 7300 + 6100 + 4600);
    expect(report.ok).toBe(true);
  });
});
