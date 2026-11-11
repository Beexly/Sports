import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import evidence from "../../research/research-evidence.json";
import { loadRegistry } from "../../research/registry.js";
import { resolveProjectionWiring } from "../../research/projection-params.js";
import { checkDimension, SLOT_DIMENSIONS } from "../../research/dimensions.js";
import { DEFAULT_PROJECTION_PARAMETERS } from "../../player-projection.js";

/**
 * Reports what the engine ACTUALLY resolves from the shipped evidence file, and which
 * pieces of that evidence the dimension gate refused. This is the calibration record:
 * a slot that ends up at its default because nothing valid spoke to it is a fact worth
 * asserting, not a silent no-op.
 */
describe("shipped evidence resolution", () => {
  const rows = evidence as unknown as Parameters<typeof loadRegistry>[0];
  const registry = loadRegistry(rows);

  it("loads the shipped evidence file", () => {
    expect(registry.length).toBeGreaterThan(0);
  });

  it("reports resolved slots and refused values", () => {
    const wired = resolveProjectionWiring(registry, 0.5);
    const refused: Array<{ slot: string; value: number; why: string }> = [];
    for (const e of registry) {
      for (const p of e.parameters) {
        const v = checkDimension(p.name, p.value);
        if (!v.accepted) refused.push({ slot: p.name, value: p.value, why: v.reason ?? "" });
      }
    }
    const report = {
      resolved: {
        regressionGames: wired.parameters.regressionGames,
        regressionGamesDefault: DEFAULT_PROJECTION_PARAMETERS.regressionGames,
        leaguePriorPpr: wired.parameters.leaguePriorPpr,
        leaguePriorPprDefault: DEFAULT_PROJECTION_PARAMETERS.leaguePriorPpr,
        source: wired.parameters.source,
        contributors: wired.contributors,
        moved: wired.moved,
      },
      refused,
      slotDimensions: SLOT_DIMENSIONS,
    };
    writeFileSync("research-resolution-report.json", JSON.stringify(report, null, 2));

    // the resolved values must always sit inside their declared dimensions
    for (const [slot, value] of [
      ["regression_games", wired.parameters.regressionGames],
      ["league_prior_ppr", wired.parameters.leaguePriorPpr],
    ] as const) {
      expect(checkDimension(slot, value).accepted).toBe(true);
    }
  });
});
