# DraftKings Week 2 — CLEANED Salaries + Projections + Projected Ownership

**Source:** OneWeekSeason.com, via Minis phone browser extract (pasted by Garrett 2026-09-19 ~11:00 AM CT)
**Data timestamps (as claimed):** projections Sat 2026-09-19 8:04 AM PDT; ownership 6:00 AM PDT
**Slate scope:** 13-game DK MAIN slate (Sunday games only). Does NOT include IND@KC (SNF) or NYG@LAR (MNF). NOT Garrett's 15-game contest.
**Coverage warning:** this is a PARTIAL "top plays" style list (~40 skaters + 16 DSTs), not the full DK player pool. Absent entirely: Drake Maye, JSN, Bowers, all SNF/MNF players, DEN/SEA/GB/CHI/BAL DSTs, and most sub-$4K punts.
**Salary status:** every salary below is SECOND-PARTY (OneWeekSeason + Huddle 9/19 + DK Network 9/15/9/17 triple-match where noted). DK's own endpoint was Akamai-blocked 9/19 — nothing here is endpoint-verified.

## CLEANING LOG (per-row decisions)

| # | Row as extracted | Decision | Reason |
|---|---|---|---|
| 1 | Derek Carr, NO vs LV, QB, $5,800 | DROPPED | Zero corroboration in any corpus CSV; opponent mapping nonsensical (NO plays BAL Week 2); Tyler Shough is NO's starter per qb-salaries.csv, SNF/MNF addendum, and Huddle. Likely stale/model artifact. |
| 2 | Travis Kelce, KC vs DEN, TE, $7,400 | DROPPED | Off-slate contamination: KC plays IND (SNF), DEN plays JAX — "vs DEN" is wrong for Kelce. te-salaries.csv and wr-salaries CSVs both flag KC/IND as off-main-slate. Relevant only to Garrett's 15-game contest, where this salary is unverified. |
| 3 | Sean McAllister, SEA vs ARI, RB, $5,700 | DROPPED | Unknown player; zero corroboration in rb-salaries-projections.csv (SEA RBs listed: Jadarian Price $5,500, George Holani $4,500) or anywhere else in corpus. |
| 4 | Jalen Nailor, LV vs LAC, WR, $3,900 | DROPPED | Wrong team: Nailor is a MIN player (no LV corroboration anywhere). Salary unverifiable. |
| 5 | Romelius Doubs, NE vs PIT, WR, $5,000 | FIXED → Romeo Doubs | Name corruption. Matches wr-salaries-projections.csv exactly (DK Network 9/15: Romeo Doubs, NE, PIT@NE, $5,000). |
| 6 | Mark Andrews duplicate row | DEDUPED | Identical row appeared twice; kept one. |
| 7 | Jerry Jeudy, DEN vs JAX, WR, $5,100 | EXCLUDED — UNRESOLVED | Direct conflict: OneWeekSeason says DEN/$5,100; Huddle X-sweep (9/19) says Jerry Jeudy $3,900 @ TB (i.e., on CLE). Team AND salary conflict. Do not use either number until lobby-checked. |
| 8 | Mike Evans, SF vs MIA, WR, $6,600 | KEPT (corroborated) | Looked implausible (Evans = career Buc) but wr-salaries-projections.csv independently lists Mike Evans, SF, MIA@SF, $6,600 (DK Network 9/15). In the 2026 universe he is on SF. |
| 9 | Brock Purdy, SF vs MIA, QB, $6,200 / 23.06 / 9.87% | SALARY KEPT; PROJ+OWN FLAGGED STALE | Salary $6,200 triple-confirmed (Huddle + DK Network + OWS). But Purdy is OUT (toe/shoulder, 2-5 weeks per Rapoport via Huddle 9/19); Mac Jones expected to start. A 23.06 projection and 9.87% ownership on an OUT player = stale model output. Do not use proj/ownership. |
| 10 | Javonte Williams row ("Annotation \| Availability" leak) | KEPT — numbers intact | Chain-of-thought leak appeared in a later Minis rewrite, not in the table cells: $6,400 / 17.73 / 22.16% all present and consistent. |
| 11 | Kirk Cousins "Electro5,200" garble | REPAIRED → $5,000 | CSV version of same extract shows 5000; matches qb-salaries.csv ($5,000). |
| 12 | Justin Herbert "prove[18.4]" garble | REPAIRED → 18.43 | Table row shows 18.43; matches $6,000 salary in qb-salaries.csv. |
| 13 | Garrett Wilson "硅13.60%" garble | REPAIRED → 13.60% | CSV version shows 13.60%. |
| 14 | Derrick Henry "概述 18.07" garble | REPAIRED → 18.07 | CSV version shows 18.07. |
| 15 | WAS DST "avance1.23%" garble | REPAIRED → 1.23% | DST table row shows 1.23%. |
| 16 | CIN DST $2,700 | KEPT WITH AMBIGUITY FLAG | fantasyalarm 9/18 listed **CAR** (not CIN) at $2,700. Both could be $2,700, or one source misattributed the team. Lobby-check before rostering either. |

