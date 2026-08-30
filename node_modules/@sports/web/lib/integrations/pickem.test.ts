import { describe, it, expect, afterEach } from "vitest";
import { activePickemLines, isLivePickem, registerPickemProvider, ILLUSTRATIVE_PICKEM } from "./pickem";
import { PROPS, type Prop } from "../fantasy/props";

const fakeProp: Prop = { id: "z1", player: "Z", team: "KC", market: "Rec Yds", line: 50, mean: 60, sigma: 20, alts: [] };

afterEach(() => registerPickemProvider(null));

describe("pick'em lines provider (founder-gated)", () => {
  it("defaults to the illustrative slate", () => {
    expect(activePickemLines({})).toBe(PROPS);
    expect(isLivePickem({})).toBe(false);
    expect(ILLUSTRATIVE_PICKEM.lines()).toBe(PROPS);
  });

  it("requires a registered live provider AND the env flag to go live", () => {
    registerPickemProvider({ name: "Acme Lines", live: true, lines: () => [fakeProp] });
    // registered but not keyed -> still illustrative
    expect(isLivePickem({})).toBe(false);
    expect(activePickemLines({})).toBe(PROPS);
    // registered AND keyed -> live
    const env = { PICKEM_LINES_PROVIDER: "acme" };
    expect(isLivePickem(env)).toBe(true);
    expect(activePickemLines(env)).toEqual([fakeProp]);
  });

  it("ignores a non-live provider even if registered + keyed", () => {
    registerPickemProvider({ name: "fake", live: false, lines: () => [fakeProp] });
    expect(isLivePickem({ PICKEM_LINES_PROVIDER: "x" })).toBe(false);
    expect(activePickemLines({ PICKEM_LINES_PROVIDER: "x" })).toBe(PROPS);
  });
});
