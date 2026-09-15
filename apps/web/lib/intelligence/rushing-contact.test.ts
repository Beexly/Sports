import { beforeEach, describe, expect, it, vi } from "vitest";

// C-355: loadRushingContact reads persisted PfrAdvStat rows (the ingester is
// the only write path). Mock checkClearance (rights gate) and the DB.
const mocks = vi.hoisted(() => ({ checkClearance: vi.fn(), findMany: vi.fn() }));
vi.mock("@/lib/scraping/clearance-engine", () => ({ checkClearance: mocks.checkClearance }));
vi.mock("@sports/db", () => ({ db: { pfrAdvStat: { findMany: mocks.findMany } } }));

import { buildRushingContactFromDb, loadRushingContact, type PfrRushDbRow } from "./rushing-contact";

/** Build a minimal allowed ClearanceResult for the given source_id. */
function allowedClearance(source_id: string) {
  return {
    allowed: true,
    requiresReview: false,
    source_id,
    mode: "open_dataset_ingest" as const,
    tool_id: "fetch-native" as const,
    intents: [] as readonly string[],
    blocks: [] as readonly { code: string; message: string }[],
    warnings: [] as readonly string[],
    rightsSnapshot: { source_id, source_url: "https://github.com/nflverse/nflverse-data", status: "approved_open_license" },
    checkedAt: new Date().toISOString(),
  };
}

function deniedClearance(source_id: string) {
  return {
    ...allowedClearance(source_id),
    allowed: false,
    blocks: [{ code: "permission_required", message: "PFR advanced requires written confirmation" }],
  };
}

function row(o: Partial<PfrRushDbRow>): PfrRushDbRow {
  return {
    pfrPlayerId: "x",
    playerName: "X",
    team: "ATL",
    carries: 120,
    rushingYardsAfterContact: 240,
    rushingYardsBeforeContact: 240,
    rushingBrokenTackles: 6,
    ...o,
  };
}

const ROWS: PfrRushDbRow[] = [
  row({ pfrPlayerId: "ELU", playerName: "Elusive Back", carries: 220, rushingYardsAfterContact: 600, rushingYardsBeforeContact: 400, rushingBrokenTackles: 30 }),
  row({ pfrPlayerId: "PLD", playerName: "Plodder", carries: 200, rushingYardsAfterContact: 300, rushingYardsBeforeContact: 600, rushingBrokenTackles: 10 }),
  row({ pfrPlayerId: "TINY", playerName: "Tiny", carries: 10 }), // below MIN_ATT
];

beforeEach(() => {
  mocks.checkClearance.mockReset();
  mocks.findMany.mockReset();
  mocks.checkClearance.mockImplementation((req: { source_id?: string }) =>
    allowedClearance(req.source_id ?? "nflverse"),
  );
  mocks.findMany.mockResolvedValue([]);
});

describe("buildRushingContactFromDb", () => {
  const rows = buildRushingContactFromDb(ROWS);
  const by = (n: string) => rows.find((r) => r.name === n);

  it("drops sub-threshold and ranks by YAC/att", () => {
    expect(rows.map((r) => r.name)).toEqual(["Elusive Back", "Plodder"]);
    expect(by("Elusive Back")!.attempts).toBe(220);
    expect(by("Elusive Back")!.yacPerAtt).toBe(2.73); // 600/220
    expect(by("Elusive Back")!.brokenTackles).toBe(30);
  });

  it("separates the talent term (YAC) from the blocking term (YBC)", () => {
    expect(by("Elusive Back")!.yacPerAtt).toBeGreaterThan(by("Plodder")!.yacPerAtt);
    expect(by("Plodder")!.ybcPerAtt).toBeGreaterThan(by("Elusive Back")!.ybcPerAtt);
  });

  it("sums weekly rows for the same player", () => {
    const summed = buildRushingContactFromDb([
      row({ pfrPlayerId: "W1", playerName: "Week One", carries: 40, rushingYardsAfterContact: 80, rushingYardsBeforeContact: 40, rushingBrokenTackles: 2 }),
      row({ pfrPlayerId: "W1", playerName: "Week One", carries: 40, rushingYardsAfterContact: 100, rushingYardsBeforeContact: 50, rushingBrokenTackles: 3 }),
    ]);
    expect(summed[0]!.attempts).toBe(80);
    expect(summed[0]!.yacPerAtt).toBe(2.25); // 180/80
    expect(summed[0]!.brokenTackles).toBe(5);
  });
});

describe("loadRushingContact", () => {
  it("returns live rows from the ingester's store", async () => {
    mocks.findMany.mockResolvedValue(ROWS);
    const r = await loadRushingContact({ season: 2024 });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2024);
    expect(r.rows.map((x) => x.name)).toEqual(["Elusive Back", "Plodder"]);
    expect(r.sourceUrl).toContain("nflverse-data/releases/tag/pfr_advstats");
    expect(r.canPublishProjections).toBe(false);
  });

  it("falls back to the previous season when the labelled one has no stored rows", async () => {
    mocks.findMany.mockImplementation(async ({ where }: { where: { season: number } }) =>
      where.season === 2023 ? ROWS : [],
    );
    const r = await loadRushingContact({ season: 2024 });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2023);
  });

  it("degrades to source-error when no rows are stored (rights gate / unpublished)", async () => {
    mocks.findMany.mockResolvedValue([]);
    const r = await loadRushingContact({ season: 2024 });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(r.error).toContain("no stored pfr_adv_stats rush rows");
  });

  it("returns a rights-gated empty state when clearance denies pfr-advstats-via-nflverse", async () => {
    mocks.checkClearance.mockImplementation((req: { source_id?: string }) =>
      deniedClearance(req.source_id ?? "nflverse"),
    );
    const r = await loadRushingContact({ season: 2024 });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(r.error).toContain("permission_required");
  });

  it("degrades to source-error when the store is unreachable", async () => {
    mocks.findMany.mockRejectedValue(new Error("db down"));
    const r = await loadRushingContact({ season: 2024 });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
  });
});