## CLEANED MASTER TABLE (salary + OWS projection + OWS projected ownership)

| Player | Team | Opp | Pos | Salary | Salary x-check | OWS Proj | OWS pOwn |
|---|---|---|---|---|---|---|---|
| Bijan Robinson | ATL | CAR | RB | $8,200 | ✓ Huddle+DKNet | 23.39 | 40.10% |
| Christian McCaffrey | SF | MIA | RB | $8,000 | ✓ Huddle+DKNet | 23.71 | 21.93% |
| Justin Jefferson | MIN | CHI | WR | $7,800 | ✓ Huddle+DKNet | 17.50 | 15.35% |
| Ja'Marr Chase | CIN | HOU | WR | $7,600 | ✓ Huddle+DKNet | 18.40 | 17.17% |
| CeeDee Lamb | DAL | WAS | WR | $7,300 | ✓ Huddle+DKNet | 21.67 | 20.32% |
| Lamar Jackson | BAL | NO | QB | $7,300 | ✓ Huddle | 17.44 | 5.81% |
| Derrick Henry | BAL | NO | RB | $7,200 | ✓ Huddle+DKNet | 18.07 | 22.19% |
| Saquon Barkley | PHI | TEN | RB | $7,000 | ✓ Huddle+DKNet | 12.54 | 9.58% |
| Ashton Jeanty | LV | LAC | RB | $6,800 | ✓ Huddle+DKNet | 12.67 | 16.49% |
| Caleb Williams | CHI | MIN | QB | $6,800 | ✓ Huddle+DKNet | 20.23 | 4.30% |
| Jalen Hurts | PHI | TEN | QB | $6,700 | ✓ Huddle | 18.71 | 2.90% |
| Joe Burrow | CIN | HOU | QB | $6,600 | ✓ Huddle | 18.05 | 2.22% |
| Mike Evans | SF | MIA | WR | $6,600 | ✓ DKNet | 17.02 | 5.18% |
| Dak Prescott | DAL | WAS | QB | $6,400 | ✓ Huddle | 25.04 | 12.01% |
| Javonte Williams | DAL | WAS | RB | $6,400 | ✓ Huddle+DKNet | 17.73 | 22.16% |
| George Pickens | DAL | WAS | WR | $6,300 | ✓ Huddle+DKNet | 18.54 | 17.85% |
| Jayden Daniels | WAS | DAL | QB | $6,300 | ✓ Huddle | 20.85 | 6.64% |
| Brock Purdy | SF | MIA | QB | $6,200 | ✓ Huddle+DKNet | 23.06 ⚠️ | 9.87% ⚠️ |
| Breece Hall | NYJ | GB | RB | $6,200 | ✓ Huddle+DKNet | 15.22 | 11.10% |
| Garrett Wilson | NYJ | GB | WR | $6,000 | ✓ Huddle+DKNet | 12.41 | 13.60% |
| Justin Herbert | LAC | LV | QB | $6,000 | ✓ Huddle | 18.43 | 5.02% |
| Trevor Lawrence | JAX | DEN | QB | $5,800 | ✓ Huddle | 15.29 | 4.99% |
| Bo Nix | DEN | JAX | QB | $5,700 | ✓ Huddle | 17.82 | 6.08% |
| Baker Mayfield | TB | CLE | QB | $5,600 | ✓ Huddle | 17.53 | 3.97% |
| C.J. Stroud | HOU | CIN | QB | $5,500 | ✓ Huddle | 21.23 | 3.74% |
| Bryce Young | CAR | ATL | QB | $5,400 | ✓ Huddle | 17.42 | 3.50% |
| Tyler Shough | NO | BAL | QB | $5,300 | ✓ Huddle | 18.09 | 4.00% |
| Terry McLaurin | WAS | DAL | WR | $5,200 | ✓ Huddle+DKNet | 14.41 | 10.67% |
| Jerry Jeudy | DEN?/CLE? | JAX?/TB? | WR | UNRESOLVED | ✗ CONFLICT ($5,100 vs $3,900) | 10.72 | 5.12% |
| Romeo Doubs | NE | PIT | WR | $5,000 | ✓ DKNet | 11.91 | 2.55% |
| Kirk Cousins | LV | LAC | QB | $5,000 | ✓ Huddle | 12.39 | 0.34% |
| Drew Lock | SEA | ARI | QB | $4,900 | ✓ Huddle | 19.14 | 1.56% |
| Geno Smith | NYJ | GB | QB | $4,800 | ✓ Huddle | 12.54 | 0.96% |
| Carson Wentz | MIN | CHI | QB | $4,600 | ✓ Huddle | 17.02 | 5.18% |
| Deshaun Watson | CLE | TB | QB | $4,500 | ✓ Huddle | 14.51 | 0.54% |
| Mark Andrews | BAL | NO | TE | $4,400 | ✓ Huddle | 10.50 | 17.13% |
| Jake Ferguson | DAL | WAS | TE | $3,800 | ✓ Huddle | 10.21 | 3.06% |
| Michael Mayer | LV | LAC | TE | $3,600 | ✓ Huddle | 6.47 | 14.07% |
| Xavier Hutchinson | HOU | CIN | WR | $3,500 | ✓ Huddle+DKNet | 9.69 | 2.99% |

