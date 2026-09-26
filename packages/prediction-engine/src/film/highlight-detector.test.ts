import { describe, expect, it } from "vitest";
import { detectHighlights } from "./highlight-detector.js";

describe("highlight detector wrapper", () => {
  it("rejects an empty reference without spawning work", async () => {
    await expect(detectHighlights("")).resolves.toEqual([]);
  });
});
