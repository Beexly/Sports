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
| munich_ne_det | 156422 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 21 | 13 | $49000 | 101.22 | 20 | `data/dfs/week10_munich_ne_det_dk_cash_1up.csv` | `data/dfs/week10_munich_ne_det_dk_20max_gpp.csv` | `data/dfs/week10_munich_ne_det_dk_upload.csv` |
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 202 | 127 | $49900 | 140.6 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 242 | 152 | $50000 | 143.19 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 11 | $49100 | 98.93 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 25 | 14 | $49800 | 86.48 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

## NE @ DET Munich Showdown (08:30 AM CST) (DG 156422)

- auto_email_sent: False
- Master Bundle SHA-256: `4ac8f22658ad36f1a17ff59e2ad3fcbaf77ed5a2082141772b98169c5071ce82`
- Cash Total Salary: $49000 | Median Proj: 101.22 | P90 Ceiling: 198.8

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Jared Goff | DET | QB | $15000 | 34.98 | 20.86 | 55.37 |
| FLEX | Jahmyr Gibbs | DET | RB | $12400 | 25.56 | 9.69 | 57.39 |
| FLEX | Drake Maye | NE | QB | $10800 | 20.71 | 13.24 | 34.6 |
| FLEX | Jake Bates | DET | K | $5400 | 10.11 | 6.16 | 17.63 |
| FLEX | Isaac TeSlaa | DET | WR | $3000 | 6.03 | 0.77 | 19.85 |
| FLEX | Sione Vaki | DET | RB | $2400 | 3.83 | 0.25 | 13.96 |

Top 20-Max GPP Exposures: Jahmyr Gibbs (DET RB): 19/20, Amon-Ra St. Brown (DET WR): 13/20, A.J. Brown (NE WR): 12/20, Isaac TeSlaa (DET WR): 9/20, Jared Goff (DET QB): 8/20, Jameson Williams (DET WR): 7/20, Mack Hollins (NE WR): 7/20, Sam LaPorta (DET TE): 7/20

## Sunday Main 10-Game Classic (DG 156416)

- auto_email_sent: False
- Master Bundle SHA-256: `af89120ad6a78d1c67b8a3b860d36e6917d8f572312cfbd6c0db44040ceeb338`
- Cash Total Salary: $49900 | Median Proj: 140.6 | P90 Ceiling: 335.3

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | C.J. Stroud | HOU | QB | $5900 | 22.49 | 16.42 | 33.38 |
| RB | James Cook III | BUF | RB | $7400 | 22.39 | 8.57 | 48.87 |
| RB | Christian McCaffrey | SF | RB | $8500 | 21.14 | 5.72 | 55.76 |
| WR | CeeDee Lamb | DAL | WR | $8800 | 17.03 | 5.34 | 42.55 |
| WR | Xavier Hutchinson | HOU | WR | $4000 | 11.61 | 3.18 | 33.42 |
| WR | Xavier Worthy | KC | WR | $4300 | 10.93 | 3.47 | 28.57 |
| TE | Dalton Schultz | HOU | TE | $3400 | 12.86 | 3.97 | 31.73 |
| FLEX | Ashton Jeanty | LV | RB | $5400 | 16.59 | 3.65 | 48.82 |
| DST | Cardinals | ARI | DST | $2200 | 5.56 | 0.1 | 12.2 |

Top 20-Max GPP Exposures: Ashton Jeanty (LV RB): 11/20, C.J. Stroud (HOU QB): 11/20, Christian McCaffrey (SF RB): 11/20, Dalton Schultz (HOU TE): 11/20, James Cook III (BUF RB): 11/20, Quinshon Judkins (CLE RB): 11/20, Xavier Hutchinson (HOU WR): 11/20, Parker Washington (JAX WR): 10/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `8d0484d3ebe69e180134195c2c09ef5551714536332d82886bacf6c220fb8631`
- Cash Total Salary: $50000 | Median Proj: 143.19 | P90 Ceiling: 333.19

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | C.J. Stroud | HOU | QB | $5900 | 22.49 | 16.42 | 33.38 |
| RB | James Cook III | BUF | RB | $7400 | 22.39 | 8.57 | 48.87 |
| RB | Christian McCaffrey | SF | RB | $8500 | 21.14 | 5.72 | 55.76 |
| WR | Matthew Golden | GB | WR | $7300 | 15.06 | 4.38 | 41.3 |
| WR | Xavier Hutchinson | HOU | WR | $4000 | 11.61 | 3.18 | 33.42 |
| WR | Xavier Worthy | KC | WR | $4300 | 10.93 | 3.47 | 28.57 |
| TE | Dalton Schultz | HOU | TE | $3400 | 12.86 | 3.97 | 31.73 |
| FLEX | Chase Brown | CIN | RB | $6400 | 19.14 | 4.99 | 45.96 |
| DST | Vikings | MIN | DST | $2800 | 7.57 | 0.1 | 14.2 |

