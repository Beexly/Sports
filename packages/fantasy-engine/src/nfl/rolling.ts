/**
 * GSE Rolling Windows — recent form vs the season baseline.
 *
 * A season number hides regime changes: the reference implementation's live
 * 2025 example is Baltimore's PROE at −8.2 for the season but −18.8 over the
 * last four weeks — a hard late-season run-lean invisible to season-long
 * consumers. This module compares any windowed aggregate to its season
 * baseline and reports the deltas that drive start/sit and matchup calls.
 *
 * Pure arithmetic over caller-supplied aggregates (the windowing itself —
 * "last 4 weeks", "since the coordinator change" — is the adapter's query).
 * Golden-verified against the reference's live 2025 rolling table.
 */

export interface TeamWindowAggregates {
  readonly team: string;
  readonly season: {
    readonly playsPerGame: number;
    readonly proe: number;
    readonly offEpaPerPlay: number;
  };
  readonly recent: {
    readonly playsPerGame: number;
    readonly proe: number;
    readonly offEpaPerPlay: number;
  };
}

export interface TeamFormDelta {
  readonly team: string;
  /** Recent-window PROE minus season PROE (percentage points). */
  readonly proeDelta: number;
  /** Recent-window pace minus season pace (plays/game). */
  readonly paceDelta: number;
  /** Recent-window EPA/play minus season EPA/play. */
  readonly epaDelta: number;
}

export function computeFormDeltas(teams: readonly TeamWindowAggregates[]): TeamFormDelta[] {
  return teams.map((t) => ({
    team: t.team,
    proeDelta: t.recent.proe - t.season.proe,
    paceDelta: t.recent.playsPerGame - t.season.playsPerGame,
    epaDelta: t.recent.offEpaPerPlay - t.season.offEpaPerPlay,
  }));
}

/**
 * The narrative read for a delta: which direction the play-caller is
 * drifting, with a PUBLIC materiality threshold (below it, the honest answer
 * is "no meaningful shift" — never a manufactured trend).
 */
export function proeShiftRead(
  proeDelta: number,
  materialityPp = 3,
): "leaning heavier to the pass" | "leaning heavier to the run" | "no meaningful shift" {
  if (!Number.isFinite(proeDelta)) return "no meaningful shift";
  if (proeDelta >= materialityPp) return "leaning heavier to the pass";
  if (proeDelta <= -materialityPp) return "leaning heavier to the run";
  return "no meaningful shift";
}
