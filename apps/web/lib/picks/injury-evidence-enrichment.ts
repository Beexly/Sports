/**
 * injury-evidence-enrichment.ts — Real ESPN Injury Evidence for Public Picks
 *
 * Fetches live ESPN injury data (NFL + NCAAF) and builds injuryEvidence objects
 * with actual player availability. Cached with short TTL (15 min) matching the
 * odds refresh cadence.
 *
 * Fail-closed: returns null if ESPN is unavailable, never fabricates data.
 * Trust level reflects ESPN source (0.85), not bootstrap confidence.
 */

import {
  fetchEspnInjuries,
  getTeamInjuries,
  buildPlayerAvailabilityEvidence,
} from "@sports/data-ingestion";
import type { EvidenceRecord } from "@sports/types";

/**
 * Enriches a pick with real injuryEvidence from ESPN by team name.
 * Returns the evidence object or null if not available.
 */
export async function enrichPickInjuryEvidence(
  homeTeam: string,
  awayTeam: string,
  sportKey: string,
  fetchedAt: Date = new Date(),
): Promise<EvidenceRecord | null> {
  try {
    // Fetch real ESPN injury data for the sport
    const injuryMap = await fetchEspnInjuries(sportKey);
    if (injuryMap.size === 0) {
      // No injury data available from ESPN
      return null;
    }

    // Get injury records for both teams
    const homeInjuries = getTeamInjuries(homeTeam, injuryMap);
    const awayInjuries = getTeamInjuries(awayTeam, injuryMap);

    // Merge the injury records
    const allInjuries = [...homeInjuries, ...awayInjuries];

    if (allInjuries.length === 0) {
      // No injured players for either team (injury data exists but no players listed)
      return null;
    }

    // Build the evidence record from merged injuries
    // Use the home team name for the evidence summary (pick context)
    const evidence = buildPlayerAvailabilityEvidence(
      `${homeTeam} vs ${awayTeam}`,
      allInjuries,
      fetchedAt,
    );

    return evidence;
  } catch (err) {
    // Fail closed: log but return null
    console.warn(
      `[injury-enrichment] Failed to enrich pick: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
