import { describe, expect, it } from "vitest";
import { buildFalsifiers } from "../scoring";

const CLEAN = { uncertaintyPenalty: 0, dispersionScore: 0, lineMovementScore: 0, injuryScore: 0 };

describe("buildFalsifiers", () => {
  it("emits nothing for a clean read — no generic hedge", () => {
    expect(buildFalsifiers(CLEAN)).toEqual([]);
  });

  it("fires on movement against us", () => {
    expect(buildFalsifiers({ ...CLEAN, lineMovementScore: -8 })).toContain(
      "the line keeps moving against us",
    );
  });

  it("fires on market dispersion", () => {
    expect(buildFalsifiers({ ...CLEAN, dispersionScore: -4 })).toContain(
      "the books tighten toward the far side",
    );
  });

  it("fires on conflicting signals", () => {
    expect(buildFalsifiers({ ...CLEAN, uncertaintyPenalty: -5 })).toContain(
      "the conflicting signals resolve against us",
    );
  });

  it("fires on worsening availability", () => {
    expect(buildFalsifiers({ ...CLEAN, injuryScore: -2 })).toContain(
      "the availability picture worsens before kickoff",
    );
  });

  it("caps at two so the sentence stays a claim rather than a hedge", () => {
    const all = buildFalsifiers({
      uncertaintyPenalty: -5,
      dispersionScore: -4,
      lineMovementScore: -9,
      injuryScore: -3,
    });
    expect(all).toHaveLength(2);
  });

  it("orders movement first as the most observable failure", () => {
    const both = buildFalsifiers({ ...CLEAN, lineMovementScore: -9, injuryScore: -3 });
    expect(both[0]).toBe("the line keeps moving against us");
  });

  it("ignores favourable values", () => {
    expect(
      buildFalsifiers({
        uncertaintyPenalty: 2,
        dispersionScore: 1,
        lineMovementScore: 9,
        injuryScore: 2,
      }),
    ).toEqual([]);
  });

  it("respects the threshold boundaries", () => {
    expect(buildFalsifiers({ ...CLEAN, lineMovementScore: -5 })).toEqual([]);
    expect(buildFalsifiers({ ...CLEAN, lineMovementScore: -6 })).toHaveLength(1);
  });
});
