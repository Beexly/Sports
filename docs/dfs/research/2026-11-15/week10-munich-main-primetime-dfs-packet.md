# Week 10 DraftKings 5-Slate DFS Packet (Munich + Main + Sun-Mon + SNF + MNF)

Generated from Stage 3/4 conserved Week 10 game projections under Stage-0 live roster gates.

> HOLD STATUS: HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER (`publish_allowed: False`). Wire-first calibration build held prior to official NFL 90-minute inactives and late-swap checks.

- Scope: All 5 Week 10 DraftKings slates (DG 156422, DG 156416, DG 156418, DG 156433, DG 156434)
- Cash vs GPP Separation: Cash optimizes 0.60 * median + 0.40 * p25 floor with zero-decoy blocks; 20-Max GPP optimizes ceiling, correlation stacks, and overlap diversity.
- Direct DraftKings CSVs: Each slate emits both an audit CSV (`data/dfs/week10_*_dk_upload.csv`) and pure DraftKings upload CSVs (`*_dk_cash_1up.csv` 1 lineup, `*_dk_20max_gpp.csv` 20 lineups) containing only official slot columns and Name (ID) tokens.
- Email Delivery Policy: auto_email_sent: False (dry-staged locally in data/dfs/ until morning kickoff confirmation).

## Slate Summary

| Slate Key | Draft Group | Contest Type | Release Status | Pool | Removed | Cash Salary | Cash Median | GPP Lineups | Pure Cash 1-Up CSV | Pure 20-Max GPP CSV | Audit CSV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| munich_ne_det | 156422 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 22 | 11 | $49600 | 100.6 | 20 | `data/dfs/week10_munich_ne_det_dk_cash_1up.csv` | `data/dfs/week10_munich_ne_det_dk_20max_gpp.csv` | `data/dfs/week10_munich_ne_det_dk_upload.csv` |
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 197 | 138 | $50000 | 166.7 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 237 | 163 | $49900 | 170.1 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 11 | $49800 | 103.73 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 25 | 14 | $49400 | 86.11 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

## NE @ DET Munich Showdown (08:30 AM CST) (DG 156422)

- auto_email_sent: False
- Master Bundle SHA-256: `4fd869508632c0457054bb590333b03810367dfad30cdd5e3463d57f94946851`
- Cash Total Salary: $49600 | Median Proj: 100.6 | P90 Ceiling: 152.92

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Tommy DeVito | NE | QB | $9000 | 20.07 | 12.26 | 34.93 |
| FLEX | Jahmyr Gibbs | DET | RB | $12400 | 23.86 | 18.41 | 34.21 |
| FLEX | Amon-Ra St. Brown | DET | WR | $10400 | 21.38 | 15.79 | 32.01 |
| FLEX | Jared Goff | DET | QB | $10000 | 21.06 | 17.99 | 26.9 |
| FLEX | Jake Bates | DET | K | $5400 | 9.81 | 6.67 | 15.78 |
| FLEX | Sione Vaki | DET | RB | $2400 | 4.42 | 1.97 | 9.09 |

Top 20-Max GPP Exposures: Amon-Ra St. Brown (DET WR): 15/20, Jahmyr Gibbs (DET RB): 15/20, Jared Goff (DET QB): 11/20, Tommy DeVito (NE QB): 11/20, Jameson Williams (DET WR): 9/20, Sam LaPorta (DET TE): 9/20, Jake Bates (DET K): 6/20, Lions (DET DST): 5/20

## Sunday Main 10-Game Classic (DG 156416)

- auto_email_sent: False
- Master Bundle SHA-256: `57be1d336d064748cbf26ae8367dbd421dca58a70310eecc476afbaef0ca2d42`
- Cash Total Salary: $50000 | Median Proj: 166.7 | P90 Ceiling: 247.32

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Josh Allen | BUF | QB | $7500 | 22.4 | 19.39 | 28.13 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.05 | 21.26 | 35.41 |
| RB | Christian McCaffrey | SF | RB | $8500 | 23.35 | 18.12 | 33.69 |
| WR | Drake London | ATL | WR | $6600 | 17.48 | 12.64 | 26.79 |
| WR | Xavier Worthy | KC | WR | $4300 | 12.62 | 8.29 | 21.27 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 24.37 | 18.75 | 35.19 |
| TE | Travis Kelce | KC | TE | $4700 | 18.2 | 13.41 | 27.9 |
| FLEX | Gavin Bartholomew | MIN | TE | $2500 | 15.57 | 11.27 | 24.66 |
| DST | Raiders | LV | DST | $2400 | 6.66 | 1.72 | 14.28 |

