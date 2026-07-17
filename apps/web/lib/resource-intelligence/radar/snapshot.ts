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
 * Real calendar validation — NOT shape-only. Mirrors
 * scripts/resource-radar-import.mjs's isValidCalendarDate EXACTLY (same
 * round-trip logic, duplicated because the importer is a plain Node script
 * and this module is TypeScript compiled into the app). `2026-99-99` and
 * `2026-02-30` both match `/^\d{4}-\d{2}-\d{2}$/` but are not real dates:
 * unchecked, Date.UTC() silently NORMALIZES an out-of-range month/day into a
 * real (often far-future) date instead of rejecting it, which is exactly how
 * a shape-only check let a bogus observedAt reach dossier.ts's Date.UTC-based
 * staleness math and made a dossier read as "not stale" forever. Round-trip
 * through Date.UTC and require every parsed field to equal the field fed in.
 */
function isValidCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

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
  if (!isValidCalendarDate(s.observedAt)) problems.push(`snapshot: bad observedAt "${s.observedAt}"`);
  const seen = new Set<string>();
  for (const o of s.observations) {
    if (!WINDOWS.includes(o.window)) problems.push(`${o.id}: bad window`);
    if (!RISKS.includes(o.risk)) problems.push(`${o.id}: unknown risk "${o.risk}"`);
    if (!POSTURES.includes(o.normalizedPosture)) problems.push(`${o.id}: unknown posture "${o.normalizedPosture}"`);
    if (!SOURCE_KINDS.includes(o.sourceKind)) problems.push(`${o.id}: unknown sourceKind "${o.sourceKind}"`);
    if (o.id !== `${o.window}:${o.normalizedRepository}`) problems.push(`${o.id}: id mismatch`);
    if (seen.has(o.id)) problems.push(`${o.id}: duplicate observation id`);
    seen.add(o.id);
    if (!isValidCalendarDate(o.observedAt)) problems.push(`${o.id}: bad observedAt "${o.observedAt}"`);
  }
  return problems;
}

/** The current committed snapshot (latest import wins; history stays in git). */
export const RADAR_SNAPSHOT: RadarSnapshot = latestSnapshot as RadarSnapshot;

/**
 * Validated ONCE at module load (G-3: validateSnapshot used to exist but was
 * never called at runtime, so a hand-edited fixture flowed straight into the
 * policy caps). Non-empty problems make getObservations throw — the radar is
 * admin-only and flag-gated, so a corrupt committed snapshot surfaces as a
 * loud error state, never as a quietly-mislabeled feed.
 */
const SNAPSHOT_PROBLEMS: readonly string[] = validateSnapshot(RADAR_SNAPSHOT);

export function getObservations(): readonly RepoRadarObservation[] {
  if (SNAPSHOT_PROBLEMS.length > 0) {
    throw new Error(
      `Radar snapshot failed validation (fail-closed): ${SNAPSHOT_PROBLEMS.join("; ")}`
    );
  }
  return RADAR_SNAPSHOT.observations;
}
