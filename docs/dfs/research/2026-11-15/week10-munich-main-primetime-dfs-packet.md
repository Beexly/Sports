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
| munich_ne_det | 156422 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 22 | 11 | $50000 | 100.3 | 20 | `data/dfs/week10_munich_ne_det_dk_cash_1up.csv` | `data/dfs/week10_munich_ne_det_dk_20max_gpp.csv` | `data/dfs/week10_munich_ne_det_dk_upload.csv` |
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 197 | 138 | $49900 | 171.73 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 237 | 163 | $49900 | 174.73 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 11 | $49800 | 105.47 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 25 | 14 | $49600 | 93.36 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

## NE @ DET Munich Showdown (08:30 AM CST) (DG 156422)

- auto_email_sent: False
- Master Bundle SHA-256: `ebacc75f4df7583d8655f005bf175b42c8b819195f69005fd54f01b8126ae0db`
- Cash Total Salary: $50000 | Median Proj: 100.3 | P90 Ceiling: 145.85

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Amon-Ra St. Brown | DET | WR | $15600 | 34.84 | 26.55 | 50.6 |
| FLEX | Jahmyr Gibbs | DET | RB | $12400 | 26.11 | 20.69 | 36.42 |
| FLEX | Jared Goff | DET | QB | $10000 | 20.79 | 17.66 | 26.74 |
| FLEX | Jake Bates | DET | K | $5400 | 9.85 | 6.75 | 15.75 |
| FLEX | Andy Borregales | NE | K | $5000 | 8.24 | 5.72 | 13.05 |
| FLEX | Brock Wright | DET | TE | $1600 | 0.47 | 0.1 | 3.29 |

Top 20-Max GPP Exposures: Amon-Ra St. Brown (DET WR): 16/20, Jahmyr Gibbs (DET RB): 16/20, Jared Goff (DET QB): 11/20, Tommy DeVito (NE QB): 11/20, Jameson Williams (DET WR): 9/20, Sam LaPorta (DET TE): 9/20, Lions (DET DST): 8/20, Jake Bates (DET K): 7/20

## Sunday Main 10-Game Classic (DG 156416)

- auto_email_sent: False
- Master Bundle SHA-256: `cf79167ce3dd6bcc73375457d6696f23c0c2c26ffdf9e489bb8b8b1dfc944295`
- Cash Total Salary: $49900 | Median Proj: 171.73 | P90 Ceiling: 252.21

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Trevor Lawrence | JAX | QB | $6600 | 20.22 | 16.57 | 27.16 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.58 | 22.01 | 35.82 |
| RB | James Cook III | BUF | RB | $7400 | 23.76 | 19.27 | 32.31 |
| WR | Drake London | ATL | WR | $6600 | 20.48 | 15.22 | 30.47 |
| WR | Parker Washington | JAX | WR | $6200 | 18.01 | 12.98 | 27.57 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 25.39 | 19.78 | 36.1 |
| TE | Travis Kelce | KC | TE | $4700 | 17.23 | 12.77 | 26.62 |
| FLEX | Gavin Bartholomew | MIN | TE | $2500 | 13.19 | 9.23 | 21.61 |
| DST | Raiders | LV | DST | $2400 | 6.87 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Drake London (ATL WR): 17/20, Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, Travis Kelce (KC TE): 17/20, James Cook III (BUF RB): 13/20, CeeDee Lamb (DAL WR): 12/20, Raiders (LV DST): 10/20, Patrick Mahomes (KC QB): 9/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `22496f1e394ab313f5ebb1021773c6b36e87a2dc8d2de507ae8a70cd0fa7ad33`
- Cash Total Salary: $49900 | Median Proj: 174.73 | P90 Ceiling: 254.67

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | Jacoby Brissett | BAL | QB | $5100 | 19.24 | 16.47 | 24.52 |
| RB | Emmett Johnson | KC | RB | $4700 | 26.58 | 22.01 | 35.82 |
| RB | James Cook III | BUF | RB | $7400 | 23.76 | 19.27 | 32.31 |
| WR | Parker Washington | JAX | WR | $6200 | 18.01 | 12.98 | 27.57 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 25.39 | 19.78 | 36.1 |
| WR | Ja'Marr Chase | CIN | WR | $8100 | 24.46 | 18.73 | 35.57 |
| TE | Travis Kelce | KC | TE | $4700 | 17.23 | 12.77 | 26.62 |
| FLEX | Gavin Bartholomew | MIN | TE | $2500 | 13.19 | 9.23 | 21.61 |
| DST | Raiders | LV | DST | $2400 | 6.87 | 1.67 | 14.55 |

