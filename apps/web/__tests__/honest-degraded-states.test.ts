import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Honest degraded states — the T-outage-sweep doctrine (PRs #87/#89) extended to
 * three customer pages that were rendering degraded / outage / suppressed states
 * as reassuring or fabricated "healthy" states.
 *
 *   1. /board — the dead "sample data" banner is gone; a suppressed board (demo
 *      rows hidden, or the stale-data kill switch parking a failed-freshness
 *      slate) now renders an HONEST banner driven off the real degradation code,
 *      not the unreachable isSampleData flag.
 *   2. /proof — during a ledger outage the freshness stamp is suppressed (no
 *      synthesized "Board generated <now>"); only the unreachable card shows.
 *   3. / (home) — a board DB outage / nflverse source-error render a neutral
 *      "temporarily unavailable" treatment instead of asserting live zeros as
 *      calm truth ("Gate holding", "0 cleared · 0 gated", "Intake warming up").
 *
 * These are NON-VACUOUS: each test EXECUTES the real async page component with
 * the loaders mocked to a degraded shape, then walks the produced React element
 * tree and asserts the actual rendered branch (and the absence of the dishonest
 * one). Child components are not rendered, so text passed as a prop (door stats)
 * is read from the prop; text passed as children (banners) from the children.
 */

const mocks = vi.hoisted(() => ({
  boardState: vi.fn(),
  boardPasses: vi.fn(),
  calibration: vi.fn(),
  nflverse: vi.fn(),
  proof: vi.fn(),
}));

vi.mock("@/lib/board/state", () => ({ loadBoardState: mocks.boardState }));
vi.mock("@/lib/board/passes", () => ({ loadBoardPasses: mocks.boardPasses }));
vi.mock("@/lib/calibration/report", () => ({ loadPublicCalibrationReport: mocks.calibration }));
vi.mock("@/lib/nflverse/usage-pulse", () => ({ loadNflverseUsagePulse: mocks.nflverse }));
vi.mock("@/lib/proof/load-proof-of-record", () => ({ loadProofOfRecord: mocks.proof }));

import BoardPage from "@/app/board/page";
import HomePage from "@/app/page";
import { NflverseLabDoor, NflverseLabDoorPlaceholder } from "@/components/landing/nflverse-lab-door";
import ProofPage from "@/app/proof/page";
import { db } from "@sports/db";
import { MethodologySection, type TrustLedgerMetrics } from "@/components/ui/methodology-section";
import { buildBoardHealth, type BoardSuppressionReason } from "@/lib/board/health";
import { classifyBoardState } from "@/lib/board/classify-board-state";
import type { BoardStatePayload } from "@/lib/board/state";

// ── element-tree helpers ─────────────────────────────────────────────────────

interface ElementNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

function isElement(node: unknown): node is ElementNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    typeof (node as { props: unknown }).props === "object" &&
    (node as { props: unknown }).props !== null
  );
}

/** All visible text: string children AND string prop values (door stats live in
 *  props because DoorCard is not rendered by the page function). */
function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  if (isElement(node)) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key === "children") continue;
      if (typeof value === "string") out.push(value);
    }
    collectText(node.props.children, out);
  }
}

function textOf(tree: unknown): string {
  const out: string[] = [];
  collectText(tree, out);
  return out.join("");
}

function collectTestIds(node: unknown, out: Set<string>): void {
  if (node == null || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) collectTestIds(child, out);
    return;
  }
  if (isElement(node)) {
    const id = node.props["data-testid"];
    if (typeof id === "string") out.add(id);
    collectTestIds(node.props.children, out);
  }
}

function testIdsOf(tree: unknown): Set<string> {
  const out = new Set<string>();
  collectTestIds(tree, out);
  return out;
}

function findByType(node: unknown, type: unknown): ElementNode | null {
  if (node == null || typeof node === "boolean") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (isElement(node)) {
    if (node.type === type) return node;
    return findByType(node.props.children, type);
  }
  return null;
}

/** Walk the JSX tree and call any async component elements (e.g. NflverseLabDoor)
 * so their resolved output is inlined for assertion. This mirrors what React's
 * Suspense boundary would do at render time in a real RSC stream.
 */
async function resolveNflverseDoor(tree: unknown): Promise<unknown> {
  if (tree == null || typeof tree === "boolean") return tree;
  if (typeof tree === "string" || typeof tree === "number") return tree;
  if (Array.isArray(tree)) {
    return Promise.all(tree.map((child) => resolveNflverseDoor(child)));
  }
  if (isElement(tree)) {
    if (tree.type === NflverseLabDoor) {
      const resolved = await NflverseLabDoor();
      return resolveNflverseDoor(resolved);
    }
    const children = await resolveNflverseDoor(tree.props.children);
    return { ...tree, props: { ...tree.props, children } };
  }
  return tree;
}

