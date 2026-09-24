/**
 * Audio-commentary curation recipe for NFL broadcast audio (Whisper large-v3)
 *
 * Research port: arXiv:2405.07354
 * Normalized lane: nlp | Doctrine: PROPRIETARY_EDGE
 *
 * Adapts the audio-commentary curation recipe to NFL: run Whisper large-v3 (best hallucination resistance) over full broadcast audio per game, segment at segment-level timestamps, translate non-English (Spanish broadcasts). It is a data asset + curation recipe, not a predictive model; downstream extraction must be confidence-weighted given transcription noise.
 *
 * ACCEPTANCE GATE: ADAPT (not ADOPT): curation recipe for the archive. Transcription noise (WER ~0.5) means every downstream extraction carries a confidence weight; no numeric gate, only the asset-quality review.
 */

export interface CurationConfig {
  model: "whisper-large-v3";
  language: string; // "en" default; "es" triggers translation
  segmentLevel: "segment";
  confidenceFloor: number;
}

export const DEFAULT_CURATION: CurationConfig = {
  model: "whisper-large-v3",
  language: "en",
  segmentLevel: "segment",
  confidenceFloor: 0.5,
};

export interface TranscriptSegment {
  gameId: string;
  start: number; // seconds
  end: number;
  text: string;
  language: string;
  confidence: number;
}

/** Keep only segments at/above the confidence floor; flag translations. */
export function curateSegments(
  segments: TranscriptSegment[],
  cfg: CurationConfig = DEFAULT_CURATION,
): { kept: TranscriptSegment[]; dropped: number; translated: number } {
  const kept: TranscriptSegment[] = [];
  let dropped = 0, translated = 0;
  for (const s of segments) {
    if (s.confidence < cfg.confidenceFloor) { dropped++; continue; }
    if (s.language !== cfg.language) translated++;
    kept.push(s);
  }
  return { kept, dropped, translated };
}

/** Confidence-weighted extraction weight for a downstream fact. */
export function extractionWeight(confidence: number): number {
  return Math.max(0, Math.min(1, confidence));
}

/** Estimated word error impact: effective usable fraction given WER. */
export function usableFraction(wer: number): number {
  return Math.max(0, 1 - Math.max(0, wer));
}


/** Live-data gate: stays off until commentary curation pipeline validated on GSE transcripts. */
export const GSE_COMMENTARY_CURATION_ENABLED = false;