Top 20-Max GPP Exposures: Ashton Jeanty (LV RB): 11/20, Chase Brown (CIN RB): 11/20, Christian McCaffrey (SF RB): 11/20, Dalton Schultz (HOU TE): 11/20, James Cook III (BUF RB): 11/20, Tetairoa McMillan (CAR WR): 11/20, Xavier Hutchinson (HOU WR): 11/20, C.J. Stroud (HOU QB): 10/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Trevor Lawrence | JAX | TEN | $6600 | 23.44 | 37.52 | 35.0% |
| QB | C.J. Stroud | HOU | CLE | $5900 | 22.49 | 33.38 | 50.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 21.14 | 55.76 | 55.0% |
| RB | James Cook III | BUF | NYJ | $7400 | 22.39 | 48.87 | 55.0% |
| RB | Chase Brown | CIN | PIT | $6400 | 19.14 | 45.96 | 55.0% |
| RB | Ashton Jeanty | LV | SEA | $5400 | 16.59 | 48.82 | 55.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 17.03 | 42.55 | 10.0% |
| WR | Matthew Golden | GB | MIN | $7300 | 15.06 | 41.3 | 15.0% |
| WR | Tetairoa McMillan | CAR | NO | $6700 | 13.84 | 41.22 | 55.0% |
| WR | Parker Washington | JAX | TEN | $6200 | 13.75 | 38.89 | 50.0% |
| TE | Dalton Schultz | HOU | CLE | $3400 | 12.86 | 31.73 | 55.0% |
| TE | Brenton Strange | JAX | TEN | $4100 | 10.82 | 28.32 | 40.0% |
| DST | Vikings | MIN | GB | $2800 | 7.57 | 14.2 | 35.0% |
| DST | Raiders | LV | SEA | $2400 | 6.98 | 15.36 | 30.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `29a646a6aa3430af22bb11a3ba174079ebc44d9b7000476c58f916e5c4fd4934`
- Cash Total Salary: $49100 | Median Proj: 98.93 | P90 Ceiling: 189.69

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Joe Burrow | CIN | QB | $15900 | 33.57 | 22.84 | 51.09 |
| FLEX | Aaron Rodgers | PIT | QB | $9000 | 16.75 | 12.61 | 30.56 |
| FLEX | Chase Brown | CIN | RB | $8400 | 19.14 | 4.99 | 45.96 |
| FLEX | Rico Dowdle | PIT | RB | $5600 | 11.6 | 2.71 | 29.18 |
| FLEX | Evan McPherson | CIN | K | $5200 | 9.9 | 5.76 | 17.59 |
| FLEX | Chris Boswell | PIT | K | $5000 | 7.97 | 4.03 | 15.31 |

Top 20-Max GPP Exposures: Chase Brown (CIN RB): 19/20, Jaylen Warren (PIT RB): 13/20, DK Metcalf (PIT WR): 11/20, Rico Dowdle (PIT RB): 11/20, Tee Higgins (CIN WR): 11/20, Dohnte Meyers (CIN WR): 8/20, Ja'Marr Chase (CIN WR): 8/20, Aaron Rodgers (PIT QB): 7/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `fa97a40652c742e092b2de2d3a183693f29018405b2f7fe3841a1caf817a31ac`
- Cash Total Salary: $49800 | Median Proj: 86.48 | P90 Ceiling: 184.3

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Jacoby Brissett | BAL | QB | $13800 | 31.69 | 21.37 | 48.16 |
| FLEX | Zay Flowers | BAL | WR | $10400 | 12.94 | 3.56 | 39.21 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 15.05 | 3.63 | 39.65 |
| FLEX | Justin Herbert | LAC | QB | $9000 | 13.63 | 10.25 | 24.24 |
| FLEX | Riley Patterson | BAL | K | $4600 | 8.7 | 4.6 | 16.24 |
| FLEX | KeAndre Lambert-Smith | LAC | WR | $2000 | 4.47 | 0.56 | 16.8 |

Top 20-Max GPP Exposures: Derrick Henry (BAL RB): 18/20, Zay Flowers (BAL WR): 18/20, Jacoby Brissett (BAL QB): 13/20, Omarion Hampton (LAC RB): 10/20, Ja'Kobi Lane (BAL WR): 7/20, Justin Herbert (LAC QB): 7/20, Mark Andrews (BAL TE): 7/20, Tre' Harris (LAC WR): 7/20
