import { describe, it, expect } from "vitest";
import { normalizeName, rosterKey, indexRoster, matchRoster, type RosterRow } from "./nflverse";

const rows: RosterRow[] = [
  { name: "Brian T. Cook", team: "KC", pos: "WR", gsisId: "00-001", sleeperId: "1" },
  { name: "Mike Jones Jr.", team: "BUF", pos: "RB", pfrId: "JoneMi99" },
];

describe("nflverse roster join (Wave4 #11)", () => {
  it("normalizes suffix/punctuation variants to one key", () => {
    expect(normalizeName("Brian T. Cook Jr.")).toBe("brian cook");
    expect(rosterKey("Brian T. Cook Jr.", "kc", "wr")).toBe(rosterKey("BRIAN COOK", "KC", "WR"));
  });

  it("matches roster rows and keeps ids", () => {
    const idx = indexRoster(rows);
    const hit = matchRoster(idx, "Brian Cook", "KC", "WR");
    expect(hit.rows).toHaveLength(1);
    expect(hit.rows[0].gsisId).toBe("00-001");
    expect(matchRoster(idx, "Nobody Nil", "KC", "WR").rows).toHaveLength(0);
  });

  it("keeps collisions instead of dropping them", () => {
    const dup: RosterRow[] = [...rows, { name: "Brian Cook", team: "KC", pos: "WR", espnId: "9" }];
    const idx = indexRoster(dup);
    expect(matchRoster(idx, "Brian T Cook", "KC", "WR").rows).toHaveLength(2);
  });
});
