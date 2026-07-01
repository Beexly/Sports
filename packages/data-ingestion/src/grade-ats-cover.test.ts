import { describe, expect, it } from "vitest";
import { gradeAtsCover } from "./context-enrichment.js";

// Pins the pure ATS cover-margin grading extracted from settleGameLogs.
// spread is from home's perspective (negative = home favored). Home covers
// when coverMargin = actualMargin + spread clears 0; |coverMargin| < 0.5 PUSHes.
describe("gradeAtsCover", () => {
  it("home WINS / away LOSES when home covers (favorite covers the number)", () => {
    // home -7, won by 10 -> coverMargin = 10 + (-7) = 3 > 0
    expect(gradeAtsCover(10, -7)).toEqual({ homeAts: "WIN", awayAts: "LOSS" });
  });

  it("home LOSES / away WINS when home fails to cover", () => {
    // home -7, won by only 3 -> coverMargin = 3 + (-7) = -4 < 0
    expect(gradeAtsCover(3, -7)).toEqual({ homeAts: "LOSS", awayAts: "WIN" });
  });

  it("home dog WINS ATS when it loses by less than the spread", () => {
    // home +7 (underdog), lost by 3 (margin -3) -> coverMargin = -3 + 7 = 4 > 0
    expect(gradeAtsCover(-3, 7)).toEqual({ homeAts: "WIN", awayAts: "LOSS" });
  });

  it("exact cover (coverMargin === 0) is a PUSH for both sides", () => {
    // home -7, won by exactly 7 -> coverMargin = 0, |0| < 0.5
    expect(gradeAtsCover(7, -7)).toEqual({ homeAts: "PUSH", awayAts: "PUSH" });
  });

  it("inside the half-point band is a PUSH (|coverMargin| < 0.5)", () => {
    // coverMargin = 0.25 -> within band -> PUSH
    expect(gradeAtsCover(7.25, -7)).toEqual({ homeAts: "PUSH", awayAts: "PUSH" });
    // coverMargin = -0.25 -> within band -> PUSH
    expect(gradeAtsCover(6.75, -7)).toEqual({ homeAts: "PUSH", awayAts: "PUSH" });
  });

  it("at the +/-0.5 boundary the band is exclusive (>= 0.5 grades a winner)", () => {
    // coverMargin = 0.5 -> NOT < 0.5 -> home covers (WIN)
    expect(gradeAtsCover(7.5, -7)).toEqual({ homeAts: "WIN", awayAts: "LOSS" });
    // coverMargin = -0.5 -> NOT < 0.5 -> home fails to cover (LOSS)
    expect(gradeAtsCover(6.5, -7)).toEqual({ homeAts: "LOSS", awayAts: "WIN" });
  });
});
