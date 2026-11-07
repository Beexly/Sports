# DraftKings DFS — The Deep Dive (2026-11-07)

**Commissioned by Garrett, 2026-11-07. Research only — no decisions, no recommendations.**
Scope: lineup construction; the history and year-by-year evolution of winning lineups; the actual 2026 Weeks 1–8 winners of the Millionaire Maker (Sunday main slate) and the extended Sunday–Monday Classic; the books and academic literature at full depth; the mathematics of lineup optimization and leverage.

**How this extends what the corpus already held (not a repeat):**
- The 2026-09-25 GPP construction research (in this repo: `docs/research/2026-09-25/gpp-winning-lineup-construction.md`) established the top-10/top-100 construction profile: QB stack in 95.3% of Milly Maker top-10s; QB+exactly-2 in 39.5% of top-100 vs 28.6% of the field; bring-back WR 48% vs 25.5%; winners' avg spend $49,893; cumulative-ownership barbell ~100–125%; mid-tier DST; punt-or-premium TE; TE-in-FLEX and mid-tier TE negative at top-100 level. This dive adds the **winner-level (1st place) 2026 evidence**, the **era-by-era history**, the **literature**, and the **methods** — and flags where winner-level 2026 data diverges from the top-100 profile (TE-in-FLEX, below).
- The DFS Army study behind Part 4's *Cracking the DFS Code* (Kevin "Geek" Alan, 2026): publisher-stated as 232,000 lineups / 376 tournaments in Garrett's Oct 29 dissection; the book's own video describes 230,000 top-100 lineups over 4 seasons. Both figures are recorded in Part 4; the raw lineups are not public.
- Open-source optimizer dossiers already in this corpus (`docs/research/2026-10-02/repo-intel/`: pydfs-lineup-optimizer, RobustDFS, evolve-dfs, NFL-DFS-Tools, dfs_optimizers, DFSLineupOptimizer + `docs/strategy/dfs-tooling-vetting-2026-09-12.md`) are the local companion to Part 5's tools landscape.

**Sourcing standard:** every lineup and number below carries its source URL in the research report. Figures computed from published per-player data are marked [computed]; salaries rebuilt from pre-slate pricing rather than a contest-standings table are marked [reconstructed]; anything not found is listed as NOT FOUND — nothing was filled in by invention.

---
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

# APPENDIX — Completion-Gap Audit & Corpus Notes (Motif, 2026-11-07)

## The one big miss, stated plainly
**Part 2 (Sun–Mon extended Classic winners, Weeks 1–8) is a negative result.** The slate exists — tools label it "Classic (Sun-Mon)"; Week 1 ran 14 games vs the 12-game main slate, Week 3 ran 15 — but no recap series, standings table, or winner report for it exists anywhere the research could reach, for any of the eight weeks. DK Network and the recap ecosystem cover only the main slate. The name "Extended All-Day" also does not exist as a DraftKings contest name in any source found. Closing path: DraftKings publishes full contest standings only inside the contest itself — a standings export from an account that entered those contests (Garrett's own DK account history is the realistic source), or the DK lobby's completed-contest files. Until then, the Sun–Mon winner construction record for 2026 is **unpublished data**, and the corpus's only Sun–Mon-specific structural finding remains the Sept 25 one (per-player lock → Monday FLEX late-swap edge), which Part 2's generic late-swap documentation supports but cannot extend with winner data.

## Remaining gaps by part
- **Part 1:** Week 4 is the weakest record (DK published the lineup as a screenshot; Ertz salary, Jaguars DST salary, total spent, entry count, and full ownership NOT FOUND; Lamb salary conflict $7,800 ×2 sources vs $8,600 ×1 stands unresolved). Weeks 6 and 8 salaries are [reconstructed] from pre-slate pricing — both sums reconcile exactly to $50,000 / $49,900, a strong cross-check, but they are not standings-table values. Week 7: Bucs DST salary and total spent NOT FOUND. Week 2 entry fee not stated in sources read.
- **Part 3:** era datasets are publisher studies with stated sample sizes (FootballGuys 2014–15 economics; Holka 2015 top-10s; DFS Army cumulative ownership 2020→2021; EdgeLine 80 winners 2021–25; GamblingSite 36 winners 2024–25). No single public dataset spans 2013–2026 at lineup level; the year-by-year line is a chain of these studies, not one panel.
- **Part 4:** *Cracking the DFS Code* ISBN NOT FOUND. All links in the table are legitimate channels (publisher/author/arXiv/SSRN/journal/university repository); a Scribd copy of Miller & Davidow surfaced during research and was deliberately excluded. Full texts themselves are linked, not yet downloaded into the library — acquisition is a separate pass.
- **Part 5:** three measured values could not be found anywhere: (1) a measured RB-vs-opposing-DST correlation coefficient, (2) a rigorous duplication/train study, (3) a peer-reviewed projection-accuracy benchmark for NFL DFS. The popular "QB–WR correlation 0.7+" claim is contradicted by the measured RotoWire 2022–25 values in Part 5 (QB–WR1 +0.31, QB–TE +0.27) and the measured values are the ones recorded.

## Divergences flagged, not smoothed (no decisions taken — Garrett's call)
1. **TE-in-FLEX:** 4 of the 8 actual 2026 winners (Wks 2, 3, 4, 8) ran a TE in FLEX, against the corpus's Sept 25 top-100 finding that TE-in-FLEX is negative. Both can be true (winner n=8 vs top-100 samples); the tension is now documented in both places.
2. **Bring-back rate:** winners brought back in only 4 of 8 weeks, below the Sept 25 top-lineup rate of 48% — again winner-level vs top-100 sampling.
3. **QB stack shape:** 7 of 8 winners stacked (one naked QB, Wk 6 — who still carried an RB bring-back); QB+2 was the modal winner shape (4 of 8).
4. **Contest identity:** the 2026 flagship was not uniformly $20 — Week 1 was a $5-entry, $3.5M, 832,342-entry edition; guarantees stepped down $3.5M → $3M → $2.75M → $2.5M across Weeks 1–8.

## Engine-training value (for the GSE/GSI corpus)
- The 8 coded 2026 winners are labeled training rows for winner-construction distributions: stack size, bring-back presence/position, FLEX position, salary allocation by slot, cumulative ownership, winning score by slate size (10–13 games) and guarantee tier.
- Measured correlation values (Part 5) are the citable inputs for stack-correlation features; the HVZ variance-floor + inter-entry correlation-cap formulation and the Haugh–Singal ownership model (with its documented ~2.4× optimizer's-curse over-prediction) are the two peer-reviewed portfolio-construction references.
- The Part 3 era chain gives the concept-drift record: winner stack rates and cumulative ownership by year (DFS Army 108% 2020 → 96.36% 2021; EdgeLine stack rate 100% → 72.7% across 2021–25) for any model that conditions construction on field behavior.
