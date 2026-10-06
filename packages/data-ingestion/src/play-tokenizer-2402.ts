/**
 * NFL play-sequence simulator: play tuple tokenizer (60-90 token plays)
 *
 * Research port: arXiv:2402.06820
 * Normalized lane: nlp | Doctrine: PROPRIETARY_EDGE
 *
 * Encodes each NFL play as a token tuple for the play-sequence simulator: (play_type, yards_gained, down, distance, yardline, quarter/time_remaining, score_diff, timeouts, shotgun/no_huddle, weather bin). Deterministic, invertible vocabulary; simulator training itself is a live-data gate.
 *
 * ACCEPTANCE GATE: ADOPT the simulator design only if next-play-type accuracy >= 62% on held-out 2024 AND win-probability Brier <= GSE's current live model. Live-data gate -> GSE_PLAY_SIMULATOR_ENABLED flag (default false).
 */

export interface PlayTuple {
  playType: string; // pass, rush, punt, field_goal, kickoff, kneel, spike
  yardsGained: number;
  down: number;
  distance: number;
  yardline: number;
  quarter: number;
  secondsRemaining: number;
  scoreDiff: number;
  timeoutsOffense: number;
  timeoutsDefense: number;
  shotgun: boolean;
  noHuddle: boolean;
  weatherBin: number; // 0..4
}

const PLAY_TYPE_VOCAB = ["pass", "rush", "punt", "field_goal", "kickoff", "kneel", "spike", "other"] as const;

export const TOKEN_VOCAB_SIZE = 128;

function bucket(v: number, edges: number[]): number {
  for (let i = 0; i < edges.length; i++) if (v < (edges[i] ?? Infinity)) return i;
  return edges.length;
}

/** Encode a play tuple to a fixed token id sequence. */
export function encodePlay(p: PlayTuple): number[] {
  const pt = PLAY_TYPE_VOCAB.indexOf(p.playType as (typeof PLAY_TYPE_VOCAB)[number]);
  const tokens = [
    1 + (pt === -1 ? PLAY_TYPE_VOCAB.length - 1 : pt),            // play type
    10 + bucket(p.yardsGained, [-5, 0, 5, 10, 20]),                 // yards bucket
    16 + Math.max(0, Math.min(3, p.down - 1)),                     // down
    20 + bucket(p.distance, [3, 7, 11]),                           // distance bucket
    24 + bucket(p.yardline, [20, 40, 60, 80]),                     // field zone
    29 + Math.max(0, Math.min(3, p.quarter - 1)),                  // quarter
    33 + bucket(p.secondsRemaining, [120, 600, 1800]),             // time bucket
    37 + bucket(p.scoreDiff, [-14, -7, 0, 7, 14]),                 // score bucket
    43 + Math.max(0, Math.min(3, p.timeoutsOffense)),              // timeouts O
    47 + Math.max(0, Math.min(3, p.timeoutsDefense)),              // timeouts D
    51 + (p.shotgun ? 1 : 0),                                      // shotgun
    53 + (p.noHuddle ? 1 : 0),                                     // no huddle
    55 + Math.max(0, Math.min(4, p.weatherBin)),                   // weather
  ];
  return tokens.map((t) => Math.min(TOKEN_VOCAB_SIZE - 1, t));
}

/** Decode the play-type token back to its label. */
export function decodePlayType(token: number): string {
  const idx = token - 1;
  return PLAY_TYPE_VOCAB[idx] ?? "other";
}

/** Live-data gate: >=62% next-play-type accuracy and Brier <= current live model. */
export const GSE_PLAY_SIMULATOR_ENABLED = false;

