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
    "matchup": "Carolina Panthers @ Green Bay Packers",
    "awayTeam": "Carolina Panthers",
    "homeTeam": "Green Bay Packers",
    "awayAbbr": "CAR",
    "homeAbbr": "GB",
    "kickoff": "2026-10-30T00:15Z",
    "windowSlot": "TNF",
    "postedDetails": "GB -3.5",
    "postedTotal": 47.5,
    "scoreboardStatus": "10/29 - 8:15 PM EDT",
    "publication": "PLAY",
    "passReason": "Green Bay\u2019s offensive line is healthier and Jordan Love has been more accurate under pressure than Bryce Young the last three weeks. Carolina is missing two starting offensive linemen and their best edge rusher. The Packers should control the line of scrimmage and keep the Panthers off the field. Take Green Bay and the under."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PLAY",
    "passReason": "Josh Allen faces a Baltimore secondary missing cornerback T.J. Tampa and safety Jaylinn Hawkins, setting up big plays down the field for both offenses. The spread is priced tightly at a field goal, so pass on the side and bet the over."
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
    "postedDetails": "CIN -10",
    "postedTotal": 46.5,
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has CIN -10 and 46.5 priced right (Fair CIN -12.5, Total 45.8). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has DAL -7 and 54.5 priced right (Fair DAL -6.5, Total 51.7). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PLAY",
    "passReason": "Detroit leads the entire NFL with only twelve missed tackles through seven weeks and dominates the line of scrimmage at Ford Field against a Minnesota offense starting a backup quarterback. Take the Lions laying three points at home and pass on the total."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has NYJ -1.5 and 45.5 priced right (Fair NYJ -0.7, Total 42.9). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PLAY",
    "passReason": "Pittsburgh's front four dominates a bruised Cleveland offensive line while the Browns have missed fifty-one tackles on defense, pointing to a physical, clock-chewing divisional battle. Pass on the spread and take the under."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has TB -2.5 and 44.5 priced right (Fair TB -2.7, Total 43.0). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 1:00 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has JAX -10 and 46.5 priced right (Fair JAX -9.4, Total 44.1). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 4:05 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has LAR -6.5 and 45.5 priced right (Fair LAR -9.0, Total 45.6). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 4:25 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has KC -1.5 and 40.5 priced right (Fair DEN +3.4, Total 42.1). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 4:25 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has NE -7 and 43.5 priced right (Fair MIA +6.3, Total 40.4). Sit this matchup out."
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
    "scoreboardStatus": "11/1 - 8:20 PM EST",
    "publication": "PASS",
    "passReason": "PASS \u2014 Vegas has WSH -6 and 40.5 priced right (Fair WSH -6.8, Total 41.7). Sit this matchup out."
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
    "scoreboardStatus": "11/2 - 8:15 PM EST",
    "publication": "PLAY",
    "passReason": "Chicago's defense has forced turnovers and limited big plays over the last month, giving the Bears the toughness to hang inside a field goal in Seattle on Monday night. Take the Bears plus three points and pass on the total."
  }
];
