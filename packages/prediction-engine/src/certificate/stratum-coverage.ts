/**
 * Stratum coverage helpers — sport|pickType|modelVersion floors,
 * optional side dimension, parent roll-up.
 *
 * This module already existed. Do not rebuild it. Side and parentOf
 * extend the same key. Physical relocate to packages/types is BLOCKED
 * (see BINDING note at bottom): the engine barrel re-exports this
 * path and live certificates / golden hashes use 3-part keys.
 *
 * Aligns with airwave / Phase C sample floor philosophy (n≥100 product floor).
 */

import { DEFAULT_MIN_CALIBRATION_SAMPLE } from "@sports/types";

export type StratumParts = {
  sport: string;
  pickType: string;
  modelVersion: string;
  /** Optional side dimension (HOME/AWAY/OVER/UNDER/...). Absent on parent keys. */
  side?: string;
};

export function stratumKey(parts: StratumParts): string {
  const base = `${parts.sport}|${parts.pickType}|${parts.modelVersion}`;
  if (parts.side) return `${base}|${parts.side}`;
  return base;
}

export function parseStratumKey(key: string): StratumParts | null {
  const bits = key.split("|");
  if (bits.length === 3) {
    const [sport, pickType, modelVersion] = bits;
    if (!sport || !pickType || !modelVersion) return null;
    return { sport, pickType, modelVersion };
  }
  if (bits.length === 4) {
    const [sport, pickType, modelVersion, side] = bits;
    if (!sport || !pickType || !modelVersion || !side) return null;
    return { sport, pickType, modelVersion, side };
  }
  return null;
}

/**
 * Parent of a side-qualified key is the 3-part sport|pickType|modelVersion
 * key. A key that is already a parent has no parent.
 */
export function parentOf(key: string): string | null {
  const parts = parseStratumKey(key);
  if (!parts?.side) return null;
  return stratumKey({
    sport: parts.sport,
    pickType: parts.pickType,
    modelVersion: parts.modelVersion,
  });
}

export interface StratumCoverage {
  key: string;
  n: number;
  floor: number;
  meetsFloor: boolean;
}

export function coverageFor(
  key: string,
  n: number,
  floor = DEFAULT_MIN_CALIBRATION_SAMPLE,
): StratumCoverage {
  const meetsFloor = Number.isFinite(n) && n >= floor;
  return { key, n, floor, meetsFloor };
}

/** Empty or sub-floor stratum → refuse FIRE */
export function refuseIfEmptyStratum(
  key: string,
  n: number,
  floor = DEFAULT_MIN_CALIBRATION_SAMPLE,
): {
  refuse: boolean;
  reason: "INSUFFICIENT_SAMPLE" | null;
  coverage: StratumCoverage;
} {
  const coverage = coverageFor(key, n, floor);
  if (!coverage.meetsFloor) {
    return { refuse: true, reason: "INSUFFICIENT_SAMPLE", coverage };
  }
  return { refuse: false, reason: null, coverage };
}

/** Phase C style: list only strata meeting floor */
export function floorStrata(
  rows: Array<{ key: string; n: number }>,
  floor = DEFAULT_MIN_CALIBRATION_SAMPLE,
): StratumCoverage[] {
  return rows
    .map((r) => coverageFor(r.key, r.n, floor))
    .filter((c) => c.meetsFloor)
    .sort((a, b) => b.n - a.n);
}

/**
 * RELOCATION BLOCKED, not forked.
 * Moving this file to packages/types/src would be the "boundary both sides
 * cross" home, but:
 *   - packages/prediction-engine/src/certificate/index.ts re-exports
 *     ./stratum-coverage.js
 *   - certificate-modules.test.ts imports the relative path
 *   - live DecisionCertificate.stratumKey values and the golden contentHash
 *     are 3-part keys; a relocate that changed parse arity would invalidate
 *     them
 * A second module with the same name is the rebuild-what-exists failure.
 * Extend here. Relocate only with a same-path re-export and a founder call.
 */
