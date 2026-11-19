# Week 10 DraftKings 5-Slate DFS Packet (Munich + Main + Sun-Mon + SNF + MNF)

Generated from Stage 3/4 conserved Week 10 game projections under Stage-0 live roster gates.

> HOLD STATUS: HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER (`publish_allowed: False`). Wire-first calibration build held prior to official NFL 90-minute inactives and late-swap checks.

- Scope: All 5 Week 10 DraftKings slates (DG 156422, DG 156416, DG 156418, DG 156433, DG 156434)
- Cash vs GPP Separation: Cash optimizes 0.60 * median + 0.40 * p25 floor with zero-decoy prevents; 20-Max GPP optimizes ceiling, correlation stacks, and overlap diversity.
- Direct DraftKings CSVs: Each slate emits both an audit CSV (`data/dfs/week10_*_dk_upload.csv`) and pure DraftKings upload CSVs (`*_dk_cash_1up.csv` 1 lineup, `*_dk_20max_gpp.csv` 20 lineups) containing only official slot columns and Name (ID) tokens.
- Email Delivery Policy: auto_email_sent: False (dry-staged locally in data/dfs/ until morning kickoff confirmation).

## Slate Summary

| Slate Key | Draft Group | Contest Type | Release Status | Pool | Removed | Cash Salary | Cash Median | GPP Lineups | Pure Cash 1-Up CSV | Pure 20-Max GPP CSV | Audit CSV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| munich_ne_det | 156422 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 22 | 11 | $49400 | 106.34 | 20 | `data/dfs/week10_munich_ne_det_dk_cash_1up.csv` | `data/dfs/week10_munich_ne_det_dk_20max_gpp.csv` | `data/dfs/week10_munich_ne_det_dk_upload.csv` |
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 197 | 138 | $49800 | 169.09 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 235 | 166 | $50000 | 171.05 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 11 | $49500 | 106.51 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 23 | 17 | $49600 | 95.25 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

## NE @ DET Munich Showdown (08:30 AM CST) (DG 156422)

- auto_email_sent: False
- Master Bundle SHA-256: `3ab345ae5930fb3f71e8ff36cab8137f32728e64f638acb1b6280202c702dd09`
- Cash Total Salary: $49400 | Median Proj: 106.34 | P90 Ceiling: 158.73

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Amon-Ra St. Brown | DET | WR | $15600 | 36.13 | 27.73 | 52.11 |
| FLEX | Jahmyr Gibbs | DET | RB | $12400 | 25.93 | 20.58 | 36.1 |
| FLEX | Jared Goff | DET | QB | $10000 | 20.97 | 17.83 | 26.93 |
| FLEX | Tommy DeVito | NE | QB | $6000 | 14.2 | 9.03 | 24.01 |
| FLEX | Isaac TeSlaa | DET | WR | $3000 | 5.77 | 2.49 | 11.99 |
| FLEX | Sione Vaki | DET | RB | $2400 | 3.34 | 1.1 | 7.59 |

Top 20-Max GPP Exposures: Amon-Ra St. Brown (DET WR): 16/20, Jahmyr Gibbs (DET RB): 16/20, Tommy DeVito (NE QB): 12/20, Jared Goff (DET QB): 11/20, Jameson Williams (DET WR): 10/20, Jake Bates (DET K): 7/20, Isaac TeSlaa (DET WR): 6/20, Sam LaPorta (DET TE): 6/20

## Sunday Main 10-Game Classic (DG 156416)

