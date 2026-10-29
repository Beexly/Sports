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
    "passReason": "Fair GB -8.5 / Total 29.3. Side PLAY CLV +0.1311. Total PLAY CLV +0.4236."
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
    "passReason": "Fair BUF +0.6 / Total 60.8. Side PLAY CLV +0.0752. Total PLAY CLV +0.2086."
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
    "passReason": "Fair CIN -27.1 / Total 45.0. Side PLAY CLV +0.3832. Total PASS CLV +0.0205."
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
    "passReason": "Fair DAL -2.4 / Total 31.2. Side PLAY CLV +0.1183. Total PLAY CLV +0.4563."
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
    "passReason": "Fair DET -18.9 / Total 57.0. Side PLAY CLV +0.3516. Total PLAY CLV +0.3030."
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
    "passReason": "Fair NYJ +2.4 / Total 32.4. Side PLAY CLV +0.0956. Total PLAY CLV +0.3776."
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
    "passReason": "Fair PIT -12.2 / Total 40.8. Side PLAY CLV +0.2162. Total PLAY CLV +0.0323."
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
    "passReason": "Fair TB -2.7 / Total 37.5. Side PASS CLV +0.0033. Total PLAY CLV +0.1989."
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
    "passReason": "Fair JAX -7.1 / Total 34.5. Side PLAY CLV +0.0565. Total PLAY CLV +0.3327."
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
    "passReason": "Fair LAR -20.1 / Total 46.0. Side PLAY CLV +0.3246. Total PASS CLV -0.0135."
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
    "passReason": "Fair DEN +12.6 / Total 49.7. Side PLAY CLV +0.2513. Total PLAY CLV +0.2898."
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
    "passReason": "Fair MIA +1.1 / Total 27.5. Side PLAY CLV +0.1608. Total PLAY CLV +0.4060."
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
    "passReason": "Fair WSH -11.4 / Total 48.3. Side PLAY CLV +0.1385. Total PLAY CLV +0.2475."
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
    "passReason": "Fair SEA -4.8 / Total 47.9. Side PLAY CLV +0.0397. Total PLAY CLV +0.0316."
  }
];
