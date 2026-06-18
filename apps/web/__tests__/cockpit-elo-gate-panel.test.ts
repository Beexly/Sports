import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The cockpit calibration page surfaces the Elo-vs-market "gate decision"
 * panel — the operator's read on whether the results-only Elo beats the
 * de-vigged closing line before they flip INDEPENDENT_EDGE_ENABLED.
 *
 * Source-level guard (the page is an async server component that hits the DB):
 *   - it actually loads the Elo-vs-market backtest,
 *   - it shows the betterCalibrated verdict and an explicit, honest flip
 *     recommendation,
 *   - it never implies the edge is priced into confidence (surfaced only),
 *   - the empty path points the operator at the historical-games backfill.
 */

const src = readFileSync(
  resolve(__dirname, "..", "app", "cockpit", "calibration", "page.tsx"),
  "utf8"
);

describe("cockpit calibration — Elo gate-decision panel", () => {
  it("loads the Elo-vs-market backtest", () => {
    expect(src).toMatch(
      /import\s+\{[^}]*loadEloVsMarketBacktest[^}]*\}\s+from\s+["']@\/lib\/calibration\/elo-backtest["']/
    );
    expect(src).toMatch(/loadEloVsMarketBacktest\(\)/);
  });

  it("renders the gate-decision panel with the betterCalibrated verdict", () => {
    expect(src).toMatch(/Elo independent signal/i);
    expect(src).toMatch(/betterCalibrated/);
    expect(src).toMatch(/Elo Brier/);
    expect(src).toMatch(/Market Brier/);
  });

  it("gives an explicit, honest flip recommendation tied to the env flag", () => {
    expect(src).toContain("INDEPENDENT_EDGE_ENABLED");
    // surfaced-only discipline: pricing-in requires the CLV check, not just a flip
    expect(src).toMatch(/CLV beat-rate|beats the close/i);
  });

  it("routes the empty state to the historical-games backfill", () => {
    expect(src).toMatch(/no-data/);
    expect(src).toMatch(/backfill-historical-games/);
  });

  it("never claims the Elo edge already moves confidence", () => {
    // The page must keep the surfaced-not-priced framing.
    expect(src).toMatch(/weight 0|does not move|not yet priced|surface-only/i);
  });
});
