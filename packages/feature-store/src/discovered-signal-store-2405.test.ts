import { describe, expect, it } from "vitest";
import { chunkPlan, chunksForSlice, assembleSlice } from "./discovered-signal-store-2405.js";

const sig = { id: "s1", kind: "matchup_embedding" as const, rows: 10, cols: 4, chunkRows: 4, createdAt: "2024-01-01T00:00:00Z" };

describe("discovered signal store", () => {
  it("plans ceil(rows/chunkRows) chunks with exact ranges", () => {
    const chunks = chunkPlan(sig);
    expect(chunks).toHaveLength(3);
    expect(chunks[2]?.rowStart).toBe(8);
    expect(chunks[2]?.rowEnd).toBe(10);
  });
  it("slice lookup touches only overlapping chunks", () => {
    const chunks = chunkPlan(sig);
    expect(chunksForSlice(chunks, 4, 8).map((c) => c.chunkIndex)).toEqual([1]);
    expect(chunksForSlice(chunks, 3, 9).map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
  });
  it("reassembles a slice exactly", () => {
    const chunks = chunkPlan(sig);
    const payloads = new Map([
      [0, [[1], [2], [3], [4]]],
      [1, [[5], [6], [7], [8]]],
      [2, [[9], [10]]],
    ]);
    expect(assembleSlice(chunks, payloads, 3, 7).map((r) => r[0])).toEqual([4, 5, 6, 7]);
  });
  it("handles empty input", () => {
    expect(chunksForSlice([], 0, 10)).toEqual([]);
    expect(assembleSlice([], new Map(), 0, 10)).toEqual([]);
  });
  it("handles edge inputs", () => {
    // empty slice range touches nothing
    const chunks = chunkPlan(sig);
    expect(chunksForSlice(chunks, 5, 5)).toEqual([]);
    // missing payloads assemble to nothing instead of throwing
    expect(assembleSlice(chunks, new Map(), 0, 10)).toEqual([]);
  });
});

