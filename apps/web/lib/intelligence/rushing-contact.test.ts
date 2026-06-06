import { describe, it, expect } from "vitest";
import { buildRushingContact, loadRushingContact } from "./rushing-contact";

type Row = Record<string, string>;
function wk(o: Partial<Row>): Row {
  return { pfr_player_id: "x", pfr_player_name: "X", team: "ATL", game_type: "REG", att: "20", yac: "40", ybc: "40", brk_tkl: "1", ...o };
}

const RECORDS: Row[] = [
  wk({ pfr_player_id: "ELU", pfr_player_name: "Elusive Back", att: "22", yac: "60", ybc: "40", brk_tkl: "3" }),
  wk({ pfr_player_id: "ELU", pfr_player_name: "Elusive Back", att: "22", yac: "60", ybc: "40", brk_tkl: "3" }),
  wk({ pfr_player_id: "PLD", pfr_player_name: "Plodder", att: "20", yac: "30", ybc: "60", brk_tkl: "1" }),
  wk({ pfr_player_id: "PLD", pfr_player_name: "Plodder", att: "20", yac: "30", ybc: "60", brk_tkl: "1" }),
  wk({ pfr_player_id: "TINY", pfr_player_name: "Tiny", att: "10" }), // below MIN_ATT
  wk({ pfr_player_id: "ELU", pfr_player_name: "Elusive Back", game_type: "POST", att: "30", yac: "200" }), // playoff, excluded
];

describe("buildRushingContact", () => {
  const rows = buildRushingContact(RECORDS);
  const by = (n: string) => rows.find((r) => r.name === n);

  it("aggregates REG-only carries, drops sub-threshold, ranks by YAC/att", () => {
    expect(rows.map((r) => r.name)).toEqual(["Elusive Back", "Plodder"]); // TINY excluded, POST ignored
    expect(by("Elusive Back")!.attempts).toBe(44); // 22+22 (POST 30 excluded)
    expect(by("Elusive Back")!.yacPerAtt).toBe(2.73); // 120/44
    expect(by("Elusive Back")!.brokenTackles).toBe(6);
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
