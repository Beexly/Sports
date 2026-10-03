import { describe, expect, it } from "vitest";
import { toEventTuple, ingestGame } from "./recap-event-tuples-2402.js";

describe("recap event tuples", () => {
  it("normalizes events and converts clock to elapsed seconds", () => {
    const t = toEventTuple({ period: 2, clock: "07:30", team: "KC", event: "Pass Complete", homeScore: 7, awayScore: 3 });
    expect(t.event).toBe("completion");
    expect(t.timeSeconds).toBe(900 - 450);
    expect(t.period).toBe(2);
  });
  it("passes through unknown events lowercased", () => {
    const t = toEventTuple({ period: 1, clock: "15:00", team: "KC", event: "Weird Play", homeScore: 0, awayScore: 0 });
    expect(t.event).toBe("weird play");
  });
  it("handles malformed clocks as 0", () => {
    const t = toEventTuple({ period: 1, clock: "n/a", team: "KC", event: "rush", homeScore: 0, awayScore: 0 });
    expect(t.timeSeconds).toBe(0);
  });
  it("ingests a game preserving order", () => {
    const rows = [
      { period: 1, clock: "14:00", team: "KC", event: "rush", homeScore: 0, awayScore: 0 },
      { period: 1, clock: "13:00", team: "KC", event: "touchdown", homeScore: 7, awayScore: 0 },
    ];
    const ts = ingestGame(rows);
    expect(ts).toHaveLength(2);
    expect(ts[1]?.event).toBe("touchdown");
  });
  it("handles empty input", () => {
    expect(ingestGame([])).toEqual([]);
  });
});

