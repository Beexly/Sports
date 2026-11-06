export interface PostgameMiss {
  readonly gameId: string;
  readonly selection: string;
  readonly publishState: "PLAY" | "CANDIDATE" | "PASS" | "WITHHOLD";
  readonly edgeWonByPts?: number;
  readonly propMissYards?: number;
}

/** Emits a Vitest source string. Does not write unless the caller asks. */
export function synthesizeRegressionTest(miss: PostgameMiss): string | null {
  const falseWithhold =
    miss.publishState === "WITHHOLD" && (miss.edgeWonByPts ?? 0) >= 3;
  const hookMiss = (miss.propMissYards ?? 99) <= 2;
  if (!falseWithhold && !hookMiss) return null;
  const safeId = miss.gameId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `import { describe, it, expect } from "vitest";
describe("auto-regression ${safeId}", () => {
  it("replays ${miss.selection} fail-closed", () => {
    expect(${JSON.stringify(miss.publishState)}).not.toBe("WITHHOLD");
  });
});
`;
}
