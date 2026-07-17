import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Model-accuracy board loader — the platform's own model versions ranked by
 * calibrated accuracy over settled picks, scored through the honest accuracy
 * engine. Only @sports/db is mocked; the real @sports/fantasy-engine does the
 * scoring so the leaderboard math is exercised end to end.
 *
 * NON-VACUOUS DISCIPLINE: every pool seeds rows that MUST be excluded or handled
 * a specific way (PUSH / VOID / PENDING / bootstrap / seed version / out-of-range
 * confidence / spread-total-without-modelProb / no receipt), and the tests assert
 * exactly what happens to each. Three honesty invariants are proven:
 *   1. probability source — modelProb (any type) OR confidence/100 (moneyline
 *      only); spread/total confidence is NEVER fabricated into a probability;
 *   2. frozen attribution — the FROZEN receipt version, never mutable Pick fields;
 *   3. endpoints — confidence 0 and 100 (incl. the confidence-100 big miss) ARE
 *      scored, not dropped.
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

/** A settled MONEYLINE decision carrying a frozen proof receipt. */
function ml(
  frozenVersion: string,
  confidence: number,
  outcome: "WIN" | "LOSS",
  modelProb: number | null = null,
): SettledPickRow {
  return {
    pickType: "MONEYLINE",
    result: outcome,
    isBootstrap: false,
    proofReceipt: { modelVersion: frozenVersion, confidence, modelProb },
  };
}

/** A settled SPREAD decision carrying a frozen proof receipt. */
function spread(
  frozenVersion: string,
  confidence: number,
  outcome: "WIN" | "LOSS",
  modelProb: number | null = null,
): SettledPickRow {
  return {
    pickType: "SPREAD",
    result: outcome,
    isBootstrap: false,
    proofReceipt: { modelVersion: frozenVersion, confidence, modelProb },
  };
}

/** A skilled + calibrated MONEYLINE decision: 80% on wins, 20% on losses. */
function skilled(frozenVersion: string, outcome: "WIN" | "LOSS"): SettledPickRow {
  return ml(frozenVersion, outcome === "WIN" ? 80 : 20, outcome);
}

/** 30 skilled moneyline decisions (18 WIN / 12 LOSS → 60% base rate). */
function skilledPool(frozenVersion: string): SettledPickRow[] {
  const rows: SettledPickRow[] = [];
  for (let i = 0; i < 30; i++) rows.push(skilled(frozenVersion, i % 10 < 6 ? "WIN" : "LOSS"));
  return rows;
}

beforeEach(() => {
  __resetModelAccuracyBoardMemo();
  mocks.findMany.mockReset();
});

