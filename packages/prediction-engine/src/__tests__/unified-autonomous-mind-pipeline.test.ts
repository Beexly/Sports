import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runUnifiedAutonomousMindPipeline } from "../pipeline/unified-autonomous-mind-pipeline";
import { renderPublicBoardOrSocialCard } from "../verification/neuro-symbolic-z3-verifier";

describe("unified autonomous mind pipeline", () => {
  it("emits one signed receipt for the 2026-10-22 replay", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-receipt-"));
    const summary = await runUnifiedAutonomousMindPipeline({
      gameId: "2026-10-22-NE-CHI",
      league: "NFL",
      asOf: new Date("2026-10-22T23:45:00.000Z"),
      checkpointTag: "T-90m",
      outboxDir: dir,
      trainerDir: join(dir, "trainer"),
    });
    expect(summary.spreadPublishState).toBe("PLAY");
    expect(summary.totalPublishState).toBe("PASS");
    expect(summary.attritionOverride.adjustedProjectedTotal).toBeCloseTo(48.5, 1);
    expect(summary.propHookFlags).toEqual(["PASS_KNEELDOWN_HOOK_RISK", "PASS_KNEELDOWN_HOOK_RISK"]);
    expect(summary.totalReceipt.z3SolverStatus).toBe("sat");
    expect(summary.corpusItemsEvaluated).toBeGreaterThanOrEqual(2000);
    expect(summary.mindApplicablePrinciplesCount).toBeGreaterThan(0);
    expect(renderPublicBoardOrSocialCard(summary.totalReceipt)).toContain("OVER 50.5 PASS");
    expect(summary.merkleRootSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