⚠️ = stale (Purdy OUT; proj/ownership not usable)

## CLEANED DST TABLE

| Team | Opp | Salary | Salary x-check | OWS Proj | OWS pOwn |
|---|---|---|---|---|---|
| San Francisco 49ers | MIA | $3,800 | ✓ fantasyalarm 9/18 | 4.99 | 5.62% |
| Philadelphia Eagles | TEN | $3,700 | ✓ fantasyalert 9/18 | 6.96 | 5.05% |
| Tampa Bay Buccaneers | CLE | $3,600 | ✓ fantasyalarm 9/18 | 6.73 | 9.65% |
| Baltimore Ravens | NO | $3,300 | fantasyalarm 9/18 only (absent from OWS) | — | — |
| Los Angeles Chargers | LV | $3,200 | NEW — replaces stale 2025 $3,400 (do-not-use) | 8.47 | 4.27% |
| New England Patriots | PIT | $3,100 | NEW second-party | 4.64 | 4.22% |
| Houston Texans | CIN | $3,000 | NEW second-party | 5.64 | 2.60% |
| Dallas Cowboys | WAS | $2,900 | NEW second-party | 4.01 | 2.28% |
| Atlanta Falcons | CAR | $2,900 | NEW second-party | 5.32 | 2.05% |
| Pittsburgh Steelers | NE | $2,800 | NEW second-party | 6.00 | 2.90% |
| Cincinnati Bengals | HOU | $2,700 | NEW second-party — ⚠️ team ambiguity vs fantasyalarm's CAR $2,700 | 3.62 | 2.32% |
| Minnesota Vikings | CHI | $2,600 | ✓ fantasyalarm 9/18 | 3.65 | 1.53% |
| Arizona Cardinals | SEA | $2,500 | NEW second-party | 3.20 | 3.78% |
| Washington Commanders | DAL | $2,500 | NEW second-party | 2.78 | 1.23% |
| Jacksonville Jaguars | DEN | $2,400 | ✓ fantasyalarm 9/18 | 4.72 | 2.68% |
| New York Jets | GB | $2,400 | NEW second-party | 3.38 | 2.43% |
| Cleveland Browns | TB | $2,200 | NEW second-party | 5.64 | 4.01% |

Still UNVERIFIED (absent from OWS; not in fantasyalarm): DEN, SEA, GB, CHI, LV, NO, TEN, MIA, CAR DSTs.

## PROJECTED OWNERSHIP — STANDALONE TABLE

**OneWeekSeason projected ownership, DK 13-game MAIN slate, Sat 2026-09-19 ~6:00 AM PDT. NOT actuals. NOT Garrett's 15-game contest. Partial player list only.**

