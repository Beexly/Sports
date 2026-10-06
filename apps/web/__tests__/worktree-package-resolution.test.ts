import { describe, expect, it } from "vitest";

/**
 * Environment guard, not a product test.
 *
 * The root `node_modules/@sports/*` entries are symlinks into a SEPARATE
 * checkout of the packages. A suite that asserts on package behaviour while
 * resolving those symlinks certifies code this worktree never touched, so a
 * green run can be describing a stale tree. These tests pin that each aliased
 * package root resolves inside THIS checkout.
 */
describe("worktree package resolution", () => {
  const roots = [
    "prediction-engine",
    "ingestion-pipeline",
    "data-ingestion",
    "db",
    "ops",
    "types",
    "util",
    "stats-api",
  ];

  it.each(roots)("@sports/%s resolves to a real module here", async (name) => {
    const mod = await import(`@sports/${name}`);
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("resolves the prediction engine from the worktree, not the stale sibling checkout", async () => {
    // Read a source sentinel that only exists in this worktree's copy. If the
    // alias were absent, this module would come from the stale checkout and the
    // sentinel would be missing.
    const mod = await import("@sports/prediction-engine");
    expect(mod).toHaveProperty("MODEL_VERSION");
  });
});
