import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Model-accuracy board loader — the platform's own model versions ranked by
 * calibrated accuracy over settled picks, scored through the honest accuracy
 * engine. Only @sports/db is mocked; the real @sports/fantasy-engine does the
 * scoring so the leaderboard math is exercised end to end.
 *
 * NON-VACUOUS DISCIPLINE: every pool seeds rows that MUST be excluded
 * (PUSH / VOID / PENDING / bootstrap / seed version / out-of-range confidence /
 * zero-forecast version) with distinct sentinel model versions, and the tests
 * assert those rows never reach the board.
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { pick: { findMany: mocks.findMany } } }));

import {
  loadModelAccuracyBoard,
  buildModelAccuracyBoard,
  __resetModelAccuracyBoardMemo,
  type SettledPickRow,
} from "@/lib/cockpit/model-accuracy-board";

const NOW = new Date("2026-07-12T12:00:00.000Z");
const SEED_VERSION = "v5.0.0-seed";

/** A skilled + calibrated WIN/LOSS decision: 80% on wins, 20% on losses. */
function skilled(modelVersion: string, outcome: "WIN" | "LOSS"): SettledPickRow {
  return {
    modelVersion,
    confidence: outcome === "WIN" ? 80 : 20,
    result: outcome,
    isBootstrap: false,
  };
}

/** 30 skilled decisions (18 WIN / 12 LOSS → 60% base rate). */
function skilledPool(modelVersion: string): SettledPickRow[] {
  const rows: SettledPickRow[] = [];
  for (let i = 0; i < 30; i++) rows.push(skilled(modelVersion, i % 10 < 6 ? "WIN" : "LOSS"));
  return rows;
}

beforeEach(() => {
  __resetModelAccuracyBoardMemo();
  mocks.findMany.mockReset();
});

