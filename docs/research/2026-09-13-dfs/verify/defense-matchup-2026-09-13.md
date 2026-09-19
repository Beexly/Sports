# 2025 NFL Defense/Matchup Claim Verification — Week 1 2026 DFS

**Verified:** 2026-09-13 (all 2025 regular-season data final)
**Scope:** Seven claims about 2025 team defenses, checked for Week 1 2026 DFS matchup analysis.
**Verdict scale:** CONFIRMED / CORRECTED / UNVERIFIABLE — one per claim, no exceptions.

## Verdict table

| # | Claim | Verdict | Verified value & rank | Source |
|---|-------|---------|----------------------|--------|
| 1 | Saints had the 5th-ranked sack rate | **CONFIRMED** | 8.40% (45 sacks / 536 dropbacks), **5th** of 32 | nflverse 2025 pbp; cross-checked vs PFR + StatMuse |
| 2 | Washington had the worst overall defense | **CONFIRMED** | 6,533 yards allowed — **32nd (last)**; 451 points allowed — 27th | Pro-Football-Reference `teams/was/2025.htm` |
| 3 | Washington ranked 30th versus the run | **CONFIRMED** | 2,411 rushing yards allowed — **30th** | PFR `teams/was/2025.htm`; StatMuse rushing-yards-allowed table |
| 4 | Washington was fourth-worst versus tight ends | **CONFIRMED** | 219.0 half-PPR fantasy pts allowed to TEs — **4th-most** (86 rec / 1,040 yds / 12 TD) | nflverse 2025 pbp + roster (position join) |
| 5 | Washington allowed a 67.7% red-zone TD rate | **CONFIRMED** | 42 TD on 62 red-zone trips = **67.7%**, ranked **31st** | PFR `teams/was/2025.htm` (Team Conversions table) |
| 6 | Arizona ranked 26th in EPA/dropback allowed | **CORRECTED** | +0.149 EPA/dropback allowed — **27th** of 32 (6th-worst), not 26th | nflverse 2025 pbp (EPA model) |
| 7 | Washington allowed the third-most passing TDs | **CONFIRMED** | 33 passing TDs allowed — **tied 3rd-most** (with CIN; behind NYJ 36, DAL 35) | StatMuse passing-TDs-allowed table; nflverse 2025 pbp |

## Per-claim detail

### 1. Saints 5th-ranked sack rate — CONFIRMED
- New Orleans: 45 sacks on 536 opponent dropbacks = **8.40%**, ranked **5th**.
- Teams ahead: DEN 10.26% (68/663), MIN 9.86% (49/497), CLE 9.78% (53/542), ATL 9.64% (57/591). Next behind: LAC 8.15% (45/552).
- Cross-check with PFR/StatMuse opponent attempt totals (DEN 593, MIN 447, CLE 487, ATL 529, NO 491, LAC 505) reproduces the identical ordering: NO 5th at 45/(491+45) = 8.40%.
- Note: by raw sack total the Saints were only tied 10th–11th (45, tied with LAC); the rate rank is higher because they faced the 4th-fewest opponent pass attempts.
- Sources: nflverse `play_by_play_2025.csv` (sack rate = sacks / dropbacks, dropbacks = pass attempts including sacks); `https://www.pro-football-reference.com/teams/nor/2025.htm`; `https://www.statmuse.com/nfl/ask/which-team-had-most-sacks-this-year`

### 2. Washington worst overall defense — CONFIRMED (by yards)
- 6,533 total yards allowed — **32nd of 32 (last)**. This is the conventional "total defense" ranking, so "worst overall defense" holds.
- Qualification: by points allowed (451), Washington was **27th**, not last.
- Source: `https://www.pro-football-reference.com/teams/was/2025.htm`

### 3. Washington 30th versus the run — CONFIRMED
- 2,411 rushing yards allowed on 504 attempts — **30th** (3rd-most; only two teams allowed more).
- Sources: `https://www.pro-football-reference.com/teams/was/2025.htm`; `https://www.statmuse.com/nfl/ask/team-that-allowed-the-most-rushing-yards-this-season`

