# DraftKings DFS — Complete Deep Dive (2026-11-07)

One document. Contents: (A) 2026 Millionaire Maker winners Weeks 1–8, construction-coded + era-by-era evolution + literature table + methods; (B) Round-2 primary-source pass — datasets, the Sun-Mon negative result with its cause, the 90,000-sims resolution, pro process; (C) the acquired papers at equation level (full dossiers) + library manifest + optimizer code notes; (D) open-source sim-repo dissection incl. the katana verdict; (E) DeepSeek sim dossiers when complete.

---

# PART A — Winners, history, literature, methods (Round 1)

# DraftKings NFL DFS Deep Dive — Consolidated Research Report

**Mission date:** 2026-11-07. **Research-only deliverable** — no recommendations are made anywhere in this report.
**Provenance:** All sources below were located and read through the web index (`browser_search` / `browser_open`) on 2026-11-07 (~21:22–21:40 UTC). The live research browser was unavailable during this run, so every source is flagged **index** rather than "verified live." Where a number was computed by the researcher from published per-player figures, it is flagged **[computed]**. Where salaries were rebuilt from pre-slate pricing sources rather than a contest-standings table, they are flagged **[reconstructed]**.

**Correction to the mission premise, documented in Part 1:** the 2026 flagship was *not* uniformly a $20 buy-in. Week 1 ran as a **$5-entry** NFL $3.5M Fantasy Football Millionaire; later weeks are described by DraftKings' own articles as $20 entries into $2.75M / $2.5M pools.

**Known baseline** (supplied by the requesting agent, not re-derived): ~95.3% of Millionaire Maker top-10 lineups QB-stack; QB + exactly 2 teammates in 39.5% of top-100 vs 28.6% of field; bring-back WR in 48% of top lineups vs 25.5% of field; winners spend avg ~$49,893; mid-tier DST and punt-or-premium TE dominate; cumulative ownership barbell ~100–125%; per-player lock makes Monday-night FLEX late swap a structural edge on Sun–Mon slates; DFS Army study claims 232,000 lineups / 376 tournaments. Where 2026 evidence below *differs* from the baseline (notably TE-in-FLEX frequency among the eight 2026 winners), the difference is flagged explicitly rather than smoothed over.

---

# PART 1 — 2026 Millionaire Maker Winners, Weeks 1–8

Primary sources for all eight weeks: DraftKings Network's weekly winning-lineup recaps and GamblingSite.com's weekly recap tables (salary / ownership / points stated there to be taken from DraftKings contest standings). All eight winners were found. Salary and ownership tables are complete for Weeks 1, 2, 3, 5; partial or reconstructed for Weeks 4, 6, 7, 8 (each gap flagged in-line and again in the Part 1 gaps list).

## Week 1 — jwussow28 — 273.98 pts — $1,000,000

Contest: NFL **$3.5M** Fantasy Football Millionaire, **$5 entry** (not $20), **832,342 entries**. Won by 5+ points; the winning entry was the user's 2nd entry. Total salary spent: **$50,000**.

| Slot | Player | Salary | Owned | DK Pts |
|---|---|---|---|---|
| QB | Jordan Love | $5,700 | 1.7% | 24.48 |
| RB | Jahmyr Gibbs | $8,000 | 42.8% | 37.60 |
| RB | Derrick Henry | $6,700 | 9.3% | 38.30 |
| WR | Christian Watson | $5,900 | 4.3% | 35.70 |
| WR | DJ Moore | $5,600 | 4.4% | 24.00 |
| WR | Jalen Coker | $4,600 | 7.5% | 36.80 |
| TE | Dallas Goedert | $4,100 | 10.1% | 23.70 |
| FLEX | D'Andre Swift (RB) | $6,100 | 9.8% | 35.40 |
| DST | Steelers | $3,300 | 10.9% | 18.00 |

- Salary allocation: QB $5,700 · RB $14,700 · WR $16,100 · TE $4,100 · FLEX (RB) $6,100 · DST $3,300. Most expensive: Gibbs $8,000 (the only player above $7K). Cheapest: Steelers DST $3,300 (cheapest skill player: Goedert $4,100).
- Cumulative ownership: **100.8% [computed]**.
- Construction coding: **QB + 1** stack (Love–Watson, Green Bay). No formal bring-back from the QB's game (GB at MIN closed GB +2.5). Secondary cross-game correlation: Swift (CHI) opposite Coker (CAR) from the 59–37 CHI–CAR game (closed total 47.5). Three RBs rostered; five players scored ≥35 pts; six of nine players were under 10% owned.
- Sources: https://www.gamblingsite.com/blog/nfl-dfs-milly-maker-recap-week-1/ · https://dknetwork.draftkings.com/2026/09/14/draftkings-nfl-millionaire-winning-lineup-week-1/

## Week 2 — elidkatz1 — 232.38 pts — $1,000,000

Contest: NFL **$3M** Fantasy Football Millionaire, **172,761 entries**. Won by 5.72 points; winning entry was the user's 49th entry. Total salary spent: **$50,000**. (Entry fee for this week: NOT FOUND in the sources read.)

| Slot | Player | Salary | Owned | DK Pts |
|---|---|---|---|---|
| QB | Brock Purdy | $6,200 | 9.5% | 28.48 |
| RB | Christian McCaffrey | $8,000 | 22.9% | 22.60 |
| RB | J.K. Dobbins | $5,000 | 2.5% | 3.60 |
| WR | Jaxon Smith-Njigba | $8,100 | 10.2% | 45.50 |
| WR | CeeDee Lamb | $7,300 | 19.0% | 38.30 |
| WR | Tre Tucker | $4,500 | 0.7% | 25.90 |
| TE | Dalton Schultz | $3,200 | 22.4% | 29.00 |
| FLEX | George Kittle (TE) | $4,600 | 4.5% | 18.00 |
| DST | Patriots | $3,100 | 5.3% | 21.00 |

- Salary allocation: QB $6,200 · RB $13,000 · WR $19,900 · TE $3,200 · FLEX (TE) $4,600 · DST $3,100. Most expensive: Smith-Njigba $8,100. Cheapest: Patriots DST $3,100.
- Cumulative ownership: **97.0% [computed]**.
- Construction coding: **QB + 2 team stack** (Purdy + McCaffrey + Kittle, San Francisco), **no bring-back**. **TE in FLEX (double TE)**. Seven of nine players came from the late-afternoon window. Won despite a 3.6-point slot (Dobbins). Stack game SF–MIA closed at a 44.5 total with SF's implied team total 28.5, the slate's highest.
- Sources: https://www.gamblingsite.com/blog/nfl-dfs-milly-maker-recap-week-2/ · https://dknetwork.draftkings.com/2026/09/21/draftkings-nfl-millionaire-winning-lineup-week-2/

## Week 3 — 180DegreesMiami — 239.80 pts — $1,000,000

Contest: NFL **$2.75M** Fantasy Football Millionaire, **161,764 entries**, $20 entry per DraftKings' lookahead articles. Won by 6.70 points; winning entry was the user's 10th entry. Total salary spent: **$50,000**.

| Slot | Player | Salary | Owned | DK Pts |
|---|---|---|---|---|
| QB | Geno Smith | $4,900 | 7.5% | 30.04 |
| RB | Jahmyr Gibbs | $8,800 | 26.8% | 41.40 |
| RB | Jaylen Warren | $5,700 | 13.1% | 23.60 |
| WR | Jaxon Smith-Njigba | $8,600 | 18.9% | 38.36 |
| WR | Garrett Wilson | $6,300 | 27.9% | 29.70 |
| WR | Jameson Williams | $5,400 | 8.9% | 8.90 |
| TE | Kenyon Sadiq | $3,500 | 6.0% | 26.50 |
| FLEX | Juwan Johnson (TE) | $3,700 | 5.9% | 24.30 |
| DST | Vikings | $3,100 | 6.6% | 17.00 |

