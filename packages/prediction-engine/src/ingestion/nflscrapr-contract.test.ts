import { describe, expect, it } from "vitest";
import {
  NFLSCRAPR_JSON_PROBE,
  approvedPbpSource,
  nflscraprGameJsonUrl,
  nflscraprRegularWeeks,
} from "./nflscrapr-contract.js";

describe("nflscrapR contract", () => {
  it("builds the CC0 JSON url and records that the endpoint is dead", () => {
    expect(nflscraprGameJsonUrl("2016010310")).toBe(
      "http://www.nfl.com/liveupdate/game-center/2016010310/2016010310_gtd.json",
    );
    expect(NFLSCRAPR_JSON_PROBE.httpStatus).toBe(301);
    expect(approvedPbpSource()).toBe("nflverse");
  });

  it("keeps the package week contract and rejects an 18-week request", () => {
    expect(nflscraprRegularWeeks([1, 17])).toEqual([1, 17]);
    expect(() => nflscraprRegularWeeks([18])).toThrow(/1 through 17/);
    expect(() => nflscraprGameJsonUrl("2017")).toThrow(/10 digits/);
  });
});
