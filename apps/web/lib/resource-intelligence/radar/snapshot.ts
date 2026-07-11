/**
 * R&D Radar — committed snapshot access.
 *
 * The snapshot is a build artifact of scripts/resource-radar-import.mjs run
 * against a founder-verified CSV (docs/rnd/radar-snapshots/). It is committed
 * so unit tests and the cockpit read identical bytes: no network fetch, no
 * drift between environments. Every observation is preserved raw — the
 * pipeline dedupes into dossiers but never discards an observation.
 */

import type { RadarSnapshot, RepoRadarObservation, RadarWindow } from "./types";
import snapshot20260711 from "./generated/2026-07-11.json";

const WINDOWS: readonly RadarWindow[] = ["daily", "weekly", "monthly", "targeted"];

/** Runtime validation — the fixture is data, so it gets checked like data. */
export function validateSnapshot(s: RadarSnapshot): string[] {
  const problems: string[] = [];
  if (s.schemaVersion !== 1) problems.push(`unknown schemaVersion ${String(s.schemaVersion)}`);
  if (s.observationCount !== s.observations.length) {
    problems.push(`observationCount ${s.observationCount} != observations.length ${s.observations.length}`);
  }
  const seen = new Set<string>();
  for (const o of s.observations) {
    if (!WINDOWS.includes(o.window)) problems.push(`${o.id}: bad window`);
    if (o.id !== `${o.window}:${o.normalizedRepository}`) problems.push(`${o.id}: id mismatch`);
    if (seen.has(o.id)) problems.push(`${o.id}: duplicate observation id`);
    seen.add(o.id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.observedAt)) problems.push(`${o.id}: bad observedAt`);
  }
  return problems;
}

/** The current committed snapshot (latest import wins; history stays in git). */
export const RADAR_SNAPSHOT: RadarSnapshot = snapshot20260711 as RadarSnapshot;

export function getObservations(): readonly RepoRadarObservation[] {
  return RADAR_SNAPSHOT.observations;
}
