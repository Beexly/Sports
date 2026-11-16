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
| munich_ne_det | 156422 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 22 | 11 | $49400 | 104.15 | 20 | `data/dfs/week10_munich_ne_det_dk_cash_1up.csv` | `data/dfs/week10_munich_ne_det_dk_20max_gpp.csv` | `data/dfs/week10_munich_ne_det_dk_upload.csv` |
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 197 | 138 | $49900 | 166.38 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 237 | 163 | $49900 | 171.34 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 11 | $49700 | 106.53 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 25 | 14 | $50000 | 94.51 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

## NE @ DET Munich Showdown (08:30 AM CST) (DG 156422)

- auto_email_sent: False
- Master Bundle SHA-256: `12c122b9a67ccb4c712b4795f6aebb6305ed57ad0e2b924a1772ada078c69768`
- Cash Total Salary: $49400 | Median Proj: 104.15 | P90 Ceiling: 156.47

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Amon-Ra St. Brown | DET | WR | $15600 | 36.2 | 27.76 | 52.24 |
| FLEX | Jahmyr Gibbs | DET | RB | $12400 | 25.91 | 20.54 | 36.12 |
| FLEX | Jared Goff | DET | QB | $10000 | 21.01 | 17.85 | 27.02 |
| FLEX | Tommy DeVito | NE | QB | $6000 | 11.91 | 6.88 | 21.5 |
| FLEX | Isaac TeSlaa | DET | WR | $3000 | 5.78 | 2.5 | 12.01 |
| FLEX | Sione Vaki | DET | RB | $2400 | 3.34 | 1.1 | 7.58 |

Top 20-Max GPP Exposures: Amon-Ra St. Brown (DET WR): 17/20, Jahmyr Gibbs (DET RB): 16/20, Jared Goff (DET QB): 12/20, Tommy DeVito (NE QB): 11/20, Jameson Williams (DET WR): 10/20, Lions (DET DST): 8/20, Jake Bates (DET K): 7/20, Isaac TeSlaa (DET WR): 6/20

## Sunday Main 10-Game Classic (DG 156416)

