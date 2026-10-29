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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair GB -5.4 / Total 44.9 -> Green Bay Packers -3.5 (58/100, +7.0% CLV) & UNDER 47.5 (57/100, +7.2% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair BUF -1.8 / Total 59.2 -> Baltimore Ravens +3 (58/100, +4.1% CLV) & OVER 54.5 (62/100, +12.4% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair CIN -11.8 / Total 45.2 -> Cincinnati Bengals -10 (58/100, +6.6% CLV) & UNDER 46.5 (57/100, +3.8% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair DAL -3.2 / Total 48.4 -> Arizona Cardinals +7 (62/100, +11.9% CLV) & UNDER 54.5 (67/100, +16.7% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair DET -3.4 / Total 53.5 -> Detroit Lions -3 (58/100, +0.9% CLV) & OVER 46.5 (68/100, +18.2% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair NYJ -0.3 / Total 44.8 -> Las Vegas Raiders +1.5 (58/100, +4.2% CLV) & UNDER 45.5 (57/100, +2.4% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair PIT -4.4 / Total 46.7 -> Pittsburgh Steelers -3.5 (58/100, +2.4% CLV) & OVER 39.5 (68/100, +18.1% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair TB -4.4 / Total 45.2 -> Tampa Bay Buccaneers -2.5 (58/100, +6.7% CLV) & OVER 44.5 (57/100, +1.3% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair JAX -3.4 / Total 47.4 -> Indianapolis Colts +10 (71/100, +21.1% CLV) & OVER 46.5 (57/100, +2.1% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair LAR -7.9 / Total 48.0 -> Los Angeles Rams -6.5 (58/100, +5.1% CLV) & OVER 45.5 (57/100, +6.6% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair DEN +3.0 / Total 49.5 -> Kansas City Chiefs -1.5 (58/100, +5.5% CLV) & OVER 40.5 (73/100, +22.9% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair MIA -0.8 / Total 45.8 -> Miami Dolphins +7 (74/100, +24.0% CLV) & OVER 43.5 (57/100, +5.9% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair WSH -5.4 / Total 53.2 -> Philadelphia Eagles +6 (58/100, +1.8% CLV) & OVER 40.5 (81/100, +30.8% CLV)."
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
    "passReason": "10,000-Sim W1\u2013W7 Bind: Fair SEA -3.5 / Total 51.3 -> Seattle Seahawks -3 (58/100, +1.6% CLV) & OVER 46.5 (63/100, +12.8% CLV)."
  }
];
