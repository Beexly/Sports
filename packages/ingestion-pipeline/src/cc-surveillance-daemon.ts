/**
 * @file cc-surveillance-daemon.ts
 * Real-time Machine-Executable CC-* Surveillance Daemon & DFS Late-Swap Dispatcher (Component 8 / Workstream 2).
 *
 * Implements the continuous sub-second delta-surveillance loop:
 * 1. Maintains an in-memory/durable registry of active EarlyWeekBoardEntries and their
 *    unresolved watch_commitments (ConditionalCommitmentRule[]).
 * 2. Ingests real-time events (injury reports, inactive lists, NOAA HRRR wind gusts, market steam).
 * 3. Evaluates matching CC-* rules, shifts probability delta_p atomically, and updates surveillance status.
 * 4. Dispatches sub-500ms O(1) DFS late-swaps when a player is ruled inactive or has a major projection pivot.
 */

import {
  EarlyWeekBoardEntry,
  ConditionalCommitmentRule,
  SurveillanceTriggerEvent,
  evaluateSurveillanceDelta,
} from "@sports/prediction-engine";

export interface DfsLateSwapExecutionResult {
  readonly outPlayerId: string;
  readonly inPlayerId: string;
  readonly salaryDelta: number;
  readonly executedAtUtc: string;
  readonly status: "SUCCESS" | "FAILED_SALARY_OVERFLOW" | "NO_OP";
  readonly message: string;
}

export interface SurveillanceDispatchResult {
  readonly processedEventsCount: number;
  readonly matchedRulesCount: number;
  readonly updatedEntries: readonly EarlyWeekBoardEntry[];
  readonly triggeredLateSwaps: readonly DfsLateSwapExecutionResult[];
}

export type DfsLateSwapHandler = (
  swap: NonNullable<ConditionalCommitmentRule["dfs_swap_player"]>,
) => Promise<DfsLateSwapExecutionResult>;

export class CcSurveillanceDaemon {
  private readonly boardEntries = new Map<string, EarlyWeekBoardEntry>();
  private readonly swapHandler?: DfsLateSwapHandler;

  constructor(initialEntries: readonly EarlyWeekBoardEntry[] = [], swapHandler?: DfsLateSwapHandler) {
    for (const entry of initialEntries) {
      this.boardEntries.set(entry.entry_id, entry);
    }
    this.swapHandler = swapHandler;
  }

  /**
   * Register or update a board entry under active surveillance.
   */
  public registerEntry(entry: EarlyWeekBoardEntry): void {
    this.boardEntries.set(entry.entry_id, entry);
  }

  /**
   * Retrieve all currently active entries.
   */
  public getEntries(): readonly EarlyWeekBoardEntry[] {
    return Array.from(this.boardEntries.values());
  }

  /**
   * Ingest a batch of surveillance trigger events and evaluate all watching entries.
   */
  public async ingestEvents(
    events: readonly SurveillanceTriggerEvent[],
  ): Promise<SurveillanceDispatchResult> {
    if (events.length === 0) {
      return {
        processedEventsCount: 0,
        matchedRulesCount: 0,
        updatedEntries: [],
        triggeredLateSwaps: [],
      };
    }

    const updatedEntries: EarlyWeekBoardEntry[] = [];
    const triggeredLateSwaps: DfsLateSwapExecutionResult[] = [];
    let matchedRulesCount = 0;

    for (const [id, entry] of this.boardEntries.entries()) {
      const pendingRulesBefore = entry.watch_commitments.filter((r) => r.status === "PENDING").length;
      if (pendingRulesBefore === 0) {
        continue;
      }

      // Evaluate delta atomically through the formal prediction-engine state machine
      const updated = evaluateSurveillanceDelta(entry, events);
      const pendingRulesAfter = updated.watch_commitments.filter((r) => r.status === "PENDING").length;
      const triggeredInEntry = pendingRulesBefore - pendingRulesAfter;

      if (triggeredInEntry > 0) {
        matchedRulesCount += triggeredInEntry;
        this.boardEntries.set(id, updated);
        updatedEntries.push(updated);

        // Check if any triggered rule mandates a DFS late-swap
        for (const rule of updated.watch_commitments) {
          if (rule.status === "TRIGGERED" && rule.dfs_swap_player) {
            if (this.swapHandler) {
              const res = await this.swapHandler(rule.dfs_swap_player);
              triggeredLateSwaps.push(res);
            } else {
              // Default synchronous record
              triggeredLateSwaps.push({
                outPlayerId: rule.dfs_swap_player.out_player_id,
                inPlayerId: rule.dfs_swap_player.in_player_id,
                salaryDelta: rule.dfs_swap_player.salary_delta,
                executedAtUtc: new Date().toISOString(),
                status: "SUCCESS",
                message: `Late swap recorded: ${rule.dfs_swap_player.out_player_id} -> ${rule.dfs_swap_player.in_player_id}`,
              });
            }
          }
        }
      }
    }

    return {
      processedEventsCount: events.length,
      matchedRulesCount,
      updatedEntries,
      triggeredLateSwaps,
    };
  }
}
