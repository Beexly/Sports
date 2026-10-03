/**
 * Pre-mortem failure-mode templates.
 *
 * One template per factor. Each template is a deterministic bullet generator —
 * given a PickSignalSnapshot + Pick, returns a one-line pre-mortem bullet
 * describing the specific failure mode that would invalidate this pick.
 *
 * Voice rules (locked, do not modify without docs/ops/decision-log.md entry):
 * - Lead with "If [specific condition]..."
 * - Tie the condition to a specific factor read in the snapshot.
 * - End with "..., [our edge / our read / this pick] [evaporates / is too steep / collapses]."
 * - No hedging. No "might." No "could possibly." Either commit to the failure
 *   mode or refuse to generate the bullet.
 *
 * Spec: docs/product/pre-mortem-pipeline-spec.md
 * Owner: Claude (template content) + Codex (runtime wiring).
 *
 * NOTE: Codex defines the exact types when wiring the pipeline. The shape
 * below is the spec's contract; Codex tightens type names during integration.
 */

import { consensusTemplate } from "./consensus";
import { depthTemplate } from "./depth";
import { lineMovementTemplate } from "./line-movement";
import { volatilityTemplate } from "./volatility";
import { restAdvantageTemplate } from "./rest-advantage";
import { scheduleStressTemplate } from "./schedule-stress";
import { venueFormTemplate } from "./venue-form";
import { crossMarketTemplate } from "./cross-market";
import { dataQualityTemplate } from "./data-quality";

import type { FailureModeTemplate } from "./types";

export const FAILURE_MODE_TEMPLATES: FailureModeTemplate[] = [
  consensusTemplate,
  depthTemplate,
  lineMovementTemplate,
  volatilityTemplate,
  restAdvantageTemplate,
  scheduleStressTemplate,
  venueFormTemplate,
  crossMarketTemplate,
  dataQualityTemplate,
];

export {
  consensusTemplate,
  depthTemplate,
  lineMovementTemplate,
  volatilityTemplate,
  restAdvantageTemplate,
  scheduleStressTemplate,
  venueFormTemplate,
  crossMarketTemplate,
  dataQualityTemplate,
};

export type {
  FactorKey,
  FailureModeTemplate,
  GameInput,
  PickInput,
  PickSignalSnapshotInput,
} from "./types";
