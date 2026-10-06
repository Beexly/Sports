import { describe, expect, it } from "vitest";
import {
  RuleBasedFormationClassifier,
  type SetPlayer,
} from "./cv-formation-classify.js";
import { METERS_PER_YARD, type SnapContext } from "./cv-field-model.js";

const CTX: SnapContext = { losXM: 50, losYM: 24.4, attackDir: 1 };

/** Place a player at (downfieldYd, lateralYd) in the offense frame. */
function at(
  id: string,
  downfieldYd: number,
  lateralYd: number,
): SetPlayer {
  return {
    trackletId: id,
    xM: CTX.losXM + downfieldYd * METERS_PER_YARD * CTX.attackDir,
    yM: CTX.losYM + lateralYd * METERS_PER_YARD,
  };
}

const OL = (n: number, startId: number): SetPlayer[] =>
  [-2, -1, 0, 1, 2]
    .slice(0, n)
    .map((l, i) => at(`ol${startId + i}`, 0, l));

describe("RuleBasedFormationClassifier", () => {
  const clf = new RuleBasedFormationClassifier();

  it("reads 11-personnel shotgun trips-right", () => {
    const offense = [
      at("qb", -5.5, 0),
      at("rb", -3, 2),
      at("te", 0, 3),
      at("wr1", 0, 10),
      at("wr2", 4, 11),
      at("wr3", 8, 9),
      at("wr4", 0, -11),
      ...OL(4, 0),
    ];
    const f = clf.classify(offense, CTX);
    expect(f.backfield).toBe("shotgun");
    expect(f.personnel).toBe("11");
    expect(f.distribution).toBe("trips-right");
    expect(f.confidence).toBeGreaterThan(0.6);
  });

  it("reads under-center I-form as 21 personnel", () => {
    const offense = [
      at("qb", -0.8, 0),
      at("fb", -2.5, 0.5),
      at("rb", -4.5, -0.5),
      at("te", 0, 3),
      at("wr1", 0, 11),
      at("wr2", 0, -11),
      ...OL(5, 0),
    ];
    const f = clf.classify(offense, CTX);
    expect(f.backfield).toBe("under-center");
    expect(f.personnel).toBe("21");
    expect(f.rbCount).toBe(2);
  });

  it("reads empty 5-wide", () => {
    const offense = [
      at("qb", -5.5, 0),
      at("wr1", 0, -12),
      at("wr2", 1, -9),
      at("wr3", 0, -6.5),
      at("wr4", 0, 8),
      at("wr5", 2, 11),
      ...OL(5, 0),
    ];
    const f = clf.classify(offense, CTX);
    expect(f.backfield).toBe("empty");
    expect(f.empty).toBe(true);
    expect(f.distribution).toBe("empty-5wide");
  });

  it("reads pistol depth", () => {
    const offense = [at("qb", -3.5, 0), at("rb", -2, 2), ...OL(5, 0)];
    const f = clf.classify(offense, CTX);
    expect(f.backfield).toBe("pistol");
  });

  it("detects bunch", () => {
    const offense = [
      at("qb", -5.5, 0),
      at("rb", -3, -2),
      at("wr1", 1, 8),
      at("wr2", 1.5, 9.5),
      at("wr3", 0.5, 10.5),
      at("wr4", 0, -11),
      ...OL(5, 0),
    ];
    const f = clf.classify(offense, CTX);
    expect(f.distribution).toBe("bunch-right");
  });

  it("admits uncertainty with too few players", () => {
    const f = clf.classify([at("qb", -5.5, 0)], CTX);
    expect(f.distribution).toBe("unknown");
    expect(f.confidence).toBeLessThan(0.5);
  });
});
