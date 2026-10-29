/**
 * 2026 NFL Week 8 board — Bound to 18,738 2026 W1–W7 plays + 10,000-Run Simulator.
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
    "passReason": "Our 10,000 simulations project GB -10.0 and 38.0 total points. Spread: PLAY Green Bay Packers -3.5 (69/100). Total: PLAY UNDER 47.5 (78/100)."
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
    "passReason": "Our 10,000 simulations project BUF +0.6 and 60.8 total points. Spread: PLAY Baltimore Ravens +3 (60/100). Total: PLAY OVER 54.5 (73/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project CIN -27.1 and 45.0 total points. Spread: PLAY Cincinnati Bengals -10 (91/100). Total: PASS UNDER 46.5 (54/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project DAL -2.4 and 31.2 total points. Spread: PLAY Arizona Cardinals +7 (64/100). Total: PLAY UNDER 54.5 (98/100)."
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
    "passReason": "Our 10,000 simulations project DET -18.9 and 57.0 total points. Spread: PLAY Detroit Lions -3 (88/100). Total: PLAY OVER 46.5 (83/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project NYJ +2.4 and 32.4 total points. Spread: PLAY Las Vegas Raiders +1.5 (62/100). Total: PLAY UNDER 45.5 (90/100)."
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
    "passReason": "Our 10,000 simulations project PIT -12.2 and 40.8 total points. Spread: PLAY Pittsburgh Steelers -3.5 (74/100). Total: PLAY OVER 39.5 (56/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project TB -2.7 and 37.5 total points. Spread: PASS Tampa Bay Buccaneers -2.5 (53/100). Total: PLAY UNDER 44.5 (72/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project JAX -7.1 and 34.5 total points. Spread: PLAY Indianapolis Colts +10 (58/100). Total: PLAY UNDER 46.5 (86/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project LAR -20.1 and 46.0 total points. Spread: PLAY Los Angeles Rams -6.5 (85/100). Total: PASS UNDER 45.5 (51/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project DEN +12.6 and 49.7 total points. Spread: PLAY Kansas City Chiefs -1.5 (78/100). Total: PLAY OVER 40.5 (81/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project MIA +1.1 and 27.5 total points. Spread: PLAY Miami Dolphins +7 (68/100). Total: PLAY UNDER 43.5 (93/100)."
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
    "publication": "PLAY",
    "passReason": "Our 10,000 simulations project WSH -11.4 and 48.3 total points. Spread: PLAY Washington Commanders -6 (66/100). Total: PLAY OVER 40.5 (77/100)."
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
    "passReason": "Our 10,000 simulations project SEA -4.8 and 47.9 total points. Spread: PLAY Seattle Seahawks -3 (56/100). Total: PLAY OVER 46.5 (56/100)."
  }
];
