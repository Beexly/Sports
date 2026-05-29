/**
 * Experience Orchestrator — composes the User Understanding Snapshot,
 * Maturity verdict, mode context, behavior observations, and confusion
 * signals into a single concrete recommendation: the next best surface
 * to surface, plus any restraint flags to set.
 *
 * Pure function. The product calls it; it does not call the product.
 */

import type { UserMode } from "./user-modes";
import type { MaturityVerdict } from "../decision-quality/maturity";
import type { UserUnderstandingSnapshot } from "../understanding/user-understanding";
import type { BehaviorObservation } from "../decision-quality/behavior-patterns";
import { responseFor, valenceOf } from "../decision-quality/behavior-patterns";
import type { ConfusionSignal } from "../understanding/confusion-signals";
import { proposeRemediation } from "../understanding/confusion-signals";
import { nextBestSurface, type NextBestSurface } from "./next-best-surface";

export interface OrchestratorInput {
  readonly mode: UserMode;
  readonly maturity: MaturityVerdict;
  readonly understanding: UserUnderstandingSnapshot;
  readonly recentBehavior: ReadonlyArray<BehaviorObservation>;
  readonly recentConfusion: ReadonlyArray<ConfusionSignal>;
}

export interface OrchestratorOutput {
  readonly next: NextBestSurface;
  readonly restraint: {
    readonly elevateNoBet: boolean;
    readonly elevateResponsiblePlay: boolean;
    readonly elevateAcademy: boolean;
  };
  readonly notes: ReadonlyArray<string>;
}

export function orchestrate(input: OrchestratorInput): OrchestratorOutput {
  const notes: string[] = [];

  // 1. Start with mode-based defaults.
  const next = nextBestSurface({
    mode: input.mode,
    maturity: input.maturity.stage,
    understanding: input.understanding,
  });
  notes.push(`mode=${input.mode}, maturity=${input.maturity.stage}`);

  // 2. Inspect risky behavior — propose restraint elevations, never bet nudges.
  let elevateNoBet = false;
  let elevateResponsiblePlay = false;
  let elevateAcademy = false;

  for (const obs of input.recentBehavior) {
    if (valenceOf(obs.pattern) === "risky") {
      const response = responseFor(obs.pattern);
      if (response.kind === "elevate-no-bet") elevateNoBet = true;
      if (response.kind === "elevate-responsible-play") elevateResponsiblePlay = true;
      if (response.kind === "elevate-academy-module") elevateAcademy = true;
      if (response.kind === "elevate-methodology" || response.kind === "elevate-autopsy") {
        notes.push(`risky pattern ${obs.pattern} → ${response.kind}`);
      }
    }
  }

  // 3. Apply confusion signals — they may shift defaults to clarity.
  for (const c of input.recentConfusion) {
    const remediation = proposeRemediation(c);
    if (remediation.kind === "lower-density") elevateAcademy = true;
    if (remediation.kind === "show-methodology") notes.push("confusion → show-methodology");
  }

  return {
    next,
    restraint: { elevateNoBet, elevateResponsiblePlay, elevateAcademy },
    notes,
  };
}
