import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("backfill write tags trueProbBasis", () => {
  it("the persisted independentEdge carries post_settlement_backfill, not prose-only", () => {
    const src = readFileSync(
      join(__dirname, "../backfill-independent-trueprob.ts"),
      "utf8",
    );
    expect(src).toContain('trueProbBasis: "post_settlement_backfill"');
    expect(src).not.toMatch(/trueProbBasis:\s*"as_of_mint"/);
  });
});
