import { describe, it, expect } from "vitest";
import { rankPickem } from "./pickem-optimizer";
import type { Prop } from "./props";

const priced: Prop = {
  id: "p1", player: "Priced Penny", team: "KC", market: "Rec Yds",
  line: 50, mean: 70, sigma: 10, alts: [],
  overAmerican: -110, underAmerican: -110,
};
const unpriced: Prop = {
  id: "p2", player: "Unpriced Uli", team: "KC", market: "Rec Yds",
  line: 50, mean: 60, sigma: 20, alts: [],
};

describe("pickem optimizer (Wave4 #6)", () => {
  it("ranks priced edges above unpriced lines", () => {
    const ranked = rankPickem([unpriced, priced]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].read.prop.id).toBe("p1");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].read.priced).toBe(true);
  });

  it("ranks the illustrative slate without fabricating prices", () => {
    const ranked = rankPickem();
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.map((r) => r.rank)[0]).toBe(1);
    for (const r of ranked) expect(r.read.priced).toBe(false);
  });
});
