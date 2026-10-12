import { describe, it, expect, afterEach } from "vitest";
import {
  applySalaries,
  loadRealDfsSlate,
  resetRealDfsSlateCacheForTests,
  salaryKey,
  type RealSlateDeps,
} from "./real-slate";
import { activeDfsSlate, registerDfsSlateProvider } from "@/lib/integrations/dfs";
import type { DfsPlayer } from "@/lib/fantasy/dfs-slate";
import type { EngineSlateReport } from "@/lib/fantasy/engine-slate";
import type { DfsSalaries } from "./salaries";

/**
 * The real-slate loader, exercised entirely through injected seams: the
 * fixtures below are shaped exactly like the engine's measured report and
 * the licensed salary feed's output, so what is proven here is the JOIN
 * and the HONESTY, not a database.
 *
 * The contract under test:
 *   - a measured pool comes back "real", with provenance intact;
 *   - licensed salaries join by player, and only where a row exists;
 *   - a failed or empty build NEVER produces the sample fixture — the pool
 *     is empty and the kind says why;
 *   - positions the measured data cannot fill are named, not hidden.
 */

const NOW = "2026-10-12T21:00:00.000Z";

function enginePlayer(partial: Partial<DfsPlayer> & Pick<DfsPlayer, "id" | "name" | "pos">): DfsPlayer {
  return {
    team: "BUF",
    opp: "LAR",
    salary: 0,
    proj: 15,
    floor: 8,
    ceiling: 24,
    own: 0.5,
    ...partial,
  };
}

const POOL: readonly DfsPlayer[] = [
  enginePlayer({ id: "p-qb", name: "Josh Allen", pos: "QB", team: "BUF", opp: "LAR", proj: 24.5 }),
  enginePlayer({ id: "p-rb", name: "James Cook", pos: "RB", team: "BUF", opp: "LAR", proj: 16.2 }),
  enginePlayer({ id: "p-wr", name: "Puka Nacua", pos: "WR", team: "LAR", opp: "BUF", proj: 18.9 }),
  enginePlayer({ id: "p-te", name: "Dalton Kincaid", pos: "TE", team: "BUF", opp: "LAR", proj: 9.4 }),
];

function engineReport(players: readonly DfsPlayer[]): EngineSlateReport {
  return {
    players,
    dropped: [{ playerId: "p-x", name: "One Game Wonder", games: 1, reason: "only 1 measured game(s)" }],
    adjustmentCount: 3,
    adjustmentsCalibrated: false,
    salaryIsReal: false,
    ownershipIsAssumed: true,
    window: 5,
    season: 2026,
    week: 6,
  };
}

function salariesFixture(rows: DfsSalaries["rows"]): DfsSalaries {
  return {
    generatedAt: NOW,
    status: rows.length > 0 ? "live" : "gated",
    operator: "DraftKings",
    date: "2026-OCT-12",
    providers: [],
    connectedProviders: rows.length > 0 ? 1 : 0,
    rows,
    discrepancies: 0,
    canPublishPicks: false,
    gate: {
      connected: rows.length > 0,
      requiredEnv: ["SPORTSDATAIO_API_KEY"],
      legalNote: "",
      refusedNote: "",
      licensedProviders: ["sportsdataio"],
    },
    error: null,
  };
}

function deps(partial: Partial<RealSlateDeps> = {}): RealSlateDeps {
  return {
    latestPeriod: async () => ({ season: 2026, week: 6 }),
    buildSlate: async () => engineReport(POOL),
    loadSalaries: async () => salariesFixture([]),
    now: () => NOW,
    ...partial,
  };
}

afterEach(() => {
  registerDfsSlateProvider(null);
  resetRealDfsSlateCacheForTests();
});

describe("loadRealDfsSlate — the measured pool", () => {
  it("returns the real-shaped slate the engine built, provenance intact", async () => {
    const slate = await loadRealDfsSlate(deps());
    expect(slate.kind).toBe("real");
    expect(slate.players).toHaveLength(POOL.length);
    expect(slate.players[0]).toMatchObject({ name: "Josh Allen", pos: "QB", proj: 24.5 });
    expect(slate.season).toBe(2026);
    expect(slate.week).toBe(6);
    expect(slate.window).toBe(5);
    expect(slate.droppedCount).toBe(1);
    expect(slate.generatedAt).toBe(NOW);
  });

  it("names the positions the measured pool cannot fill (DST has no player-row source)", async () => {
    const slate = await loadRealDfsSlate(deps());
    expect(slate.positionsCovered).toEqual(["QB", "RB", "WR", "TE"]);
    expect(slate.missingPositions).toEqual(["DST"]);
  });

  it("registers the measured pool at the sync seam — behind the founder env gate", async () => {
    await loadRealDfsSlate(deps());
    // Registration alone flips nothing without DFS_PROVIDER (law 3)…
    expect(activeDfsSlate({})).toEqual([]);
    // …and with it, the seam serves the measured pool, not the fixture.
    const served = activeDfsSlate({ DFS_PROVIDER: "gse-engine" });
    expect(served).toHaveLength(POOL.length);
    expect(served[0]!.name).toBe("Josh Allen");
  });
});

