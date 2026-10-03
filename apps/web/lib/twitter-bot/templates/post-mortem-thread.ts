/**
 * Twitter bot template: post-mortem thread (multi-post, losses only).
 *
 * Spec: docs/product/twitter-bot-voice-spec.md section "Free pick post-mortems (extended thread)"
 */

import type { PostMortemThreadInput, FactorKey } from "./types";

const FACTOR_FRIENDLY_NAMES: Record<FactorKey, string> = {
  consensus: "consensus",
  depth: "depth",
  edge: "edge",
  lineMovement: "line movement",
  volatility: "volatility",
  headToHead: "head-to-head",
  venueForm: "venue form",
  scheduleStress: "schedule stress",
  restAdvantage: "rest advantage",
  crossMarket: "cross-market",
  dataQuality: "data quality",
};

export function buildPostMortemThread(
  input: PostMortemThreadInput,
  publicUrl: string,
): string[] {
  const linkUrl = `${publicUrl}/room/${input.gameId}`;

  const post1 = `Settled ${input.pickLine} \u274C LOSS. Here's what the model saw and what it missed.`;

  const topFactorsLines = input.topFactorsAtPublish
    .slice(0, 3)
    .map((f) => `- ${FACTOR_FRIENDLY_NAMES[f.factor] ?? f.factor}: ${f.score.toFixed(2)}`)
    .join("\n");

  const post2 = `At publish, the heaviest signals were:\n${topFactorsLines}`;
  const post3 = `What changed: ${input.whatChanged}`;

  const missFactor = input.biggestMissFactor
    ? FACTOR_FRIENDLY_NAMES[input.biggestMissFactor] ?? input.biggestMissFactor
    : "the read";

  const post4 = `What we got wrong: the ${missFactor} signal ${input.oneLineCause ?? "misread the picture"}.`;
  const post5 = `What this updates: ${input.whatThisUpdates}`;
  const post6 = `Full breakdown + autopsy: ${linkUrl}`;

  return [post1, post2, post3, post4, post5, post6];
}
