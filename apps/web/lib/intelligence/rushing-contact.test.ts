import { describe, it, expect } from "vitest";
import { buildRushingContact, loadRushingContact } from "./rushing-contact";

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
