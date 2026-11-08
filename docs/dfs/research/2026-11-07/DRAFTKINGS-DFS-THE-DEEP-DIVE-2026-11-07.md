# DraftKings NFL DFS — The Deep Dive

**Date:** 2026-11-07. This document records what was found — winners, datasets, papers, simulation engines, tools, and books — at the deepest level the public record, the shipped code, and the acquired full texts allow. 

**How this was built.** Seven research lanes ran on 2026-11-07: two web-research passes (the 2026 winners and history; then datasets, full texts, and pro process), a library lane that acquired and deep-read the core papers as PDFs, four DeepSeek dossiers plus a code-dissection lane on the simulation question, a bundle-level "teeth" pass over 16 DFS/props tools (their own shipped JavaScript, crawled surfaces, and certificate-transparency subdomain maps), and a code-level dissection of the six-repo recon stack Garrett supplied. Every claim below traces to one of those lanes and, through them, to a primary source: a contest recap, a paper's full text, a vendor's own documentation, or a line of shipped code.

**Evidence labels.** Numbers are flagged where their basis matters: **[computed]** = arithmetic done by the research lanes from published per-player figures; **[reconstructed]** = salaries rebuilt from pre-slate pricing sources rather than a standings table (DraftKings' own standings CSVs expire 10 days after a contest — Part IV); **[vendor]** = a vendor's own claim, not independently verified; **[code]** = read in shipped code, with the file named. Two DeepSeek lanes (the SaberSim and distribution-sims dossiers) had their live page-fetching blocked mid-run and worked from search-index excerpts plus the bundle evidence; their claims are graded accordingly wherever they are load-bearing, and the bundle/teeth evidence wins any conflict.

**The short version, for orientation.** All eight 2026 Millionaire Maker winners were found and construction-coded (Part I). The Sun-Mon Classic flagship winner does not exist in any public record, for any week, in any season searched — and Part IV explains the mechanism that guarantees that: DraftKings deletes the only primary record 10 days after each contest. No free lineup-level NFL dataset exists anywhere; one paywalled archive (STAT-API) holds the real thing. The academic literature was acquired and read at equation level (Part V): the field's core result is that picking winners is a submodular portfolio problem, and its most honest empirical finding — published by the optimizers themselves — is that expected profit exceeded realized profit in every contest type they tested. The "90,000 simulations" question resolves into arithmetic (Part VI): 90,000 is the count at which a top-0.1% finish probability is estimated to \~10% relative precision; it is roughly 111× too few to estimate a first-place probability, and the top lineup any such engine displays is over-predicted by a factor of \~2.9 by selection bias alone — a number the one vendor who publishes a calibration report card confirms almost exactly (predicted +98% vs realized +32% in his top bucket, on 777,590 real lineups). No vendor ships its simulation math to the browser; every engine is server-side, and the only client-side model code found in 16 tools is a percentile multiplier (Part VII). The deepest simulation methodology published anywhere is open-source (Part VIII).

---

## PART I — The 2026 Millionaire Maker winners, Weeks 1–8

Primary sources: DraftKings Network's weekly winning-lineup recaps and GamblingSite.com's weekly recap tables (salary/ownership/points stated there to be taken from DraftKings contest standings). All eight winners were found. Salary and ownership tables are complete for Weeks 1, 2, 3, 5; partial or reconstructed for Weeks 4, 6, 7, 8, each gap flagged in-line and again in Appendix B.

**A correction to the premise this research was assigned under:** the 2026 flagship was not uniformly a $20 buy-in. Week 1 ran as a **$5-entry** NFL $3.5M Fantasy Football Millionaire with **832,342 entries**; the guarantee then stepped down $3.5M → $3M → $2.75M → $2.5M across the eight weeks. Every week ran a Millionaire Maker in some form; none was cancelled.

### The eight winners, coded

| Wk | Winner | Score | Spent | QB stack | Bring-back | FLEX | Cum. own. |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | jwussow28 | 273.98 | $50,000 | QB+1 | No | RB | 100.8% |
| 2 | elidkatz1 | 232.38 | $50,000 | QB+2 | No | TE | 97.0% |
| 3 | 180DegreesMiami | 239.80 | $50,000 | QB+2 | Yes (2 players) | TE | 121.6% |
| 4 | oluseyeajayi1973 | 234.20 | not found | QB+1 | Yes (WR) | TE | not found |
| 5 | ilanwor | 250.06 | $50,000 | QB+1 | No | RB | 140.4% |
| 6 | CMACXIMUS | 210.50 | $50,000 [recon.] | Naked | Yes (RB) | RB | not found |
| 7 | dfs\_ads | 225.42 | not found | QB+2 | No | RB | not found |
| 8 | Hebrewcheetah | 259.08 | $49,900 [recon.] | QB+2 | Yes (TE) | TE | ≈106.2% |

Winning scores: mean **240.68 [computed]**. A season tracker put the average winning score through Week 7 at 238.02 vs 236.35 for 2025, and noted five of the seven 2026 winners carried a sub-15-point slot.

**What the eight winners say, against the pre-existing corpus baseline** (the 2026-09-25 GPP construction research: \~95.3% of Milly top-10s QB-stack; QB+exactly-2 in 39.5% of top-100s vs 28.6% of the field; bring-back WR in 48% of top lineups vs 25.5% of the field; average winner spend \~$49,893; cumulative ownership barbell \~100–125%):

- **7 of 8 winners QB-stacked**; QB+2 was the modal build (4 of 8). The one naked QB (Week 6) still carried a running-back bring-back from the same game.
- **Bring-backs appeared in 4 of 8** (Weeks 3, 4, 6, 8) — consistent with the baseline's \~48%.
- **The divergence, flagged and not resolved:** a tight end sat in the FLEX in **4 of the 8 actual winners** (Weeks 2, 3, 4, 8), while the top-100 baseline research found TE-in-FLEX to be a negative signal. Winners are a sample of eight 1st-place lineups, not top-100 finishes; both statements can hold at once, but the winner-level 2026 evidence does not match the baseline's TE-FLEX characterization. This document records the divergence; it does not adjudicate it.
- Winners spent essentially the whole cap wherever the total is known ($50,000 four times, $49,900 once; two weeks unrecoverable).
- Winning margins were thin: Week 4 was won by **0.2 points**; Week 6's 210.50 is the lowest winning score of the eight weeks and still required the slate's top RB, top TE, and top individual score (Nabers, 31.5).

### Week 1 — jwussow28 — 273.98 pts — $1,000,000

$3.5M Millionaire, $5 entry, 832,342 entries. Won by 5+ points; the winning entry was the user's 2nd entry.

| Slot | Player | Salary | Owned | DK Pts |
| --- | --- | --- | --- | --- |
| QB | Jordan Love | $5,700 | 1.7% | 24.48 |
| RB | Jahmyr Gibbs | $8,000 | 42.8% | 37.60 |
| RB | Derrick Henry | $6,700 | 9.3% | 38.30 |
| WR | Christian Watson | $5,900 | 4.3% | 35.70 |
| WR | DJ Moore | $5,600 | 4.4% | 24.00 |
| WR | Jalen Coker | $4,600 | 7.5% | 36.80 |
| TE | Dallas Goedert | $4,100 | 10.1% | 23.70 |
| FLEX | D'Andre Swift (RB) | $6,100 | 9.8% | 35.40 |
| DST | Steelers | $3,300 | 10.9% | 18.00 |

Construction: QB+1 (Love–Watson, Green Bay); no formal bring-back (a secondary cross-game correlation paired Swift (CHI) opposite Coker (CAR) from the 59–37 CHI–CAR game). Three RBs rostered; five players scored ≥35; six of nine under 10% owned. Cumulative ownership 100.8% [computed].

### Week 2 — elidkatz1 — 232.38 pts — $1,000,000

$3M Millionaire, 172,761 entries. Won by 5.72 points; the winning entry was the user's 49th entry.

| Slot | Player | Salary | Owned | DK Pts |
| --- | --- | --- | --- | --- |
| QB | Brock Purdy | $6,200 | 9.5% | 28.48 |
| RB | Christian McCaffrey | $8,000 | 22.9% | 22.60 |
| RB | J.K. Dobbins | $5,000 | 2.5% | 3.60 |
| WR | Jaxon Smith-Njigba | $8,100 | 10.2% | 45.50 |
| WR | CeeDee Lamb | $7,300 | 19.0% | 38.30 |
| WR | Tre Tucker | $4,500 | 0.7% | 25.90 |
| TE | Dalton Schultz | $3,200 | 22.4% | 29.00 |
| FLEX | George Kittle (TE) | $4,600 | 4.5% | 18.00 |
| DST | Patriots | $3,100 | 5.3% | 21.00 |

Construction: QB+2 team stack (Purdy + McCaffrey + Kittle, San Francisco), no bring-back, **double TE**. Seven of nine players from the late-afternoon window. Won despite a 3.6-point slot (Dobbins). The stack game (SF–MIA) closed at a 44.5 total with San Francisco's implied team total 28.5, the slate's highest. Cumulative ownership 97.0% [computed] — the lowest of the fully tabulated weeks.

### Week 3 — 180DegreesMiami — 239.80 pts — $1,000,000

$2.75M Millionaire, 161,764 entries, $20 entry. Won by 6.70 points; the winning entry was the user's 10th entry.

| Slot | Player | Salary | Owned | DK Pts |
| --- | --- | --- | --- | --- |
| QB | Geno Smith | $4,900 | 7.5% | 30.04 |
| RB | Jahmyr Gibbs | $8,800 | 26.8% | 41.40 |
| RB | Jaylen Warren | $5,700 | 13.1% | 23.60 |
| WR | Jaxon Smith-Njigba | $8,600 | 18.9% | 38.36 |
| WR | Garrett Wilson | $6,300 | 27.9% | 29.70 |
| WR | Jameson Williams | $5,400 | 8.9% | 8.90 |
| TE | Kenyon Sadiq | $3,500 | 6.0% | 26.50 |
| FLEX | Juwan Johnson (TE) | $3,700 | 5.9% | 24.30 |
| DST | Vikings | $3,100 | 6.6% | 17.00 |

Construction: QB+2 (Smith + Wilson + Sadiq, NY Jets) **plus a 2-player bring-back** (Gibbs + Jameson Williams, Detroit) — a 5-player game stack of NYJ at DET (closed 49.5 total, 3rd-highest on the slate; finished 31–24). **Double TE.** Smith at $4,900 was the cheapest winning QB of the eight weeks. Cumulative ownership 121.6% [computed].

### Week 4 — oluseyeajayi1973 — 234.20 pts — $1,000,000

$2.75M Millionaire, 12-game main slate. Won by **0.2 points**. DraftKings published this week's lineup only as a screenshot image; no standings table exists in the text layer of any source found, so the record is the thinnest of the eight.

| Slot | Player | Salary | DK Pts |
| --- | --- | --- | --- |
| QB | Dak Prescott (5.2% owned) | $6,400 | 21.1 |
| RB | Kyren Williams | $5,900 | 36.7 |
| RB/FLEX | Javonte Williams (1.5% owned) | $6,600 | 31.3 |
| WR | CeeDee Lamb | $7,800 ⚠ | 44.3 |
| WR | Nico Collins | $7,200 | 33.8 |
| WR | Zay Flowers | $6,900 | 28.8 |
| TE | Zach Ertz | not found | 3.3 |
| TE/FLEX | T.J. Hockenson | $3,300 | 27.9 |
| DST | Jaguars | not found | 7.0 |

⚠ Lamb's salary conflicts across sources ($7,800 in two, $8,600 in one — DraftKings' own Millionaire Picks article); recorded, not resolved. Construction: QB+1 (Prescott–Lamb) with a WR bring-back (Collins, opposite side of DAL at HOU, final 34–30) plus same-team RB Javonte Williams; **double TE** (slot order inferred from DK's narrative, not text-confirmed). Two slots scored under 15 points (Ertz 3.3, Jaguars DST 7.0) and the lineup still won; Lamb's 44.3 was the slate's top score.

### Week 5 — ilanwor — 250.06 pts — $1,000,000

$2.75M Millionaire, 161,557 entries, 11-game slate. Won by 6.02 points; the winning entry was the user's **72nd entry**.

| Slot | Player | Salary | Owned | DK Pts |
| --- | --- | --- | --- | --- |
| QB | Drake Maye | $6,300 | 4.3% | 42.46 |
| RB | Jaylen Warren | $6,700 | 17.9% | 39.80 |
| RB | D'Andre Swift | $6,200 | 41.3% | 17.30 |
| WR | Tre' Harris | $4,100 | 18.3% | 3.60 |
| WR | Christian Watson | $6,400 | 9.3% | 35.30 |
| WR | DeMario Douglas | $3,500 | 1.2% | 22.50 |
| TE | Isaiah Likely | $4,300 | 11.9% | 32.40 |
| FLEX | Jahmyr Gibbs (RB) | $9,800 | 26.6% | 40.70 |
| DST | Jets | $2,700 | 9.6% | 16.00 |

Construction: QB+1 minimum stack (Maye–Douglas cost $9,800 combined), no bring-back. The lineup held the slate's four highest scorers overall (Maye, Gibbs, Warren, Watson) plus the top-scoring TE. Cumulative ownership **140.4% [computed]** — the highest of the fully tabulated weeks, driven by rostering the slate's most-owned player (Swift, 41.3%).

### Week 6 — CMACXIMUS — 210.50 pts — $1,000,000

$2.75M Millionaire, 10-game slate, $20 entry, 161,516 entries (per TwoGunGPT's simulation article, which also states a 15% rake for this contest). The lowest winning score of Weeks 1–8. Salaries **[reconstructed]** from pre-slate pricing sources; they sum to exactly $50,000, a strong cross-check, but they do not come from a standings table.

| Slot | Player | Salary [recon.] | DK Pts |
| --- | --- | --- | --- |
| QB | Michael Penix Jr. (<5% owned) | $5,000 | 24.1 |
| RB | Chuba Hubbard | $6,300 | 22.1 |
| RB/FLEX | D'Andre Swift (10.1% owned) | $6,700 | 23.0 |
| WR | Malik Nabers (just under 25% owned) | $6,500 | 31.5 |
| WR | Germie Bernard | $4,000 | 25.7 |
| WR | Xavier Worthy | $4,600 | 14.3 |
| TE | Isaiah Likely | $4,800 | 23.9 |
| FLEX/RB | Kenneth Walker III | $8,500 | 30.9 |
| DST | Chiefs (5.9% owned) | $3,600 | 15.0 |

Construction: **naked QB** — Penix with no Atlanta teammate — but with a bring-back (Swift, Chicago, opposite side of ATL–CHI). Secondary same-team correlations: Nabers + Likely (NY Giants), Walker + Worthy + Chiefs DST (Kansas City). Nabers' 31.5 was the slate's high score; Walker the top RB; Likely the top TE.

### Week 7 — dfs\_ads — 225.42 pts — $1,000,000

$2.5M Millionaire, 10-game slate, $20 entry, 147,057 other entries (per DK). Won by 5+ points. The Buccaneers DST salary was not published in any text source found, so total spend is unrecoverable (the eight known salaries sum to $47,700 [computed]).

| Slot | Player | Salary | DK Pts |
| --- | --- | --- | --- |
| QB | Jared Goff | $6,800 | 22.02 |
| RB | Tony Pollard (4.4% owned) | $5,300 | 39.5 |
| RB | Braelon Allen | $5,900 | 22.4 |
| WR | Amon-Ra St. Brown | $7,800 | 27.2 |
| WR | Jameson Williams | $5,800 | 26.1 |
| WR | Tee Higgins (5.9% owned) | $6,600 | 29.8 |
| TE | Colby Parkinson | $3,000 | 9.8 |
| FLEX | Ashton Jeanty (RB) | $6,500 | 21.6 |
| DST | Buccaneers (4.6% owned) | not found | 27.0 |

Construction: QB+2 double stack (Goff + St. Brown + Jameson Williams, Detroit vs Green Bay — the slate's highest total, 53.5), no bring-back, RB in FLEX. An extreme leverage build: **seven of nine players under 10% owned**, including the slate's top RB (Pollard, 39.5 pts at 4.4%) and top DST (Buccaneers, 27.0 at 4.6%).

### Week 8 — Hebrewcheetah — 259.08 pts — $1,000,000

$2.5M Millionaire (tagged "$50K Crown Cash Throne Eligible"), 11-game slate, $20 entry. Won by 5+ points. Salaries **[reconstructed]**, summing to $49,900. Entry count not found.

| Slot | Player | Salary [recon.] | DK Pts |
| --- | --- | --- | --- |
| QB | Joe Burrow (8.5% owned) | $7,000 | 45.48 |
| RB | Braelon Allen | $6,100 | 26.3 |
| RB | Bhayshul Tuten | $5,900 | 32.9 |
| WR | Ja'Marr Chase | $7,700 | 34.1 |
| WR | Tee Higgins (14.2% owned) | $6,700 | 40.5 |
| WR | Michael Wilson | $6,200 | 29.8 |
| TE | Gunnar Helm (3.4% owned) | $2,500 | 14.6 |
| FLEX | Harold Fannin Jr. (TE, 1.9% owned) | $4,200 | 27.4 |
| DST | Patriots | $3,600 | 8.0 |

Construction: QB+2 double stack (Burrow + Chase + Higgins produced 120.08 points from TEN at CIN, final 43–36 OT) **plus a TE bring-back** (Helm, Tennessee). **Double TE.** Burrow's 45.48 was the slate's top score; Higgins and Chase were the top two WRs. Cumulative ownership ≈106.2% [computed from a reported 11.8% average across the nine slots].

---

## PART II — The Sun-Mon Classic: a negative result, with its cause

The assignment's second flagship — the Sunday-through-Monday Classic slate ("extended all-day") — was hunted as hard as the main slate: general web, Reddit r/dfsports, X, YouTube, podcasts, Discord indexes, and the Wayback Machine, across two research passes. The result is a genuine negative, and it is worth stating precisely what does and does not exist.

**What exists.** The slate itself is real and current. Third-party tools label it exactly **"DraftKings · Classic (Sun-Mon)"** — StatWarrior lists it for Week 9 2026 (13 games, locks Sunday 1:00 PM ET), and Advanced Sports Logic has used the identical label since 2020. GamblingSite's weekly picks document its shape: Week 1 2026 ran a 14-game Sun-Mon slate alongside the 12-game main slate; Week 3's was 15 games. "Extended All-Day" is not a DraftKings name for it. Historically, the Sun-Mon slate *was* the flagship: in 2015 the Millionaire Maker itself ran Sunday-through-Monday (Week 1 2015: $10M Millionaire Maker, $2M to first; Week 17 2015: $4M, $20 entry, 229,000+ spots, $1M to first — FootballGuys' DraftKings spotlights).

**What does not exist.** No Sun-Mon Classic winning lineup, winner name, winner interview, recap post, or screenshot was found for **any week of any season** — not 2026, not earlier. Every Sun-Mon hit anywhere was a pre-slate picks/projections page. The 2026 Sun-Mon flagship GPP's entry fee, guarantee, and field size could not be documented from any lobby-listing source either (the one source that lists contests directly, FantasyCruncher's contest-links, returned HTTP 403 and was not retried). The documented 2026 $20 Millionaire Maker — 161,516 entries, $2.75M — is the Sunday **main** slate contest and must not be conflated with the Sun-Mon slate.

**Why.** Part IV gives the mechanism: DraftKings makes each contest's full standings downloadable for **10 days** and then the record effectively vanishes; nobody archives the Sun-Mon slate's results, and DraftKings' own recap operation covers only the main-slate Millionaire. The absence is structural, not a search failure. The one structural fact about Sun-Mon play that the corpus does carry (from the 2026-09-25 baseline research): because DraftKings locks players per-player rather than per-lineup, a Monday-night FLEX slot is late-swappable, which makes the MNF game a structural component of Sun-Mon construction in a way it cannot be on the main slate.

---

## PART III — The format, era by era (what the record supports)

A full year-by-year census of winning construction back to 2013 does not exist in public sources — for the same archival reason as Part II — so this part records what is actually documented rather than a smoothed narrative.

- **2015 — the Sun-Mon flagship era.** The Millionaire Maker ran on the Sunday-Monday slate: $10M guaranteed with $2M to first in Week 1 2015 ($27 entry in a documented November 2015 listing; $20 by Week 17), fields of 229,000+. The $1M Play-Action ($3 entry, \~383,000–479,000 players, top \~85,000–105,000 paid) was the mass-market companion.
- **2021–2025 — the winners compilations.** EdgeLine's census holds 80 Millionaire Maker winners (18/18/18/15/11 by season), 29 with full player-level salary and scoring. GamblingSite's complete 2024 and 2025 sets (18 + 18 winners, salary + contest ownership per player) average **228.4 points (2024)** and **236.7 (2025)**, combined 232.6, with \~81% of winners stacking. Seeking Optimal states it has studied every Milly winner since 2021 and sells the full set behind its Pro paywall.
- **2026 — the guarantee steps down while construction holds.** $3.5M → $3M → $2.75M → $2.5M across Weeks 1–8; the Week 1 $5 edition drew 832,342 entries against the $20 weeks' \~147,000–173,000. Winning scores averaged 240.68 (Part I) against 236.7 for 2025 — and the construction signature (QB stack in \~9 of 10 top finishes per the baseline research; QB+2 modal; bring-back in roughly half) is continuous with the 2024–25 record.
- **The publisher-study audit.** DFS Army's dataset claims — the corpus behind its book *Cracking the DFS Code* (Part X) — are internally inconsistent across the publisher's own posts: "230,000 top DraftKings lineups" in one, "232,000 lineups, four seasons, 376 major tournaments, over 35,000 top-100 finishing entries" in another, "34,856 top-100 lineups" in an X post. The headline claims attributed to the companion material (average winning lineup's total projected ownership ≈126%; 87% of winners used QB + 1–2 pass-catchers; 94% of winning lineups carried ≥2 skill players under 10% owned; median total ownership of winners up 16 points over recent seasons — "chalk creep") are recorded here as publisher claims, not verified findings, because the underlying dataset is not public and its own size is stated three different ways.
- **Week-over-week dynamics, as documented in 2026:** winning scores ranged 210.50 (Week 6, 10-game slate) to 273.98 (Week 1); the two highest cumulative-ownership winners (Weeks 5 and 3) and the lowest (Week 2, 97.0%) all won by 5+ points, and five of seven winners through Week 7 carried a sub-15-point slot — the winning lineup is routinely one or two slots short of perfect, which is a property of the payout structure (Part VI), not of any single week's chaos.

---

## PART IV — The data problem: there is no public archive, and here is why

**DraftKings' own standings CSVs are the primary record — and they expire.** Per DraftKings' support documentation, any entrant can download a completed contest's full standings (Rank, Time Remaining, Fantasy Points, and per player: Roster Position, % Drafted — actual ownership — Fantasy Points) via GameCenter → Standings → "Export Lineups to CSV." **The CSV is available only 10 days after the contest ends.** That single fact explains the absence of any long-lived public archive of DraftKings standings, the missing Sun-Mon record (Part II), and the screenshot-only Week 4 winner (Part I). The Wayback Machine holds no captures of DraftKings contest standings pages, consistent with the window. The file format is independently documented by the open-source JoshEngleman/nfl-live-standings tooling (`EntryId, EntryName, QB, QBId, RB1, RB1Id, …`).

**The one real archive is paywalled.** STAT-API (stat-api.com) states holdings of 34.9K contests with lineups since 2021 and 446M contest entries; NFL specifically: **17K contests with standings, lineups, payouts, and actual ownership** (DraftKings 28.2K contests with lineups across sports), downloadable per contest as CSV/JSON. Full contest downloads require **Pro at $99/mo**; the license is personal-use — data may be downloaded and kept but **may not be published in any form**. A free key previews 5 lineups of any contest. Its worked example independently confirms the Week 2 record above (1st = elidkatz1, 232.38, $1,000,000, 173K lineups).

**Everything else is fragments.**

- **Kaggle has no NFL lineup-level dataset** — searched across draftkings / millionaire maker / dfs lineups / ownership, including site-restricted queries. An NBA analogue exists ("Daily Fantasy Basketball — DraftKings NBA," alandu20: 20 days of 2017 contests with salaries, payout structures, and contest standings), which proves the format and underlines the NFL absence. The NFL Kaggle items are salary/points only (Longenbach's Historical NFL Fantasy 2020: one 616 KB file, Weeks 1–17 2020, sourced from RotoGuru).
- **RotoGuru** is the free salary/points archive: DraftKings from 2014, FanDuel from 2011 — **no ownership column**. The `nfldfs` PyPI package scrapes it by season/week.
- **RotoGrinders' ResultsDB** is real but not a public download; FantasyLabs' historical ownership dashboard (launched Feb 2017) has no public archive; FantasyCruncher publishes per-date contest-link pages (Mbeledogu used them for 2021 payout lines — Part V) but its NFL page returned 403.
- **Academic data is request-only.** Getty et al.'s FanDuel 2013–14 datasets are available only by emailing fdlegal@fanduel.com for academic purposes. Hunter–Vielma–Zaman's population lineups were obtained by *entering the contests themselves*; no replication dataset is posted (their hockey code is public). Haugh–Singal's data are the authors' own real FanDuel entries.

**Consequence for any future pull:** Millionaire Maker standings for Weeks 1–8 2026 are recoverable in full only from STAT-API (paywalled, non-publishable) or from the entrants' own downloads inside the 10-day window. A standing weekly capture inside the window is the only free durable path, and it has to be running before the contests end.

---

## PART V — The mathematics of lineup optimization: the literature, read in full

Five core papers were acquired as PDFs and read at equation level (library: `~/workspace/dk-dfs-library/` — PDFs, text extractions, dossiers; see Appendix A). This part is the synthesis of those reads. One thesis (Newell 2017) could not be acquired in full text and is marked accordingly; the books are in Part X.

### V.1 Hunter, Vielma & Zaman — picking winners is a submodular portfolio problem

*arXiv:1604.01455v3 (39 pp.); published INFORMS Journal on Optimization 1(4):348–370 (2019). Acquired and read in full.*

The foundational result: choose a set S of k entries to maximize **U(S) = P(∪ᵢ∈S Eᵢ)**, the probability at least one of your entries wins. Maximizing U is NP-hard even for discrete uniform distributions (Thm 2.1, from Hunter & Zaman 2017), but U is monotone submodular (Lemma 1), so the greedy algorithm carries the Nemhauser guarantee U(S\_greedy)/U(S\*) ≥ 1 − e^(−1) ≈ 0.632 (Thm 2.2); under independence greedy is exactly optimal (Thm 2.3). The pairwise inclusion–exclusion truncation U₂(S) = Σᵢ P(Eᵢ) − ½Σᵢ≠ⱼ P(EᵢEⱼ) approximates U with error ≤ 20c(kp)³ — **but the bound degenerates exactly when entries are strongly correlated** (the maximally-correlated worked example has U₂ error 0.01 against a bound of 5.4): the approximation is certified only for weakly correlated, rare events, which is the opposite of the regime stacking creates inside lineups. Under a Gaussian model the closed-form lower bound (Thm 2.5) makes the qualitative law explicit: the objective rises with **large μᵢ, large σᵢ, and small pairwise ρᵢⱼ** — high mean, high variance, low mutual correlation across the *portfolio*.

The implementable algorithm is a **sequential integer program**: build lineups greedily, each new lineup maximizing Σ μⱼxᵢⱼ subject to a **variance floor** (Σⱼ(σⱼ⁰)²xᵢⱼ + Σⱼ≠ₗ ρⱼₗ⁰σⱼ⁰σₗ⁰xᵢⱼxᵢₗ ≥ εᵢ) and a **covariance cap** against every previously built lineup (≤ γᵢq). In the DFS application the variance floor is replaced by structural stacking constraints — goalie stacking, complete-line, two-partial-line, defensemen stacking (eqs. 4.4–4.7) — and the covariance cap reduces to an **overlap cap** Σⱼ x\*ₗⱼxᵢⱼ ≤ γ (eq. 4.8) under the paper's stated assumption that all players have equal variance and covariance magnitudes are ≪ variance. Correlation **magnitudes are never estimated; only their signs are used.** Hockey experiments (38 real DraftKings contests the authors entered to obtain full populations): Type 4 stacking (goalie + lines + defensemen, exactly 3 teams) had the highest mean profit margin at 100/200 lineups; best overlap cap γ depends on slate size (**γ=7 for <4 games, γ=4 for >9 games**); with one lineup the median profit margin was −100%; the profit mechanism, in the authors' words, is the payoff asymmetry (max loss 100%, max gain ≥10× that) — "because the contest payoff structure is so asymmetric… our lineups end up being profitable." Baseball: top-10 finishes in 4 of 10 contests with 200 lineups, including 1st of 47,916. The prediction layer is deliberately thin: μ\_k = β₀ + β₁f\_k^(RG) + β₂f\_k^(DFN) with β₁=0.634, β₂=0.282, R²=0.238 (skaters); goalie R² as low as 0.0139. The authors state the greedy loss "will not be significant" as an **assumption, not a theorem** — the (1−1/e) guarantee covers greedy on U itself, not the implemented mean-maximization with variance/overlap proxies.

### V.2 Haugh & Singal — model the opponents, not just the players

*Author copy, rev. May 23 2019 (53 pp.); published Management Science 67(1):72–92 (2021). Acquired and read in full.*

The second pillar: the objective is not a lineup's own score distribution but its score **against the field's order statistics**. For double-ups: max\_w P{wᵀδ > G⁽ʳ'⁾}; for top-heavy contests, the full prize-tier sum (eq. 2) over all your entries jointly, including cannibalization terms (your other entries enter each entry's benchmark). The field is modeled generatively: per position, selection probabilities are **Dirichlet-distributed** (p \~ Dir(α)) with **α = exp(Xβ)** — Dirichlet regression on FantasyPros ownership estimates, scaled cost, and scaled expected points, fit in STAN — and a **stacker copula** mixture C = (1−q)C\_ind + qC\_stack, where q (the field's stacking propensity) is estimated from a small hand-collected sample. Opponent lineups are simulated by Algorithm 1 (draw p, draw Stack \~ Bernoulli(q), draw selections, accept–reject on feasibility and a minimum-spend bound). The solution method reduces, under normality of Y\_w = wᵀδ − G⁽ʳ'⁾, to a family of **binary quadratic programs**: max\_w {wᵀμ\_δ + λ(wᵀΣ\_δw − 2wᵀσ\_{δ,G})} swept over a λ grid by Gurobi, with λ\* chosen by Monte Carlo evaluation of the true objective (Proposition 4.1: the optimum is mean-variance efficient). The parimutuel aside (§5.1) proves the saturation effect — marginal expected gain of the (k+1)-th wager on the same horse strictly decreases — and Algorithm 5 is provably optimal for parimutuel winner-take-all; the authors themselves note the analogy **breaks** in DFS because there is no reward independence and O\_h ≈ 0 for nearly all of the \~2×10¹³ feasible lineups, which "strongly encourages diversification." The multi-entry algorithm (Algorithm 6) is greedy with backtracking, γ=6 optimal in their calibration.

The live experiment — real FanDuel entries, all 17 weeks of 2017, three contest types weekly — returned **+$280.74 cumulative on $75.76 of capital ever required** for the strategic portfolio in top-heavy, \~3× the benchmark's realized P&L; but the paper's most important sentence for anyone building on it is its own: **expected profit exceeded realized profit for both models in all contest types.** The authors name the cause themselves — "the well-known general tendency of models to over-estimate the performance of an optimally chosen quantity" (the optimizer's curse, §V.6) — and document their ownership model's failures concretely (a player at \~80% actual double-up ownership whose 95% interval was 0–10%; the Fournette/Ivory week, where \~60% of the field took the backup they didn't update for). Their §7 estimate of opponent modeling's value: ≈20% of expected P&L in top-heavy, 1–2% in double-up/quintuple-up. Collusion, quantified in the same framework: five colluders at E\_max=50 raise expected season P&L by 44%.

### V.3 Getty, Li, Yanochkin, Yanochkin & Hosoi — skill vs chance, and the persistence law

*SIAM Review 60(4):869–887 (2018), CC-BY, via MIT DSpace (20 pp.). Acquired and read in full. (The fifth author is Hosoi; "Murphy" in some secondary listings is an error.)*

FanDuel data, Sept 2013–Feb 2014, six sports. The persistence measure: **R\* = 1 − B/A**, where A is the variance of aggregate win percentages across two half-seasons and B the within-player reshuffled variance. **R\* > 0 in all six sports — skill persists.** The richest players were the most skilled (highest-win% decile returned +5 to +10% ROI on entry fees; the poorest decile, −25 to −30%). Skill level S and number of contests N\_TG were estimated by iterative fixed-point iteration; an equilibrium model then estimated the **number of distinct top competitors T** a contest can support, with **N\_TG ≈ 25** for typical parameters. The probability a completely random lineup wins: **0.864 for NFL** (0.397 NBA — the highest), meaning NFL DFS outcomes are the most luck-dominated of the six sports at the single-lineup level even though skill demonstrably persists across a season. Circle-accounting: the top 10% took the large majority of entry value (80% of profits in the cited summary).

### V.4 Mbeledogu — robust optimization: optimize against your own projection error

*MIT Sloan SSAC 2023, 1st place (23 pp.). Acquired and read in full; author's code cloned (Part V.7).*

The one formulation that treats projections as *wrong by construction*. Let e be the vector of projection errors with covariance Σ\_e. The robust objective: **max\_x pᵀx − ρ‖Σ\_e^(1/2) x‖\_q** — maximize projected points minus a penalty on exposure to correlated error. The uncertainty set is written in whitened coordinates, {e : ‖Σ\_e^(−1/2) e‖\_p ≤ ρ} (built from a Frobenius ball around an initial error estimate), and Σ\_e is forced PSD by Higham's nearest-correlation projection. Experiments used real 2021 DraftKings NFL Classic data (FantasyCruncher contest links, FantasyPros projections) across six contest sizes (n = 11 to 981). Result, stated precisely because it is routinely overstated: the robust portfolios delivered **up to +13.2% improvement at the 1st percentile of payout** and much higher worst-case payouts, while **probability of any payout moved mixed** (up in three contest sizes, down in three). Robustness buys the floor, not the frequency.

### V.5 Mahoney & Paniak — the negative control

*arXiv:2309.15253v2 (32 pp.). Acquired and read in full.*

A direct methodological descendant of Newell's protocol: exponential-family (negative-index) distributions fitted to historical player data, projection α = (1/K)Σ s\_i/μ\_ij, and a Newell-style MILP. Its lineups — built on real DraftKings NFL data, evaluated against real user lineups — reached only about the **31st percentile** of real users, and the authors state their generated lineups' **scores fell below their own model's simulated 2.5th percentile**. A competent, published implementation of the standard pipeline, beaten by the field and by its own model's calibration. This is the literature's standing warning that the pipeline's weakest link is the input distributions, not the optimizer.

### V.6 Newell (2017) — the stochastic-IP protocol [full text NOT acquired]

*K-State MS thesis, "Optimizing daily fantasy sports contests through stochastic integer programming" (handle 2097/35393). Landing page and abstract verified; the PDF bitstream was unreachable through the DSpace REST API in this pass, and gray mirrors were not used. What follows is abstract-level plus two secondary summaries (Newell & Easton's own later descriptions), and is marked as such.*

Newell's MMIP: maximize the average of scenario-wise max payout minus penalty terms over N ≈ 100–1,000 sampled scenarios; player points modeled as **normal** with mean/variance from published projections; **team-level** standard deviations piecewise-linearized. Newell & Easton (IISE 2017) applied it to the actual Millionaire Maker: $20 entry, $1M first, 12-game slate, 250,000 entries, payout line modeled at 57,500 (23%); the formulation generates the whole portfolio at once with overlap penalties rather than sequentially. Easton & Newell (J. Sports Analytics 2019) then measured the field itself: correlation between users' contest rank and realized profit scales with log(entries) (r²≈0.8), and their DraftKings 2016 NFL data are available **by request to the authors**.

### V.7 The code reality check

Three open-source optimizers were cloned and read (`~/workspace/dk-dfs-library/code/`, notes in `code/NOTES.md`):

- **pydfs-lineup-optimizer** (DimaKudosh): PuLP/CBC (or python-mip). Objective = max Σ points·x with pluggable points strategies (standard / random-perturbed / progressive-boost). Stacking is **structural only** — PlayersGroup/TeamStack constraint objects. Exposure is a strategy object in the generation loop. **No variance, covariance, or correlation term exists anywhere in the codebase.**
- **draftfast** (BenBrostoff): OR-Tools CBC. Objective = max Σ proj·x exactly. Stacking = exact-count constraints. Exposure = post-hoc CSV feedback loop. The word "correlation" corresponds to no code path.
- **RobustDFS** (Mbeledogu's own): Gurobi notebooks implementing §V.4 verbatim, including `nearest_correlation.py` (Higham projection) — **the only one of the three in which a covariance matrix enters the objective.**

The gap is exact: the literature (HVZ's variance floor/covariance cap, Haugh–Singal's benchmark-relative BQP, Mbeledogu's robust penalty) puts a second-moment term in the objective; the two mainstream open-source optimizers have **no second-moment machinery at all** — they maximize projected points and handle "correlation" purely as stacking constraints and post-hoc exposure rules. Anyone building on pydfs/draftfast inherits that, whatever the surrounding documentation claims.

### V.8 The thread that runs through all of it

Three independent lines converge on the same failure mode. Haugh–Singal: expected profit exceeded realized profit in every contest type, self-attributed to the optimizer's curse. Mahoney: real lineups scored below the model's own 2.5th percentile. And Part VI's calibration evidence (a vendor's own report card on 777,590 real lineups) shows the same shape in production: predicted top-bucket ROI +98%, realized +32%. The optimizer's curse is not a footnote in this literature; it is the literature's most replicated empirical result.

---

## PART VI — The simulations

The question that drove this part: *how do the 90,000 sims actually run — what is one simulation, what data feeds it, what formula scores it, and is 90,000 the right number?* The answer required five separate DeepSeek dossiers (angle-split: the count's statistics, the vendor architectures, the input census, the open-source code, and an adversarial pass), a direct read of the vendor's own pages, and a bundle-level inspection of what the products actually ship (Part VII). Two further DeepSeek passes re-derived the count's statistics independently and converged on the same verdicts.

### VI.1 What one simulation is — four different machines wearing one label

"Simulation" means a different object at each layer of every product:

- **TwoGunGPT (the 90,000):** one simulation at the base layer is **one simulated game** — a full box score for both teams (passing/rushing/receiving/kicking/DST lines) drawn from distributions the author built from his own projections and the betting line. Each game is simulated **10,000 times**. The slate layer then **recombines** per-game draws into complete Sundays: **90,000 simulated Sundays over 3 seeds (30,000 each)**. A contest sim scores a 30,000-lineup field (drawn from his ownership projections and field stacking habits) inside each simulated Sunday against the real Millionaire Maker payout ladder, and a player's ROI is the average return of every field lineup containing him, rake removed (so 0 = the field average). The 90,000 is therefore a **recombination count**: the underlying independent game-level information is 10,000 draws per game, and any statistic whose variance runs through a single game's outcome inherits the 10,000-draw effective sample, not 90,000.
- **SaberSim:** one simulation is **one simulated play**, accumulated into a full slate of player stat lines — the only product whose atom is play-by-play. Contest Sims then place your lineup pool into simulated fields: **13 contest buckets** (entry fee × field size × payout structure), fields generated from industry-aggregated projections, your lineups' percentiles computed within each simulated contest. Two distinct run counts coexist: contest sims run "tens of thousands" of reps; the generalized "SaberScore" sim is documented at **100,000 runs**, and the shipped web app carries a client-side default of **numSims: 100000 \*\*[code]** (Part VII).
- **Stokastic:** the unit is a **full simulated contest** — your lineup pool plays itself across "tens of thousands" of simulated contests on (per its own how-to) a play-by-play simulation of each game, ranked by simulated ROI under a user-set **percent-to-first** dial that encodes the payout structure's top-heaviness. The shipped bundle's state actions literally name the machinery (`SET_SIM_COUNT`, `SET_PERCENT_TO_FIRST` **[code]**); the count itself is server-set and its help copy says "thousands."
- **SimLabs (FantasyLabs/RotoGrinders):** both halves in one sentence, from FantasyLabs support: "we run a complete simulation of the slate, inclusive of both the outcomes of the games and the DFS contest results" — **10,000+ game sims and 10,000+ contest sims**, rating a pre-generated pool of \~20,000 lineups on a five-weight composite (Simulation 75 / Projection 25 / Ownership 20 / Upside 10 / Correlation 10). Correlation is structural (games simulated jointly) plus a preference weight; the distribution family is unpublished.

### VI.2 The documented structure of the 90,000 — and the missing rationale

From TwoGunGPT's own site (read in full; the author is Michael Cohen, himself a Millionaire Maker winner): per-game sims feed a Ceiling Board (median / ceiling = 75th percentile / "nuke" = 95th / odds of 3× value per player); stack rankings scored by how often each stack finishes in the **top 0.1%** of simulated Sundays; the Gunsmith optimizer selects on max(percentile75 + percentile95) and is graded on **2,500 held-out simulated Sundays** with ± error bars; the Showdown product runs 10,000 draws against a 2,002-lineup field on the real $333 Showdown ladder. For the flagship article ("The chalk, graded before Sunday," 2026-10-16): *"I ran the main slate 90,000 times, drew a Milly field off my own ownership numbers, and scored every lineup that has each guy in it, DraftKings' rake out."*

**No reason for choosing 90,000 is stated anywhere on the site, and no convergence study, standard error, or sensitivity analysis is published.** The number is structural (3 seeds × 30,000 recombinations), not derived. What the count *buys*, statistically, is the next section's subject — because the honest answer is: it depends entirely on which quantity you ask it to estimate.

### VI.3 The arithmetic: what 90,000 sims can and cannot resolve

*(Closed-form Monte Carlo statistics, derived independently by two DeepSeek passes with the same results; formulas are the standard binomial/normal Monte Carlo error laws, stated so they can be checked.)*

For an estimand that is a probability p estimated from N independent sims, SE = √(p(1−p)/N) and relative SE = √((1−p)/(Np)).

| Estimand | p | N = 90,000: relative SE | N needed for 10% relative SE |
| --- | --- | --- | --- |
| Cash rate | \~0.20 | \~0.7% | \~400 |
| Top-1% finish | 0.01 | \~3.3% | \~9,900 |
| Top-0.1% finish | 0.001 | **\~10.5%** | **99,900** |
| First place (161,516-entry field) | \~6×10⁻⁶–10⁻⁵ | **\~105%** | \~10⁷ |

Three consequences, each checkable:

1. **90,000 sits exactly at the knee for top-0.1% estimation** (99,900 needed for 10% relative precision) — and top-0.1% frequency is precisely the statistic TwoGunGPT's stack rankings are scored on. Whether by design or by compute budget, the count is calibrated to *that* estimand. It is \~111× too small for win probability: at p = 10⁻⁵, the probability of observing **zero** wins in 90,000 sims is e^(−0.9) ≈ **40.7%** — the modal outcome of the experiment is that the best lineup never wins once.
2. **ROI is worse, because the payout is a lottery.** Under the real Milly ladder, **98.68% of a lineup's payout variance comes from the single $1M first prize** (the top prize is 36% of the pool paid across 0.0006% of the mass). The absolute standard error of a lineup's ROI estimate at 90,000 sims is **±43 percentage points** for an average lineup and **±168 points** for an elite one (p₁ = 10⁻⁴) — against between-lineup ROI differences that are themselves tens of points. Separating two lineups whose true ROI differs by 5 points at conventional power requires on the order of **154,000 real contest entries** of realized data; inside a simulator the same discrimination is governed by the correlation between the candidates' per-sim returns.
3. **That correlation — ρ between candidate lineups' simulated returns — is the parameter the whole enterprise turns on, and nobody publishes it.** With common random numbers (the same simulated Sundays scoring every candidate), Var(difference) scales with (1−ρ), so the effective sample is N\_eff = N(1−ρ). At ρ = 0.999 (near-identical lineups), 90,000 sims capture \~90% of the ranking signal; at ρ = 0, \~6.6%. The count means nothing until ρ is stated, and no vendor states it.

**The winner's curse, quantified.** Selecting the best of K candidates on noisy estimates inflates the winner's displayed value by E[max noise] ≈ σ√(2 ln K). At K = 5,000 candidates and 90,000 sims, the top lineup's displayed ROI is over-predicted by a factor of **≈2.85×** its true ROI (the "\~2.4×" figure that circulates in this literature corresponds to N ≈ 153,000 under the same model; getting the inflation down to 1.10× would take ≈12.6M sims). This is not a modeling opinion — it is the same optimizer's-curse result Haugh & Singal report empirically in Part V, and §VI.4 shows it measured in production.

**Verdict on the count:** 90,000 is a defensible compute budget for percentile boards, stack-frequency rankings, and cash-rate estimation. As evidence about *which lineup wins* or *what a lineup's ROI is*, it is three orders of magnitude short, and no increase within commercial reach closes that gap — the gap is closed, if at all, by common-random-number ranking discipline and by not reading absolute ROI off the top of a selected list.

### VI.4 The adversarial case — and the one real calibration dataset

The strongest version of the skeptical case, assembled by the adversarial dossier:

- **Model error dwarfs Monte Carlo error.** For player means, model error (projection vs reality) is 50–150× the Monte Carlo standard error at these counts. Spending compute to shrink the smaller error by √N while the larger stands is precision theater.
- **Correlation misspecification dominates everything downstream.** A uniform 0.10 error in assumed pairwise correlation shifts a top-0.1% probability by a factor of \~2–3× — against the 10.5% Monte Carlo error the count was supposedly chosen to control. Every product in Part VII either fits correlation opaquely or inherits it from a game script; none publishes a correlation validation.
- **The population facts are brutal and undisputed.** McKinsey (2015): 1.3% of players took 91% of profits; \~85% of players lost money. NY Attorney General filings: 89.3% of DraftKings players were net negative in 2013–14. **No published study anywhere shows users of any simulation product outperforming a control group — NOT FOUND, searched explicitly.**
- **The one calibration dataset that exists in public: TwoGunGPT's own "Range" report card**, grading his model against **777,590 actual $20 Millionaire Maker lineups (Weeks 3–7)**. Predicted cash rate 27.5% vs realized 23.0%; predicted top-1% rate 1.51% vs realized 1.01%; the top predicted-ROI bucket: **predicted +98%, realized +32%** (a 3.06× over-prediction — against the 2.85× the winner's-curse arithmetic of §VI.3 predicts at these parameters); average edge slope 0.61; weekly predicted ROIs of +70/+25/+30/+27/+36 realized as +1/−36/+1/+3/0. And the genuinely favorable finding, which the adversarial pass states as plainly as the rest: **realized cash rate rises monotonically across predicted buckets** — the model *ranks* lineups usefully and *values* them badly. That is exactly the signature Part V's literature predicts, and it is the most decision-relevant paragraph in this entire document for anyone consuming sim output: **trust the ordering, haircut the number — by roughly the factor the selection process implies.**
- **What sims genuinely buy** (the defense, stated by the same dossier): the nonlinear payout functional E[g(S)] that no closed form reaches; joint tails and stack co-occurrence; field-conditioned rank (duplication, ownership interaction); portfolio-level interaction across your own entries. These are capabilities of the *model class*, not of the count.
- **Falsification tests any sim product could be held to** (none currently publishes all of them): a reliability curve with intercept ≈0 and slope ≈1; a PIT histogram for calibration of the full distribution; Brier skill score against a market-implied baseline; finish-bucket calibration (predicted vs realized top-0.1%/1%/cash); a pre-registered out-of-sample ROI test with its power calculation attached; and module ablation plus an N-scaling curve (does the answer change between 10K/50K/90K sims?).

**Vendor validation inventory:** of every product examined, only TwoGunGPT publishes any calibration artifact at all. SaberSim publishes none; Stokastic none; the optimizers none. The one independent calibration study in the record is Establish The Run's audit of **its own** Solver sims (Mike Leone, "NFL DFS: Putting the Sims to the Test," 2026-09-06; read in full for this document — an earlier dossier summary misattributed it to SaberSim/Stokastic, corrected here): 35 DraftKings "Game Changer" contests, 9,570 entered teams, each team's post-lock sim cash rate / top-10 rate / sim ROI compared against what it actually did. The shape matches everything above: cash-rate calibration held in the middle (actuals inside the simulated bucket range in 4 of 5 broad buckets) and **collapsed at the extreme top** (teams simmed at 36–39% and 39–42% cash rates actually cashed 13.8% and 4.8%); sim ROI was directionally right and most predictive mid-distribution (the ≥+40% sim-ROI bucket realized +37.7%); the 35 contest winners averaged **+9.0% sim ROI against a −5.3% random expectation** (23 of 35 winners had positive sim ROI — and 12 won with negative sim ROI, which the authors flag as expected, not as sim failure); and pre-lock sim ROI fell **\~20 points** by post-lock in their Week 16 example, driven by ownership surges the pre-lock field model missed (Fields 25.8% projected → 43.4% actual; Herbert 30.8% → 47.2%) — their own conclusion being that "the actual field lineups end up a bit more competitive than the projected field lineups."

### VI.5 Architectures, layer by layer

Every contest-sim product decomposes into the same four layers. The dossier's per-product findings, condensed:

**L1 — Sampling unit** (what one draw *is*). SaberSim: the play (only product). TwoGunGPT: the game's box score. jrakestr/nfl-edge (open source, Part VIII): the drive. Stokastic: the game, re-simulated play-by-play per its own how-to article — prose-level only, mechanism unpublished. DFS Hero: the drive ("drive by drive" for NFL; its Game Sim plays every game 10,000 times, projection = sim mean, outlook = 25th–99th percentiles).

**L2 — Player marginals** (the per-player distribution). SaberSim: empirical, read off its own sim output (floor = 10–25th pct, median 50th, ceiling 85–95th). TwoGunGPT: empirical percentiles of its game sims. chanzer0/NFL-DFS-Tools (open source): the deepest published method anywhere — per position × projection-window **fitted families** (gamma, lognormal, Weibull, skew-normal, ex-Gaussian, generalized gamma) with published AIC/BIC/Anderson-Darling fit statistics, affine-matched to each player's mean and SD. Stokastic: median projection published; distribution family **not published at any level**. PFN (Part VII): median × fixed percentile multipliers — the only "distribution" any vendor ships in code.

**L3 — Dependence** (how players move together). Three mechanisms exist in the record: (a) **emergent** — shared game script inside a play/drive/game sim (SaberSim, TwoGunGPT by construction, SimLabs, DFS Hero's heatmap); (b) **imposed copula** — Gaussian copula with Iman–Conover rank reordering over fitted marginals (chanzer0; DFS-FUN-SHOWDOWN adds a Student-t df=5 option and a game-environment factor); (c) **structural shares** — Dirichlet-multinomial allocation of team volume (nfl-edge), where correlation is an accounting identity. SaberSim additionally imposes signed adjustments on top of emergence (its 2024 NFL walkthrough states the signs: QB–own DST positive, opposing DST negative, rushing QB weaker with his pass catchers). Stokastic's mechanism: undisclosed ("correlation baked in" is the entire public account).

**L4 — Field and payout** (where contests are actually won or lost). SaberSim: 13 contest buckets, fields built from industry-aggregated projections, plus **Flashback** — finished contests re-simulated 100,000× against the *actual* entered field (the only true-field validation mode any vendor ships). TwoGunGPT: own-ownership field model, deliberately under-drawing the priciest chalk relative to posted ownership (Nacua drawn 31% vs 39% posted) — a modeling choice that flatters contrarian constructions and is disclosed only inside the article's method notes. Stokastic: percent-to-first dial + ownership-driven sharing; its own bundle carries the unresolved contradiction that ownership both determines sharing and "does not impact the simulations." SimLabs: field = "the projected lineups we expect in a large-field contest," rating is contest-type-parameterized (\~12 for single-entry vs \~29.6 for large-field GPP on the same lineup).

**Scorecard** (documented = stated by the vendor in a checkable artifact; ✓/✗):

| Product | Unit documented | Marginals documented | Dependence documented | Field model documented | Count stated | Any calibration published |
| --- | --- | --- | --- | --- | --- | --- |
| SaberSim | ✓ (play) | ✓ (empirical pct) | ✓ (emergent + signs) | ✓ (13 buckets, Flashback) | conflicting (10K–100K by surface) | ✗ |
| TwoGunGPT | ✓ (game) | ✓ (empirical pct) | partial (script buttons) | ✓ (own ownership) | ✓ (10K/game → 90K Sundays) | **✓ (Range report card)** |
| SimLabs | ✓ (game+contest) | ✗ (family) | ✓ (joint sim) | ✓ (projected field) | ✓ (10,000+) | ✗ |
| DFS Hero | ✓ (drive) | ✓ (sim mean/pct) | ✓ (emergent heatmap) | partial ("modeled on entrants") | conflicting (10K vs 20K pages) | ✗ |
| Stokastic | partial (prose) | ✗ | ✗ | partial | ✗ ("thousands/tens of thousands") | ✗ |

### VI.6 Inputs and context: what actually feeds the sims

The input census audited eight classes across the commercial products (documented = the vendor states it enters the model; prose = mentioned in marketing/help copy without a parameter; absent = no mention anywhere found):

- **Market data (lines, props, team totals): the ONLY class every product documents.** SaberSim goes furthest and says the quiet part plainly: the market is the *primary* input — team totals are set first, player props act as rate adjusters, stale books are dropped, and cross-market consistency is checked after simulation (dial-in). In the commercial stack, the betting market is not one input among many; it is the prior everything else adjusts.
- **Usage (targets, carries, snap share):** named in one clause by ETR for its own model; reached by SaberSim only through the prop market; used by TwoGunGPT in analyst prose *outside* the model. No product documents a usage model as a sim input.
- **Coaching:** documented by SaberSim alone, as help-center prose ("coaching tendencies") with no parameter — and its own 2024 engineering walkthrough does **not** list coaching among the sim's inputs. A named, unresolved conflict inside one vendor's own documentation.
- **Documented by NO product, anywhere:** referee crew, rest/short-week differentials, divisional familiarity, primetime/game-slot effects, playing surface, altitude, player-vs-player coverage matchups, offensive/defensive line pressure matchups as named inputs. EPA and success rate are named by nobody as sim inputs.

**The GSE comparison** (this is Garrett's engine, so the record states it flatly): the commercial stack is deeper than GSE's current build on **field modeling** (13 contest buckets, sharp-third field variants, Flashback true-field re-sims), **payout geometry** (percent-to-first as a first-class dial), **variance objects** (nuke rates, 3× odds), and **cross-market reconciliation**. GSE's distinctive layers — coach-vs-coach matchup, week-over-week usage-regime change, referee crews, rest differentials, venue/surface — are **unoccupied ground on the public record**: no commercial product documents any of them as a sim input. And the architectural fork is stated in DS3's own verdict: the commercial stack reasons **market-first** (the line is the prior); GSE's doctrine reasons **market-last** (the line is a price check). That is a fork in design, not a gap in depth — this document records it without adjudicating it, per the research-only instruction.

**Data provenance — what the inputs cost.** Nearly every input class above is free at research quality: nflverse/nflreadr play-by-play with EPA (1999–present), snap counts (2012+), Next Gen Stats (2016+), FTN charting (2022+, free via nflverse), and nfl4th (free) for coaching-aggressiveness measures. Genuinely paywalled: PFF grades ($99.99–$199.99/yr), Sports Info Solutions ($749.99/yr NFL), FTN's B2B feed. Genuinely absent at any price: a coach-vs-coach dataset, a usage-regime label set, a coverage-assignment dataset — the three datasets that would operationalize the unoccupied layers above do not exist as products; they would have to be built from the free layers.

---

## PART VII — The tools, dissected at the bundle level

Method: for each of the 16 tools Garrett named, the pass pulled the site's public surface — sitemap, robots.txt, the JavaScript bundles the browser actually downloads, and a certificate-transparency subdomain census (crt.sh / Certspotter) — and grepped the shipped code for simulation machinery (distribution families, copula/Cholesky vocabulary, sim counts, payout handling). Raw artifacts: `~/workspace/dk-dfs-sims-deepseek/vendor-crawl/` (74 files, 16 MB).

**The cross-vendor headline, stated once because it governs every entry below: not one vendor ships its simulation or distribution math to the browser. Every sim engine is server-side. Across all 16 tools' shipped bundles there is zero copula, Cholesky, or distribution-fitting code.** What ships is UI state, field schemas, and — in exactly one case — a percentile shortcut. The internals in Part VI come from documentation and method articles; the code confirms the boundary of what can be verified from outside.

**SaberSim** (sabersim.com/nfl/optimizer). The richest shipped surface. The 2.56 MB app bundle carries the contest-sim client state verbatim **[code]**: default `numSims: 1e5` alongside `percentToCash`, `percentToFirst`, and a `contestPayoutsId` — i.e., the browser asks for 100,000 sims and a payout-structure ID; distributions are fetched per player from the server (`getPlayerProjectionDistribution`); the builder exposes `weightCorrelation` / `weightOwnership` / `weightVariance` knobs. Infrastructure: GCP (project literally named "baseball-sim", \*.appspot.com), 46 subdomains on record including dev/stage/api-simulations. Pricing: Core through Ultimate at $297/mo.

**Stokastic** (stokastic.com). A 4.17 MB tools bundle contains the full `preContest` Redux module: `SET_SIM_COUNT`, `SET_PERCENT_TO_FIRST`, `SET_SIMULATED_SLATE`, `SET_SIMULATED_CONTEST` **[code]** — the sim's control surface, with the count's *value* kept server-side. Embedded help text defines Sim ROI / 1st% / cash% as computed "over thousands of simulated contest runs" — their own copy says thousands where their marketing says tens of thousands. Sims execute via `/api/contests/simulateLambdaContest` (AWS Lambda) plus `api.stokastic.com` and Azure endpoints. The bundle also carries both halves of the ownership contradiction (ownership "based on the Marquee contest"; ownership "does not impact the simulations") and the only correlation strings in the entire bundle set: SGP disclaimers stating EV does **not** account for same-game-parlay correlation. Content note: their Sims *tool* pages sit behind a paywall interstitial; the how-to article (Part VI) is the public method source.

**TwoGunGPT** (twogungpt.com). The only vendor whose robots.txt explicitly welcomes AI crawlers. Its shipped `roi-feed.js` is *generated output* (built by `scripts/build-player-roi.mjs`) — precomputed player ROI shipped as static data (the artifact records a 147,058-lineup Milly field and field\_roi −15, matching Part VI's method read). Backend: Supabase. The sim itself is his own code, run offline; what ships is results, which is why Part VI could read his method from his articles but no bundle exists to inspect.

**FantasyLabs / RotoGrinders SimLabs.** FantasyLabs' nav is the most sim-forward inventory in the industry — SimLabs, Portfolio Simulator, Correlations, Ownership, Models, Late Swap — and every tool is login-gated; zero internals are public. LineupHQ's page is a pure JS shell (\~70 characters of body text); its bundle is not referenced from the static HTML (the one script reference found 404s), so the optimizer is unreachable from public artifacts. What is known about SimLabs comes from support copy and podcasts (Part VI.1/VI.5).

**DFS Hero** (dfshero.com). Added by the follow-on pass (it was DS2's "fullest plain-language disclosure" citation and DS3 had not input-audited it). Documented in its own help center: Game Sim plays every game 10,000 times (drive-by-drive for NFL); the Hero Projection is the sim mean; the outlook is the 25th–99th percentile band; the correlation heatmap is read off the same sims ("boom together, fade together"); the contest sim runs 10,000 sims per contest against the real payout curve on a field "modeled on how entrants actually play" — **except its own v2 site says 20,000**, a live count inconsistency of the same class as SaberSim's. Outputs per lineup: ROI, Win, Top 0.1, Top 1, Top 5, Cash, Lev. Whether weather, coaching, or matchup context enters the game sim: not documented in the help material read.

**LineStar** (linestarapp.com). A .NET (DNN) site marketing a "3rd Generation Patented Optimizer" at $39.99/mo or $239.99/yr. No model code ships publicly; the patent claim is the disclosure.

**RotoWire** (rotowire.com/daily/nfl). The optimizer is server-side Django (`.rotowire.com/django/lineupOptimizer/` plus per-sport routes — 19 sports enumerated in the 829 KB `dfs.min.js`). Nothing about distributions or sims ships; RotoWire is a projections-and-optimizer product, not a documented sim product.

**DFStud** (dfstud.com/nfl/optimizer). Django server-side; a 159 KB bundle with essentially no model vocabulary; assets on DigitalOcean Spaces. No public methodology beyond the optimizer's existence.

**FantasyPros** (fantasypros.com lineup optimizer). The disclosed input is expert-consensus projections; the optimizer's JavaScript was not present in public artifacts. Consensus-aggregation is the method, and it is disclosed as such.

**Pro Football Network** (profootballnetwork.com DFS optimizer). **The pass's only real client-side model code**, and it is a shortcut **[code]**: a player's range is computed as median × fixed percentile multipliers — `p10: a*ex.p10, p25: a*ex.p25, p75: a*ex.p75, p90: a*ex.p90` — with showdown CPT scoring at ×1.5. No distribution fitting, no simulation. What most free "optimizers" ship, made visible.

**FantasyCruncher** (fantasycruncher.com). The public surface is now essentially an X-embed landing page; no discoverable optimizer bundle. (Its historical role matters more than its current surface: FantasyCruncher contest links are the payout-data source inside Mbeledogu's Part V experiments, and its NFL contest-links page returned 403 throughout this research.)

**Outlier** (outlier.bet). A props-EV product, and the EV is computed **server-side**: the app bundle's Zod schemas validate backend-returned `calculatedEV`, `averageCorrelation`, and a `correlations` map **[code]** — the browser receives answers, not formulas. Premium $19.99/mo, Premium+ $29.99/mo.

**PlayerProps.ai**. The 746 KB `_app` bundle is mostly route/SEO catalog (it also runs per-sport DFS optimizer routes). Its disclosed methodology is a self-graded hit-rate article; projections are server-computed.

**Props.cash**. A create-react-app shell plus a 306 KB bundle; backends at `api.props.cash` and `props-dot-cash/api`. No EV math in the shipped code.

**Splash** (splashsports.com) — included to close a category error in the original target list: Splash is a peer-to-peer contest platform (same company as runyourpool.com), not a simulation vendor; zero sim/projection code in its chunks. Splash *Play* (Spags' best-ball draft tool, lognormal projections, 10K trials/pick, 100K contest sims under NBA) is a different company and a different product category; its numbers appear in the record only to prevent the two from being conflated again.

---

## PART VIII — The open-source engines: where the deepest method actually lives

Four repositories were cloned and read at file:line level (`~/workspace/dk-dfs-sims-deepseek/repos/`). The pattern across all four: the most complete simulation methodology published anywhere in this research is open-source, and none of it states a statistical derivation for its sim count — counts scale inversely with per-sim cost, full stop.

**chanzer0/NFL-DFS-Tools** (52★) — the only true open *contest* simulator of depth. Core: `src/nfl_gpp_simulator.py` (2,514 lines). Marginals: a fitted library per position × projection window (families in Part VI.5) with AIC/BIC/AD statistics shipped in the repo. Dependence: empirical correlation matrices keyed by position-pair × team-relation × projection-window (with sample counts), imposed by Cholesky decomposition + Iman–Conover rank reordering, PSD enforced by eigenvalue clipping — which silently alters the target correlations, a tradeoff the code does not surface. Field generation defaults: 65% of lineups stacked, 40% double-stacked. **Context inputs in code: none** — a grep for weather/vegas/spread/wind/coach/pace returns only the word "window." No tests.

**DFS-FUN-SHOWDOWN** — the archetype system. Players are typed into 17 archetypes; correlation is a config table of constants per archetype pair (POCKET\_QB–ALPHA\_OUTSIDE\_WR +0.428; QB–QB −0.479); dependence via Gaussian **or Student-t (df=5)** copula plus a hierarchical game-environment factor (cross-team correlation 0.45); Vegas spread/total are parsed into a GameContext that *modifies correlations conditionally* — the only open repo where the market feeds the dependence structure rather than the means. Field generation by Boltzmann weights, with a DRO-robust variant using Dirichlet CPT ownership. **Its code default is n\_sims = 100,000** — the only repository that defaults to six figures. No unit tests.

**jrakestr/nfl-edge** — the only repo that simulates football itself (drive-level). A shared pace draw per game; in-sim game-script feedback (pass rate shifts with the simulated margin); player volume allocated by Dirichlet-multinomial shares, so correlation is structural rather than imposed. The richest context layer of any artifact in this research: wind/roof adjustments (−1.5 pts/team outdoors over a wind threshold), home-field advantage, rest differentials, Elo, usage-share priors — and **Vegas is the benchmark it grades against, not an input**. Default 5,000 iterations. Strongest test suite of the four (pytest invariant tests plus a backtest acceptance gate). It vendors NFL-DFS-Tools for its contest layer — the open ecosystem composes.

**bpattypick/dfs\_opto** — the honest partial. Its ownership estimator is an idea worth recording verbatim: run the pydfs optimizer 1,000 times over randomized projections and read ownership off the selection frequencies. Field generation uses deficit weighting with legality-preserving repair. Its contest-outcome Monte Carlo layer is specified as a task (T6) and **not implemented** — the repo says so itself.

Adjacent game-sim references from the survey pass: rtelmore/NFLSimulatoR (play/drive-level, R), paulcbogdan/NFL-play-by-player (play-by-play Monte Carlo benchmarked against Vegas), nflverse/nflseedR (season-level Monte Carlo, the mature R reference). One target repo, llfisher932/NFL-SIM, could not be cloned (404 — deleted, private, or renamed).

**The "katana repository," closed.** Garrett's sims order named a "katana repository" to reverse-engineer. Verdict, from GitHub API searches plus the code pass: **no DFS project named katana exists** (katana+dfs / katana+draftkings / katana+nfl return zero; katana+fantasy returns four unrelated projects). The prominent katana is ProjectDiscovery's web crawler — which is what Garrett's follow-up link drop supplied, and it is dissected as a recon tool in Part XI.

---

## PART IX — How documented winners actually work

Process accounts from named Millionaire Maker winners and high-volume pros, as published. Recorded as process description, not endorsement — and read against Part VI.4's calibration evidence, which is the standing caution on all of it.

**Steve "dacoltz" Buzzard — the $1M win, process fully documented (the single best pro-process record found).** A 10,000-lineup candidate pool; selection by **percent-to-first with the dial at 30%**; a manual ROI boost applied to Kelce; the winning lineup itself carried **two tight ends** and a **1-3 stack with a 3-man bring-back**, and — the detail that matters — it **excluded Christian McCaffrey, who was owned by 60%+ of the field**. The win came from the interaction the sims are built to price: a correlated construction whose success scenario was not shared with three-fifths of the field.

**Justin Freeman — late swap as a discipline.** A documented 150-lineup portfolio triaged by hand through late-swap decisions to a $100K result. The process content: the portfolio is managed after lock as actively as it is built before it — which connects to Flashback-style tooling (Part VI.5) and to DraftKings' per-player lock making late swap structurally available (Part II).

**The rest of the named record, briefly.** Russell Miller won a Milly on a **single bullet** — the standing counter-example to every portfolio argument in Part V. Josh Veurink: documented winner, process partially published. ghartman314: 89 lineups. SonicLibrarian: \~50 hand-built + \~100 optimizer lineups with a Player Pool Worksheet as the organizing artifact. The eppy99-vs-sliderss contrast (from the field-construction literature): two opposite field-modeling philosophies — build the field you *expect* vs build the field you *want to beat* — which is the same fork TwoGunGPT's chalk under-draw (Part VI.5) sits on.

**What the process record and the winner record say together.** The eight 2026 winners (Part I) were entered as the 2nd, 49th, 10th, and 72nd entries of their owners where the ordinal is known — portfolios, not bullets, in at least half the documented cases; Buzzard's two-TE, bring-back, anti-chalk construction is the same shape as Weeks 2/3/4/8's winners (double TE in four of eight). None of this is proof of anything at n=8; it is recorded because the assignment asked what winners do, and this is the whole of what is documented.

---

## PART X — The books

Full texts of books cannot be "added to the system" the way papers can — they are commercial works — so this part records what each book *is*, its verified table of contents where public, and what its evidentiary basis is, so the corpus holds the map even where it cannot hold the text.

**Jonathan Bales, \*Fantasy Football for Smart People: How to Dominate Your Competition**\* — the founding DFS-strategy text by the FantasyLabs co-founder. Verified TOC (publisher listing): the strategy core is game-selection, bankroll, and the contrarian/leverage framework that the entire modern GPP vocabulary descends from. Its methods predate contest sims; its durable content is the ownership/leverage doctrine that Part I's winners keep instantiating.

**The Miller & Davidow volume** on the assignment list: its verified table of contents contains **no DFS chapter and no Kelly-criterion chapter** — recorded because the assignment assumed both; whatever its merits as a general gambling/decision text, it should not be cited in this corpus as a DFS source.

**DFS Army,&#32;*Cracking the DFS Code*.** Table of contents **NOT FOUND** in any public source (searched publisher, Amazon, Google Books). What is public is the publisher's dataset claim behind it — audited in Part III: stated three inconsistent ways (230,000 / 232,000 lineups; 35,000 / 34,856 top-100 entries), with headline findings (winners average ≈126% total projected ownership; 87% QB + 1–2 pass-catchers; the "two sub-10% players" rule in 94% of winners; chalk creep +16 points) that this document records as **publisher claims over a non-public dataset**, usable as hypotheses, not as findings.

**The academic shelf**, for completeness of the map: the five Part V papers *are* the book-length literature's core — there is no peer-reviewed DFS monograph beyond them; the remainder of the shelf is Newell's thesis line (Part V.6), Bergner 2017 (Bryant honors thesis, "Daily Fantasy Sports: Chance or Skill?" — abstract verified, full text behind a bot wall, partial dossier in the library), and Mlčoch's Masaryk thesis work on correlated lineup generation, which sits in the corpus's Oct-2 optimizer research.

---

## PART XI — Appendix: the recon stack (the six repositories Garrett supplied)

These six were dissected at code level, installed on this machine, and run where the environment allows. Full dissection: `~/workspace/recon-stack/DISSECTION.md`. They belong in this document because they are the tooling the vendor pass (Part VII) was executed with, and because REA is the reverse-engineering lane Garrett ordered reinstalled.

**projectdiscovery/katana (v1.6.1)** — the web crawler behind the "katana repository" question (Part VIII). Three engines (standard / headless / hybrid), AI-driven crawl flags, scope/filter/knowledgebase packages — all read in code. Installed from the official release binary to `~/workspace/tools/katana/`. **Live crawling is blocked by this VM's egress proxy** (all egress routes through `hatch-egress-proxy:3128`; katana's fastdialer never receives a first response through it — five attempts documented). That is an environment limit, not an install defect; katana will crawl normally from any direct-egress host. The Part VII crawl was therefore executed with curl + sitemaps + certificate-transparency sources, which for public-surface enumeration are equivalent; the difference is katana's headless JS-rendering crawl, which remains untested here.

**projectdiscovery/nuclei (v3.6.0)** — template-based vulnerability/issue scanner, installed to `~/workspace/tools/nuclei/`, version verified. One correction to the common assumption: the detection corpus is **not** in the scanner repository (its \~298 YAMLs are test fixtures); the real corpus is the separate nuclei-templates repository, fetched by `nuclei -update-templates` into `~/nuclei-templates/` (download was in progress at dissection time; final category counts are not established). Role in Garrett's stack: known-issue detection on owned/authorized surfaces and Family Shield exposure scans.

**projectdiscovery/subfinder (v2.14.0)** — passive subdomain enumeration, **verified working**: `-d example.com` completed in \~5.5s returning 3 subdomains from keyless sources; 58 source modules in code (the GitHub source requires an API key and errors without one, as expected). This is the tool that produced Part VII's subdomain censuses (with crt.sh/Certspotter as the equivalent keyless path).

**sherlock-project/sherlock (v0.16.2)** — username search across 482 sites (data.json read; detection methods — status code / message / response URL — read in code). Installed into `~/workspace/tools/sherlock-venv/`; runs end-to-end, but per-site checks are degraded by this VM's proxy for Python-requests traffic specifically (timeouts on hosts curl reaches fine). Installed and executing; expected to behave normally on a direct connection. Standard positive test: `sherlock torvalds --site GitHub --print-found`.

**morluto/rea — REA 6.8.0, INSTALLED AND VERIFIED.** REA ("Reverse Engineer Anything") is the open-source reverse-engineering toolkit for AI agents that Garrett first shared on 2026-10-05; the copy installed then (v3.2.1) was wiped in a VM replacement, and its reinstall was owed. It is now done: installed via the official `install.sh` to `~/.local/bin/rea` (`rea --version` → 6.8.0; `rea doctor` healthy — Node v24.22.1, procps present). Architecture, from the code: \~30 domain engine directories (ghidra, frida, electron, android, wasm, evm, pcap, …) bridging into the operator's own Ghidra/Hopper/IDA installations; the MCP catalog is progressive/deferred — a live `tools/list` returned **229 tools** on the initial page (the exact total is a runtime property, not a source constant). **Wiring done:** `rea setup --all-detected --yes` registered REA's MCP server into Claude Code, Gemini CLI, OpenCode, and Antigravity, and the MCP stdio handshake was verified end-to-end. Two loose ends, stated plainly: Ghidra 12.1.4 is present at `~/workspace/tools/ghidra_12.1.4_PUBLIC` but its path is not yet registered with REA; Hopper is not installed (its install is a separate decision).

**JoasASantos/REA-Prompts (REAP)** — 26 agent skill packs holding 102 ready-to-paste prompts (packs 00–22 plus prompt-writing-tips, a master index, and a wildcard pack), plus a 1,382-line `system_prompt.md` — all read and cataloged by function in the dissection. Installed via `./setup.sh claude-code` into `~/.claude/skills/` (agent sessions need a reload to pick them up). The packs most relevant to Garrett's work: 11 (Electron/JS — the largest, 11 prompts), 08 (Android), 02/04 (feature tracing and cloning), 17 (malware triage), 16 (long-running investigations).

---

## APPENDIX A — Source register (principal sources)

- **Winners (Part I):** DraftKings Network weekly Millionaire Maker winning-lineup recaps, Weeks 1–8 2026; GamblingSite.com weekly winner tables and DFS picks pages; TwoGunGPT, "The chalk, graded before Sunday" (contest parameters, Week 6); STAT-API worked example (Week 2 cross-check).
- **Format/datasets (Parts II–IV):** DraftKings Help Center (standings CSV export and the 10-day window); STAT-API documentation and pricing; Kaggle dataset census (incl. alandu20, NBA); RotoGuru; FootballGuys DraftKings spotlights (2015); EdgeLine winner census (2021–25); GamblingSite 2024/2025 complete winner sets; JoshEngleman/nfl-live-standings (CSV format); DFS Army publisher posts (dataset claims, audited).
- **Papers (Part V):** full texts in `~/workspace/dk-dfs-library/` — Hunter–Vielma–Zaman arXiv:1604.01455v3; Haugh & Singal author copy (Columbia, rev. 2019-05-23); Getty et al., SIAM Review via MIT DSpace (CC-BY); Mbeledogu, SSAC 2023 CDN; Mahoney & Paniak arXiv:2309.15253v2 — with equation-level dossiers alongside each. Newell 2017: KREX landing page/abstract only.
- **Sims (Part VI):** TwoGunGPT (twogungpt.com — method articles, Ceiling Board, Gunsmith grading, "Range" report card, shipped roi-feed artifact); SaberSim help center + 2024 NFL engineering walkthrough; Stokastic how-to article + shipped bundle; FantasyLabs support + RotoGrinders podcast (SimLabs); DFS Hero help center; Establish The Run, "NFL DFS: Putting the Sims to the Test" (Leone, 2026-09-06) — calibration audit of ETR's OWN Solver sims, 35 Game Changer contests / 9,570 teams, read in full 2026-11-07; McKinsey 2015 DFS player-economics; NY AG filings; two independent DeepSeek statistical derivations of the count question (DS1 and DS-5 dossiers) plus the architecture/input/adversarial dossiers — all in `~/workspace/dk-dfs-sims-deepseek/`.
- **Tools (Part VII):** the vendors' own shipped bundles and public surfaces, artifacts in `~/workspace/dk-dfs-sims-deepseek/vendor-crawl/`; findings in `VENDOR-TEETH.md` (same directory).
- **Open source (Part VIII):** chanzer0/NFL-DFS-Tools, DFS-FUN-SHOWDOWN, jrakestr/nfl-edge, bpattypick/dfs\_opto — cloned and read at file:line level, `~/workspace/dk-dfs-sims-deepseek/repos/`; pydfs-lineup-optimizer, draftfast, RobustDFS in `~/workspace/dk-dfs-library/code/`.
- **Recon stack (Part XI):** the six repositories cloned at `~/workspace/recon-stack/`; dissection at `~/workspace/recon-stack/DISSECTION.md`.

## APPENDIX B — Completion-gap audit

Per standing orders, nothing above is "done" without this list. Counts and closing paths included; attackable gaps found during assembly were attacked in the same pass (DFS Hero audit, Stokastic how-to, SimLabs deep section, dossier verification, round-1 truncation discovery) and are marked closed where they closed.

**Blocked on Garrett (1):**

1. **Lane A — DraftKings account standings pull: NOT DONE.** Four sign-in submissions from the research browser were refused by DraftKings' network edge ("Sorry, you're off our grid"); the saved credentials were never rejected. Zero account data recovered. Closes only with Garrett signing in himself via live-browser takeover and handing control back. This is also the only route to Week 4/6/7/8 standings-grade data outside STAT-API.

**Negative results (established, not gaps):**

2. Sun-Mon Classic winners: do not exist in any public record for any season searched (Part II) — structural, caused by the 10-day CSV expiry (Part IV).
3. Free lineup-level NFL dataset: does not exist (Part IV). "Katana" as a DFS repository: does not exist (Part VIII). *Cracking the DFS Code* TOC: not public (Part X).

**Partial records (4):**

4. Week 4 winner: screenshot-only source; Ertz and Jaguars DST salaries, total spend, entry count, and full ownership NOT FOUND; Lamb salary conflict ($7,800 ×2 vs $8,600 ×1) unresolved. Weeks 6/8 salaries reconstructed (sum-verified), Week 7 missing the Buccaneers DST salary.
5. Newell 2017 thesis and Bergner 2017 thesis: abstract-level dossiers only (DSpace bitstream unreachable; Cloudflare bot wall). Retry paths documented in the library MANIFEST. Haugh–Singal's published version and HVZ's journal version are paywalled; the acquired manuscripts are the same lineage.
6. Round 1's own report file was discovered during assembly to be **truncated mid-sentence** (its Parts 3–5 were never written to disk); the affected ground (era history, books, methods survey) was covered instead by rounds 2+ and is the basis of Parts III and X here — flagged so the round-1 file is never cited as complete.
7. nuclei-templates corpus: download in progress at dissection time; final template category counts NOT established.

**Evidence-grade caveats (3):**

8. Two DeepSeek topical dossiers (SaberSim, distribution-sims) worked from search-index excerpts after their live fetching failed; where their claims are load-bearing in Part VI they are corroborated by the bundle evidence or the vendors' own articles, and the Stokastic sampling-unit claim was upgraded mid-assembly by Stokastic's own how-to (Part VI.5 note). The ETR calibration study was re-read in full during the follow-on pass (2026-11-07 evening): its figures verified, and one attribution corrected — the study audits ETR's OWN Solver sims, not SaberSim/Stokastic outputs as one dossier summary had stated; Part VI.4 and Appendix A carry the corrected attribution.
9. Vendor count inconsistencies are recorded, not resolved: SaberSim 10K vs 100K by surface; DFS Hero 10K (current site/help) vs 20K (v2 site); Stokastic "thousands" (help copy) vs "tens of thousands" (marketing).
10. SimLabs' two support articles were obtainable only as search-indexed summaries in the DeepSeek session that covered them; the five-weight defaults are doubly sourced (support + podcast) but the full texts were not archived locally.

**Environment limits (2):**

11. katana live crawling and sherlock per-site checks are degraded by this VM's egress proxy; both tools are installed and verified as far as the environment permits (Part XI). REA's Ghidra path registration is the one unfinished wiring step in the recon stack.

**What would close the remainder:** Garrett's DK takeover (gap 1, and with it gap 4's standings data inside future 10-day windows); a STAT-API Pro month ($99, personal-use license — a spending decision, not taken here); a later retry on the Newell/Bergner bitstreams; a direct-egress host for katana/sherlock full function.

*— End of document. Research lanes' working files:&#32;`~/workspace/research_notes/`&#32;(rounds 1–2),&#32;`~/workspace/dk-dfs-library/`&#32;(papers + code),&#32;`~/workspace/dk-dfs-sims-deepseek/`&#32;(DeepSeek dossiers, teeth pass, repo clones),&#32;`~/workspace/recon-stack/`&#32;(six-repo dissection).*