Top 20-Max GPP Exposures: Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, Travis Kelce (KC TE): 17/20, CeeDee Lamb (DAL WR): 16/20, Christian McCaffrey (SF RB): 13/20, Raiders (LV DST): 11/20, Drake London (ATL WR): 10/20, Patrick Mahomes (KC QB): 8/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `04c9748232b672185ab308f92817f1bb82f364a431009dd789a5c8d0101daad6`
- Cash Total Salary: $49900 | Median Proj: 170.1 | P90 Ceiling: 252.6

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Jacoby Brissett | BAL | QB | $5100 | 18.82 | 16.03 | 24.12 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.05 | 21.26 | 35.41 |
| RB | Chase Brown | CIN | RB | $6400 | 18.7 | 13.9 | 28.21 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 24.37 | 18.75 | 35.19 |
| WR | Ja'Marr Chase | CIN | WR | $8100 | 21.88 | 16.34 | 32.81 |
| WR | Tee Higgins | CIN | WR | $7400 | 21.56 | 16.23 | 32.16 |
| TE | Travis Kelce | KC | TE | $4700 | 18.2 | 13.41 | 27.9 |
| FLEX | Gavin Bartholomew | MIN | TE | $2500 | 15.57 | 11.27 | 24.66 |
| DST | Cardinals | ARI | DST | $2200 | 4.95 | 0.1 | 12.14 |

Top 20-Max GPP Exposures: Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, Travis Kelce (KC TE): 17/20, Tee Higgins (CIN WR): 15/20, Raiders (LV DST): 13/20, Christian McCaffrey (SF RB): 11/20, Ja'Marr Chase (CIN WR): 10/20, CeeDee Lamb (DAL WR): 9/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Joe Burrow | CIN | PIT | $7200 | 21.52 | 26.73 | 30.0% |
| QB | Patrick Mahomes | KC | ATL | $6000 | 18.89 | 24.23 | 20.0% |
| RB | Emmett Johnson | KC | ATL | $4700 | 26.05 | 35.41 | 85.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 23.35 | 33.69 | 55.0% |
| RB | Bijan Robinson | ATL | KC | $8200 | 20.65 | 29.14 | 5.0% |
| RB | Chase Brown | CIN | PIT | $6400 | 18.7 | 28.21 | 45.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 24.37 | 35.19 | 45.0% |
| WR | Tee Higgins | CIN | PIT | $7400 | 21.56 | 32.16 | 75.0% |
| WR | Ja'Marr Chase | CIN | PIT | $8100 | 21.88 | 32.81 | 50.0% |
| WR | Christian Watson | GB | MIN | $7700 | 19.67 | 29.33 | 5.0% |
| TE | Travis Kelce | KC | ATL | $4700 | 18.2 | 27.9 | 85.0% |
| TE | Gavin Bartholomew | MIN | GB | $2500 | 15.57 | 24.66 | 85.0% |
| DST | Raiders | LV | SEA | $2400 | 6.66 | 14.28 | 65.0% |
| DST | Texans | HOU | CLE | $3400 | 7.34 | 16.32 | 15.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `5442e6c2017c71b40dcb323184d241454b52f436036da4a24bb2a4b6561e5d1c`
- Cash Total Salary: $49800 | Median Proj: 103.73 | P90 Ceiling: 156.86

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Chase Brown | CIN | RB | $12600 | 28.04 | 20.86 | 42.32 |
| FLEX | Ja'Marr Chase | CIN | WR | $11000 | 21.88 | 16.34 | 32.81 |
| FLEX | Joe Burrow | CIN | QB | $10600 | 21.52 | 18.78 | 26.73 |
| FLEX | Tee Higgins | CIN | WR | $10400 | 21.56 | 16.23 | 32.16 |
| FLEX | Darnell Washington | PIT | TE | $3600 | 8.21 | 4.49 | 15.5 |
| FLEX | Drew Sample | CIN | TE | $1600 | 2.52 | 0.5 | 7.34 |

Top 20-Max GPP Exposures: Ja'Marr Chase (CIN WR): 13/20, Tee Higgins (CIN WR): 13/20, Chase Brown (CIN RB): 11/20, Aaron Rodgers (PIT QB): 9/20, Joe Burrow (CIN QB): 9/20, DK Metcalf (PIT WR): 8/20, Germie Bernard (PIT WR): 8/20, Jaylen Warren (PIT RB): 8/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `dcaf7b892a1ad84e9b4865a48972be73f8bf1ff46ad59efff31c8b328c0514b4`
- Cash Total Salary: $49400 | Median Proj: 86.11 | P90 Ceiling: 129.38

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Jacoby Brissett | BAL | QB | $13800 | 28.23 | 24.05 | 36.18 |
| FLEX | Zay Flowers | BAL | WR | $10400 | 18.04 | 13.45 | 27.2 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 13.18 | 9.72 | 19.92 |
| FLEX | Kimani Vidal | LAC | RB | $5800 | 9.35 | 5.98 | 15.81 |
| FLEX | Keaton Mitchell | LAC | RB | $4800 | 8.88 | 5.26 | 15.84 |
| FLEX | Riley Patterson | BAL | K | $4600 | 8.43 | 5.27 | 14.43 |

Top 20-Max GPP Exposures: Zay Flowers (BAL WR): 16/20, Jacoby Brissett (BAL QB): 14/20, Derrick Henry (BAL RB): 11/20, Justin Herbert (LAC QB): 9/20, Keaton Mitchell (LAC RB): 7/20, Kimani Vidal (LAC RB): 7/20, Omarion Hampton (LAC RB): 7/20, Mark Andrews (BAL TE): 6/20
