import { describe, expect, it } from "vitest";
import { curateSegments, extractionWeight, usableFraction, DEFAULT_CURATION } from "./commentary-curation-2405.js";

const segs = [
  { gameId: "g1", start: 0, end: 10, text: "hello", language: "en", confidence: 0.9 },
  { gameId: "g1", start: 10, end: 20, text: "hola", language: "es", confidence: 0.8 },
  { gameId: "g1", start: 20, end: 30, text: "noise", language: "en", confidence: 0.2 },
];

describe("commentary curation", () => {
  it("drops low-confidence segments and counts translations", () => {
    const r = curateSegments(segs);
    expect(r.kept).toHaveLength(2);
    expect(r.dropped).toBe(1);
    expect(r.translated).toBe(1);
  });
  it("uses whisper-large-v3 with a 0.5 floor by default", () => {
    expect(DEFAULT_CURATION.model).toBe("whisper-large-v3");
    expect(DEFAULT_CURATION.confidenceFloor).toBe(0.5);
  });
  it("extraction weights are clamped to [0,1]", () => {
    expect(extractionWeight(1.5)).toBe(1);
    expect(extractionWeight(-0.2)).toBe(0);
    expect(extractionWeight(0.7)).toBeCloseTo(0.7, 10);
  });
  it("usable fraction degrades with WER", () => {
    expect(usableFraction(0.5)).toBeCloseTo(0.5, 10);
    expect(usableFraction(0)).toBe(1);
  });
  it("handles empty input", () => {
    const r = curateSegments([]);
    expect(r.kept).toEqual([]);
    expect(r.dropped).toBe(0);
    expect(r.translated).toBe(0);
  });
  it("handles edge inputs", () => {
    // confidence exactly at the floor is kept
    const atFloor = curateSegments([{ gameId: "g", start: 0, end: 1, text: "x", language: "en", confidence: 0.5 }]);
    expect(atFloor.kept).toHaveLength(1);
    // WER beyond [0,1] clamps
    expect(usableFraction(2)).toBe(0);
    expect(usableFraction(-0.3)).toBe(1);
    // empty-text segment still curates on confidence alone
    const emptyText = curateSegments([{ gameId: "g", start: 0, end: 1, text: "", language: "en", confidence: 0.9 }]);
    expect(emptyText.kept).toHaveLength(1);
  });
});