Top 20-Max GPP Exposures: Emmett Johnson (KC RB): 17/20, Gavin Bartholomew (MIN TE): 17/20, James Cook III (BUF RB): 15/20, Travis Kelce (KC TE): 15/20, Ja'Marr Chase (CIN WR): 13/20, Raiders (LV DST): 12/20, Drake London (ATL WR): 11/20, Tee Higgins (CIN WR): 9/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Joe Burrow | CIN | PIT | $7200 | 21.55 | 26.8 | 15.0% |
| QB | Jacoby Brissett | BAL | LAC | $5100 | 19.24 | 24.52 | 20.0% |
| RB | Emmett Johnson | KC | ATL | $4700 | 26.58 | 35.82 | 85.0% |
| RB | James Cook III | BUF | NYJ | $7400 | 23.76 | 32.31 | 75.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 24.15 | 34.4 | 30.0% |
| RB | Bhayshul Tuten | JAX | TEN | $6600 | 18.89 | 27.27 | 5.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 25.39 | 36.1 | 35.0% |
| WR | Ja'Marr Chase | CIN | PIT | $8100 | 24.46 | 35.57 | 65.0% |
| WR | Tee Higgins | CIN | PIT | $7400 | 21.81 | 32.27 | 45.0% |
| WR | Drake London | ATL | KC | $6600 | 20.48 | 30.47 | 55.0% |
| TE | Travis Kelce | KC | ATL | $4700 | 17.23 | 26.62 | 75.0% |
| TE | Gavin Bartholomew | MIN | GB | $2500 | 13.19 | 21.61 | 85.0% |
| DST | Raiders | LV | SEA | $2400 | 6.87 | 14.55 | 60.0% |
| DST | Texans | HOU | CLE | $3400 | 7.34 | 16.67 | 5.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `a3fc741a40e91944f22a7d49d2c133ba2bb3a56561b044b1532d54667f786837`
- Cash Total Salary: $49800 | Median Proj: 105.47 | P90 Ceiling: 158.47

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Chase Brown | CIN | RB | $12600 | 26.68 | 19.71 | 40.39 |
| FLEX | Ja'Marr Chase | CIN | WR | $11000 | 24.46 | 18.73 | 35.57 |
| FLEX | Joe Burrow | CIN | QB | $10600 | 21.55 | 18.79 | 26.8 |
| FLEX | Tee Higgins | CIN | WR | $10400 | 21.81 | 16.44 | 32.27 |
| FLEX | Darnell Washington | PIT | TE | $3600 | 8.66 | 4.69 | 16.4 |
| FLEX | Drew Sample | CIN | TE | $1600 | 2.31 | 0.5 | 7.04 |

Top 20-Max GPP Exposures: Ja'Marr Chase (CIN WR): 15/20, Tee Higgins (CIN WR): 13/20, Chase Brown (CIN RB): 10/20, Aaron Rodgers (PIT QB): 9/20, Jaylen Warren (PIT RB): 9/20, DK Metcalf (PIT WR): 8/20, Germie Bernard (PIT WR): 8/20, Joe Burrow (CIN QB): 8/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `7158c83506a0350c94617fac704864b6979903bf58b7e11c570479d5f9c5ccef`
- Cash Total Salary: $49600 | Median Proj: 93.36 | P90 Ceiling: 142.02

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Jacoby Brissett | BAL | QB | $13800 | 28.86 | 24.7 | 36.78 |
| FLEX | Zay Flowers | BAL | WR | $10400 | 20.02 | 15.28 | 29.25 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 16.71 | 12.99 | 23.79 |
| FLEX | Tre' Harris | LAC | WR | $6800 | 12.5 | 8.04 | 21.06 |
| FLEX | Riley Patterson | BAL | K | $4600 | 8.62 | 5.44 | 14.65 |
| FLEX | Ravens | BAL | DST | $4000 | 6.65 | 2.8 | 16.49 |

Top 20-Max GPP Exposures: Zay Flowers (BAL WR): 17/20, Derrick Henry (BAL RB): 13/20, Jacoby Brissett (BAL QB): 13/20, Tre' Harris (LAC WR): 10/20, Justin Herbert (LAC QB): 9/20, Ladd McConkey (LAC WR): 8/20, Ravens (BAL DST): 7/20, Omarion Hampton (LAC RB): 6/20
