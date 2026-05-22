/**
 * Pre-mortem composer.
 *
 * Pure function that takes a PickSignalSnapshot + Pick + Game and runs the
 * failure-mode templates to produce a complete PreMortemContent block.
 *
 * Sorts bullets by severityRank ascending (lowest rank = highest priority).
 * Caps at 4 bullets. Populates the warning field when fewer than 2 bullets
 * fire ("Pre-mortem coverage thin — only N factor[s] above contribution
 * threshold.").
 *
 * Spec: docs/product/pre-mortem-pipeline-spec.md
 */

import {
  FAILURE_MODE_TEMPLATES,
  type PickSignalSnapshotInput,
  type PickInput,
  type GameInput,
  type FactorKey,
} from "./templates";

export interface PreMortemBullet {
  factorKey: FactorKey;
  severityRank: number;
  text: string;
}

export interface PreMortemContent {
  generatedAt: string;
  modelVersion: string;
  warning: string | null;
  bullets: PreMortemBullet[];
}

export interface ComposeInput {
  snapshot: PickSignalSnapshotInput;
  pick: PickInput;
  game: GameInput;
  generatedAt?: Date;
}

const MIN_BULLETS_FOR_HEALTHY = 2;
const MAX_BULLETS = 4;

export function composePreMortem(input: ComposeInput): PreMortemContent {
  const { snapshot, pick, game, generatedAt = new Date() } = input;

  // Run every template's trigger; collect the ones that fire.
  const triggeredBullets: PreMortemBullet[] = [];

  for (const template of FAILURE_MODE_TEMPLATES) {
    if (!template.triggerCondition(snapshot)) continue;

    const text = template.generateBullet(snapshot, pick, game);
    triggeredBullets.push({
      factorKey: template.factorKey,
      severityRank: template.severityRank,
      text,
    });
  }

  // Sort by severityRank ascending (rank 1 = highest priority).
  triggeredBullets.sort((a, b) => a.severityRank - b.severityRank);

  // Cap at MAX_BULLETS.
  const bullets = triggeredBullets.slice(0, MAX_BULLETS);

  // Populate warning when coverage is thin.
  let warning: string | null = null;
  if (bullets.length < MIN_BULLETS_FOR_HEALTHY) {
    const factorWord = bullets.length === 1 ? "factor" : "factors";
    warning = `Pre-mortem coverage thin — only ${bullets.length} ${factorWord} above contribution threshold.`;
  }

  return {
    generatedAt: generatedAt.toISOString(),
    modelVersion: snapshot.modelVersion,
    warning,
    bullets,
  };
}

/**
 * Diagnostic: returns ALL bullets that would fire, ignoring the MAX_BULLETS
 * cap. Useful for cockpit debugging when an operator wants to see what was
 * left out.
 */
export function composePreMortemUncapped(input: ComposeInput): PreMortemBullet[] {
  const { snapshot, pick, game } = input;
  const triggered: PreMortemBullet[] = [];

  for (const template of FAILURE_MODE_TEMPLATES) {
    if (!template.triggerCondition(snapshot)) continue;
    triggered.push({
      factorKey: template.factorKey,
      severityRank: template.severityRank,
      text: template.generateBullet(snapshot, pick, game),
    });
  }

  triggered.sort((a, b) => a.severityRank - b.severityRank);
  return triggered;
}