describe("buildModelAccuracyBoard — grouping, exclusions, coverage ordering", () => {
  it("groups by frozen version, excludes non-scoreable rows, and orders by coverage-adjusted skill", () => {
    const rows: SettledPickRow[] = [
      // vFull: 30 skilled moneyline forecasts, full coverage.
      ...skilledPool("vFull"),
      // vSparse: the SAME 30 skilled forecasts, PLUS 20 SPREAD decisions that
      // carry a receipt but have NO modelProb. They are attributable (real frozen
      // version) but must NOT be scored as confidence/100 — a spread confidence is
      // not a probability. They raise the coverage denominator only, so coverage
      // drops to 30/50 = 0.6 and, at equal per-forecast skill, vSparse ranks BELOW
      // vFull. Confidence 90 makes the "must not be scored" assertion non-vacuous.
      ...skilledPool("vSparse"),
      ...Array.from({ length: 20 }, (_, i): SettledPickRow =>
        spread("vSparse", 90, i % 2 === 0 ? "WIN" : "LOSS"),
      ),

      // ── Rows that MUST be excluded ENTIRELY (numerator AND denominator) ──────
      { ...ml("vFull", 70, "WIN"), result: "PUSH" },
      { ...ml("vSparse", 70, "WIN"), result: "VOID" },
      { ...ml("vFull", 70, "WIN"), result: "PENDING" },
      ml(SEED_VERSION, 70, "WIN"),
      // vBootstrapOnly: its only decision is a bootstrap row → whole version drops.
      { ...ml("vBootstrapOnly", 75, "WIN"), isBootstrap: true },
      // noReceipt: a moneyline WIN with NO immutable receipt → unattributable, so it
      // never enters ANY version's numerator or denominator (never guess the version).
      { pickType: "MONEYLINE", result: "WIN", isBootstrap: false, proofReceipt: null },
      // vGarbageOnly: moneyline decisions but every frozen confidence is out of range
      // → zero scoreable forecasts → the version is excluded, not shown at 0.
      ...Array.from({ length: 8 }, (): SettledPickRow => ml("vGarbageOnly", 150, "WIN")),
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

    // Both scored exactly their 30 moneyline forecasts (PUSH/VOID/PENDING, the
    // spread decisions, and the garbage confidence never counted as forecasts).
    expect(full.forecastCount).toBe(30);
    expect(sparse.forecastCount).toBe(30);

    // Coverage reflects the spread decisions in vSparse's denominator; the excluded
    // PUSH/PENDING/no-receipt rows never touched vFull's denominator (still 1.0).
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

describe("buildModelAccuracyBoard — probability source honesty (no fabrication)", () => {
  it("scores a genuine immutable modelProb for ANY pick type (path a), never confidence/100 for spread", () => {
    // vProb's picks are SPREAD — confidence/100 would be a fabricated probability —
    // but each carries a REAL calibrated modelProb, so they are scored via modelProb.
    const rows: SettledPickRow[] = Array.from({ length: 26 }, (_, i): SettledPickRow =>
      spread("vProb", 50, i % 10 < 6 ? "WIN" : "LOSS", i % 10 < 6 ? 0.8 : 0.2),
    );
    const board = buildModelAccuracyBoard(rows, NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");
    const vProb = board.entries.find((e) => e.forecasterId === "vProb")!;
    // All 26 spread decisions scored — via the genuine modelProb, not confidence/100.
    expect(vProb.forecastCount).toBe(26);
    expect(vProb.coverage).toBe(1);
    // modelProb 0.8/0.2 with a 60% base rate is well calibrated → real skill.
    expect(vProb.skillVsBaseRate).toBeGreaterThan(0);
  });

  it("counts a spread pick WITHOUT modelProb as settled-but-unscored, and excludes no-receipt picks entirely", () => {
    const rows: SettledPickRow[] = [
      // 30 scoreable moneyline forecasts for vMix...
      ...skilledPool("vMix"),
      // ...plus 20 SPREAD picks with a receipt but NO modelProb and a HIGH confidence:
      // scoring confidence/100 would FABRICATE a 0.9 probability. They must only lower
      // coverage, never inflate the score.
      ...Array.from({ length: 20 }, (_, i): SettledPickRow =>
        spread("vMix", 90, i % 2 === 0 ? "WIN" : "LOSS"),
      ),
      // ...plus 10 MONEYLINE WINNERS with NO receipt: unattributable → excluded from
      // BOTH numerator and denominator (never guess the frozen version).
      ...Array.from({ length: 10 }, (): SettledPickRow => ({
        pickType: "MONEYLINE",
        result: "WIN",
        isBootstrap: false,
        proofReceipt: null,
      })),
    ];
    const board = buildModelAccuracyBoard(rows, NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");
    const vMix = board.entries.find((e) => e.forecasterId === "vMix")!;
    // Only the 30 moneyline forecasts are scored; the 20 spreads are NOT (no fabrication).
    expect(vMix.forecastCount).toBe(30);
    // Coverage = 30 / (30 moneyline + 20 spread) = 0.6. The 10 no-receipt WINS are
    // NOT in the denominator (unattributable), so coverage is 0.6, never 30/60 = 0.5.
    expect(vMix.coverage).toBeCloseTo(0.6, 10);
  });
});

describe("buildModelAccuracyBoard — confidence endpoints 0 and 100 (finding 3)", () => {
  it("scores the confidence-100 winner, the confidence-0 loser, AND the confidence-100 big miss", () => {
    const rows: SettledPickRow[] = [
      ml("vEdge", 100, "WIN"), //  p=1, o=1 → Brier (1−1)² = 0
      ml("vEdge", 0, "LOSS"), //   p=0, o=0 → Brier (0−0)² = 0
      ml("vEdge", 100, "LOSS"), // p=1, o=0 → Brier (1−0)² = 1  (the big miss — must NOT be dropped)
    ];
    const board = buildModelAccuracyBoard(rows, NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");
    const edge = board.entries.find((e) => e.forecasterId === "vEdge")!;
    // All three endpoint forecasts are in the scored population — none dropped.
    expect(edge.forecastCount).toBe(3);
    expect(board.totalForecasts).toBe(3);
    // The confidence-100 LOSS pays the full (1−0)² = 1 penalty: mean Brier = 1/3.
    expect(edge.brier).toBeCloseTo(1 / 3, 10);
    // Log loss stays FINITE (endpoints clamped by epsilon), not Infinity — but large.
    expect(Number.isFinite(edge.logLoss)).toBe(true);
    expect(edge.logLoss).toBeGreaterThan(0);
  });
});

describe("loadModelAccuracyBoard — frozen attribution + query shape", () => {
  it("scores the FROZEN receipt version and requires an immutable receipt, never the mutable Pick fields", async () => {
    mocks.findMany.mockResolvedValue(skilledPool("vFrozen"));
    const board = await loadModelAccuracyBoard(NOW);
    expect(board.status).toBe("ok");
    if (board.status !== "ok") throw new Error("unreachable");
    // The board is attributed to the FROZEN receipt version.
    expect(board.entries.map((e) => e.forecasterId)).toEqual(["vFrozen"]);

    // Prove the loader reads the frozen forecast from the immutable receipt and
    // NEVER the mutable Pick.confidence / Pick.modelVersion the refresh cycle rewrites.
    const call = mocks.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      select: {
        modelVersion?: unknown;
        confidence?: unknown;
        proofReceipt?: { select: Record<string, unknown> };
      };
    };
    expect(call.select.modelVersion).toBeUndefined(); // mutable version NOT selected
    expect(call.select.confidence).toBeUndefined(); //   mutable confidence NOT selected
    expect(call.select.proofReceipt?.select.modelVersion).toBe(true);
    expect(call.select.proofReceipt?.select.confidence).toBe(true);
    expect(call.select.proofReceipt?.select.modelProb).toBe(true);
    // The query REQUIRES an immutable receipt and the learning-eligibility gate.
    expect(call.where.proofReceipt).toEqual({ isNot: null });
    expect(call.where.signalSnapshot).toEqual({ is: { eligibleForLearning: true } });
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
    // not populated: a PENDING result, a bootstrap row, and a no-receipt pick.
    mocks.findMany.mockResolvedValue([
      { ...ml("vX", 70, "WIN"), result: "PENDING" },
      { ...ml("vY", 70, "WIN"), isBootstrap: true },
      { pickType: "MONEYLINE", result: "WIN", isBootstrap: false, proofReceipt: null },
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

  it("honestly labels the moneyline-calibration scope (no overclaim)", () => {
    expect(pageSrc).toMatch(/MONEYLINE calibration board/);
    expect(pageSrc).toMatch(/FROZEN in each pick/);
  });
});
