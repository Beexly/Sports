/**
 * Broadcast audio → commentary aligned to plays.
 *
 * Commentators name players and describe plays in real time — that is free
 * labeled data sitting on top of every broadcast ("play-action, deep shot
 * to Jefferson"). This module is the alignment scaffold: transcript
 * segments (t0, t1, text) are windowed around each play's timestamps and
 * roster names are extracted as structured mentions.
 *
 * v1 scope: alignment only. Transcription itself is a documented
 * faster-whisper invocation (see TRANSCRIBE_CMD); the AudioTranscriber
 * interface keeps the ASR boundary swappable, with a fixture
 * implementation for tests. Full wiring (audio demux from the capture
 * client, scheduled transcription, mention→tracklet linking) is v2.
 *
 * Original implementation for GSE.
 */

export interface TranscriptSegment {
  /** Start, seconds from stream start (same clock as tracklets). */
  readonly t0: number;
  readonly t1: number;
  readonly text: string;
}

export interface PlayCommentary {
  readonly playId: string;
  readonly windowT0: number;
  readonly windowT1: number;
  /** Roster last names (or full names) mentioned in the window. */
  readonly mentions: readonly string[];
  /** Concatenated transcript text in the window. */
  readonly text: string;
}

/** Swappable ASR boundary. */
export interface AudioTranscriber {
  readonly name: string;
  transcribe(audioPath: string): Promise<TranscriptSegment[]>;
}

/** Deterministic fixture transcriber for tests and pipeline validation. */
export class FixtureTranscriber implements AudioTranscriber {
  readonly name = "fixture-transcriber";
  constructor(private readonly segments: readonly TranscriptSegment[]) {}
  async transcribe(_audioPath: string): Promise<TranscriptSegment[]> {
    return [...this.segments];
  }
}

/**
 * Documented faster-whisper invocation for the v2 wiring. Produces
 * word-timestamped segments; the capture client demuxes broadcast audio
 * to 16kHz mono wav per game window before calling this.
 */
export const TRANSCRIBE_CMD =
  "faster-whisper --model large-v3 --language en --output_format json " +
  "--word_timestamps true --vad_filter true <game_audio_16k.wav>";

export interface AlignmentOptions {
  /** Seconds before the snap to open the window. Default 5. */
  readonly beforeSec?: number;
  /** Seconds after the whistle to close the window. Default 10. */
  readonly afterSec?: number;
}

/**
 * Find roster mentions in text. Matches last names case-insensitively on
 * word boundaries; an optional aliases map covers nicknames
 * ("JJ" → "Jefferson"). Returns deduplicated matches in roster order.
 */
export function findMentions(
  text: string,
  roster: readonly string[],
  aliases: Readonly<Record<string, string>> = {},
): string[] {
  const found = new Set<string>();
  const aliasHits = new Map<string, string>();
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(text)) {
      aliasHits.set(canonical.toLowerCase(), canonical);
    }
  }
  for (const name of roster) {
    const last = name.split(/\s+/).pop() ?? name;
    if (new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(text)) {
      found.add(name);
    }
  }
  for (const canonical of aliasHits.values()) {
    const match = roster.find(
      (r) => r.toLowerCase() === canonical.toLowerCase(),
    );
    if (match) found.add(match);
  }
  return roster.filter((r) => found.has(r));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface PlayWindow {
  readonly playId: string;
  readonly snapT: number;
  readonly endT: number;
}

/** Align transcript segments to plays and extract roster mentions. */
export function alignCommentaryToPlays(
  segments: readonly TranscriptSegment[],
  plays: readonly PlayWindow[],
  roster: readonly string[],
  options: AlignmentOptions = {},
  aliases: Readonly<Record<string, string>> = {},
): PlayCommentary[] {
  const beforeSec = options.beforeSec ?? 5;
  const afterSec = options.afterSec ?? 10;
  return plays.map((play) => {
    const windowT0 = play.snapT - beforeSec;
    const windowT1 = play.endT + afterSec;
    const inWindow = segments.filter(
      (s) => s.t1 >= windowT0 && s.t0 <= windowT1,
    );
    const text = inWindow.map((s) => s.text).join(" ");
    return {
      playId: play.playId,
      windowT0,
      windowT1,
      mentions: findMentions(text, roster, aliases),
      text,
    };
  });
}