- Salary allocation: QB $4,900 · RB $14,500 · WR $20,300 · TE $3,500 · FLEX (TE) $3,700 · DST $3,100. Most expensive: Gibbs $8,800. Cheapest: Vikings DST $3,100. Cheapest QB of the eight 2026 winners ($4,900).
- Cumulative ownership: **121.6% [computed]** (The Fantasy Footballers' recap reported 121.8% for the winner).
- Construction coding: **QB + 2** (Smith + Wilson + Sadiq, NY Jets) **plus a 2-player bring-back** (Gibbs + Jameson Williams, Detroit) — a 5-player game stack of NYJ at DET, which closed at a 49.5 total (3rd-highest on the slate) and finished 31–24. **Double TE** (TE in FLEX). Note: DK's narrative text gave Jameson Williams 8.0 pts while GamblingSite's standings table gives 8.90; only 8.90 reconciles with the published 239.80 total, so 8.90 is used.
- Sources: https://www.gamblingsite.com/blog/nfl-dfs-milly-maker-recap-week-3/ · https://dknetwork.draftkings.com/2026/09/28/draftkings-nfl-millionaire-winning-lineup-week-3/

## Week 4 — oluseyeajayi1973 — 234.20 pts — $1,000,000

Contest: NFL **$2.75M** Fantasy Football Millionaire, 12-game main slate. Won by **0.2 points** over 2nd place (brich34). DraftKings published this week's lineup only as a screenshot image; no standings table exists in the text layer of any source found, so salaries are partial.

Players and points (from DK's narrative; the nine point values sum exactly to 234.20):

| Slot | Player | Salary | DK Pts |
|---|---|---|---|
| QB | Dak Prescott (5.2% owned) | $6,400 | 21.1 |
| RB | Kyren Williams | $5,900 | 36.7 |
| RB/FLEX | Javonte Williams (1.5% owned) | $6,600 | 31.3 |
| WR | CeeDee Lamb | $7,800 ⚠ | 44.3 |
| WR | Nico Collins | $7,200 | 33.8 |
| WR | Zay Flowers | $6,900 | 28.8 |
| TE | Zach Ertz | NOT FOUND | 3.3 |
| TE/FLEX | T.J. Hockenson | $3,300 | 27.9 |
| DST | Jaguars | NOT FOUND | 7.0 |

- ⚠ Salary conflict: DraftKings' Millionaire Picks article listed Lamb at $8,600; a Bleacher Nation game page and a HuddleVote graphic both list $7,800. The $7,800 figure (two sources) is used; the conflict is recorded, not resolved by fiat.
- Known seven salaries sum to $44,100 [computed]. **Total salary spent, Ertz salary, Jaguars DST salary, and the contest entry count: NOT FOUND.**
- Construction coding: **QB + 1** (Prescott–Lamb) **with a bring-back** (Nico Collins, Houston, opposite side of DAL at HOU, final DAL 34–30) plus same-team RB Javonte Williams. **Double TE** (Ertz at TE, Hockenson in FLEX — the slot order is inferred from the narrative, not text-confirmed). Two slots scored under 15 points (Ertz 3.3, Jaguars DST 7.0) and the lineup still won. Lamb's 44.3 was the slate's top score.
- Sources: https://dknetwork.draftkings.com/2026/10/05/draftkings-nfl-millionaire-winning-lineup-week-4/ · https://www.bleachernation.com/stats-and-news/2026/10/02/texans-vs-cowboys-week-4-dfs-picks-prices-and-preview/ · https://fantasyanalyst.substack.com/p/2026-fantasy-football-sunday-update-e9f · RotoWire Week 4 pricing (Hockenson $3,300) via search index.

## Week 5 — ilanwor — 250.06 pts — $1,000,000

Contest: NFL **$2.75M** Fantasy Football Millionaire, **161,557 entries**, 11-game slate. Won by 6.02 points over conradical907 (244.04); winning entry was the user's 72nd entry. Total salary spent: **$50,000**.

| Slot | Player | Salary | Owned | DK Pts |
|---|---|---|---|---|
| QB | Drake Maye | $6,300 | 4.3% | 42.46 |
| RB | Jaylen Warren | $6,700 | 17.9% | 39.80 |
| RB | D'Andre Swift | $6,200 | 41.3% | 17.30 |
| WR | Tre' Harris | $4,100 | 18.3% | 3.60 |
| WR | Christian Watson | $6,400 | 9.3% | 35.30 |
| WR | DeMario Douglas | $3,500 | 1.2% | 22.50 |
| TE | Isaiah Likely | $4,300 | 11.9% | 32.40 |
| FLEX | Jahmyr Gibbs (RB) | $9,800 | 26.6% | 40.70 |
| DST | Jets | $2,700 | 9.6% | 16.00 |

- Salary allocation: QB $6,300 · RB $12,900 · WR $14,000 · TE $4,300 · FLEX (RB) $9,800 · DST $2,700. Most expensive: Gibbs $9,800 (most expensive FLEX of the eight weeks). Cheapest: Jets DST $2,700.
- Cumulative ownership: **140.4% [computed]** — the highest of the fully tabulated weeks, driven by the slate's most-owned player (Swift, 41.3%) being in the winning lineup.
- Construction coding: **QB + 1 minimum stack** (Maye–Douglas cost just $9,800 combined), **no bring-back**. The lineup contained the slate's four highest scorers overall (Maye, Gibbs, Warren, Watson) plus the top-scoring TE (Likely). Stack game LV at NE closed at a 45.5 total, NE implied 24.5.
- Sources: https://www.gamblingsite.com/blog/nfl-dfs-milly-maker-recap-week-5/ · https://dknetwork.draftkings.com/2026/10/12/draftkings-nfl-millionaire-winning-lineup-week-5/

## Week 6 — CMACXIMUS — 210.50 pts — $1,000,000

Contest: NFL **$2.75M** Fantasy Football Millionaire, 10-game slate, $20 entry. Won by 1.3 points over CodyJJohnson. **210.50 is the lowest winning score of Weeks 1–8.** Entry count 161,516 per a TwoGunGPT simulation article (which also states a 15% rake for this contest). The lineup below is reconstructed from DK's narrative (the nine point values sum exactly to 210.50); salaries are **[reconstructed]** from pre-slate pricing sources and sum to exactly $50,000, a strong cross-check, but they do not come from a published contest-standings table.

| Slot | Player | Salary [reconstructed] | DK Pts |
|---|---|---|---|
| QB | Michael Penix Jr. (<5% owned) | $5,000 | 24.1 |
| RB | Chuba Hubbard | $6,300 | 22.1 |
| RB/FLEX | D'Andre Swift (10.1% owned) | $6,700 | 23.0 |
| WR | Malik Nabers (just under 25% owned) | $6,500 | 31.5 |
| WR | Germie Bernard | $4,000 | 25.7 |
| WR | Xavier Worthy | $4,600 | 14.3 |
| TE | Isaiah Likely | $4,800 | 23.9 |
| FLEX/RB | Kenneth Walker III | $8,500 | 30.9 |
| DST | Chiefs (5.9% owned) | $3,600 | 15.0 |

- Salary allocation [reconstructed]: QB $5,000 · RB $14,800 · WR $15,100 · TE $4,800 · FLEX (RB) $6,700 · DST $3,600. Most expensive: Walker $8,500. Cheapest: Chiefs DST $3,600 (cheapest skill player: Bernard $4,000).
- Construction coding: **naked QB** — Penix rostered with no Atlanta teammate — but **with a bring-back**: D'Andre Swift (Chicago) from the opposite side of the ATL–CHI game. Secondary same-team correlations: Nabers + Likely (NY Giants) and Walker + Worthy + Chiefs DST (Kansas City). Nabers' 31.5 was the slate's high score; Walker was the top RB; Likely the top TE. Full cumulative ownership: NOT FOUND (only Penix <5%, Swift 10.1%, Chiefs DST 5.9%, Nabers <25% were published). A Substack Week 7 note describes Penix's late TDs as coming against the Panthers, which conflicts with DK's account placing his game vs Chicago; DK is treated as authoritative and the discrepancy is recorded here.
- Sources: http://dknetwork.draftkings.com/2026/10/19/draftkings-nfl-millionaire-winning-lineup-breakdown-for-week-6/ · https://www.thehuddle.com/story/sports/fantasy/football/2026/10/17/dfs-fantasy-domination-week-6/92222417007/ · https://twogungpt.com/articles/2026-10-16-the-chalk-graded/

## Week 7 — dfs_ads — 225.42 pts — $1,000,000

Contest: NFL **$2.5M** Fantasy Football Millionaire, 10-game slate, $20 entry, **147,057 other entries** (per DK). Won by 5+ points. Lineup from DK's narrative; the nine point values sum exactly to 225.42. The Buccaneers DST salary was not published in any text source found, so total salary spent is NOT FOUND (the eight known salaries sum to $47,700 [computed]).

| Slot | Player | Salary | DK Pts |
|---|---|---|---|
| QB | Jared Goff | $6,800 | 22.02 |
| RB | Tony Pollard (4.4% owned) | $5,300 | 39.5 |
| RB | Braelon Allen | $5,900 | 22.4 |
| WR | Amon-Ra St. Brown | $7,800 | 27.2 |
| WR | Jameson Williams | $5,800 | 26.1 |
| WR | Tee Higgins (5.9% owned) | $6,600 | 29.8 |
| TE | Colby Parkinson | $3,000 | 9.8 |
| FLEX | Ashton Jeanty (RB) | $6,500 | 21.6 |
| DST | Buccaneers (4.6% owned) | NOT FOUND | 27.0 |

- Salary allocation (known slots): QB $6,800 · RB $11,200 · WR $20,200 · TE $3,000 · FLEX (RB) $6,500 · DST unknown. Most expensive: St. Brown $7,800. Cheapest: Parkinson $3,000 (salary stated by DK). A Ship It Nation transcript implies the Bucs DST was a near-minimum punt priced below the Titans' $2,600, but no exact figure appears in text; it is **not** asserted here.
- Construction coding: **QB + 2 double stack** (Goff + St. Brown + Jameson Williams, Detroit vs Green Bay; the game carried the slate's highest total, 53.5, per DK's Week 7 picks), **no bring-back**, RB in FLEX. Extreme leverage build: **seven of nine players under 10% owned**, including the slate's top RB (Pollard, 39.5 pts at 4.4%) and top DST (Buccaneers, 27.0 at 4.6%). Full cumulative ownership: NOT FOUND.
- Sources: https://dknetwork.draftkings.com/2026/10/26/draftkings-nfl-millionaire-winning-lineup-breakdown-for-week-7/ · https://splashplaypodcast.com/dfs/nfl/2026-week-7/

## Week 8 — Hebrewcheetah — 259.08 pts — $1,000,000

Contest: NFL **$2.5M** Fantasy Football Millionaire (tagged "$50K Crown Cash Throne Eligible"), 11-game slate, $20 entry. Won by 5+ points. Lineup from DK's narrative; the nine point values sum exactly to 259.08. Salaries are **[reconstructed]** from pre-slate pricing sources and sum to $49,900. Entry count: NOT FOUND.

| Slot | Player | Salary [reconstructed] | DK Pts |
|---|---|---|---|
| QB | Joe Burrow (8.5% owned) | $7,000 | 45.48 |
| RB | Braelon Allen | $6,100 | 26.3 |
| RB | Bhayshul Tuten | $5,900 | 32.9 |
| WR | Ja'Marr Chase | $7,700 | 34.1 |
| WR | Tee Higgins (14.2% owned) | $6,700 | 40.5 |
| WR | Michael Wilson | $6,200 | 29.8 |
| TE | Gunnar Helm (3.4% owned) | $2,500 | 14.6 |
| FLEX | Harold Fannin Jr. (TE, 1.9% owned) | $4,200 | 27.4 |
| DST | Patriots | $3,600 | 8.0 |

- Salary allocation [reconstructed]: QB $7,000 · RB $12,000 · WR $20,600 · TE $2,500 · FLEX (TE) $4,200 · DST $3,600. Most expensive: Chase $7,700. Cheapest: Helm $2,500 (DK described him as the cheapest possible salary at TE).
- Cumulative ownership: ≈**106.2%** — a "Milly Autopsy" Instagram post reported average ownership of 11.8% across the nine slots (×9 = 106.2) [computed from that report].
- Construction coding: **QB + 2 double stack** (Burrow + Chase + Higgins produced 120.08 points from TEN at CIN, final CIN 43–36 OT; game total 46.5, CIN implied 30.3 per FantasySportsEdge) **plus a TE bring-back** (Helm, Tennessee). **Double TE** (TE in FLEX). Burrow's 45.48 was the slate's top score; Higgins and Chase were the top two WRs. The only late-window slot was the Patriots DST (8.0 pts).
- Sources: https://dknetwork.draftkings.com/2026/11/02/draftkings-nfl-millionaire-winning-lineup-breakdown-for-week-8/ · https://goingfor2.com/draftkingsownership/ · https://www.instagram.com/reel/DfQwDFbxfIe/

## Part 1 — Cross-week summary (Weeks 1–8, 2026)

| Wk | Winner | Score | Spent | QB stack | Bring-back | FLEX | Cum. own. |
|---|---|---|---|---|---|---|---|
| 1 | jwussow28 | 273.98 | $50,000 | QB+1 | No (secondary CHI–CAR pair) | RB | 100.8% |
| 2 | elidkatz1 | 232.38 | $50,000 | QB+2 | No | TE | 97.0% |
| 3 | 180DegreesMiami | 239.80 | $50,000 | QB+2 | Yes (2 players) | TE | 121.6% |
| 4 | oluseyeajayi1973 | 234.20 | NOT FOUND | QB+1 | Yes (WR) | TE | NOT FOUND |
| 5 | ilanwor | 250.06 | $50,000 | QB+1 | No | RB | 140.4% |
| 6 | CMACXIMUS | 210.50 | $50,000 [recon.] | Naked | Yes (RB) | RB | NOT FOUND |
| 7 | dfs_ads | 225.42 | NOT FOUND | QB+2 | No | RB | NOT FOUND |
| 8 | Hebrewcheetah | 259.08 | $49,900 [recon.] | QB+2 | Yes (TE) | TE | ≈106.2% |

- Winning scores: 273.98, 232.38, 239.80, 234.20, 250.06, 210.50, 225.42, 259.08 → **mean 240.68 [computed]**. A Substack season tracker (2026-11-01) put the average winning score through Week 7 at 238.02 vs 236.35 for 2025, and noted five of the seven 2026 winners carried a sub-15-point slot (https://fantasyanalyst.substack.com/p/2026-fantasy-football-sunday-update-e9f).
- 7 of 8 winners QB-stacked (only Week 6 was naked); bring-backs appeared in Weeks 3, 4, 6, 8 only.
- **Divergence from baseline, flagged:** TE-in-FLEX appears in 4 of the 8 winners (Weeks 2, 3, 4, 8), whereas the supplied baseline describes TE-in-FLEX as a negative signal in top-10/top-100 samples. Winners are a sample of eight 1st-place lineups, not top-100 finishes; both statements can hold simultaneously, but the 2026 winner-level evidence does not match the baseline's TE-FLEX characterization.
- Every week in Weeks 1–8 ran a Millionaire Maker in some form; none was cancelled. Altered forms: Week 1 was a $5-entry $3.5M edition (832,342 entries); the guarantee stepped down $3.5M → $3M → $2.75M → $2.5M across the eight weeks; Week 8 carried a "$50K Crown Cash Throne Eligible" tag.

## Part 1 — NOT FOUND / gaps

- Week 2 entry fee (not stated in the sources read).
- Week 4: Zach Ertz salary; Jaguars DST salary; total salary spent; contest entry count; full cumulative ownership; TE/FLEX slot order (inferred, not text-confirmed); CeeDee Lamb salary conflict ($7,800 ×2 sources vs $8,600 ×1 source) unresolved by a standings table.
- Week 6: salaries are reconstructed, not from a standings table; full cumulative ownership not published.
- Week 7: Buccaneers DST salary; total salary spent; full cumulative ownership.
- Week 8: salaries are reconstructed, not from a standings table; contest entry count.
- Per-player ownership for Weeks 4, 6, 7 beyond the partial figures quoted in-line.

---

# PART 2 — 2026 Sun–Mon Classic ("Extended All-Day") Slate, Weeks 1–8

## What was established

- The slate **exists** in 2026. GamblingSite's weekly picks document it: Week 1's main slate (12 games) excluded Sunday night (Cowboys at Giants) and Monday night (Broncos at Chiefs), while "DraftKings also runs a 14-game Sunday-to-Monday classic slate" with the same 9 roster spots and $50,000 cap (https://www.gamblingsite.com/picks/nfl-week-1-dfs-picks-9-13-2026/). Week 3's main slate was 13 games and the Sun–Mon slate **15 games** (https://www.gamblingsite.com/picks/nfl-week-3-dfs-picks-9-27-2026/).
- Third-party tools label the slate **"DraftKings · Classic (Sun-Mon)"** (e.g., Week 9: 13 games, locks Sunday 1:00 PM ET) — StatWarrior (https://statwarrior.com/dfs-picks/nfl) and Advanced Sports Logic both use this label.
- FantasySportsEdge's Week 8 slate list includes "Late Sun–Mon · 5 games" and "SNF–MNF · 2 games" sub-slates (https://fantasysportse
...[truncated 27091 chars]
---

# PART B — Datasets, papers read in full, Sun-Mon, the 90,000 sims, pro process (Round 2)

# DraftKings NFL DFS — Round 2 Deep Dive

Research only; no recommendations. Researched 2026-11-07. Every item carries its source URL. "Read in full" means the full text was fetched and read during this mission; anything else is flagged **NOT READ** with the reason. An addendum (Garrett's order) gave extra weight to the 90,000-simulations question inside Target 4: TwoGunGPT's sims, the "katana repository," and SaberSim/Stokastic/Splash methodology at the deepest published level. That material is §4.1–§4.3 and is the most fully resolved part of this report.

## Summary

- **Target 1:** No free, public, NFL lineup-level dataset exists. The one real archive of DraftKings/FanDuel lineups + ownership at scale is **STAT-API** (paywalled, API-only, no republication licence). DraftKings' own standings CSVs exist per contest but expire 10 days after the contest ends, which is why no public archive accumulated. Kaggle has **no** NFL lineup-level dataset (an NBA one proves the format; the NFL Kaggle items are salary/points only). RotoGuru is a free salary/points archive back to 2014 (DK) with no ownership. Winners-only compilations: GamblingSite (36 winners, 2024–25, full detail), EdgeLine (80 winners, 2021–25, partial detail), FFNation (scattered week-by-week posts, 2017–21).
- **Target 2:** All four named papers were located at legitimate full-text URLs and read in full: Hunter–Vielma–Zaman (arXiv v3), Haugh–Singal (Imperial repository PDF), Getty et al. (open SIAM Review PDF — note: fifth author is **Hosoi**, not Murphy), Mbeledogu (SSAC PDF). Mahoney et al. (arXiv:2309.15253) was also read in full via ar5iv. Newell's thesis was read at abstract level only (flagged). Book TOCs: Bales and Miller/Davidow fully listed from public previews; **"Cracking the DFS Code" TOC NOT FOUND** publicly.
- **Target 3:** The Sun-Mon Classic slate label is real and current (StatWarrior lists "DraftKings · Classic (Sun-Mon)," 13 games, Week 9 2026), and historically (2015) the Sun-Mon slate *was* the Millionaire Maker slate. But **no Sun-Mon winner, winning lineup, recap, interview, or screenshot was found for any season**, and the 2026 Sun-Mon flagship GPP's name/fee/guarantee could not be documented from any lobby-listing source. This is a genuine negative result after searching web, Reddit, X, YouTube, podcasts, and Wayback.
- **Target 4 / addendum:** TwoGunGPT's 90,000 sims are fully documented by the source itself: 10,000 box-score-level game sims per game from the betting line, recombined into 90,000 Sundays over three seeds; a 30,000-lineup field drawn off his own ownership model; every lineup paid on the real $20 Milly ladder (161,516 entries, $2.75M, 15% rake removed). **No DFS repository named "katana" could be identified** — the only prominent GitHub "katana" is ProjectDiscovery's web crawler. The deepest published sim methodology from any vendor is SaberSim's (play-by-play sampling unit, emergent correlation); the deepest *open* methodology is the chanzer0/NFL-DFS-Tools repo (fitted distribution families + Gaussian copula with Iman–Conover). Stokastic discloses contest-sim structure and dials but no distribution/correlation math. Splash Play discloses sim counts, field sizes, and percentile definitions.

---

# TARGET 1 — Lineup-level historical datasets

## 1.1 DraftKings' own contest-standings CSVs (the primary mechanism — and why no archive exists)
- Source: DraftKings support, https://support.draftkings.com/dk/en-us/how-does-draftkings-keep-fantasy-sports-contests-transparent?id=kb_article_view&sysparm_article=KB0010720
- Any entrant can download a CSV for any Fantasy Sports contest after lock: desktop only (not the app), GameCenter → Standings → "Export Lineups to CSV"; completed contests via My Contests → History.
- **The CSV is available only 10 days after the contest ends.** This single fact explains the absence of any long-lived public archive of DK standings.
- Fields stated on the support page: entrant section (Rank, Time Remaining, Fantasy Points) and, per lineup player, an athlete section (Roster Position, % Drafted — i.e., ownership in that contest — Fantasy Points).
- The file format is independently documented by the open-source JoshEngleman/nfl-live-standings tooling, which consumes DK contest CSVs headed `EntryId, EntryName, QB, QBId, RB1, RB1Id, …` (Classic format).

## 1.2 STAT-API — the only real lineup-level archive found (paywalled)
- Source: https://stat-api.com/daily-fantasy/ (read in full 2026-11-07) and https://stat-api.com/pricing/
- Stated holdings (all sports): **34.9K contests with lineups since 2021; 446M contest entries since 2021; 12.3M historical salaries since 2016; 74.7K contests tracked; 52.5K slates since 2016.**
- NFL specifically: 5.3K slates since 2021 and 1.1M player salaries; **38.8K NFL contests with 300M entries, 17K of them with standings, lineups, payouts and actual ownership**, downloadable as CSV or JSON. By operator: DraftKings 28.2K contests with lineups, FanDuel 6.7K.
- Exact download endpoint (from the site's own examples): `GET https://api.stat-api.com/api/v1/dfs/contests/{contest_id}/download?format=csv` — one line per lineup with rank, points, payout; `format=json` adds the player pool and each player's actual ownership. Worked example on the page: contest `7644474`; the Week 2 DraftKings Millionaire table shows 1st = elidkatz1, 232.38 pts, $1,000,000, in a 173K-lineup contest with 39K paid.
- Access terms, stated on the page: full contest downloads require **Pro at $99/mo** (10M slate & contest records/mo); Starter is $49/mo (league data/odds, not the full DFS suite); Elite $199/mo adds a commercial licence. A free key gets a **5-lineup preview** of any contest. Licence: Free/Starter/Pro are personal-use, one person; **you may download and keep the data after the plan ends but may not publish it in any form.**
- Note: an earlier pass over the pricing page showed "from $49/mo" language alongside the $99 Pro figure; the DFS page itself (read in full) resolves this as Starter $49 / Pro $99. Both numbers are the vendor's own.

## 1.3 Kaggle
- **No NFL lineup-level / contest-standings Kaggle dataset was found** across searches for draftkings, millionaire maker, dfs lineups, fantasy points ownership, including site-restricted searches.
- NBA analogue (proves the format exists, but basketball only): **"Daily Fantasy Basketball — DraftKings NBA" by alandu20**, https://www.kaggle.com/datasets/alandu20/daily-fantasy-basketball-draftkings (read 2026-11-07). 20 days of contests scraped 2017-11-27 → 2017-12-28; one folder per day, one per contest; per contest: `DKSalaries.csv`, `payout_structure.csv`, `contest-standings.csv`; plus `contests.csv` (entry fee, slate, contest size), a `projections` folder (RotoGrinders + Daily Fantasy Nerd), and some contests with `players.csv`, `covariance_mat_unfiltered.csv`, `hist_fpts_mat.csv`. Updated 2017-12-29.
- Salary/points only (no lineups, no ownership): **"Historical NFL Fantasy 2020" by Sam Longenbach**, https://www.kaggle.com/datasets/samuellongenbach/historical-nfl-fantasy-2020/tasks (read 2026-11-07). One file, `Historical Fpts by Game 2020.csv`, **616.25 kB**, Weeks 1–17 of 2020, 11 columns: week, Oppt, DKP (DK points), Price (DK price), FDP, Price.f, YHP, Price.y, Name, Team, Pos. Sourced from RotoGuru. 188 downloads / 3,506 views at read time.

## 1.4 RotoGuru — free salary/points archive (no ownership)
- Verified via a GitHub research note: https://github.com/alexanderdfree/fantasy_football_ml_aws/blob/HEAD/todo/new-sources-research-2026-06.md — RotoGuru's free archive holds FanDuel salaries+points from 2011+ and **DraftKings from 2014+**, with **no ownership column**; live URL pattern verified there: `http://rotoguru1.com/cgi-bin/fyday.pl?week=1&year=2013&game=fd&scsv=1` (2013 DK empty; DK starts 2014).
- Tooling: **nfldfs** (PyPI), https://pypi.org/project/nfldfs/0.0.3/ — scrapes RotoGuru for DK/FD/Yahoo by season/week into CSV/DataFrame; sample data = full 2017 DK season.
- A second GitHub note (bpattypick/dfs_opto, https://github.com/bpattypick/dfs_opto/blob/HEAD/docs/data-sources.md) marks DK salary history via RotoGuru "unverified," states there is no public DK API, and calls manual weekly Export-to-CSV archiving "the durable path."

## 1.5 RotoGrinders ResultsDB / FantasyLabs / FantasyCruncher
- **ResultsDB is real but not a public download.** RotoGrinders' own GPP recaps quote contest ownership "by position" from ResultsDB (e.g., 2019 Week 12 recap: https://rotogrinders.com/articles/week-12-gpp-recap-the-laird-s-day-3211604). No public bulk-download or open archive URL was found; it presents as a web tool behind the RotoGrinders site.
- FantasyLabs historical ownership: a dashboard launched Feb 2017 (per the GitHub note in §1.4); no public archive found.
- FantasyCruncher publishes per-sport/date contest-link pages (NBA pattern verified: https://www.fantasycruncher.com/contest-links/NBA/2025-11-14). Mbeledogu (§2.4) used fantasycruncher.com/contest-links/NFL/ for 2021 payout lines. An attempt to open the NFL page for 2026-11-08 returned **HTTP 403** (access denied) on 2026-11-07, so the Week 9 2026 NFL contest list could not be verified from this source.

## 1.6 Milly Maker winners compilations (winners only — not full standings)
- **GamblingSite.com** — 36 winners, **2024 and 2025 complete (18 + 18)**, with salary + contest ownership per player: https://www.gamblingsite.com/blog/draftkings-millionaire-maker-strategy/. Averages: 2024 = 228.4 pts, 2025 = 236.7, combined 232.6; ~81% stacked; stated source = DraftKings' own weekly winning-lineup breakdowns.
- **EdgeLine** — 80 winners, 2021–2025 (18/18/18/15/11 by season); only 29 have full player-level salary+scoring, 51 have construction+ownership only: https://edgelineff.com/insights/who-wants-to-be-a-millionaire-draftkings
- **FFNation** — week-by-week winning-lineup posts spanning at least 2017–2021 including playoffs (confirmed posts include 2017 Wk15/Wk17, 2018 Wk4/Wk16, 2019 Wk3/Wk15/Wk17, 2020 Wk11/Wk12/Wk14, 2021 Wk3/Wk6/Wk7); index: http://ffnation.com/tag/ppr/ and http://ffnation.com/tag/ppr/page/2/. Coverage is scattered across posts, not a single table; a complete week-by-week census was not achievable from the tag index alone.
- **Seeking Optimal** (blog) states it "studied the winning lineup from every DraftKings Milly Maker since 2021" and sells the full set inside "Perfect Lineups" (Seeking Optimal Pro, paywalled): https://blog.seekingoptimal.io/p/nfl-week-8-dfs-picks-draftkings-main-slate-2026-11-01
- **Wayback Machine:** targeted searches found **no captures of DraftKings contest standings pages** — consistent with the 10-day CSV window (§1.1). Recorded as NOT FOUND (§7).

## 1.7 Academic replication data
- **Getty et al.'s FanDuel 2013–14 data is not public.** The SIAM paper's footnote: "To request access to these datasets for academic purposes, please contact fdlegal@fanduel.com."
- Hunter et al.'s population lineups were obtained by *entering* the contests themselves; no replication dataset is posted with the paper. Code is public: https://github.com/dscotthunter/Fantasy-Hockey-IP-Code (README: https://github.com/dscotthunter/Fantasy-Hockey-IP-Code/blob/master/README.md); Zaman's baseball code is cited in the paper as github.com/zlisto/dailyfantasybaseball.
- Mbeledogu's code: github.com/drmbeledogu/RobustDFS (named in the paper's footers).
- Haugh–Singal: no public replication dataset found; the paper's data are the authors' own real FanDuel entries (§2.2).

---

# TARGET 2 — The full texts, at content level

## 2.1 (a) Hunter, Vielma & Zaman — "Picking Winners in Daily Fantasy Sports Using Integer Programming"
- Full text read: arXiv v3, 23 Jan 2019, http://arxiv.org/pdf/1604.01455v3.pdf (v2 mirror: https://storage.googleapis.com/arxiv-dataset/arxiv/arxiv/pdf/1604/1604.01455v2.pdf). Submitted to INFORMS Journal on Optimization.
- **Problem:** the *picking-winners problem* (2.1): choose S ⊆ [m], |S| = k, maximizing U(S) = P(∪ᵢ∈S Eᵢ) — the probability at least one of your k entries wins. NP-hard (Thm 2.1); U is non-negative, non-decreasing, submodular (Lemma 1), so greedy achieves U(S_g)/U(S*) ≥ 1 − e⁻¹ (Thm 2.2).
- **Approximation:** U₂(S) (2.3) = Σᵢ P(Eᵢ) − ½ Σᵢ≠ⱼ P(Eᵢ∩Eⱼ) (inclusion–exclusion truncated at pairs); error bound 0 ≤ U − U₂ ≤ 20c(kp)³ (Thm 2.4). In the Gaussian case (entries Xᵢ jointly Gaussian, Eᵢ = {Xᵢ ≥ t}) a closed-form lower bound U₂ˡ(S) (2.4, Thm 2.5) yields the three design principles: **high mean μᵢ, high variance σᵢ, low pairwise correlation ρᵢⱼ**.
- **Sequential IP (2.10):** build entry i by maximizing Σⱼ μ′ⱼxᵢⱼ subject to: variance (expression 2.6) ≥ εᵢ; covariance with each previous entry q ≤ γᵢq; Σⱼxᵢⱼ = n; x ∈ 𝒢 (feasible set).
- **Hockey specialization (§4):** budget B = $50,000, 9 players; positions (4.1): 2≤C≤3, 3≤W≤4, 2≤D≤3, G=1; ≥3 distinct teams (4.2); stacking constraints — goalie stacking (4.4): no skater opposing your own goalie; line stacking: ≥1 complete 3-man line (4.5) and ≥2 partial lines of ≥2 skaters (4.6); defensemen stacking (4.7): only first-power-play defensemen; overlap constraint (4.8): Σⱼ x*ₗⱼxᵢⱼ ≤ γ against every previous lineup. Full program (4.9) = maximize Σμⱼxᵢⱼ s.t. (4.3) + (4.8) + chosen stacking subset.
- **Prediction model (§3.2):** linear regression on RotoGrinders + Daily Fantasy Nerd predictions taken ~30 min before lock. Skaters: μ_k = β₀ + β₁f_k1 + β₂f_k2 + ε with β₁ = 0.634, β₂ = 0.282, R² = 0.238, n = 10,825. For goalies, win probability (β₃ ≈ 4.31–5.30) is the only significant added term.
- **Experiments (§5):** 38 real DraftKings top-heavy hockey contests, 21 Oct–31 Dec 2015, several thousand entrants each; population lineups obtained by entering. Six stacking types (Table 3): **Type 4** (goalie + line + defensemen stacking, exactly 3 teams) was best at 100 and 200 lineups; no stacking was worst. Median profit margin was −100% with 1 lineup, improving at 100/200 lineups (mean dominated by outliers). Best prediction model = both sites' projections + win probability. Real-money coda: top-ten finishes multiple times in hockey and baseball; ~$15,000 of winnings donated to the Greater Boston Food Bank.
- **Follow-up by the group:** Hunter & Zaman (2017) / Hunter, Saini & Zaman, "Picking Winners: A Data Driven Approach to Evaluating the Quality of Startup Companies," arXiv:1706.04229 (PDF: https://fetcher.alphaxiv.org/v2/pdf/1706.04229v2.pdf) — same framework applied to venture portfolios; out-of-sample portfolios achieved exit rates "as high as 60%, nearly double top VC firms." No later DFS-specific paper by Zaman's group was found.

## 2.2 (b) Haugh & Singal — "How to Play Fantasy Sports Strategically (and Win)"
- Free full text read: Imperial College repository PDF (version of 16 Oct 2019), https://spiral.imperial.ac.uk/server/api/core/bitstreams/a1aef748-a483-485e-b81c-59f06cdfc50c/content. Journal version: *Management Science* 67(1), 72–92 (Jan 2021), DOI 10.1287/mnsc.2019.3528.
- **Formulation (§2):** a risk-neutral decision-maker maximizes expected reward R(W) over feasible portfolios 𝒲 (budget B, positional rules; their FanDuel NFL = 9 players: QB, 2 RB, 3 WR, TE, K, D), for both double-up and top-heavy payoff structures; opponents' portfolios 𝒲_op are random and unknown.
- **Ownership model (§3):** Dirichlet-multinomial per position: p_QB ~ Dir(α_QB); each opponent draws QB ~ Multinomial(1, p_QB), etc. (WR: Multinomial(3, p_WR) with a no-repeat adjustment). **Dirichlet regression:** α_QB = exp(X_QB β_QB) (eq. 4); worked example (eq. 5): α_QB,t = exp(β₀ + β₁f_QB,t + β₂c_QB,t + β₃μ_QB,t) with f = FantasyPros published ownership estimate, c = scaled salary, μ = expected points. Bayesian fit, flat prior on β, posterior ∝ product of Dirichlets (eq. 6), fitted in **STAN**. A footnote records that assuming p known exactly "led to over-certainty and poor performance."
- **Copula:** an opponent is a "stacker" (QB + his team's main WR) with probability q, else positions are independent. Opponent portfolios are generated by accept–reject sampling: must be feasible and spend ≥ B_lb of the budget B.
- **Solution method (§4–5):** via the Morton et al. result on outperforming a stochastic benchmark (Prop. 1), maximizing P(wᵀδ ≥ G(r₀)) reduces to a grid over λ of **binary quadratic programs**: max wᵀμ_δ ± λ(wᵀΣ_δw − 2wᵀσ_{δ,G}) over w ∈ 𝒲 (Algorithms 1–2). For top-heavy multi-entry, the objective R(W) (eq. 17) is monotone submodular under a payoff-convexity assumption (Assumption 3, Thm 1); greedy Algorithm 3 adds entries by largest value-add with a diversification constraint wᵀw*_{λ} ≤ γ. **γ = C−3 = 6 (of 9 players) was optimal, and diversification nearly doubled expected reward.** Algorithm 3's certified suboptimality bound ν averaged 62.27% across the 17 weeks (range 48.95%–80.21%).
- **Backtest (§6):** real FanDuel entries, all 17 weeks of the 2017 NFL regular season. Per week: top-heavy N=50 entries × $1 (≈200,000 opponents; 1st ≈ $5,000, 2nd ≈ $2,500, ~$100 at rank 30, min cash ≈ $2 at rank ~50,000); quintuple-up N=25 × $2 (≈10,000 opponents); double-up N=10 × $2 (≈30,000 opponents).
- **Results:** top-heavy strategic cumulative P&L **+$280.74 — over 3× the benchmark** that ignores opponents; strategic maximum cumulative shortfall only $18.50; total capital required $75.76 ($50 + $18.50 + $7.26), i.e., **a return over 350% in 17 weeks**; the benchmark's return was under 50% on its larger capital need; a randomly average portfolio would have lost ≈$127.50 at the ~15% house edge. Quintuple-up: strategic led until week 6, benchmark ahead by $60 at season end (within one week's variance).
- **Predicted vs realized (the divergence the mission asked for):** for **both models and all three contest types, expected profit exceeded realized profit** — the authors attribute this to "the bias that results from optimizing within a model." Top-heavy realized profit was within 1 SD of expected; quintuple-up and double-up were not. Week-10 in-model diversification table (Fig. 2): top-heavy strategic E(P&L) = 578.6, SD = 2953.8, P(loss) = 0.58 vs benchmark 86.3 / 694.5 / 0.46; replication-strategy variant (Fig. 3): strategic 123.9 / 1265.9 / 0.67. Self-identified handicaps: μ_δ taken a day early and late news ignored — Week 7: Fournette projected 17.27 at $9,000 vs Ivory 6.78 at $5,900, and ~60% of double-up opponents took Ivory; Week 16: 52 of their entries rostered Funchess (projected high, $7,000, scored 2.6) over Byrd ($4,900, scored 9.6). The paper also quantifies insider trading and collusion (collusion's benefit "surprisingly large" in the stylized identical-portfolio case, likely small in practice).

## 2.3 (c) Getty, Li, Yano, Gao & Hosoi — "Luck and the Law: Quantifying Skill in Fantasy Sports" (SIAM Review 2018)
- **Correction to the mission text: the fifth author is A. E. Hosoi, not "Murphy."** Authors: Daniel Getty, Hao Li, Masayuki Yano, Charles Gao, A. E. Hosoi. *SIAM Review* 60(4): 869–887, DOI 10.1137/16M1102094, CC BY 4.0. Open PDF read in full: https://pdfs.semanticscholar.org/b8dc/c5a4c5a5163f7423f44ce3844f1ce48d27c3.pdf (MIT DSpace handle 1721.1/119466).
- **Data:** FanDuel head-to-head + 50/50 contests, 2013/14 and 2014/15, four sports, 12 datasets. NFL: 190,562 players (H2H) / 312,263 (50/50); max 155 games per player; max 49,657 entries per player; $60,000 salary cap; 584 athletes. Access is by request only (§1.7).
- **Method:** three of Levitt et al.'s four skill tests (anonymized data precludes the fourth). (i) *Expected payoff:* win fraction wᵢ (eq. 1), corrected for a "quitting boundary layer" of n_BL ≈ 5 games (eq. 2): least-active group's mean win fraction 0.48 vs most-active group's 0.61 (all sports pooled). (ii) *Player action:* 100 Monte Carlo random lineups per day (salary drawn from a normal centred at cap/9, position-weighted variant; accepted only if salary ≥ 85% of cap): real users beat random lineups with weighted win probability MLB 0.732, NBA 0.946, **NFL 0.864**, NHL 0.680 (equal-weighted: 0.781 / 0.898 / 0.809 / 0.618). (iii) *Persistence:* split each player's season into halves (Pᵢ, Qᵢ), rotate 45°: Sᵢ = (Pᵢ+Qᵢ−1)/√2, Tᵢ = (Qᵢ−Pᵢ)/√2; A, B = inverse-variance-weighted variances of S and T; **skill metric R\* = 1 − B/A** (0 = pure luck, 1 = pure skill), with analytic E[R\*] (eq. 16). (iv) *Bayesian P(Skill):* likelihood under Luck = binomial (φ = ½), under Skill = uniform; uniform prior; P(Skill) > ½ for all four sports at all population sizes and → 1 once players exceed a transition count N_TG; crossover estimates at R\* = ½: N_TG ≈ 20 games (MLB), ≈5 (NBA), ≈25 (NFL), ≈40 (NHL); in the Bayesian version NBA's N_TG ≈ 1. Ordering: basketball most skill-based, hockey closest to chance.

## 2.4 (d) Mbeledogu — "Robust Daily Fantasy Sports: Maximizing Reward via the Robust Optimization Paradigm" (MIT Sloan SSAC)
- Landing: https://www.sloansportsconference.com/research-papers/robust-daily-fantasy-sports-maximizing-reward-via-the-robust-optimization-paradigm ; exact PDF (read in full): https://cdn.prod.website-files.com/5f1af76ed86d6771ad48324b/63ff9c048d57ea06b9f3f5bb_Robust%20Daily%20Fantasy%20Sports%20-%20Maximizing%20Reward%20via%20the%20Robust%20Optimization%20Paradigm.pdf . The paper won **1st place in the SSAC Research Papers Competition**. **No thesis by Mbeledogu was found** (NOT FOUND, §7).
- **Base MILP (eqs. 1–8):** max pᵀx s.t. Σ_QB x = 1, Σ_WR x ≥ 3, Σ_RB x ≥ 2, Σ_TE x ≥ 1, Σ_DST x = 1, Σ_P x = 9, cᵀx ≤ $50,000 (DraftKings Classic; the ≥ counts plus the total of 9 encode the FLEX).
- **Robust formulation:** actual points = p + e; max θ s.t. θ ≤ (p+e)ᵀx for all e ∈ 𝒰 (eqs. 9–13). **Uncertainty set:** ‖e‖_p ≤ ρ (eq. 15) — p=1 polygon, p=2 ball, p→∞ box — then correlation-adjusted by **data whitening**: ‖Σ_e^(−1/2) e‖_p ≤ ρ (eq. 20), where Σ_e is the projection-error covariance and the whitening matrix W satisfies WᵀW = Σ_M⁻¹. Σ_e construction (Algorithm 1): drop players missing >20% of games; same-team pairs computed directly from history; cross-team pairs set to 0; opposing-position covariance = the min-magnitude of the two directional position covariances (worked example: Rodgers vs the Bears DST from the prior 12 weeks); matrix forced positive-semidefinite via Higham's nearest-correlation algorithm (Dykstra alternating projections, Frobenius norm); then Σ_e = D_e R_e D_e.
- **Dual reduction:** the tractable final objective (eq. 37) is **max pᵀx − ρ‖Σ_e^(1/2)x‖_q** — the subtracted term is a "safety factor." Box set (q=1) linearized as max pᵀx − ρΣzᵢ, −z ≤ Σ_e^(1/2)x ≤ z (eqs. 39–40); polygon (q=∞) as max pᵀx − ρz with z ≥ ±(Σ_e^(1/2)x)ᵢ ∀i (eqs. 42–44). The problem stays a MILP and solves in "fractions of a second" in Gurobi on an i7.
- **Setup:** projections from DFSForecast.com (a stated Milly Maker winner; projection R² = 0.62); 10,000 simulated outcomes per week with errors ~ MVN(0, Σ_e-true estimated from all 18 weeks); lineups built for **2021 Weeks 10–18 only** (earlier weeks lacked covariance history); payout lines = average DraftKings 50/50 payout lines from FantasyCruncher contest-links.
- **Results:** robust lineups sacrifice mean for 1st-percentile score. Polygon set, 1st-percentile gains: Wk14 89.1→96.0 (+7.7%), Wk15 +6.7%, Wk16 97.6→109.0 (+11.7%), Wk18 +5.3%; no change Wks 10, 17. Box set generally better: Wk14 89.1→100.9 (+13.2% at ρ=0.1), Wk16 97.6→109.6 (+12.3% at ρ=0.35), Wk13 +3.8%, Wk18 +6.1%. **But payout probability (Table 3, box set) is mixed and sometimes worse:** Wk13 MILP 19% vs robust 5%; Wk17 MILP 71% vs robust 58%; small robust gains Wk14 (77→80%), Wk16 (75→77%), Wk18 (80→81%). Worked example, Wk16: the robust model chose Brady (proj. 20.79, more expensive) over Prescott (22.14) because of Brady's negative error-covariance with Ronald Jones. The paper's own caveat: robustification helps only if the underlying MILP lineup already has >50% of its density above the payout line. A "+ρ" variant (eq. 45, favouring variance/stacking) and a Bertsimas–Sim budgeted set (eq. 46) are proposed but not tested.

## 2.5 (e) Other full-text DFS optimization works
- **Mahoney, Paniak et al. — "Method and Validation for Optimal Lineup Creation for Daily Fantasy Football Using Machine Learning and Linear Programming," arXiv:2309.15253.** Full text read via https://ar5iv.labs.arxiv.org/html/2309.15253 (PDF: https://arxiv.org/pdf/2309.15253). Method: a supervised neural network forecasts FPTS from 2018 NFL data (features: prior FPTS, point differentials, offensive/defensive rankings, home/away, latitude/longitude and travel, elevation/climate, spread and over/under; data from DraftKings, RotoGuru, FantasyData, Football Outsiders), using four-week moving windows (14 windows; effective 3-week lookback); forecasts feed a MILP maximizing expected FPTS under DraftKings Classic constraints ($50K; 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST; Thu–Mon GPP pool). The problem is framed as a Stochastic Knapsack Problem; all computation in MATLAB R2018b. Results: generated lineups beat random lineups on average and were typically above the simulation median **except Weeks 13, 14, 16**; against **real DraftKings user lineups (from free/$0.25 contests) the median generated lineup finished at ≈ the 31st percentile** — better than only about one-third of humans. The generated lineups' actual scores fell **below the 2.5th-percentile low end of the model's own predictions**, and player-level predictions were "generally poor," usually outside the 95% CI; performance decayed from Week 13 (injuries, playoff clinching/elimination unmodeled). One lineup per week was entered; the authors flag that free/$0.25 fields may be weaker than paid fields.
- **Newell, Sarah — "Optimizing Daily Fantasy Sports Contests through Stochastic Integer Programming," MS thesis, Kansas State University, May 2017.** Repository record: https://krex.k-state.edu/items/e723f351-6128-4bfc-929e-1022641d65c6 . **Abstract read in full; full text NOT READ** (the KREX fetch exposed the record and abstract but not the PDF text; a DocsLib copy exists at https://docslib.org/doc/2022960/optimizing-daily-fantasy-sports-contests-through-stochastic-integer-programming but was not read either). From the abstract: the primary contribution is **MMIP, the first model to optimize the expected payout of a tiered DFS contest** — a stochastic integer program in which player points are **normally distributed**, team points therefore normal, with the team standard deviation approximated by a **piecewise linear function** and cumulative payout probabilities calculated directly; "MMIP solves quickly." Two random-vs-strategy studies support the thesis's conclusion that DFS is not a game of chance. Secondary accounts: casino.org reports 35 contests entered across the 2016 NFL season with random teams, all 35 lost, with IP-model teams outperforming in each (https://www.casino.org/news/academic-study-says-daily-fantasy-sports-is-skill-not-gambling/); the Selig Vienna thesis (2018, https://utheses-gateway.univie.ac.at/api/document/get/file/47595) summarizes Newell's inputs as season-mean expected points, per-player normals, and team variance = sum of individual variances. Journal offspring: Easton & Newell (2019), "Are daily fantasy sports gambling?", *Journal of Sports Analytics* 5(1), 35–43; conference version: Newell & Easton, "Optimizing tiered daily fantasy sports — Mathematically modeling DraftKings® Millionaire Maker Tournament," IISE 2017 Proceedings, pp. 1–6 (both per Easton's CV: https://systems.utah.edu/wp-content/uploads/2025/10/EastonfullResume.pdf).
- **Jiang — "Modeling Daily Fantasy Basketball," Cal Poly MS thesis 2023.** https://digitalcommons.calpoly.edu/theses/2638/ — **abstract-level only (NOT READ in full).** ML prediction plus Pareto-front / greedy / evolutionary lineup search; a stars-and-scrubs finding.
- **Smith — "Investigating Daily Fantasy Baseball," Cal Poly MS thesis 2021.** https://digitalcommons.calpoly.edu/theses/2605/ — **abstract-level only.** LSTM prediction + lineup generation on 2016–17 FanDuel MLB.
- **Hendricks — "Sports Analytics with Natural Language Processing," Harvard senior thesis 2022.** DASH PDF: https://dash.harvard.edu/server/api/core/bitstreams/a8df57a7-bf00-4e90-b79e-a01e5aec9e1f/content — **abstract/intro-level only.** BERT tweet-sentiment + statistical projections + integer programming; claims projections alone beat professional projections by ~30% and the full method by "an order of magnitude."
- **Penn State honors thesis (2021), "Fantasy Football Profitability."** https://honors.libraries.psu.edu/files/final_submissions/7309 — **abstract/contents-level only.** Built on RotoGuru DK data 2014–2020 (fields: name, week/year, game ID, team, opponent, home/away, position, DK points, DK salary); final model **not profitable**.

## 2.6 (f) Books
- **Jonathan Bales — *Fantasy Football for Smart People: Daily Fantasy Pros Reveal Their Money-Making Secrets* (2014).** Full TOC publicly listed on Everand: https://www.everand.com/book/235114958/Fantasy-Football-for-Smart-People-Daily-Fantasy-Pros-Reveal-Their-Money-Making-Secrets . Chapters: 1 Research (with Headchopper); 2 Understanding Variance (C.D. Carter); 3 The Vegas Lines (Mirage88); 4 Projecting Players (MrTuttle05, Dinkpiece); 5 Winning Cash Games (PrimeTime420); 6 Advanced Tournament Play (Al_Smizzle); 7 Lineup Creation (naapstermaan); 8 Building a Bankroll (KillaB2482); Bonus: How to Win Heads-Up Leagues and 50/50s. Dataset claim in the text: "I worked with DraftKings, and they provided me with all of the information on what's actually winning leagues on the site" — no size or seasons stated in the preview seen.
- **Bales — *Fantasy Football for Smart People: A Guide to Winning at Daily Fantasy Sports* (2014).** Everand: https://www.everand.com/book/252750537/Fantasy-Football-for-Smart-People-A-Guide-to-Winning-at-Daily-Fantasy-Sports . TOC = Section I (chapters from *Daily Fantasy Pros…*), Section II (from *Fantasy Football (and Baseball) for Smart People*: "One-on-One: How to Win Heads-Up Leagues (and 50/50s)", "The Final Piece of the Puzzle: Creating Projections and Lineups", "An Appendix of Extra Data"), Section III (from *The Ultimate In-Season Weekly Guide*).
- **Bales — season-long volumes (context only):** *How to Dominate Your Draft* TOC (12 chapters incl. Ch. 2 "Why Week-to-Week Consistency is (Almost) Worthless", Ch. 7 "Getting Bullish: What the Stock Market Can Teach Us…") via PRLog: https://www.prlog.org/11882949-fantasy-football-for-smart-people-the-most-advanced-fantasy-book-on-the-market.html ; *How to Cash in on the Future of the Game* TOC: Ch. 1 money management / bankroll / optimal bet size; Ch. 2 league selection; Ch. 3 projections with Peter Jennings (FFFC $150K winner); Ch. 4 comparables; Ch. 5 stacking/consistency; Ch. 6 bonus sample.
- **Kevin "Geek" Alan — *Cracking the DFS Code: Revealing the Secrets to Winning Large-Field DraftKings NFL Tournaments* (DFS Army, 2026).** Amazon link circulated by DFS Army itself: https://a.co/d/0iAfAt8Q (also in DFS Army podcast descriptions, e.g. https://www.iheart.com/podcast/256-dfs-army-podcast-31085152/); one aggregator listed $29.99. **Full TOC NOT FOUND publicly** — no Amazon "Look inside" or Google Books TOC was retrievable; a reader-made Google Doc titled "Cracking The DFS Code Notes" is linked from a YouTube strategy video (https://www.youtube.com/watch?v=eOxTW9DJFpc) but its URL is truncated in the indexed description. **Stated dataset — internally inconsistent across DFS Army's own posts:** "230,000 top DraftKings lineups" / "232,000 lineups, four seasons, 376 major tournaments, over 35,000 top-100 finishing entries" / "34,856 top-100 lineups" (X post). Summary of the companion video at http://gist.ly/youtube-summarizer/winning-draftkings-nfl-data-driven-tournament-strategy . Headline claims from that summary: average winning lineup's total projected ownership ≈ 126%; 87% of winners used QB + 1–2 same-team pass-catchers; **"two sub-10%" rule: 94% of winning lineups had ≥2 skill players (RB/WR/TE) under 10% owned**; typical winner structure = 2 sub-5% punts, 2 sub-10%, 3 at 10–20%, 1–2 chalk; median total ownership of winners rose 16 points over recent seasons ("chalk creep"); ~30% of winning lineups used an underdog QB.
- **Ed Miller & Matthew Davidow — *The Logic of Sports Betting* (2019).** Full TOC via a Scribd copy: https://www.scribd.com/document/558620857/The-Logic-of-Sports-Betting . There is **no DFS chapter and no dedicated Kelly/bankroll chapter** (a Goodreads reviewer explicitly faults the book for omitting bankroll management). Portfolio-relevant chapters: Part I — "Break-even Percentages" (p. 19), "Multiway Markets" (p. 30), "Parlays" (p. 33), "Market Making" (p. 40), "Public Money" (p. 63); Part II — "Betting The Best Price" (p. 81), "Beating The Odds" (p. 91), "Market Agreement and Resistance" (p. 109), "Strong vs Weak Markets" (p. 116), "Related Markets" (p. 122), "The Betting Menu" (p. 128); Part III — "Should You Try To Win 60% Or 54%?" (p. 138), "Derivatives" (p. 140), "Props" (p. 153), "Taking Advantage of Parlays" (p. 159), "Multiway Markets and Futures" (p. 171), "Angles" (p. 181), "In-Play Betting" (p. 193), "Taking Advantage of Sportsbook Marketing" (p. 212), "Chopping The Hold" (p. 220), "How Do I Know If I'm Winning?" (p. 227 — the sample-size/edge-verification chapter), Appendix A (p. 234). Chapter contents themselves not read.
- **Joseph Buchdahl — *Squares and Sharps, Suckers and Sharks* (2016; 2021 ed., ISBN 9780857304841).** TOC via Better World Books: https://www.betterworldbooks.com/product/detail/squares-and-sharps-suckers-and-sharks-the-science-psychology-and-philosophy-of-gambling-9780857304841 — "God Does Play Dice" (p. 9); "Cleopatra's Nose" (p. 11); "To Gamble or not to Gamble: is there a Question?" (p. 33); **"The Three Rs: Risk, Reward and Rationality" (p. 74)**; "The Harder I Work, the Luckier I Get" (p. 130); "Monkeys Throwing Darts" (p. 160); "Ginsberg's Theorem" (p. 195); **"Winner Takes All" (p. 263)**; "A Market for Lemons" (p. 284); "The Fox and the Hedgehog" (p. 333). No DFS-specific chapter; the risk/reward/rationality and winner-takes-all chapters are the portfolio/Kelly-adjacent ones (contents not read). His *Fixed Odds Sports Betting* (2003) is described in reviews as containing mathematical analysis of staking plans.

---

# TARGET 3 — The Sun-Mon Classic

## 3.1 What is documented
- **The slate label is real, current, and long-lived.** Pre-slate pages label it exactly "DraftKings (Classic (Sun-Mon))" / "DraftKings · Classic (Sun-Mon) slate · locks Sun 1:00 PM ET":
  - StatWarrior, for **Sun Nov 8, 2026 (Week 9)**: "DraftKings · Classic (Sun-Mon) slate · **13 games** · locks Sun 1:00 PM ET" (page updated Sat Nov 7, 2026, 2:00 PM ET): https://statwarrior.com/dfs-picks/nfl — a projections page, not a result.
  - Advanced Sports Logic used the identical "DraftKings (Classic (Sun-Mon))" label in 2020 (Dec 1), 2022 (Nov 20), and repeatedly in 2024 (Oct 12, Oct 26, Nov 9, Nov 16, Nov 30, Dec 14) — all pre-slate "top value" pages, no winners. Example: https://advancedsportslogic.com/nfl/5265-nfl-daily-fantasy-plays-nov-9-2024-11-09
- **Historical structure — when Sun-Mon WAS the flagship:** FootballGuys' DraftKings Weekly Spotlights state Sunday contests "begin at 1pm ET on Sunday and include all of the Sunday NFL games plus the Monday night games":
  - Week 1 2015: https://www.footballguys.com/article/Pasquino_DraftKings_Week1_2015_Spotlight — NFL $10M Millionaire Maker ($2M to 1st); NFL $1M Play-Action ($3 entry, 383,333-player field, pays top 84,950, $100K to 1st).
  - Week 17 2015: https://www.footballguys.com/article/Pasquino_DraftKings_Week_17_2015_Spotlight — NFL $4M Millionaire Maker, **$20 entry, 229,000+ spots**, $1M to 1st; NFL $1.25M Play-Action ($3, 479,100 players, top 105,500 paid, $100K to 1st).
  - A 2015 Play-Action listing: https://fantasyfootballers.org/draftkings-promotions/draftkings-nfl-1-million-play-action-tournament/ — $1M GPP, $3 entry, Sep 13 2015 1:00 PM ET, "Draft 9 players from the Sun.–Mon. games," 100 multi-entry limit, top 84,950 cash.
  - BettingUSA Millionaire Maker listing: https://www.bettingusa.com/draftkings-millionaire-maker-accepting-entries-now/ — $2.2M guaranteed, **$27 entry**, $1M to 1st, Sun Nov 23, 1:00 PM EST, "Game Days Covered: NFL Sunday and Monday Night."
- **2026 naming caveat:** the 2026 Sunday flagship documented in DK Network coverage is the **Sunday main slate** Millionaire — e.g., "NFL $2.5M Fantasy Football Millionaire [$1M to 1st]" at **$20 entry**, 11 games, Weeks 8/9 2026 — which is distinct from the Sun-Mon Classic slate. TwoGunGPT's Week 6 article (§4.1) independently documents a $20 Milly ladder of 161,516 entries / $2.75M / $1M to first on a 10-game main slate. Neither figure describes the Sun-Mon slate.

## 3.2 The negative result
After searches of the general web, Reddit r/dfsports, X/Twitter, YouTube, podcasts, Discord indexes, and the Wayback Machine: **no Sun-Mon Classic winning lineup, winner name, winner interview, recap post, or screenshot was found for any week of any season (2024–2026 or earlier)**. Every Sun-Mon hit was a pre-slate picks/projections page. And **how DraftKings names/structures a flagship GPP specifically on the Sun-Mon Classic slate in 2026 (entry fee, guarantee, field size) could not be documented from any lobby-listing source** — the one source that would have listed Week 9 2026 NFL contests directly (FantasyCruncher contest-links) returned HTTP 403. See NOT FOUND list (§7).

---

# TARGET 4 — Pro process, documented at detail level

## 4.1 ADDENDUM PRIORITY 1 — TwoGunGPT's 90,000 simulations, in full
Primary source, read in full 2026-11-07: **"The chalk, graded before Sunday," TwoGunGPT, Fri Oct 16, 2026** — https://twogungpt.com/articles/2026-10-16-the-chalk-graded/ . The article grades every popular player on the Week 6 main slate by what lineups containing him returned across the sims. Its "HOW IT'S BUILT" footer is the most complete methodology disclosure:

- **What one sim is:** one "simulated Sunday." Each main-slate game is simulated **10,000 times at the box-score level, from the betting line**; the per-game sims are then **recombined into 90,000 Sundays over three seeds**. So a "Sunday" is a full-slate draw assembled by recombining independently simulated games — the 90,000 is a recombination count over 10,000 underlying sims per game, not 90,000 independent simulations of each game.
- **What data feeds it:** the site's own **Ceiling Board** (the Thursday 6:07 PM CT filing for Week 6) — TwoGunGPT's proprietary projections, themselves built from the same 10,000-per-game box-score sims off the betting line — and the **Week-6 ownership column built on it** (his own ownership model).
- **How the field is modeled:** a field of **30,000 lineups drawn off his own ownership numbers, incorporating the field's stacking habits**. The draw deliberately **under-draws the priciest chalk**: Nacua drawn at 31% against 39% posted ownership; Walker 15% against 21%. (The field is 30,000 lineups, not the contest's actual 161,516 entries — a sampled field.)
- **How the payout ladder is modeled:** every lineup is ranked in every Sunday and paid by the **real $20 Milly ladder: 161,516 entries, $2.75 million pool, $1 million to first**.
- **The output metric:** a player's ROI = what every field lineup containing him returned, averaged over every Sunday. **DraftKings' rake (stated as 15% of the Milly) is taken out, so 0 = the field** — a positive number means lineups with that player beat the field after rake.
- **Precision/stability disclosure:** "the six half-runs agree within a few points on every number quoted" (three seeds × two halves). Inputs flagged: four players were questionable that week (C. Williams, Bowers, Olave, Flowers).
- **Stated reason for the 90,000 count: NONE FOUND.** The article never explains why 90,000 rather than 50,000 or 100,000. What the structure implies: 90,000 is simply the number of recombined Sundays generated from the 10,000 per-game sims across three seeds, and the half-run agreement is offered as the precision guarantee instead of a rationale for the count. Recorded as NOT FOUND (an explicit rationale), §7.
- **Headline outputs (Week 6, for the record):** Dameon Pierce (11% owned) +42% ROI — best on the board; Rhamondre Stevenson (13%) +37%; Daniel Jones (4%) +30%; Deshaun Watson (3%) +29%; Drake London (28%) +20%; Puka Nacua (39%) +13% (PLAY verdict — the chalk was right); Kyren Williams (28%) +12%; Kenneth Walker III (21%) −17%; Patrick Mahomes (2%) −34% — worst on the board; lineups with **no Ram at all returned −11%**, and a third of the field built that way.
- **Companion methodology disclosures on the same site:**
  - *Ceiling Board* (the projection product itself): every game played 10,000 times from the betting line; per player it publishes salary, average, median, **ceiling, "nuke," 3x odds**, and ownership. https://twogungpt.com/ and https://twogungpt.com/claude/
  - *Stack rankings* (Oct 17, 2026): every stack in every game built into a full lineup and run against a field drawn from his ownership numbers; "Score" = how often the lineup finishes in the **top 0.1% of the field (top 150 of a 150,000-entry Milly)**, indexed to 100 = average game; the #1 stack (Stafford + Nacua + Adams, Allgeier bring-back) was "first in all five runs and in 98% of the replays of the noise." https://twogungpt.com/articles/2026-10-17-week-6-stack-rankings/
  - *Showdown "Wildcat Sim"* (Oct 12, 2026): **10,000 game draws off the line and the props**; a **2,002-lineup field** from his ownership model; every lineup paid on the **real $333 Wildcat ladder ($600K, $150K to first)**. https://twogungpt.com/articles/2026-10-12-bills-rams-showdown-sim/
  - *The Gunsmith* (his advanced optimizer): lineups are graded on **2,500 simulated Sundays the build never saw**, and every grade carries a ± error bar. https://twogungpt.com/dfs-lineup-optimizer/advanced/
  - *Identity:* TwoGun = **Michael "TwoGun" Cohen**, who won the DraftKings Millionaire Maker in the NFL divisional playoffs and the $500K first prize in the Week 17 $2M Touchdown event (RotoGrinders profile: http://rotogrinders.com/profiles/twogun). The GPT persona is an AI front-end on his numbers; the site is free.
  - *Adjacent tool:* **GPP Lab** (https://thegpplab.com/) builds on TwoGun's projections: its Sim Lab plays user lineups against a modeled field; NFL Classic single-entry / 3-max / 20-max with fields up to 12,000 entries; its page notes TwoGun "updates Thursday and again Sunday morning" and that "his ownership misses most on the biggest chalk and on late news."

## 4.2 ADDENDUM PRIORITY 2 — The "katana repository": NOT FOUND as a DFS project
Searches executed 2026-11-07: web-index queries combining "katana" with DFS / daily fantasy / DraftKings / GitHub / lineup optimizer / Monte Carlo (multiple phrasings); GitHub's own repository search — "katana" in name/description + "fantasy" (no DFS hits), "katana" + topic:daily-fantasy (**0 results**), "katana" in README + "dfs" (38 results, all depth-first-search false positives — competitive-programming repos).
- The only prominent GitHub repository named **katana** is **projectdiscovery/katana** — https://github.com/projectdiscovery/katana — a next-generation **web crawling/spidering framework** written in Go (~17.8K stars). It has nothing to do with DFS; if "the katana repository" meant this, it does not simulate anything fantasy-related — it discovers URLs/endpoints on websites.
- All other "katana" repositories found belong to VFX (Foundry's Katana lighting software), the KDE desktop, Roblox games, and FFXIV gear simulators. **No DFS-sim repository named or codenamed "katana" is publicly indexed.** It may be private, renamed, or referenced under a different name; with the information in the mission it cannot be identified (see §7).
- The open-source DFS sim repositories actually found (in case one of these is the intended referent):
  - **chanzer0/NFL-DFS-Tools** — the deepest published open-source sim methodology (§4.3d). https://github.com/chanzer0/NFL-DFS-Tools/blob/HEAD/README.md
  - **espechtsoftware/nfl-predictions** — a possession-level simulator producing **30,000 correlated worlds**; builds 80 distinct lineups for ~160,000-entry contests; historical panel of 107 Sunday-main slates (2019, 2021–2025; 2020 excluded); frozen production policy id `classic-k1-role12-boom40-poscal-cbwu-v4`. https://github.com/espechtsoftware/nfl-predictions/blob/HEAD/reports/2026-08-15-external-reviewer-briefing.md
  - **DFSDFSDFS11/dfs-optimizer** — a CLI whose selectors literally implement the Target 2 literature: "Algorithm 7" (Haugh–Singal × Liu et al.) and "V24" (Hunter's U²ₗ + covariance constraint + variance floor), sharing a precomputed world simulation. https://github.com/dfsdfsdfs11/dfs-optimizer/blob/HEAD/CLAUDE.md
  - **nothans/dfs-optimizer** — MATLAB/intlinprog optimizer with a Monte Carlo mode that re-solves under sampled (lognormal-jittered) projections and reports how often each player is optimal. https://github.com/nothans/dfs-optimizer/blob/HEAD/README.md

## 4.3 ADDENDUM PRIORITY 3 — SaberSim / Stokastic / Splash methodology at the deepest published level

### (a) SaberSim — deepest vendor disclosure (support docs read in full)
- **How Projections Work** (updated 2026-08-15): https://support.sabersim.com/en/articles/12078831-how-projections-work
  - **Sampling unit = the play.** A proprietary **play-by-play simulator** builds each game "from scratch, one play at a time, thousands of times," modeling strategy, play-calling, coaching tendencies and decisions, clock effects, player skill sets, matchup dynamics, injuries, weather, and blowouts. Each sim is a complete game story.
  - **Distributions:** the published projection is the **mean across sims**; the product exposes percentiles (5th-percentile busts to 95th-percentile blow-ups; 10th/50th/90th for stat lines). No parametric distribution is assumed or disclosed — the distribution *is* the empirical sim output.
  - **Correlation mechanism: emergent, not imposed.** There is no copula or correlation matrix; correlation arises because players share simulated game scripts (a QB's explosion lifts his receivers in the same sim; a leading team's RB volume rises as pass volume falls). Lineup construction exploits this directly: **each lineup in a build is optimized to be the best lineup for one specific simulated game script.**
  - **Ownership model — the distinctive part:** ownership projections are **not** percentages fed into the sims. SaberSim runs a **field simulator** that generates actual opponent lineups; the published ownership % is a *descriptive statistic of those generated lineups*, and **the field lineups themselves power the Contest Sims**. Ownership is bucketed by contest type because single-entry and large-field MME fields behave differently. "Adjusted Ownership" compares projected ownership to simulated performance and feeds (the older) SaberScore as a negative variable.
  - Sims re-run whenever news breaks.
- **How Contest Sims Work** (updated 2025-10-10): https://support.sabersim.com/en/articles/12079199-how-contest-sims-work
  - Contest sims repeat **"tens of thousands of times"**: your lineups vs opponent field lineups, ranked and paid by the **exact payout structure**; outputs = win %, cash rate, and full ROI distribution.
  - Opponent fields: multiple field sets built using **industry-aggregated projections** "that reflect actual construction and ownership trends"; contests auto-configured across **13 contest types** (size, payout structure, entry limits). A low-stakes 150-max field is explicitly modeled differently from a high-stakes single-entry field.
  - **Flashback sims** re-simulate a completed slate using the **actual entered lineups**; the docs attribute pre-contest vs flashback ROI divergence to the field building differently than expected or late news.
  - Access: full Contest Sims require the **Ultimate** plan ($297/mo; Starter $97/mo builds up to 500 lineups, Ultimate up to 5,000 — per the Stokastic comparison below and Round-2 earlier pass).
- **Third-party framing** (Stokastic's comparison, vendor-authored): https://www.stokastic.com/articles/nfl-dfs/stokastic-sims-vs-sabersim-vs-rotogrinders-nfl-2026 — "RotoGrinders optimizes expert projections, SaberSim simulates the games, Stokastic simulates the contest."

### (b) Stokastic — contest-sim structure disclosed; distribution math NOT disclosed
Sources: https://www.stokastic.com/articles/nfl-dfs/stokastic-review (employee-authored review, read in full) and the comparison page above.
- **What a sim is:** the Sims "simulate the contest itself **tens of thousands of times**: every player's outcome varies sim to sim, correlations hold (a QB's big game drags his receivers up with him), and projected ownership determines how many entrants you are sharing each player with." Lineups are ranked by **simulated ROI against the real payout structure** of the contest the user specifies.
- **Sampling unit / distributions / correlation mechanism: NOT DISCLOSED.** Stokastic publishes no distribution family, no copula, no correlation parameters — only the qualitative claim that stacks and bring-backs emerge "naturally, because the sims reward correlation instead of needing a rule for it." This is the shallowest methodology disclosure of the three vendors despite the most detailed *workflow* disclosure.
- **Inputs:** median projection + projected ownership for every player; users can upload custom projection/ownership CSVs and the Sims re-run on their numbers.
- **Key parameter — "percent to first":** a $400,000 contest paying $100,000 to first = 25% to first; the dial changes how the Sims value ceiling vs flat payouts.
- **Scale/pricing (checked against live billing Sep 1, 2026):** Core ($149.95/mo) builds and simulates up to **2,000 lineups**; Max ($229.95/mo) **10,000 lineups on classic slates, 50,000 on showdown**; MVP $349.95/mo. Contest Sims run even on the free tier.
- **Documented pro process — Steve "dacoltz" Buzzard's $1,000,000 Milly Maker win (Conference Championship Sunday), from Stokastic's own write-up:** he set the **largest pool size his package allowed (10,000 lineups on Max)**, pushed **percent-to-first to 30%**, and **manually boosted Travis Kelce's simulated ROI**, raising Kelce's share of his pool (Kelce finished at 24.5% ownership and was his highest scorer). The winning lineup contained **no Christian McCaffrey**, who was in **over 60% of the field's lineups** — yet Buzzard kept McCaffrey heavily in the *rest* of his pool rather than banning him. Construction of the winner: **two tight ends and a 1-3 stack with a three-man bring-back** — "not a lineup an optimizer spits out."
- **Late-swap process — Justin Freeman (HeavyChevyJF):** triaged **150 Divisional Round Milly Maker lineups into three tiers between kickoffs** and late-swapped his way to a **$100K finish**; Stokastic's Late Swap tool re-ranks live lineups after early games lock and is built to execute exactly this triage.

### (c) Splash Play (Chris Spags) — sim counts, field sizes, percentile definitions
Sources (consistent methodology language across weekly articles, index-verified; Week 8 article: https://splashplaypodcast.com/dfs/nfl/2026-week-8/ ; Week 6: https://splashplaypodcast.com/dfs/nfl/2026-week-6/):
- **Projections ("SPAGS model"):** built from player workload, efficiency, and game environment.
- **Main slate: 10,000 simulations of the contest** against a **modeled DraftKings field**. Player output = "winning-lineup credit" (share of sims whose winning lineup contains the player; **tied winning entries share credit**). **Floor = 10th-percentile simulated score; ceiling = 95th percentile.**
- **Showdown: 100,000 simulations** of the contest. Lineup pools of **4,187** (MNF Wk7, https://splashplaypodcast.com/dfs/nfl/2026-week-7-monday-night-football-dal-phi/), **5,064** (MNF Wk6, https://splashplaypodcast.com/dfs/nfl/2026-week-6-monday-night-football-was-sf/), and **3,660** (SNF Wk8, https://splashplaypodcast.com/dfs/nfl/2026-week-8-sunday-night-football-phi-was/) lineups, scored against modeled fields of **237,812 entries** (both MNF slates) and **142,687 entries** (SNF); the best pool lineup won **178, 159, and 130 of 100,000 sims** respectively. Full pools are gated to Apex members.
- Note the asymmetry vs SaberSim/TwoGun: Splash runs **fewer sims on the main slate (10K) than on Showdowns (100K)**; TwoGun's main-slate 90K comes from recombining 10K per-game sims.

### (d) chanzer0/NFL-DFS-Tools — the deepest *open* simulation methodology published anywhere found
README read in full: https://github.com/chanzer0/NFL-DFS-Tools/blob/HEAD/README.md
- **Sampling unit/distributions:** player fantasy points, segmented by projected points into windows; per position × window, **empirically fitted distribution families: gamma, lognormal, Weibull, skew-normal, ex-Gaussian, generalized gamma, shifted gamma** (parameters in `distribution_data/fp_distributions_<site>.csv`). For complex families, samples are drawn from the fitted parameters and then **affine-transformed so samples match each player's projected mean and SD exactly**. A heavy-tail guardrail falls back to a calibrated gamma when a fitted family's tails are extreme relative to the player's mean/SD.
- **Correlation mechanism:** a **Gaussian copula with Iman–Conover rank reordering** (preserves the marginals while imposing the target correlation structure); correlation matrices are read **by position and projection window** from YAML (`fp_correlations_<site>.yaml`), with `.npz` fallback; per-player overrides via `custom_correlations` (worked example in the config: Joe Burrow — RB 0.69, WR −0.42). Default variances: QB 0.4, skill positions 0.5, defense 0.5.
- **Field model:** lineups generated from projections + ownership + stacking rules; defaults: **65% of the field uses stacks, 40% double stacks**; global team limit 4; minimum lineup salary 49,200. Each simulation ranks all lineups, allocates prizes from `contest_structure.csv`, and aggregates ROI, win rate, and Top-1% rate. CLI: `uv run src/main.py dk sim <field_size> <num_iterations>` (documented example: 10,000 iterations). Supports DraftKings/FanDuel, Classic and Showdown.

### (e) Other sim vendors surfaced (index-level; NOT READ in full)
- **DFS Only** (https://onlydfs.com/blog/monte-carlo-simulation-dfs.html): claims **100,000 correlated Monte Carlo sims per slate**; correlation "at two levels"; "sim win rate" = share of sims in which a player appears in the single best lineup; $39/mo. Vendor marketing.
- **Eat The Chalk** (https://eatthechalkdfs.com/): up to **100,000 sims per slate**; every lineup scored against **50,000 simulated contest fields**; ranks by top-5% finish rate, "benchmarked against real DraftKings contest results"; $59/mo All Pro.
- **SimSlate** (https://simslate.com/): fields of up to **100,000 ownership-drawn lineups × up to 100,000 correlated sims**; "right-skewed player models"; Pro $99/mo.
- **THE SOLVER** (https://thesolver.com/simulator): built with Establish The Run; **tens of thousands** of contest sims vs a realistic field; projected ROI, cash rate, finish distribution; sim up to 3,000 lineups at once; from $25.99/mo; used by Drew Dinkmeyer and Adam Levitan per the site.
- **FantasyLabs SimLabs** (https://www.fantasylabs.com/articles/nfl-dfs-product-update-introducing-the-simlabs-lineup-generator/): games simulated thousands of times; the generated lineup pool is "shaped and filtered to look like a real-life DFS contest field" across four common contest types; the contest is then re-simulated thousands of times.

## 4.4 Named pro process (non-vendor)
- **Russell Miller (single-entry Milly Maker winner)** — Fantasy Points podcast interview, transcript: https://podscripts.co/podcasts/fantasy-football-daily/an-interview-with-draftkings-millionaire-maker-russell-miller . Won with a **single bullet** ("primarily single bullet player"); the winning lineup built a game stack that faded the 1pm games — Purdy + Deebo Samuel, Rams bring-backs Puka Nacua and Kyren Williams, plus Zach Moss, Keenan Allen, Darren Waller, and Tony Pollard at FLEX stacked with the Cowboys DST. Process detail beyond the lineup itself is limited; he posts process "novels" in the (non-public) Fantasy Points Discord.
- **Josh Veurink (jrveurink, Milly Maker winner, Jan 2017)** — RotoGrinders interview: https://rotogrinders.com/articles/interview-rg-s-latest-millionaire-josh-veurink-1641549 . Process: drafts a first team Sunday night after SNF; first reads each week are JMToWin's NFL Edge and Chris Gimino's ownership analysis; one podcast per night Wed–Fri; lineups set Saturday, adjusted Sunday morning after two RotoGrinders morning shows; **tournament-only** player, casual volume, biggest prior win $500.
- **ghartman314 (Week 8 Milly Maker winner)** — via SonicLibrarian in One Week Season's *The Scroll*: https://oneweekseason.com/the-scroll/the-scroll-test-page/ . Entered **89 lineups** in the Milly — dictated by ~$890 left in his account after maxing the $3 20-max and the single-entries; uses an optimizer with "very strict" rules; spends heavy time on stack percentages and bring-backs; does not trust ownership projections until Friday; builds a preliminary pool during the week and assigns the pool around ownership percentages Saturday night; prioritizes matchup and **ceiling** over price.
- **SonicLibrarian (Milly Maker winner, MME player)** — One Week Season "Above The Field" / "Sonic's MME Pool": builds **~50 lineups by hand + ~100 by optimizer** for a 150-max contest; hand-builds go game-by-game (QB + 1–2 pass-catchers + usually one bring-back, plus secondary stacks from his core); frames the Milly as "a $3k contest that happens to utilize 150 lineups," not 150 × $20. **Player Pool Worksheet method:** start from DK's Edit Entries CSV, add one column per research source plus a "%" target-exposure column, colour core players red. Optimizer experiment: cut optimizer QBs from ~8 to **2** to go overweight his strongest plays. Case study of **rikkidee**: allocated 61.33% Baker Mayfield / 38.66% Ben Roethlisberger (all eggs in one game) in a Sunday Milly; the next day, in DraftKings' Monday Night Millionaire Maker, cashed **149 of 150** lineups including 4th, 37th, 67th.
- **Field-construction contrast** (One Week Season, Reflection Edition: http://oneweekseason.com/the-scroll/reflection-edition-11-21/): winner **eppy99** ran 150 lineups from a **115-player pool**, no duplicated lineups, none projected over **118% total ownership**; **sliderss** ran 150 from a **47-player pool**, with 28 lineups duplicated by the field, D'Ernest Johnson locked, 86% Mark Ingram, 52% Mike Evans — and still placed 7th/22nd/50th/93rd/108th.
- **Clarity DFS** (small vendor, public methodology): **10,000 simulated slates** per slate; ownership model **re-fit after each slate against real DK contest results**: https://claritydfs.com/

---

## Could not verify
- **Haugh–Singal Figure 2 panel assignment:** the E(P&L)/SD/P(loss) triples quoted in §2.2 are as extracted from the full text; the panel-by-panel mapping of the second triple set (123.9 / 1265.9 / 0.67) to a specific contest type rests on the paper's figure captions as read and is the least certain extraction in this report.
- **STAT-API pricing surface:** the DFS page (read in full) states Pro $99/mo and Starter $49/mo; an earlier view of the pricing page showed "from $49/mo" framing. Both are the vendor's own numbers; no contradiction once tiers are separated, but the $49 figure alone does not buy contest downloads.
- **FFNation completeness:** posts confirmed across 2017–2021, but a definitive week-by-week census (which weeks are missing) could not be extracted from the tag index.
- **Splash Play main-slate vs Showdown sim counts** come from the site's own article boilerplate (10,000 main slate; 100,000 Showdown) and are consistent across at least five articles; the underlying sampling distribution is not published.
- **TwoGunGPT's per-game sim inputs** beyond "the betting line" (which markets — spread/total/props — feed the box-score sim for Classic slates) are not itemized on the chalk article; the Showdown article specifies "the line and the props."
- **FantasyCruncher NFL contest-links for 2026-11-08:** HTTP 403 via the web index (2026-11-07); not retried.

## NOT FOUND lists (per target)

**Target 1**
- Any free/public Kaggle dataset of DraftKings NFL lineups, standings, or ownership (any era).
- Any GitHub repository containing bulk scraped DraftKings NFL standings/ownership CSVs (repositories found contain code and parsers, not bulk lineup data; the one bulk standings dataset found anywhere is the NBA Kaggle set in §1.3).
- Any public bulk download from RotoGrinders ResultsDB, FantasyLabs, or FantasyCruncher.
- Wayback Machine captures of DraftKings contest standings pages.
- Public replication datasets for Hunter–Vielma–Zaman or Haugh–Singal (Getty et al.'s data is request-only via FanDuel legal).

**Target 2**
- A thesis by Dubem Mbeledogu (only the SSAC paper exists publicly).
- Any DFS-specific follow-up paper by Zaman's group after the 2017 "Picking Winners" startup paper.
- The full table of contents of *Cracking the DFS Code* (no public Amazon/Google Books TOC retrievable), and any legitimate substantial preview of it.
- Newell thesis full text *as read by this mission* — the KREX record and abstract were read; the PDF text itself was not extracted (flagged NOT READ in §2.5, with the abstract and two independent secondary summaries supplied instead).

**Target 3**
- Any Sun-Mon Classic winning lineup, winner, recap, interview, podcast segment, Reddit/forum post, X post, YouTube/Twitch VOD, or screenshot — for any week, any season.
- The 2026 Sun-Mon Classic flagship GPP's name, entry fee, guarantee, and field size from any lobby-listing source.

**Target 4**
- **Any stated reason from TwoGunGPT for choosing 90,000 simulations** (the count's structure is documented; a rationale is not).
- **A DFS-simulation GitHub repository named or codenamed "katana"** (see §4.2 for the searches run and the unrelated projectdiscovery/katana).
- Stokastic's sampling distribution family and correlation mechanism (not published at any level found).
- Detailed public bankroll rules from named pros beyond Bales' book chapter structure (interviews disclose volume and construction, not bankroll percentages).

## Sources
All sources are cited inline with exact URLs at the item they support. Principal full texts read in full during this mission (2026-11-07): Hunter–Vielma–Zaman arXiv v3 PDF; Haugh–Singal Imperial repository PDF; Getty et al. open SIAM PDF; Mbeledogu SSAC PDF; Mahoney et al. via ar5iv; TwoGunGPT chalk-graded article; SaberSim "How Projections Work" and "How Contest Sims Work"; Stokastic NFL review; chanzer0/NFL-DFS-Tools README; STAT-API daily-fantasy page; Kaggle alandu20 and Longenbach dataset pages; Newell KREX record + abstract. Working notes: notes/addendum-sims.md, notes/addendum-papers.md.

---

# PART C — The library: manifest, equation-level dossiers, code notes

# MANIFEST — DFS Optimization Literature Library

Built 2026-11-07 (Lane C, DFS deep-dive round 2). Legal sources only: arXiv, author pages, university repositories, publisher open-access copies, conference CDN. Every PDF below was verified as a real PDF (`file` magic + `pdfinfo` page count) and text-extracted with `pdftotext -layout` into `text/`.

## Acquired — papers (5)

| File | Bytes | Pages | Source |
|---|---|---|---|
| `pdfs/hunter_vielma_zaman_arxiv1604.01455v3.pdf` | 2,739,122 | 39 | https://arxiv.org/pdf/1604.01455 — arXiv:1604.01455**v3** [stat.OT], 23 Jan 2019, "Article submitted to INFORMS Journal on Optimization." MD5 `9e247eefd7816279f4f2b37569701061`. |
| `pdfs/haugh_singal_2019_columbia.pdf` | 1,403,808 | 53 | Author's own page: http://www.columbia.edu/~mh2078/DFS_Revision_1_May2019.pdf — revision of May 23, 2019 (first version 17 Apr 2018; submitted to *Management Science*, ms. MS-SMS-18-00849). |
| `pdfs/getty_etal_2018_siam_review.pdf` | 3,298,088 | 20 | Final published version, CC-BY 4.0, via MIT DSpace (hdl.handle.net/1721.1/119466), fetched from the Semantic Scholar mirror of that open copy. *SIAM Review* 60(4):869–887 (2018), DOI 10.1137/16M1102094. |
| `pdfs/mbeledogu_2023_ssac.pdf` | 1,024,576 | 23 | MIT Sloan SSAC 2023 conference CDN (cdn.prod.website-files.com direct PDF link). Won 1st place, SSAC Research Papers Competition. |
| `pdfs/mahoney_2023_arxiv2309.15253.pdf` | 638,184 | 32 | https://arxiv.org/pdf/2309.15253 — arXiv:2309.15253v2 [cs.LG], 28 Sep 2023. Bonus acquisition (found during the Newell hunt; direct methodological descendant of Newell's protocol). |

## Text extractions (`text/`, `pdftotext -layout`)

- `hunter_vielma_zaman_arxiv1604.01455v3.txt` — 147,623 B
- `haugh_singal_2019_columbia.txt` — 255,570 B
- `getty_etal_2018_siam_review.txt` — 159,234 B
- `mbeledogu_2023_ssac.txt` — 59,281 B
- `mahoney_2023_arxiv2309.15253.txt` — 75,315 B

## Dossiers (`dossiers/`)

Full deep reads (formulations transcribed in the papers' own notation, solver details, experimental setups, exact headline numbers, authors' stated assumptions/failure modes, unproven steps):

- `hunter_vielma_zaman_2019.md` — 15,689 B
- `haugh_singal_2021.md` — 18,652 B
- `getty_etal_2018.md` — 9,117 B
- `mbeledogu_2023.md` — 12,774 B
- `mahoney_2023.md` — 7,665 B

Partial dossiers (abstract-level only, clearly marked — full text not acquired):

- `newell_2017_PARTIAL.md` — 2,578 B
- `bergner_2017_PARTIAL.md` — 1,331 B

## Acquired — code (`code/`, shallow clones)

| Directory | Repo | HEAD | Size |
|---|---|---|---|
| `code/pydfs-lineup-optimizer/` | https://github.com/DimaKudosh/pydfs-lineup-optimizer | `429db96` (2021-09-27) | 708K |
| `code/draftfast/` | https://github.com/BenBrostoff/draftfast | `0f5f1f2` (2024-01-29) | 3.6M |
| `code/RobustDFS/` | https://github.com/drmbeledogu/RobustDFS | `764ab9f` (2023-02-03) | 5.4M |

Analysis: `code/NOTES.md` (6,185 B) — solver/objective/constraint/stacking mechanics per repo.

## NOT acquired — with exact failure

1. **Newell (2017), K-State MS thesis**, "Optimizing daily fantasy sports contests through stochastic integer programming" (handle https://hdl.handle.net/2097/35393). Landing page and abstract verified; PDF download failed — handle fetch returned an empty body and the DSpace REST PID lookup returned no UUID to address the bitstream. Retry path in `dossiers/newell_2017_PARTIAL.md`.
2. **Newell & Easton (2017)**, IISE proceedings paper, "Optimizing Tiered Daily Fantasy Sports — Mathematically Modeling DraftKings NFL Millionaire Maker Tournament" — no open copy located.
3. **Easton & Newell (2019)**, "Are daily fantasy sports gambling?", *Journal of Sports Analytics* 5(1):35–43 — no open full text located in this pass.
4. **Bergner (2017), Bryant honors thesis**, "Daily Fantasy Sports: Chance or Skill?" (Digital Commons `honors_mathematics/28`). Landing page and abstract verified; PDF blocked by a Cloudflare bot wall ("Just a moment…") on both bepress viewcontent attempts.
5. **Haugh & Singal — Imperial College SPIRAL copy** (https://spiral.imperial.ac.uk/server/api/core/bitstreams/a1aef748-a483-485e-b81c-59f06cdfc50c/content): HTTP **503** HTML on two attempts (plain and browser user-agent). Superseded by the author's Columbia copy (acquired, same manuscript lineage). The published version (*Management Science* 67(1):72–92, 2021, DOI 10.1287/mnsc.2019.3528) and SSRN 3393127 full text are paywalled; SSRN version noted, not downloaded.
6. **Hunter, Vielma & Zaman — journal version**, *INFORMS Journal on Optimization* 1(4):348–370 (2019): paywalled. The acquired arXiv v3 is the same manuscript ("Article submitted to INFORMS Journal on Optimization").
7. **Selig (2018), University of Vienna master thesis**, "Daily Fantasy Sports: Ecology of a P2P Zero-Sum Game" (utheses item 47595) — secondary relevance (cites Newell; knapsack-ILP chapter). Download failed twice: `/api/document/get/file/47595` returned a JSON alert redirecting to the full-text API; `/apiFulltext/…` returned HTTP 400 with a Phaidra "Too Many Requests" backend error. A later retry may succeed.

## Excluded by policy

- docslib and similar gray aggregator mirrors were deliberately **not** used for any acquisition, even where they appeared to host copies (e.g., of the Newell thesis).

---

# PARTIAL Dossier — Bergner (2017), "Daily Fantasy Sports: Chance or Skill?"

> **STATUS: full text NOT acquired.** Landing page and abstract were verified on Bryant University's Digital Commons on 2026-11-07; the PDF itself sits behind a Cloudflare bot wall. This file documents the gap only. See `../MANIFEST.md`.

**Bibliographic:** Danielle Bergner, honors thesis (mathematics), Bryant University, 2017. Bryant Digital Commons item `honors_mathematics/28`.

## Relevance assessment

This is a **skill-vs-chance** study, not an optimization paper — it belongs to the Getty et al. (2018, acquired) branch of the library rather than the Hunter/Haugh–Singal/Mbeledogu optimization line. It was on the acquisition list as the round-1 Bryant honors thesis; its marginal value over Getty et al. is as an undergraduate-level replication/extension on a different dataset, not as a formulation source.

## Acquisition attempts (2026-11-07)

1. Digital Commons landing page → reachable; title/author/abstract verified.
2. PDF (bepress `viewcontent.cgi`, article=1027) → blocked twice by a Cloudflare "Just a moment…" bot check on both direct fetch routes.
3. **Retry path:** fetch through a live browser session that can pass the Cloudflare check, or via the Internet Archive's copy of the Digital Commons item if one exists.

---

# Dossier — Getty, Li, Yano, Gao & Hosoi, "Luck and the Law: Quantifying Chance in Fantasy Sports and Other Contests"

**Copy in library:** `pdfs/getty_etal_2018_siam_review.pdf` (3,298,088 bytes, 20 pp.)
**Bibliographic:** *SIAM Review* 60(4):869–887 (2018), DOI 10.1137/16M1102094. Published under CC-BY 4.0; the library copy is the final published version via MIT DSpace (hdl.handle.net/1721.1/119466). Authors: Daniel Getty, Hao Li, Masayoshi Yano, Charles Gao, A. E. Hosoi (MIT). **Disclosure in paper:** funded in part by FanDuel, which had no editorial control; data supplied by FanDuel.

**Scope note:** this is not an optimization paper — it is the standard statistical answer to "is DFS skill or chance," and its $R^*$ persistence metric is the foundation later skill/chance work (and Easton & Newell's 2019 survey) cites. It contains no lineup-construction formulation.

All equation numbers are the paper's own.

---

## 1. Data (§2, Tables 1–2, pp. 871–872)

FanDuel supplied 12 anonymized datasets: H2H results, 50/50 results, and athlete performance data (name, date, team, salary, position, FanDuel points), for **two full seasons (2013/14 and 2014/15)** across MLB, NBA, NFL, NHL. All contests are 9-athlete rosters.

| | MLB | NBA | NFL | NHL |
|---|---|---|---|---|
| Players, H2H | 89,338 | 107,796 | 190,562 | 20,802 |
| Players, 50/50 | 130,515 | 158,532 | 312,263 | 30,607 |
| Max games/player | 686 | 383 | 155 | 271 |
| Max entries/player | 60,200 | 64,287 | 49,657 | 21,209 |
| Salary cap | 35,000 | 60,000 | 60,000 | 55,000 |
| Athletes in dataset | 1,261 | 501 | 584 | 891 |

Roster rules (Table 1): e.g., NFL = QB, RB, RB, WR, WR, WR, TE, K, D. H2H and 50/50 showed "no significant differences"; results use the combined data.

## 2. Test 1 — expected payoff (§2.1)

Player $i$'s win fraction over their $n_i$ games:
$$w_i=\frac{1}{n_i}\sum_{j=1}^{n_i}x_{ij}, \tag{1}$$
$x_{ij}\in[0,1]$ = fraction of player $i$'s entries winning game $j$. Population split into 5 groups by entries played (logarithmic bins: group 1 = 90% of players, group 2 = 90–99%, group 3 = 99–99.9%, …).

**Survivorship correction (quitting boundary layer).** Players quit after losing streaks; the boundary layer is measured at $n_{BL}\approx5$ games **in all four sports**, and the unbiased win fraction removes each player's last five games:
$$w_{i,\mathrm{unbiased}}=\frac{1}{n_i-n_{BL}}\sum_{j=1}^{n_i-n_{BL}}x_{ij}. \tag{2}$$

**Result:** lowest-volume group mean unbiased win fraction **0.48** vs highest-volume group **0.61** (averaged over the four sports) — inconsistent with pure chance.

## 3. Test 2 — effect of player action vs random lineups (§2.2)

Enumerating all legal lineups was "computationally intractable," so the null distribution is Monte Carlo: 100 accepted random lineups per competition day (51 NFL to 182 MLB days/year), athletes drawn from normal salary distributions (equal: centered at cap/9 per slot; position-weighted: means proportional to average positional salary), accepted iff total salary ≤ cap **and ≥ 85% of cap** (the 85% floor "roughly maximizes the mean score of the random lineups").

**Table 3 — probability a real user's lineup beats a Monte Carlo lineup:**

| | MLB | NBA | NFL | NHL |
|---|---|---|---|---|
| User win prob. (weighted) | 0.732 | 0.946 | 0.864 | 0.680 |
| 95% CI (weighted) | ±0.007 | ±0.004 | ±0.016 | ±0.007 |
| User win prob. (equal) | 0.781 | 0.898 | 0.809 | 0.618 |
| 95% CI (equal) | ±0.006 | ±0.005 | ±0.019 | ±0.007 |

## 4. Test 3 — persistence and the $R^*$ metric (§2.3, pp. 875–880)

Hypothesis: skill is intrinsic and stable over a season, so first-half win fraction $P_i$ should correlate with second-half win fraction $Q_i$ along the slope-1 diagonal. Pearson correlation and linear regression are both rejected as metrics (regression fails at the pure-luck collapse point; correlation cannot distinguish slopes). Instead rotate coordinates by $\pi/4$:
$$S_i=\frac{1}{\sqrt{2}}(P_i+Q_i-1), \tag{3}\qquad T_i=\frac{1}{\sqrt{2}}(Q_i-P_i). \tag{4}$$
Weighted variances over the $m$ players:
$$A\equiv\sigma_S^2=\frac{1}{m}\sum_{i=1}^{m}(S_i-E[S])^2\,\theta_{S_i},\qquad B\equiv\sigma_T^2=\frac{1}{m}\sum_{i=1}^{m}(T_i-E[T])^2\,\theta_{T_i}, \tag{5–6}$$
and the skill/chance metric:
$$\boxed{R^*=1-\frac{B}{A}} \tag{7}$$
with $E[R^*]=0$ for a purely random game and $E[R^*]=1$ for a purely skill-based game. Sample halves:
$$\hat p_i=\frac{1}{n_i/2}\sum_{j=1}^{n_i/2}x_{ij},\qquad \hat q_i=\frac{1}{n_i/2}\sum_{j=n_i/2+1}^{n_i}x_{ij}, \tag{8}$$
restricted to players satisfying the normal-approximation condition $n_iw_i/2>5$ and $n_i(1-w_i)/2>5$ (9), with $\sigma_i^2=\frac{2w_i(1-w_i)}{n_i}$ (10) and weights $\theta_{S_i}=\theta_{T_i}=1/\sigma_i^2$, giving $\hat A=\frac1m\sum_i \hat S_i^2/\sigma_i^2$, $\hat B=\frac1m\sum_i \hat T_i^2/\sigma_i^2$ (11) and $\hat R^*=1-\hat B/\hat A$.

**Closed-form expectation.** Under $P_i,Q_i\sim N(w_i,\sigma_i^2)$, $A$ and $B$ are noncentral chi-squared ($m$ d.o.f.; noncentrality $\lambda_S=\sum_i(\mu_{S_i}/\sigma_i)^2$, $\lambda_T=0$), yielding
$$E[A]=\tfrac1m(m+\lambda_S)=1+\frac1m\sum_{i=1}^{m}\frac{(2w_i-1)^2n_i}{2w_i(1-w_i)},\qquad E[B]=1, \tag{14–15}$$
$$E[R^*]=1-\left(1+\frac{1}{m}\sum_{i=1}^{m}\frac{(2w_i-1)^2n_i}{4w_i(1-w_i)}\right)^{-1}, \tag{16}$$
with the propagated variance $\sigma_R^2$ in eq. (17). Validated against 100 Monte Carlo seasons per sport: analytic and MC estimates agree with the FanDuel data for players with ≳100 games; **both overpredict $R^*$ for small $n_i$** (authors: the normal approximation breaks down there).

**Bayesian cross-check (§3).** $P(\mathrm{Skill}\mid w_i)=\frac{P(w_i\mid\mathrm{Skill})P(\mathrm{Skill})}{P(w_i)}$ (18), with $P(w_i\mid\mathrm{Luck})$ = binomial($\varphi=\tfrac12$) and $P(w_i\mid\mathrm{Skill})=1/N_i$ (uniform, from a perfect-ranking argument); uniform prior 1/2; iterative updating over randomly drawn players (200 samples × 50 repeats × 50). $P(\mathrm{Skill})\to1$ once minimum games per player exceeds a transition count $N_{TG}$. From the $R^*=\tfrac12$ crossover in Figure 4: $N_{TG,MLB}\approx20$, $N_{TG,NBA}\approx5$, $N_{TG,NFL}\approx25$, $N_{TG,NHL}\approx40$; the Bayesian method gives $N_{TG,NBA}\approx1$ and overestimates NFL by ≈10 games relative to $R^*$ (authors' comparison; the two methods otherwise agree). For every sport and population, $P(\mathrm{Skill})>1/2$.

**Spectrum placement (§4, Figure 6).** Characteristic games-per-player (log-weighted average $\bar n=\sum_j j\log m_j/\sum_j\log m_j$): $\bar n_{MLB}=110$, $\bar n_{NBA}=82$, $\bar n_{NFL}=34$, $\bar n_{NHL}=60$. Ordering on the $R^*$ axis: coin flipping ≈ 0; mutual funds between ≈0 and ≈0.5 (44,938 funds, 307,471 fund-years, WRDS 2005–2015); fantasy and real sports cluster mid-to-high, **NBA most skill-based, NHL closest to chance**; real and fantasy versions of each sport sit close together **except professional NFL, which scores as strongly skill-determined** — "somewhat surprising… We currently have no explanation for this and we leave it as a puzzle for future investigation."

## 5. Authors' stated assumptions and limitations

1. **Skill is assumed time-invariant within a season** — the entire persistence test rests on it ("skill is an intrinsic quality of a fantasy player and does not change significantly over the course of the season").
2. **Normal approximation to binomial win fractions** (eqs. 9–10) — acknowledged to fail for low-volume players, where both estimators overpredict $R^*$.
3. **$E[R^*]\approx1-E[B]/E[A]$ is an approximation** ("we may also estimate… by approximating"), not an identity.
4. **The random-lineup null is a modeling choice:** Monte Carlo lineups are not the true "all possible lineups" distribution (intractable), and the 85%-of-cap acceptance floor was tuned to *maximize* the null's mean score — a deliberate conservative choice, but a choice.
5. **Entries within a game are not independent** ("players may submit multiple copies of the same entry") — handled by scoring per-player win fractions rather than per-entry, but the dependence is not modeled further.
6. **Survivorship bias is corrected only at the measured 5-game boundary layer**; the correction "increases the average win fraction significantly in the first group."
7. **Game-design corollary the authors state explicitly (§4.1):** more accurate salary pricing pushes DFS *toward luck* — under perfect pricing "there is no strategy in assembling a lineup… and the outcome of the fantasy game is determined purely by luck"; skill exists in DFS precisely because pricing is imperfect.
8. Levitt et al.'s question 2 (predetermined characteristics) is **not addressed** — the FanDuel data is anonymized.

## 6. What is left unproven / open (authors' own framing)

- The professional-NFL $R^*$ anomaly (§4) is explicitly left unexplained.
- $R^*$ is a population statistic: it quantifies the role of skill in a *competition format*, not any individual player's edge, and the paper offers no route from $R^*$ to a profitable strategy.

---

# Dossier — Haugh & Singal, "How to Play Fantasy Sports Strategically (and Win)"

**Copy in library:** `pdfs/haugh_singal_2019_columbia.pdf` (1,403,808 bytes, 53 pp.)
**Version read:** authors' revision of May 23, 2019 (first version 17 April 2018), hosted on Haugh's Columbia page. This is the same manuscript (Imperial College SPIRAL record, manuscript no. MS-SMS-18-00849, Oct 16, 2019 version) later published as *Management Science* 67(1):72–92 (2021), DOI 10.1287/mnsc.2019.3528; SSRN abstract no. 3393127. Journal PDF paywalled (see MANIFEST). Authors: Martin B. Haugh (Imperial College Business School), Raghav Singal (Columbia IEOR).

All equation/algorithm numbers are the paper's own.

---

## 1. Primitives and feasibility (§2, p. 4)

$P$ athletes with random performance vector $\delta\in\mathbb{R}^P$, mean $\mu_\delta$, covariance $\Sigma_\delta$. Our entry is $w\in\{0,1\}^P$; athlete $p$ costs $c_p$; roster size $C$ (typical NFL contest: $C=9$, $P\approx100$–$300$); budget $B$:

$$\sum_{p=1}^{P}w_p=C,\qquad \sum_{p=1}^{P}c_pw_p\le B,\qquad w_p\in\{0,1\}.$$

Positional/diversity constraints are "generally linear"; $\mathcal{W}$ = set of all feasible binary $w$. $O$ opponents submit $w_o\in\mathcal{W}$, $o=1,\dots,O$, collected in $\mathcal{W}^{op}$. Realized scores: ours $F:=w^{\top}\delta$, opponents' $G_o:=w_o^{\top}\delta$; $G^{(r)}$ denotes the $r$-th order statistic of $\{G_o\}$. Entry caps: $N\le E_{max}$, with observed $E_{max}$ from 1 to 150. House cut ≈ 15% of entry fees, handled by reducing the paying rank $r$ — "the average DFS player loses approximately 15% of her initial entry… DFS investments are on average NPV-negative."

## 2. The two objectives (§2.1–2.2, pp. 4–5)

**Double-up / quintuple-up** (top $r$ entries each paid $R$; $r=(O+N)/2,\ R=2$ for double-up; $r=(O+N)/5,\ R=5$ for quintuple-up, per \$1 entry). Single entry, $r':=O+1-r$:

$$\max_{w\in\mathcal{W}}\; P\left\{w^{\top}\delta \;>\; G^{(r')}\!\left(\mathcal{W}^{op},\delta\right)\right\}. \tag{1}$$

**Top-heavy** (prize tiers $R_1>\cdots>R_D>R_{D+1}:=0$ at ranks $0=:r_0<r_1<\cdots<r_D$; our $N$ entries $\mathcal{W}=\{w_i\}_{i=1}^N$, scores $F_i:=w_i^{\top}\delta$; $r_d':=O+N-r_d$; $G_{-i}^{(r)}$ = $r$-th order statistic of opponents' scores *plus our other entries* $\{F_j\}_{j\neq i}$; $\mathcal{W}_{-i}:=\mathcal{W}\setminus w_i$):

$$\max_{\mathcal{W}\in\mathcal{W}^{N}}\;\sum_{i=1}^{N}\sum_{d=1}^{D}\left(R_d-R_{d+1}\right)\,P\left\{w_i^{\top}\delta \;>\; G_{-i}^{(r_d')}\!\left(\mathcal{W}_{-i},\mathcal{W}^{op},\delta\right)\right\}. \tag{2}$$

(Footnote 4, p. 5: the tie term $P\{w_i^{\top}\delta=G_{-i}^{(r_d')}\}$ with a shared reward is omitted from (2) as "generally negligible (except when replication is used)" but is "account[ed] correctly for… in all of our numerical results." The double-up (1) is a special case of (2).)

## 3. Modeling the opponents (§3, pp. 5–9) — the paper's central contribution

By Sklar's theorem, an opponent's portfolio distribution factors into positional marginals and a copula:
$$F_{w_o}\!\left(w_o^{QB},\dots,w_o^{D}\right)=C\!\left(F_{QB}(w_o^{QB}),\dots,F_D(w_o^{D})\right). \tag{3}$$

**Dirichlet–multinomial marginals (§3.1).** For each position (QB shown): the field's selection-probability vector is itself random, $p^{QB}\sim\mathrm{Dir}(\alpha^{QB})$; an opponent then draws $\mathrm{Multinomial}(1,p^{QB})$ (Multinomial(3, $p^{WR}$) without replacement for WR, etc.).

**Dirichlet regression (§3.1.2).** The Dirichlet parameters are log-linear in observable features:
$$\alpha^{QB}=\exp\!\left(X^{QB}\beta^{QB}\right), \tag{4}$$
e.g., for week $t$ (features: FantasyPros ownership estimate $f^{QB,t}$, scaled costs $c^{QB,t}$, scaled expected points $\mu^{QB,t}$):
$$\alpha^{QB,t}=\exp\!\left(\beta^{0}_{QB}\mathbf{1}+\beta^{1}_{QB}f^{QB,t}+\beta^{2}_{QB}c^{QB,t}+\beta^{3}_{QB}\mu^{QB,t}\right). \tag{5}$$
Estimation is Bayesian with a flat prior; the posterior (eq. 6) is proportional to a product of Dirichlet densities over weeks $t=1,\dots,T-1$ and is fit with **STAN**. Historical inputs are the realized post-contest ownership proportions (which, $O$ large, amount to observing $p^{QB},\dots,p^D$ after each contest).

**Copula (§3.2).** Only three candidates are considered, because full-lineup data to estimate $C$ is "hard to come by": (i) independence copula $C_{ind}(u_1,\dots,u_m)=\prod_i u_i$ ("the copula of a non-strategic contestant"); (ii) a stacking copula $C_{stack}$ defined procedurally — draw the QB, then force WR1 = the main WR (highest expected points) of that QB's team, remaining WRs from the multinomial; (iii) the mixture $C:=(1-q)C_{ind}+qC_{stack}$, with $q$ = "the probability that a random contestant will be a 'stacker'," estimated from a small hand-collected sample of teams; $q$ is typically higher for top-heavy contests.

**Opponent simulation — Algorithm 1 (§3.3).** Draw $p^{(\cdot)}\sim\mathrm{Dir}(\alpha^{(\cdot)})$ per position; per opponent draw $\mathrm{Stack}\sim\mathrm{Bernoulli}(q)$; draw positional selections from the multinomials (WR1 swapped to the QB's main WR if Stack = 1); accept–reject until the candidate $w_o$ is feasible, $w_o\in\mathcal{W}$, **and** spends enough: $c^{\top}w_o\ge B_{lb}$ for a chosen lower bound $B_{lb}\le B$ ("very unlikely in practice that a fantasy player… would leave much of her budget unspent").

## 4. Solution method — mean-variance vs stochastic benchmarks (§4, pp. 9–13)

Generic problem (Morton et al.): maximize the probability of beating a random benchmark,
$$\max_{w\in\mathcal{W}}\;P(R_w-R_b\ge0), \tag{7}$$
which under $R_w-R_b\sim N(\mu_w,\sigma_w^2)$ becomes
$$\max_{w\in\mathcal{W}}\;1-\Phi\!\left(-\mu_w/\sigma_w\right). \tag{8}$$

**Proposition 4.1** (adapted from Morton et al.). (i) If $\mu_w<0$ for all $w\in\mathcal{W}$, the optimizer of (8) lies in
$$\left\{w(\lambda):\;w(\lambda)\in\arg\max_{w\in\mathcal{W}}\left(\mu_w+\lambda\sigma_w^2\right),\ \lambda\ge0\right\}; \tag{9}$$
(ii) if $\mu_w\ge0$ for some $w$, it lies in
$$\left\{w(\lambda):\;w(\lambda)\in\arg\max_{\substack{w\in\mathcal{W}\\ \mu_w\ge0}}\left(\mu_w-\lambda\sigma_w^2\right),\ \lambda\ge0\right\}, \tag{10}$$
i.e., $w^*$ is mean-variance efficient. Case is determined by an LP maximizing $\mu_w$ over $\mathcal{W}$; then a grid $\Lambda$ of $\lambda$ values is swept and the best $\lambda$ chosen by the true objective, evaluated on Monte Carlo samples.

**Double-up (Algorithm 2).** With $Y_w:=w^{\top}\delta-G^{(r')}$:
$$\mu_{Y_w}:=w^{\top}\mu_\delta-\mu_{G^{(r')}},\qquad \sigma_{Y_w}^2:=w^{\top}\Sigma_\delta w+\sigma_{G^{(r')}}^2-2w^{\top}\sigma_{\delta,G^{(r')}}, \tag{11}$$
where $\sigma_{\delta,G^{(r')}}$ is the vector of $\mathrm{Cov}(\delta_p,G^{(r')})$. Solve the case-(i)/(ii) BQP family $\{w_\lambda\}$ over $\lambda\in\Lambda$, then $\lambda^*=\arg\max_{\lambda}P\{Y_{w_\lambda}>0\}$ from Monte Carlo. **Remark 4.1:** if $\lambda^*\approx0$ the procedure reduces to maximizing $w^{\top}\mu_\delta$, "suggesting there is little value to be gained from modeling opponents." Skew caveat (§4.2): the contest cutoff is a median, the algorithm branches on the mean — Algorithm 3 removes the if/else and searches both $w_\lambda^{-}$ and $w_\lambda^{+}$ families. The sub-problems are **binary quadratic programs**, solved with **Gurobi**'s default BQP solver (§4.2.2); a BQP can be linearized at the cost of $O(P^2)$ extra binaries/constraints. Benchmark moments $\mu_{G^{(r')}}$, $\sigma^2_{G^{(r')}}$, $\sigma_{\delta,G^{(r')}}$ are precomputed by Monte Carlo using order-statistics results (Appendix A).

**Multiple entries, double-up (§4.3).** Replication (submit $N$ copies of the $N{=}1$ optimum) is argued near-optimal as $O\to\infty$, with a Monte Carlo test: replication is optimal iff $R(N\times w^*)\approx N\,R(w^*)$ — "this is what we observed" in their experiments.

## 5. Top-heavy solution (§5, pp. 13–20)

Single entry ($N=1$), (2) reduces to
$$\max_{w\in\mathcal{W}}\;\sum_{d=1}^{D}\left(R_d-R_{d+1}\right)P\left\{w^{\top}\delta>G^{(r_d')}\!\left(\mathcal{W}^{op},\delta\right)\right\}, \tag{12}$$
with $Y_{w,d}:=w^{\top}\delta-G^{(r_d')}$ and
$$\mu_{Y_{w,d}}:=w^{\top}\mu_\delta-\mu_{G^{(r_d')}},\qquad \sigma_{Y_{w,d}}^2:=w^{\top}\Sigma_\delta w+\sigma_{G^{(r_d')}}^2-2w^{\top}\sigma_{\delta,G^{(r_d')}}. \tag{13–14}$$
Normal approximation of (12):
$$\max_{w\in\mathcal{W}}\;\sum_{d=1}^{D}\left(R_d-R_{d+1}\right)\left(1-\Phi\!\left(-\mu_{Y_{w,d}}/\sigma_{Y_{w,d}}\right)\right). \tag{15}$$

**Assumption 5.1.** $\mu_{Y_{w,d}}<0$ for all $d$ and all $w\in\mathcal{W}$ — our entry is "out-of-the-money": in expectation it does not reach even the minimum payout tier. Authors: reasonable because payouts typically reach only ~the top 20%, and models tend to over-estimate the performance of an optimized quantity.
**Assumption 5.2.** $\mathrm{Cov}\!\left(\delta_p,G^{(r_d')}\right)=\mathrm{Cov}\!\left(\delta_p,G^{(r_{d'}')}\right)$ for all tiers $d,d'$ and athletes $p$.
**Proposition 5.1.** If the $w_o$ are IID given $p$ and $D$ is finite, then (16) — Assumption 5.2's equality — holds in the limit as $O\to\infty$.

Under 5.1–5.2 the $w$-dependent part of $\sigma_{Y_{w,d}}^2$ no longer depends on $d$, so Proposition 4.1(i) applies: **Algorithm 4** sweeps $\lambda\in\Lambda$ over the BQP family
$$w_\lambda=\arg\max_{w\in\mathcal{W}}\left\{w^{\top}\mu_\delta+\lambda\left(w^{\top}\Sigma_\delta w-2w^{\top}\sigma_{\delta,G^{(r')}}\right)\right\},$$
then picks $\lambda^*=\arg\max_{\lambda}\sum_{d=1}^D(R_d-R_{d+1})\,P\{w_\lambda^{\top}\delta>G^{(r_d')}(\mathcal{W}^{op},\delta)\}$ by Monte Carlo.

**Parimutuel aside (§5.1)** — the theoretical basis for diversification. $H$ horses, win probs $q_h$, opponent wagers $O_h$ known, our $N$ unit wagers $n_h$, $\sum_h n_h=N$. Winner-takes-all share: if $h$ wins we get $(O+N)n_h/(O_h+n_h)$. Marginal expected gain of the $(k{+}1)$-th wager on $h$:
$$\mu_h^{k+1}=\frac{(k+1)q_h(O+N)}{O_h+k+1}-\frac{kq_h(O+N)}{O_h+k}=\frac{q_h(O+N)}{O_h+k}\cdot\frac{O_h}{O_h+k+1}, \tag{17}$$
strictly decreasing in $k$ (the "saturation effect"), generating a partial order over all $\mu_h^k$. **Algorithm 5** greedily assigns each wager to the currently highest-$\mu_h^k$ horse; **Proposition 5.2:** Algorithm 5 returns an *optimal* wager portfolio for the parimutuel WTA contest. For $N=2$ the optimum is replication $(2,0,\dots,0)$ iff $\mu_1^1>\frac{O+2}{O_1}\mu_2^1$ (eq. 18), else diversification $(1,1,0,\dots,0)$. The authors note two breaks in the analogy for DFS: DFS has no "reward independence" (an unpicked winning lineup still pays the top submitted lineup, unlike an unbacked winning horse), and $O_h\approx0$ for nearly all feasible lineups (≈$2\times10^{13}$ feasible entries in their typical contest, ≈$7\times10^{10}$ using ≥99% of budget), which "strongly encourages diversification."

**DFS multi-entry — Algorithm 6 (§5.2), "Top-Heavy Optimization for $N$ Entries (with Backtracking)."** Greedy with backtracking over the Algorithm-4 family: maintain $\mathcal{W}^*$; at each step $i$, compute $w_\lambda$ for all $\lambda\in\Lambda$, choose $\lambda^*=\arg\max_{\lambda}R(\mathcal{W}^*\cup w_\lambda)$ (biggest expected-reward value-add), then set $w_i^*=\arg\max_{w\in\{w_1^*,\dots,w_{i-1}^*,w_{\lambda^*}\}}R(\mathcal{W}^*\cup w)$ — i.e., re-adding a previous entry (replication) competes against the new candidate — and $\mathcal{W}^*\leftarrow\mathcal{W}^*\cup\{w_i^*\}$. (Section 6 implements the strategic model as "Algorithm 7 with $\gamma=6$": Algorithm 6 augmented with an explicit diversification/overlap parameter $\gamma$ capping athletes shared with previous entries.)

**Benchmarks (§6.1).** Benchmark 1 (double-up): $\max_{w\in\mathcal{W}}w^{\top}\mu_\delta$ (20). Benchmark 2 (top-heavy/quintuple-up): the same objective over $\mathcal{W}_{QB\text{-}WR}$ (21) — feasibility plus a forced QB + his main WR stack. Multi-entry benchmarks use greedy diversification with the shared-athlete cap $\gamma$.

## 6. Experimental setup (§6, p. 21)

- **Live play, not backtest:** the authors entered real FanDuel contests in all **17 weeks of the 2017 NFL regular season**, three contests per week.
- **Fields/fees:** top-heavy \$1/entry, $O\approx200{,}000$ opponents, $N=50$ entries/week; quintuple-up \$2, $O\approx10{,}000$, $N=25$; double-up \$2, $O\approx30{,}000$, $N=10$ (field sizes ±10% week to week). Top-heavy prizes ≈ \$5,000 (1st), \$2,500 (2nd), ≈\$100 (30th), lowest paying rank ≈50,000 at \$2.
- **Contest format modeled:** FanDuel 9-man (1 QB, 2 RB, 3 WR, 1 TE, 1 K, 1 D).
- **Inputs:** off-the-shelf $\mu_\delta$, $\Sigma_\delta$ obtained **a day before** the games (authors flag this as a handicap — §8); Dirichlet regression fit in STAN; BQPs in Gurobi.

## 7. Headline quantitative results

- **Top-heavy (§6.2, Table 1/Figure 2):** strategic portfolio cumulative realized profit **\$280.74** over 17 weeks — "over 3 times the realized P&L of the benchmark portfolio"; maximum cumulative drawdown (max shortfall) **\$18.50**; total capital ever required **\$75.76** (\$50 initial + \$18.50 + \$7.26), i.e., "a return of over 350% in just 17 weeks." Benchmark: <50% return once its extra required capital is counted. A no-skill portfolio would have lost ≈ $17\times15\%\times \$50=\$127.50$ to the rake.
- **Quintuple-up:** strategic led through week 6, then the benchmark overtook it; final cumulative gap $20-(-40)=\$60$ — within one week's swing (authors' own caution).
- **$\lambda^*$ diagnostic (§6.2/Appendix D):** $\lambda^*$ is near zero for double-up/quintuple-up and materially positive for top-heavy — "the value of modeling opponents is much greater for top-heavy contests."
- **Where the model beat itself (§7, conclusion numbers):** expected-vs-realized analysis — the calibrated model's *expected* profits exceed realized profits systematically; the paper's §7.1 model-based estimate of the value of opponent modeling is ≈**20%** (top-heavy), **1%** (quintuple-up), **2%** (double-up) of expected P&L.
- **Ownership-model failures (§6.3):** documented misses, e.g., a player picked by ≈**80%** of double-up opponents whose model's 95% interval predicted **0–10%** ownership; week-7 Fournette/Ivory: projections 17.27 vs 6.78 points, prices 9000 vs 5900, ≈**60%** of double-up opponents took Ivory — the authors did not update and lost the edge; week-16 Byrd (4900, 9.6 pts) vs Funchess (7000, 2.6 pts): **52 of their entries** held Funchess.
- **Value of insider trading (§7.2):** quantified within the same framework (knowing $\delta$ or $p$ realizations in advance) — model-based estimates in §7.2.
- **Value of collusion (§7.3):** stylized upper bound — a 50-player colluding syndicate at $E_{max}=1$ in the week-10 top-heavy calibration: expected profit **578.6 (s.d. 2,953.8)** vs non-colluding **123.9 (s.d. 1,265.9)** — "almost 5 times"; probability of loss 0.58 vs 0.67. Formal experiment ($E_{max}=50$, $N_{collude}=1$–$5$, Monte Carlo over the calibrated model, realized outcomes excluded): 5 colluders raise expected season P&L by **44%**, average weekly Sortino ratio by **63%**, and cut average weekly loss probability by **8%**. No collusion benefit in double-up/quintuple-up (replication ≈ optimal there).
- **Feasible-space scale (§5.2, footnote 17):** ≈$2\times10^{13}$ feasible entries in a typical 12-game contest; ≈$7\times10^{10}$ using ≥99% of budget; "the vast majority of DFS contestants… use > 98% of their budget."

## 8. Authors' stated assumptions, failure modes, and unproven steps

1. **Normality.** Proposition 4.1 and eq. (15) are exact only if $Y_w$ (resp. $Y_{w,d}$) is normal. Authors: the algorithm "should yield a good approximate solution even when the $Y_w$'s are not normally distributed," supported only by unreported experiments (footnote 14: $Y_w$ "unimodal and very well approximated by a normal distribution" on a test set when $\delta$ is normal). Skew breaks the mean/median branch logic of Algorithm 2 (§4.2 discussion; Algorithm 3 is the patch).
2. **Assumptions 5.1/5.2 are load-bearing for top-heavy.** 5.1 fails if payouts extend well past the top ~20%; 5.2 is proven only as $O\to\infty$ (Prop. 5.1) while the authors concede that at $O\approx200{,}000$ "we do not expect to see the top $D$ teams being identical in practice" — the empirical support is that the covariance terms were "very close to each other" in their experiments.
3. **Optimizer's curse, self-diagnosed.** §5 (on Assumption 5.1): "the well-known general tendency of models to over-estimate the performance of an optimally chosen quantity"; §7's expected P&L figures are computed under the calibrated model itself (footnote 36 concedes both collusion arms "benefitted… from the fact that the assumed model was indeed the correct model").
4. **Known-ownership is worse than modeled-ownership.** Footnote 7 (§3.1): "In initial unreported experiments, we assumed $p^{QB}$ was fixed and known but this led to over-certainty and poor performance of the resulting portfolios." The Dirichlet layer exists because of that failure.
5. **Copula is essentially unestimated.** Only independence/stacking/mixture with a single scalar $q$ from a small manual sample; §8: "It is not clear… whether we could ever obtain a rich enough data-set to estimate other copulas sufficiently accurately."
6. **Replication optimality for double-ups is conjectured, not proven, at finite $O$:** "we suspect the replication strategy will still be close to optimal"; the supporting conditions "are not easily expressed in terms of the observable parameters of the contest."
7. **Parimutuel → DFS transfer is heuristic.** Proposition 5.2's optimality holds for parimutuel WTA under reward independence, which the authors state does *not* hold in DFS; Algorithm 6 (backtracking greedy) carries no optimality guarantee — its support is the submodular-greedy analogy (Nemhauser et al.) plus live results.
8. **Stale inputs in the live experiment.** $\mu_\delta$ taken a day early and not updated for late news (Fournette/Ivory, Funchess/Byrd examples are the authors' own); 17 weeks is, by their statement, far too few to establish outperformance statistically: "a large number of DFS contests (and certainly much greater than 17) will be required to fully establish the outperformance of the strategic model in general."
9. **Risk-neutrality throughout.** All objectives maximize expected reward/probability; bankroll and risk-aversion enter only through the §4.3/§6 variance-reduction choice of algorithm variant for double-ups.

---

# Dossier — Hunter, Vielma & Zaman, "Picking Winners in Daily Fantasy Sports Using Integer Programming"

**Copy in library:** `pdfs/hunter_vielma_zaman_arxiv1604.01455v3.pdf` (2,739,122 bytes, 39 pp.)
**Version read:** arXiv:1604.01455v3 [stat.OT], 23 Jan 2019 — the latest arXiv version; header reads "Article submitted to INFORMS Journal on Optimization." A v2 text (2016, shorter title "Picking Winners Using Integer Programming") exists in Google's arXiv dataset mirror; the published journal version is *INFORMS Journal on Optimization* 1(4):348–370 (2019) — publisher PDF is paywalled (see MANIFEST). Lineage: the general "picking winners" problem and Theorems 2.1/2.3/Lemma 1 are from Hunter & Zaman (2017).

All equation numbers, section numbers, and page references below are the paper's own (manuscript pagination as printed in the PDF).

---

## 1. The picking winners problem (§2, p. 6–7)

Events $E=\{E_i\}_{i=1}^{m}$ on a probability space $(\Omega,\mathcal{F},P)$; $E_i$ = "entry $i$ wins." Choose $S\subseteq[m]=\{1,\dots,m\}$, $|S|=k$, to maximize the probability at least one chosen entry wins, $U(S)=P\left(\bigcup_{i\in S}E_i\right)$:

$$\max_{S\subseteq[m],\,|S|=k}\; U(S). \tag{2.1}$$

**Theorem 2.1** (Hunter & Zaman 2017): Maximizing $U(S)$ is NP-hard even for discrete uniform distributions.
**Lemma 1** (Hunter & Zaman 2017): $U(S)$ is non-negative, non-decreasing and submodular.
**Theorem 2.2** (Nemhauser et al. 1978): for the greedy maximizer $S_g$,
$$\frac{U(S_g)}{U(S^*)}\;\ge\;1-e^{-1}. \tag{2.2}$$
**Theorem 2.3** (Hunter & Zaman 2017): if the events are independent, the greedy maximizer is optimal for (2.1).

## 2. Pairwise approximation of the objective (§2.1, p. 8–10)

Inclusion–exclusion truncated at pairwise intersections:

$$U_2(S)\;=\;\sum_{i\in S}P(E_i)\;-\;\frac{1}{2}\sum_{i,j\in S,\,i\neq j}P\!\left(E_i\,E_j\right). \tag{2.3}$$

With $q_0(S)=P\left(\bigcap_{i\in S}E_i^{c}\right)$ and $p_T^0$ = probability that exactly the entries in $T\subseteq S$ win:

**Theorem 2.4.** If there exist $0<p<1$, $c>0$ with $q_0(S)=(1-p)^k$, $kp<1/2$, and $p_T^0\le c\,p^{l}$ for all $T\in\mathcal{S}_l$, $1\le l\le k$, then
$$\frac{1}{2}kp-(kp)^2\;\le\;U(S)\;\le\;kp,\qquad 0\;\le\;U(S)-U_2(S)\;\le\;20c\,(kp)^3.$$
Worked examples in the paper: $k=3$, $p=0.01$, independent ⇒ $U=0.029701$, $U_2=0.029700$, error $10^{-6}$ (bound $5.4\times10^{-4}$, $c=1$). Maximally correlated (all three events identical) ⇒ $U=0.01$, $U_2=0$, error $0.01$, and the bound degenerates ($c=2.7\times10^{5}$, bound $5.4$) — the approximation is only certified for weakly correlated, rare events.

## 3. Gaussian model and the closed-form lower bound (§2.2, p. 10–11)

$\{X_i\}_{i=1}^{m}$ jointly Gaussian, means $\mu_i$, variances $\sigma_i^2$, correlations $\rho_{ij}$; events $E_i=\{X_i\ge t\}$ with $t>\max_i\mu_i$ (paper's calibration: max lineup mean ≈ 30 points, winning threshold $t$ ≈ 60 in DraftKings hockey). With $z_i=(t-\mu_i)/\sigma_i$:

**Theorem 2.5.** Define
$$U_2^{l}(S)=\sum_{i:E_i\in S}\frac{1}{\sqrt{2\pi}\,\sigma_i\,(z_i+1/z_i)}\exp\!\left(-\frac{z_i^{2}}{2}\right)\;-\;\frac{1}{2}\sum_{\substack{i,j:\,E_i,E_j\in S\\ i\neq j}}\frac{1}{\sqrt{2\pi\,(2t-\mu_i-\mu_j)}}\exp\!\left(-\frac{(2t-\mu_i-\mu_j)^2}{2\left(\sigma_i^2+\sigma_j^2+2\rho_{ij}\sigma_i\sigma_j\right)}\right). \tag{2.4}$$
Then $U_2(S)\ge U_2^{l}(S)$.

Authors' reading of (2.4) (p. 10–11): the objective increases with **large $\mu_i$**, **large $\sigma_i$**, and **small pairwise $\rho_{ij}$** — "entries with high means and high variance that have low correlation with each other." (Note: the second denominator in (2.4) is printed in the manuscript as $\sqrt{2\pi(2t-\mu_1-\mu_2)}$ with indices 1,2 — transcribed as printed.)

## 4. Constrained resources: means, variances, covariances (§2.3, p. 11–12)

Resources $\{Y_j\}_{j=1}^{p}$ jointly Gaussian; resource $j$ has mean $\mu_j^0$, s.d. $\sigma_j^0$, correlations $\rho_{jl}^0$. Entry $i$ is a sum of $n$ resources; $x_{ij}=1$ iff resource $j$ is in entry $i$; $X_i=\sum_{j=1}^{p}Y_jx_{ij}$.

$$\mu_i=\sum_{j=1}^{p}\mu_j^0\,x_{ij} \tag{2.5}$$
$$\sigma_i^2=\sum_{j=1}^{p}(\sigma_j^0)^2x_{ij}+\sum_{j=1}^{p}\sum_{\substack{l=1\\l\neq j}}^{p}\rho_{jl}^0\,\sigma_j^0\sigma_l^0\,x_{ij}x_{il} \tag{2.6}$$
$$\mathrm{Cov}(X_i,X_q)=\sum_{j=1}^{p}(\sigma_j^0)^2x_{ij}x_{qj}+\sum_{j=1}^{p}\sum_{\substack{l=1\\l\neq j}}^{p}\rho_{jl}^0\,\sigma_j^0\sigma_l^0\,x_{ij}x_{ql} \tag{2.7}$$

Under the simplifying assumption that every resource has variance 1 and correlations in $\{0,\delta,-\delta\}$, with $n_i^{+}$/$n_i^{-}$ the numbers of positively/negatively correlated resource pairs inside entry $i$, $n_{iq}$ the shared-resource count (overlap) of entries $i,q$, and $n_{iq}^{+}$/$n_{iq}^{-}$ cross-entry correlated-pair counts:

$$\sigma_i^2=n+\delta\left(n_i^{+}-n_i^{-}\right) \tag{2.8}$$
$$\mathrm{Cov}(X_i,X_q)=n_{iq}+\delta\left(n_{iq}^{+}-n_{iq}^{-}\right) \tag{2.9}$$

## 5. The sequential integer program (§2.4, p. 12–13) — the paper's core algorithm

Entries are built greedily, one at a time. Given constants $\{\epsilon_i\}_{i=1}^{k}>0$ (variance floors) and $\{\gamma_{iq}\}$ (covariance caps), and previously built entries $x^{*}_{qj}$, entry $i\ge2$ solves:

$$\max_{x}\quad \sum_{j=1}^{p}\mu_j^0\,x_{ij}$$
$$\text{subject to}\quad \sum_{j=1}^{p}(\sigma_j^0)^2x_{ij}+\sum_{j=1}^{p}\sum_{\substack{l=1\\l\neq j}}^{p}\rho_{jl}^0\,\sigma_j^0\sigma_l^0\,x_{ij}x_{il}\;\ge\;\epsilon_i$$
$$\sum_{j=1}^{p}(\sigma_j^0)^2x_{ij}x^{*}_{qj}+\sum_{j=1}^{p}\sum_{\substack{l=1\\l\neq j}}^{p}\rho_{jl}^0\,\sigma_j^0\sigma_l^0\,x_{ij}x^{*}_{ql}\;\le\;\gamma_{iq},\qquad q=1,\dots,i-1 \tag{2.10}$$
$$\sum_{j=1}^{p}x_{ij}=n,\qquad x\in\mathcal{G},$$

where $\mathcal{G}\subseteq\{0,1\}^p$ is a general feasible region. For $i=1$ the covariance constraints are omitted. Only covariance with *previous* entries is constrained, so the constraint count grows linearly in $i$. The authors note the variance constraint is quadratic and could be linearized with auxiliary variables, but in the DFS application they instead impose structural (stacking) constraints — §4 below. Stated reason for greediness (p. 12): "The objective function we will use in our integer programming formulation is different from the original objective function, but shares some of its key properties, so **we assume the loss in optimality with our greedy approach will not be significant**" — an assumption, not a theorem (see §9 of this dossier).

## 6. Hockey specialization (§3–§4, pp. 13–22)

**Prediction model (§3.2, p. 16–17).** Features are the published projections of Rotogrinders ($f_k^1$) and Daily Fantasy Nerd ($f_k^2$). For skater $k$:
$$\mu_k=\beta_0+\beta_1 f_k^{1}+\beta_2 f_k^{2}+\epsilon_k \tag{3.1}$$
For goalie $k$, with DFN win probability $p_k$:
$$\mu_k=\beta_0+\beta_1 f_k^{1}+\beta_2 f_k^{2}+\beta_3 p_k+\epsilon_k,\qquad \epsilon_k\ \text{Gaussian}. \tag{3.2}$$
Table 2 (p. 17): skaters — $\beta_1=0.634^{***}$ (SE 0.0203), $\beta_2=0.282^{***}$ (0.0242), $R^2=0.238$, $n=10{,}825$. Goalies with win probability — only $\beta_3$ significant: $4.310^{*}$–$5.304^{**}$ across specifications; $R^2=0.0858$ (Rotogrinders only) down to $0.0139$; $n=506$–$565$. Authors: "the models do not have high accuracy. However, our metric of interest is not accuracy, but performance in real hockey contests."

**Correlations (§3.3, p. 17–18, Figure 3).** Pearson correlations of FPPG: same-line forwards correlate much more strongly than same-team/different-line forwards (figure-reported, ≈0.15–0.25 for Line 1 decaying by line, vs ≈0 for different lines); goalies are negatively correlated with opposing skaters. The formulation uses only the *signs* of these correlations, never their estimated magnitudes.

**Feasibility constraints (§4.1, p. 19).** DraftKings NHL: budget $B=50{,}000$; position sets $C,W,D,G$; team player sets $T_l$, $l=1,\dots,N_T$; team indicators $t_{il}\in\{0,1\}$.

$$2\le\sum_{j\in C}x_{ij}\le 3,\qquad 3\le\sum_{j\in W}x_{ij}\le 4,\qquad 2\le\sum_{j\in D}x_{ij}\le 3,\qquad \sum_{j\in G}x_{ij}=1 \tag{4.1}$$
$$t_{il}\le\sum_{k\in T_l}x_{ik}\ \ (l=1,\dots,N_T),\qquad \sum_{l=1}^{N_T}t_{il}\ge 3,\qquad t_{il}\in\{0,1\} \tag{4.2}$$
$$\sum_{j=1}^{p}c_jx_{ij}\le B,\qquad \sum_{k=1}^{p}x_{ij}=9,\qquad \text{(4.1), (4.2)},\qquad x_{ij}\in\{0,1\} \tag{4.3}$$

**Stacking constraints (§4.2, pp. 19–21)** — these replace the variance floor of (2.10), under the explicit assumptions (§4, p. 18) that "the players all have the same variance and that the magnitude of the covariance is much smaller than the variance":

- *Goalie stacking* ($O_j$ = skaters opposing goalie $j$): $\displaystyle\sum_{l\in O_j}x_{il}\le 6\,(1-x_{ij}),\quad \forall j\in G.$ (4.4)
- *Complete line* ($L_l$ = players on line $l$, $v_{il}\in\{0,1\}$): $\displaystyle 3v_{il}\le\sum_{j\in L_l}x_{ij},\quad \sum_{l=1}^{N_L}v_{il}\ge1.$ (4.5)
- *Two partial lines* ($w_{il}\in\{0,1\}$): $\displaystyle 2w_{il}\le\sum_{k\in L_l}x_{ik},\quad \sum_{l=1}^{N_L}w_{il}\ge2.$ (4.6)
- *Defensemen stacking* ($P_D$ = defensemen on any team's first power-play unit): $x_{ij}=0,\quad \forall j\in D\setminus P_D.$ (4.7)

**Overlap constraints (§4.3, p. 21)** — the covariance cap of (2.10) reduced, under the same variance≫covariance assumption, to a shared-player cap against every previously built lineup $l$:
$$\sum_{j=1}^{p}x^{*}_{lj}\,x_{ij}\;\le\;\gamma,\qquad l=1,\dots,i-1. \tag{4.8}$$

**Complete program (§4.4, p. 22):**
$$\max_{x}\ \sum_{j=1}^{p}\mu_jx_{ij}\quad\text{s.t. (4.3) feasibility, (4.8) overlap, any subset of (4.4)–(4.7) stacking.} \tag{4.9}$$
solved iteratively $k$ times, updating (4.8) after each lineup.

Six stacking types are evaluated (Table 3, p. 23): No stacking = (4.3) only; Types 1–5 all add (4.4)+(4.5)+(4.6); Type 2 additionally forces exactly 2 defensemen; Types 3–4 add (4.7); Types 4–5 additionally force exactly three teams ($\sum_l t_{il}=3$ with the team-linking constraints).

**Baseball (§5.7, pp. 29–31).** Same machinery: 10-player lineups (2 pitchers, 8 hitters), ≥2 different games, $50{,}000$ budget, ≤5 hitters from one team, five consecutive batters (cyclic) as the stack, $\gamma=6$, DFN projections only.

**Implementation (§5.6, pp. 27–29).** JuMP (Julia) modeling; solvers CBC, GLPK (free) and Gurobi (commercial); Intel Core i5-4570 3.20GHz, 8GB RAM. Authors' code: github.com/dshunter (Hunter 2016) / Zaman's `dailyfantasybaseball` repo.

## 7. Experimental setup (§5, pp. 22–23)

- **Hockey:** 38 real DraftKings top-heavy contests, Oct 21 – Dec 31, 2015, each with several thousand entrants; the authors entered the contests to obtain the full population lineups and points. Portfolios of 1, 100, and 200 lineups; profit margins counterfactually computed against the actual population, adjusting for DraftKings entry limits by randomly deleting population lineups, averaged over **1,000 trials** of that random deletion process.
- **Baseball:** 10 DraftKings top-heavy contests, May 25 – Jun 5, 2016, 38,333–57,500 entries each (Table 4); 200 lineups per contest.

## 8. Headline quantitative results

- **Stacking (§5.1, Figure 4–5):** no stacking has the lowest mean profit margin at every portfolio size. Type 4 (goalie + complete/partial line + defensemen stacking, exactly 3 teams) has the highest mean profit margin for 100 and 200 lineups, and for 1 lineup once a single outlier contest is excluded. With Type 4 and $\gamma=7$: median profit margin is **−100% with 1 lineup**, rising with portfolio size; the 75th percentile is larger at 200 lineups than at 100. (Exact mean percentages are figure-reported; the paper does not tabulate them.)
- **Prediction models (§5.2, Figure 6):** the combined model (DFN + Rotogrinders + win probability) "does best or near the best" at each portfolio size, but given the regressions' low $R^2$ the authors state "it is not clear from our analysis which model has the clear advantage."
- **Overlap (§5.3, Figure 7):** best $\gamma$ depends on slate size — $\gamma=7$ best for <4 games; $\gamma=4$ best for >9 games; $\gamma<4$ makes 200 feasible lineups hard to obtain; $\gamma>7$ gives too little diversity. Recommended tuning range: **4–7**.
- **Greedy order (§5.4):** Spearman correlation between creation rank and performance rank = **0.09 (s.d. 0.1)**; median performance rank of the first-created lineup = 74.5 (of 200); median creation rank of the best-performing lineup = 124.5.
- **Profit mechanism (§5.5, Figure 9):** portfolio mean-point difference vs the population ($\mu_1-\mu_0$) ranges −10 to +20; no profit when below zero, substantial profit above; contest profit margins printed in Figure 9 reach 1,445%; the optimized lineups' point s.d. is generally *below* the population's ($\sigma_1<\sigma_0$) despite per-lineup stacking. Authors: "because the contest payoff structure is so asymmetric, with a maximum loss of 100%, but a maximum gain that is at least an order of magnitude larger, our lineups end up being profitable."
- **Runtime (§5.6, Figure 10):** CBC, GLPK, and Gurobi each generate 100 lineups in **under 4 minutes** sequentially. Solving two lineups jointly (adding the quadratic constraint $\sum_j x_{(i+1)j}x_{ij}\le\gamma$ (5.1), linearized) raises Gurobi runtime substantially and takes **>2 hours** with CBC/GLPK.
- **Baseball (Table 4):** best-of-200 ranks in the 10 contests: **1st of 47,916** (5/25/2016), **3rd of 38,333**, 7th of 38,333, **2nd of 38,333** — top-ten in 4 of 10 contests.

## 9. Authors' stated assumptions, limitations, and unproven steps

1. **Greedy optimality is assumed, not proven, for the implemented program.** The (1−1/e) guarantee (Thm 2.2) covers greedy maximization of $U$ itself; the implemented IP maximizes mean subject to variance/overlap proxies, a different objective. Authors (§2.4): "we assume the loss in optimality with our greedy approach will not be significant."
2. **$U_2$ approximation degrades with correlation** (Thm 2.4 and the identical-events example): the error bound becomes trivial exactly when entries are strongly correlated — the regime stacking deliberately creates within lineups.
3. **Equal-variance / negligible-covariance assumptions** (§4, p. 18): "Due to difficulties in estimation, we do not explicitly use the correlations and variances of the player's points. Instead we assume that the players all have the same variance and that the magnitude of the covariance is much smaller than the variance." Correlation magnitudes are never estimated; only signs are used (§6: "We do not use the actual value of any correlations, just a basic understanding of their sign").
4. **Gaussianity** of player/resource points is assumed throughout §2.2–2.3; no distributional test is reported.
5. **Prediction quality is weak and the authors say so:** skater $R^2=0.238$, goalie $R^2$ as low as 0.0139; §6: "Our predictions can even be noisy."
6. **Profit evaluation is counterfactual**, not from actually entering 100–200 lineups in all 38 contests: population lineups are randomly deleted (1,000 trials) to respect entry limits — realized, audited contest winnings at full portfolio scale are not reported.
7. **Weak formulations acknowledged** (§5.6): constraints (4.4) and (4.5) are "examples of what classical textbooks call weak formulations"; the strengthened version (Appendix 8) slowed GLPK and did not help Gurobi/CBC on their instances.
8. **Scope:** winner-take-all/top-heavy payoffs only. Opponents' behavior is not modeled (that gap is exactly what Haugh & Singal 2021 address); double-ups/50-50s are out of scope.

---

# Dossier — Mahoney & Paniak, "Method and Validation for Optimal Lineup Creation for Daily Fantasy Football Using Machine Learning and Linear Programming"

**Copy in library:** `pdfs/mahoney_2023_arxiv2309.15253.pdf` (638,184 bytes, 32 pp.)
**Bibliographic:** arXiv:2309.15253v2 [cs.LG], 28 Sep 2023. Authors: Joseph M. Mahoney (Alvernia University; Penn State Berks), Tomasz B. Paniak (Penn State Berks). Added to this library as a bonus acquisition during the Newell search — it is the most direct published descendant of Newell's protocol (it follows Newell's random-lineup validation method and cites the thesis as ref. [2]).
**Contest:** DraftKings NFL **GPP "Classic"** (Thu–Mon slate), \$50,000 cap, 1 QB / 2 RB / 3 WR / 1 TE / 1 FLEX (RB/WR/TE) / 1 DST. All computation in MATLAB R2018b.

---

## 1. Framing

Lineup construction is posed as a **Stochastic Knapsack Problem**: salary cap + positional requirements are the knapsack "volume," players are objects, and their value (FPTS) is uncertain at selection time. The pipeline: (1) aggregate historical data → (2) train a neural network to project next-week FPTS → (3) feed projections into a MILP → (4) validate against random lineups and real DraftKings fields.

## 2. Projection model (§2.1–2.2)

- **Data:** 2018 NFL regular season (17 weeks); sources: DraftKings (FPTS, salary), RotoGuru, FantasyData (Vegas lines), Football Outsiders (team off/def rankings), Fox Sports (byes), game lat/long. Players must have played ≥4 of the last 6 weeks and be draftable; rolling **4-week windows** (14 windows per season), features from weeks 1–3 of a window + known week-4 context, target = week-4 actual FPTS.
- **Features: 43 inputs** (Table 2): position one-hot (5); weeks 1–3 FPTS, point differentials, own-team offensive/defensive ranks, opponent offensive/defensive ranks (3 each); weeks 1–4 home/away, spread, over/under, latitude, longitude (4 each). Target: 1 output (next-game FPTS).
- **Network:** two-layer feed-forward net, **19 hidden neurons** (sigmoid), linear output, trained with **Bayesian regularization backpropagation** (Levenberg–Marquardt was faster but worse); MATLAB `nftool`; 80/20 train/validation split; MSE objective. Hidden size 19 chosen by small-scale tests ("too few or too many neurons degraded performance").
- **Uncertainty handling (§2.4):** 10,000 NNs retrained on random train/validation splits → 10,000 projection vectors → 10,000 MILP lineups; the entered lineup is the **modal lineup** (most frequently generated — a plurality-vote ensemble). Convergence test: modal lineup stable by 100 lineups. Percentile CIs by bootstrap (10,000 resamples); α = 0.05; Cohen's d for effect sizes.

## 3. MILP (§2.3, eq. 1) — as written

$\boldsymbol{f}$ = predicted FPTS vector, $\boldsymbol{S}$ = salary vector, $x_i\in\{0,1\}$ selection of player $i$:

$$\min_{\boldsymbol{x}}\ \left(-\boldsymbol{f}^{T}\boldsymbol{x}\right)\quad\text{subject to}\quad
\begin{cases}
x_i\in\{0,1\}\\
\boldsymbol{S}^{T}\boldsymbol{x}\le \$50{,}000\\
\sum_{i\in QB}x_i=1\\
\sum_{i\in RB}x_i=n_{RB}\\
\sum_{i\in WR}x_i=n_{WR}\\
\sum_{i\in TE}x_i=n_{TE}\\
\sum_{i\in DST}x_i=1
\end{cases} \tag{1}$$

Solved **three times**, once per FLEX assignment — $(n_{RB},n_{WR},n_{TE})\in\{(2,3,2),(2,4,1),(3,3,1)\}$ — keeping the best objective. Solver: MATLAB `intlinprog` with AbsoluteGapTolerance = 0, CutMaxIterations = 25, IntegerTolerance = $10^{-4}$. **Stated omission:** DraftKings' ≥2-teams rule "was not enforced in this step so… infeasible lineups would be possible" (in practice their generated lineups satisfied it). Injured/out/questionable players removed manually pre-solve.

## 4. Experimental setup and results (§3)

Lineups generated live for **2018 weeks 6–16** (method needs 4 weeks of history); weeks 7 and 9 excluded from analysis because a selected player was a game-time scratch (0 FPTS).

**Table 3 — predicted vs actual lineup FPTS (9 analyzed weeks):** predictions 135.7–193.8; actuals 88.80–136.96. **Every week's actual fell below the 2.5th percentile of its own prediction interval** (e.g., wk 15: predicted 193.8 [161.8, 222.9], actual 100.12; wk 13: predicted 187.0, actual 95.88). Authors: "individual FPTS predictions were generally poor, usually falling far outside the 95% CI from the 10,000 models," and the MILP systematically chases the NN's over-predictions ("the unusually high FPTS prediction for some players may have been due to modeling error rather than true insight").

**Table 4 — vs 35,000 random lineups/week** (random lineups required ≥ \$45,000 spend = 90% of cap, following Newell's protocol; note the random lineups were built *after* the games, excluding players who scored 0 — a hindsight filter the generated lineups did not get): percentiles 62.7, 72.6, 51.4, 57.8, 73.4, 27.3, 13.6, 52.9, 19.3 (weeks 6–16) — above the random median in 6 of 9 weeks, collapsing in weeks 13/14/16.

**Table 5 — vs real DraftKings fields** (free and \$0.25 GPPs, Thu–Mon Classic; user scores of 0 removed; fields of 2,300–37,300 users/week): percentiles **32.2, 31.6, 34.2, 33.1, 50.5, 9.34, 6.10, 25.2, 4.52** — **median ≈ 31st percentile** (the abstract's headline). Real-user mean FPTS beat the random-lineup mean every week ($p\ll0.001$, Cohen's d 0.49–1.08).

## 5. Authors' stated assumptions, failure modes, and limitations

1. **No normality/independence assumption — claimed as the advance over prior IP work:** "this method does not assume a normal distribution of FPTS nor the independence of players' FPTS. The use of the NN modeling allows for the discovery of 'synergy' between players on the same team." (Flag: the *optimizer* still maximizes a point projection $\boldsymbol{f}^{T}\boldsymbol{x}$; the NN emits no joint distribution, so no correlation actually enters the MILP — the "synergy" is at most implicit in the features.)
2. **Objective mismatch acknowledged:** maximizing expected FPTS is not maximizing expected winnings; the paper itself cites Newell & Easton [2, 15] that tiered/GPP contests reward lower-mean/higher-variance lineups and double-ups the reverse, and notes its lineups' volatility "may be beneficial for GPP contests" — but no variance term is implemented.
3. **Late-season degradation (weeks 13+)** attributed to cumulative injuries, playoff-clinching teams resting players, and tanking — none modeled; the 3-week lookback "is not well suited to adjust for these abrupt changes." Suggested remedy: enter only mid-season contests.
4. **Single-entry only;** free/\$0.25 contest fields used for validation ("the caliber of the user… is different in free and low-cost contests versus higher-fee contests which may skew the FPTS distributions"); training compute limited; authors state they "did not have experience with fantasy football prior to the study."
5. **Optimizer's-curse mechanism named in the text:** "The MILP was incentivized to choose the 'undervalued' players according to the NN prediction" — i.e., selection maximizes exposure to projection error, the same failure Haugh–Singal flag for optimized quantities generally.

## 6. Value for the library

A complete, honest end-to-end baseline: a reasonable projection model + plain max-points MILP lands at the **31st percentile of real fields** despite beating random lineups — field evidence, from inside the literature, that projection+deterministic-MILP alone is a below-median strategy, and that the failure concentrates exactly where the other papers in this library say it should (no variance/ownership/opponent modeling, winner's-curse selection on noisy projections).

---

# Dossier — Mbeledogu, "Robust Daily Fantasy Sports: Maximizing Reward via the Robust Optimization Paradigm"

**Copy in library:** `pdfs/mbeledogu_2023_ssac.pdf` (1,024,576 bytes, 23 pp.)
**Bibliographic:** Dubem Mbeledogu, MIT Sloan Sports Analytics Conference 2023 research paper (1st place, SSAC Research Papers Competition). Author's code: github.com/drmbeledogu/RobustDFS. Target: DraftKings NFL **50/50** contests. All equation numbers are the paper's own.

---

## 1. Baseline MILP (§1, eqs. 1–8) — "common amongst online optimizers"

Sets: $\mathcal{P}$ all eligible players; $\mathcal{QB},\mathcal{WR},\mathcal{RB},\mathcal{TE},\mathcal{DST}$ positional subsets. $\boldsymbol{p}\in\mathbb{R}^{|\mathcal{P}|}$ projected points; $\boldsymbol{c}\in\mathbb{R}_+^{|\mathcal{P}|}$ costs; $\boldsymbol{x}\in\{0,1\}^{|\mathcal{P}|}$ selections.

$$\max_{\boldsymbol{x}}\ \boldsymbol{p}^{T}\boldsymbol{x} \tag{1}$$
$$\sum_{i\in\mathcal{QB}}x_i=1 \tag{2}\qquad \sum_{i\in\mathcal{WR}}x_i\ge3 \tag{3}\qquad \sum_{i\in\mathcal{RB}}x_i\ge2 \tag{4}\qquad \sum_{i\in\mathcal{TE}}x_i\ge1 \tag{5}$$
$$\sum_{i\in\mathcal{DST}}x_i=1 \tag{6}\qquad \sum_{i\in\mathcal{P}}x_i=9 \tag{7}\qquad \boldsymbol{c}^{T}\boldsymbol{x}\le Budget \tag{8}$$

Eqs. (2)–(7) encode the DraftKings roster (1 QB, ≥3 WR, ≥2 RB, ≥1 TE, 1 DST, 9 total with the flex being WR/RB/TE); Budget = \$50,000.

**Two stated defects of (1):** (i) in 50/50s you need only beat the median (top 50% pays 1.8×), not maximize points; (ii) projections are noisy — the study's projections (DFSForecast.com) have **$R^2=0.62$**, so a lower-mean/lower-variance lineup can pay out more often. The paper dismisses the two existing fixes: Newell's stochastic programming ("difficulty in specifying the expectation function… standard deviation which cannot be calculated linearly") and Haugh & Singal's BQP ("requires minutes of solve time on a high-performance computing cluster").

## 2. Robust reformulation (§2.1, eqs. 9–13)

Actual points = projection + error $\boldsymbol{e}$; $\mathcal{U}$ = uncertainty set of possible errors. Maximize the worst case via a dummy variable $\theta$:
$$\max_{\boldsymbol{x},\theta}\ \theta \qquad\text{s.t.}\qquad \theta\le(\boldsymbol{p}+\boldsymbol{e})^{T}\boldsymbol{x}\quad\forall\boldsymbol{e}\in\mathcal{U}, \tag{9–10}$$
equivalently
$$\theta\le\boldsymbol{p}^{T}\boldsymbol{x}+\min_{\boldsymbol{e}\in\mathcal{U}}\boldsymbol{e}^{T}\boldsymbol{x}. \tag{13}$$
The roster constraints (2)–(8) are carried along unchanged.

## 3. Uncertainty set with correlation whitening (§2.2, eqs. 14–24)

p-norm set: $\|\boldsymbol{e}\|_p\le\rho$ (15), $\rho$ = set size; $p=1$ "polygon," $p=2$ "ball," $p\to\infty$ "box." The author rejects raw p-norm sets: they assume symmetric, **uncorrelated** errors, while in the data QB and WR errors are positively correlated — the box's 2nd/4th-quadrant corners and the polygon's top/bottom corners contain almost no observed errors, making the worst case "too conservative."

**Whitening.** With error covariance $\boldsymbol{\Sigma}_{\boldsymbol{e}}$, use the inverse-square-root whitening matrix $\boldsymbol{W}=\boldsymbol{\Sigma}_{\boldsymbol{e}}^{-1/2}$ (Cholesky of $\boldsymbol{\Sigma}_{\boldsymbol{e}}^{-1}$ also valid), giving the correlation-aware set:
$$\left\|\boldsymbol{\Sigma}_{\boldsymbol{e}}^{-1/2}\boldsymbol{e}\right\|_p\le\rho. \tag{20}$$

**Covariance estimation (§2.2.2, Algorithm 1).** Players missing >20% of games are dropped; covariances computed **pairwise** (same-team pairs directly; players not sharing a game set to 0; for opposing players, the error covariance is proxied by position-level player-vs-opposing-position covariances from prior weeks, taking the **minimum magnitude** of the two directions "because these covariances are the least sure estimates"). Because pairwise assembly need not be PSD (required for the square root), correlations are first projected to the **nearest correlation matrix** (Higham's algorithm via Dykstra alternating projections, Croucher's `nearest_correlation.py`):
$$\min_{\boldsymbol{R}_{\boldsymbol{e}}}\|\boldsymbol{X}-\boldsymbol{R}_{\boldsymbol{e}}\|_F\quad\text{s.t.}\quad \boldsymbol{R}_{\boldsymbol{e}}\in\mathcal{S}\cap\mathcal{V}, \tag{21–22}$$
then $\boldsymbol{\Sigma}_{\boldsymbol{e}}=\boldsymbol{D}_{\boldsymbol{e}}\boldsymbol{R}_{\boldsymbol{e}}\boldsymbol{D}_{\boldsymbol{e}}$ (24), $\boldsymbol{D}_{\boldsymbol{e}}=\mathrm{diag}(\sigma_{e_1},\dots,\sigma_{e_{|\mathcal{P}|}})$ (23) — variances deliberately left unaltered "because the variances are the surest values in the matrix."

**Measured positional error correlations (Appendix B, DFSForecast data):**

| Same team | QB | WR | RB | TE | DST |
|---|---|---|---|---|---|
| QB | 1 | 0.27 | 0.07 | 0.26 | −0.10 |
| WR | 0.27 | 1 | −0.01 | 0 | −0.05 |
| RB | 0.07 | −0.01 | 1 | 0 | 0.02 |
| TE | 0.26 | 0 | 0 | 1 | −0.10 |
| DST | −0.10 | −0.05 | 0.02 | −0.10 | 1 |

| Opposing | QB | WR | RB | TE | DST |
|---|---|---|---|---|---|
| QB | 0.22 | 0.09 | 0.07 | 0.10 | **−0.35** |
| WR | 0.09 | 0.04 | 0.01 | 0.06 | −0.12 |
| RB | 0.07 | 0.01 | 0 | 0.05 | −0.16 |
| TE | 0.10 | 0.06 | 0.05 | 0.02 | −0.10 |
| DST | **−0.35** | −0.12 | 0.02 | −0.10 | **−0.31** |

## 4. Dualization and the final MILP (§2.3, eqs. 25–44)

Inner problem as a conic program: $\min_{\boldsymbol{e}}\boldsymbol{x}^{T}\boldsymbol{e}$ s.t. $(\boldsymbol{e},\rho)\in\mathcal{K}=\{(\boldsymbol{e},\rho):\|\boldsymbol{\Sigma}_{\boldsymbol{e}}^{-1/2}\boldsymbol{e}\|_p\le\rho\}$ (25–26). Dual cone $\mathcal{K}^*=\{(\boldsymbol{s},t):\|\boldsymbol{s}\|_q\le t\}$, $\frac1p+\frac1q=1$ (28); Lagrangian (27); dual function finite iff $\boldsymbol{x}=\boldsymbol{\Sigma}_{\boldsymbol{e}}^{-1/2}\boldsymbol{s}$ (29–31). Strong duality is asserted ("which it does here"). Substituting back gives the closed-form robust objective — mean minus a safety penalty:
$$\boxed{\max_{\boldsymbol{x}}\ \boldsymbol{p}^{T}\boldsymbol{x}-\rho\left\|\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x}\right\|_q} \tag{37}$$
(with the intermediate constraint form (36)). Two MILP-linearizable cases:

**Box set** ($q=1$): $\max_{\boldsymbol{x}}\boldsymbol{p}^{T}\boldsymbol{x}-\rho\sum_{i=1}^{|\mathcal{P}|}|(\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x})_i|$ (38), linearized with slack $\boldsymbol{z}$:
$$\max_{\boldsymbol{x},\boldsymbol{z}}\ \boldsymbol{p}^{T}\boldsymbol{x}-\rho\sum_{i=1}^{|\mathcal{P}|}z_i\qquad\text{s.t.}\qquad -\boldsymbol{z}\le\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x}\le\boldsymbol{z}. \tag{39–40}$$

**Polygon set** ($q=\infty$): $\max_{\boldsymbol{x}}\{\boldsymbol{p}^{T}\boldsymbol{x}-\rho\max_{1\le i\le|\mathcal{P}|}|(\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x})_i|\}$ (41), linearized with scalar $z$:
$$\max_{\boldsymbol{x},z}\ \boldsymbol{p}^{T}\boldsymbol{x}-\rho z\qquad\text{s.t.}\qquad z\ge(\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x})_i,\quad z\ge-(\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x})_i\quad\forall i. \tag{42–44}$$

(The ball set $q=2$ would be a second-order cone program, not a MILP; it is not used in the experiments.) $\rho$ is a tuning knob chosen per week (Tables 1–2: polygon $\rho\in\{2,5\}$, box $\rho\in\{0.1,0.25,0.35\}$; no selection rule is given).

## 5. Simulation study (§3)

- **Design:** 10,000 simulated outcomes; projections from DFSForecast.com for the **2021–22 NFL season**; the "true" error covariance $\boldsymbol{\Sigma}_{\boldsymbol{e}\text{-true}}$ computed from all 18 weeks via Algorithm 1; simulated errors drawn $\boldsymbol{e}\sim\mathcal{N}(0,\boldsymbol{\Sigma}_{\boldsymbol{e}\text{-true}})$. Lineups built for **weeks 10–18** only (earlier weeks lack covariance history). Solver: **Gurobi** in Jupyter on an Intel i7-10th-gen; "fractions of a second" per solve.
- **Metric:** simulated **1st-percentile** lineup score (the worst case the formulation targets), plus probability of clearing empirical DraftKings 50/50 payout lines (weekly averages from FantasyCruncher, 2021 season).

**Table 1 (polygon set) — 1st-percentile score, MILP → Robust:** wk 11: 97.3→97.9 (+0.6%); wk 13: 100.8→104.0 (+3.2%); wk 14: 89.1→96.0 (+7.7%); wk 15: 85.4→91.1 (+6.7%); wk 16: 97.6→109.0 (**+11.7%**); wk 18: 86.3→90.9 (+5.3%); wks 10, 17: no change (robust = MILP lineup). Mean scores fall 0–7.8% in exchange.
**Table 2 (box set) — 1st-percentile score:** wk 12: 89.2→91.1 (+2.1%); wk 13: 100.8→104.6 (+3.8%); wk 14: 89.1→100.9 (**+13.2%**); wk 15: 85.4→89.4 (+4.7%); wk 16: 97.6→109.6 (**+12.3%**); wk 17: 101.1→105.7 (+4.5%); wk 18: 86.3→91.6 (+6.1%); wk 11: no change.
**Table 3 (box set) — P(payout) vs empirical lines:** wk 12 (line 98.78): 97% vs 97%; wk 13 (173.75): **19% MILP vs 5% robust**; wk 14 (128.34): 77% vs **80%**; wk 15 (123.52): **79% vs 75%**; wk 16 (133.46): 75% vs **77%**; wk 17 (134.39): **71% vs 58%**; wk 18 (120.79): 80% vs **81%**. I.e., the robust lineup raises the payout probability in only 3 of 7 scored weeks and *lowers* it sharply in weeks 13 and 17 — a fact the text does not dwell on (see §7 below).

- **Worked example (§3):** week 16, robust picks Tom Brady (proj. 20.79, more expensive) over Dak Prescott (proj. 22.14) because of Brady's **negative error covariance with RB Ronald Jones** (Appendix D box matrix: cov = −27.1) — a built-in hedge.
- Author's read: box beats polygon ("the polygon uncertainty set['s] worst-case scenario… is too conservative; it accounts for scenarios that do not occur").

## 6. Author's stated flaws and extensions (§4)

1. **The >50% assumption (§4.1):** the formulation assumes the base model's MILP lineups already have >50% of their density above the payout line (positive-EV projections). "If that's not the case, the robust formulation will shift more probability density to a lower number of points, exacerbating the low expected value issue." Proposed fix — flip the sign to a "surprise" objective (explicitly "not rigorously derived"):
$$\max_{\boldsymbol{x}}\ \boldsymbol{p}^{T}\boldsymbol{x}+\rho\left\|\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x}\right\|_q, \tag{45}$$
which favors variance and positive covariance — "this logic is already standard… 'stack' QB's and WR's."
2. **Payout-line endogeneity (§4.1):** the analysis assumes the 50/50 payout line is independent of your lineup's performance; in a two-lineup world the robust lineup can *never* be right (its mean is lower and the difference distribution is symmetric). Defended empirically: PFF projected ~170 distinct players used in week 10 of 2022, most at ≤10% ownership, so lines are set by a diverse field.
3. **All-errors-at-once conservatism:** the Bertsimas–Sim budgeted set is named as future work — worst case over subsets $\mathcal{Z}\subseteq\mathcal{P}$, $|\mathcal{Z}|\le\Gamma$:
$$\max_{\boldsymbol{x}}\left\{\boldsymbol{p}^{T}\boldsymbol{x}+\min_{\{\mathcal{Z}\mid\mathcal{Z}\subseteq\mathcal{P},\,|\mathcal{Z}|\le\Gamma\}}\sum_{j\in\mathcal{Z}}e_jx_j\right\}. \tag{46}$$
4. Intended use: "in conjunction with MILP and domain knowledge… an extra tool," not a replacement. Future work: other uncertainty sets; NBA (more games → measurable empirical performance).

## 7. Unproven / weak steps (dossier author's flags, from the text)

- **Strong duality is asserted, not shown** ("which it does here"), and the derivation silently drops the roster constraints (2)–(8) — they are reattached without discussion of interaction with the dualization.
- **The evaluation is circular in the same way Haugh–Singal's §7 is:** outcomes are simulated from $\mathcal{N}(0,\boldsymbol{\Sigma}_{\boldsymbol{e}\text{-true}})$ where $\boldsymbol{\Sigma}_{\boldsymbol{e}\text{-true}}$ is estimated from the same season's errors, and the robust optimizer's $\boldsymbol{\Sigma}_{\boldsymbol{e}}$ is estimated by the same Algorithm 1 pipeline — the simulator and the optimizer share the model class. No realized-score backtest is reported; the only real-world anchor is Table 3's payout lines, where the robust lineup's payout probability is **worse in 3 of 7 weeks** (13, 15, 17), which the paper does not reconcile with its headline claim.
- **$\rho$ has no calibration rule** — values differ by set and week with no stated selection procedure, so the Tables 1–2 gains are partly a function of per-week $\rho$ choice.
- The opposing-player covariance proxy (minimum magnitude of two position-level estimates) and the 20%-games-missed cutoff are heuristics without sensitivity analysis.
- Eq. (45), the variance-seeking variant that would serve GPP-style contests, is explicitly unproven and not linearized.

---

# PARTIAL Dossier — Newell (2017), "Optimizing Daily Fantasy Sports Contests Through Stochastic Integer Programming"

> **STATUS: full text NOT acquired.** This file records only what was verified from the thesis landing page (Kansas State's K-REx repository) on 2026-11-07. It is a placeholder dossier so the gap is documented, not a deep read. See `../MANIFEST.md` for the acquisition failure details.

**Bibliographic:** Sarah Newell, MS thesis, Dept. of Industrial and Manufacturing Systems Engineering, Kansas State University, 2017. Advisor: Todd Easton. Repository handle: https://hdl.handle.net/2097/35393 (krex.k-state.edu).

## What the verified abstract establishes

- The model is a **mixed-integer stochastic integer program (the paper's lineage calls it an MMIP)** for DFS lineup construction.
- Per the abstract, it is the **first model to optimize the expected payout of a tiered (GPP-style) contest** directly, rather than expected fantasy points.
- Player performance is modeled with **normal distributions**; the lineup standard deviation (which is not linear in the selection variables) is handled with a **piecewise-linear approximation**.

## Why this paper matters to the library (from its citers, verified in acquired papers)

- Mbeledogu (2023, acquired) positions against it: stochastic programming "addresses the true problem but… [requires] extra specification… to approximate the lineup standard deviation."
- Mahoney & Paniak (2023, acquired) follow its validation protocol (random lineups spending ≥90% of cap) and cite its findings: in tiered contests the stochastic program's lower-mean/higher-variance lineups out-pay the expected-points IP; in double-ups the reverse.
- Companion publications by the same authors: Newell & Easton, "Optimizing Tiered Daily Fantasy Sports — Mathematically Modeling DraftKings NFL Millionaire Maker Tournament," IISE Annual Conference Proceedings 2017, pp. 289–294; Easton & Newell, "Are Daily Fantasy Sports Gambling?", *Journal of Sports Analytics* 5(1):35–43 (2019). Neither full text acquired in this pass.

## Acquisition attempts (2026-11-07)

1. Handle URL https://hdl.handle.net/2097/35393 → landing page reachable (abstract verified); direct PDF fetch returned an empty body.
2. DSpace REST API `/server/api/pid/find?id=2097/35393` → no UUID returned, so the bitstream could not be addressed.
3. **Retry path:** resolve the item UUID through the K-REx UI/REST search endpoint in a live browser and fetch the bitstream from `krex.k-state.edu/server/api/core/bitstreams/<uuid>/content`.

---

# Code Notes — DFS optimizer repositories

Cloned 2026-11-07 into `~/workspace/dk-dfs-library/code/` (shallow clones). These notes describe how each codebase formulates the optimization: solver, objective, constraint mechanics, and stacking/correlation support.

---

## 1. pydfs-lineup-optimizer (DimaKudosh)

- **Repo:** https://github.com/DimaKudosh/pydfs-lineup-optimizer — HEAD `429db96` (2021-09-27), 708K. Python library; supports DraftKings/FanDuel/Yahoo and multiple sports.
- **Solver:** abstraction layer in `pydfs_lineup_optimizer/solvers/`. Default: **PuLP** (`PuLPSolver`, CBC backend). Optional: **python-mip** (`MIPSolver`), selected via the `SOLVER_BACKEND` environment variable.
- **Objective:** maximize $\sum_p (\text{points}_p \cdot x_p)$ over binary selection variables, where "points" come from a pluggable *points strategy* (`fantasy_points_strategy.py`):
  - `StandardStrategy` — raw projected fantasy points (fppg).
  - `RandomStrategy` — points perturbed per iteration: uniform deviation around the projection, or uniform draw in [floor, ceiling] when the player carries floor/ceiling values. This is the only stochastic element; it exists to diversify successive lineups, not to model outcome distributions.
  - `ProgressiveStrategy` — boosts the effective points of players not used in previous lineups, forcing rotation across iterations.
- **Constraint mechanics:** rules are first-class objects in `pydfs_lineup_optimizer/rules.py`, composed onto the solver model: `Objective`, `UniqueLineupRule` (no repeat lineups), `TotalPlayersRule`, `LineupBudgetRule` (salary cap), `LockedPlayersRule`, `PositionsRule` (incl. flex via position groups), `TeamMatesRule`, `MaxFromOneTeamRule`, `MinSalaryCapRule`, `ProjectedOwnershipRule` (cap/floor on summed projected ownership), `MinExposureRule`, `GenericStacksRule`, `LateSwapRule`, `RestrictPositionsForSameTeamRule`, `ForcePositionsForOpposingTeamRule`.
- **Stacking/correlation:** stacking is **structural only** — `stacks.py` defines `PlayersGroup`, `TeamStack`, `PositionsStack`, `Stack`, added via `optimizer.add_stack(...)` and enforced as constraints on co-selection. There is **no variance, covariance, or correlation term anywhere** — correlation enters only implicitly, by forcing correlated players to be selected together.
- **Exposure:** enforced *between* iterations, not inside a single solve — `exposure_strategy.py` (`TotalExposureStrategy`, `AfterEachExposureStrategy`) tracks per-player usage across the generated set and caps subsequent lineups.

## 2. draftfast (BenBrostoff)

- **Repo:** https://github.com/BenBrostoff/draftfast — HEAD `0f5f1f2` (2024-01-29), 3.6M. Python; DraftKings/FanDuel NFL/NBA/MLB/NHL + showdown and pick'em subpackages.
- **Solver:** **Google OR-Tools** `pywraplp`, **CBC** MIP backend (`draftfast/optimizer.py`). One `IntVar(0,1)` per player.
- **Objective:** `_optimize_on_projected_points` — coefficients are exactly `player.proj`; maximize $\sum_p \text{proj}_p x_p$. No alternative objective (no variance term, no ownership term in the objective).
- **Constraint mechanics:** assembled imperatively in `Optimizer.solve()`: salary min/max range, exact roster size, per-position counts, general-position (flex) counts, `_set_stack()` — an exact-count constraint on players from one team — plus `_set_stacking_type` position locks tied to the stack (e.g., QB + WR from the stacked team), combo constraints (must-include groups), a no-duplicate constraint against already-generated rosters, minimum distinct teams, minimum distinct matchups. Per-player directives (lock, ban, position lock/ban) come from `lineup_constraints.py` and CSV inputs.
- **Stacking/correlation:** like pydfs, stacking is an exact-count **constraint**, not a modeled correlation. No covariance matrix is read or computed; the word "correlation" does not correspond to any code path.
- **Exposure:** **post-hoc** — `exposure.py` parses min/max exposure CSVs, computes realized exposure tables over a generated set, and feeds bans/locks back into subsequent solves. Exposure is a workflow around the optimizer, not a constraint family inside one solve (contrast pydfs, where it is at least a strategy object in the generation loop).

## 3. RobustDFS (Mbeledogu) — author's code for the SSAC 2023 paper

- **Repo:** https://github.com/drmbeledogu/RobustDFS — HEAD `764ab9f` (2023-02-03), 5.4M. Companion to `dossiers/mbeledogu_2023.md`; the repo even bundles the manuscript (`Documents/SSAC23 RobustDFS Manuscript_Final.pdf`) and derivation notes.
- **Solver:** **Gurobi** (`gurobipy`), driven from Jupyter notebooks (`Scripts/optimize_lineup.ipynb`, functions in `Scripts/opt_functions.py`).
- **Formulation:** implements the paper's robust objective $\max_{\boldsymbol{x}}\ \boldsymbol{p}^{T}\boldsymbol{x}-\rho\|\boldsymbol{\Sigma}_{\boldsymbol{e}}^{1/2}\boldsymbol{x}\|_q$ in its box/polygon MILP linearizations; `Scripts/nearest_correlation.py` is the Higham nearest-correlation projection used to force the pairwise error-correlation matrix PSD before forming $\boldsymbol{\Sigma}_{\boldsymbol{e}}=\boldsymbol{D}_{\boldsymbol{e}}\boldsymbol{R}_{\boldsymbol{e}}\boldsymbol{D}_{\boldsymbol{e}}$.
- **Data:** `Data/udfs_data2021.csv` (2021-season projections/errors used in the paper's simulation).
- **Significance:** this is the only one of the three codebases in which a **covariance matrix enters the objective**. The two production open-source optimizers (pydfs, draftfast) both optimize raw projected points and handle "correlation" purely as stacking constraints and post-hoc exposure rules.

## Cross-cutting observation

The gap between the literature in `../dossiers/` and the open-source tooling is exact: Hunter–Vielma–Zaman's variance/covariance sequential IP, Haugh–Singal's benchmark-relative BQPs, and Mbeledogu's robust penalty all put a second-moment term in the objective; neither mainstream open-source optimizer has any second-moment machinery at all. Anyone building from pydfs/draftfast inherits a max-projected-points optimizer with constraint-based stacking, whatever the surrounding documentation claims about "correlation."

---

# PART D — Open-source sim repos dissected (incl. katana verdict)

# DS-4 — Repo Reverse-Engineering: Open-Source NFL DFS Simulation Code

Date: 2026-11-07 · Lane: DS-4 (DeepSeek sims investigation) · All claims below cite code (`file:line`) in the clones under `repos/`, not READMEs.

---

## 1. THE KATANA HUNT — verdict: NO DFS "katana" repository exists

GitHub repository search (api.github.com/search/repositories, 2026-11-07):

| Query | Total | What actually came back |
|---|---|---|
| `katana+dfs` | **0** | — |
| `katana+draftkings` | **0** | — |
| `katana+nfl` | **0** | — |
| `katana+fantasy` | 4 | A Minecraft knights mod (`gamerbenyt/knights-and-castles`), a Final Fantasy VII fan repo (`zarish01/Swords-Planet` — "Masamune is the great katana…"), two 2015 meme repos. No DFS. |
| `katana+simulation` | 7 | Katana **robot-arm** Gazebo simulations (`azmicibi/agvs_katana_simulation`, `jean-moorman/GazeboArm`, `UKMFKABRR/katana400_6m90a`), one 2D-soccer "Katana — Utility AI for football 2D simulation" (`auxeon/KatanaUtilityAI`, 1★ — RoboCup-style soccer AI, not NFL, not DFS), a portfolio website. |

Web search for a DFS product/tool named Katana: **NOT FOUND** either. What the name "katana" actually matches at scale:

- **projectdiscovery/katana** — a web crawling/spidering framework (Go, MIT, ~17.8k stars, github.com/projectdiscovery/katana). Security/OSINT tooling, zero fantasy content.
- **JohnHammond/katana** — a CTF (capture-the-flag) helper tool collection.
- **uos/katana_driver** — ROS drivers for the Neuronics Katana robot arm (includes Gazebo *simulation* of the arm — the source of most "katana + simulation" hits).
- **themsaid/katana** — a Laravel static-site/blog builder.
- **KATANA experiment (Jožef Stefan Institute)** — a nuclear water-activation loop at a TRIGA reactor, with a Python computational tool. Not software for DFS.
- **Katana (DeFi)** — Solana/Ronin yield/DEX protocols.

**Plain statement:** there is no plausible DFS or NFL-simulation repository named "katana" on GitHub, and no DFS product by that name surfaced on the web. The only "football + katana" artifact is a 2D soccer AI. If the name came from a podcast/video, it most likely refers to the projectdiscovery web crawler (used for scraping, not simulating) or is a misremembered name for one of the sword-branded sim products (SaberSim is the category's sword name).

---

## 2. REPOS DISSECTED

Cloned to `repos/` (git clone; two via codeload tarball after clone timeouts — content identical). A fifth target, **llfisher932/NFL-SIM** ("Gridiron Sim"), could **not** be cloned: codeload returns `404: Not Found` for both `main` and `master` and git clone fails on auth — the repo is deleted, private, or renamed as of 2026-11-07. Its indexed CLAUDE.md describes a drive-engine + Monte Carlo runner over nflverse play-by-play, with weather explicitly listed "out of scope" — cited here as index evidence only, NOT read code.

### 2.1 chanzer0/NFL-DFS-Tools — the classic-slate GPP contest simulator
52★ · created 2022-11-28 · last push 2025-09-04 · Python · core file `src/nfl_gpp_simulator.py` (2,514 lines; showdown twin `src/nfl_showdown_simulator.py`, 2,431 lines). Notably, this repo is **vendored inside nfl-edge** (`nfl-edge/vendor/NFL-DFS-Tools/`) — the open-source ecosystem literally reuses it.

**What is sampled:** player fantasy points, one independent *game* at a time. Each game (both teams' players together) is simulated in isolation (`run_simulation_for_game`, `nfl_gpp_simulator.py:1500`), games are run in parallel via `multiprocessing.Pool.starmap` (`:2119-2120`), and player result arrays are merged into one (players × iterations) matrix scored against the whole field (`:2128ff`). **No plays, drives, or game script are simulated** — the game is a correlation container, nothing more.

**Distributions — fitted marginals, not normals.** Each player's marginal is chosen from a pre-fitted distribution library (`distribution_data/fp_distributions_draftkings.csv`): the player's projection selects a *projection window* row for his position (`get_distribution_params`, `:636`), and the CSV carries fitted parameters plus fit statistics (log-likelihood, AIC, BIC, Anderson–Darling) for families including exgaussian, skew_normal, lognormal, weibull, generalized_gamma, shifted_gamma, gamma, nbinom, poisson, zero-inflated poisson. Sampling dispatches per family (`:1570-1648`). Afterwards every player's samples are **affine-rescaled to exactly the user's projection mean and StdDev** (`affine_match`, `:1574`; re-applied after correlation, `:1741-1751`), clipped at mean + 5σ and floored at 0. So the fitted shape (skew/kurtosis) is kept but location/scale come from the user's projection file. Fallback when no distribution row exists: plain Normal(projection, StdDev) (`:1585`). If StdDev is missing, config defaults apply as variance ratios: QB 0.4, skill 0.5, DST 0.5 (`sample.config.json`).

**Correlation — empirical, imposed by Iman–Conover rank reordering.** Pairwise correlations come from data files, not assumptions:
- Primary: `fp_correlations_draftkings.yaml` — empirical correlations keyed by (position₁, position₂, same/opp team, projection-window₁, projection-window₂), each entry carrying its `n_samples` (e.g., RB–WR same-team, windows 1–3 vs 3–5: −0.0274, n=1,566). Lookup at `:1503-1522`, clipped to ±0.95 (`:1542`).
- Fallback: `fp_correlations_draftkings.npz` per position-pair/team-relation (`:1543-1547`); then user `custom_correlations` rules from config (`load_correlation_rules`, `:789`); then 0.
- The per-game correlation matrix is built pairwise (`build_covariance_matrix`, `:1649`), forced PSD by eigenvalue clipping + renormalization (`ensure_positive_semidefinite`, `:1663`), and correlation is imposed **without disturbing the marginals**: Cholesky-correlated standard normals are generated and each player's independent samples are **rank-reordered to match** (Iman–Conover, `:1716-1730`). If Cholesky fails, the game silently falls back to uncorrelated samples (`:1731-1733`).

**The field (opponents) is simulated too.** Field lineups are *generated*, ownership-weighted with a salary boost (`salary_boost`, `:28`; `adjust_probabilities`, `:1135`), with stack construction built in: config defaults put **65% of the field on stacks and 40% on double stacks** (`pct_field_using_stacks`, `pct_field_double_stacks` in `sample.config.json`), generated by `build_stack`/`generate_field_lineups` (`:1142`, `:1276`), subject to the same stack rules the optimizer uses (QB + 2 same-team WR/TE, +1 opp-team bring-back — `stack_rules` in config). Payouts come from a user-supplied `contest_structure.csv`; the tournament loop ranks all field lineups per iteration and aggregates wins / Top-1% / ROI per lineup (`run_tournament_simulation`, `:2093`; `calculate_payouts`, `:2061`). Users may instead upload a real field (`tournament_lineups.csv`, `load_lineups_from_file`, `:994`).

**Context inputs — from the code, not the README:** projections CSV (Fpts, Own%, StdDev), DraftKings player pool, contest structure, config rules. **No weather, no Vegas lines, no coaching, no pace, no usage inputs exist in the simulator** (grep for weather/vegas/spread/wind/coach/pace across `src/` returns only the word "window"). All "context" enters only insofar as the user's projection/StdDev numbers already contain it.

**Sim counts:** user-supplied CLI argument, no code default (`src/main.py:39-56`); the README's worked example runs **10,000** iterations. No stated statistical reason for any count anywhere in the repo.

**Validation/tests:** **none.** No test files exist in the repo (only `readme_images/contest_structure_input.png` matches "*test*"). The distribution CSVs carry their own fit statistics (AIC/BIC/AD) — that is the only quantitative validation artifact in the tree.

### 2.2 thekid1101/DFS-FUN-SHOWDOWN — Showdown GTO portfolio builder (copula engine)
0★ · created 2026-01-28 · last push 2026-02-02 · Python package `showdown_gto/` · single-game (DK Showdown: 1 CPT @1.5× + 5 FLEX) only — but it is the most mechanistically explicit sim engine of the four.

**What is sampled:** player scores for the two teams of one game. Marginals are **not parametric**: each player's outcome distribution is a user-supplied **percentile curve**, turned into an inverse CDF by linear interpolation, with the tail extrapolated (p100 = 1.2 × p99) (`simulation/engine.py:187-234`).

**Correlation — two stacked mechanisms:**
1. **Copula on the percentile marginals.** Correlated uniforms from a Gaussian copula (default) or Student-t copula with df=5 for tail dependence (`engine.py:20, 254-299`); uniforms are pushed through each player's inverse CDF.
2. **Hierarchical game-environment factor in score space** (`_apply_game_environment`, `engine.py:97-186`): each player has a `game_share` (fraction of his variance that is game-level). Per sim, correlated team game factors g ~ MVN(0, team_corr) are drawn with **cross-team correlation 0.45** (shootout coupling, `:33, 144-155`); each player's score is compressed toward his projection by √(1−game_share) and shifted by √(game_share)·std·g (`:170-176`). Worked example in the docstring: pocket QB (game_share 0.82, std 7.5) in a +2σ shootout sim gains +13.6 pts; an alpha WR (game_share 0.11) gains +5.3.

**Where the numbers come from — an archetype system with empirical dressing.** Players are classified into 17 archetypes (POCKET_QB, BELLCOW_RECEIVING_RB, ALPHA_SLOT_WR, …; `data/correlations.py:19-27`). Correlations are archetype-pair constants loaded from `correlation_config_v2.json` (same-team and opponent matrices; e.g., POCKET_QB–ALPHA_OUTSIDE_WR +0.428, POCKET_QB–ELITE_TE +0.358, QB–QB −0.479); pairs missing from the config fall back to hard-coded 0.05 same-team / 0.02 opponent (`data/correlations.py:75-79`). The config's variance decomposition carries `sample_size` per archetype (POCKET_QB: game_share 0.817, total_variance 67.9, n=1,712; ALPHA_OUTSIDE_WR: game_share 0.108, n=2,878) and its metadata describes "rolling weighted classification with team-adjusted metrics," decay factor 0.85, and usage thresholds (snap %, target share, aDOT, slot rate) — i.e., the parameters claim an empirical fit by the repo's own pre-processing layer (`pre_processing_layer/scripts/`: `advanced_archetype_tagger.py`, `scheme_environment_tagger.py`, `hidden_correlations_tagger.py`, `tag_effects_quantifier.py`, `weighted_decay_utils.py`), though the fitting code's outputs in-tree are two sample games' tag files.

**Context inputs — real, and coded:** **Vegas spread and game total** are parsed into a `GameContext` (team implied totals) used for *conditional correlation modifiers* (`data/effects.py:26-31, 92ff`); per-role distribution parameters (CV, floor %, ceiling %) come from `simulation_config_v3.json` (`data/effects.py:34-38`); scheme/environment tags encode formation-based correlation effects ("shotgun, PA, box counts" — `scheme_environment_tagger.py:742`). **No weather inputs found** in the engine or taggers.

**The field and portfolio layer:** opponent fields are sampled with Boltzmann weights ∝ exp(sharpness × z_quality) × ownership^ownership_power, defaults **sharpness 5.0, ownership_power 0.5** (`field/generator.py:353-425`). A **distributionally robust (DRO)** variant perturbs the field before trusting EV: CPT ownership via Dirichlet sampling (α floored at 0.01), FLEX ownership via three-factor logit-space noise (global 20% / team 40% / role 20% / idiosyncratic 20%), and field condensation perturbed in HHI space via a sharpness↔HHI calibration curve (`field/robust.py:5-9, 41-210`). Portfolio EV accounts for self-competition among your own entries (`ev/portfolio.py`).

**Sim counts — the 100k answer, in code:** the pipeline **defaults to n_sims = 100,000** (`pipeline.py:49, 542`; CLI default likewise, `cli.py:40`), with greedy portfolio selection capped at min(n_sims, 10,000) sims (`cli.py:112`). No comment states a statistical reason; structurally, a single-game slate has a small outcome space and the tool ranks a *portfolio's* EV differences, which are small relative to outcome variance — the count is brute-force precision, bought cheap because one game × ~30 players is a tiny matrix.

**Validation/tests:** `showdown_gto/tests/` contains only `__init__.py` — **no unit tests**. Validation exists as standalone diagnostics: `scripts/validate_correlations.py` (PSD check + nearest-PSD projection + empirical Spearman check of simulated vs intended correlations) and `scripts/validate_ownership.py`. They are scripts a user runs, not a test suite.

### 2.3 jrakestr/nfl-edge — drive-level game simulator feeding DFS (the game-sim layer)
0★ · created 2026-09-05 · last push 2026-11-02 (active) · Python (polars/numpy) · `src/nfl_edge/sim/` + `priors/` · **vendors chanzer0's NFL-DFS-Tools** for its contest layer.

**What is sampled:** the *game itself*, at drive level — the only repo of the four that simulates football rather than fantasy points. Per draw (`sim/game.py:1-15`, the module docstring is the spec):
- **drives** ~ round(Normal(mean of both teams' drives_mean, 1.0)), clipped 6..16 — drawn **once per game and shared by both teams** with small independent jitter (`:164-167`). Shared pace is correlation mechanism #1.
- **points per drive**: `ppd_adj = league_ppd + (off_ppd − league) + (def_ppd_allowed − league) + HFA/rest/wind/Elo terms`, solved into a per-drive TD probability `p_td = (ppd_adj − 3·fg_per_drive) / (7·(1 − fg_per_drive))` clipped [0.05, 0.6] (`:13, 113`); FG ~ Bin(drives, fg_per_drive) with the team FG rate **held fixed**; TD ~ Bin(drives − FG, p_td) (`:128-133`).
- **game script feeds back inside the sim**: pass rate shifts with the *simulated* margin — `rate = neutral_pass_rate − 0.03·sign(margin)·√|margin|` — and plays/drive rises for the trailing team (`SCRIPT_PPD_K = 0.01`) (`:135-150`). A team that falls behind in-sim throws more in-sim. This is situational context as a mechanism, not an input column.

**Player allocation — Dirichlet-multinomial shares over the simulated team totals** (`sim/players.py`): targets = Multinomial(pass_att, Dirichlet(conc × target_share)) with concentration default **40** (`:5, 89-90, 161`); red-zone targets/carries use their own share columns (`SHARE_COLS`, `:31`); receptions/TDs chained through binomial and hypergeometric draws (including a QB2-split path, `:182-230`); yards are **gamma per touch** (shape 1.0 per reception, 0.8 per carry; `:145-152, 163-164`); fumbles ~ Binomial(touches, fum_rate) (`:230`). Correlation is **structural**: players divide a fixed simulated team pie, so same-team pass-catchers compete (negative) while QB and his receivers rise together through shared team pass volume and TDs (positive) — no correlation matrix anywhere.

**Context inputs — the richest of the four, all as priors:** team priors (drives/game, plays/drive, neutral pass rate, FG/drive, pass-TD share, sack/INT rates) from `priors/` modules (elo, usage, efficiency, defense, qb, kicking, depth, role, calibration); per-player **usage shares** (target/carry/RZ shares — coaching/role context, validated to sum per team, `players.py:66-73`); **weather**: GameContext carries `wind_mph` and `roof`, and an outdoor game over the wind threshold costs each team **1.5 points** (`game.py:56, 101-106`); plus HFA, rest differentials, and Elo margin (`:105-106`). Vegas lines are **not** an input to the sim (they are the benchmark it grades against, per AGENTS.md).

**Sim counts:** DFS runner default **iterations = 5,000** (`dfs/run_sim.py:22`). The slate layer converts draws into DK percentiles (p10/p90, boom = DK ≥ 3× salary/1000, bust = < 1×) (`sim/slate.py:253-261`).

**Validation/tests — the strongest of the four:** a real pytest suite. `tests/test_sim_invariants.py` asserts *exact* structural identities: drives–plays coupling exact (`:95`), scoring decomposition exact (`:102`), mean points match E[drives] × ppd_adj (`:111`), FG rate held fixed (`:119`), HFA shifts spread only (`:124`), neutral-site handling (`:131-143`). `sim/slate.py` also runs numbered self-checks at runtime (check (5): simulated mean points vs analytic expectation, `:317-336`), and the project's backtest command is an acceptance gate (`uv run nfl-edge backtest` "passes when every acceptance check prints true").

### 2.4 bpattypick/dfs_opto — field generator + ownership baseline (contest sim, partially built)
2★ · created 2026-07-28 · last push 2026-10-18 · Python · Showdown-first, DK NFL.

**What exists in code:** (a) an **ownership estimator with no training data**: run the pydfs optimizer **n = 1,000** times over lightly randomized projections and count how often each player lands in the optimal lineup — the "optimal-rate baseline" (`src/ownership.py:1-16, 140-150`; it imports Lane C's pydfs-lineup-optimizer, `:26`); (b) a **field generator** that samples DK-legal opponent lineups slot-by-slot with **deficit weighting** — each player's weight tracks how far he still is from his target selection count for the field — plus a legality-preserving **repair pass** that swaps over-target players out (`src/field.py:3-15, 93-99, 171-255`); (c) standings ingest that parses real DK contest CSVs into actual-ownership and payout tables (`src/ingest/`, TASKS T5).

**What does NOT exist in the cloned tree:** the Monte Carlo outcome layer (score the field per trial, rank, map to payouts, accumulate ROI — specified as task T6 in the repo's TASKS/commits) has **no implementation in `src/`**; `src/scoring.py` scores a lineup deterministically from a points mapping. The repo's own product-vision doc rates its platform "Simulator: Not started" for the broader build. Honest label: a well-tested field/ownership spine with the contest-outcome engine still on the roadmap.

**Sim counts:** the only count in code is the ownership baseline's n=1,000 optimizer runs (`ownership.py:16`). **Tests:** 6 test files (field, ownership, scoring, ledger, crosswalk, dk_salaries); the T5 commit reports realized ownership within ~0.03 per slot against a stated 0.05 test tolerance.

---

## 3. BOUNDARY NOTE (Task 4)

Lane C's two optimizer codebases — `pydfs-lineup-optimizer` and `draftfast` (cloned at `~/workspace/dk-dfs-library/code/`) — contain **no simulation code** (grep for monte/simulation across both trees: no hits; both are deterministic ILP/heuristic optimizers over point projections). Nothing for DS-4 to add; left entirely to Lane C. One cross-link worth recording: dfs_opto's ownership baseline is *built on* pydfs (`ownership.py:26`), and nfl-edge *vendors* NFL-DFS-Tools — the open-source DFS stack is a small family tree, not independent implementations.

## 4. CROSS-REPO ANSWERS TO THE STANDING QUESTIONS

- **Why ~10⁵ sims?** Only one codebase defaults there: DFS-FUN-SHOWDOWN at **100,000** (`pipeline.py:49`) — for a *single game*, where the player matrix is tiny and the product being sold is fine-grained portfolio EV separation. The classic-slate contest sim (NFL-DFS-Tools) is run at **10,000** in its own worked example; the drive-level game sim feeding DFS (nfl-edge) defaults to **5,000**. No repo states a statistical derivation for its count; counts scale inversely with per-sim cost and with how small the EV differences are that the tool claims to rank. In every case, N sims are N draws from the *same input distributions* — the count buys ranking precision, not new information; the information content is fixed by the projections/percentiles and correlation inputs.
- **What context is actually inside the sims?** Vegas lines: DFS-FUN only (spread/total → conditional correlation modifiers). Weather: nfl-edge only (wind/roof → −1.5 pts/team). Coaching/usage: nfl-edge (usage-share priors + in-sim game-script pass-rate feedback) and DFS-FUN (archetype classification from usage thresholds + scheme tags). Pace: nfl-edge (shared drive draw). The most-used contest sim (NFL-DFS-Tools) contains **none** of these — context exists only inside the user's projection numbers.
- **How is correlation produced?** Four different answers: empirical position-pair/window correlations imposed by Iman–Conover rank reordering (NFL-DFS-Tools); archetype-pair constants through a Gaussian/t copula **plus** a hierarchical game-environment factor (DFS-FUN); structural, from dividing simulated team totals via Dirichlet-multinomial shares (nfl-edge); and not at all yet (dfs_opto — ownership/field layer only).
