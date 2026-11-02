import { describe, it, expect } from "vitest";
import { CcSurveillanceDaemon, DfsLateSwapExecutionResult } from "../cc-surveillance-daemon.js";
import { EarlyWeekBoardEntry, SurveillanceTriggerEvent } from "@sports/prediction-engine";

describe("CcSurveillanceDaemon (Component 8 / Workstream 2)", () => {
  const initialEntry: EarlyWeekBoardEntry = {
    entry_id: "WB-2026-W07-BAL-CIN-ML",
    game_id: "GAME-2026-W07-BAL-CIN",
    market_type: "MONEYLINE",
    emitted_stage: "H2_WED_FULL_BOARD",
    emitted_at_utc: "2026-10-21T19:00:00Z",
    hours_before_kickoff: 94.0,
    locked_market_line: 0.0,
    locked_market_odds_american: -125,
    locked_vig_free_prob: 0.535,
    model_true_prob_wednesday: 0.540,
    conformal_lower_bound: 0.510,
    intrinsic_sd: 0.20,
    horizon_epistemic_sd: 0.08,
    expected_clv_capture: 0.02,
    line_move_skill_vector: [0.40, 0.30, 0.30],
    watch_commitments: [
      {
        rule_id: "CC-2026-07-CIN-BAL-001",
        target_entry_id: "WB-2026-W07-BAL-CIN-ML",
        watched_node: "QB_CIN",
        trigger_condition: "DECLARED_INACTIVE",
        delta_prob: 0.14,
        stake_adjustment: 0.10,
        dfs_swap_player: {
          out_player_id: "joe-burrow",
          in_player_id: "jake-browning",
          salary_delta: -2400,
        },
        deadline_utc: "2026-10-25T15:30:00Z",
        status: "PENDING",
      },
    ],
    surveillance_status: "SURVEILLANCE_WATCH",
  };

  it("maintains entries and triggers atomic delta_p and O(1) DFS late swap on event ingestion", async () => {
    let lateSwapExecuted = false;
    const mockSwapHandler = async (swap: {
      out_player_id: string;
      in_player_id: string;
      salary_delta: number;
    }): Promise<DfsLateSwapExecutionResult> => {
      lateSwapExecuted = true;
      expect(swap.out_player_id).toBe("joe-burrow");
      expect(swap.in_player_id).toBe("jake-browning");
      return {
        outPlayerId: swap.out_player_id,
        inPlayerId: swap.in_player_id,
        salaryDelta: swap.salary_delta,
        executedAtUtc: new Date().toISOString(),
        status: "SUCCESS",
        message: "DFS Late Swap Executed cleanly",
      };
    };

    const daemon = new CcSurveillanceDaemon([initialEntry], mockSwapHandler);
    expect(daemon.getEntries().length).toBe(1);

    // Ingest event matching rule CC-2026-07-CIN-BAL-001
    const event: SurveillanceTriggerEvent = {
      watchedNode: "QB_CIN",
      eventType: "DECLARED_INACTIVE",
      eventTimestampUtc: "2026-10-25T15:30:00Z",
      eventDetails: { reason: "Toe injury" },
    };

    const result = await daemon.ingestEvents([event]);

    expect(result.processedEventsCount).toBe(1);
    expect(result.matchedRulesCount).toBe(1);
    expect(result.updatedEntries.length).toBe(1);
    expect(lateSwapExecuted).toBe(true);

    const updated = result.updatedEntries[0]!;
    // model_true_prob should shift from 0.54 to 0.68 (+0.14)
    expect(updated.model_true_prob_wednesday).toBeCloseTo(0.68, 3);
    expect(updated.surveillance_status).toBe("SWAP_TRIGGERED");

    const triggeredRule = updated.watch_commitments.find((r) => r.rule_id === "CC-2026-07-CIN-BAL-001")!;
    expect(triggeredRule.status).toBe("TRIGGERED");
  });
});