// ── loader fixture builders ──────────────────────────────────────────────────

const NOW = "2026-06-17T16:00:00.000Z";

function boardState(opts: {
  dataError?: "DB_UNREACHABLE";
  suppressedReason?: BoardSuppressionReason;
  rows?: { scoringNow: number; publishedToday: number; gatedTodayRows: number };
}): BoardStatePayload {
  const rows = opts.rows ?? { scoringNow: 0, publishedToday: 0, gatedTodayRows: 0 };
  const health = buildBoardHealth({
    now: new Date(NOW),
    modelVersion: "v5.0.0",
    rowCounts: rows,
    dataError: opts.dataError ?? null,
    suppressedReason: opts.suppressedReason ?? null,
  });
  const emptyRow = {
    id: "x",
    gameId: "g",
    matchup: "A @ B",
    sport: "NFL",
    market: "ALL",
    status: "SCORING_NOW" as const,
    edgeIndex: null,
    confidence: null,
    gateReason: null,
    updatedAt: NOW,
  };
  const fill = (n: number) => Array.from({ length: n }, (_, i) => ({ ...emptyRow, id: `r${i}` }));
  return {
    data: {
      sportsWatched: 0,
      booksPolled: 0,
      openPicks: rows.publishedToday,
      gatedToday: rows.gatedTodayRows,
      lastRefresh: NOW,
      modelVersion: "v5.0.0",
      bootstrap: false,
      scoringNow: fill(rows.scoringNow),
      publishedToday: fill(rows.publishedToday),
      gatedTodayRows: fill(rows.gatedTodayRows),
    },
    meta: {
      degradations: health.degradations,
      health: health.badge,
      isSampleData: false,
      boardClass: classifyBoardState({
        liveBoardOn: false,
        bootstrap: false,
        rowCount: rows.scoringNow + rows.publishedToday + rows.gatedTodayRows,
        dataError: opts.dataError ?? null,
        suppressedReason: opts.suppressedReason ?? null,
      }),
      ...(opts.dataError ? { dataError: opts.dataError } : {}),
      ...(opts.suppressedReason ? { suppressedDemoData: true } : {}),
      traceId: health.traceId,
    },
  };
}

function calibration(sampleSize: number) {
  return {
    data: {
      sampleSize,
      brierScore: null,
      isCollecting: sampleSize === 0,
      publicMessage: "Building calibration history from settled canonical picks.",
      updatedAt: NOW,
    },
    meta: { gated: false, isSampleData: false },
  };
}

beforeEach(() => {
  mocks.boardState.mockReset();
  mocks.boardPasses.mockReset().mockResolvedValue({
    data: { date: "2026-06-17", passes: [] },
    meta: { isSampleData: false },
  });
  mocks.calibration.mockReset().mockResolvedValue(calibration(0));
  mocks.nflverse.mockReset();
  mocks.proof.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Finding 1: /board honest suppression banner ──────────────────────────────

describe("/board — honest suppression banner replaces the dead sample-data banner", () => {
  const DEAD_COPY = "Showing deterministic sample board data";

  it("stale-suppressed board shows the honest 'Board paused' banner, not sample-data copy", async () => {
    mocks.boardState.mockResolvedValue(boardState({ suppressedReason: "STALE_DATA" }));
    const tree = await BoardPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("board-suppression-banner")).toBe(true);
    // Commit 4ae1e900 ('feat(launch): free signal-slate engine + third-pass
    // finish-line polish') deliberately renamed 'Board paused' -> 'Quiet board'
    // and reworded 'Live data did not clear the freshness check...' ->
    // 'Model signals are quiet... This is restraint, not an outage'. The
    // restraint-not-outage framing is the documented doctrine
    // (page.tsx:58-64 comment block).
    expect(text).toContain("Quiet board");
    expect(text).toContain("restraint, not an outage");
    // The dead banner and its "sample data" promise must be gone.
    expect(text).not.toContain(DEAD_COPY);
    expect(text).not.toContain("Preview mode");
    expect(text).not.toContain("Demo rows hidden"); // stale != demo: real branch
  });

  it("demo-suppressed board shows the honest 'Demo rows hidden' banner", async () => {
    mocks.boardState.mockResolvedValue(boardState({ suppressedReason: "DEMO_DATA" }));
    const tree = await BoardPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("board-suppression-banner")).toBe(true);
    expect(text).toContain("Demo rows hidden");
    expect(text).toContain("kept off the public board");
    expect(text).not.toContain("Board paused"); // demo != stale: real branch
    expect(text).not.toContain(DEAD_COPY);
  });

  it("DB-unreachable board shows the unreachable banner and NO suppression banner", async () => {
    mocks.boardState.mockResolvedValue(boardState({ dataError: "DB_UNREACHABLE" }));
    const tree = await BoardPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("board-suppression-banner")).toBe(false);
    expect(text).toContain("Data store unreachable");
    expect(text).not.toContain(DEAD_COPY);
  });

  it("healthy board with live rows shows neither the suppression nor the dead banner", async () => {
    mocks.boardState.mockResolvedValue(
      boardState({ rows: { scoringNow: 2, publishedToday: 3, gatedTodayRows: 1 } }),
    );
    const tree = await BoardPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("board-suppression-banner")).toBe(false);
    expect(text).not.toContain(DEAD_COPY);
    expect(text).not.toContain("Board paused");
    expect(text).not.toContain("Demo rows hidden");
  });
});

