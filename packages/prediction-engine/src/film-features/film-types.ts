/**
 * Bridge input types: the film play as the extractors see it.
 *
 * PlayRecord (Stream D) is the persisted, DB-flat shape. The bridge needs
 * a little more than the flat row — per-route classifications, separation
 * metrics, and the tracklet→player identity map — so FilmPlayInput extends
 * the record with optional enriched fields. Extractors degrade gracefully
 * when enrichment is absent (fewer features, never fabricated ones).
 *
 * Original implementation for GSE.
 */

import type { PlayRecord } from "../perception/cv-play.js";
import type { Route } from "../perception/cv-route-extract.js";
import type { SeparationMetrics } from "../perception/cv-separation-metrics.js";

/**
 * One perceived play, enriched for feature extraction.
 *
 * routes/separations/playerMap come from the watch loop + perception
 * pipeline (Stream B → Stream D). snapKind rides along from play
 * segmentation; it is not persisted on the flat PlayRecord.
 */
export interface FilmPlayInput extends PlayRecord {
  /** Per-receiver route classifications for this play. */
  readonly routes?: readonly Route[];
  /** Per-route separation metrics for this play. */
  readonly separations?: readonly SeparationMetrics[];
  /**
   * trackletId → playerId (roster identity from number OCR / manual map).
   * Absent or partial → player-level features are skipped, not guessed.
   */
  readonly playerMap?: Readonly<Record<string, string>>;
  /** From play segmentation: clean set vs hurry-up burst. */
  readonly snapKind?: "set" | "hurry-up";
  /** Mean perception confidence for the play, 0..1. */
  readonly playConfidence?: number;
}

/** Down/distance situation key used across team features. */
export type SituationKey =
  | "1st-short" | "1st-medium" | "1st-long"
  | "2nd-short" | "2nd-medium" | "2nd-long"
  | "3rd-short" | "3rd-medium" | "3rd-long"
  | "4th-short" | "4th-medium" | "4th-long";

export function situationKey(
  down: number | null,
  distanceYd: number | null,
): SituationKey | null {
  if (down == null || distanceYd == null) return null;
  if (down < 1 || down > 4) return null;
  const bucket =
    distanceYd <= 3 ? "short" : distanceYd <= 7 ? "medium" : "long";
  return `${down}${
    down === 1 ? "st" : down === 2 ? "nd" : down === 3 ? "rd" : "th"
  }-${bucket}` as SituationKey;
}
