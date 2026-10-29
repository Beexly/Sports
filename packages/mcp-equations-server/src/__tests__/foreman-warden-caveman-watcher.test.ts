import { describe, it, expect } from "vitest";
import {
  evaluateForeman10CheckDeterministicArbiter,
  runFreeTier22WatchCanaryScan,
  evaluateTokenWardenAndCavemanCompression,
  compressPromptCaveman,
  WatchItem,
} from "../foreman-warden-caveman-watcher";

describe("Foreman Arbiter, Token Warden, Caveman & Canary Watcher", () => {
  describe("Stream E2: Foreman 10-Check Deterministic Priority Arbiter (thruwire/foreman)", () => {
    it("fires Priority 1000 ESCALATE_HUMAN whenever human escalation is flagged", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        humanEscalationRequested: true,
        invariantViolation: true,
        loopBounceCount: 4,
        budgetExhausted: true,
        verificationStarted: true,
        verificationCompleted: true,
        verificationPassed: true,
        retryableErrorCount: 0,
        taskWorkCompleted: true,
      });

      expect(arbiter.priority).toBe(1000);
      expect(arbiter.decision).toBe("ESCALATE_HUMAN");
    });

    it("fires Priority 900 ABORT_INVARIANT on invariant violation", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        invariantViolation: true,
        loopBounceCount: 1,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(900);
      expect(arbiter.decision).toBe("ABORT_INVARIANT");
    });

    it("fires Priority 800 BREAK_LOOP_BOUNCE when loop bounce count reaches 3", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 3,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(800);
      expect(arbiter.decision).toBe("BREAK_LOOP_BOUNCE");
    });

    it("fires Priority 700 HALT_BUDGET on budget exhaustion", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        budgetExhausted: true,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(700);
      expect(arbiter.decision).toBe("HALT_BUDGET");
    });

    it("fires Priority 600 REPAIR_FAILED_VERIFICATION when verification completed but failed", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: true,
        verificationCompleted: true,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: true,
      });

      expect(arbiter.priority).toBe(600);
      expect(arbiter.decision).toBe("REPAIR_FAILED_VERIFICATION");
      expect(arbiter.raceConditionBlocked).toBe(false);
    });

    it("ENFORCES EVIDENCE-GATED RACE FIX: blocks premature FINISH with CONTINUE_VERIFY_LOCK at Priority 500", () => {
      // Case A: Task finished work, but verification was never even started
      const unverified = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: true,
      });

      expect(unverified.priority).toBe(500);
      expect(unverified.decision).toBe("CONTINUE_VERIFY_LOCK");
      expect(unverified.raceConditionBlocked).toBe(true);

      // Case B: Task started verification, but verification has not completed
      const inFlightVerification = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: true,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: true,
      });

      expect(inFlightVerification.priority).toBe(500);
      expect(inFlightVerification.decision).toBe("CONTINUE_VERIFY_LOCK");
      expect(inFlightVerification.raceConditionBlocked).toBe(true);
    });

    it("fires Priority 400 RETRY_STEP for transient bounded errors", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 2,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(400);
      expect(arbiter.decision).toBe("RETRY_STEP");
    });

    it("fires Priority 300 DELEGATE_SUBAGENT when awaiting subagent handoff", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        pendingSubagentHandoff: true,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(300);
      expect(arbiter.decision).toBe("DELEGATE_SUBAGENT");
    });

    it("fires Priority 100 FINISH_VERIFIED only when work completed AND fully verified green", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: true,
        verificationCompleted: true,
        verificationPassed: true,
        retryableErrorCount: 0,
        taskWorkCompleted: true,
      });

      expect(arbiter.priority).toBe(100);
      expect(arbiter.decision).toBe("FINISH_VERIFIED");
      expect(arbiter.raceConditionBlocked).toBe(false);
    });

    it("defaults to Priority 0 CONTINUE_WORK when normally executing", () => {
      const arbiter = evaluateForeman10CheckDeterministicArbiter({
        loopBounceCount: 0,
        verificationStarted: false,
        verificationCompleted: false,
        verificationPassed: false,
        retryableErrorCount: 0,
        taskWorkCompleted: false,
      });

      expect(arbiter.priority).toBe(0);
      expect(arbiter.decision).toBe("CONTINUE_WORK");
      expect(arbiter.raceConditionBlocked).toBe(false);
    });
  });

  describe("Stream E3: 22-Watch Free-Tier & Provider Canary Watcher", () => {
    it("monitors 22 watches, detecting hash drift and unhealthy canaries", () => {
      const watches: WatchItem[] = Array.from({ length: 22 }, (_, idx) => {
        const id = `watch-${idx + 1}`;
        const category: "DIRECTORY" | "PROVIDER" | "META" =
          idx < 10 ? "DIRECTORY" : idx < 18 ? "PROVIDER" : "META";

        // Simulate hash change on watch-3 and watch-12
        const previousHash = "hash-v1";
        const currentHash =
          idx === 2 || idx === 11 ? "hash-v2-drift" : "hash-v1";

        // Simulate canary degradation on watch-7
        const canaryHealthy = idx !== 6;
        const canaryLatencyMs = canaryHealthy ? 45 : 3200;

        return {
          id,
          category,
          previousHash,
          currentHash,
          canaryLatencyMs,
          canaryHealthy,
        };
      });

      const scan = runFreeTier22WatchCanaryScan(watches);

      expect(scan.totalWatches).toBe(22);
      expect(scan.changedWatchIds).toEqual(["watch-3", "watch-12"]);
      expect(scan.unhealthyWatchIds).toEqual(["watch-7"]);
      expect(scan.allCanariesHealthy).toBe(false);
    });

    it("reports allCanariesHealthy = true when all providers respond correctly", () => {
      const watches: WatchItem[] = [
        {
          id: "watch-1",
          category: "PROVIDER",
          previousHash: "h1",
          currentHash: "h1",
          canaryLatencyMs: 50,
          canaryHealthy: true,
        },
        {
          id: "watch-2",
          category: "DIRECTORY",
          previousHash: "h2",
          currentHash: "h2",
          canaryLatencyMs: 65,
          canaryHealthy: true,
        },
      ];

      const scan = runFreeTier22WatchCanaryScan(watches);
      expect(scan.totalWatches).toBe(2);
      expect(scan.changedWatchIds).toHaveLength(0);
      expect(scan.unhealthyWatchIds).toHaveLength(0);
      expect(scan.allCanariesHealthy).toBe(true);
    });
  });

  describe("Stream D-1: Token Warden Budget Guard & Caveman Frugal Prompt Compressor", () => {
    it("transitions budget state through OK -> SOFT_ALERT -> HARD_PAUSE -> QUEUE_FREEZE", () => {
      const budget = 100;

      // Spent $50 / $100 = 0.50 -> OK
      const ok = evaluateTokenWardenAndCavemanCompression({
        agentId: "agent-alpha",
        spentUsd: 50,
        budgetUsd: budget,
        rawPrompt: "Test prompt",
        mode: "lite",
      });
      expect(ok.utilizationRatio).toBe(0.5);
      expect(ok.budgetState).toBe("OK");

      // Spent $75 / $100 = 0.75 -> SOFT_ALERT (>= 0.70)
      const soft = evaluateTokenWardenAndCavemanCompression({
        agentId: "agent-alpha",
        spentUsd: 75,
        budgetUsd: budget,
        rawPrompt: "Test prompt",
        mode: "lite",
      });
      expect(soft.utilizationRatio).toBe(0.75);
      expect(soft.budgetState).toBe("SOFT_ALERT");

      // Spent $92 / $100 = 0.92 -> HARD_PAUSE (>= 0.90)
      const hard = evaluateTokenWardenAndCavemanCompression({
        agentId: "agent-alpha",
        spentUsd: 92,
        budgetUsd: budget,
        rawPrompt: "Test prompt",
        mode: "lite",
      });
      expect(hard.utilizationRatio).toBe(0.92);
      expect(hard.budgetState).toBe("HARD_PAUSE");

      // Spent $104 / $100 = 1.04 -> QUEUE_FREEZE (>= 1.00)
      const freeze = evaluateTokenWardenAndCavemanCompression({
        agentId: "agent-alpha",
        spentUsd: 104,
        budgetUsd: budget,
        rawPrompt: "Test prompt",
        mode: "lite",
      });
      expect(freeze.utilizationRatio).toBe(1.04);
      expect(freeze.budgetState).toBe("QUEUE_FREEZE");
    });

    it("compresses polite filler in lite mode while preserving equations and code identifiers", () => {
      const rawPrompt =
        "Hello! Could you please calculate if model_score >= 0.75 and threshold_limit == 100? Thank you very much!";

      const compressed = compressPromptCaveman(rawPrompt, "lite");

      // Courtesies removed
      expect(compressed).not.toMatch(/hello/i);
      expect(compressed).not.toMatch(/could you please/i);
      expect(compressed).not.toMatch(/thank you very much/i);

      // Equations and identifiers preserved
      expect(compressed).toContain("model_score");
      expect(compressed).toContain(">= 0.75");
      expect(compressed).toContain("threshold_limit");
      expect(compressed).toContain("== 100");
    });

    it("strips stop-word articles in full and ultra mode while preserving numbers and expressions", () => {
      const rawPrompt =
        "Please inspect the database and verify that the active_users count is >= 42 and the latency_ms < 15.5. Thank you.";

      const fullCompressed = compressPromptCaveman(rawPrompt, "full");
      expect(fullCompressed).toContain("active_users");
      expect(fullCompressed).toContain(">= 42");
      expect(fullCompressed).toContain("latency_ms");
      expect(fullCompressed).toContain("< 15.5");
      expect(fullCompressed).not.toMatch(/\bthe\b/i);

      const ultraCompressed = compressPromptCaveman(rawPrompt, "ultra");
      expect(ultraCompressed).toContain("active_users");
      expect(ultraCompressed).toContain(">= 42");
      expect(ultraCompressed.length).toBeLessThan(fullCompressed.length + 5);
    });

    it("computes non-zero token savings percentage on compressed prompts", () => {
      const rawPrompt =
        "Hello there! Would you mind to please review the system status and tell me if error_count == 0? Thank you so much!";

      const res = evaluateTokenWardenAndCavemanCompression({
        agentId: "warden-1",
        spentUsd: 15,
        budgetUsd: 100,
        rawPrompt,
        mode: "full",
      });

      expect(res.tokenSavingsEstimatePct).toBeGreaterThan(25);
      expect(res.compressedPrompt).toContain("error_count == 0");
    });
  });
});
