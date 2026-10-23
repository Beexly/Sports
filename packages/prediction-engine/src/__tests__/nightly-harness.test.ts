import { describe, expect, it } from "vitest";
import { runUnifiedAutonomousMindPipeline } from "../pipeline/unified-autonomous-mind-pipeline";
import { assertPinnedReplay } from "../pipeline/pinned-replay";

describe("nightly harness", () => {
  it("reproduces the pinned 2026-10-22 z3 receipt", async () => {
    const summary = await runUnifiedAutonomousMindPipeline({
      gameId: "2026-10-22-NE-CHI",
      league: "NFL",
      asOf: new Date("2026-10-22T23:45:00.000Z"),
    });
    expect(() => assertPinnedReplay(summary)).not.toThrow();
  });
});
