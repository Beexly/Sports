# Week 10 External Charting and Matchup Cross-Verification Matrix

Date: 2026-11-15 (overnight watch, Wave 2). Author: Hermes, inline execution.
Worktree: Sports-worktrees/hermes-sunday-watch-2026-11-15, branch
feat/hermes-overnight-mind-and-munich-watch-2026-11-15.
Engine side: data/engine/connected_workflow_dossier_*_week10.json stage1a
(2026-11-13 generation; refresh pending Antigravity's regenerated push).

## Source windows (read this before any delta)

| Source | Window | Notes |
|---|---|---|
| Engine stage1a coaching tendencies | PROE verified identical to weeks 1-3 CSV mirror (NE -0.014225, DET 0.01749); pace/blitz/man per stage1a build | neutral script wp 0.35-0.65, early downs, EB shrink k=290 |
| proe_early_neutral.csv / off_tendencies.csv / def_tendencies.csv | 2026 weeks 1-3 | LAR missing from 2026 rows (25 of 26 slate teams present) |
| play_by_play_2026.parquet (local nflverse mirror) | 2026 weeks 1-7 | pass_oe is nflverse model, percentage points |
| ftn_charting_2026.parquet joined to PBP on play_id | 2026 weeks 1-7 | 18,019 of 18,019 rows joined; box/blitz/PA/RPO/screen/no-huddle |
| statyx man-vs-zone splits | week 10 snapshot, 2026-11-12 | player-level, roster-mapped to teams (0 unmapped) |
| PFF yards per rush vs 8+ box | 2026-11-14 snapshot | player-level |
| gridiron matchup cards | 2026-11-14 snapshot | 12 of 13 games; LAC @ BAL card absent |

Definitional cautions: engine neutral pace uses the wp-band neutral script;
the PBP external pace uses |score diff| <= 7, qtr <= 3, consecutive same-drive
snaps, 0 < delta <= 45 s. Pressure-to-sack survival external is a PROXY
(1 - sacks/(qb_hits+sacks)); qb_hits undercount true pressures, so the proxy
UNDERSTATES survival vs the engine's charted-pressure denominator. Man/zone
YPRR is offense-facing (statyx); engine dc_man_rate is defense-facing; they
are complementary, not interchangeable. No Tuesday presser transcripts exist
in this worktree: coach-speak hypotheses below are tendency-derived and
labeled as such, never quoted.

## 1. NE @ DET - 08:30 CST Munich (Allianz Arena, outdoor hybrid grass)

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | NE | DET |
|---|---|---|
| PROE (fraction) | -0.0142 | 0.0175 |
| Neutral pace (sec) | 27.7 | 26.6 |
| DC blitz rate | 0.3967 | 0.2714 |
| DC man rate | 0.4038 | 0.3569 |
| OL pressure allowed | 0.6553 | 0.6375 |
| Sack rate allowed | 0.0558 | 0.0511 |
| PA rate | 0.2060 | 0.3149 |
| RPO rate | 0.0233 | 0.0203 |
| Screen rate | 0.0901 | 0.0723 |
| Motion rate | 0.5548 | 0.5468 |
| Pressure-to-sack survival (engine) | 0.9148 | 0.9198 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | NE | -0.0142 | -0.0142 (mirror) / -0.0 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | NE | 27.7 | 32.9 (n=173) | w1-7 score-band | definitional gap 5.2 s |
| 1H pass rate | NE | n/a (no stage1a field) | 0.5882 | w1-7 | external-only |
| Pressure-to-sack survival | NE | 0.9148 | 0.7234 (proxy: sacks 13, hits 34) | w1-7 | proxy understates |
| Blitz rate (defense) | NE | 0.3967 | 0.2328 (FTN, n=262) | w1-7 | check |
| Box defenders (defense) | NE | n/a (report truncated) | mean 5.6, heavy>=8 6.5 pct, light<=6 58.9 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | NE | dc_man_rate 0.4038 (defense-side) | man 3.4900 (n=47), zone 1.7800 (n=136) | statyx w10 | complementary |
| PA / RPO / screen (offense) | NE | 0.2060 / 0.0233 / 0.0901 | 0.1176 / 0.0344 / 0.0416 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | DET | 0.0175 | 0.0175 (mirror) / -0.6 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | DET | 26.6 | 31.2 (n=156) | w1-7 score-band | definitional gap 4.6 s |
| 1H pass rate | DET | n/a (no stage1a field) | 0.6327 | w1-7 | external-only |
| Pressure-to-sack survival | DET | 0.9198 | 0.7273 (proxy: sacks 12, hits 32) | w1-7 | proxy understates |
| Blitz rate (defense) | DET | 0.2714 | 0.2146 (FTN, n=247) | w1-7 | aligned |
| Box defenders (defense) | DET | n/a (report truncated) | mean 5.2, heavy>=8 4.9 pct, light<=6 59.3 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | DET | dc_man_rate 0.3569 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | DET | 0.3149 / 0.0203 / 0.0723 | 0.0862 / 0.0256 / 0.0280 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (NE) | 14th | 23.4 | 17th | 23.6 |
| Pass Yards (NE) | 9th | 261.0 | 32nd | 263.1 |
| Rushing Yards by RB (NE) | 14th | 95.1 | 5th | 72.2 |
| Rushing Yards by QB (NE) | 6th | 24.6 | 9th | 19.1 |
| Receiving Yards by WR (NE) | 17th | 159.0 | 26th | 165.2 |
| Receiving Yards by TE (NE) | 8th | 65.1 | 32nd | 88.0 |
| Receiving Yards by RB (NE) | 16th | 36.9 | 12th | 29.0 |
| Points (DET) | 3rd | 27.8 | 15th | 23.0 |
| Pass Yards (DET) | 5th | 268.1 | 26th | 250.7 |
| Rushing Yards by RB (DET) | 4th | 122.8 | 13th | 83.7 |
| Rushing Yards by QB (DET) | 30th | 2.5 | 5th | 9.4 |
| Receiving Yards by WR (DET) | 8th | 168.4 | 29th | 175.2 |
| Receiving Yards by TE (DET) | 15th | 56.1 | 9th | 46.7 |
| Receiving Yards by RB (DET) | 7th | 43.6 | 11th | 28.8 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H1.1. PROE continuity NE: engine -0.0142 vs mirror -0.0142 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -0.0 pp is the drift witness.
H1.2. Pace gap NE: engine wp-band pace 27.7 s vs score-band PBP pace 32.9 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 32.9 s the engine's tempo-driven volume props are overstated.
H1.3. Pressure survival NE: engine 0.9148 vs hit-based proxy 0.7234 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: NE sacks per dropback Sunday; above the engine's 0.0558 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H1.4. Blitz divergence NE defense: engine 0.3967 (weeks 1-3) vs FTN 0.2328 (weeks 1-7). Test: DET dropbacks vs NE blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H1.5. Light-box tendency NE defense: 58.9 pct of charted rushes faced <=6 box (weeks 1-7). Test: DET early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: DET absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 2. BUF @ NYJ

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | BUF | NYJ |
|---|---|---|
| PROE (fraction) | -0.0088 | 0.0071 |
| Neutral pace (sec) | 28.2 | 28.6 |
| DC blitz rate | 0.3490 | 0.3836 |
| DC man rate | 0.3868 | 0.3891 |
| OL pressure allowed | 0.6761 | 0.7456 |
| Sack rate allowed | 0.0645 | 0.0913 |
| PA rate | 0.2688 | 0.2130 |
| RPO rate | 0.0621 | 0.0348 |
| Screen rate | 0.1129 | 0.0913 |
| Motion rate | 0.6441 | 0.4900 |
| Pressure-to-sack survival (engine) | 0.9046 | 0.8775 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | BUF | -0.0088 | -0.0088 (mirror) / -2.0 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | BUF | 28.2 | 32.5 (n=126) | w1-7 score-band | definitional gap 4.3 s |
| 1H pass rate | BUF | n/a (no stage1a field) | 0.5965 | w1-7 | external-only |
| Pressure-to-sack survival | BUF | 0.9046 | 0.7000 (proxy: sacks 12, hits 28) | w1-7 | proxy understates |
| Blitz rate (defense) | BUF | 0.3490 | 0.2548 (FTN, n=157) | w1-7 | check |
| Box defenders (defense) | BUF | n/a (report truncated) | mean 5.8, heavy>=8 14.1 pct, light<=6 53.3 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | BUF | dc_man_rate 0.3868 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | BUF | 0.2688 / 0.0621 / 0.1129 | 0.1145 / 0.0496 / 0.0458 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | NYJ | 0.0071 | 0.0071 (mirror) / -2.8 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | NYJ | 28.6 | 33.4 (n=165) | w1-7 score-band | definitional gap 4.8 s |
| 1H pass rate | NYJ | n/a (no stage1a field) | 0.5736 | w1-7 | external-only |
| Pressure-to-sack survival | NYJ | 0.8775 | 0.6667 (proxy: sacks 21, hits 42) | w1-7 | proxy understates |
| Blitz rate (defense) | NYJ | 0.3836 | 0.2329 (FTN, n=249) | w1-7 | check |
| Box defenders (defense) | NYJ | n/a (report truncated) | mean 5.4, heavy>=8 6.9 pct, light<=6 60.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | NYJ | dc_man_rate 0.3891 (defense-side) | man 5.2100 (n=28), zone 1.8000 (n=50) | statyx w10 | complementary |
| PA / RPO / screen (offense) | NYJ | 0.2130 / 0.0348 / 0.0913 | 0.0943 / 0.0391 / 0.0356 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (BUF) | 1st | 32.0 | 29th | 24.8 |
| Pass Yards (BUF) | 12th | 253.4 | 5th | 212.1 |
| Rushing Yards by RB (BUF) | 8th | 109.0 | 25th | 110.3 |
| Rushing Yards by QB (BUF) | 2nd | 35.1 | 16th | 15.4 |
| Receiving Yards by WR (BUF) | 16th | 139.8 | 5th | 120.7 |
| Receiving Yards by TE (BUF) | 5th | 68.5 | 24th | 63.0 |
| Receiving Yards by RB (BUF) | 6th | 45.0 | 19th | 28.4 |
| Points (NYJ) | 25th | 20.2 | 16th | 23.4 |
| Pass Yards (NYJ) | 21st | 230.9 | 27th | 252.8 |
| Rushing Yards by RB (NYJ) | 13th | 96.1 | 19th | 77.6 |
| Rushing Yards by QB (NYJ) | 27th | 6.0 | 9th | 12.0 |
| Receiving Yards by WR (NYJ) | 14th | 145.7 | 16th | 146.2 |
| Receiving Yards by TE (NYJ) | 18th | 52.1 | 28th | 65.9 |
| Receiving Yards by RB (NYJ) | 13th | 33.1 | 26th | 40.6 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H2.1. PROE continuity BUF: engine -0.0088 vs mirror -0.0088 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -2.0 pp is the drift witness.
H2.2. Pace gap BUF: engine wp-band pace 28.2 s vs score-band PBP pace 32.5 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 32.5 s the engine's tempo-driven volume props are overstated.
H2.3. Pressure survival BUF: engine 0.9046 vs hit-based proxy 0.7000 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: BUF sacks per dropback Sunday; above the engine's 0.0645 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H2.4. Blitz divergence BUF defense: engine 0.3490 (weeks 1-3) vs FTN 0.2548 (weeks 1-7). Test: NYJ dropbacks vs BUF blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H2.5. PROE continuity NYJ: engine 0.0071 vs mirror 0.0071 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -2.8 pp is the drift witness.

Gaps: BUF absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 3. CAR @ NO

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | CAR | NO |
|---|---|---|
| PROE (fraction) | 0.0085 | -0.0000 |
| Neutral pace (sec) | 26.6 | 26.7 |
| DC blitz rate | 0.3123 | 0.3455 |
| DC man rate | 0.3483 | 0.3673 |
| OL pressure allowed | 0.7107 | 0.6476 |
| Sack rate allowed | 0.0774 | 0.0521 |
| PA rate | 0.2760 | 0.1458 |
| RPO rate | 0.1199 | 0.0349 |
| Screen rate | 0.0480 | 0.0382 |
| Motion rate | 0.5536 | 0.6201 |
| Pressure-to-sack survival (engine) | 0.8911 | 0.9195 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | CAR | 0.0085 | 0.0085 (mirror) / 4.2 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | CAR | 26.6 | 28.0 (n=146) | w1-7 score-band | definitional gap 1.4 s |
| 1H pass rate | CAR | n/a (no stage1a field) | 0.7219 | w1-7 | external-only |
| Pressure-to-sack survival | CAR | 0.8911 | 0.7018 (proxy: sacks 17, hits 40) | w1-7 | proxy understates |
| Blitz rate (defense) | CAR | 0.3123 | 0.2360 (FTN, n=178) | w1-7 | aligned |
| Box defenders (defense) | CAR | n/a (report truncated) | mean 5.5, heavy>=8 5.1 pct, light<=6 58.3 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | CAR | dc_man_rate 0.3483 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | CAR | 0.2760 / 0.1199 / 0.0480 | 0.1162 / 0.0507 / 0.0393 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | NO | -0.0000 | -0.0000 (mirror) / -0.4 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | NO | 26.7 | 29.9 (n=174) | w1-7 score-band | definitional gap 3.2 s |
| 1H pass rate | NO | n/a (no stage1a field) | 0.6355 | w1-7 | external-only |
| Pressure-to-sack survival | NO | 0.9195 | 0.7368 (proxy: sacks 15, hits 42) | w1-7 | proxy understates |
| Blitz rate (defense) | NO | 0.3455 | 0.2058 (FTN, n=379) | w1-7 | check |
| Box defenders (defense) | NO | n/a (report truncated) | mean 5.7, heavy>=8 7.7 pct, light<=6 58.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | NO | dc_man_rate 0.3673 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | NO | 0.1458 / 0.0349 / 0.0382 | 0.0905 / 0.0216 / 0.0259 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (CAR) | 11th | 24.9 | 27th | 27.0 |
| Pass Yards (CAR) | 4th | 280.5 | 28th | 255.6 |
| Rushing Yards by RB (CAR) | 16th | 91.2 | 30th | 113.4 |
| Rushing Yards by QB (CAR) | 22nd | 10.2 | 23rd | 19.0 |
| Receiving Yards by WR (CAR) | 5th | 173.6 | 20th | 153.9 |
| Receiving Yards by TE (CAR) | 4th | 78.1 | 27th | 65.1 |
| Receiving Yards by RB (CAR) | 19th | 28.8 | 24th | 36.6 |
| Points (NO) | 15th | 23.1 | 28th | 27.4 |
| Pass Yards (NO) | 12th | 248.2 | 2nd | 221.8 |
| Rushing Yards by RB (NO) | 25th | 75.2 | 27th | 110.5 |
| Rushing Yards by QB (NO) | 13th | 20.2 | 22nd | 18.2 |
| Receiving Yards by WR (NO) | 9th | 166.0 | 19th | 145.6 |
| Receiving Yards by TE (NO) | 19th | 50.6 | 18th | 47.4 |
| Receiving Yards by RB (NO) | 17th | 31.6 | 11th | 28.8 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H3.1. PROE continuity CAR: engine 0.0085 vs mirror 0.0085 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe 4.2 pp is the drift witness.
H3.2. Pressure survival CAR: engine 0.8911 vs hit-based proxy 0.7018 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: CAR sacks per dropback Sunday; above the engine's 0.0774 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H3.3. Light-box tendency CAR defense: 58.3 pct of charted rushes faced <=6 box (weeks 1-7). Test: NO early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.
H3.4. PROE continuity NO: engine -0.0000 vs mirror -0.0000 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -0.4 pp is the drift witness.
H3.5. Pace gap NO: engine wp-band pace 26.7 s vs score-band PBP pace 29.9 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 29.9 s the engine's tempo-driven volume props are overstated.

Gaps: CAR absent from statyx week10 man/zone splits; NO absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 4. HOU @ CLE

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | HOU | CLE |
|---|---|---|
| PROE (fraction) | 0.0079 | 0.0161 |
| Neutral pace (sec) | 27.8 | 28.2 |
| DC blitz rate | 0.2622 | 0.2335 |
| DC man rate | 0.3496 | 0.3430 |
| OL pressure allowed | 0.6434 | 0.7744 |
| Sack rate allowed | 0.0577 | 0.1055 |
| PA rate | 0.2115 | 0.1941 |
| RPO rate | 0.0424 | 0.0699 |
| Screen rate | 0.0615 | 0.1139 |
| Motion rate | 0.5576 | 0.5542 |
| Pressure-to-sack survival (engine) | 0.9103 | 0.8638 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | HOU | 0.0079 | 0.0079 (mirror) / -2.1 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | HOU | 27.8 | 31.3 (n=165) | w1-7 score-band | definitional gap 3.4 s |
| 1H pass rate | HOU | n/a (no stage1a field) | 0.6188 | w1-7 | external-only |
| Pressure-to-sack survival | HOU | 0.9103 | 0.6875 (proxy: sacks 15, hits 33) | w1-7 | proxy understates |
| Blitz rate (defense) | HOU | 0.2622 | 0.2230 (FTN, n=296) | w1-7 | aligned |
| Box defenders (defense) | HOU | n/a (report truncated) | mean 5.3, heavy>=8 10.0 pct, light<=6 64.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | HOU | dc_man_rate 0.3496 (defense-side) | man 2.3700 (n=43), zone 1.4600 (n=116) | statyx w10 | complementary |
| PA / RPO / screen (offense) | HOU | 0.2115 / 0.0424 / 0.0615 | 0.1066 / 0.0291 / 0.0404 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | CLE | 0.0161 | 0.0161 (mirror) / -1.0 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | CLE | 28.2 | 31.7 (n=121) | w1-7 score-band | definitional gap 3.5 s |
| 1H pass rate | CLE | n/a (no stage1a field) | 0.6181 | w1-7 | external-only |
| Pressure-to-sack survival | CLE | 0.8638 | 0.6711 (proxy: sacks 25, hits 51) | w1-7 | proxy understates |
| Blitz rate (defense) | CLE | 0.2335 | 0.1579 (FTN, n=247) | w1-7 | aligned |
| Box defenders (defense) | CLE | n/a (report truncated) | mean 5.2, heavy>=8 4.2 pct, light<=6 76.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | CLE | dc_man_rate 0.3430 (defense-side) | man 0.3500 (n=68), zone 2.1600 (n=185) | statyx w10 | complementary |
| PA / RPO / screen (offense) | CLE | 0.1941 / 0.0699 / 0.1139 | 0.0872 / 0.0426 / 0.0365 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (HOU) | 9th | 26.1 | 13th | 21.8 |
| Pass Yards (HOU) | 3rd | 282.2 | 6th | 220.2 |
| Rushing Yards by RB (HOU) | 29th | 67.2 | 21st | 115.1 |
| Rushing Yards by QB (HOU) | 17th | 12.2 | 16th | 13.3 |
| Receiving Yards by WR (HOU) | 6th | 199.2 | 13th | 143.6 |
| Receiving Yards by TE (HOU) | 12th | 60.1 | 22nd | 57.8 |
| Receiving Yards by RB (HOU) | 26th | 22.9 | 3rd | 18.0 |
| Points (CLE) | 29th | 17.9 | 25th | 24.0 |
| Pass Yards (CLE) | 17th | 233.9 | 30th | 257.0 |
| Rushing Yards by RB (CLE) | 30th | 66.0 | 17th | 94.8 |
| Rushing Yards by QB (CLE) | 8th | 27.2 | 3rd | 7.4 |
| Receiving Yards by WR (CLE) | 21st | 139.9 | 31st | 180.1 |
| Receiving Yards by TE (CLE) | 19th | 55.7 | 7th | 46.2 |
| Receiving Yards by RB (CLE) | 9th | 38.3 | 7th | 23.2 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry (2026 rows): CLE: Todd Monken (HC, 2026 registry).

H4.1. PROE continuity HOU: engine 0.0079 vs mirror 0.0079 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -2.1 pp is the drift witness.
H4.2. Pace gap HOU: engine wp-band pace 27.8 s vs score-band PBP pace 31.3 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 31.3 s the engine's tempo-driven volume props are overstated.
H4.3. Pressure survival HOU: engine 0.9103 vs hit-based proxy 0.6875 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: HOU sacks per dropback Sunday; above the engine's 0.0577 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H4.4. Light-box tendency HOU defense: 64.8 pct of charted rushes faced <=6 box (weeks 1-7). Test: CLE early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.
H4.5. Coverage split HOU offense: route-weighted YPRR man 2.3700 vs zone 1.4600 (statyx week 10). SMALL SAMPLE: one coverage side under 60 routes; treat as directional only. Test: HOU target distribution vs CLE coverage; CLE engine man rate 0.3430 suggests the man split is the exploitable side if the coverage call holds.

Gaps: defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 5. JAX @ TEN

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | JAX | TEN |
|---|---|---|
| PROE (fraction) | 0.0061 | -0.0073 |
| Neutral pace (sec) | 28.2 | 29.4 |
| DC blitz rate | 0.3090 | 0.2417 |
| DC man rate | 0.2850 | 0.3323 |
| OL pressure allowed | 0.6536 | 0.6276 |
| Sack rate allowed | 0.0515 | 0.0500 |
| PA rate | 0.2371 | 0.2091 |
| RPO rate | 0.0085 | 0.0947 |
| Screen rate | 0.0928 | 0.0773 |
| Motion rate | 0.6394 | 0.4895 |
| Pressure-to-sack survival (engine) | 0.9212 | 0.9203 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | JAX | 0.0061 | 0.0061 (mirror) / -3.2 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | JAX | 28.2 | 32.9 (n=134) | w1-7 score-band | definitional gap 4.7 s |
| 1H pass rate | JAX | n/a (no stage1a field) | 0.6100 | w1-7 | external-only |
| Pressure-to-sack survival | JAX | 0.9212 | 0.7500 (proxy: sacks 10, hits 30) | w1-7 | proxy understates |
| Blitz rate (defense) | JAX | 0.3090 | 0.2151 (FTN, n=172) | w1-7 | check |
| Box defenders (defense) | JAX | 5.108 (JAX only in dossier report) | mean 5.6, heavy>=8 8.1 pct, light<=6 59.3 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | JAX | dc_man_rate 0.2850 (defense-side) | man 2.8642 (n=88), zone 1.9645 (n=257) | statyx w10 | complementary |
| PA / RPO / screen (offense) | JAX | 0.2371 / 0.0085 / 0.0928 | 0.1056 / 0.0186 / 0.0280 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | TEN | -0.0073 | -0.0073 (mirror) / -6.7 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | TEN | 29.4 | 31.3 (n=123) | w1-7 score-band | definitional gap 1.9 s |
| 1H pass rate | TEN | n/a (no stage1a field) | 0.5556 | w1-7 | external-only |
| Pressure-to-sack survival | TEN | 0.9203 | 0.7179 (proxy: sacks 11, hits 28) | w1-7 | proxy understates |
| Blitz rate (defense) | TEN | 0.2417 | 0.1359 (FTN, n=287) | w1-7 | check |
| Box defenders (defense) | TEN | n/a (report truncated) | mean 5.3, heavy>=8 4.5 pct, light<=6 64.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | TEN | dc_man_rate 0.3323 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | TEN | 0.2091 / 0.0947 / 0.0773 | 0.1166 / 0.0549 / 0.0395 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (JAX) | 4th | 28.6 | 22nd | 24.9 |
| Pass Yards (JAX) | 15th | 242.5 | 31st | 272.8 |
| Rushing Yards by RB (JAX) | 10th | 104.8 | 20th | 99.9 |
| Rushing Yards by QB (JAX) | 26th | 9.5 | 21st | 17.1 |
| Receiving Yards by WR (JAX) | 12th | 138.4 | 32nd | 194.9 |
| Receiving Yards by TE (JAX) | 7th | 66.2 | 4th | 42.9 |
| Receiving Yards by RB (JAX) | 19th | 28.5 | 21st | 35.0 |
| Points (TEN) | 29th | 18.0 | 2nd | 15.1 |
| Pass Yards (TEN) | 29th | 185.4 | 19th | 238.4 |
| Rushing Yards by RB (TEN) | 21st | 85.4 | 2nd | 68.2 |
| Rushing Yards by QB (TEN) | 15th | 14.0 | 11th | 12.6 |
| Receiving Yards by WR (TEN) | 19th | 137.6 | 28th | 174.5 |
| Receiving Yards by TE (TEN) | 30th | 28.8 | 1st | 31.2 |
| Receiving Yards by RB (TEN) | 28th | 19.0 | 18th | 32.6 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H5.1. PROE continuity JAX: engine 0.0061 vs mirror 0.0061 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -3.2 pp is the drift witness.
H5.2. Pace gap JAX: engine wp-band pace 28.2 s vs score-band PBP pace 32.9 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 32.9 s the engine's tempo-driven volume props are overstated.
H5.3. Pressure survival JAX: engine 0.9212 vs hit-based proxy 0.7500 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: JAX sacks per dropback Sunday; above the engine's 0.0515 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H5.4. Blitz divergence JAX defense: engine 0.3090 (weeks 1-3) vs FTN 0.2151 (weeks 1-7). Test: TEN dropbacks vs JAX blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H5.5. Light-box tendency JAX defense: 59.3 pct of charted rushes faced <=6 box (weeks 1-7). Test: TEN early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: TEN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 6. KC @ ATL

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | KC | ATL |
|---|---|---|
| PROE (fraction) | 0.0091 | -0.0119 |
| Neutral pace (sec) | 28.2 | 28.1 |
| DC blitz rate | 0.2798 | 0.2475 |
| DC man rate | 0.3525 | 0.3424 |
| OL pressure allowed | 0.6200 | 0.6608 |
| Sack rate allowed | 0.0352 | 0.0731 |
| PA rate | 0.3216 | 0.2009 |
| RPO rate | 0.0932 | 0.0263 |
| Screen rate | 0.1709 | 0.1416 |
| Motion rate | 0.5819 | 0.5861 |
| Pressure-to-sack survival (engine) | 0.9432 | 0.8894 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | KC | 0.0091 | 0.0091 (mirror) / 3.0 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | KC | 28.2 | 31.8 (n=156) | w1-7 score-band | definitional gap 3.6 s |
| 1H pass rate | KC | n/a (no stage1a field) | 0.6045 | w1-7 | external-only |
| Pressure-to-sack survival | KC | 0.9432 | 0.8158 (proxy: sacks 7, hits 31) | w1-7 | proxy understates |
| Blitz rate (defense) | KC | 0.2798 | 0.2066 (FTN, n=242) | w1-7 | aligned |
| Box defenders (defense) | KC | n/a (report truncated) | mean 5.7, heavy>=8 7.9 pct, light<=6 55.5 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | KC | dc_man_rate 0.3525 (defense-side) | man 2.2900 (n=55), zone 0.7800 (n=138) | statyx w10 | complementary |
| PA / RPO / screen (offense) | KC | 0.3216 / 0.0932 / 0.1709 | 0.1137 / 0.0664 / 0.0616 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | ATL | -0.0119 | -0.0119 (mirror) / -6.9 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | ATL | 28.1 | 33.7 (n=128) | w1-7 score-band | definitional gap 5.6 s |
| 1H pass rate | ATL | n/a (no stage1a field) | 0.5485 | w1-7 | external-only |
| Pressure-to-sack survival | ATL | 0.8894 | 0.6000 (proxy: sacks 16, hits 24) | w1-7 | proxy understates |
| Blitz rate (defense) | ATL | 0.2475 | 0.1846 (FTN, n=325) | w1-7 | aligned |
| Box defenders (defense) | ATL | n/a (report truncated) | mean 5.6, heavy>=8 5.8 pct, light<=6 61.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | ATL | dc_man_rate 0.3424 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | ATL | 0.2009 / 0.0263 / 0.1416 | 0.1080 / 0.0311 / 0.0360 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (KC) | 10th | 25.2 | 20th | 24.8 |
| Pass Yards (KC) | 11th | 254.6 | 20th | 241.2 |
| Rushing Yards by RB (KC) | 2nd | 125.2 | 15th | 109.1 |
| Rushing Yards by QB (KC) | 22nd | 10.5 | 25th | 5.9 |
| Receiving Yards by WR (KC) | 29th | 117.5 | 12th | 158.6 |
| Receiving Yards by TE (KC) | 3rd | 85.5 | 15th | 50.4 |
| Receiving Yards by RB (KC) | 1st | 51.6 | 16th | 32.2 |
| Points (ATL) | 23rd | 20.9 | 3rd | 17.9 |
| Pass Yards (ATL) | 29th | 196.2 | 7th | 220.5 |
| Rushing Yards by RB (ATL) | 3rd | 124.3 | 7th | 73.2 |
| Rushing Yards by QB (ATL) | 19th | 11.2 | 18th | 15.4 |
| Receiving Yards by WR (ATL) | 23rd | 126.8 | 3rd | 113.1 |
| Receiving Yards by TE (ATL) | 27th | 35.7 | 25th | 64.9 |
| Receiving Yards by RB (ATL) | 22nd | 33.8 | 20th | 42.5 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H6.1. PROE continuity KC: engine 0.0091 vs mirror 0.0091 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe 3.0 pp is the drift witness.
H6.2. Pace gap KC: engine wp-band pace 28.2 s vs score-band PBP pace 31.8 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 31.8 s the engine's tempo-driven volume props are overstated.
H6.3. Pressure survival KC: engine 0.9432 vs hit-based proxy 0.8158 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: KC sacks per dropback Sunday; above the engine's 0.0352 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H6.4. Light-box tendency KC defense: 55.5 pct of charted rushes faced <=6 box (weeks 1-7). Test: ATL early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.
H6.5. Coverage split KC offense: route-weighted YPRR man 2.2900 vs zone 0.7800 (statyx week 10). SMALL SAMPLE: one coverage side under 60 routes; treat as directional only. Test: KC target distribution vs ATL coverage; ATL engine man rate 0.3424 suggests the man split is the exploitable side if the coverage call holds.

Gaps: ATL absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 7. LAR @ ARI

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | LAR | ARI |
|---|---|---|
| PROE (fraction) | -0.0072 | 0.0093 |
| Neutral pace (sec) | 26.3 | 26.1 |
| DC blitz rate | 0.3029 | 0.3073 |
| DC man rate | 0.3591 | 0.3726 |
| OL pressure allowed | 0.6189 | 0.6688 |
| Sack rate allowed | 0.0378 | 0.0507 |
| PA rate | 0.2612 | 0.1757 |
| RPO rate | 0.0064 | 0.0084 |
| Screen rate | 0.0722 | 0.0642 |
| Motion rate | 0.6780 | 0.6203 |
| Pressure-to-sack survival (engine) | 0.9389 | 0.9242 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | LAR | -0.0072 | n/a (mirror) / n/a pp (nflverse) | w1-3 / w1-7 | check |
| Neutral pace (sec) | LAR | 26.3 | n/a (n=0) | w1-7 score-band | definitional gap n/a s |
| 1H pass rate | LAR | n/a (no stage1a field) | n/a | w1-7 | external-only |
| Pressure-to-sack survival | LAR | 0.9389 | n/a (proxy: sacks 0, hits 0) | w1-7 | proxy understates |
| Blitz rate (defense) | LAR | 0.3029 | n/a (FTN, n=0) | w1-7 | aligned |
| Box defenders (defense) | LAR | n/a (report truncated) | mean n/a, heavy>=8 n/a, light<=6 n/a | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | LAR | dc_man_rate 0.3591 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | LAR | 0.2612 / 0.0064 / 0.0722 | 0.0000 / 0.0000 / 0.0000 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | ARI | 0.0093 | 0.0093 (mirror) / -0.9 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | ARI | 26.1 | 32.7 (n=177) | w1-7 score-band | definitional gap 6.6 s |
| 1H pass rate | ARI | n/a (no stage1a field) | 0.6218 | w1-7 | external-only |
| Pressure-to-sack survival | ARI | 0.9242 | 0.7761 (proxy: sacks 15, hits 52) | w1-7 | proxy understates |
| Blitz rate (defense) | ARI | 0.3073 | 0.1907 (FTN, n=215) | w1-7 | check |
| Box defenders (defense) | ARI | n/a (report truncated) | mean 5.2, heavy>=8 12.0 pct, light<=6 55.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | ARI | dc_man_rate 0.3726 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | ARI | 0.1757 / 0.0084 / 0.0642 | 0.0911 / 0.0329 / 0.0349 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (LAR) | 13th | 23.8 | 31st | 28.3 |
| Pass Yards (LAR) | 7th | 265.2 | 13th | 230.7 |
| Rushing Yards by RB (LAR) | 5th | 117.7 | 19th | 99.6 |
| Rushing Yards by QB (LAR) | 28th | 3.1 | 21st | 19.2 |
| Receiving Yards by WR (LAR) | 13th | 163.1 | 17th | 146.3 |
| Receiving Yards by TE (LAR) | 15th | 61.9 | 18th | 50.7 |
| Receiving Yards by RB (LAR) | 8th | 40.2 | 21st | 33.7 |
| Points (ARI) | 28th | 19.8 | 6th | 20.1 |
| Pass Yards (ARI) | 26th | 231.1 | 4th | 209.1 |
| Rushing Yards by RB (ARI) | 10th | 89.4 | 9th | 77.0 |
| Rushing Yards by QB (ARI) | 23rd | 10.1 | 21st | 23.9 |
| Receiving Yards by WR (ARI) | 27th | 118.7 | 3rd | 116.4 |
| Receiving Yards by TE (ARI) | 2nd | 88.7 | 18th | 47.4 |
| Receiving Yards by RB (ARI) | 28th | 23.0 | 31st | 45.0 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H7.1. PROE continuity ARI: engine 0.0093 vs mirror 0.0093 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -0.9 pp is the drift witness.
H7.2. Pace gap ARI: engine wp-band pace 26.1 s vs score-band PBP pace 32.7 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 32.7 s the engine's tempo-driven volume props are overstated.
H7.3. Pressure survival ARI: engine 0.9242 vs hit-based proxy 0.7761 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: ARI sacks per dropback Sunday; above the engine's 0.0507 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H7.4. Blitz divergence ARI defense: engine 0.3073 (weeks 1-3) vs FTN 0.1907 (weeks 1-7). Test: LAR dropbacks vs ARI blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H7.5. Light-box tendency ARI defense: 55.6 pct of charted rushes faced <=6 box (weeks 1-7). Test: LAR early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: LAR missing from coaching CSV 2026; LAR absent from statyx week10 man/zone splits; ARI absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 8. MIA @ IND

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | MIA | IND |
|---|---|---|
| PROE (fraction) | -0.0071 | -0.0065 |
| Neutral pace (sec) | 29.0 | 26.8 |
| DC blitz rate | 0.2582 | 0.2222 |
| DC man rate | 0.3416 | 0.3407 |
| OL pressure allowed | 0.7236 | 0.7133 |
| Sack rate allowed | 0.0958 | 0.0736 |
| PA rate | 0.2575 | 0.2829 |
| RPO rate | 0.0327 | 0.0395 |
| Screen rate | 0.1138 | 0.0736 |
| Motion rate | 0.7440 | 0.6250 |
| Pressure-to-sack survival (engine) | 0.8676 | 0.8968 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | MIA | -0.0071 | -0.0071 (mirror) / -11.1 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | MIA | 29.0 | 33.1 (n=125) | w1-7 score-band | definitional gap 4.1 s |
| 1H pass rate | MIA | n/a (no stage1a field) | 0.5333 | w1-7 | external-only |
| Pressure-to-sack survival | MIA | 0.8676 | 0.5897 (proxy: sacks 16, hits 23) | w1-7 | proxy understates |
| Blitz rate (defense) | MIA | 0.2582 | 0.1762 (FTN, n=210) | w1-7 | check |
| Box defenders (defense) | MIA | n/a (report truncated) | mean 5.3, heavy>=8 0.0 pct, light<=6 65.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | MIA | dc_man_rate 0.3416 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | MIA | 0.2575 / 0.0327 / 0.1138 | 0.1111 / 0.0198 / 0.0494 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | IND | -0.0065 | -0.0065 (mirror) / -4.8 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | IND | 26.8 | 32.1 (n=186) | w1-7 score-band | definitional gap 5.3 s |
| 1H pass rate | IND | n/a (no stage1a field) | 0.5948 | w1-7 | external-only |
| Pressure-to-sack survival | IND | 0.8968 | 0.7077 (proxy: sacks 19, hits 46) | w1-7 | proxy understates |
| Blitz rate (defense) | IND | 0.2222 | 0.1992 (FTN, n=236) | w1-7 | aligned |
| Box defenders (defense) | IND | n/a (report truncated) | mean 5.3, heavy>=8 8.6 pct, light<=6 59.7 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | IND | dc_man_rate 0.3407 (defense-side) | man 0.4500 (n=40), zone 1.5200 (n=139) | statyx w10 | complementary |
| PA / RPO / screen (offense) | IND | 0.2829 / 0.0395 / 0.0736 | 0.1095 / 0.0232 / 0.0265 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (MIA) | 31st | 15.8 | 30th | 27.7 |
| Pass Yards (MIA) | 30th | 180.2 | 17th | 236.3 |
| Rushing Yards by RB (MIA) | 23rd | 78.8 | 21st | 111.7 |
| Rushing Yards by QB (MIA) | 3rd | 29.0 | 24th | 19.9 |
| Receiving Yards by WR (MIA) | 29th | 124.8 | 15th | 146.0 |
| Receiving Yards by TE (MIA) | 28th | 37.5 | 13th | 50.2 |
| Receiving Yards by RB (MIA) | 30th | 18.0 | 27th | 40.7 |
| Points (IND) | 26th | 20.4 | 23rd | 25.0 |
| Pass Yards (IND) | 27th | 192.2 | 18th | 224.6 |
| Rushing Yards by RB (IND) | 11th | 100.8 | 21st | 103.6 |
| Rushing Yards by QB (IND) | 24th | 10.0 | 3rd | 7.4 |
| Receiving Yards by WR (IND) | 22nd | 128.0 | 8th | 123.9 |
| Receiving Yards by TE (IND) | 26th | 38.8 | 20th | 64.4 |
| Receiving Yards by RB (IND) | 22nd | 25.4 | 23rd | 36.4 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H8.1. PROE continuity MIA: engine -0.0071 vs mirror -0.0071 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -11.1 pp is the drift witness.
H8.2. Pace gap MIA: engine wp-band pace 29.0 s vs score-band PBP pace 33.1 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 33.1 s the engine's tempo-driven volume props are overstated.
H8.3. Pressure survival MIA: engine 0.8676 vs hit-based proxy 0.5897 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: MIA sacks per dropback Sunday; above the engine's 0.0958 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H8.4. Blitz divergence MIA defense: engine 0.2582 (weeks 1-3) vs FTN 0.1762 (weeks 1-7). Test: IND dropbacks vs MIA blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H8.5. Light-box tendency MIA defense: 65.8 pct of charted rushes faced <=6 box (weeks 1-7). Test: IND early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: MIA absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 9. MIN @ GB

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | MIN | GB |
|---|---|---|
| PROE (fraction) | -0.0270 | 0.0044 |
| Neutral pace (sec) | 28.3 | 27.7 |
| DC blitz rate | 0.7222 | 0.2825 |
| DC man rate | 0.4350 | 0.3609 |
| OL pressure allowed | 0.7393 | 0.6392 |
| Sack rate allowed | 0.0989 | 0.0428 |
| PA rate | 0.3187 | 0.1923 |
| RPO rate | 0.0511 | 0.0638 |
| Screen rate | 0.1154 | 0.0909 |
| Motion rate | 0.5398 | 0.6194 |
| Pressure-to-sack survival (engine) | 0.8662 | 0.9330 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | MIN | -0.0270 | -0.0270 (mirror) / -3.6 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | MIN | 28.3 | 31.9 (n=139) | w1-7 score-band | definitional gap 3.6 s |
| 1H pass rate | MIN | n/a (no stage1a field) | 0.5882 | w1-7 | external-only |
| Pressure-to-sack survival | MIN | 0.8662 | 0.6087 (proxy: sacks 18, hits 28) | w1-7 | proxy understates |
| Blitz rate (defense) | MIN | 0.7222 | 0.3355 (FTN, n=155) | w1-7 | check |
| Box defenders (defense) | MIN | n/a (report truncated) | mean 5.2, heavy>=8 4.6 pct, light<=6 58.0 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | MIN | dc_man_rate 0.4350 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | MIN | 0.3187 / 0.0511 / 0.1154 | 0.1264 / 0.0172 / 0.0546 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | GB | 0.0044 | 0.0044 (mirror) / 3.6 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | GB | 27.7 | 30.6 (n=150) | w1-7 score-band | definitional gap 2.9 s |
| 1H pass rate | GB | n/a (no stage1a field) | 0.6522 | w1-7 | external-only |
| Pressure-to-sack survival | GB | 0.9330 | 0.7879 (proxy: sacks 14, hits 52) | w1-7 | proxy understates |
| Blitz rate (defense) | GB | 0.2825 | 0.1763 (FTN, n=295) | w1-7 | check |
| Box defenders (defense) | GB | n/a (report truncated) | mean 5.4, heavy>=8 3.1 pct, light<=6 62.3 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | GB | dc_man_rate 0.3609 (defense-side) | man 2.7860 (n=113), zone 2.8892 (n=403) | statyx w10 | complementary |
| PA / RPO / screen (offense) | GB | 0.1923 / 0.0638 / 0.0909 | 0.1408 / 0.0525 / 0.0588 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (MIN) | 27th | 18.2 | 11th | 21.2 |
| Pass Yards (MIN) | 31st | 179.6 | 14th | 231.9 |
| Rushing Yards by RB (MIN) | 21st | 85.4 | 16th | 93.2 |
| Rushing Yards by QB (MIN) | 11th | 21.5 | 9th | 12.0 |
| Receiving Yards by WR (MIN) | 31st | 103.6 | 21st | 155.9 |
| Receiving Yards by TE (MIN) | 13th | 57.8 | 2nd | 41.0 |
| Receiving Yards by RB (MIN) | 29th | 18.2 | 21st | 35.0 |
| Points (GB) | 12th | 24.0 | 1st | 14.5 |
| Pass Yards (GB) | 2nd | 290.9 | 2nd | 186.9 |
| Rushing Yards by RB (GB) | 32nd | 58.9 | 22nd | 103.9 |
| Rushing Yards by QB (GB) | 31st | 2.3 | 8th | 11.8 |
| Receiving Yards by WR (GB) | 3rd | 211.3 | 4th | 119.9 |
| Receiving Yards by TE (GB) | 17th | 52.7 | 8th | 46.4 |
| Receiving Yards by RB (GB) | 21st | 26.9 | 5th | 20.6 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H9.1. PROE continuity MIN: engine -0.0270 vs mirror -0.0270 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -3.6 pp is the drift witness.
H9.2. Pace gap MIN: engine wp-band pace 28.3 s vs score-band PBP pace 31.9 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 31.9 s the engine's tempo-driven volume props are overstated.
H9.3. Pressure survival MIN: engine 0.8662 vs hit-based proxy 0.6087 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: MIN sacks per dropback Sunday; above the engine's 0.0989 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H9.4. Blitz divergence MIN defense: engine 0.7222 (weeks 1-3) vs FTN 0.3355 (weeks 1-7). Test: GB dropbacks vs MIN blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H9.5. Light-box tendency MIN defense: 58.0 pct of charted rushes faced <=6 box (weeks 1-7). Test: GB early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: MIN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 10. PIT @ CIN

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | PIT | CIN |
|---|---|---|
| PROE (fraction) | 0.0117 | 0.0144 |
| Neutral pace (sec) | 27.4 | 28.0 |
| DC blitz rate | 0.2724 | 0.1719 |
| DC man rate | 0.3677 | 0.3089 |
| OL pressure allowed | 0.7101 | 0.6610 |
| Sack rate allowed | 0.0772 | 0.0437 |
| PA rate | 0.1579 | 0.1572 |
| RPO rate | 0.1055 | 0.0919 |
| Screen rate | 0.1333 | 0.0786 |
| Motion rate | 0.4748 | 0.5153 |
| Pressure-to-sack survival (engine) | 0.8913 | 0.9339 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | PIT | 0.0117 | 0.0117 (mirror) / 2.9 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | PIT | 27.4 | 31.9 (n=142) | w1-7 score-band | definitional gap 4.5 s |
| 1H pass rate | PIT | n/a (no stage1a field) | 0.6867 | w1-7 | external-only |
| Pressure-to-sack survival | PIT | 0.8913 | 0.6812 (proxy: sacks 22, hits 47) | w1-7 | proxy understates |
| Blitz rate (defense) | PIT | 0.2724 | 0.1953 (FTN, n=384) | w1-7 | aligned |
| Box defenders (defense) | PIT | n/a (report truncated) | mean 5.2, heavy>=8 5.9 pct, light<=6 67.2 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | PIT | dc_man_rate 0.3677 (defense-side) | man 1.0500 (n=86), zone 1.5900 (n=97) | statyx w10 | complementary |
| PA / RPO / screen (offense) | PIT | 0.1579 / 0.1055 / 0.1333 | 0.0758 / 0.0474 / 0.0514 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | CIN | 0.0144 | 0.0144 (mirror) / 6.4 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | CIN | 28.0 | 32.4 (n=129) | w1-7 score-band | definitional gap 4.4 s |
| 1H pass rate | CIN | n/a (no stage1a field) | 0.6932 | w1-7 | external-only |
| Pressure-to-sack survival | CIN | 0.9339 | 0.8077 (proxy: sacks 10, hits 42) | w1-7 | proxy understates |
| Blitz rate (defense) | CIN | 0.1719 | 0.1696 (FTN, n=171) | w1-7 | aligned |
| Box defenders (defense) | CIN | n/a (report truncated) | mean 5.2, heavy>=8 6.1 pct, light<=6 61.7 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | CIN | dc_man_rate 0.3089 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | CIN | 0.1572 / 0.0919 / 0.0786 | 0.1254 / 0.0339 / 0.0237 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (PIT) | 17th | 22.5 | 14th | 21.9 |
| Pass Yards (PIT) | 17th | 233.9 | 23rd | 248.6 |
| Rushing Yards by RB (PIT) | 7th | 112.4 | 14th | 88.4 |
| Rushing Yards by QB (PIT) | 29th | 3.0 | 32nd | 30.8 |
| Receiving Yards by WR (PIT) | 24th | 125.5 | 18th | 135.8 |
| Receiving Yards by TE (PIT) | 11th | 61.4 | 31st | 80.6 |
| Receiving Yards by RB (PIT) | 3rd | 47.0 | 16th | 32.2 |
| Points (CIN) | 2nd | 30.0 | 4th | 18.0 |
| Pass Yards (CIN) | 1st | 298.2 | 22nd | 242.0 |
| Rushing Yards by RB (CIN) | 26th | 72.8 | 4th | 70.0 |
| Rushing Yards by QB (CIN) | 25th | 9.6 | 13th | 13.0 |
| Receiving Yards by WR (CIN) | 1st | 214.4 | 11th | 138.5 |
| Receiving Yards by TE (CIN) | 21st | 49.2 | 21st | 57.0 |
| Receiving Yards by RB (CIN) | 11th | 34.6 | 32nd | 46.9 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry (2026 rows): PIT: Mike McCarthy (HC, 2026 registry).

H10.1. PROE continuity PIT: engine 0.0117 vs mirror 0.0117 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe 2.9 pp is the drift witness.
H10.2. Pace gap PIT: engine wp-band pace 27.4 s vs score-band PBP pace 31.9 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 31.9 s the engine's tempo-driven volume props are overstated.
H10.3. Pressure survival PIT: engine 0.8913 vs hit-based proxy 0.6812 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: PIT sacks per dropback Sunday; above the engine's 0.0772 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H10.4. Light-box tendency PIT defense: 67.2 pct of charted rushes faced <=6 box (weeks 1-7). Test: CIN early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.
H10.5. Coverage split PIT offense: route-weighted YPRR man 1.0500 vs zone 1.5900 (statyx week 10). Test: PIT target distribution vs CIN coverage; CIN engine man rate 0.3089 suggests the zone split is the exploitable side if the coverage call holds.

Gaps: CIN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 11. SEA @ LV

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | SEA | LV |
|---|---|---|
| PROE (fraction) | -0.0137 | 0.0120 |
| Neutral pace (sec) | 27.2 | 27.2 |
| DC blitz rate | 0.2338 | 0.2762 |
| DC man rate | 0.3430 | 0.3449 |
| OL pressure allowed | 0.7153 | 0.6240 |
| Sack rate allowed | 0.0664 | 0.0360 |
| PA rate | 0.2614 | 0.2194 |
| RPO rate | 0.0473 | 0.0293 |
| Screen rate | 0.1162 | 0.0899 |
| Motion rate | 0.5315 | 0.6149 |
| Pressure-to-sack survival (engine) | 0.9072 | 0.9423 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | SEA | -0.0137 | -0.0137 (mirror) / -5.4 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | SEA | 27.2 | 34.1 (n=139) | w1-7 score-band | definitional gap 7.0 s |
| 1H pass rate | SEA | n/a (no stage1a field) | 0.5381 | w1-7 | external-only |
| Pressure-to-sack survival | SEA | 0.9072 | 0.7500 (proxy: sacks 16, hits 48) | w1-7 | proxy understates |
| Blitz rate (defense) | SEA | 0.2338 | 0.1736 (FTN, n=242) | w1-7 | aligned |
| Box defenders (defense) | SEA | n/a (report truncated) | mean 5.2, heavy>=8 4.3 pct, light<=6 70.0 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | SEA | dc_man_rate 0.3430 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | SEA | 0.2614 / 0.0473 / 0.1162 | 0.1245 / 0.0486 / 0.0486 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | LV | 0.0120 | 0.0120 (mirror) / -2.3 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | LV | 27.2 | 32.7 (n=161) | w1-7 score-band | definitional gap 5.5 s |
| 1H pass rate | LV | n/a (no stage1a field) | 0.6298 | w1-7 | external-only |
| Pressure-to-sack survival | LV | 0.9423 | 0.8148 (proxy: sacks 10, hits 44) | w1-7 | proxy understates |
| Blitz rate (defense) | LV | 0.2762 | 0.1849 (FTN, n=265) | w1-7 | check |
| Box defenders (defense) | LV | n/a (report truncated) | mean 5.3, heavy>=8 5.6 pct, light<=6 59.1 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | LV | dc_man_rate 0.3449 (defense-side) | man 1.4400 (n=72), zone 2.6400 (n=151) | statyx w10 | complementary |
| PA / RPO / screen (offense) | LV | 0.2194 / 0.0293 / 0.0899 | 0.1266 / 0.0266 / 0.0406 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (SEA) | 18th | 22.4 | 32nd | 28.8 |
| Pass Yards (SEA) | 18th | 232.1 | 24th | 248.7 |
| Rushing Yards by RB (SEA) | 17th | 91.1 | 32nd | 132.1 |
| Rushing Yards by QB (SEA) | 10th | 11.2 | 19th | 15.7 |
| Receiving Yards by WR (SEA) | 4th | 172.4 | 25th | 160.8 |
| Receiving Yards by TE (SEA) | 25th | 27.4 | 16th | 56.9 |
| Receiving Yards by RB (SEA) | 14th | 32.2 | 18th | 31.9 |
| Points (LV) | 8th | 26.4 | 3rd | 18.0 |
| Pass Yards (LV) | 6th | 266.8 | 1st | 166.8 |
| Rushing Yards by RB (LV) | 27th | 71.6 | 3rd | 69.9 |
| Rushing Yards by QB (LV) | 32nd | 1.1 | 15th | 14.7 |
| Receiving Yards by WR (LV) | 32nd | 97.3 | 1st | 99.6 |
| Receiving Yards by TE (LV) | 1st | 122.9 | 3rd | 42.1 |
| Receiving Yards by RB (LV) | 4th | 46.6 | 6th | 27.1 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H11.1. PROE continuity SEA: engine -0.0137 vs mirror -0.0137 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -5.4 pp is the drift witness.
H11.2. Pace gap SEA: engine wp-band pace 27.2 s vs score-band PBP pace 34.1 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 34.1 s the engine's tempo-driven volume props are overstated.
H11.3. Pressure survival SEA: engine 0.9072 vs hit-based proxy 0.7500 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: SEA sacks per dropback Sunday; above the engine's 0.0664 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H11.4. Light-box tendency SEA defense: 70.0 pct of charted rushes faced <=6 box (weeks 1-7). Test: LV early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.
H11.5. PROE continuity LV: engine 0.0120 vs mirror 0.0120 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -2.3 pp is the drift witness.

Gaps: SEA absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 12. SF @ DAL

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | SF | DAL |
|---|---|---|
| PROE (fraction) | 0.0102 | 0.0041 |
| Neutral pace (sec) | 28.6 | 27.2 |
| DC blitz rate | 0.3243 | 0.2366 |
| DC man rate | 0.3620 | 0.3228 |
| OL pressure allowed | 0.5807 | 0.5732 |
| Sack rate allowed | 0.0323 | 0.0247 |
| PA rate | 0.2120 | 0.1992 |
| RPO rate | 0.0100 | 0.0397 |
| Screen rate | 0.0968 | 0.0625 |
| Motion rate | 0.7581 | 0.4709 |
| Pressure-to-sack survival (engine) | 0.9444 | 0.9569 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | SF | 0.0102 | 0.0102 (mirror) / 1.7 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | SF | 28.6 | 33.5 (n=150) | w1-7 score-band | definitional gap 4.8 s |
| 1H pass rate | SF | n/a (no stage1a field) | 0.5857 | w1-7 | external-only |
| Pressure-to-sack survival | SF | 0.9444 | 0.7879 (proxy: sacks 7, hits 26) | w1-7 | proxy understates |
| Blitz rate (defense) | SF | 0.3243 | 0.1889 (FTN, n=360) | w1-7 | check |
| Box defenders (defense) | SF | n/a (report truncated) | mean 5.3, heavy>=8 4.5 pct, light<=6 58.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | SF | dc_man_rate 0.3620 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | SF | 0.2120 / 0.0100 / 0.0968 | 0.1219 / 0.0331 / 0.0291 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | DAL | 0.0041 | 0.0041 (mirror) / 1.6 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | DAL | 27.2 | 30.6 (n=177) | w1-7 score-band | definitional gap 3.4 s |
| 1H pass rate | DAL | n/a (no stage1a field) | 0.6495 | w1-7 | external-only |
| Pressure-to-sack survival | DAL | 0.9569 | 0.8409 (proxy: sacks 7, hits 37) | w1-7 | proxy understates |
| Blitz rate (defense) | DAL | 0.2366 | 0.1734 (FTN, n=248) | w1-7 | aligned |
| Box defenders (defense) | DAL | n/a (report truncated) | mean 4.9, heavy>=8 5.5 pct, light<=6 62.8 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | DAL | dc_man_rate 0.3228 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | DAL | 0.1992 / 0.0397 / 0.0625 | 0.0909 / 0.0254 / 0.0317 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card (2026-11-14 snapshot)

| Metric | Off rank | Off value | Def allowed rank | Def allowed value |
|---|---|---|---|---|
| Points (SF) | 3rd | 29.4 | 25th | 26.2 |
| Pass Yards (SF) | 14th | 247.5 | 16th | 237.0 |
| Rushing Yards by RB (SF) | 12th | 99.5 | 29th | 112.8 |
| Rushing Yards by QB (SF) | 7th | 24.5 | 30th | 26.9 |
| Receiving Yards by WR (SF) | 18th | 137.6 | 24th | 159.3 |
| Receiving Yards by TE (SF) | 9th | 64.5 | 13th | 50.2 |
| Receiving Yards by RB (SF) | 5th | 45.1 | 9th | 27.4 |
| Points (DAL) | 6th | 27.3 | 6th | 19.5 |
| Pass Yards (DAL) | 9th | 264.6 | 9th | 222.9 |
| Rushing Yards by RB (DAL) | 15th | 91.4 | 5th | 71.5 |
| Rushing Yards by QB (DAL) | 18th | 11.3 | 1st | 5.2 |
| Receiving Yards by WR (DAL) | 2nd | 213.8 | 6th | 122.6 |
| Receiving Yards by TE (DAL) | 29th | 32.9 | 29th | 56.6 |
| Receiving Yards by RB (DAL) | 31st | 17.9 | 29th | 43.6 |

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry (2026 rows): SF: Kyle Shanahan (HC, 2026 registry).

H12.1. PROE continuity SF: engine 0.0102 vs mirror 0.0102 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe 1.7 pp is the drift witness.
H12.2. Pace gap SF: engine wp-band pace 28.6 s vs score-band PBP pace 33.5 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 33.5 s the engine's tempo-driven volume props are overstated.
H12.3. Pressure survival SF: engine 0.9444 vs hit-based proxy 0.7879 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: SF sacks per dropback Sunday; above the engine's 0.0323 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H12.4. Blitz divergence SF defense: engine 0.3243 (weeks 1-3) vs FTN 0.1889 (weeks 1-7). Test: DAL dropbacks vs SF blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H12.5. Light-box tendency SF defense: 58.8 pct of charted rushes faced <=6 box (weeks 1-7). Test: DAL early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: SF absent from statyx week10 man/zone splits; DAL absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## 13. LAC @ BAL

### Engine stage1a (2026-11-13 generation; PROE = weeks 1-3 mirror)

| Metric | LAC | BAL |
|---|---|---|
| PROE (fraction) | -0.0268 | -0.0088 |
| Neutral pace (sec) | 27.6 | 27.8 |
| DC blitz rate | 0.2637 | 0.2450 |
| DC man rate | 0.3336 | 0.2450 |
| OL pressure allowed | 0.7744 | 0.7153 |
| Sack rate allowed | 0.1045 | 0.0822 |
| PA rate | 0.2438 | 0.2511 |
| RPO rate | 0.0351 | 0.0423 |
| Screen rate | 0.1045 | 0.0731 |
| Motion rate | 0.7351 | 0.6502 |
| Pressure-to-sack survival (engine) | 0.8651 | 0.8851 |

### External cross-check

| Metric | Team | Engine | External | External window | Read |
|---|---|---|---|---|---|
| PROE (fraction) | LAC | -0.0268 | -0.0268 (mirror) / -10.0 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | LAC | 27.6 | 32.4 (n=139) | w1-7 score-band | definitional gap 4.8 s |
| 1H pass rate | LAC | n/a (no stage1a field) | 0.5287 | w1-7 | external-only |
| Pressure-to-sack survival | LAC | 0.8651 | 0.6769 (proxy: sacks 21, hits 44) | w1-7 | proxy understates |
| Blitz rate (defense) | LAC | 0.2637 | 0.1461 (FTN, n=89) | w1-7 | check |
| Box defenders (defense) | LAC | n/a (report truncated) | mean 5.9, heavy>=8 5.1 pct, light<=6 56.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | LAC | dc_man_rate 0.3336 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | LAC | 0.2438 / 0.0351 / 0.1045 | 0.1547 / 0.0288 / 0.0324 | w1-3 / w1-7 FTN | drift check |
| PROE (fraction) | BAL | -0.0088 | -0.0088 (mirror) / -3.9 pp (nflverse) | w1-3 / w1-7 | aligned |
| Neutral pace (sec) | BAL | 27.8 | 34.3 (n=147) | w1-7 score-band | definitional gap 6.5 s |
| 1H pass rate | BAL | n/a (no stage1a field) | 0.5885 | w1-7 | external-only |
| Pressure-to-sack survival | BAL | 0.8851 | 0.6604 (proxy: sacks 18, hits 35) | w1-7 | proxy understates |
| Blitz rate (defense) | BAL | 0.2450 | 0.2037 (FTN, n=216) | w1-7 | aligned |
| Box defenders (defense) | BAL | 4.985 (BAL only in dossier report) | mean 5.2, heavy>=8 6.4 pct, light<=6 61.6 pct | w1-7 FTN | external-only |
| Man/zone YPRR (offense) | BAL | dc_man_rate 0.2450 (defense-side) | man n/a (n=0), zone n/a (n=0) | statyx w10 | complementary |
| PA / RPO / screen (offense) | BAL | 0.2511 / 0.0423 / 0.0731 | 0.1043 / 0.0286 / 0.0327 | w1-3 / w1-7 FTN | drift check |

### Gridiron matchup card: ABSENT for this game (12 of 13 cards landed). GAP - do not infer ranks.

### Testable hypotheses (tendency-derived; no presser transcripts in worktree)

Coach registry: no 2026 row for either team; hypotheses are charted-tendency derived, not coach-speak quotes.

H13.1. PROE continuity LAC: engine -0.0268 vs mirror -0.0268 (weeks 1-3). Test: neutral early-down pass rate stays within 0.03 of the mirror through the first half; weeks 4-7 nflverse pass_oe -10.0 pp is the drift witness.
H13.2. Pace gap LAC: engine wp-band pace 27.6 s vs score-band PBP pace 32.4 s (weeks 1-7). Test: first-quarter neutral snap intervals; if the broadcast clock sits near 32.4 s the engine's tempo-driven volume props are overstated.
H13.3. Pressure survival LAC: engine 0.8651 vs hit-based proxy 0.6769 (weeks 1-7). The proxy's hit denominator undercounts pressures, so it understates survival. Test: LAC sacks per dropback Sunday; above the engine's 0.1045 gives the fresher hit-based signal weight, at or below it keeps the engine's charted-pressure denominator.
H13.4. Blitz divergence LAC defense: engine 0.2637 (weeks 1-3) vs FTN 0.1461 (weeks 1-7). Test: BAL dropbacks vs LAC blitz count in the first half; the weeks 4-7 FTN window is the fresher witness.
H13.5. Light-box tendency LAC defense: 56.6 pct of charted rushes faced <=6 box (weeks 1-7). Test: BAL early-down rush rate and yards-before-contact; light boxes invite the run even against a pass-heavy script.

Gaps: gridiron matchup card absent; LAC absent from statyx week10 man/zone splits; BAL absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only).

