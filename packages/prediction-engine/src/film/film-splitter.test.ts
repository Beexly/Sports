import { describe, expect, it } from "vitest";
import {
  createFilmSplitter,
  parsePlaySegmentList,
  parsePlaySegmentRow,
  type FilmSplitterBackend,
  type PlaySegment,
} from "./film-splitter";
import { FilmBackendUnavailableError } from "./highlight-detector";

const VALID_SEGMENTS: PlaySegment[] = [
  { playIndex: 0, tStart: 10, tEnd: 20 },
  { playIndex: 1, tStart: 20, tEnd: 30 },
  { playIndex: 2, tStart: 30, tEnd: 40 },
];

function stubBackend(rows: unknown, available = true): FilmSplitterBackend {
  return {
    isAvailable: () => available,
    splitPlays: async () => rows,
  };
}

describe("film-splitter shape validation", () => {
  it("parsePlaySegmentRow accepts a well-formed row", () => {
    const row = parsePlaySegmentRow(VALID_SEGMENTS[0]);
    expect(row).not.toBeNull();
    expect(row?.playIndex).toBe(0);
    expect(row?.tEnd).toBeGreaterThan(row?.tStart ?? 0);
  });

  it("parsePlaySegmentRow rejects malformed rows", () => {
    expect(parsePlaySegmentRow(null)).toBeNull();
    expect(parsePlaySegmentRow({})).toBeNull();
    expect(parsePlaySegmentRow({ playIndex: 0, tStart: 2, tEnd: 1 })).toBeNull();
    expect(parsePlaySegmentRow({ playIndex: -1, tStart: 1, tEnd: 2 })).toBeNull();
    expect(parsePlaySegmentRow({ playIndex: 0.5, tStart: 1, tEnd: 2 })).toBeNull();
    expect(parsePlaySegmentRow({ playIndex: 0, tStart: NaN, tEnd: 2 })).toBeNull();
    expect(parsePlaySegmentRow({ playIndex: 0, tStart: 1 })).toBeNull();
  });

  it("parsePlaySegmentList rejects non-lists, bad rows, and broken indices", () => {
    expect(parsePlaySegmentList(VALID_SEGMENTS)).toEqual(VALID_SEGMENTS);
    expect(parsePlaySegmentList([])).toEqual([]);
    expect(parsePlaySegmentList({ segments: VALID_SEGMENTS })).toBeNull();
    expect(parsePlaySegmentList([...VALID_SEGMENTS, { bogus: true }])).toBeNull();
    // Indices must be contiguous 0-based.
    expect(
      parsePlaySegmentList([
        { playIndex: 1, tStart: 1, tEnd: 2 },
        { playIndex: 2, tStart: 2, tEnd: 3 },
      ]),
    ).toBeNull();
    // Time order must be non-decreasing.
    expect(
      parsePlaySegmentList([
        { playIndex: 0, tStart: 10, tEnd: 12 },
        { playIndex: 1, tStart: 5, tEnd: 8 },
      ]),
    ).toBeNull();
  });

  it("splitPlays returns the validated public shape", async () => {
    const splitter = createFilmSplitter({ backend: stubBackend(VALID_SEGMENTS) });
    const segments = await splitter.splitPlays("game.mp4");
    expect(segments).toEqual(VALID_SEGMENTS);
    expect(segments.map((s) => s.playIndex)).toEqual([0, 1, 2]);
    for (const s of segments) {
      expect(s.tEnd).toBeGreaterThan(s.tStart);
    }
  });
});

describe("film-splitter fail-closed", () => {
  it("throws when the backend reports unavailable — no fabricated segments", async () => {
    const splitter = createFilmSplitter({
      backend: stubBackend(VALID_SEGMENTS, /* available */ false),
    });
    await expect(splitter.splitPlays("game.mp4")).rejects.toBeInstanceOf(
      FilmBackendUnavailableError,
    );
    await expect(splitter.splitPlays("game.mp4")).rejects.toThrow(/not available/i);
  });

  it("throws when no backend and no baseUrl are configured", async () => {
    const splitter = createFilmSplitter();
    await expect(splitter.splitPlays("game.mp4")).rejects.toBeInstanceOf(
      FilmBackendUnavailableError,
    );
  });

  it("throws on malformed backend payload instead of returning junk", async () => {
    const splitter = createFilmSplitter({
      backend: stubBackend([{ playIndex: 0, tStart: 1, tEnd: 2 }, { playIndex: 9, tStart: 3, tEnd: 4 }]),
    });
    await expect(splitter.splitPlays("game.mp4")).rejects.toThrow(/malformed/i);
  });

  it("wraps backend exceptions as FilmBackendUnavailableError", async () => {
    const splitter = createFilmSplitter({
      backend: {
        isAvailable: () => true,
        splitPlays: async () => {
          throw new Error("ffmpeg missing");
        },
      },
    });
    await expect(splitter.splitPlays("game.mp4")).rejects.toThrow(/ffmpeg missing/);
  });

  it("a successful empty observation is [] — distinct from a failure", async () => {
    const splitter = createFilmSplitter({ backend: stubBackend([]) });
    await expect(splitter.splitPlays("sideline.mp4")).resolves.toEqual([]);
  });
});
