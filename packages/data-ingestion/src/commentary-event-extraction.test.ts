/**
 * Tests for ./commentary-event-extraction (arXiv:2307.10303, lane=nlp).
 *
 * ACCEPTANCE GATE: ADOPT the availability classifier if: F1 >= 0.80 on 2024-season beat-writer sentences AND the
 * classifier's P(miss) signal, backtested as a line-move predictor, anticipates official injury-
 * report designation changes >= 30 minutes ahead of the market move in >= 55% of cases (n >= 50
 * cases); REJECT if F1 < 0.70 or the lead-time test fails.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./commentary-event-extraction";

describe("commentary event extraction (arXiv:2307.10303)", () => {
  it("spots events", () => {
    expect(mod.spotEvent("Mahomes throws a TOUCHDOWN pass!")).toBe("touchdown");
    expect(mod.spotEvent("FUMBLE recovered by the defense")).toBe("turnover");
    expect(mod.spotEvent("sacked for a loss of 8")).toBe("sack");
    expect(mod.spotEvent("beautiful weather today")).toBe("other");
    expect(mod.spotEvent(42 as never)).toBe("other");
  });
  it("tags a feed", () => {
    const lines = [
      { lineId: "1", gameId: "g", tSec: 100, text: "touchdown chiefs" },
      { lineId: "2", gameId: "g", tSec: 200, text: "punt" },
      null,
    ];
    const t = mod.tagFeed(lines);
    expect(t).toHaveLength(2);
    expect(t[0]!.event).toBe("touchdown");
    expect(t[1]!.event).toBe("other");
  });
  it("aligns to plays", () => {
    const a = mod.alignToPlays([{ tSec: 100, event: "touchdown" }], [95, 500], 30);
    expect(a[0]!.playT).toBe(95);
    const b = mod.alignToPlays([{ tSec: 100, event: "touchdown" }], [500], 30);
    expect(b[0]!.playT).toBeNull();
    expect(mod.alignToPlays([{ tSec: 100, event: "touchdown" }], [95], -1)).toEqual([]);
  });
  it("isCommentaryLine rejects malformed", () => {
    expect(mod.isCommentaryLine({ lineId: "1" })).toBe(false);
  });
});
