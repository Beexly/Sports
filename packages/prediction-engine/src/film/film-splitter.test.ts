import { describe, expect, it } from "vitest";
import { splitFilm } from "./film-splitter.js";

describe("film splitter wrapper", () => {
  it("rejects an empty reference without spawning work", async () => {
    await expect(splitFilm("")).resolves.toEqual([]);
  });
});