describe("loadRealDfsSlate — salary honesty", () => {
  it("with no licensed feed, salaries stay absent and unflagged as real", async () => {
    const slate = await loadRealDfsSlate(deps());
    expect(slate.salaryFeedLive).toBe(false);
    expect(slate.salaryCoverage).toBe(0);
    expect(slate.salaryByKey.size).toBe(0);
    expect(slate.players.every((p) => p.salary === 0)).toBe(true);
  });

  it("joins licensed salaries by player key, counting only real matches", async () => {
    const rows = [
      {
        name: "Josh Allen", team: "BUF", position: "QB", salary: 7800,
        salariesByProvider: { sportsdataio: 7800 }, providerCount: 1,
        agreement: "single" as const, spread: 0,
      },
      {
        name: "Not On The Slate", team: "NYJ", position: "WR", salary: 4000,
        salariesByProvider: { sportsdataio: 4000 }, providerCount: 1,
        agreement: "single" as const, spread: 0,
      },
    ];
    const slate = await loadRealDfsSlate(deps({ loadSalaries: async () => salariesFixture(rows) }));
    expect(slate.salaryFeedLive).toBe(true);
    // Only Allen is on the measured pool: coverage counts pool players, not rows.
    expect(slate.salaryCoverage).toBe(1);
    const { players, covered } = applySalaries(slate.players, slate.salaryByKey);
    expect(covered).toBe(1);
    expect(players.find((p) => p.name === "Josh Allen")!.salary).toBe(7800);
    // Everyone else keeps salary 0 — absence is never back-filled.
    expect(players.find((p) => p.name === "James Cook")!.salary).toBe(0);
  });

  it("a failing salary feed never sinks the measured pool", async () => {
    const slate = await loadRealDfsSlate(deps({
      loadSalaries: async () => { throw new Error("provider down"); },
    }));
    expect(slate.kind).toBe("real");
    expect(slate.salaryFeedLive).toBe(false);
    expect(slate.players).toHaveLength(POOL.length);
  });

  it("salaryKey normalizes case, spacing and punctuation", () => {
    expect(salaryKey("Josh Allen", "BUF")).toBe(salaryKey("josh  allen", "buf"));
    expect(salaryKey("Amon-Ra St. Brown", "DET")).toBe(salaryKey("Amon Ra St Brown", "DET"));
  });
});

describe("loadRealDfsSlate — fail-closed, never the fixture", () => {
  it("a build with no measured players is an explicit EMPTY slate", async () => {
    const slate = await loadRealDfsSlate(deps({ buildSlate: async () => engineReport([]) }));
    expect(slate.kind).toBe("empty");
    expect(slate.players).toEqual([]);
    expect(slate.missingPositions).toEqual(["QB", "RB", "WR", "TE", "DST"]);
  });

  it("a failing build is UNAVAILABLE with a reason — and an empty pool", async () => {
    const slate = await loadRealDfsSlate(deps({
      buildSlate: async () => { throw new Error("db down"); },
    }));
    expect(slate.kind).toBe("unavailable");
    expect(slate.reason).toMatch(/build failed/i);
    expect(slate.players).toEqual([]);
  });

  it("no recorded games at all is UNAVAILABLE, not a sample slate", async () => {
    const slate = await loadRealDfsSlate(deps({ latestPeriod: async () => null }));
    expect(slate.kind).toBe("unavailable");
    expect(slate.players).toEqual([]);
  });

  it("an unreachable data layer is UNAVAILABLE with an empty pool", async () => {
    const slate = await loadRealDfsSlate(deps({
      latestPeriod: async () => { throw new Error("connection refused"); },
    }));
    expect(slate.kind).toBe("unavailable");
    expect(slate.players).toEqual([]);
    // And nothing was registered that could serve fiction later.
    expect(activeDfsSlate({ DFS_PROVIDER: "gse-engine" })).toEqual([]);
  });

  it("ownership is always flagged assumed — it has no real source", async () => {
    const slate = await loadRealDfsSlate(deps());
    expect(slate.ownershipIsAssumed).toBe(true);
    expect(slate.players.every((p) => p.own === 0.5)).toBe(true);
  });
});
