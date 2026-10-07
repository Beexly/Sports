# sportsoddshistory (covers.com) parse validation — 2026-08-26

URL pattern: https://www.covers.com/sportsoddshistory/nfl-game-season/?y=<YEAR>
UA header required (plain curl gets blocked; Mozilla UA works).

2024 page: 773KB HTML, 359 <tr>, **272 game rows parsed** (= full REG
season, matches games_harness_rows.jsonl count exactly).

Row schema (cleaned tds):
[weekday, date, time, @/vs/N, team1, result "W 27-20", ATS "W -3", "",
opponent, O/U "O 46", venue-note]

Key facts:
- Spread shown is TEAM1's spread with W/L cover flag ("W -3" = won ATS at -3)
- "@" = team1 away, "N" = neutral
- Includes kickoff TIME (8:20 etc.) — the nflverse feed lacks this; unlocks
  true 10am-body-clock tests instead of structural proxies
- Over/under result included ("O 46")

Verdict: USABLE-NOW as second source for close-line cross-validation AND
as the only free source of historical kickoff times found tonight.
Recommended bulk pull: 1990–2025, one request per year, ~1s delay.

Sample cross-check vs harness: KC 2024 wk1 W 27-20 favored -3 → covers;
harness row 2024_01_BAL_KC: homeTeam KC spreadLineHome=3(?) — spot-checks
align. Full automated cross-validation queued for next cycle.
