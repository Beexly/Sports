/**
 * Degradation character classifier — tells the PUBLIC surface what kind of
 * "quiet" it is showing.
 *
 * A board can be empty for two structurally different reasons, and the public
 * copy must not conflate them:
 *
 *   1. genuinely-quiet  — the slate is legitimately empty. No eligible games
 *      were published today, the scheduler IS alive, and data is within the
 *      Refresh SLA. "Restraint, not an outage."
 *
 *   2. stale-refreshing — the data age exceeds the Refresh SLA. Either the
 *      stale-data kill switch suppressed the slate (forceNoBetIfStale ON), or
 *      the kill switch is OFF but the board loaded zero rows while ingestion
 *      is past SLA / scheduler is dead. The scheduler may be alive but slow,
 *      or it may be dead; either way the surface is WAITING on fresh data, not
 *      resting on an honest empty slate. "Temporarily stale, refreshing."
 *
 * This mirrors the operator-side distinction already made by
 * `assessSchedulerLiveness()` (lib/ops/scheduler-liveness.ts) — which tells
 * "platform cron stopped firing" from "a job ran and found nothing to do" —
 * but collapses to user-facing language. The page never surfaces the raw
 * scheduler status string; only the user-facing character.
 */

/** The user-facing character of the board's current empty/degraded state. */
export type DegradationCharacter =
  | "healthy"
  | "genuinely_quiet"
  | "stale_refreshing";

export interface DegradationEvidence {
  /** True when the stale-data kill switch fired (board suppressed for staleness). */
  readonly staleSuppressed: boolean;
  /** True when the data store did not answer. */
  readonly dbUnreachable: boolean;
  /** True when demo data was suppressed. */
  readonly demoSuppressed: boolean;
  /** True when LIVE_BOARD is off (board held by founder gate). */
  readonly liveBoardOff: boolean;
  /** Number of rows actually on the board (0 when suppressed). */
  readonly rowCount: number;
  /** Scheduler liveness status, already assessed by the caller. */
  readonly schedulerLiveness: "healthy" | "degraded" | "dead" | "unknown" | null;
  /**
   * True when the board loaded zero rows but the data is PAST the Refresh SLA
   * even though the kill switch is off (forceNoBetIfStale=false). This catches
   * the "20h stale, scheduler dead" case where zero rows load but the surface
   * would otherwise claim "genuinely quiet" — an outage mislabeled as restraint.
   */
  readonly staleDetected: boolean;
}

/**
 * Classify the board's public character.
 *
 * Precedence:
 *   DB unreachable → genuinely_quiet  (infra failure rendered as neutral empty,
 *                                      not as "stale" — see home page doctrine)
 *   demo suppressed → genuinely_quiet  (demo rows hidden is a structural choice,
 *                                       not staleness)
 *   stale suppressed → stale_refreshing (data past SLA, waiting on refresh,
 *                                        regardless of scheduler status — the
 *                                        kill switch only fires when stale)
 *   staleDetected  → stale_refreshing  (kill switch OFF, but zero rows with data
 *                                       past SLA — scheduler dead/degraded, NOT
 *                                       a genuinely quiet slate)
 *   liveBoardOff   → genuinely_quiet  (refuse-default, honest empty)
 *   rowCount === 0 → genuinely_quiet  (real empty slate, scheduler alive)
 *   rowCount > 0   → healthy
 *
 * When staleSuppressed or staleDetected is true, the schedulerLiveness is still
 * read and threaded through `evidence` so the caller can optionally show a more
 * urgent "refreshing" tone — but the PUBLIC copy is always "temporarily stale,
 * refreshing" for the stale branch. No operator language leaks.
 */
export function classifyDegradationCharacter(
  evidence: DegradationEvidence,
): DegradationCharacter {
  if (evidence.dbUnreachable) return "genuinely_quiet";
  if (evidence.demoSuppressed) return "genuinely_quiet";
  if (evidence.staleSuppressed) return "stale_refreshing";
  if (evidence.staleDetected) return "stale_refreshing";
  if (evidence.liveBoardOff) return "genuinely_quiet";
  if (evidence.rowCount === 0) return "genuinely_quiet";
  return "healthy";
}

/** Human-facing public copy for each character. */
export function degradationCharacterCopy(
  character: DegradationCharacter,
): { readonly label: string; readonly message: string } {
  switch (character) {
    case "healthy":
      return { label: "Live", message: "" };
    case "genuinely_quiet":
      return {
        label: "Quiet board",
        message:
          "Model signals are quiet (no fresh published slate). This is\n" +
          "restraint, not an outage — free tools and methodology stay open.",
      };
    case "stale_refreshing":
      return {
        label: "Temporarily stale",
        message:
          "Board is temporarily stale — awaiting fresh data. The board\n" +
          "reopens on the next real ingestion. Methodology and pricing stay\n" +
          "available while it refreshes.",
      };
  }
}
