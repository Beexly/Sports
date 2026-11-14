import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  computeTebAvalancheBraidOverlay,
  DS3_THEORETICAL_MAGIC_M2_BASELINE,
  type TebAvalancheBraidInput,
} from "../nfl/teb-avalanche-braid-overlay.js";
import {
  runMasterSituationalReasoningOverlay,
  PreflightRosterGateError,
} from "../nfl/master-situational-reasoning-aggregator.js";

/**
 * The Stage 0 gate is deliberately fail-closed on wall-clock freshness, but this
 * suite drives it through a committed fixture config whose `as_of` ages out every
 * `max_age_days`. Pinning the clock to that fixture's date keeps the integration
 * test honest about NAME blocking instead of turning green or red on the calendar
 * -- and, before this, red on staleness made all three `toThrow` cases vacuous:
 * each passed for the freshness error without ever exercising the name gate.
 */
const CONFIG_NOW = new Date("2026-11-07T12:00:00Z");

describe("GSE/GSI Sovereign v4.0 TEB, Failed-Avalanche & D(S3) Braiding Overlay", () => {
  it("verifies anchored NFL pocket (FAILED_AVALANCHE_POCKET_ANCHORED) with Lawrence/JAX profile", () => {
    const anchoredInput: TebAvalancheBraidInput = {
      olPassSetSurvivalFrames: [2.8, 2.9, 3.1, 3.0, 3.2, 3.1, 3.3, 3.2],
      qbDropbackClockFrames: [2.4, 2.45, 2.5, 2.4, 2.55, 2.45, 2.5, 2.4],
      wr1RouteBreakFrames: [2.1, 2.15, 2.2, 2.1, 2.25, 2.2, 2.15, 2.2],
      defensivePressureStuntFrames: [0.6, 0.7, 0.65, 0.8, 0.75, 0.7, 0.85, 0.8],
      quickGameHotReadRate: 0.72,
      qbMobilityAndInstallFactor: 0.85,
    };

    const res = computeTebAvalancheBraidOverlay(anchoredInput);

    expect(res.pocketRegime).toBe("FAILED_AVALANCHE_POCKET_ANCHORED");
    expect(res.crowleyAvalancheRatio).toBeLessThanOrEqual(1.0);
    expect(res.probabilityLogOddsDelta).toBeGreaterThan(0.0);
    expect(res.probabilityLogOddsDelta).toBeLessThanOrEqual(0.12);
    expect(res.chenLevyTrenchCirculation).toBeGreaterThan(0.0);
    expect(res.seifertPocketEntropyProduction).toBeGreaterThan(0.0);
    expect(res.trenchToRouteTimeSlippage).toBeGreaterThan(0.0);
    expect(["SOVEREIGN_DECISIVE_100", "STANDARD_EDGE"]).toContain(res.conformalSelectiveTier);
  });

  it("verifies decoupled backup-QB trench collapse (RUNAWAY_POCKET_COLLAPSE_AVALANCHE) with BAL taped-ankle profile", () => {
    const runawayInput: TebAvalancheBraidInput = {
      olPassSetSurvivalFrames: [1.8, 1.7, 1.6, 1.5, 1.4, 1.5, 1.3, 1.2],
      qbDropbackClockFrames: [3.1, 3.2, 3.4, 3.5, 3.3, 3.6, 3.5, 3.7],
      wr1RouteBreakFrames: [2.6, 2.7, 2.8, 2.9, 2.7, 2.8, 2.9, 3.0],
      defensivePressureStuntFrames: [2.2, 2.5, 2.8, 3.1, 2.9, 3.4, 3.2, 3.6],
      quickGameHotReadRate: 0.18,
      qbMobilityAndInstallFactor: 0.22,
    };

    const res = computeTebAvalancheBraidOverlay(runawayInput);

    expect(res.pocketRegime).toBe("RUNAWAY_POCKET_COLLAPSE_AVALANCHE");
    expect(res.crowleyAvalancheRatio).toBeGreaterThan(1.0);
    expect(res.probabilityLogOddsDelta).toBeLessThan(0.0);
    expect(res.probabilityLogOddsDelta).toBeGreaterThanOrEqual(-0.12);
    expect(res.chenLevyTrenchCirculation).toBeGreaterThan(0.0);
    expect(res.seifertPocketEntropyProduction).toBeGreaterThan(0.0);
    expect(res.trenchToRouteTimeSlippage).toBeGreaterThan(0.0);
    expect(["SOVEREIGN_DECISIVE_100", "STANDARD_EDGE"]).toContain(res.conformalSelectiveTier);
  });

  it("verifies Byles et al. (arXiv:2608.04103v1) D(S3) non-abelian commutator norm > 0 and stabilizer magic M2", () => {
    const input: TebAvalancheBraidInput = {
      olPassSetSurvivalFrames: [2.5, 2.6, 2.7, 2.8],
      qbDropbackClockFrames: [2.4, 2.5, 2.4, 2.5],
      wr1RouteBreakFrames: [2.2, 2.3, 2.2, 2.3],
      defensivePressureStuntFrames: [1.0, 1.2, 1.1, 1.3],
      quickGameHotReadRate: 0.60,
      qbMobilityAndInstallFactor: 0.60,
    };

    const res = computeTebAvalancheBraidOverlay(input);

    // Non-abelian play-sequence commutator norm ||[O_A, O_B]||_F > 0
    expect(res.ds3PlaySequenceCommutatorNorm).toBeGreaterThan(0.0);

    // Stabilizer Rényi magic monotone M2 >= log(16/13) - 1e-5
    expect(res.ds3StabilizerMagicM2).toBeGreaterThanOrEqual(
      DS3_THEORETICAL_MAGIC_M2_BASELINE - 1e-5,
    );
    expect(res.ds3StabilizerMagicM2).toBeGreaterThanOrEqual(0.207639);
  });

  it("integrates seamlessly into runMasterSituationalReasoningOverlay with Stage 0 roster check", () => {
    const configPath = [
      resolve(process.cwd(), "data/nflverse/week9_live_roster_transactions_and_starters_2026.json"),
      resolve(process.cwd(), "../../data/nflverse/week9_live_roster_transactions_and_starters_2026.json"),
    ].find((p) => existsSync(p)) ?? resolve(process.cwd(), "data/nflverse/week9_live_roster_transactions_and_starters_2026.json");

    const overlay = runMasterSituationalReasoningOverlay({
      familyDeltas: { pressure: -0.04, qbSkillScript: -0.05 },
      marketAnchorProb: 0.52,
      independentEdgeDecision: "SPEAK",
      tebAvalancheBraidInput: {
        olPassSetSurvivalFrames: [1.8, 1.7, 1.6, 1.5, 1.4, 1.5, 1.3, 1.2],
        qbDropbackClockFrames: [3.1, 3.2, 3.4, 3.5, 3.3, 3.6, 3.5, 3.7],
        wr1RouteBreakFrames: [2.6, 2.7, 2.8, 2.9, 2.7, 2.8, 2.9, 3.0],
        defensivePressureStuntFrames: [2.2, 2.5, 2.8, 3.1, 2.9, 3.4, 3.2, 3.6],
        quickGameHotReadRate: 0.18,
        qbMobilityAndInstallFactor: 0.22,
      },
      stage0Check: {
        configPath,
        now: CONFIG_NOW,
        candidatePlayerNames: ["Trevor Lawrence", "Joe Fagnano", "Derrick Henry"],
      },
    });

    expect(overlay.tebAvalancheBraid).toBeDefined();
    expect(overlay.tebAvalancheBraid?.pocketRegime).toBe("RUNAWAY_POCKET_COLLAPSE_AVALANCHE");
    expect(overlay.stage0Verified).toBeDefined();
    expect(overlay.stage0Verified?.week).toBe(9);

    const streamCall = overlay.streamCalls.find(
      (c) => c.stream === "15H:computeTebAvalancheBraidOverlay",
    );
    expect(streamCall).toBeDefined();
    expect(streamCall?.called).toBe(true);
    expect(streamCall?.detail).toBe("RUNAWAY_POCKET_COLLAPSE_AVALANCHE");
  });

  it("hard-blocks OUT/IR players (Lamar Jackson, Tyler Huntley, Travis Etienne Jr.) via Stage 0 assertion", () => {
    const configPath = resolve(
      process.cwd(),
      "../../data/nflverse/week9_live_roster_transactions_and_starters_2026.json",
    );

    expect(() => {
      runMasterSituationalReasoningOverlay({
        familyDeltas: { pressure: 0.02 },
        marketAnchorProb: 0.50,
        independentEdgeDecision: "SPEAK",
        stage0Check: {
          configPath,
          now: CONFIG_NOW,
          candidatePlayerNames: ["Lamar Jackson", "Trevor Lawrence"],
        },
      });
    }).toThrow(/blocked players: Lamar Jackson/);

    expect(() => {
      runMasterSituationalReasoningOverlay({
        familyDeltas: { pressure: 0.02 },
        marketAnchorProb: 0.50,
        independentEdgeDecision: "SPEAK",
        stage0Check: {
          configPath,
          now: CONFIG_NOW,
          candidatePlayerNames: ["Tyler Huntley"],
        },
      });
    }).toThrow(/blocked players: Tyler Huntley/);

    expect(() => {
      runMasterSituationalReasoningOverlay({
        familyDeltas: { pressure: 0.02 },
        marketAnchorProb: 0.50,
        independentEdgeDecision: "SPEAK",
        stage0Check: {
          configPath,
          now: CONFIG_NOW,
          candidatePlayerNames: ["Travis Etienne Jr."],
        },
      });
    }).toThrow(/blocked players: Travis Etienne Jr\./);
  });
});
