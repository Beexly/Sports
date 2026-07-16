/**
 * R&D Radar — feed builder (what the cockpit surface and API read).
 *
 * Gated-leak invariant, inherited from resource-intelligence and enforced
 * here structurally: owner_review and quarantine dossiers contribute COUNTS
 * to the feed and appear in the read-only dossier table with their blocks
 * spelled out — they can never appear in `recommendedExperiments`, the only
 * action-shaped list this feed emits.
 */

import type { AdoptionDossier, RadarFeed, RadarPosture, RadarWindow } from "./types";
import type { ResourceDisposition } from "../types";
import { GATED_DISPOSITIONS } from "../types";
import { buildDossiers } from "./dossier";
import { getObservations, RADAR_SNAPSHOT } from "./snapshot";

const GATED: readonly ResourceDisposition[] = GATED_DISPOSITIONS;

function isGated(d: AdoptionDossier): boolean {
  return GATED.includes(d.effectiveDisposition);
}

/** The experiment is always a bounded, no-install action. */
function experimentFor(d: AdoptionDossier): string {
  if (d.posture === "ADOPT_PATTERNS") {
    return "Mine the pattern into a GSE-native module (no dependency): write the design note, then implement behind existing conventions.";
  }
  if (d.posture === "PROTOTYPE" || d.posture === "PILOT") {
    return "Draft an adoption dossier for owner review: license evidence, scan plan, sandboxed smoke test, rollback. No install before approval.";
  }
  return "Track only: re-verify on the next snapshot import.";
}

export function buildRadarFeed(asOfDate: string): RadarFeed {
  const observations = getObservations();
  const dossiers = buildDossiers(observations, asOfDate);

  const byWindow: Record<RadarWindow, number> = { daily: 0, weekly: 0, monthly: 0, targeted: 0 };
  for (const o of observations) byWindow[o.window] += 1;

  const byPosture: Record<RadarPosture, number> = {
    OBSERVE: 0, REFERENCE_ONLY: 0, ADOPT_PATTERNS: 0, PROTOTYPE: 0,
    PILOT: 0, OWNER_REVIEW: 0, QUARANTINE: 0, REJECT: 0,
  };
  for (const d of dossiers) byPosture[d.posture] += 1;

  const recommendedExperiments = dossiers
    .filter((d) => !isGated(d))
    .filter((d) => !d.stale)
    .filter((d) => !d.score.blockedOverride)
    .filter((d) => d.posture === "ADOPT_PATTERNS" || d.posture === "PROTOTYPE" || d.posture === "PILOT")
    .map((d) => ({
      normalizedRepository: d.normalizedRepository,
      displayName: d.displayName,
      posture: d.posture,
      experiment: experimentFor(d),
      scoreTotal: d.score.total,
    }));

  return {
    snapshotDate: RADAR_SNAPSHOT.observedAt,
    sourceSha256: RADAR_SNAPSHOT.sourceSha256,
    totalObservations: observations.length,
    totalDossiers: dossiers.length,
    byWindow,
    byPosture,
    gatedCounts: {
      ownerReview: dossiers.filter((d) => d.effectiveDisposition === "owner_review").length,
      quarantine: dossiers.filter((d) => d.effectiveDisposition === "quarantine").length,
    },
    recommendedExperiments,
    staleDossiers: dossiers.filter((d) => d.stale).map((d) => d.normalizedRepository),
    dossiers,
  };
}