// ── Finding 2: /proof suppresses the fabricated freshness stamp on outage ─────

describe("/proof — outage suppresses the freshness stamp; no synthesized generatedAt", () => {
  it("REAL loader outage: internal DB failure → ledgerUnreachable → page renders the unreachable card, no stamp", async () => {
    // Exercise the ACTUAL path a real outage takes. A real ledger DB outage does
    // NOT make loadProofOfRecord reject — its internal db.pick.findMany rejects
    // and the loader must resolve an explicit ledgerUnreachable signal. Drive the
    // REAL loader with the DB call failing, then feed its real output to the page.
    const { loadProofOfRecord } = await vi.importActual<
      typeof import("@/lib/proof/load-proof-of-record")
    >("@/lib/proof/load-proof-of-record");
    const spy = vi
      .spyOn(db.pick, "findMany")
      .mockRejectedValue(new Error("ledger DB unreachable"));

    try {
      const board = await loadProofOfRecord();

      // Fail-safe + honest: the loader RESOLVED (never threw), flagged the
      // outage, and synthesized neither a freshness stamp nor an empty-set root.
      expect(board.ledgerUnreachable).toBe(true);
      expect(board.picks).toHaveLength(0);
      expect(board.generatedAt).toBe("");
      expect(board.merkleRoot).toBe("");

      // Wire the page to the loader's REAL outage signal and render it.
      mocks.proof.mockResolvedValue(board);
      const tree = await ProofPage();
      const ids = testIdsOf(tree);
      const text = textOf(tree);

      expect(ids.has("proof-unreachable-state")).toBe(true);
      expect(ids.has("proof-freshness-stamp")).toBe(false);
      expect(ids.has("proof-empty-state")).toBe(false);
      expect(text).toContain("temporarily unreachable");
      // The fabricated "Board generated <now>" stamp must not appear on outage.
      expect(text).not.toContain("Board generated");
    } finally {
      spy.mockRestore();
    }
  });

  it("successful empty ledger still renders the freshness stamp and honest empty state", async () => {
    mocks.proof.mockResolvedValue({
      generatedAt: NOW,
      picks: [],
      merkleRoot: "a".repeat(64),
      totalSettled: 0,
      ledgerUnreachable: false,
    });
    const tree = await ProofPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("proof-freshness-stamp")).toBe(true);
    expect(ids.has("proof-empty-state")).toBe(true);
    expect(ids.has("proof-unreachable-state")).toBe(false);
    expect(text).toContain("Board generated");
  });
});

// ── Finding 3: / (home) neutral treatment on outage / source-error ───────────

