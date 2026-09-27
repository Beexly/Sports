# Week 3 DK Sun–Mon Optimizer Run — 2026-09-25

> LOCAL ONLY — never committed, published, or entered. All ownership = PROXY (no public Sun–Mon ownership exists). Full methodology: PROVENANCE.md.

- Slate: **671** eligible players (767 DK rows − 96 injury/status exclusions)
- Engine: Garrett's real `dfs-optimizer.ts` — `optimizeOne` (exact) + `generateLineups` (gpp ×20, leverage ×20, 60% max exposure, stacking ON)
- Construction rules v2 (harness-applied, GPP/leverage only — `construction-rules.ts`): double-stack (QB + ≥2 same-team WR/TE/RB) enforced via objective-ordered repair; TE excluded from FLEX via repair. Thin QB teams fall back to single stack; degenerate TE-FLEX keeps are flagged.
- Before → after (engine output, 41 lineups): double-stack **4 → 41**; TE-in-FLEX **38 → 0**; repaired 41; thin-team fallbacks 0; degenerate TE-FLEX keeps 0.
- Final portfolio after repair+dedup: **18** gpp + **17** leverage + 1 single-best.
- Validation: every final lineup passed `validateLineup` (9-man, positional slots, ≤$50,000, no dupes/excludes, stack satisfied)

## single-best (gpp)

- Salary: **$50,000** (left $0) · Proj **205.3** · Ceiling **356** · Proxy own **125** pts · Leverage 2.66
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Stefon Diggs | WAS vs SEA | $5,500 | 17.67 | 30.04 | 13.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-1 (gpp)

- Salary: **$50,000** (left $0) · Proj **205.3** · Ceiling **356** · Proxy own **125** pts · Leverage 2.66
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Stefon Diggs | WAS vs SEA | $5,500 | 17.67 | 30.04 | 13.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-2 (gpp)

