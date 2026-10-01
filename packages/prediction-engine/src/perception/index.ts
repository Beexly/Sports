/**
 * GSE perception layer — Layer 2 (perception) and Layer 3 (memory) of the
 * CV pipeline.
 *
 *   Layer 1 (tracking):  detections → tracklets → field coordinates.
 *   Layer 2 (perception, here): tracklets → PLAYS. What is happening.
 *   Layer 3 (memory, here): plays → tendencies. What we learn across games.
 *
 * Everything downstream of a Play is internal and weight-zero until
 * validated. No raw frames are stored — intelligence only.
 */
export * from "./cv-field-model.js";
export * from "./cv-play.js";
export * from "./cv-play-segmentation.js";
export * from "./cv-scorebug-ocr.js";
export * from "./cv-formation-classify.js";
export * from "./cv-route-extract.js";
export * from "./cv-separation-metrics.js";
export * from "./cv-audio-align.js";
export * from "./cv-tendencies.js";
