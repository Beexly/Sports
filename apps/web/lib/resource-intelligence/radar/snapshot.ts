/**
 * R&D Radar — committed snapshot access.
 *
 * The snapshot is a build artifact of scripts/resource-radar-import.mjs run
 * against a founder-verified CSV (docs/rnd/radar-snapshots/). It is committed
 * so unit tests and the cockpit read identical bytes: no network fetch, no
 * drift between environments. Every observation is preserved raw — the
 * pipeline dedupes into dossiers but never discards an observation.
 */

import type { RadarSnapshot, RepoRadarObservation, RadarWindow, RadarRisk, RadarPosture, RadarSourceKind } from "./types";
// latest.json is the runtime pointer: the import script rewrites it on every
// import (alongside an immutable dated copy), so a new founder snapshot goes
// live without editing this file. (Codex P2 on #76.)
import latestSnapshot from "./generated/latest.json";

const WINDOWS: readonly RadarWindow[] = ["daily", "weekly", "monthly", "targeted"];
const RISKS: readonly RadarRisk[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKED"];
const POSTURES: readonly RadarPosture[] = [
  "OBSERVE", "REFERENCE_ONLY", "ADOPT_PATTERNS", "PROTOTYPE",
  "PILOT", "OWNER_REVIEW", "QUARANTINE", "REJECT",
];
const SOURCE_KINDS: readonly RadarSourceKind[] = [
  "GITHUB_TRENDING", "PRIMARY_REPO", "OWNER_SCREENSHOT", "MANUAL",
];

/**
 * Runtime validation — the fixture is data, so it gets checked like data.
 * Enum fields are checked against the closed sets: the JSON cast cannot
 * catch a hand-edited "BLOCKED_RIGHTS", and the policy caps exact values
 * only, so an unknown label failing loud here is what keeps the hard caps
 * un-skippable.
 */
export function validateSnapshot(s: RadarSnapshot): string[] {
  const problems: string[] = [];
  if (s.schemaVersion !== 1) problems.push(`unknown schemaVersion ${String(s.schemaVersion)}`);
  if (s.observationCount !== s.observations.length) {
    problems.push(`observationCount ${s.observationCount} != observations.length ${s.observations.length}`);
  }
  const seen = new Set<string>();
  for (const o of s.observations) {
    if (!WINDOWS.includes(o.window)) problems.push(`${o.id}: bad window`);
    if (!RISKS.includes(o.risk)) problems.push(`${o.id}: unknown risk "${o.risk}"`);
    if (!POSTURES.includes(o.normalizedPosture)) problems.push(`${o.id}: unknown posture "${o.normalizedPosture}"`);
    if (!SOURCE_KINDS.includes(o.sourceKind)) problems.push(`${o.id}: unknown sourceKind "${o.sourceKind}"`);
    if (o.id !== `${o.window}:${o.normalizedRepository}`) problems.push(`${o.id}: id mismatch`);
    if (seen.has(o.id)) problems.push(`${o.id}: duplicate observation id`);
    seen.add(o.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.observedAt)) problems.push(`${o.id}: bad observedAt`);
  }
  return problems;
}

/** The current committed snapshot (latest import wins; history stays in git). */
export const RADAR_SNAPSHOT: RadarSnapshot = latestSnapshot as RadarSnapshot;

export function getObservations(): readonly RepoRadarObservation[] {
  return RADAR_SNAPSHOT.observations;
}
