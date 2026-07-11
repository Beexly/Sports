/**
 * R&D Radar — Adoption Dossiers.
 *
 * One dossier per normalized repository, merging every window it appeared in.
 * Merging is conservative: the most restrictive posture wins, the highest
 * risk wins, and the policy caps are applied AFTER the merge so a repo that
 * looks tame in one window can never launder a blocked observation.
 */

import type { AdoptionDossier, RepoRadarObservation, RadarWindow } from "./types";
import { displayName } from "./normalize";
import {
  effectiveDisposition,
  highestRisk,
  isLicenseVerified,
  mostRestrictivePosture,
  whyNotReady,
  RADAR_FRESHNESS_DAYS,
} from "./policy";
import { scoreObservation } from "./score";

const WINDOW_ORDER: readonly RadarWindow[] = ["daily", "weekly", "monthly", "targeted"];

/** Days between two YYYY-MM-DD dates (UTC, deterministic). */
function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)), Number(fromIso.slice(5, 7)) - 1, Number(fromIso.slice(8, 10))
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)), Number(toIso.slice(5, 7)) - 1, Number(toIso.slice(8, 10))
  );
  return Math.floor((to - from) / 86_400_000);
}

/**
 * Build dossiers from raw observations. `asOfDate` (YYYY-MM-DD) drives
 * staleness deterministically — callers pass a real date; tests pass fixed
 * ones. No clock is read here.
 */
export function buildDossiers(
  observations: readonly RepoRadarObservation[],
  asOfDate: string
): readonly AdoptionDossier[] {
  const byRepo = new Map<string, RepoRadarObservation[]>();
  for (const o of observations) {
    const list = byRepo.get(o.normalizedRepository) ?? [];
    list.push(o);
    byRepo.set(o.normalizedRepository, list);
  }

  const dossiers: AdoptionDossier[] = [];
  for (const [repo, obs] of byRepo) {
    const sorted = [...obs].sort(
      (a, b) => WINDOW_ORDER.indexOf(a.window) - WINDOW_ORDER.indexOf(b.window)
    );
    const posture = mostRestrictivePosture(sorted.map((o) => o.normalizedPosture));
    const risk = highestRisk(sorted.map((o) => o.risk));
    // License: prefer a verified value if ANY observation carries one —
    // otherwise keep the first non-null string (still unverified).
    const license =
      sorted.map((o) => o.license).find((l) => isLicenseVerified(l)) ??
      sorted.map((o) => o.license).find((l) => l !== null) ??
      null;
    // Score the strongest-evidence observation (facts beat gaps): the one
    // with the most non-null numeric fields, ties broken by window order.
    const scored = sorted
      .map((o) => ({ o, filled: (o.totalStars === null ? 0 : 1) + (o.trendGain === null ? 0 : 1) }))
      .sort((a, b) => b.filled - a.filled)[0]!.o;
    const newestObservedAt = sorted.reduce(
      (max, o) => (o.observedAt > max ? o.observedAt : max),
      sorted[0]!.observedAt
    );

    dossiers.push({
      normalizedRepository: repo,
      displayName: displayName(repo),
      windows: [...new Set(sorted.map((o) => o.window))],
      observations: sorted,
      posture,
      risk,
      license,
      licenseUnverified: !isLicenseVerified(license),
      effectiveDisposition: effectiveDisposition(posture, risk, license),
      whyRelevant: scored.gseMapping,
      whyNotReady: whyNotReady(posture, risk, license, scored.sourceKind),
      score: scoreObservation(scored),
      stale: daysBetween(newestObservedAt, asOfDate) > RADAR_FRESHNESS_DAYS,
      sourceKinds: [...new Set(sorted.map((o) => o.sourceKind))],
    });
  }

  // Most actionable first; blocked/quarantined sink. Deterministic tiebreak.
  const dispositionRank: Record<string, number> = {
    prototype: 0,
    approved_internal_reference: 1,
    roadmap: 2,
    owner_review: 3,
    rejected_noise: 4,
    quarantine: 5,
    approved_direct: 6, // unreachable from radar policy; sorted last defensively
  };
  return dossiers.sort(
    (a, b) =>
      (dispositionRank[a.effectiveDisposition] ?? 9) - (dispositionRank[b.effectiveDisposition] ?? 9) ||
      b.score.total - a.score.total ||
      a.normalizedRepository.localeCompare(b.normalizedRepository)
  );
}
