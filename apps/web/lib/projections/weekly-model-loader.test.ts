import { describe, it, expect } from "vitest";
import {
  loadWeeklyProjections,
  buildWeeklyAnchors,
} from "./weekly-model-loader";
import { loadExpectedPoints, type ExpectedPoints, type ExpectedPointsRow } from "../intelligence/expected-points";
import { loadPlayerModel, type PlayerModel, type PlayerProfile, type ModelPosition } from "../intelligence/player-model";

// ── Type-safe fixture builders (full envelopes; no `as`-casting) ────────────────
function xfpRow(over: Partial<ExpectedPointsRow> & { playerId: string }): ExpectedPointsRow {
  return {
    playerId: over.playerId,
    name: over.name ?? over.playerId,
    team: over.team ?? "KC",
    position: over.position ?? "WR",
    games: over.games ?? 10,
    xfpTotal: over.xfpTotal ?? 140,
    xfpPerGame: over.xfpPerGame ?? 14,
    actualTotal: over.actualTotal ?? 140,
    diff: over.diff ?? 0,
    xfpPct: over.xfpPct ?? 50,
    prodPct: over.prodPct ?? 50,
    signal: over.signal ?? "in-line",
    note: over.note ?? "",
  };
}

function profile(over: Partial<PlayerProfile> & { playerId: string }): PlayerProfile {
  return {
    playerId: over.playerId,
    name: over.name ?? over.playerId,
    team: over.team ?? "KC",
    position: over.position ?? "WR",
    games: over.games ?? 10,
    plays: over.plays ?? 300,
    fantasyPpr: over.fantasyPpr ?? 140,
    fppg: over.fppg ?? 14,
    epaPerPlay: over.epaPerPlay ?? 0.1,
    touches: over.touches ?? 80,
    wopr: over.wopr ?? 0.5,
    targetShare: over.targetShare ?? 0.2,
    dakota: over.dakota ?? null,
    pacr: over.pacr ?? null,
    processGrade: over.processGrade ?? 50,
    productionPct: over.productionPct ?? 50,
    signal: over.signal ?? "in-line",
    note: over.note ?? "",
  };
}

function mkXfp(rows: ExpectedPointsRow[], status: "live" | "source-error" = "live"): ExpectedPoints {
  return {
    generatedAt: "2026-09-01T00:00:00.000Z",
    status,
    season: 2026,
    throughWeek: 1,
    sourceRows: rows.length,
    rows,
    canPublishProjections: false,
    note: "",
    sourceUrl: "https://example.test/xfp.csv",
    error: status === "live" ? null : "boom",
  };
}

function mkPm(profiles: PlayerProfile[], status: "live" | "source-error" = "live"): PlayerModel {
  return {
    generatedAt: "2026-09-01T00:00:00.000Z",
    status,
    season: 2026,
    throughWeek: 1,
    sourceRows: profiles.length,
    metricsPerPlayer: 6,
    profiles,
    canPublishProjections: false,
    note: "",
    sourceUrl: "https://example.test/pm.csv",
    error: status === "live" ? null : "boom",
  };
}

function fakeLoaders(xfp: ExpectedPoints, pm: PlayerModel): {
  loadXfp: typeof loadExpectedPoints;
  loadGrades: typeof loadPlayerModel;
} {
  return {
    loadXfp: async () => xfp,
    loadGrades: async () => pm,
  };
}

describe("buildWeeklyAnchors — the join", () => {
  it("keeps only players present in BOTH xFP and the process-grade model", () => {
    const xfp = mkXfp([xfpRow({ playerId: "a" }), xfpRow({ playerId: "b" }), xfpRow({ playerId: "orphan-xfp" })]);
    const pm = mkPm([profile({ playerId: "a" }), profile({ playerId: "b" }), profile({ playerId: "orphan-grade" })]);
    const anchors = buildWeeklyAnchors(xfp, pm);
    expect(anchors.map((x) => x.playerId).sort()).toEqual(["a", "b"]);
  });

  it("takes the TYPED position + process grade from the player model, xFP from expected-points", () => {
    const xfp = mkXfp([xfpRow({ playerId: "qb1", position: "wr-but-untyped" as string, xfpPerGame: 22 })]);
    const pm = mkPm([profile({ playerId: "qb1", position: "QB" as ModelPosition, processGrade: 80 })]);
    const anchors = buildWeeklyAnchors(xfp, pm);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.position).toBe("QB");
    expect(anchors[0]!.xfpPerGame).toBe(22);
    expect(anchors[0]!.processGrade).toBe(80);
  });
});

describe("loadWeeklyProjections — composition + gating", () => {
  it("projects the joined players and ALWAYS ships gated", async () => {
    const { loadXfp, loadGrades } = fakeLoaders(
      mkXfp([xfpRow({ playerId: "a", xfpPerGame: 16 }), xfpRow({ playerId: "b", xfpPerGame: 9 })]),
      mkPm([profile({ playerId: "a", processGrade: 50 }), profile({ playerId: "b", processGrade: 50 })]),
    );
    const out = await loadWeeklyProjections({ loadXfp, loadGrades, now: new Date("2026-09-09T12:00:00.000Z") });

    expect(out.status).toBe("live");
    expect(out.playerCount).toBe(2);
    expect(out.result.canPublishProjections).toBe(false);
    expect(out.result.classification).toBe("derived_signal");
    expect(out.result.generatedAt).toBe("2026-09-09T12:00:00.000Z");
    // neutral env + neutral grade ⇒ projection equals the xFP anchor.
    const a = out.result.projections.find((p) => p.playerId === "a")!;
    expect(a.point).toBeCloseTo(16, 2);
  });

  it("reports source-error when a cleared source is unavailable (no fabrication)", async () => {
    const { loadXfp, loadGrades } = fakeLoaders(
      mkXfp([], "source-error"),
      mkPm([profile({ playerId: "a" })]),
    );
    const out = await loadWeeklyProjections({ loadXfp, loadGrades });
    expect(out.status).toBe("source-error");
    expect(out.source.xfp).toBe("source-error");
    expect(out.playerCount).toBe(0);
    expect(out.result.projections).toEqual([]);
    expect(out.error).toContain("unavailable");
  });

  it("threads the envOf seam — a soft opponent raises the projection above the anchor", async () => {
    const { loadXfp, loadGrades } = fakeLoaders(
      mkXfp([xfpRow({ playerId: "a", xfpPerGame: 14 })]),
      mkPm([profile({ playerId: "a", processGrade: 50 })]),
    );
    const neutral = await loadWeeklyProjections({ loadXfp, loadGrades });
    const soft = await loadWeeklyProjections({
      loadXfp,
      loadGrades,
      envOf: () => ({ opponentDefAdj: 0.1 }), // soft defense
    });
    expect(soft.result.projections[0]!.point).toBeGreaterThan(neutral.result.projections[0]!.point);
  });

  it("defaults to the real cleared loaders when none are injected (smoke — types compile)", () => {
    // Just assert the function is callable with no loaders (would hit the network at runtime).
    expect(typeof loadWeeklyProjections).toBe("function");
  });
});
