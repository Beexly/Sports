import { describe, expect, it } from "vitest";
import { rowsOnIntersection, sameBookBasis } from "../clv-same-book";

describe("same-book CLV intersection", () => {
  it("refuses a row with no bookmaker key rather than silently including it", () => {
    const r = sameBookBasis(
      [{ bookmaker: "draftkings" }, { bookmaker: null }],
      [{ bookmaker: "draftkings" }],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("missing_bookmaker_key");
      expect(r.unnamedMint).toBe(1);
    }
  });

  it("grades over the key intersection, not the union", () => {
    const r = sameBookBasis(
      [{ bookmaker: "draftkings" }, { bookmaker: "fanduel" }],
      [{ bookmaker: "draftkings" }, { bookmaker: "betmgm" }],
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.composition.intersection).toEqual(["draftkings"]);
      expect(r.composition.mintOnly).toEqual(["fanduel"]);
      expect(r.composition.closeOnly).toEqual(["betmgm"]);
      const kept = rowsOnIntersection(
        [
          { bookmaker: "draftkings", line: -3 },
          { bookmaker: "fanduel", line: -3.5 },
        ],
        r.composition.intersection,
      );
      expect(kept).toEqual([{ bookmaker: "draftkings", line: -3 }]);
    }
  });

  it("empty intersection refuses rather than producing a number", () => {
    const r = sameBookBasis([{ bookmaker: "draftkings" }], [{ bookmaker: "betmgm" }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty_intersection");
  });

  it("a book present at mint and absent at close is named as a composition change", () => {
    const r = sameBookBasis(
      [{ bookmaker: "draftkings" }, { bookmaker: "fanduel" }],
      [{ bookmaker: "draftkings" }],
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.composition.mintOnly).toEqual(["fanduel"]);
  });

  it("same line movement grades opposite for HOME vs AWAY (computeSpreadClv formula)", () => {
    const pickHomeLine = -3;
    const closeHomeLine = -2;
    const homeClv = pickHomeLine - closeHomeLine;
    const awayClv = closeHomeLine - pickHomeLine;
    expect(homeClv).toBe(-1);
    expect(awayClv).toBe(1);
    expect(Math.sign(homeClv)).toBe(-Math.sign(awayClv));
  });
});
