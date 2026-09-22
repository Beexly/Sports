/**
 * Recap pipeline stage 1: NFL/NBA play-by-play -> (period, time, team, event, score) tuples
 *
 * Research port: arXiv:2402.11191
 * Normalized lane: nlp | Doctrine: SITUATIONAL
 *
 * Event ingestion for the recap pipeline: parses NFL/NBA play-by-play rows into (period, time, team, event, score) tuples. Adapts the architecture (event segmentation -> entity linking -> KG-enriched generation), not the paper's artifacts; KEE-style segmentation thresholds are downstream config.
 *
 * ACCEPTANCE GATE: ADAPT the architecture only if the reproducible test shows the pipeline reproduces the paper's segmentation quality on GSE's own archive (pre-registered threshold). Content lane only; never gates a pick.
 */

export interface PbpRow {
  period: number; // quarter / period
  clock: string; // "MM:SS"
  team: string;
  event: string; // normalized event label
  homeScore: number;
  awayScore: number;
}

export interface EventTuple {
  period: number;
  timeSeconds: number; // seconds elapsed in the period
  team: string;
  event: string;
  homeScore: number;
  awayScore: number;
}

const EVENT_NORMALIZATION: Record<string, string> = {
  "pass complete": "completion",
  "pass incomplete": "incompletion",
  "rush": "rush",
  "touchdown": "touchdown",
  "field goal good": "field_goal",
  "punt": "punt",
  "interception": "turnover",
  "fumble lost": "turnover",
};

function clockToElapsed(clock: string, periodLengthSeconds: number): number {
  const m = /^(\d+):(\d{2})$/.exec(clock.trim());
  if (!m) return 0;
  const remaining = Number(m[1]) * 60 + Number(m[2]);
  return Math.max(0, periodLengthSeconds - remaining);
}

/** Normalize one play-by-play row into an event tuple. */
export function toEventTuple(row: PbpRow, periodLengthSeconds = 900): EventTuple {
  const key = row.event.trim().toLowerCase();
  return {
    period: row.period,
    timeSeconds: clockToElapsed(row.clock, periodLengthSeconds),
    team: row.team,
    event: EVENT_NORMALIZATION[key] ?? key,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
  };
}

/** Ingest a full game into an ordered tuple stream. */
export function ingestGame(rows: PbpRow[], periodLengthSeconds = 900): EventTuple[] {
  return rows.map((r) => toEventTuple(r, periodLengthSeconds));
}


/** Live-data gate: stays off until recap event-tuple ingestion validated on nflverse. */
export const GSE_RECAP_EVENT_TUPLES_ENABLED = false;
