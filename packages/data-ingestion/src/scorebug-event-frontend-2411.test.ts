import { describe, expect, it } from "vitest";
import {
  detectChangedFrames,
  diffReadsToEvents,
  frameDifference,
  parseScorebugRead,
  readChangedFrames,
  type GrayFrame,
  type ScorebugRegion,
} from "./scorebug-event-frontend-2411.js";

const region: ScorebugRegion = { x0: 0, y0: 0, x1: 4, y1: 2 };

function frame(fill: number, changedPixel?: [number, number, number]): GrayFrame {
  const f: GrayFrame = [];
  for (let y = 0; y < 2; y++) {
    const row: number[] = [];
    for (let x = 0; x < 4; x++) row.push(fill);
    f.push(row);
  }
  if (changedPixel) {
    const [x, y, v] = changedPixel;
    (f[y] as number[])[x] = v;
  }
  return f;
}

describe("scorebug event frontend", () => {
  it("frameDifference is zero for identical frames", () => {
    expect(frameDifference(frame(10), frame(10), region)).toBe(0);
  });

  it("frameDifference scales with changed pixels", () => {
    const d = frameDifference(frame(10), frame(10, [0, 0, 110]), region);
    expect(d).toBeCloseTo(100 / 8, 9); // one pixel differs by 100 over 8 pixels
  });

  it("detectChangedFrames only flags changed frames", () => {
    const frames = [frame(10), frame(10), frame(10, [1, 1, 200]), frame(10, [1, 1, 200])];
    expect(detectChangedFrames(frames, region, 1)).toEqual([0, 2]);
  });

  it("readChangedFrames OCRs only the changed frames", () => {
    const frames = [frame(10), frame(10), frame(10, [0, 0, 200])];
    let calls = 0;
    const reads = readChangedFrames(frames, region, 1, () => {
      calls++;
      return calls === 1 ? "Q1 15:00" : "Q1 14:52";
    });
    expect(calls).toBe(2);
    expect(reads.map((r) => r.frameIndex)).toEqual([0, 2]);
  });

  it("parseScorebugRead extracts quarter, clock, down, distance", () => {
    expect(parseScorebugRead("Q2 3:42 3rd & 7")).toEqual({
      quarter: "2",
      clock: "3:42",
      down: 3,
      distance: 7,
    });
    expect(parseScorebugRead("Q4 0:08")).toEqual({ quarter: "4", clock: "0:08", down: null, distance: null });
  });

  it("diffReadsToEvents emits only on field changes", () => {
    const events = diffReadsToEvents([
      { frameIndex: 0, text: "Q1 15:00" },
      { frameIndex: 5, text: "Q1 15:00" }, // duplicate -> no event
      { frameIndex: 9, text: "Q1 14:52 1st & 10" },
      { frameIndex: 12, text: "garbage!!!" }, // unparseable -> skipped
      { frameIndex: 15, text: "Q2 14:52 1st & 10" },
    ]);
    expect(events.map((e) => e.frameIndex)).toEqual([0, 9, 15]);
    expect(events[2]?.changed).toContain("quarter");
    expect(events[1]?.changed).toEqual(expect.arrayContaining(["clock", "down", "distance"]));
  });

  it("handles empty and malformed input", () => {
    expect(detectChangedFrames([], region, 1)).toEqual([]);
    expect(Number.isNaN(frameDifference(frame(10), frame(10), { x0: 9, y0: 9, x1: 9, y1: 9 }))).toBe(true);
    expect(diffReadsToEvents([])).toEqual([]);
    expect(parseScorebugRead("")).toEqual({ quarter: null, clock: null, down: null, distance: null });
  });
});
