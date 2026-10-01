import { describe, expect, it } from "vitest";
import {
  cropRegion,
  FixtureOCREngine,
  parseScoreBug,
  readScoreBug,
  SCORE_BUG_PRESETS,
} from "./cv-scorebug-ocr.js";

describe("parseScoreBug", () => {
  it("parses a full FOX-style bug", () => {
    const s = parseScoreBug("Q4 2:34 3rd & 7 KC 24 PHI 17");
    expect(s.quarter).toBe(4);
    expect(s.clockSec).toBe(154);
    expect(s.down).toBe(3);
    expect(s.distanceYd).toBe(7);
    expect(s.awayTeam).toBe("KC");
    expect(s.awayScore).toBe(24);
    expect(s.homeTeam).toBe("PHI");
    expect(s.homeScore).toBe(17);
    expect(s.confidence).toBeGreaterThan(0.5);
  });

  it("parses goal-to-go and overtime", () => {
    const s = parseScoreBug("OT 9:12 2nd & Goal SF 20 DAL 20");
    expect(s.quarter).toBe(5);
    expect(s.down).toBe(2);
    expect(s.distanceYd).toBe(0);
  });

  it("finds the yard line trailing the score", () => {
    const s = parseScoreBug("Q2 7:41 1st & 10 KC 14 PHI 10 KC 32");
    expect(s.yardLine).toEqual({ team: "KC", yard: 32 });
    expect(s.down).toBe(1);
    expect(s.distanceYd).toBe(10);
  });

  it("does not mistake the score for the yard line", () => {
    const s = parseScoreBug("Q1 14:02 1st & 10 BUF 7 MIA 0");
    // "BUF 7" is the score; "MIA 0" has yard 0 (invalid) → no yard line.
    expect(s.yardLine).toBeNull();
    expect(s.awayTeam).toBe("BUF");
  });

  it("returns nulls and low confidence on garbage", () => {
    const s = parseScoreBug("~~~ ### ~~~");
    expect(s.quarter).toBeNull();
    expect(s.confidence).toBe(0);
  });
});

describe("cropRegion", () => {
  it("crops fractional regions", () => {
    const frame = [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ];
    const crop = cropRegion(frame, 4, 4, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
    expect(crop).toEqual([
      [6, 7],
      [10, 11],
    ]);
  });
});

describe("readScoreBug", () => {
  it("runs crop → OCR → parse end to end with the fixture engine", async () => {
    const frame = Array.from({ length: 100 }, () =>
      Array.from({ length: 100 }, () => 128),
    );
    const engine = new FixtureOCREngine(["Q3 5:00 2nd & 4 DAL 13 NYG 10"]);
    const s = await readScoreBug(frame, 100, 100, SCORE_BUG_PRESETS.FOX, engine);
    expect(s.quarter).toBe(3);
    expect(s.down).toBe(2);
    expect(s.distanceYd).toBe(4);
  });

  it("exposes one preset per network", () => {
    for (const key of ["CBS", "FOX", "NBC", "ESPN", "PRIME", "NFLN"] as const) {
      const p = SCORE_BUG_PRESETS[key];
      expect(p.region.w).toBeGreaterThan(0);
      expect(p.region.h).toBeGreaterThan(0);
    }
  });
});
