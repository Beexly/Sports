import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P16-01 VERIFY — Homepage shell renders without awaiting the nflverse loader.
 *
 * The fix moved `loadNflverseUsagePulse()` out of the blocking Promise.all on
 * the homepage and into a Suspense-bounded sub-component (`NflverseLabDoor`).
 * This test proves the critical path no longer waits on the nflverse archive:
 * even when the loader hangs forever, `await HomePage()` resolves and the page
 * shell (thesis headline, nav, board door, methodology) is present.
 */
const mocks = vi.hoisted(() => ({
  boardState: vi.fn(),
  boardPasses: vi.fn(),
  calibration: vi.fn(),
  nflverse: vi.fn(),
}));

vi.mock("@/lib/board/state", () => ({ loadBoardState: mocks.boardState }));
vi.mock("@/lib/board/passes", () => ({ loadBoardPasses: mocks.boardPasses }));
vi.mock(
  "@/lib/calibration/report",
  () => ({ loadPublicCalibrationReport: mocks.calibration }),
);
vi.mock(
  "@/lib/nflverse/usage-pulse",
  () => ({ loadNflverseUsagePulse: mocks.nflverse }),
);

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import HomePage from "@/app/page";
import { NflverseLabDoor, NflverseLabDoorPlaceholder } from "@/components/landing/nflverse-lab-door";

// ── element-tree helpers (same pattern as honest-degraded-states.test.ts) ────

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
  return out.join("\u0001");
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
    // Search children AND prop values (e.g. Suspense fallback prop).
    for (const value of Object.values(node.props)) {
      if (typeof value === "string") continue;
      const found = findByType(value, type);
      if (found) return found;
    }
    return null;
  }
  return null;
}

function hasType(node: unknown, type: unknown): boolean {
  return findByType(node, type) !== null;
}

// ── fixture builders ─────────────────────────────────────────────────────────

const NOW = "2026-06-17T16:00:00.000Z";

const boardStateFixture = {
  data: {
    sportsWatched: 0,
    booksPolled: 0,
    openPicks: 2,
    gatedToday: 1,
    lastRefresh: NOW,
    modelVersion: "v5.0.0",
    bootstrap: false,
    scoringNow: [],
    publishedToday: [],
    gatedTodayRows: [],
  },
  meta: {
    degradations: [],
    health: "GREEN",
    isSampleData: false,
    boardClass: "LIVE" as const,
    traceId: "t1",
  },
};

const calibrationFixture = {
  data: {
    sampleSize: 120,
    brierScore: null,
    isCollecting: false,
    publicMessage: "Calibration is computed from settled canonical picks only.",
    updatedAt: NOW,
  },
  meta: { gated: false, isSampleData: false },
};

beforeEach(() => {
  mocks.boardState.mockReset().mockResolvedValue(boardStateFixture);
  mocks.boardPasses.mockReset().mockResolvedValue({
    data: { date: "2026-06-17", passes: [] },
    meta: { isSampleData: false },
  });
  mocks.calibration.mockReset().mockResolvedValue(calibrationFixture);
  mocks.nflverse.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("P16-01 — homepage shell renders without awaiting nflverse loader", () => {
  it("resolves immediately even when loadNflverseUsagePulse hangs forever", async () => {
    // The nflverse loader is mocked to NEVER resolve (hangs for 30s+).
    // If the page still awaited it in Promise.all, this test would time out.
    mocks.nflverse.mockReturnValue(
      new Promise(() => {
        /* never resolves — simulates the full-archive download hanging */
      }),
    );

    const tree = await HomePage();
    const text = textOf(tree);

    // The page shell rendered without waiting for nflverse.
    expect(text).toContain("The market is full of");
    expect(text).toContain("Galaxy turns it into");
    expect(text).toContain("We detect. You decide.");
    expect(text).toContain("Pick the decision you came to make.");
    expect(text).toContain("Board");
    // "The Lab" door label lives inside the suspended NflverseLabDoor
    // component — it does NOT appear in the shell text when the loader
    // hangs. The shell itself (doors grid, thesis, nav, footer) is present.
    expect(text).toContain("Intelligence");
    expect(text).toContain("Fantasy & Daily");
  });

  it("renders the page shell with a Suspense boundary around the nflverse door", async () => {
    mocks.nflverse.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );

    const tree = await HomePage();

    // The NflverseLabDoor component is present as an unresolved async element.
    expect(hasType(tree, NflverseLabDoor)).toBe(true);
    // And it is wrapped in Suspense with a placeholder fallback.
    expect(hasType(tree, NflverseLabDoorPlaceholder)).toBe(true);
  });

  it("page shell renders even when loadNflverseUsagePulse rejects", async () => {
    mocks.nflverse.mockRejectedValue(new Error("nflverse network failure"));

    // HomePage resolves without throwing — the rejection is deferred.
    const tree = await HomePage();
    const text = textOf(tree);

    expect(text).toContain("The market is full of");
    expect(text).toContain("Galaxy turns it into");
    // The nflverse door is still present (as a Suspense boundary, unresolved).
    expect(hasType(tree, NflverseLabDoor)).toBe(true);
  });

  it("NflverseLabDoor renders real pulse data when the loader resolves", async () => {
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 1234 });

    // NflverseLabDoor suspends, then resolves with the mocked pulse.
    const door = await NflverseLabDoor();
    const text = textOf(door);

    expect(text).toContain("1,234 live player rows");
    expect(text).not.toContain("Intake warming up");
  });

  it("NflverseLabDoor renders source-error state when the loader errors", async () => {
    mocks.nflverse.mockResolvedValue({
      status: "source-error",
      sourceRows: 0,
    });

    const door = await NflverseLabDoor();
    const text = textOf(door);

    expect(text).toContain("Live player data unavailable");
    expect(text).not.toContain("1,234 live player rows");
  });

  it("pulse feature still exists in NflverseLabDoor (not deleted, just deferred)", () => {
    // Belt-and-suspenders: the pulse feature must still exist — now in the
    // Suspense-bounded NflverseLabDoor component, not the page-level Promise.all.
    const doorSource = readFileSync(
      resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
      "utf8",
    );
    expect(doorSource).toContain("loadNflverseUsagePulse");

    // The homepage page.tsx must still use Suspense for the door, and the
    // nflverse loader must NOT appear inside the homepage's blocking Promise.all.
    const pageSource = readFileSync(
      resolve(__dirname, "..", "app", "page.tsx"),
      "utf8",
    );
    expect(pageSource).toContain("Suspense");
    const match = pageSource.match(/await Promise\.all\([\s\S]*?\]\)/);
    expect(match).not.toBeNull();
    const promiseAllBlock = match![0];
    expect(promiseAllBlock).not.toContain("loadNflverseUsagePulse");
    expect(promiseAllBlock).toContain("loadBoardState");
    expect(promiseAllBlock).toContain("loadPublicCalibrationReport");
  });
});