describe("buildModelAccuracyBoard — grouping, exclusions, coverage ordering", () => {
  it("groups by model version, excludes non-scoreable rows, and orders by coverage-adjusted skill", () => {
    const rows: SettledPickRow[] = [
      // vFull: 30 skilled forecasts, full coverage.
      ...skilledPool("vFull"),
      // vSparse: the SAME 30 skilled forecasts, PLUS 20 scoreable WIN/LOSS rows
      // whose confidence is out of range (0) — they raise the coverage
      // denominator but are NOT scored, so coverage drops to 30/50 = 0.6 and,
      // at equal per-forecast skill, vSparse must rank BELOW vFull.
      ...skilledPool("vSparse"),
      ...Array.from({ length: 20 }, (_, i): SettledPickRow => ({
        modelVersion: "vSparse",
        confidence: 0, // out of the open interval (0,100) → excluded from scoring
        result: i % 2 === 0 ? "WIN" : "LOSS",
        isBootstrap: false,
      })),

      // ── Rows that MUST be excluded entirely (distinct sentinels) ──────────
      { modelVersion: "vFull", confidence: 70, result: "PUSH", isBootstrap: false },
      { modelVersion: "vSparse", confidence: 70, result: "VOID", isBootstrap: false },
      { modelVersion: "vFull", confidence: 70, result: "PENDING", isBootstrap: false },
      { modelVersion: SEED_VERSION, confidence: 70, result: "WIN", isBootstrap: false },
      // vBootstrapOnly: its only decision is a bootstrap row → whole version drops.
      { modelVersion: "vBootstrapOnly", confidence: 75, result: "WIN", isBootstrap: true },
      // vGarbageOnly: scoreable decisions but every confidence is out of range →
      // zero scoreable forecasts → the version is excluded, not shown at 0.
      ...Array.from({ length: 8 }, (): SettledPickRow => ({
        modelVersion: "vGarbageOnly",
        confidence: 150,
        result: "WIN",
        isBootstrap: false,
      })),
    ];

    const board = buildModelAccuracyBoard(rows, NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");

    // Only the two real versions are ranked.
    const ids = board.entries.map((e) => e.forecasterId).sort();
    expect(ids).toEqual(["vFull", "vSparse"]);
    expect(board.scoredForecasters).toBe(2);
    expect(board.totalForecasts).toBe(60);

    // The excluded sentinels are nowhere on the board.
    for (const banned of ["vBootstrapOnly", "vGarbageOnly", SEED_VERSION]) {
      expect(board.entries.some((e) => e.forecasterId === banned)).toBe(false);
    }

    const full = board.entries.find((e) => e.forecasterId === "vFull")!;
    const sparse = board.entries.find((e) => e.forecasterId === "vSparse")!;

    // Both scored exactly their 30 usable forecasts (PUSH/VOID/PENDING/garbage
    // confidence never counted as forecasts).
    expect(full.forecastCount).toBe(30);
    expect(sparse.forecastCount).toBe(30);

    // Coverage reflects the out-of-range decisions in vSparse's denominator.
    expect(full.coverage).toBe(1);
    expect(sparse.coverage).toBeCloseTo(0.6, 10);

    // Equal per-forecast skill, so coverage decides — vFull ranks first.
    expect(full.coverageAdjustedSkill).toBeGreaterThan(sparse.coverageAdjustedSkill);
    expect(board.entries[0]!.forecasterId).toBe("vFull");

    // 30 ≥ 25 → both rankable.
    expect(full.meetsMinimumSample).toBe(true);
    expect(sparse.meetsMinimumSample).toBe(true);
  });
});

describe("loadModelAccuracyBoard — DB-backed states", () => {
  it("flows mocked settled picks through into ranked entries", async () => {
    mocks.findMany.mockResolvedValue([...skilledPool("vFull"), ...skilledPool("vSparse")]);
    const board = await loadModelAccuracyBoard(NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");
    expect(board.entries.map((e) => e.forecasterId).sort()).toEqual(["vFull", "vSparse"]);
    expect(board.entries.every((e) => e.forecastCount === 30)).toBe(true);
  });

  it("returns the honest empty state when there are no scoreable picks (no fabricated rows)", async () => {
    // Pool is non-empty but every row is non-scoreable — the board must be empty,
    // not populated.
    mocks.findMany.mockResolvedValue([
      { modelVersion: "vX", confidence: 70, result: "PENDING", isBootstrap: false },
      { modelVersion: "vY", confidence: 70, result: "WIN", isBootstrap: true },
      { modelVersion: "vZ", confidence: 0, result: "WIN", isBootstrap: false },
    ]);
    const board = await loadModelAccuracyBoard(NOW);
    expect(board.status).toBe("empty");
    if (board.status !== "empty") throw new Error("unreachable");
    expect(board).not.toHaveProperty("entries");
  });

  it("returns empty (not unavailable) when the pool is genuinely empty", async () => {
    mocks.findMany.mockResolvedValue([]);
    const board = await loadModelAccuracyBoard(NOW);
    expect(board.status).toBe("empty");
  });

  it("degrades to unavailable on a DB error and never throws into the page", async () => {
    mocks.findMany.mockRejectedValue(new Error("P1001: Can't reach database server"));
    const board = await loadModelAccuracyBoard(NOW);
    expect(board.status).toBe("unavailable");
    if (board.status !== "unavailable") throw new Error("unreachable");
    expect(board.reason).toContain("P1001");
  });
});

describe("model-accuracy page — auth + opacity pins (source scan)", () => {
  const pageSrc = readFileSync(
    resolve(__dirname, "..", "app/cockpit/model-accuracy/page.tsx"),
    "utf8",
  );

  it("imports and awaits requireCockpitAdmin() before loading the board", () => {
    expect(pageSrc).toMatch(
      /import\s*\{[^}]*requireCockpitAdmin[^}]*\}\s*from\s*["']@\/lib\/cockpit\/require-admin["']/,
    );
    const authIdx = pageSrc.indexOf("await requireCockpitAdmin()");
    const loadIdx = pageSrc.indexOf("await loadModelAccuracyBoard(");
    expect(authIdx).toBeGreaterThan(-1);
    expect(loadIdx).toBeGreaterThan(-1);
    // Auth is awaited before any board data is loaded.
    expect(authIdx).toBeLessThan(loadIdx);
  });

  it("is force-dynamic so the founder view never serves a stale static render", () => {
    expect(pageSrc).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });
});
