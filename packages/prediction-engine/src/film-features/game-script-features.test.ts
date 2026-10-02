import { describe, expect, it } from "vitest";
import {
  extractGameScript,
  fieldZone,
} from "./game-script-features.js";
import { makePlay } from "./film-fixtures.js";

describe("fieldZone", () => {
  it("classifies redzone / midfield / own-territory", () => {
    expect(fieldZone(85)).toBe("redzone");
    expect(fieldZone(80)).toBe("redzone");
    expect(fieldZone(60)).toBe("midfield");
    expect(fieldZone(49)).toBe("own-territory");
    expect(fieldZone(null)).toBeNull();
  });
});

describe("extractGameScript", () => {
  it("extracts the full game-script vector", () => {
    const play = makePlay({
      qtr: 4,
      clockSec: 90,
      scoreDiff: -4,
      down: 3,
      distanceYd: 7,
      yardLineOwn: 65,
    });
    const gs = extractGameScript(play);
    expect(gs.quarter).toBe(4);
    expect(gs.clockSec).toBe(90);
    expect(gs.scoreDiff).toBe(-4);
    expect(gs.fieldZone).toBe("midfield");
    expect(gs.twoMinute).toBe(true);
    expect(gs.lateDown).toBe(true);
    expect(gs.goalToGo).toBe(false);
    expect(gs.provenance.source).toBe("film");
    expect(gs.provenance.weight).toBe(0);
  });

  it("detects goal-to-go", () => {
    const play = makePlay({ yardLineOwn: 95, distanceYd: 5 });
    expect(extractGameScript(play).goalToGo).toBe(true);
    expect(extractGameScript(play).fieldZone).toBe("redzone");
  });

  it("twoMinute is false outside Q2/Q4", () => {
    const play = makePlay({ qtr: 3, clockSec: 60 });
    expect(extractGameScript(play).twoMinute).toBe(false);
  });

  it("degrades gracefully when scorebug fields are null", () => {
    const play = makePlay({
      qtr: null,
      clockSec: null,
      yardLineOwn: null,
      down: null,
      distanceYd: null,
      scoreDiff: null,
    });
    const gs = extractGameScript(play);
    expect(gs.fieldZone).toBeNull();
    expect(gs.twoMinute).toBeNull();
    expect(gs.goalToGo).toBeNull();
    expect(gs.lateDown).toBeNull();
  });
});
