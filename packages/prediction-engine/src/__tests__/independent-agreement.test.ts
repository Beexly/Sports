import { describe, expect, it } from "vitest";
import {
  SOURCE_DIRECTION_EPSILON,
  sourceAgreement,
  type SourceAgreement,
} from "../independent-agreement.js";

const src = (homeFairProb: number | null | undefined) => ({ homeFairProb });

describe("sourceAgreement", () => {
  it("reads the shared abstention band, not a magic 0.5", () => {
    expect(SOURCE_DIRECTION_EPSILON).toBe(0.005);
  });

  it("two sources on the SAME side corroborate", () => {
    // THE SPECIMEN. 0.72 and 0.61 both back HOME. Under the old
    // `sources.length >= 2` rule this was also CONFIRMS — so the test cannot
    // distinguish old from new here, and is not meant to.
    expect(sourceAgreement([src(0.72), src(0.61)])).toBe<SourceAgreement>("CONFIRMS");
  });

  it("two sources in OPPOSITE directions are SPLIT, never CONFIRMS", () => {
    // THE REGRESSION. poisson says 0.64 HOME, mlb_standings says 0.38 HOME.
    // The source-count rule stamped this "CONFIRMS" and the pick explainer
    // printed that word to a customer.
    expect(sourceAgreement([src(0.64), src(0.38)])).toBe<SourceAgreement>("SPLIT");
  });

  it("three sources, two one way and one the other, are SPLIT", () => {
    expect(sourceAgreement([src(0.7), src(0.66), src(0.31)])).toBe<SourceAgreement>("SPLIT");
  });

  it("three sources all on one side are CONFIRMS", () => {
    expect(sourceAgreement([src(0.55), src(0.62), src(0.71)])).toBe<SourceAgreement>("CONFIRMS");
  });

  it("exactly one opinion is SOLO however many sources were supplied", () => {
    // 0.58 votes HOME; the rest abstain inside the band. One opinion is not
    // cross-checked, so it must not read as corroboration.
    expect(sourceAgreement([src(0.58), src(0.503), src(0.5)])).toBe<SourceAgreement>("SOLO");
  });

  it("a lone source is SOLO", () => {
    expect(sourceAgreement([src(0.64)])).toBe<SourceAgreement>("SOLO");
  });

  it("every source abstaining is SPLIT, not CONFIRMS", () => {
    // The fail-closed direction. "Nobody agreed" must never be recorded as
    // "everybody agreed".
    expect(sourceAgreement([src(0.5), src(0.5)])).toBe<SourceAgreement>("SPLIT");
  });

  it("an empty list is SPLIT, not CONFIRMS", () => {
    expect(sourceAgreement([])).toBe<SourceAgreement>("SPLIT");
  });

  it("ignores sources that declined or produced garbage", () => {
    expect(sourceAgreement([src(null), src(undefined), src(0.7)])).toBe<SourceAgreement>("SOLO");
    expect(sourceAgreement([src(Number.NaN), src(0.7)])).toBe<SourceAgreement>("SOLO");
    expect(sourceAgreement([src(Number.POSITIVE_INFINITY), src(0.7), src(0.6)])).toBe(
      "CONFIRMS",
    );
  });

  it("drops out-of-domain probabilities instead of clamping them", () => {
    // A corrupt 1.4 must NOT be clamped into 1.0, which would manufacture a
    // maximally confident HOME vote out of garbage.
    expect(sourceAgreement([src(1.4), src(1.6)])).toBe<SourceAgreement>("SPLIT");
    expect(sourceAgreement([src(-0.2), src(0.7), src(0.6)])).toBe<SourceAgreement>("CONFIRMS");
    expect(sourceAgreement([src(-0.2), src(0.7), src(0.3)])).toBe<SourceAgreement>("SPLIT");
  });

  it("a read inside the band abstains and one outside it votes", () => {
    // NOT tested at the exact boundary: 0.5 + 0.005 is 0.5050000000000000044 in
    // IEEE-754, so `|p - 0.5| <= 0.005` is false and the read votes. Pick
    // unambiguously-in and unambiguously-out values instead of asserting an
    // exact edge the float cannot hold.
    expect(sourceAgreement([src(0.503), src(0.504), src(0.497)])).toBe<SourceAgreement>("SPLIT");
    expect(sourceAgreement([src(0.507), src(0.6), src(0.8)])).toBe<SourceAgreement>("CONFIRMS");
  });

  it("never invents a side: HOME and AWAY mirrors are treated identically", () => {
    const home = sourceAgreement([src(0.8), src(0.9)]);
    const away = sourceAgreement([src(0.2), src(0.1)]);
    expect(home).toBe(away);
    expect(away).toBe<SourceAgreement>("CONFIRMS");
  });

  it("NON-VACUITY: the old source-count rule gives a different answer", () => {
    // The bug this module fixes, reproduced as a local oracle. If this test
    // ever passes, the fix has stopped changing behaviour and the regression
    // it pins is no longer pinned. `sources.length >= 2` cannot see direction.
    const oldRule = (sources: readonly { homeFairProb?: number | null }[]) =>
      sources.length >= 2 ? "CONFIRMS" : "SOLO";

    const opposed = [src(0.64), src(0.36)];
    expect(oldRule(opposed)).toBe("CONFIRMS"); // the false claim, shown
    expect(sourceAgreement(opposed)).not.toBe(oldRule(opposed));

    const silent = [src(0.64)];
    expect(oldRule(silent)).toBe(sourceAgreement(silent)); // SOLO unchanged
  });
});
