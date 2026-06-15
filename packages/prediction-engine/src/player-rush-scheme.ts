/**
 * Run-scheme lean from play-by-play run direction. Pure and db-free.
 *
 * Honest scope: this is a DIRECTION proxy from public PBP (run_gap: guard=
 * interior, tackle=off-tackle, end=edge; run_location), not charted blocking
 * scheme. A high interior share leans gap/power; a high edge share leans
 * outside/zone. Real zone-vs-gap labelling needs charting we don't license.
 */

export interface RushDirectionCounts {
  readonly runs: number;
  readonly guardRuns: number; // interior (A/B gap)
  readonly tackleRuns: number; // off-tackle (C gap)
  readonly endRuns: number; // edge
  readonly leftRuns: number;
  readonly middleRuns: number;
  readonly rightRuns: number;
}

export interface RushSchemeProfile {
  readonly runs: number;
  readonly interiorRate: number;
  readonly offTackleRate: number;
  readonly edgeRate: number;
  readonly perimeterRate: number; // (left + right) / runs
  readonly scheme: "interior/power" | "outside/zone" | "off-tackle" | "balanced" | "low-sample";
}

function rate(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 1000 : 0;
}

export function classifyRushScheme(c: RushDirectionCounts): RushSchemeProfile {
  const runs = c.runs;
  const interiorRate = rate(c.guardRuns, runs);
  const offTackleRate = rate(c.tackleRuns, runs);
  const edgeRate = rate(c.endRuns, runs);
  const perimeterRate = rate(c.leftRuns + c.rightRuns, runs);

  let scheme: RushSchemeProfile["scheme"];
  if (runs < 20) scheme = "low-sample";
  else if (edgeRate >= 0.3) scheme = "outside/zone";
  else if (interiorRate >= 0.45) scheme = "interior/power";
  else if (offTackleRate >= 0.45) scheme = "off-tackle";
  else scheme = "balanced";

  return { runs, interiorRate, offTackleRate, edgeRate, perimeterRate, scheme };
}
