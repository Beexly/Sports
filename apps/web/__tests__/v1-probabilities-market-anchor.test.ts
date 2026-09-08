import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * C-257 (Devin). The v1 probabilities surface read only the TOP-LEVEL
 * `factorBreakdown.marketFairProb`. A signal-slate pick keeps that null and
 * carries its de-vigged anchor inside `independentEdge` (C-253), so B2B callers
 * received null for a price we hold.
 *
 * Asserted at the source rather than by invoking the route: the handler needs a
 * database, an API key and a rate limiter, and the claim under test is which
 * field it reads. Comments are stripped first, per the C-241 lesson that a
 * docblock describing the right thing passes an assertion the code fails.
 */
const SRC = readFileSync(
  resolve(__dirname, "../app/api/v1/probabilities/route.ts"),
  "utf8",
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((l) => !l.trim().startsWith("//"))
  .join("\n");

describe("v1 probabilities exposes the anchor a signal pick actually carries", () => {
  it("falls back to the nested independentEdge anchor", () => {
    expect(CODE).toMatch(/fb\["independentEdge"\]/);
    expect(CODE).toMatch(/nested\["marketFairProb"\]/);
  });

  it("prefers the board-priced top-level field and never overrides it", () => {
    // The nested read is guarded on marketFairProb being still null, so a
    // board-priced pick keeps the value its own path produced.
    expect(CODE).toMatch(/if \(marketFairProb == null && ie !== null && typeof ie === "object"\)/);
  });

  it("carries provenance, so one stored book cannot read as the two-book floor", () => {
    for (const field of ["marketFairSource", "marketBookCount"]) {
      expect(CODE).toContain(`${field},`);
      expect(CODE).toMatch(new RegExp(`let ${field}`));
    }
  });

  it("sets provenance ONLY on the nested path, never beside a board-priced value", () => {
    // marketFairSource is assigned inside the nested block. If it were assigned
    // at the top level too, a board-priced row would carry a source describing
    // a lookup that did not happen.
    const nestedBlock = CODE.slice(CODE.indexOf('fb["independentEdge"]'));
    expect(nestedBlock).toMatch(/marketFairSource = src\.trim\(\)/);
    const beforeNested = CODE.slice(0, CODE.indexOf('fb["independentEdge"]'));
    expect(beforeNested).not.toMatch(/marketFairSource = /);
  });

  it("says in the response contract what a single-book anchor means", () => {
    expect(SRC).toContain("market_p_single_book");
    expect(SRC).toContain("below the two-book floor");
  });

  it("still returns through jsonNoStore", () => {
    expect(CODE).toMatch(/return jsonNoStore\(\{/);
  });
});
