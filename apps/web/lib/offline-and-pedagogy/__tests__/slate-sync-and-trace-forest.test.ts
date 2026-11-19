import { describe, expect, it } from "vitest";
import {
  buildDeepTutorTraceForest,
  evaluateOnboardingCurriculumChallenge,
  reconcileOfflineSlateCache,
} from "../slate-sync-and-trace-forest";

describe("offline slate sync, DeepTutor trace forest & curriculum challenge", () => {
  it("reconciles offline snapshots monotonically by version and detects digest conflicts", () => {
    const verdict = reconcileOfflineSlateCache(
      {
        slateKey: "2026_w10_main",
        version: 4,
        updatedAtIso: "2026-11-16T05:00:00.000Z",
        packetSha256: "aaa111",
      },
      {
        slateKey: "2026_w10_main",
        version: 5,
        updatedAtIso: "2026-11-16T05:10:00.000Z",
        packetSha256: "bbb222",
      },
    );
    expect(verdict.winner).toBe("REMOTE");
    expect(verdict.conflictDetected).toBe(true);
    expect(verdict.resolved.version).toBe(5);
  });

  it("builds a jargon-free Trace Forest curriculum and evaluates onboarding checks", () => {
    const nodes = buildDeepTutorTraceForest();
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    for (const node of nodes) {
      expect(node.plainEnglishSummary).not.toMatch(/Sinkhorn|Cholesky|tau_hat/i);
    }

    const res = evaluateOnboardingCurriculumChallenge(
      {
        id: "stage0-truth-check",
        requiredPatterns: ["build_live_stage0_truth", "OUT_INACTIVE"],
        forbiddenPatterns: ["do not buy today", "OTHER_TEAM_"],
      },
      "Run build_live_stage0_truth first and verify OUT_INACTIVE players stay excluded.",
    );
    expect(res.passed).toBe(true);
    expect(res.missing).toEqual([]);
    expect(res.forbiddenHits).toEqual([]);
  });
});
