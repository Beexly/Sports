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
| sun_main_classic | 156416 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 198 | 132 | $49900 | 140.3 | 20 | `data/dfs/week10_sun_main_classic_dk_cash_1up.csv` | `data/dfs/week10_sun_main_classic_dk_20max_gpp.csv` | `data/dfs/week10_sun_main_classic_dk_upload.csv` |
| sun_mon_expanded | 156418 | DK_CLASSIC | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 238 | 158 | $50000 | 142.8 | 20 | `data/dfs/week10_sun_mon_expanded_dk_cash_1up.csv` | `data/dfs/week10_sun_mon_expanded_dk_20max_gpp.csv` | `data/dfs/week10_sun_mon_expanded_dk_upload.csv` |
| snf_pit_cin | 156433 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 19 | 12 | $49100 | 99.57 | 20 | `data/dfs/week10_snf_pit_cin_dk_cash_1up.csv` | `data/dfs/week10_snf_pit_cin_dk_20max_gpp.csv` | `data/dfs/week10_snf_pit_cin_dk_upload.csv` |
| mnf_lac_bal | 156434 | DK_SHOWDOWN | HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER | 25 | 14 | $49800 | 91.89 | 20 | `data/dfs/week10_mnf_lac_bal_dk_cash_1up.csv` | `data/dfs/week10_mnf_lac_bal_dk_20max_gpp.csv` | `data/dfs/week10_mnf_lac_bal_dk_upload.csv` |

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
- Master Bundle SHA-256: `3e9961820524c0597e7deb880d1063f2ae21c9bc81dd331c4dcdd91e21b505dc`
- Cash Total Salary: $49900 | Median Proj: 140.3 | P90 Ceiling: 337.94

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | C.J. Stroud | HOU | QB | $5900 | 22.46 | 16.35 | 33.01 |
| RB | James Cook III | BUF | RB | $7400 | 22.8 | 8.91 | 49.27 |
| RB | Christian McCaffrey | SF | RB | $8500 | 21.32 | 5.8 | 55.84 |
| WR | Matthew Golden | GB | WR | $7300 | 15.62 | 4.59 | 41.83 |
| WR | Khalil Shakir | BUF | WR | $5300 | 11.72 | 2.84 | 35.11 |
| WR | Xavier Worthy | KC | WR | $4300 | 11.05 | 3.52 | 28.76 |
| TE | Dalton Schultz | HOU | TE | $3400 | 11.87 | 3.6 | 29.88 |
| FLEX | Ashton Jeanty | LV | RB | $5400 | 16.45 | 3.69 | 48.88 |
| DST | Raiders | LV | DST | $2400 | 7.01 | 0.1 | 15.36 |

Top 20-Max GPP Exposures: Ashton Jeanty (LV RB): 11/20, C.J. Stroud (HOU QB): 11/20, Christian McCaffrey (SF RB): 11/20, Dalton Schultz (HOU TE): 11/20, James Cook III (BUF RB): 11/20, Quinshon Judkins (CLE RB): 11/20, Raiders (LV DST): 11/20, Xavier Hutchinson (HOU WR): 11/20

## Sunday-Monday 12-Game Expanded Classic & 14-Core (DG 156418)

- auto_email_sent: False
- Master Bundle SHA-256: `48428e48392d352219519d4ca5e724a5c838fb378d4564ad6dcb7c7e71d558b1`
- Cash Total Salary: $50000 | Median Proj: 142.8 | P90 Ceiling: 330.35

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| QB | C.J. Stroud | HOU | QB | $5900 | 22.46 | 16.35 | 33.01 |
| RB | James Cook III | BUF | RB | $7400 | 22.8 | 8.91 | 49.27 |
| RB | Christian McCaffrey | SF | RB | $8500 | 21.32 | 5.8 | 55.84 |
| WR | Matthew Golden | GB | WR | $7300 | 15.62 | 4.59 | 41.83 |
| WR | Xavier Worthy | KC | WR | $4300 | 11.05 | 3.52 | 28.76 |
| WR | Xavier Hutchinson | HOU | WR | $4000 | 10.66 | 2.82 | 31.6 |
| TE | Dalton Schultz | HOU | TE | $3400 | 11.87 | 3.6 | 29.88 |
| FLEX | Chase Brown | CIN | RB | $6400 | 19.38 | 5.1 | 45.96 |
| DST | Vikings | MIN | DST | $2800 | 7.64 | 0.1 | 14.2 |

Top 20-Max GPP Exposures: Ashton Jeanty (LV RB): 11/20, Chase Brown (CIN RB): 11/20, Christian McCaffrey (SF RB): 11/20, Dalton Schultz (HOU TE): 11/20, James Cook III (BUF RB): 11/20, Raiders (LV DST): 11/20, Xavier Hutchinson (HOU WR): 11/20, C.J. Stroud (HOU QB): 10/20

