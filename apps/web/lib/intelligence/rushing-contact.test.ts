import { describe, it, expect, vi } from "vitest";

// P4-05 added a PFR-specific checkClearance gate for `pfr-advstats-via-nflverse`
// (status: permission_required, automation_allowed: false in the real registry).
// Mock checkClearance to return allowed=true so the happy-path and source-error
// degradation tests actually exercise the fetcher path.
const cmocks = vi.hoisted(() => ({ checkClearance: vi.fn() }));
vi.mock("@/lib/scraping/clearance-engine", () => ({ checkClearance: cmocks.checkClearance }));

import { buildRushingContact, loadRushingContact } from "./rushing-contact";

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

// Default: clearance always allowed
cmocks.checkClearance.mockImplementation((req: { source_id?: string }) =>
  allowedClearance(req.source_id ?? "nflverse"),
);

type Row = Record<string, string>;
// Mirrors the real combined SEASON file (advstats_season_rush.csv): one row per
// player-season, columns season / player / pfr_id / tm / att / yac / ybc / brk_tkl.
function ps(o: Partial<Row>): Row {
  return { season: "2024", pfr_id: "x", player: "X", tm: "ATL", att: "120", yac: "240", ybc: "240", brk_tkl: "6", ...o };
}

const RECORDS: Row[] = [
  ps({ pfr_id: "ELU", player: "Elusive Back", att: "220", yac: "600", ybc: "400", brk_tkl: "30" }),
  ps({ pfr_id: "PLD", player: "Plodder", att: "200", yac: "300", ybc: "600", brk_tkl: "10" }),
  ps({ pfr_id: "TINY", player: "Tiny", att: "10" }), // below MIN_ATT
  ps({ pfr_id: "OLD", player: "Old Season", season: "2023", att: "300", yac: "900" }), // other season, excluded
];

describe("buildRushingContact", () => {
  const rows = buildRushingContact(RECORDS, 2024);
  const by = (n: string) => rows.find((r) => r.name === n);

  it("filters to the active season, drops sub-threshold, ranks by YAC/att", () => {
    expect(rows.map((r) => r.name)).toEqual(["Elusive Back", "Plodder"]); // TINY excluded, 2023 ignored
    expect(by("Elusive Back")!.attempts).toBe(220);
    expect(by("Elusive Back")!.yacPerAtt).toBe(2.73); // 600/220
    expect(by("Elusive Back")!.brokenTackles).toBe(30);
  });

  it("separates the talent term (YAC) from the blocking term (YBC)", () => {
    expect(by("Elusive Back")!.yacPerAtt).toBeGreaterThan(by("Plodder")!.yacPerAtt);
    expect(by("Plodder")!.ybcPerAtt).toBeGreaterThan(by("Elusive Back")!.ybcPerAtt);
  });
});

describe("loadRushingContact", () => {
  it("degrades to source-error when PFR is unreachable (both seasons)", async () => {
    const r = await loadRushingContact({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.rows).toEqual([]);
  });
});
