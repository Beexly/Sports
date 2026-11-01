/**
 * @file cron-rolling-horizon.ts
 * Multi-Slate Automated Rolling-Horizon Evaluator (Component 8 / Workstream 1).
 *
 * Automatically evaluates full NFL slates (14-16 games) on Wednesday at 14:00 CT:
 * 1. Iterates over active games in the slate.
 * 2. Compiles early-week boundary scenarios across uncertain injury/weather/scheme states.
 * 3. Applies the Law of Total Variance decomposition to separate resolvable epistemic
 *    horizon uncertainty (sigma_horizon) from irreducible intrinsic variance (sigma_intrinsic).
 * 4. Determines whether to LOCK_IMMEDIATELY_WEDNESDAY or STAGE_SURVEILLANCE_WATCH.
 * 5. Appends early-week price locks into decision-time-price-archive.ts for CLV tracking.
 * 6. Returns fully typed early-week board entries ready for live syndication.
 */

import {
  EarlyWeekBoardEntry,
  BoundaryScenario,
  evaluateEarlyWeekLockRule,
  lockEarlyWeekBoardPrice,
  LockWednesdayPriceOptions,
} from "@sports/prediction-engine";

export interface FullSlateMatchupInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffUtc: string;
  readonly wednesdayOddsAmerican: number;
  readonly wednesdayVigFreeProb: number;
  readonly conformalLowerBound: number;
  readonly lineMoveSkillVector: readonly [number, number, number]; // [q_AWAY, q_FLAT, q_HOME]
  readonly scenarios: readonly BoundaryScenario[];
  readonly watchCommitments?: EarlyWeekBoardEntry["watch_commitments"];
}

export interface SlateEvaluationSummary {
  readonly slateId: string;
  readonly season: number;
  readonly week: number;
  readonly evaluatedAtUtc: string;
  readonly gamesEvaluated: number;
  readonly lockedImmediatelyCount: number;
  readonly stagedSurveillanceCount: number;
  readonly entries: readonly EarlyWeekBoardEntry[];
  readonly archivedCount: number;
}

export interface RunWednesdayRollingHorizonOptions extends LockWednesdayPriceOptions {
  readonly autoArchivePrices?: boolean;
}

/**
 * Runs the automated Wednesday 14:00 CT Rolling-Horizon full-slate evaluation.
 */
export async function runWednesdayRollingHorizonSlate(
  slateId: string,
  season: number,
  week: number,
  matchups: readonly FullSlateMatchupInput[],
  options: RunWednesdayRollingHorizonOptions = {},
): Promise<SlateEvaluationSummary> {
  const evaluatedAtUtc = new Date().toISOString();
  const entries: EarlyWeekBoardEntry[] = [];
  let lockedCount = 0;
  let stagedCount = 0;
  let archivedCount = 0;

  for (const match of matchups) {
    const hoursBeforeKickoff = Math.max(
      1.0,
      (new Date(match.kickoffUtc).getTime() - new Date(evaluatedAtUtc).getTime()) / (1000 * 3600),
    );

    // Run formal Early-Week Decision Rule
    const decision = evaluateEarlyWeekLockRule({
      wednesdayVigFreeProb: match.wednesdayVigFreeProb,
      scenarios: match.scenarios,
      conformalLowerBound: match.conformalLowerBound,
      lineMoveSkillVector: match.lineMoveSkillVector,
    });

    const isLocked = decision.action === "LOCK_IMMEDIATELY_WEDNESDAY";
    if (isLocked) {
      lockedCount++;
    } else {
      stagedCount++;
    }

    const entry: EarlyWeekBoardEntry = {
      entry_id: `WB-${season}-W${String(week).padStart(2, "0")}-${match.homeTeam}-${match.awayTeam}-ML`,
      game_id: match.gameId,
      market_type: "MONEYLINE",
      emitted_stage: "H2_WED_FULL_BOARD",
      emitted_at_utc: evaluatedAtUtc,
      hours_before_kickoff: Math.round(hoursBeforeKickoff * 10) / 10,
      locked_market_line: 0.0,
      locked_market_odds_american: match.wednesdayOddsAmerican,
      locked_vig_free_prob: match.wednesdayVigFreeProb,
      model_true_prob_wednesday: decision.marginalizedProb,
      conformal_lower_bound: match.conformalLowerBound,
      intrinsic_sd: decision.intrinsicSd,
      horizon_epistemic_sd: decision.horizonSd,
      expected_clv_capture: Math.max(0, decision.marginalizedProb - match.wednesdayVigFreeProb) * 0.75,
      line_move_skill_vector: match.lineMoveSkillVector,
      watch_commitments: match.watchCommitments ?? [],
      surveillance_status: isLocked ? "LOCKED_ACTIVE" : "SURVEILLANCE_WATCH",
    };

    // Optionally append to decision-time price archive
    if (options.autoArchivePrices ?? true) {
      const archived = await lockEarlyWeekBoardPrice(entry, {
        baseDir: options.baseDir,
        modelSource: options.modelSource ?? `GSE_WED_SLATE_${season}_W${week}`,
        covariatesHash: options.covariatesHash,
      });
      if (archived) {
        archivedCount++;
      }
    }

    entries.push(entry);
  }

  return {
    slateId,
    season,
    week,
    evaluatedAtUtc,
    gamesEvaluated: matchups.length,
    lockedImmediatelyCount: lockedCount,
    stagedSurveillanceCount: stagedCount,
    entries,
    archivedCount,
  };
}