describe("/ (home) — outage renders neutral unavailable, not reassuring live zeros", () => {
  it("board DB outage + nflverse source-error suppress the reassuring live copy", async () => {
    mocks.boardState.mockResolvedValue(boardState({ dataError: "DB_UNREACHABLE" }));
    mocks.calibration.mockResolvedValue(calibration(0));
    mocks.nflverse.mockResolvedValue({ status: "source-error", sourceRows: 0 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    // Board door + signal-vs-noise say "unavailable", not "Gate holding" / zeros.
    expect(text).toContain("Live board data unavailable");
    expect(text).toContain("Live board counts are temporarily unavailable");
    expect(text).not.toContain("Gate holding");
    // Lab door says "unavailable", not the reassuring "Intake warming up".
    expect(text).toContain("Live player data unavailable");
    expect(text).not.toContain("Intake warming up");
    // The live-counts ledger band is withheld (metrics undefined) so it can't
    // caption unverifiable zeros as "Live counts".
    const methodology = findByType(tree, MethodologySection);
    expect(methodology).not.toBeNull();
    expect(methodology?.props.metrics).toBeUndefined();
  });

  it("nflverse source-error alone withholds the player metric while the healthy board counts stay", async () => {
    // Board is healthy; ONLY the nflverse source has errored. The real board
    // counts must still render, but the player metric must be withheld so the
    // source-error path never renders as the reassuring "Player intake / warming
    // up" under the "Live counts" caption (Finding A).
    mocks.boardState.mockResolvedValue(
      boardState({ rows: { scoringNow: 0, publishedToday: 2, gatedTodayRows: 1 } }),
    );
    mocks.calibration.mockResolvedValue(calibration(80));
    mocks.nflverse.mockResolvedValue({ status: "source-error", sourceRows: 0 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    // Board healthy → its live copy still renders, NOT "unavailable".
    expect(text).toContain("2 cleared · 1 gated");
    expect(text).not.toContain("Live board data unavailable");
    // Lab door reflects the nflverse outage honestly.
    expect(text).toContain("Live player data unavailable");
    expect(text).not.toContain("Intake warming up");
    // The band still carries the REAL board/calibration counts, but playerRows
    // is omitted so the outage can't render as a warm-up.
    const methodology = findByType(tree, MethodologySection);
    const metrics = methodology?.props.metrics as TrustLedgerMetrics | undefined;
    expect(metrics).toBeDefined();
    expect(metrics?.playerRows).toBeUndefined();
    // playerRows is now handled by Suspense (deferred nflverse load), not passed
    // in the static board/calibration metrics object.
    expect(metrics).toEqual({ settled: 80, cleared: 2, gated: 1, lastRefresh: NOW });
  });

  it("stale-suppressed board (degradation code, NO dataError) renders unavailable, not healthy zeros", async () => {
    // loadBoardState suppresses a stale slate by returning empty rows + a
    // STALE_DATA_SUPPRESSED degradation WITHOUT setting dataError. That state
    // must get the unavailable treatment, not the healthy "0 cleared · 0 gated"
    // / "Gate holding" quiet-board presentation this PR removes (Finding B).
    mocks.boardState.mockResolvedValue(boardState({ suppressedReason: "STALE_DATA" }));
    mocks.calibration.mockResolvedValue(calibration(0));
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 1234 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    expect(text).toContain("Live board data unavailable");
    expect(text).toContain("Live board counts are temporarily unavailable");
    expect(text).not.toContain("Gate holding");
    expect(text).not.toContain("0 cleared");
    // nflverse is live, so the Lab door still shows real player rows.
    expect(text).toContain("1,234 live player rows");
    // Suppressed board zeroes the live counts → the whole band is withheld.
    const methodology = findByType(tree, MethodologySection);
    expect(methodology?.props.metrics).toBeUndefined();
  });

  it("demo-suppressed board (degradation code, NO dataError) also renders unavailable", async () => {
    mocks.boardState.mockResolvedValue(boardState({ suppressedReason: "DEMO_DATA" }));
    mocks.calibration.mockResolvedValue(calibration(0));
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 0 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    expect(text).toContain("Live board data unavailable");
    expect(text).toContain("Live board counts are temporarily unavailable");
    expect(text).not.toContain("Gate holding");
    expect(text).not.toContain("0 cleared");
    const methodology = findByType(tree, MethodologySection);
    expect(methodology?.props.metrics).toBeUndefined();
  });

  it("healthy board + live nflverse assert the real live counts", async () => {
    mocks.boardState.mockResolvedValue(
      boardState({ rows: { scoringNow: 0, publishedToday: 2, gatedTodayRows: 1 } }),
    );
    mocks.calibration.mockResolvedValue(calibration(120));
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 1234 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    expect(text).toContain("2 cleared · 1 gated");
    expect(text).toContain("1,234 live player rows");
    expect(text).not.toContain("Live board data unavailable");
    expect(text).not.toContain("Live player data unavailable");
    // Healthy: the ledger band renders with the real operational metrics.
    // playerRows is no longer in the static metrics — it is now rendered
    // via the Suspense-bounded NflverseLabDoor component instead of
    // being passed through MethodologySection.
    const methodology = findByType(tree, MethodologySection);
    expect(methodology?.props.metrics).toEqual({
      settled: 120,
      cleared: 2,
      gated: 1,
      lastRefresh: NOW,
    });
  });

  it("genuinely quiet board (no outage, zero rows) keeps the honest 'Gate holding' fallback", async () => {
    mocks.boardState.mockResolvedValue(boardState({ rows: { scoringNow: 0, publishedToday: 0, gatedTodayRows: 0 } }));
    mocks.calibration.mockResolvedValue(calibration(0));
    // Live source but no rows yet — genuine warming, NOT a source error.
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 0 });
    const tree = await resolveNflverseDoor(await HomePage());
    const text = textOf(tree);

    expect(text).toContain("Gate holding. No forced action");
    expect(text).toContain("Intake warming up");
    expect(text).not.toContain("Live board data unavailable");
    expect(text).not.toContain("Live player data unavailable");
  });
});
