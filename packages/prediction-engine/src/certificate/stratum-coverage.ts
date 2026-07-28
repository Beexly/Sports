/**
 * Stratum coverage helpers — sport|pickType|modelVersion floors.
 * Aligns with airwave / Phase C sample floor philosophy (n≥100 product floor).
 */

export type StratumParts = {
  sport: string;
  pickType: string;
  modelVersion: string;
};

export function stratumKey(parts: StratumParts): string {
  return `${parts.sport}|${parts.pickType}|${parts.modelVersion}`;
}

export function parseStratumKey(key: string): StratumParts | null {
  const bits = key.split("|");
  if (bits.length !== 3) return null;
  const [sport, pickType, modelVersion] = bits;
  if (!sport || !pickType || !modelVersion) return null;
  return { sport, pickType, modelVersion };
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
  floor = 100,
): StratumCoverage {
  const meetsFloor = Number.isFinite(n) && n >= floor;
  return { key, n, floor, meetsFloor };
}

/** Empty or sub-floor stratum → refuse FIRE */
export function refuseIfEmptyStratum(
  key: string,
  n: number,
  floor = 100,
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
  floor = 100,
): StratumCoverage[] {
  return rows
    .map((r) => coverageFor(r.key, r.n, floor))
    .filter((c) => c.meetsFloor)
    .sort((a, b) => b.n - a.n);
}