- Salary: **$49,700** (left $300) · Proj **182.4** · Ceiling **317** · Proxy own **131** pts · Leverage 2.26
- Stack: BUF — Keon Coleman (WR) + Joshua Palmer (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Josh Allen | BUF vs LAC | $8,000 | 29.54 | 50.22 | 27.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Keon Coleman | BUF vs LAC | $4,300 | 6.37 | 10.83 | 9.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Joshua Palmer | BUF vs LAC | $3,500 | 10.36 | 17.61 | 6.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## gpp-3 (gpp)

- Salary: **$49,600** (left $400) · Proj **205.9** · Ceiling **356** · Proxy own **136** pts · Leverage 2.34
- Stack: CAR — Jalen Coker (WR) + Brycen Tremayne (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Brycen Tremayne | CAR vs CLE | $3,000 | 0 | 0 | 5.0% |
| DST | LV DST | LV vs NO | $2,600 | 12.5 | 27.5 | 8.0% |

## gpp-4 (gpp)

- Salary: **$49,800** (left $200) · Proj **206.9** · Ceiling **358** · Proxy own **143** pts · Leverage 2.29
- Stack: NO — Chris Olave (WR) + Bryce Lance (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Tyler Shough | NO vs LV | $5,400 | 25.8 | 43.86 | 18.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Bryce Lance | NO vs LV | $3,000 | 4.5 | 7.65 | 5.0% |
| DST | CAR DST | CAR vs CLE | $3,000 | 13 | 28.6 | 11.0% |

## gpp-5 (gpp)

- Salary: **$49,500** (left $500) · Proj **207.4** · Ceiling **359** · Proxy own **136** pts · Leverage 2.37
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Travis Kelce | KC vs MIA | $4,500 | 19.1 | 32.47 | 15.0% |
| FLEX | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| DST | PIT DST | PIT vs CIN | $2,700 | 13 | 28.6 | 9.0% |

## gpp-6 (gpp)

- Salary: **$49,400** (left $600) · Proj **203.7** · Ceiling **354** · Proxy own **136** pts · Leverage 2.35
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Travis Kelce | KC vs MIA | $4,500 | 19.1 | 32.47 | 15.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-7 (gpp)

- Salary: **$48,800** (left $1,200) · Proj **203.8** · Ceiling **353** · Proxy own **121** pts · Leverage 2.72
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## gpp-8 (gpp)

- Salary: **$49,900** (left $100) · Proj **205.6** · Ceiling **357** · Proxy own **138** pts · Leverage 2.58
- Stack: KC — Kenneth Walker III (RB) + Travis Kelce (TE) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC vs MIA | $6,200 | 27.3 | 46.41 | 21.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| TE | Travis Kelce | KC vs MIA | $4,500 | 19.1 | 32.47 | 15.0% |
| FLEX | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-9 (gpp)

- Salary: **$49,800** (left $200) · Proj **209.4** · Ceiling **363** · Proxy own **142** pts · Leverage 2.38
- Stack: KC — Kenneth Walker III (RB) + Travis Kelce (TE) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC vs MIA | $6,200 | 27.3 | 46.41 | 21.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Travis Kelce | KC vs MIA | $4,500 | 19.1 | 32.47 | 15.0% |
| FLEX | Cody White | LV vs NO | $3,200 | 8.2 | 13.94 | 5.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## gpp-10 (gpp)

- Salary: **$49,900** (left $100) · Proj **207.5** · Ceiling **360** · Proxy own **137** pts · Leverage 2.51
- Stack: CAR — Jalen Coker (WR) + Darren Waller (TE) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Darren Waller | CAR vs CLE | $3,400 | 11.6 | 19.72 | 6.0% |
| FLEX | Joshua Palmer | BUF vs LAC | $3,500 | 10.36 | 17.61 | 6.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-11 (gpp)

- Salary: **$49,100** (left $900) · Proj **203.3** · Ceiling **352** · Proxy own **123** pts · Leverage 2.66
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | CAR DST | CAR vs CLE | $3,000 | 13 | 28.6 | 11.0% |

## gpp-12 (gpp)

- Salary: **$50,000** (left $0) · Proj **196.9** · Ceiling **342** · Proxy own **121** pts · Leverage 2.88
- Stack: NO — Chris Olave (WR) + Juwan Johnson (TE) (mates=2, double=YES) · Bring-back: Cody White (WR, LV)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Tyler Shough | NO vs LV | $5,400 | 25.8 | 43.86 | 18.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| TE | Juwan Johnson | NO vs LV | $3,700 | 12.5 | 21.25 | 7.0% |
| FLEX | Cody White | LV vs NO | $3,200 | 8.2 | 13.94 | 5.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-13 (gpp)

- Salary: **$49,100** (left $900) · Proj **176.3** · Ceiling **306** · Proxy own **128** pts · Leverage 2.31
- Stack: KC — Tyquan Thornton (WR) + Xavier Worthy (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Patrick Mahomes | KC vs MIA | $6,200 | 27.3 | 46.41 | 21.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| WR | Tyquan Thornton | KC vs MIA | $3,300 | 6.3 | 10.71 | 6.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Xavier Worthy | KC vs MIA | $4,400 | 9.2 | 15.64 | 10.0% |
| DST | PIT DST | PIT vs CIN | $2,700 | 13 | 28.6 | 9.0% |

## gpp-14 (gpp)

- Salary: **$50,000** (left $0) · Proj **175** · Ceiling **304** · Proxy own **125** pts · Leverage 2.24
- Stack: CAR — Xavier Legette (WR) + AJ Dillon (RB) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | AJ Dillon | CAR vs CLE | $4,000 | 1.3 | 2.21 | 8.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## gpp-15 (gpp)

- Salary: **$49,100** (left $900) · Proj **170.3** · Ceiling **297** · Proxy own **101** pts · Leverage 2.86
- Stack: CAR — Xavier Legette (WR) + AJ Dillon (RB) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | AJ Dillon | CAR vs CLE | $4,000 | 1.3 | 2.21 | 8.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-16 (gpp)

- Salary: **$49,900** (left $100) · Proj **178.9** · Ceiling **311** · Proxy own **137** pts · Leverage 2.16
- Stack: BUF — Keon Coleman (WR) + Joshua Palmer (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Josh Allen | BUF vs LAC | $8,000 | 29.54 | 50.22 | 27.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Keon Coleman | BUF vs LAC | $4,300 | 6.37 | 10.83 | 9.0% |
| WR | Joshua Palmer | BUF vs LAC | $3,500 | 10.36 | 17.61 | 6.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## gpp-17 (gpp)

- Salary: **$49,900** (left $100) · Proj **197.1** · Ceiling **341** · Proxy own **126** pts · Leverage 2.73
- Stack: CAR — Jalen Coker (WR) + Darren Waller (TE) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| TE | Darren Waller | CAR vs CLE | $3,400 | 11.6 | 19.72 | 6.0% |
| FLEX | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| DST | LV DST | LV vs NO | $2,600 | 12.5 | 27.5 | 8.0% |

## gpp-18 (gpp)

- Salary: **$49,900** (left $100) · Proj **168.5** · Ceiling **293** · Proxy own **138** pts · Leverage 2.04
- Stack: BUF — Khalil Shakir (WR) + Joshua Palmer (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Josh Allen | BUF vs LAC | $8,000 | 29.54 | 50.22 | 27.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| WR | Khalil Shakir | BUF vs LAC | $4,800 | 7.51 | 12.77 | 11.0% |
| WR | Joshua Palmer | BUF vs LAC | $3,500 | 10.36 | 17.61 | 6.0% |
| TE | Trey McBride | ARI vs SF | $6,700 | 19.02 | 32.33 | 23.0% |
| FLEX | Devaughn Vele | NO vs LV | $4,400 | 15.7 | 26.69 | 10.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-1 (leverage)

- Salary: **$49,600** (left $400) · Proj **185.3** · Ceiling **321** · Proxy own **84** pts · Leverage 3.81
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| DST | LV DST | LV vs NO | $2,600 | 12.5 | 27.5 | 8.0% |

## lev-2 (leverage)

- Salary: **$49,800** (left $200) · Proj **170.6** · Ceiling **297** · Proxy own **86** pts · Leverage 3.55
- Stack: DAL — CeeDee Lamb (WR) + KaVontae Turpin (WR) (mates=2, double=YES) · Bring-back: Derrick Henry (RB, BAL)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | KaVontae Turpin | DAL vs BAL | $3,000 | 1 | 1.7 | 5.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-3 (leverage)

- Salary: **$49,700** (left $300) · Proj **186.3** · Ceiling **324** · Proxy own **85** pts · Leverage 3.8
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-4 (leverage)

- Salary: **$49,700** (left $300) · Proj **185.8** · Ceiling **322** · Proxy own **85** pts · Leverage 3.79
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| DST | PIT DST | PIT vs CIN | $2,700 | 13 | 28.6 | 9.0% |

## lev-5 (leverage)

- Salary: **$48,900** (left $1,100) · Proj **187.5** · Ceiling **325** · Proxy own **89** pts · Leverage 3.66
- Stack: DAL — CeeDee Lamb (WR) + Jake Ferguson (TE) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Jake Ferguson | DAL vs BAL | $4,100 | 11.5 | 19.55 | 9.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | LV DST | LV vs NO | $2,600 | 12.5 | 27.5 | 8.0% |

## lev-6 (leverage)

- Salary: **$49,600** (left $400) · Proj **162.7** · Ceiling **284** · Proxy own **75** pts · Leverage 3.74
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · Bring-back: Derrick Henry (RB, BAL)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | Chase Brown | CIN vs PIT | $6,600 | 15 | 25.5 | 7.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| WR | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-7 (leverage)

- Salary: **$49,900** (left $100) · Proj **179.8** · Ceiling **312** · Proxy own **85** pts · Leverage 3.81
- Stack: DAL — Javonte Williams (RB) + CeeDee Lamb (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | Javonte Williams | DAL vs BAL | $6,700 | 16.1 | 27.37 | 18.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Joshua Palmer | BUF vs LAC | $3,500 | 10.36 | 17.61 | 6.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-8 (leverage)

- Salary: **$49,900** (left $100) · Proj **187.3** · Ceiling **326** · Proxy own **86** pts · Leverage 3.79
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-9 (leverage)

- Salary: **$50,000** (left $0) · Proj **182.3** · Ceiling **317** · Proxy own **86** pts · Leverage 3.75
- Stack: DAL — CeeDee Lamb (WR) + Ryan Flournoy (WR) (mates=2, double=YES) · Bring-back: Derrick Henry (RB, BAL)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Dak Prescott | DAL vs BAL | $6,700 | 22.6 | 38.42 | 5.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | CeeDee Lamb | DAL vs BAL | $7,800 | 26.9 | 45.73 | 5.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| TE | Dalton Kincaid | BUF vs LAC | $5,500 | 20.71 | 35.21 | 6.0% |
| FLEX | Ryan Flournoy | DAL vs BAL | $3,800 | 5.8 | 9.86 | 8.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-10 (leverage)

- Salary: **$49,100** (left $900) · Proj **202.9** · Ceiling **352** · Proxy own **130** pts · Leverage 2.46
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-11 (leverage)

- Salary: **$49,000** (left $1,000) · Proj **201.7** · Ceiling **349** · Proxy own **129** pts · Leverage 2.46
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| DST | PIT DST | PIT vs CIN | $2,700 | 13 | 28.6 | 9.0% |

## lev-12 (leverage)

- Salary: **$48,700** (left $1,300) · Proj **197.7** · Ceiling **343** · Proxy own **123** pts · Leverage 2.68
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Kenneth Walker III | KC vs MIA | $7,400 | 32 | 54.4 | 20.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-13 (leverage)

- Salary: **$49,900** (left $100) · Proj **201.4** · Ceiling **350** · Proxy own **137** pts · Leverage 2.35
- Stack: CAR — Xavier Legette (WR) + Darren Waller (TE) + Jalen Coker (WR) (mates=3, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| WR | Chris Olave | NO vs LV | $7,200 | 26.9 | 45.73 | 24.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Darren Waller | CAR vs CLE | $3,400 | 11.6 | 19.72 | 6.0% |
| FLEX | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| DST | CIN DST | CIN vs PIT | $2,900 | 14.5 | 31.9 | 10.0% |

## lev-14 (leverage)

- Salary: **$48,800** (left $1,200) · Proj **192.7** · Ceiling **334** · Proxy own **123** pts · Leverage 2.64
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-15 (leverage)

- Salary: **$47,300** (left $2,700) · Proj **191.8** · Ceiling **333** · Proxy own **118** pts · Leverage 2.7
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Dalton Schultz | HOU vs IND | $4,200 | 18.3 | 31.11 | 9.0% |
| FLEX | Dontayvion Wicks | PHI vs CHI | $4,100 | 11.96 | 20.33 | 3.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## lev-16 (leverage)

- Salary: **$49,800** (left $200) · Proj **203.4** · Ceiling **352** · Proxy own **137** pts · Leverage 2.32
- Stack: CAR — Jalen Coker (WR) + Xavier Legette (WR) (mates=2, double=YES) · No bring-back

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | D'Andre Swift | CHI vs PHI | $6,200 | 27.17 | 46.19 | 16.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Jalen Coker | CAR vs CLE | $5,500 | 25.7 | 43.69 | 13.0% |
| TE | Travis Kelce | KC vs MIA | $4,500 | 19.1 | 32.47 | 15.0% |
| FLEX | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| DST | PIT DST | PIT vs CIN | $2,700 | 13 | 28.6 | 9.0% |

## lev-17 (leverage)

- Salary: **$49,100** (left $900) · Proj **188.4** · Ceiling **327** · Proxy own **130** pts · Leverage 2.29
- Stack: CAR — Xavier Legette (WR) + Darren Waller (TE) (mates=2, double=YES) · Bring-back: Denzel Boston (WR, CLE)

| Slot | Player | Game | Salary | Proj | Ceil | Own* |
|---|---|---|---|---|---|---|
| QB | Bryce Young | CAR vs CLE | $5,600 | 29.8 | 50.66 | 14.0% |
| RB | Jonathan Taylor | IND vs HOU | $7,600 | 27.7 | 47.09 | 21.0% |
| RB | Derrick Henry | BAL vs DAL | $7,700 | 28 | 47.6 | 21.0% |
| WR | Amon-Ra St. Brown | DET vs NYJ | $7,900 | 33.5 | 56.95 | 27.0% |
| WR | Davante Adams | LAR vs DEN | $6,200 | 22.9 | 38.93 | 16.0% |
| WR | Xavier Legette | CAR vs CLE | $3,500 | 4.2 | 7.14 | 6.0% |
| TE | Darren Waller | CAR vs CLE | $3,400 | 11.6 | 19.72 | 6.0% |
| FLEX | Denzel Boston | CLE vs CAR | $4,500 | 17.2 | 29.24 | 10.0% |
| DST | NE DST | NE vs JAX | $2,700 | 13.5 | 29.7 | 9.0% |

## Exposure (top 25 per batch)

### gpp
- Jalen Coker (WR): 11/18 = 61%
- Bryce Young (QB): 10/18 = 56%
- Kenneth Walker III (RB): 10/18 = 56%
- D'Andre Swift (RB): 10/18 = 56%
- Amon-Ra St. Brown (WR): 10/18 = 56%
- Derrick Henry (RB): 8/18 = 44%
- Jonathan Taylor (RB): 8/18 = 44%
- Chris Olave (WR): 8/18 = 44%
- Denzel Boston (WR): 8/18 = 44%
- Xavier Legette (WR): 7/18 = 39%
- CIN DST (DST): 7/18 = 39%
- Davante Adams (WR): 7/18 = 39%
- Dalton Kincaid (TE): 6/18 = 33%
- NE DST (DST): 5/18 = 28%
- Dalton Schultz (TE): 4/18 = 22%
- Joshua Palmer (WR): 4/18 = 22%
- Travis Kelce (TE): 4/18 = 22%
- Josh Allen (QB): 3/18 = 17%
- Patrick Mahomes (QB): 3/18 = 17%
- Keon Coleman (WR): 2/18 = 11%
- LV DST (DST): 2/18 = 11%
- Tyler Shough (QB): 2/18 = 11%
- CAR DST (DST): 2/18 = 11%
- PIT DST (DST): 2/18 = 11%
- Dontayvion Wicks (WR): 2/18 = 11%

### leverage
- Jalen Coker (WR): 14/17 = 82%
- Dontayvion Wicks (WR): 12/17 = 71%
- Dak Prescott (QB): 9/17 = 53%
- D'Andre Swift (RB): 9/17 = 53%
- Kenneth Walker III (RB): 9/17 = 53%
- CeeDee Lamb (WR): 9/17 = 53%
- Dalton Kincaid (TE): 8/17 = 47%
- Derrick Henry (RB): 8/17 = 47%
- Bryce Young (QB): 8/17 = 47%
- Amon-Ra St. Brown (WR): 8/17 = 47%
- Xavier Legette (WR): 8/17 = 47%
- Ryan Flournoy (WR): 6/17 = 35%
- Jonathan Taylor (RB): 6/17 = 35%
- Denzel Boston (WR): 6/17 = 35%
- CIN DST (DST): 6/17 = 35%
- NE DST (DST): 6/17 = 35%
- Dalton Schultz (TE): 5/17 = 29%
- PIT DST (DST): 3/17 = 18%
- LV DST (DST): 2/17 = 12%
- Darren Waller (TE): 2/17 = 12%
- Davante Adams (WR): 2/17 = 12%
- KaVontae Turpin (WR): 1/17 = 6%
- Jake Ferguson (TE): 1/17 = 6%
- Chase Brown (RB): 1/17 = 6%
- Javonte Williams (RB): 1/17 = 6%

## Exclusions (96)
- Zay Flowers: Q but research verdict = lean out / unlikely
- Brock Bowers: Q but research verdict = lean out / unlikely
- Caleb Williams: DK status D
- Jayden Daniels: DK status OUT
- Jaxson Dart: DK status OUT
- DJ Moore: Q but research verdict = lean out / unlikely
- Alec Pierce: DK status OUT
- Kyle Monangai: Q but research verdict = lean out / unlikely
- Tyjae Spears: Q but research verdict = lean out / unlikely
- Rico Dowdle: Q but research verdict = lean out / unlikely
- Jonathon Brooks: DK status IR
- Dallas Goedert: DK status D
- Tyson Bagent: Q but research verdict = lean out / unlikely
- Matthew Caldwell: DK status IR
- Aidan O'Connell: Q but research verdict = lean out / unlikely
- Graham Mertz: DK status IR
- Dillon Gabriel: DK status IR
- Skylar Thompson: DK status IR
- Brittain Brown: DK status IR
- Ronnie Rivers: DK status IR
- Ty Chandler: DK status IR
- Chris Collier: DK status IR
- Isaac Guerendo: DK status OUT
- James Conner: DK status IR
- Trey Benson: DK status IR
- Jeremy McNichols: DK status IR
- Zach Charbonnet: DK status OUT
- Robbie Ouzts: DK status IR
- Trevor Etienne: DK status IR
- Dylan Sampson: DK status IR
- Chip Trayanum: DK status IR
- Isiah Pacheco: DK status IR
- Myles Montgomery: DK status IR
- Scott Matlock: DK status IR
- Jordan Mason: DK status IR
- Adam Randall: DK status IR
- Malik Davis: DK status IR
- Demarcus Robinson: DK status OUT
- Chig Okonkwo: Q but research verdict = lean out / unlikely
- Johnny Wilson: DK status IR
…plus 56 more in lineups.json

*Own = ownership PROXY, not a real projection.