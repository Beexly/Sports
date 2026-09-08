import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * C-236. /players has no entitlement gate — deliberately: it is a public
 * product with canonical metadata and a sitemap entry, and each view links its
 * PRO-gated raw JSON via `jsonHref`. That shape is fine for nflverse data,
 * which is open.
 *
 * It is NOT fine for licensed DFS salaries. /api/dfs/salaries gates the same
 * data behind requireFantasyApi() and states the rule in its own comment: the
 * page teaser renders "only the top 24 rows", the raw JSON is "the FULL
 * reconciled board from paid providers, so it is gated". /fantasy/dfs honours
 * that with slice(0, 24). loadDfsView did not, so /players?view=dfs would have
 * published the entire paid board to anonymous visitors and to crawlers.
 *
 * Latent today only because no DFS provider key is configured in production —
 * the live page renders "no licensed feed is connected" — which is precisely
 * why the bound has to exist before a feed is connected.
 */

const mocks = vi.hoisted(() => ({ loadDfsSalaries: vi.fn() }));

vi.mock("@/lib/dfs/salaries", () => ({ loadDfsSalaries: mocks.loadDfsSalaries }));

import { PLAYER_VIEWS } from "@/lib/players/views";

const dfsView = PLAYER_VIEWS.find((v) => v.slug === "dfs");

function salaryRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    playerName: `Player ${i}`,
    position: i % 2 === 0 ? "RB" : "WR",
    salary: 9000 - i,
    feeds: 2,
    agrees: true,
  }));
}

beforeEach(() => mocks.loadDfsSalaries.mockReset());

describe("the public DFS view is a bounded teaser, not the paid board", () => {
  it("caps the rendered rows at the same depth /fantasy/dfs uses", async () => {
    mocks.loadDfsSalaries.mockResolvedValue({
      status: "live",
      rows: salaryRows(300),
      providers: [{ status: "live" }],
      date: "2026-09-08",
      generatedAt: "2026-09-08T12:00:00.000Z",
      discrepancies: 4,
      gate: { legalNote: "", requiredEnv: [] },
    });

    const result = await dfsView!.load();

    expect(result.status).toBe("live");
    const section = result.sections[0];
    expect(section?.rows).toHaveLength(24);
    // 300 rows loaded, 24 published — the bound is what stops the paid board
    // reaching an anonymous visitor.
    expect(section?.rows.length).toBeLessThan(300);
  });

  it("still tells the reader the board is larger than what is shown", async () => {
    // A silent truncation would be its own dishonesty: the page must not imply
    // 24 rows is the whole slate.
    mocks.loadDfsSalaries.mockResolvedValue({
      status: "live",
      rows: salaryRows(300),
      providers: [{ status: "live" }],
      date: "2026-09-08",
      generatedAt: "2026-09-08T12:00:00.000Z",
      discrepancies: 4,
      gate: { legalNote: "", requiredEnv: [] },
    });

    const result = await dfsView!.load();

    expect(result.sections[0]?.footnote).toContain("24");
    expect(result.sections[0]?.footnote).toContain("300");
  });

  it("returns fewer than the cap without padding when the slate is short", async () => {
    mocks.loadDfsSalaries.mockResolvedValue({
      status: "live",
      rows: salaryRows(9),
      providers: [{ status: "live" }],
      date: "2026-09-08",
      generatedAt: "2026-09-08T12:00:00.000Z",
      discrepancies: 0,
      gate: { legalNote: "", requiredEnv: [] },
    });

    const result = await dfsView!.load();

    expect(result.sections[0]?.rows).toHaveLength(9);
  });

  it("publishes nothing at all when no licensed feed is connected", async () => {
    // The production state today. No rows, and the reason is stated rather than
    // rendered as an empty board that looks like a quiet slate.
    mocks.loadDfsSalaries.mockResolvedValue({
      status: "gated",
      rows: [],
      providers: [],
      date: "2026-09-08",
      generatedAt: "2026-09-08T12:00:00.000Z",
      discrepancies: 0,
      gate: { legalNote: "Licensed feed required.", requiredEnv: ["DFS_PROVIDER_KEY"] },
    });

    const result = await dfsView!.load();

    expect(result.status).toBe("source-error");
    expect(result.sections).toHaveLength(0);
  });
});
