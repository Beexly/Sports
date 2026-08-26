import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DfsSalaries, DfsSalaryRow } from "@/lib/dfs/salaries";
import type { Entitlements } from "@sports/types";
import { getEntitlements } from "@sports/types";

/**
 * Player Lab DFS view — the paid board must not be readable anonymously.
 *
 * `/api/dfs/salaries` gates the FULL reconciled DraftKings board behind
 * `requireFantasyApi()` (FANTASY | PRO | ELITE), and `/fantasy/dfs` shows a
 * deliberate 24-row public teaser. `/players?view=dfs` rendered `dfs.rows` in
 * full with no gate at all, so an anonymous visitor could read the entire paid
 * board from the page and skip the API gate outright.
 *
 * These tests pin the three properties that close it: unentitled viewers get
 * the teaser, entitled viewers get the full board, and the truncated table
 * says so rather than passing itself off as the whole slate.
 */

const mocks = vi.hoisted(() => ({
  loadDfsSalaries: vi.fn(),
  getViewerEntitlements: vi.fn(),
}));

vi.mock("@/lib/dfs/salaries", () => ({ loadDfsSalaries: mocks.loadDfsSalaries }));
vi.mock("@/lib/pricing/tier-access", () => ({
  getViewerEntitlements: mocks.getViewerEntitlements,
}));

function row(name: string): DfsSalaryRow {
  return {
    name,
    team: "KC",
    position: "WR",
    salary: 7000,
    salariesByProvider: { alpha: 7000 },
    providerCount: 1,
    agreement: "single",
    spread: 0,
  };
}

/** 40 rows — comfortably more than the 24-row public teaser depth. */
const FULL_BOARD: readonly DfsSalaryRow[] = Array.from({ length: 40 }, (_, i) => row(`Player ${i + 1}`));

function salaries(): DfsSalaries {
  return {
    generatedAt: "2026-08-25T12:00:00.000Z",
    status: "live",
    operator: "DraftKings",
    date: "2026-08-25",
    providers: [{ id: "alpha", status: "live" } as DfsSalaries["providers"][number]],
    connectedProviders: 1,
    rows: FULL_BOARD,
    discrepancies: 3,
    canPublishPicks: false,
    gate: {
      connected: true,
      requiredEnv: ["DFS_ALPHA_KEY"],
      legalNote: "Licensed feeds only.",
    } as DfsSalaries["gate"],
  } as DfsSalaries;
}

async function renderDfsView() {
  const { PLAYER_VIEWS } = await import("@/lib/players/views");
  const view = PLAYER_VIEWS.find((v) => v.slug === "dfs");
  if (!view) throw new Error("dfs view missing from PLAYER_VIEWS");
  return view.load();
}

function rowsOf(result: Awaited<ReturnType<typeof renderDfsView>>): readonly unknown[] {
  const section = result.sections[0];
  if (!section || !("rows" in section)) throw new Error("no dfs section rendered");
  return section.rows as readonly unknown[];
}

describe("Player Lab DFS view — paid board is gated", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.loadDfsSalaries.mockReset();
    mocks.getViewerEntitlements.mockReset();
    mocks.loadDfsSalaries.mockResolvedValue(salaries());
  });

  it("serves an anonymous (FREE) viewer only the 24-row teaser, never the full board", async () => {
    mocks.getViewerEntitlements.mockResolvedValue(getEntitlements("FREE"));
    const result = await renderDfsView();
    const rows = rowsOf(result);
    expect(rows).toHaveLength(24);
    expect(rows.length).toBeLessThan(FULL_BOARD.length);
  });

  it("serves a FANTASY subscriber the full reconciled board", async () => {
    mocks.getViewerEntitlements.mockResolvedValue(getEntitlements("FANTASY"));
    const result = await renderDfsView();
    expect(rowsOf(result)).toHaveLength(FULL_BOARD.length);
  });

  it("serves PRO and ELITE the full board too (the fantasy floor, not the fantasy tier)", async () => {
    for (const tier of ["PRO", "ELITE"] as const) {
      vi.resetModules();
      mocks.getViewerEntitlements.mockResolvedValue(getEntitlements(tier));
      const result = await renderDfsView();
      expect(rowsOf(result), `${tier} should see the full board`).toHaveLength(FULL_BOARD.length);
    }
  });

  it("labels the truncated table honestly instead of implying it is the whole slate", async () => {
    mocks.getViewerEntitlements.mockResolvedValue(getEntitlements("FREE"));
    const result = await renderDfsView();
    const section = result.sections[0] as { footnote?: string };
    expect(section.footnote).toContain("24");
    expect(section.footnote).toContain(String(FULL_BOARD.length));
  });

  it("fails closed to the teaser when entitlement resolution throws", async () => {
    // getViewerEntitlements already fails closed to FREE internally; if it ever
    // rejects outright, the view must not fall through to the full board.
    mocks.getViewerEntitlements.mockRejectedValue(new Error("session backend down"));
    await expect(renderDfsView()).rejects.toThrow();
  });

  it("does not fetch salaries before resolving entitlements (denial-of-wallet order)", async () => {
    const order: string[] = [];
    mocks.getViewerEntitlements.mockImplementation(async () => {
      order.push("entitlements");
      return getEntitlements("FREE") as Entitlements;
    });
    mocks.loadDfsSalaries.mockImplementation(async () => {
      order.push("salaries");
      return salaries();
    });
    await renderDfsView();
    expect(order[0]).toBe("entitlements");
  });
});