- auto_email_sent: False
- Master Bundle SHA-256: `d7e12380695a12056991cc407eb299f2ebcd5bb7e6c472cc87742d57a3f09fd9`
- Cash Total Salary: $49800 | Median Proj: 169.09 | P90 Ceiling: 247.39

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC | QB | $6000 | 20.08 | 17.24 | 25.48 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.46 | 21.75 | 35.92 |
| RB | James Cook III | BUF | RB | $7400 | 23.64 | 19.15 | 32.19 |
| WR | Drake London | ATL | WR | $6600 | 20.61 | 15.35 | 30.62 |
| WR | Xavier Worthy | KC | WR | $4300 | 14.29 | 9.79 | 23.74 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 25.82 | 20.15 | 36.64 |
| TE | Gavin Bartholomew | MIN | TE | $2500 | 10.98 | 7.39 | 18.69 |
| FLEX | Kyren Williams | LAR | RB | $7100 | 20.42 | 15.62 | 29.56 |
| DST | Raiders | LV | DST | $2400 | 6.79 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Drake London (ATL WR): 17/20, Emmett Johnson (KC RB): 17/20, James Cook III (BUF RB): 16/20, CeeDee Lamb (DAL WR): 15/20, Gavin Bartholomew (MIN TE): 14/20, Patrick Mahomes (KC QB): 13/20, Travis Kelce (KC TE): 13/20, Xavier Worthy (KC WR): 12/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `56a8359f8336dfd4bd09ac1bb19050f23a249fadbaba1dac631d766d1522f7a5`
- Cash Total Salary: $50000 | Median Proj: 171.05 | P90 Ceiling: 250.74

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC | QB | $6000 | 20.08 | 17.24 | 25.48 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.46 | 21.75 | 35.92 |
| RB | James Cook III | BUF | RB | $7400 | 23.64 | 19.15 | 32.19 |
| WR | Xavier Worthy | KC | WR | $4300 | 14.29 | 9.79 | 23.74 |
| WR | Ja'Marr Chase | CIN | WR | $8100 | 25.15 | 19.3 | 36.55 |
| WR | Tee Higgins | CIN | WR | $7400 | 22.54 | 17.12 | 33.17 |
| TE | Gavin Bartholomew | MIN | TE | $2500 | 10.98 | 7.39 | 18.69 |
| FLEX | Zay Flowers | BAL | WR | $7200 | 21.12 | 16.22 | 30.45 |
| DST | Raiders | LV | DST | $2400 | 6.79 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, Ja'Marr Chase (CIN WR): 17/20, James Cook III (BUF RB): 13/20, Tee Higgins (CIN WR): 12/20, Drake London (ATL WR): 11/20, Germie Bernard (PIT WR): 11/20, Raiders (LV DST): 11/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Joe Burrow | CIN | PIT | $7200 | 21.93 | 27.19 | 15.0% |
| QB | Patrick Mahomes | KC | ATL | $6000 | 20.08 | 25.48 | 30.0% |
| RB | Emmett Johnson | KC | ATL | $4700 | 26.46 | 35.92 | 85.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 23.98 | 34.27 | 30.0% |
| RB | James Cook III | BUF | NYJ | $7400 | 23.64 | 32.19 | 65.0% |
| RB | Kyren Williams | LAR | ARI | $7100 | 20.42 | 29.56 | 20.0% |
| WR | Ja'Marr Chase | CIN | PIT | $8100 | 25.15 | 36.55 | 85.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 25.82 | 36.64 | 25.0% |
| WR | Tee Higgins | CIN | PIT | $7400 | 22.54 | 33.17 | 60.0% |
| WR | Drake London | ATL | KC | $6600 | 20.61 | 30.62 | 55.0% |
| TE | Travis Kelce | KC | ATL | $4700 | 14.69 | 23.67 | 20.0% |
| TE | Gavin Bartholomew | MIN | GB | $2500 | 10.98 | 18.69 | 85.0% |
| DST | Raiders | LV | SEA | $2400 | 6.79 | 14.55 | 55.0% |
| DST | Texans | HOU | CLE | $3400 | 7.32 | 16.73 | 5.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `75aded0b7df4a9e4c85f0cffbe31b5266817cb204cad556cbedc7805a70d612b`
- Cash Total Salary: $49500 | Median Proj: 106.51 | P90 Ceiling: 160.68

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Ja'Marr Chase | CIN | WR | $16500 | 37.72 | 28.95 | 54.83 |
| FLEX | Joe Burrow | CIN | QB | $10600 | 21.93 | 19.17 | 27.19 |
| FLEX | Tee Higgins | CIN | WR | $10400 | 22.54 | 17.12 | 33.17 |
| FLEX | DK Metcalf | PIT | WR | $7400 | 15.96 | 10.78 | 25.82 |
| FLEX | Dohnte Meyers | CIN | WR | $3000 | 6.58 | 2.97 | 13.59 |
| FLEX | Drew Sample | CIN | TE | $1600 | 1.78 | 0.5 | 6.08 |

Top 20-Max GPP Exposures: Ja'Marr Chase (CIN WR): 14/20, Tee Higgins (CIN WR): 13/20, Chase Brown (CIN RB): 10/20, DK Metcalf (PIT WR): 10/20, Germie Bernard (PIT WR): 10/20, Aaron Rodgers (PIT QB): 8/20, Jaylen Warren (PIT RB): 8/20, Joe Burrow (CIN QB): 8/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `b05ce35e5384ceccfcba338d80104e3975997bad63d8a66fb74fb393bc865af2`
- Cash Total Salary: $49600 | Median Proj: 95.25 | P90 Ceiling: 141.87

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Zay Flowers | BAL | WR | $15600 | 31.68 | 24.33 | 45.68 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 18.79 | 14.92 | 26.15 |
| FLEX | Jacoby Brissett | BAL | QB | $9200 | 16.12 | 13.46 | 21.18 |
| FLEX | Justin Herbert | LAC | QB | $9000 | 14.39 | 10.48 | 21.82 |
| FLEX | Rashod Bateman | BAL | WR | $3800 | 6.79 | 3.71 | 12.71 |
| FLEX | KeAndre Lambert-Smith | LAC | WR | $2000 | 7.48 | 3.9 | 14.33 |

Top 20-Max GPP Exposures: Zay Flowers (BAL WR): 18/20, Derrick Henry (BAL RB): 15/20, Justin Herbert (LAC QB): 12/20, Jacoby Brissett (BAL QB): 11/20, Tre' Harris (LAC WR): 9/20, Quentin Johnston (LAC WR): 6/20, Ravens (BAL DST): 6/20, KeAndre Lambert-Smith (LAC WR): 5/20
