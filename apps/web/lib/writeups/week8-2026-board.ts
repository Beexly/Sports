/**
 * 2026 NFL Week 8 board — Bound to 18,738 2026 W1–W7 plays + 5-Stage GSE Engine Verdicts.
 */

export type Week8WindowSlot = 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SNF' | 'MNF';

export interface Week8BoardCard {
  id: string;
  espnEventId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  awayAbbr: string;
  homeAbbr: string;
  kickoff: string;
  windowSlot: Week8WindowSlot;
  postedDetails: string;
  postedTotal: number;
  scoreboardStatus: string;
  publication: 'PLAY' | 'PASS';
  passReason: string;
}

export const LIVE_WEEK8_2026_BOARD: readonly Week8BoardCard[] = [
  {
    "id": "board-2026-w8-401873023",
    "espnEventId": "401873023",
    "matchup": "Washington Commanders @ Kansas City Chiefs",
    "awayTeam": "Washington Commanders",
    "homeTeam": "Kansas City Chiefs",
    "awayAbbr": "WAS",
    "homeAbbr": "KC",
    "kickoff": "2026-11-03T01:15Z",
    "windowSlot": "TNF",
    "postedDetails": "KC -10.5",
    "postedTotal": 47.5,
    "scoreboardStatus": "Monday 8:15 PM ET · Week 8 MNF Spotlight",
    "publication": "PLAY",
    "passReason": "Week 8 Monday night at Arrowhead. TNF official card is 14-6 with 1 split. The old 31-11 banner is retracted.",
  },
  {
    "id": "board-2026-w8-401873026",
    "espnEventId": "401873026",
    "matchup": "Baltimore Ravens @ Buffalo Bills",
    "awayTeam": "Baltimore Ravens",
    "homeTeam": "Buffalo Bills",
    "awayAbbr": "BAL",
    "homeAbbr": "BUF",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "BUF -3",
    "postedTotal": 54.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PLAY",
    "passReason": "Josh Allen and Lamar Jackson headline the Sunday afternoon slate against a Baltimore secondary missing cornerback T.J. Tampa and safety Jaylinn Hawkins. Both offenses can strike quickly from anywhere on the field \u2014 unlock the pack to see our official side call, total call, and player props for Ravens at Bills."
  },
  {
    "id": "board-2026-w8-401873031",
    "espnEventId": "401873031",
    "matchup": "Tennessee Titans @ Cincinnati Bengals",
    "awayTeam": "Tennessee Titans",
    "homeTeam": "Cincinnati Bengals",
    "awayAbbr": "TEN",
    "homeAbbr": "CIN",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "CIN -11.5",
    "postedTotal": 46.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PASS",
    "passReason": "Cincinnati's downfield passing game tests a physical Tennessee front that wants to slow the game down and lean on the run. With a double-digit spread on the board at Paycor Stadium, fourth-quarter game script matters everything here \u2014 our official side and total calls are locked inside."
  },
  {
    "id": "board-2026-w8-401873024",
    "espnEventId": "401873024",
    "matchup": "Arizona Cardinals @ Dallas Cowboys",
    "awayTeam": "Arizona Cardinals",
    "homeTeam": "Dallas Cowboys",
    "awayAbbr": "ARI",
    "homeAbbr": "DAL",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "DAL -7",
    "postedTotal": 54.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PASS",
    "passReason": "Dallas plays fast indoors on the AT&T Stadium turf, while Arizona brings a physical rushing attack designed to shorten the game and keep the chains moving. How the Cardinals offensive line holds up against the Cowboys pass rush will dictate the afternoon \u2014 unlock the pack for our official game calls."
  },
  {
    "id": "board-2026-w8-401873030",
    "espnEventId": "401873030",
    "matchup": "Minnesota Vikings @ Detroit Lions",
    "awayTeam": "Minnesota Vikings",
    "homeTeam": "Detroit Lions",
    "awayAbbr": "MIN",
    "homeAbbr": "DET",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "DET -3",
    "postedTotal": 46.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PLAY",
    "passReason": "Detroit has missed only twelve tackles all season and brings one of the league's cleanest offensive lines into an NFC North clash at Ford Field against Minnesota. Divisional familiarity and red-zone execution will decide this three-point matchup \u2014 our official spread, total, and prop calls are locked inside the pack."
  },
  {
    "id": "board-2026-w8-401873029",
    "espnEventId": "401873029",
    "matchup": "Las Vegas Raiders @ New York Jets",
    "awayTeam": "Las Vegas Raiders",
    "homeTeam": "New York Jets",
    "awayAbbr": "LV",
    "homeAbbr": "NYJ",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "NYJ -1.5",
    "postedTotal": 45.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PASS",
    "passReason": "Las Vegas travels east to face the Jets in the Meadowlands wind, where both offensive lines have been tested in obvious passing situations. Field position and third-down protection will swing this tight AFC matchup \u2014 unlock the pack for our official game breakdown and picks."
  },
  {
    "id": "board-2026-w8-401873027",
    "espnEventId": "401873027",
    "matchup": "Cleveland Browns @ Pittsburgh Steelers",
    "awayTeam": "Cleveland Browns",
    "homeTeam": "Pittsburgh Steelers",
    "awayAbbr": "CLE",
    "homeAbbr": "PIT",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "PIT -3.5",
    "postedTotal": 39.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PLAY",
    "passReason": "AFC North football takes center stage at Acrisure Stadium as Pittsburgh's defensive front squares off against a bruised Cleveland offensive line. Physical trench play and open-field tackling always define Browns-Steelers \u2014 our official spread call, total call, and player prop bets are locked inside."
  },
  {
    "id": "board-2026-w8-401873025",
    "espnEventId": "401873025",
    "matchup": "Atlanta Falcons @ Tampa Bay Buccaneers",
    "awayTeam": "Atlanta Falcons",
    "homeTeam": "Tampa Bay Buccaneers",
    "awayAbbr": "ATL",
    "homeAbbr": "TB",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "TB -2.5",
    "postedTotal": 44.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PASS",
    "passReason": "First place in the NFC South is on the line in Tampa as the Buccaneers' interior front battles an Atlanta offense that leans heavily on its running backs in the passing game. With the spread sitting inside a field goal, late-game execution is everything \u2014 unlock the pack to reveal our official calls."
  },
  {
    "id": "board-2026-w8-401873028",
    "espnEventId": "401873028",
    "matchup": "Indianapolis Colts @ Jacksonville Jaguars",
    "awayTeam": "Indianapolis Colts",
    "homeTeam": "Jacksonville Jaguars",
    "awayAbbr": "IND",
    "homeAbbr": "JAX",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "postedDetails": "JAX -10",
    "postedTotal": 46.5,
    "scoreboardStatus": "Sunday 1:00 PM ET",
    "publication": "PASS",
    "passReason": "Jacksonville's edge rushers look to pin their ears back at home against an Indianapolis offense trying to stay balanced on early downs in an AFC South showdown. Our official side call, total call, and player prop breakdown for Colts at Jaguars are locked inside the Sunday pack."
  },
  {
    "id": "board-2026-w8-401873032",
    "espnEventId": "401873032",
    "matchup": "Los Angeles Chargers @ Los Angeles Rams",
    "awayTeam": "Los Angeles Chargers",
    "homeTeam": "Los Angeles Rams",
    "awayAbbr": "LAC",
    "homeAbbr": "LAR",
    "kickoff": "2026-11-01T21:05Z",
    "windowSlot": "SUN_LATE",
    "postedDetails": "LAR -6.5",
    "postedTotal": 45.5,
    "scoreboardStatus": "Sunday 4:05 PM ET",
    "publication": "PASS",
    "passReason": "Matthew Stafford and the Rams share SoFi Stadium with a Chargers team that plays deliberate, ball-control football and rarely beats itself. Red-zone finishing and third-down conversions will separate these two Los Angeles rosters \u2014 unlock the pack for our official game calls."
  },
  {
    "id": "board-2026-w8-401873033",
    "espnEventId": "401873033",
    "matchup": "Kansas City Chiefs @ Denver Broncos",
    "awayTeam": "Kansas City Chiefs",
    "homeTeam": "Denver Broncos",
    "awayAbbr": "KC",
    "homeAbbr": "DEN",
    "kickoff": "2026-11-01T21:25Z",
    "windowSlot": "SUN_LATE",
    "postedDetails": "KC -1.5",
    "postedTotal": 40.5,
    "scoreboardStatus": "Sunday 4:25 PM ET",
    "publication": "PASS",
    "passReason": "Kansas City heads into the thin air at Mile High to face a Denver defense that has been tough against the pass all season in AFC West play. Divisional games in Denver almost always come down to the final two possessions \u2014 our official spread, total, and player prop calls are locked inside."
  },
  {
    "id": "board-2026-w8-401873034",
    "espnEventId": "401873034",
    "matchup": "New England Patriots @ Miami Dolphins",
    "awayTeam": "New England Patriots",
    "homeTeam": "Miami Dolphins",
    "awayAbbr": "NE",
    "homeAbbr": "MIA",
    "kickoff": "2026-11-01T21:25Z",
    "windowSlot": "SUN_LATE",
    "postedDetails": "NE -7",
    "postedTotal": 43.5,
    "scoreboardStatus": "Sunday 4:25 PM ET",
    "publication": "PASS",
    "passReason": "New England takes its young offense on the road into South Florida against a Miami defense looking to bounce back in an AFC East matchup. How both teams handle the heat and early-down run fits sets the tone \u2014 unlock the pack for our official calls on Patriots at Dolphins."
  },
  {
    "id": "board-2026-w8-401873035",
    "espnEventId": "401873035",
    "matchup": "Philadelphia Eagles @ Washington Commanders",
    "awayTeam": "Philadelphia Eagles",
    "homeTeam": "Washington Commanders",
    "awayAbbr": "PHI",
    "homeAbbr": "WSH",
    "kickoff": "2026-11-02T01:20Z",
    "windowSlot": "SNF",
    "postedDetails": "WSH -6",
    "postedTotal": 40.5,
    "scoreboardStatus": "Sunday 8:20 PM ET",
    "publication": "PASS",
    "passReason": "Sunday Night Football features an NFC East rivalry as Washington's quick-rhythm passing attack meets Philadelphia's physical offensive line under the lights. Open-field tackling and third-and-short execution will decide this prime-time battle \u2014 our official side, total, and prop picks are locked inside."
  },
  {
    "id": "board-2026-w8-401873036",
    "espnEventId": "401873036",
    "matchup": "Chicago Bears @ Seattle Seahawks",
    "awayTeam": "Chicago Bears",
    "homeTeam": "Seattle Seahawks",
    "awayAbbr": "CHI",
    "homeAbbr": "SEA",
    "kickoff": "2026-11-03T01:15Z",
    "windowSlot": "MNF",
    "postedDetails": "SEA -3",
    "postedTotal": 46.5,
    "scoreboardStatus": "Monday 8:15 PM ET",
    "publication": "PLAY",
    "passReason": "Monday Night Football wraps up the slate in the Pacific Northwest as Chicago's takeaway-minded defense visits Seattle at Lumen Field. Crowd noise, pass protection, and red-zone defense headline the finale \u2014 unlock the pack to see our official Monday night spread, total, and prop calls."
  }
];