| Pos | Player | pOwn | Pos | Player | pOwn |
|---|---|---|---|---|---|
| RB | Bijan Robinson | 40.10% | QB | Dak Prescott | 12.01% |
| RB | Javonte Williams | 22.16% | WR | Garrett Wilson | 13.60% |
| RB | Derrick Henry | 22.19% | QB | Brock Purdy | 9.87% ⚠️ |
| RB | Christian McCaffrey | 21.93% | DST | Tampa Bay | 9.65% |
| WR | CeeDee Lamb | 20.32% | QB | Jayden Daniels | 6.64% |
| WR | George Pickens | 17.85% | QB | Bo Nix | 6.08% |
| WR | Ja'Marr Chase | 17.17% | QB | Lamar Jackson | 5.81% |
| TE | Mark Andrews | 17.13% | DST | San Francisco | 5.62% |
| RB | Ashton Jeanty | 16.49% | WR | Mike Evans | 5.18% |
| WR | Justin Jefferson | 15.35% | QB | Carson Wentz | 5.18% |
| TE | Michael Mayer | 14.07% | DST | Philadelphia | 5.05% |
| WR | Garrett Wilson | 13.60% | QB | Justin Herbert | 5.02% |
| RB | Breece Hall | 11.10% | QB | Trevor Lawrence | 4.99% |
| WR | Terry McLaurin | 10.67% | QB | Caleb Williams | 4.30% |
| DST | Tampa Bay | 9.65% | DST | LA Chargers | 4.27% |
| RB | Saquon Barkley | 9.58% | DST | New England | 4.22% |
| DST | Philadelphia | 5.05% | DST | Cleveland | 4.01% |
| QB | Justin Herbert | 5.02% | QB | Baker Mayfield | 3.97% |
| QB | Trevor Lawrence | 4.99% | DST | Arizona | 3.78% |
| QB | Caleb Williams | 4.30% | QB | C.J. Stroud | 3.74% |
| DST | LA Chargers | 4.27% | QB | Bryce Young | 3.50% |
| DST | New England | 4.22% | DST | Pittsburgh | 2.90% |
| DST | Cleveland | 4.01% | QB | Jalen Hurts | 2.90% |
| QB | Baker Mayfield | 3.97% | DST | Jacksonville | 2.68% |
| DST | Arizona | 3.78% | DST | Houston | 2.60% |
| QB | C.J. Stroud | 3.74% | WR | Romeo Doubs | 2.55% |
| QB | Bryce Young | 3.50% | DST | NY Jets | 2.43% |
| TE | Jake Ferguson | 3.06% | DST | Cincinnati | 2.32% |
| WR | Xavier Hutchinson | 2.99% | DST | Dallas | 2.28% |
| QB | Jalen Hurts | 2.90% | QB | Joe Burrow | 2.22% |
| DST | Pittsburgh | 2.90% | DST | Atlanta | 2.05% |
| DST | Jacksonville | 2.68% | QB | Drew Lock | 1.56% |
| DST | Houston | 2.60% | DST | Minnesota | 1.53% |
| DST | Dallas | 2.28% | DST | Washington | 1.23% |
| QB | Joe Burrow | 2.22% | WR | Jalen Nailor | DROPPED |
| QB | Drew Lock | 1.56% | QB | Geno Smith | 0.96% |
| DST | Minnesota | 1.53% | QB | Deshaun Watson | 0.54% |
| DST | Washington | 1.23% | QB | Kirk Cousins | 0.34% |
| QB | Tyler Shough | 4.00% | | | |

## PROJECTION CROSS-CHECK (OWS vs our consensus — biggest disagreements)

| Player | OWS proj | Our consensus | Delta | Note |
|---|---|---|---|---|
| Ashton Jeanty | 12.67 | 22.5 (DKNet 9/17) | **−9.83** | Largest gap on slate; OWS much colder |
| Derrick Henry | 18.07 | 24.0 (DKNet 9/17) | **−5.93** | OWS cold despite 38.3 Wk1 |
| CeeDee Lamb | 21.67 | 15.8 (DKNet 9/15) | **+5.87** | OWS much hotter on DAL@WAS |
| Dak Prescott | 25.04 | 20.9 (FP, qb-salaries) | **+4.14** | OWS hottest QB on slate by 2+ pts |
| George Pickens | 18.54 | 14.5 (DKNet 9/15) | **+4.04** | OWS hot on DAL pieces |
| Christian McCaffrey | 23.71 | 20.2 (DKNet 9/17) | **+3.51** | OWS hotter |
| Lamar Jackson | 17.44 | 20.2 (FP) / 21.2 (DKN) | **−2.8 to −3.8** | OWS cold on Lamar |
| Javonte Williams | 17.73 | 20.6 (DKNet 9/17) | −2.87 | OWS cooler |
| Drew Lock | 19.14 | (no consensus) | — | Eyebrow-raiser: backup-relief QB projected 3rd among listed QBs; treat skeptically |
| Bijan Robinson | 23.39 | 25.2 (DKNet) | −1.81 | Close |
| Breece Hall | 15.22 | 16.3 (DKNet) | −1.08 | Close |
| Mark Andrews | 10.50 | 9.9 (FP) | +0.60 | Close |
| Michael Mayer | 6.47 | 6.5 (FP) | −0.03 | Match |
| Brock Purdy | 23.06 | — | — | STALE — player is OUT |

Pattern: OWS is systematically hotter on the WAS@DAL game (Dak/Lamb/Pickens) and systematically colder on Lamar, Henry, and especially Jeanty vs DK Network.