### Sun-Mon Expanded 14-Player Core (2 QB / 4 RB / 4 WR / 2 TE / 2 DST)

| Pos | Player | Team | Matchup Opp | Salary | Median Proj | P90 Ceiling | GPP Exp % |
|---|---|---|---|---|---|---|---|
| QB | Trevor Lawrence | JAX | TEN | $6600 | 23.54 | 37.6 | 25.0% |
| QB | C.J. Stroud | HOU | CLE | $5900 | 22.46 | 33.01 | 50.0% |
| RB | Christian McCaffrey | SF | DAL | $8500 | 21.32 | 55.84 | 55.0% |
| RB | James Cook III | BUF | NYJ | $7400 | 22.8 | 49.27 | 55.0% |
| RB | Chase Brown | CIN | PIT | $6400 | 19.38 | 45.96 | 55.0% |
| RB | Ashton Jeanty | LV | SEA | $5400 | 16.45 | 48.88 | 55.0% |
| WR | CeeDee Lamb | DAL | SF | $8800 | 16.83 | 42.77 | 10.0% |
| WR | Matthew Golden | GB | MIN | $7300 | 15.62 | 41.83 | 25.0% |
| WR | Tetairoa McMillan | CAR | NO | $6700 | 13.79 | 41.57 | 45.0% |
| WR | Parker Washington | JAX | TEN | $6200 | 13.79 | 38.98 | 50.0% |
| TE | Dalton Schultz | HOU | CLE | $3400 | 11.87 | 29.88 | 55.0% |
| TE | Brenton Strange | JAX | TEN | $4100 | 10.81 | 28.46 | 35.0% |
| DST | Raiders | LV | SEA | $2400 | 7.01 | 15.36 | 55.0% |
| DST | Vikings | MIN | GB | $2800 | 7.64 | 14.2 | 35.0% |

## PIT @ CIN SNF Showdown (DG 156433)

- auto_email_sent: False
- Master Bundle SHA-256: `a29d651adb48c73b79c1955926effebb392808d5f10e85248f6541244d0836f3`
- Cash Total Salary: $49100 | Median Proj: 99.57 | P90 Ceiling: 189.86

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Joe Burrow | CIN | QB | $15900 | 34.25 | 23.21 | 51.9 |
| FLEX | Aaron Rodgers | PIT | QB | $9000 | 16.37 | 11.17 | 30.12 |
| FLEX | Chase Brown | CIN | RB | $8400 | 19.38 | 5.1 | 45.96 |
| FLEX | Rico Dowdle | PIT | RB | $5600 | 11.46 | 2.72 | 28.94 |
| FLEX | Evan McPherson | CIN | K | $5200 | 10.43 | 6.37 | 17.95 |
| FLEX | Chris Boswell | PIT | K | $5000 | 7.68 | 3.64 | 14.99 |

Top 20-Max GPP Exposures: Chase Brown (CIN RB): 20/20, Jaylen Warren (PIT RB): 12/20, DK Metcalf (PIT WR): 11/20, Rico Dowdle (PIT RB): 11/20, Tee Higgins (CIN WR): 11/20, Ja'Marr Chase (CIN WR): 9/20, Dohnte Meyers (CIN WR): 8/20, Joe Burrow (CIN QB): 8/20

## LAC @ BAL MNF Showdown (DG 156434)

- auto_email_sent: False
- Master Bundle SHA-256: `5d7f0443129d591bf38f94487b124debbf73305018e3bbd5c0e72a10a6f75416`
- Cash Total Salary: $49800 | Median Proj: 91.89 | P90 Ceiling: 190.35

| Slot | Player | Team | Pos | Salary | Median Proj | P25 Floor | P90 Ceiling |
|---|---|---|---|---|---|---|---|
| CPT (1.5x) | Jacoby Brissett | BAL | QB | $13800 | 33.21 | 22.48 | 49.42 |
| FLEX | Zay Flowers | BAL | WR | $10400 | 14.12 | 3.98 | 40.68 |
| FLEX | Derrick Henry | BAL | RB | $10000 | 16.08 | 4.71 | 40.69 |
| FLEX | Justin Herbert | LAC | QB | $9000 | 14.24 | 10.73 | 25.17 |
| FLEX | Riley Patterson | BAL | K | $4600 | 9.58 | 5.59 | 17.03 |
| FLEX | KeAndre Lambert-Smith | LAC | WR | $2000 | 4.66 | 0.62 | 17.36 |

Top 20-Max GPP Exposures: Derrick Henry (BAL RB): 19/20, Zay Flowers (BAL WR): 18/20, Jacoby Brissett (BAL QB): 13/20, Omarion Hampton (LAC RB): 9/20, Ja'Kobi Lane (BAL WR): 7/20, Justin Herbert (LAC QB): 7/20, Tre' Harris (LAC WR): 7/20, Justice Hill (BAL RB): 6/20
