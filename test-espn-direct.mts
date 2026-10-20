/**
 * Direct ESPN injuries fetch test - bypass ingestible gate
 */

async function testEspnInjuries() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries";
  
  console.log("Fetching from:", url);
  const res = await fetch(url, {
    headers: { "User-Agent": "GalaxySportsEdge/1.0" },
  });
  
  console.log("Status:", res.status);
  
  const json = (await res.json()) as any;
  
  // Parse like the client does
  const teamMap = new Map<string, any[]>();
  const teams = json.injuries ?? [];
  
  console.log(`Found ${teams.length} teams with injury data`);
  
  // Sample a few teams
  let count = 0;
  for (const team of teams.slice(0, 3)) {
    const teamName = team.displayName || team.name || "";
    const injuryCount = team.injuries?.length || 0;
    
    console.log(`\n${teamName}: ${injuryCount} injured players`);
    
    if (injuryCount > 0) {
      team.injuries.slice(0, 2).forEach((inj: any) => {
        const athleteName = inj.athlete?.displayName || "Unknown";
        const position = inj.athlete?.position?.abbreviation || "?";
        const status = inj.status || "?";
        const comment = inj.shortComment || "";
        
        console.log(`  - ${athleteName} (${position}): ${status}`);
        console.log(`    ${comment}`);
      });
    }
    count++;
  }
  
  console.log(`\n✓ Verified ${count} teams with real ESPN injury data`);
}

testEspnInjuries().catch(console.error);