- auto_email_sent: False
- Master Bundle SHA-256: `4693d60b1211e8409be6dab95e351b266c06a271c5ff613ee51b6baa164f1fc7`
- Cash Total Salary: $49900 | Median Proj: 166.38 | P90 Ceiling: 243.19

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC | QB | $6000 | 18.55 | 15.77 | 23.84 |
| RB | Emmett Johnson | KC | RB | $4700 | 25.94 | 21.45 | 34.96 |
| RB | James Cook III | BUF | RB | $7400 | 23.67 | 19.13 | 32.31 |
| WR | Drake London | ATL | WR | $6600 | 20.89 | 15.6 | 30.96 |
| WR | Myles Price | MIN | WR | $3000 | 10.31 | 6.81 | 17.84 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 25.37 | 19.81 | 35.99 |
| TE | Gavin Bartholomew | MIN | TE | $2500 | 10.94 | 7.34 | 18.68 |
| FLEX | Christian McCaffrey | SF | RB | $8500 | 23.84 | 18.63 | 34.06 |
| DST | Raiders | LV | DST | $2400 | 6.87 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Drake London (ATL WR): 17/20, Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, James Cook III (BUF RB): 17/20, CeeDee Lamb (DAL WR): 12/20, Raiders (LV DST): 11/20, Christian McCaffrey (SF RB): 10/20, Xavier Worthy (KC WR): 9/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `091fbe4bfe35da961861462461a2ef6fef7515d4dd53a5d08635977eace3c826`
- Cash Total Salary: $49900 | Median Proj: 171.34 | P90 Ceiling: 250.59

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Jacoby Brissett | BAL | QB | $5100 | 19.37 | 16.55 | 24.73 |
| RB | Emmett Johnson | KC | RB | $4700 | 25.94 | 21.45 | 34.96 |
| RB | James Cook III | BUF | RB | $7400 | 23.67 | 19.13 | 32.31 |
| WR | Drake London | ATL | WR | $6600 | 20.89 | 15.6 | 30.96 |
| WR | Xavier Worthy | KC | WR | $4300 | 13.43 | 9.28 | 22.24 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 25.37 | 19.81 | 35.99 |
| TE | Gavin Bartholomew | MIN | TE | $2500 | 10.94 | 7.34 | 18.68 |
| FLEX | Ja'Marr Chase | CIN | WR | $8100 | 24.86 | 19.07 | 36.17 |
| DST | Raiders | LV | DST | $2400 | 6.87 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, Ja'Marr Chase (CIN WR): 17/20, James Cook III (BUF RB): 15/20, Aaron Rodgers (PIT QB): 13/20, DK Metcalf (PIT WR): 13/20, Tee Higgins (CIN WR): 12/20, Raiders (LV DST): 11/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Joe Burrow | CIN | PIT | $7200 | 21.56 | 26.81 | 15.0% |
| QB | Jacoby Brissett | BAL | LAC | $5100 | 19.37 | 24.73 | 10.0% |
| RB | Emmett Johnson | KC | ATL | $4700 | 25.94 | 34.96 | 85.0% |
| RB | James Cook III | BUF | NYJ | $7400 | 23.67 | 32.31 | 75.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 23.84 | 34.06 | 30.0% |
| RB | Bijan Robinson | ATL | KC | $8200 | 22.12 | 31.12 | 5.0% |
| WR | Ja'Marr Chase | CIN | PIT | $8100 | 24.86 | 36.17 | 85.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 25.37 | 35.99 | 25.0% |
| WR | Tee Higgins | CIN | PIT | $7400 | 22.24 | 32.74 | 60.0% |
| WR | Drake London | ATL | KC | $6600 | 20.89 | 30.96 | 35.0% |
| TE | Travis Kelce | KC | ATL | $4700 | 13.75 | 22.06 | 10.0% |
| TE | Gavin Bartholomew | MIN | GB | $2500 | 10.94 | 18.68 | 85.0% |
| DST | Raiders | LV | SEA | $2400 | 6.87 | 14.55 | 55.0% |
| DST | Texans | HOU | CLE | $3400 | 7.33 | 16.67 | 10.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `f84b91104674abffe2104dbcbae7150b98716d90863551ccded8710815161b99`
- Cash Total Salary: $49700 | Median Proj: 106.53 | P90 Ceiling: 160.85

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Ja'Marr Chase | CIN | WR | $16500 | 37.29 | 28.61 | 54.25 |
| FLEX | Joe Burrow | CIN | QB | $10600 | 21.56 | 18.8 | 26.81 |
| FLEX | DK Metcalf | PIT | WR | $7400 | 16.15 | 10.96 | 26.01 |
| FLEX | Germie Bernard | PIT | WR | $7000 | 15.02 | 9.92 | 24.71 |
| FLEX | Evan McPherson | CIN | K | $5200 | 10.0 | 7.04 | 15.63 |
| FLEX | Dohnte Meyers | CIN | WR | $3000 | 6.51 | 2.95 | 13.44 |

Top 20-Max GPP Exposures: Ja'Marr Chase (CIN WR): 14/20, Tee Higgins (CIN WR): 12/20, Chase Brown (CIN RB): 10/20, DK Metcalf (PIT WR): 10/20, Germie Bernard (PIT WR): 10/20, Aaron Rodgers (PIT QB): 8/20, Jaylen Warren (PIT RB): 8/20, Joe Burrow (CIN QB): 8/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `4cf688884a1323d0189d21e2f2cf3b29532c281c1f21fd5fdfec7f6f29ee0ae3`
- Cash Total Salary: $50000 | Median Proj: 94.51 | P90 Ceiling: 141.57

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Zay Flowers | BAL | WR | $15600 | 30.53 | 23.38 | 44.59 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 16.58 | 12.82 | 23.71 |
| FLEX | Jacoby Brissett | BAL | QB | $9200 | 19.37 | 16.55 | 24.73 |
| FLEX | Tre' Harris | LAC | WR | $6800 | 12.71 | 8.2 | 21.4 |
| FLEX | Riley Patterson | BAL | K | $4600 | 8.66 | 5.49 | 14.69 |
| FLEX | Rashod Bateman | BAL | WR | $3800 | 6.66 | 3.75 | 12.45 |

Top 20-Max GPP Exposures: Zay Flowers (BAL WR): 17/20, Jacoby Brissett (BAL QB): 13/20, Derrick Henry (BAL RB): 12/20, Tre' Harris (LAC WR): 11/20, Justin Herbert (LAC QB): 9/20, Ladd McConkey (LAC WR): 9/20, Ravens (BAL DST): 7/20, Omarion Hampton (LAC RB): 6/20
