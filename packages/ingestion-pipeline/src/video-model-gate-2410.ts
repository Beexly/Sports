/**
 * Video-model content-pipeline gate (MCQ >= 65%, G-Eval >= 2.5)
 *
 * Research port: arXiv:2410.08474
 * Normalized lane: mixed | Doctrine: PROPRIETARY_EDGE
 *
 * Gates any video model entering the content pipeline: fine-tuned open video models (direct-answer training, no CoT) are scored on the NFL split MCQs and open-ended G-Eval; the human-in-the-loop stays until both bars clear. Scoring and gate math only — no model weights here.
 *
 * ACCEPTANCE GATE: Route a video model into the content pipeline only if it scores >=65% on the NFL split MCQs AND open-ended G-Eval >= 2.5; otherwise keep the human in the loop.
 */

export interface VideoModelEval {
  model: string;
  /** NFL split multiple-choice accuracy, fraction 0..1 */
  mcqAccuracy: number;
  /** open-ended G-Eval score */
  gEval: number;
  directAnswerTrained: boolean;
}

export const MCQ_BAR = 0.65;
export const GEVAL_BAR = 2.5;

/** Gate: both bars must clear; CoT-trained models are ineligible for this lane. */
export function videoModelGatePasses(e: VideoModelEval): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!e.directAnswerTrained) reasons.push("not direct-answer trained (CoT ineligible for this lane)");
  if (e.mcqAccuracy < MCQ_BAR) reasons.push(`MCQ ${(e.mcqAccuracy * 100).toFixed(1)}% < 65%`);
  if (e.gEval < GEVAL_BAR) reasons.push(`G-Eval ${e.gEval.toFixed(2)} < 2.5`);
  return { pass: reasons.length === 0, reasons };
}

/** Rank candidate models by MCQ then G-Eval (for the ~1/50th-cost comparison). */
export function rankVideoModels(evals: VideoModelEval[]): VideoModelEval[] {
  return [...evals].sort((a, b) => b.mcqAccuracy - a.mcqAccuracy || b.gEval - a.gEval);
}


/** Live-data gate: stays off until video model gate validated on GSE evals. */
export const GSE_VIDEO_MODEL_GATE_ENABLED = false;