### 4. Washington fourth-worst versus tight ends — CONFIRMED (half-PPR basis)
- Computed TE production allowed from play-by-play with receiver positions joined from the official-style roster file:
  - **Half-PPR fantasy points allowed to TEs: 219.0 — 4th-most** (CIN 298.4, ARI 236.1, PIT 231.1, then WAS 219.0). Underlying: 86 receptions, 1,040 yards, 12 TDs.
  - Context: full-PPR points allowed 262.0 (6th-most); TE receiving yards allowed 1,040 (7th-most); TE TDs allowed 12 (tied 2nd-most with TB, behind CIN's 16).
- The "fourth-worst" figure matches the half-PPR (FanDuel-style) defense-vs-position scoring exactly.
- Sources: nflverse `play_by_play_2025.csv` + `roster_2025.csv` (regular season, completed passes to rostered TEs grouped by defending team)

### 5. Washington 67.7% red-zone TD rate — CONFIRMED
- Opponents: 42 TDs on 62 red-zone trips = 42/62 = **67.74% → 67.7%**, PFR red-zone defense rank **31st**.
- Source: `https://www.pro-football-reference.com/teams/was/2025.htm` (Team Conversions table)

### 6. Arizona 26th in EPA/dropback allowed — CORRECTED to 27th
- nflverse EPA model, 2025 regular season, pass plays (attempts + sacks) grouped by defending team: Arizona allowed **+0.149 EPA per dropback — 27th of 32 (6th-worst)**, not 26th.
- Worst five: NYJ (+0.253), DAL (+0.217), WAS (+0.200), TEN (+0.167), CIN (+0.164), then ARI (+0.149). Best: HOU (−0.186).
- Caveat: EPA values vary slightly by model/provider; the nflverse open model is the standard free reference. No allowed free source publishes a pre-ranked EPA/dropback table, so this was computed directly.
- Closest conventional alternative from PFR: Arizona allowed 6.5 net yards/attempt (3,923 net pass yards on 572 att + 30 sacks), ranked **23rd**.
- Sources: nflverse `play_by_play_2025.csv`; `https://www.pro-football-reference.com/teams/crd/2025.htm`

### 7. Washington third-most passing TDs allowed — CONFIRMED (tied)
- 33 passing TDs allowed — **tied for 3rd-most** with Cincinnati (33), behind the Jets (36) and Cowboys (35). Next: Bears 32.
- StatMuse's full-season "most passing touchdowns allowed" table and the nflverse play-by-play count agree exactly (WAS: 350 comp / 540 att / 33 TD).
- Note: PFR's team-page "Lg Rank Defense" cell for this column reads 25th, which is inconsistent with the sorted league table; the direct sorted count (tied 3rd-most) from two independent sources is authoritative.
- Sources: `https://www.statmuse.com/nfl/ask/what-team-has-allowed-the-most-passing-touchdowns-this-season-in-the-nfl`; nflverse `play_by_play_2025.csv`

## Methodology note
- **nflverse computations:** public 2025 regular-season play-by-play (`https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv.gz`, tag `pbp`) and 2025 roster file (tag `rosters`). Sack rate = defensive sacks ÷ defensive dropbacks (pass attempts, which include sacks in this dataset — verified: all 1,287 sack plays carry pass_attempt=1). EPA/dropback = sum of play EPA over defensive pass plays ÷ dropbacks. TE stats = completed passes to players rostered at position TE, grouped by `defteam`. All regular season only (`season_type == 'REG'`). Analysis scripts retained at `~/workspace/dfs-research/verify/nflverse/`.
- **Banned-source compliance:** no PFF, Sharp Football, FTN, FantasyPoints, Next Gen Stats, Warren Sharp, ESPN, NFL.com, CBS, NBC Sports, USA Today, SI, thehuddle, RotoBaller, RotoWire, FantasyAlarm, FantasyLabs, numberFire, FantasyPros, or PlayerProfiler data was used. (USA Today results appeared in search output only and were not used as sources.)
- No numbers were invented: every value above is either read directly from a cited page/table or computed from the cited play-by-play dataset.