## Summary

| Game | Hypotheses | Primary gaps |
|---|---|---|
| NE @ DET | 5 | DET absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| BUF @ NYJ | 5 | BUF absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| CAR @ NO | 5 | CAR absent from statyx week10 man/zone splits; NO absent from statyx week10 man/zone splits |
| HOU @ CLE | 5 | defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| JAX @ TEN | 5 | TEN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| KC @ ATL | 5 | ATL absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| LAR @ ARI | 5 | LAR missing from coaching CSV 2026; LAR absent from statyx week10 man/zone splits |
| MIA @ IND | 5 | MIA absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| MIN @ GB | 5 | MIN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| PIT @ CIN | 5 | CIN absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| SEA @ LV | 5 | SEA absent from statyx week10 man/zone splits; defense man-rate external 2026 empty in def_tendencies.csv (engine-only) |
| SF @ DAL | 5 | SF absent from statyx week10 man/zone splits; DAL absent from statyx week10 man/zone splits |
| LAC @ BAL | 5 | gridiron matchup card absent; LAC absent from statyx week10 man/zone splits |

Companion trainer feed: brain/feeds/2026-11-15/hermes_week10_charting_signals.jsonl
(schema gse.trainer.drive_situational.v1, 117 records).
All numbers trace to the source windows above; nothing is imputed across windows.
Stage-5 action is NOT taken from this matrix: it is research cross-verification.
Live-market re-verify and the conjunction gate remain Wave 3's job.
