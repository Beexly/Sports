import { describe, expect, it } from "vitest";
import { FBS_CONFERENCE_TEAMS, resolveFbsTeam } from "../ncaaf-conference-map.js";

/**
 * Every FBS-side team that appeared in the live ESPN Week 2 (2026-09-10..09-13)
 * scoreboard (`groups=80`, dates 20260910/11/12/13, fetched 2026-09-09), by ESPN id
 * and displayName. The 37 opponents ESPN also listed on those boards (Villanova,
 * Richmond, Colgate, Norfolk State, ...) are FCS/D2 and deliberately excluded - this
 * table is scoped to FBS programs only, matching FBS_CONFERENCE_TEAMS.
 */
const WEEK_2_FBS_SIDE_TEAMS: ReadonlyArray<{ readonly espnId: string; readonly displayName: string }> = [
  { espnId: "2", displayName: "Auburn Tigers" },
  { espnId: "5", displayName: "UAB Blazers" },
  { espnId: "6", displayName: "South Alabama Jaguars" },
  { espnId: "8", displayName: "Arkansas Razorbacks" },
  { espnId: "9", displayName: "Arizona State Sun Devils" },
  { espnId: "12", displayName: "Arizona Wildcats" },
  { espnId: "16", displayName: "Sacramento State Hornets" },
  { espnId: "21", displayName: "San Diego State Aztecs" },
  { espnId: "23", displayName: "San José State Spartans" },
  { espnId: "25", displayName: "California Golden Bears" },
  { espnId: "26", displayName: "UCLA Bruins" },
  { espnId: "30", displayName: "USC Trojans" },
  { espnId: "36", displayName: "Colorado State Rams" },
  { espnId: "38", displayName: "Colorado Buffaloes" },
  { espnId: "41", displayName: "UConn Huskies" },
  { espnId: "48", displayName: "Delaware Blue Hens" },
  { espnId: "55", displayName: "Jacksonville State Gamecocks" },
  { espnId: "57", displayName: "Florida Gators" },
  { espnId: "58", displayName: "South Florida Bulls" },
  { espnId: "59", displayName: "Georgia Tech Yellow Jackets" },
  { espnId: "61", displayName: "Georgia Bulldogs" },
  { espnId: "62", displayName: "Hawai'i Rainbow Warriors" },
  { espnId: "66", displayName: "Iowa State Cyclones" },
  { espnId: "68", displayName: "Boise State Broncos" },
  { espnId: "84", displayName: "Indiana Hoosiers" },
  { espnId: "87", displayName: "Notre Dame Fighting Irish" },
  { espnId: "96", displayName: "Kentucky Wildcats" },
  { espnId: "97", displayName: "Louisville Cardinals" },
  { espnId: "98", displayName: "Western Kentucky Hilltoppers" },
  { espnId: "99", displayName: "LSU Tigers" },
  { espnId: "103", displayName: "Boston College Eagles" },
  { espnId: "113", displayName: "Massachusetts Minutemen" },
  { espnId: "120", displayName: "Maryland Terrapins" },
  { espnId: "127", displayName: "Michigan State Spartans" },
  { espnId: "130", displayName: "Michigan Wolverines" },
  { espnId: "135", displayName: "Minnesota Golden Gophers" },
  { espnId: "142", displayName: "Missouri Tigers" },
  { espnId: "145", displayName: "Ole Miss Rebels" },
  { espnId: "150", displayName: "Duke Blue Devils" },
  { espnId: "151", displayName: "East Carolina Pirates" },
  { espnId: "152", displayName: "NC State Wolfpack" },
  { espnId: "153", displayName: "North Carolina Tar Heels" },
  { espnId: "154", displayName: "Wake Forest Demon Deacons" },
  { espnId: "158", displayName: "Nebraska Cornhuskers" },
  { espnId: "164", displayName: "Rutgers Scarlet Knights" },
  { espnId: "166", displayName: "New Mexico State Aggies" },
  { espnId: "167", displayName: "New Mexico Lobos" },
  { espnId: "183", displayName: "Syracuse Orange" },
  { espnId: "189", displayName: "Bowling Green Falcons" },
  { espnId: "193", displayName: "Miami (OH) RedHawks" },
  { espnId: "194", displayName: "Ohio State Buckeyes" },
  { espnId: "195", displayName: "Ohio Bobcats" },
  { espnId: "197", displayName: "Oklahoma State Cowboys" },
  { espnId: "201", displayName: "Oklahoma Sooners" },
  { espnId: "202", displayName: "Tulsa Golden Hurricane" },
  { espnId: "204", displayName: "Oregon State Beavers" },
  { espnId: "213", displayName: "Penn State Nittany Lions" },
  { espnId: "218", displayName: "Temple Owls" },
  { espnId: "221", displayName: "Pittsburgh Panthers" },
  { espnId: "228", displayName: "Clemson Tigers" },
  { espnId: "235", displayName: "Memphis Tigers" },
  { espnId: "238", displayName: "Vanderbilt Commodores" },
  { espnId: "239", displayName: "Baylor Bears" },
  { espnId: "242", displayName: "Rice Owls" },
  { espnId: "245", displayName: "Texas A&M Aggies" },
  { espnId: "248", displayName: "Houston Cougars" },
  { espnId: "249", displayName: "North Texas Mean Green" },
  { espnId: "251", displayName: "Texas Longhorns" },
  { espnId: "252", displayName: "BYU Cougars" },
  { espnId: "254", displayName: "Utah Utes" },
  { espnId: "256", displayName: "James Madison Dukes" },
  { espnId: "258", displayName: "Virginia Cavaliers" },
  { espnId: "259", displayName: "Virginia Tech Hokies" },
  { espnId: "264", displayName: "Washington Huskies" },
  { espnId: "265", displayName: "Washington State Cougars" },
  { espnId: "275", displayName: "Wisconsin Badgers" },
  { espnId: "276", displayName: "Marshall Thundering Herd" },
  { espnId: "277", displayName: "West Virginia Mountaineers" },
  { espnId: "278", displayName: "Fresno State Bulldogs" },
  { espnId: "290", displayName: "Georgia Southern Eagles" },
  { espnId: "295", displayName: "Old Dominion Monarchs" },
  { espnId: "309", displayName: "Louisiana Ragin' Cajuns" },
  { espnId: "324", displayName: "Coastal Carolina Chanticleers" },
  { espnId: "326", displayName: "Texas State Bobcats" },
  { espnId: "328", displayName: "Utah State Aggies" },
  { espnId: "333", displayName: "Alabama Crimson Tide" },
  { espnId: "338", displayName: "Kennesaw State Owls" },
  { espnId: "344", displayName: "Mississippi State Bulldogs" },
  { espnId: "349", displayName: "Army Black Knights" },
  { espnId: "356", displayName: "Illinois Fighting Illini" },
  { espnId: "2005", displayName: "Air Force Falcons" },
  { espnId: "2006", displayName: "Akron Zips" },
  { espnId: "2026", displayName: "App State Mountaineers" },
  { espnId: "2032", displayName: "Arkansas State Red Wolves" },
  { espnId: "2050", displayName: "Ball State Cardinals" },
  { espnId: "2084", displayName: "Buffalo Bulls" },
  { espnId: "2116", displayName: "UCF Knights" },
  { espnId: "2117", displayName: "Central Michigan Chippewas" },
  { espnId: "2132", displayName: "Cincinnati Bearcats" },
  { espnId: "2199", displayName: "Eastern Michigan Eagles" },
  { espnId: "2226", displayName: "Florida Atlantic Owls" },
  { espnId: "2229", displayName: "Florida International Panthers" },
  { espnId: "2247", displayName: "Georgia State Panthers" },
  { espnId: "2294", displayName: "Iowa Hawkeyes" },
  { espnId: "2305", displayName: "Kansas Jayhawks" },
  { espnId: "2306", displayName: "Kansas State Wildcats" },
  { espnId: "2309", displayName: "Kent State Golden Flashes" },
  { espnId: "2335", displayName: "Liberty Flames" },
  { espnId: "2348", displayName: "Louisiana Tech Bulldogs" },
  { espnId: "2390", displayName: "Miami Hurricanes" },
  { espnId: "2393", displayName: "Middle Tennessee Blue Raiders" },
  { espnId: "2426", displayName: "Navy Midshipmen" },
  { espnId: "2429", displayName: "Charlotte 49ers" },
  { espnId: "2433", displayName: "UL Monroe Warhawks" },
  { espnId: "2439", displayName: "UNLV Rebels" },
  { espnId: "2440", displayName: "Nevada Wolf Pack" },
  { espnId: "2449", displayName: "North Dakota State Bison" },
  { espnId: "2459", displayName: "Northern Illinois Huskies" },
  { espnId: "2483", displayName: "Oregon Ducks" },
  { espnId: "2509", displayName: "Purdue Boilermakers" },
  { espnId: "2534", displayName: "Sam Houston Bearkats" },
  { espnId: "2567", displayName: "SMU Mustangs" },
  { espnId: "2572", displayName: "Southern Miss Golden Eagles" },
  { espnId: "2579", displayName: "South Carolina Gamecocks" },
  { espnId: "2623", displayName: "Missouri State Bears" },
  { espnId: "2628", displayName: "TCU Horned Frogs" },
  { espnId: "2633", displayName: "Tennessee Volunteers" },
  { espnId: "2636", displayName: "UTSA Roadrunners" },
  { espnId: "2638", displayName: "UTEP Miners" },
  { espnId: "2641", displayName: "Texas Tech Red Raiders" },
  { espnId: "2649", displayName: "Toledo Rockets" },
  { espnId: "2653", displayName: "Troy Trojans" },
  { espnId: "2655", displayName: "Tulane Green Wave" },
  { espnId: "2711", displayName: "Western Michigan Broncos" },
  { espnId: "2751", displayName: "Wyoming Cowboys" },
];

