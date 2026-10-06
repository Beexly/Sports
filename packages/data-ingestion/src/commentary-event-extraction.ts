/**
 * Analyzing Sports Commentary in Order to Automatically Recognize Events and Extract Insights
 *
 * arXiv:2307.10303 · lane:nlp · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build an availability classifier from beat-reporter language: scrape beat-writer tweets/articles
 * (Schefter, Rapoport, team beat writers) + NFL official injury-report text; label sentences with
 * availability outcomes from subsequent injury reports (Out/Doubtful/Questionable/Active); fine-
 * tune DeBERTa-v3-base on the sentence-classification task, 80/10/10 split by SEASON (not
 * shuffled), target = P(player misses next game | news sentence); serve hourly over the beat-
 * writer firehose - when P(miss) crosses 0.6 for a starter, emit an availability signal into the
 * pick engine 15-60 min before books move - with a domain-specific 'injury-language' encoder via
 * contrastive pretraining on paired sentences ('limited in practice' vs 'full participant'),
 * distilled into a 30M-param model for sub-second live inference.
 *
 * ACCEPTANCE GATE: ADOPT the availability classifier if: F1 >= 0.80 on 2024-season beat-writer sentences AND the
 * classifier's P(miss) signal, backtested as a line-move predictor, anticipates official injury-
 * report designation changes >= 30 minutes ahead of the market move in >= 55% of cases (n >= 50
 * cases); REJECT if F1 < 0.70 or the lead-time test fails.
 *
 * Ingest role: schemas (sports commentary event extraction: schema + keyword spotter + alignment).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2307.10303" as const;
export const LANE = "nlp" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the availability classifier if: F1 >= 0.80 on 2024-season beat-writer sentences AND the
 * classifier's P(miss) signal, backtested as a line-move predictor, anticipates official injury-
 * report designation changes >= 30 minutes ahead of the market move in >= 55% of cases (n >= 50
 * cases); REJECT if F1 < 0.70 or the lead-time test fails.`;

export const CONFIG = {
  enabled: false,
  events: ["touchdown", "turnover", "sack", "field-goal", "injury"],
  alignment: "commentary-to-play",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type CommentaryEvent = "touchdown" | "turnover" | "sack" | "field-goal" | "injury" | "other";

export interface CommentaryLine {
  readonly lineId: string;
  readonly gameId: string;
  readonly tSec: number;
  readonly text: string;
}

export function isCommentaryLine(x: unknown): x is CommentaryLine {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["lineId"] === "string" &&
    typeof o["gameId"] === "string" &&
    isFiniteNumber(o["tSec"]) && (o["tSec"] as number) >= 0 &&
    typeof o["text"] === "string"
  );
}

const KEYWORDS: Readonly<Record<Exclude<CommentaryEvent, "other">, readonly string[]>> = {
  touchdown: ["touchdown", "td", "end zone", "scores"],
  turnover: ["interception", "fumble", "turnover", "picked off"],
  sack: ["sack", "sacked", "tackled for loss"],
  "field-goal": ["field goal", "kicks it through", "uprights"],
  injury: ["injury", "injured", "cart", "limps off"],
};

/** Keyword event spotter. */
export function spotEvent(text: string): CommentaryEvent {
  if (typeof text !== "string") return "other";
  const t = text.toLowerCase();
  (Object.keys(KEYWORDS) as Array<Exclude<CommentaryEvent, "other">>).forEach(() => {});
  for (const [ev, kws] of Object.entries(KEYWORDS)) {
    if (kws.some((k) => t.includes(k))) return ev as CommentaryEvent;
  }
  return "other";
}

/** Tag a commentary feed. */
export function tagFeed(lines: readonly unknown[]): Array<CommentaryLine & { event: CommentaryEvent }> {
  const out: Array<CommentaryLine & { event: CommentaryEvent }> = [];
  for (const l of lines) {
    if (!isCommentaryLine(l)) continue;
    out.push({ ...l, event: spotEvent(l.text) });
  }
  return out;
}

/** Align events to play timestamps (nearest play within tolerance). */
export function alignToPlays(
  tagged: ReadonlyArray<{ tSec: number; event: CommentaryEvent }>,
  playTimes: readonly number[],
  tolSec = 30,
): Array<{ tSec: number; event: CommentaryEvent; playT: number | null }> {
  if (!isFiniteNumber(tolSec) || tolSec < 0) return [];
  return tagged.map((t) => {
    let best: number | null = null;
    for (const p of playTimes) {
      if (!isFiniteNumber(p)) continue;
      if (Math.abs(p - t.tSec) <= tolSec && (best === null || Math.abs(p - t.tSec) < Math.abs(best - t.tSec))) best = p;
    }
    return { tSec: t.tSec, event: t.event, playT: best };
  });
}
