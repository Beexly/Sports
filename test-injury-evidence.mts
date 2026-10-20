/**
 * Test script to verify real ESPN injury data fetching
 * Run: node --loader tsx test-injury-evidence.mts
 */

import {
  fetchEspnInjuries,
  getTeamInjuries,
  buildPlayerAvailabilityEvidence,
} from "@sports/data-ingestion";

async function main() {
  console.log("Fetching live ESPN injury data...\n");

  // Fetch NFL injuries
  const nflInjuries = await fetchEspnInjuries("americanfootball_nfl");
  console.log(`NFL: Found ${nflInjuries.size} teams with injury data`);

  // Get a few teams and their injuries
  const teamsToCheck = ["Kansas City Chiefs", "Detroit Lions", "Buffalo Bills"];

  for (const teamName of teamsToCheck) {
    const injuries = getTeamInjuries(teamName, nflInjuries);
    console.log(`\n${teamName}: ${injuries.length} injured players`);

    if (injuries.length > 0) {
      injuries.slice(0, 3).forEach((inj) => {
        console.log(
          `  - ${inj.athleteName} (${inj.position}): ${inj.status} - ${inj.shortComment}`,
        );
      });
    }

    // Build evidence
    const evidence = buildPlayerAvailabilityEvidence(teamName, injuries, new Date());
    console.log(`  Evidence:`, JSON.stringify(evidence, null, 2));
  }

  // Also test NCAAF
  console.log("\n\n=== NCAAF ===");
  const ncaafInjuries = await fetchEspnInjuries("americanfootball_ncaaf");
  console.log(`NCAAF: Found ${ncaafInjuries.size} teams with injury data`);

  if (ncaafInjuries.size > 0) {
    const firstTeam = Array.from(ncaafInjuries.keys())[0];
    const teamRecords = ncaafInjuries.get(firstTeam);
    if (teamRecords) {
      console.log(
        `Sample team: ${teamRecords[0]?.teamName} with ${teamRecords.length} injuries`,
      );
    }
  }
}

main().catch(console.error);
