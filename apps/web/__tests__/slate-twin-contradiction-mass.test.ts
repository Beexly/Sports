import { describe, expect, it, vi } from "vitest";
import { getEntitlements } from "@sports/types";

/**
 * Absence must not render as dissent.
 *
 * THE DEFECT. `getSlateTwin` computed
 *   `contradictionMass = pick ? c01(1 - (pick.consensusPct ?? 0.5)) : 0.5`
 * and `hud.ts` renders it as `game.contradictionMass * 100` — a percentage.
 *
 * `consensusPct` is `Float @default(0)` and NON-NULLABLE in schema.prisma, so
 * the `?? 0.5` could never fire. A pick with no bookmaker consensus therefore
 * read 0, `1 - 0` evaluated to 1, and the HUD showed **100% credible
 * counter-evidence** for a game where no book had expressed an opinion at all.
 *
 * The population that hits this is precisely `bookmakerCount === 0` — the
 * model-signal picks the signal path mints. The source read like it was
 * guarded; the guard was dead code over a non-nullable column.
 *
 * These tests pin the fixed behaviour directly. They are cheap: one mocked
 * findMany, no DB.
 */

const gameRow = (over: Record<string, unknown> = {}) => ({
  id: "g1",
  sport: { id: "sport-nfl", name: "NFL", slug: "nfl" },
  homeTeam: "Browns",
  awayTeam: "Steelers",
  commenceTime: new Date("2026-10-02T00:15:00Z"),
  homeScore: null,
  awayScore: null,
  status: "SCHEDULED",
  spread: -3,
  openingSpread: -3,
  total: 44,
  openingTotal: 44,
  bookmakerCount: 0,
  bookmakerCoverageMax: 0,
  dataQualityScore: 100,
  picks: [
    {
      id: "p1",
      selection: "Cleveland Browns -3",
      confidence: 62,
      pickGrade: "LEAN",
      riskLevel: "MEDIUM",
      isPremium: false,
      isBootstrap: false,
      isPublished: true,
      modelVersion: "v5.3.0",
      note: null,
      // Prisma returns 0 for a never-written Float @default(0). NOT null.
      consensusPct: 0,
      // The gate keys on the PICK's bookmakerCount (Pick.bookmakerCount Int
      // @default(0)), not the game's. My first fixture omitted it, so the
      // second case read undefined and fell to the 0.5 neutral.
      bookmakerCount: 0,
      factorBreakdown: null,
    },
  ],
  ...over,
});

function twinFor(row: Record<string, unknown>) {
  // One argument only: getSlateTwin(entitlements?). Without the readiness-gate
  // mock below it returns DEMO_SLATE, whose contradictionMass is a hand-written
  // 0.18 — the first version of this test asserted against that and failed,
  // which is the mock catching me rather than the product.
  (globalThis as unknown as { __twinRow: unknown }).__twinRow = row;
  return getSlateTwin(getEntitlements("PREMIUM")).then(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t,
  );
}

vi.mock("@sports/db", () => ({
  db: { game: { findMany: vi.fn(async () => [globalThis.__twinRow]) } },
  isStubMode: () => false,
  isDemoPicksEnabled: () => false,
}));
vi.mock("@/lib/board/state", () => ({
  loadBoardState: vi.fn(() => Promise.resolve(null)),
}));
// The gate comes from @sports/prediction-engine, NOT a web lib — my first
// attempt mocked "@/lib/calibration/gates", which resolved to nothing, and the
// handler took its `catch` branch straight to DEMO_SLATE (0.18).
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ canExposePublicPicks: true }),
}));
vi.mock("@/lib/market/game-market-read", () => ({
  buildH2hMarketRead: vi.fn(() => null),
  DRIFT_MOVING_PP: 15,
}));
vi.mock("@/lib/market/simulation-cloud-geometry", () => ({ WIDE_SPREAD_PP: 40 }));

import { getSlateTwin } from "@/lib/slate-twin/get-slate-twin";

describe("contradictionMass when there is no bookmaker consensus", () => {
  it("does not report maximal counter-evidence for a pick no book priced", async () => {
    const twin = await twinFor(gameRow());
    const g = twin.games[0]!;

    // The old code produced exactly 1.0 here -> HUD renders "100%".
    expect(g.contradictionMass).not.toBe(1);
    expect(g.contradictionMass).toBeCloseTo(0.5, 10);
  });

  it("still uses the real consensus when books exist", async () => {
    const row = gameRow();
    // 6 of 8 books agree -> contradiction mass 0.25.
    row.picks[0]!.consensusPct = 0.75;
    row.picks[0]!.bookmakerCount = 8;
    row.bookmakerCount = 8;
    const twin = await twinFor(row);
    expect(twin.games[0]!.contradictionMass).toBeCloseTo(0.25, 10);
  });
});
