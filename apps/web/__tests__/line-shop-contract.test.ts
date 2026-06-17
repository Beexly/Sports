import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Line shop — honesty contract (source-level).
 *
 * The board must render only from real captured odds (multi-book gate, honest
 * empty state) and frame itself as transparency, never an arbitrage prompt.
 */
const repoRoot = resolve(__dirname, "..");
const loader = readFileSync(resolve(repoRoot, "lib/market/load-line-shop-board.ts"), "utf8");
const board = readFileSync(resolve(repoRoot, "components/observatory/line-shop-board.tsx"), "utf8");

describe("line shop contract", () => {
  it("gates on a real multi-book quote (>= 2 books)", () => {
    expect(loader).toMatch(/bookCount\s*<\s*2/);
  });

  it("renders an honest empty state instead of inventing a price", () => {
    expect(board).toMatch(/Awaiting quotes|stays\s+empty/);
    expect(board).toMatch(/data-testid="line-shop-board"/);
  });

  it("frames itself as transparency, not an arbitrage prompt", () => {
    expect(board).toMatch(/not a pick/i);
    expect(board).toMatch(/bet both/i); // "...not a prompt to bet both sides."
  });
});
