import { describe, expect, it } from "vitest";
import {
  bobHarrisQuarterbacks,
  fantasyProsInjury,
  fantasyProsInjuryCount,
  fantasyProsWeekly,
  footballguysWeekly,
  week7QuarterbackGaps,
} from "./public-boards";

describe("public week 7 boards", () => {
  it("does not agree on the quarterback", () => {
    const fp = fantasyProsWeekly("QB");
    const fbg = footballguysWeekly("QB");
    expect(fp[0]?.name).toBe("Brock Purdy");
    expect(fp[0]?.ecr).toBe(1);
    expect(fbg[0]?.name).toBe("Jordan Love");
    expect(fbg[0]?.rank).toBe(1);
    const purdy = fbg.find((p) => p.name === "Brock Purdy");
    expect(purdy).toBeTruthy();
    expect(purdy!.rank).toBeGreaterThan(1);
    expect(bobHarrisQuarterbacks()[0]?.name).toBe("Jordan Love");
  });

  it("keeps the injury board and a real rank gap", () => {
    expect(fantasyProsInjuryCount()).toBeGreaterThan(300);
    const nacua = fantasyProsInjury("Puka Nacua");
    expect(nacua?.status).toBe("Questionable");
    expect(nacua?.team).toBe("LAR");
    const gaps = week7QuarterbackGaps();
    expect(gaps.length).toBeGreaterThan(5);
    expect(Math.abs(gaps[0]!.gap)).toBeGreaterThan(3);
  });
});