describe("FBS_CONFERENCE_TEAMS (ledger C-176)", () => {
  it("has no duplicate ESPN ids, slugs, or display/short names", () => {
    const ids = FBS_CONFERENCE_TEAMS.map((t) => t.espnId);
    const slugs = FBS_CONFERENCE_TEAMS.map((t) => t.slug);
    const names = FBS_CONFERENCE_TEAMS.flatMap((t) =>
      t.shortDisplayName === t.displayName ? [t.displayName] : [t.displayName, t.shortDisplayName],
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers all 11 live FBS conferences plus the independents body", () => {
    const conferences = new Set(FBS_CONFERENCE_TEAMS.map((t) => t.conferenceName));
    expect(conferences.size).toBe(11);
    expect(conferences.has("FBS Independents")).toBe(true);
    expect(FBS_CONFERENCE_TEAMS.length).toBe(138);
  });

  it("resolves every FBS-side Week 2 fixture team by ESPN id", () => {
    for (const team of WEEK_2_FBS_SIDE_TEAMS) {
      const resolved = resolveFbsTeam(team.espnId);
      expect(resolved, `espnId ${team.espnId} (${team.displayName})`).not.toBeNull();
      expect(resolved?.displayName).toBe(team.displayName);
    }
  });

  it("resolves every FBS-side Week 2 fixture team by its own displayName", () => {
    for (const team of WEEK_2_FBS_SIDE_TEAMS) {
      const resolved = resolveFbsTeam(team.displayName);
      expect(resolved, `displayName ${team.displayName}`).not.toBeNull();
      expect(resolved?.espnId).toBe(team.espnId);
    }
  });

  it("returns null rather than a guess for an unknown identifier (FCS opponent, not fabricated)", () => {
    // Villanova Wildcats (espnId 222) is FCS and appeared on the live FBS-grouped board
    // as an opponent; it must never resolve as if it were an FBS program.
    expect(resolveFbsTeam("222")).toBeNull();
    expect(resolveFbsTeam("Villanova Wildcats")).toBeNull();
    expect(resolveFbsTeam("not-a-real-team")).toBeNull();
  });

  it("does not let prefix similarity resolve the wrong program (game-identity.ts lesson)", () => {
    const texas = resolveFbsTeam("Texas Longhorns");
    const texasTech = resolveFbsTeam("Texas Tech Red Raiders");
    expect(texas?.espnId).not.toBe(texasTech?.espnId);
    const miami = resolveFbsTeam("Miami Hurricanes");
    const miamiOh = resolveFbsTeam("Miami (OH) RedHawks");
    expect(miami?.espnId).not.toBe(miamiOh?.espnId);
    const washington = resolveFbsTeam("Washington Huskies");
    const washingtonState = resolveFbsTeam("Washington State Cougars");
    expect(washington?.espnId).not.toBe(washingtonState?.espnId);
  });

  it("never fabricates a cfbdId", () => {
    expect(FBS_CONFERENCE_TEAMS.every((t) => t.cfbdId === null)).toBe(true);
  });
});

