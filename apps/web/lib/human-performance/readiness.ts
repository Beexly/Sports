/**
 * Biomechanics / movement-modeling readiness — a SCAFFOLD, not live claims.
 *
 * This sets the frame honestly: it reports the capability state of each
 * movement/biomech signal (not-built / r&d / admin-only / live) and whether
 * the rights to run it are cleared. No public player biomechanics render until
 * rights + license + validation exist. OpenPose is excluded (non-commercial
 * license); we prefer MediaPipe / MMPose (Apache-2.0) on rights-clean video.
 * Vendor athlete platforms (Kitman/Zone7/Catapult/VALD) are admin-only,
 * partnership-gated, and never surfaced publicly.
 */

import type { BiomechCapability } from "./types";

export const BIOMECH_READINESS: readonly BiomechCapability[] = [
  { capability: "Pose estimation (MediaPipe / MMPose, Apache-2.0)", status: "r&d", rightsCleared: false, note: "Permissively licensed pose tooling exists, but running it needs video we have the rights to. R&D only." },
  { capability: "Movement quality / jump-land-cut-sprint", status: "not-built", rightsCleared: false, note: "Requires a validated pose pipeline on rights-clean video. Not built." },
  { capability: "Gait / change-of-direction proxies", status: "not-built", rightsCleared: false, note: "Future-facing; depends on the movement pipeline above." },
  { capability: "Video player tracking & spacing", status: "r&d", rightsCleared: false, note: "Open trackers exist (per-repo license verification required); broadcast footage cannot be ingested wholesale." },
  { capability: "Accel / decel & workload proxies", status: "not-built", rightsCleared: false, note: "No rights-clean source today; would be modeled + clearly tiered if added." },
  { capability: "Return-to-play uncertainty modeling", status: "not-built", rightsCleared: false, note: "Would express uncertainty only — never a medical prognosis." },
  { capability: "Vendor athlete load/medical (Kitman/Zone7/Catapult/VALD)", status: "admin-only", rightsCleared: false, note: "Proprietary, club-licensed athlete data. Partnership-gated, never scraped, never public." },
  { capability: "3D digital-twin rendering (three.js / Babylon, MIT/Apache)", status: "r&d", rightsCleared: true, note: "Visualization only on permissive licenses — implies no data we don't have." },
];

export interface BiomechReadinessReport {
  readonly generatedAt: string;
  readonly capabilities: readonly BiomechCapability[];
  readonly liveCount: number;
  readonly note: string;
}

export function loadBiomechReadiness(): BiomechReadinessReport {
  const liveCount = BIOMECH_READINESS.filter((c) => c.status === "live").length;
  return {
    generatedAt: new Date().toISOString(),
    capabilities: BIOMECH_READINESS,
    liveCount,
    note:
      "Movement/biomechanics modeling is reported honestly by capability state. Nothing here makes a public claim about a player's body. Live signals require cleared video rights, a permissive license, and validation — until then each capability reads not-built / R&D / admin-only.",
  };
}
