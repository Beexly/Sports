# Garrett's Existing Sports Research — Coverage Map

**Built:** 2026-09-21 ~01:30 CDT (read-only; no sends/edits/deletes)
**Purpose:** so the new 500-paper arXiv deep-research sweep builds on what exists instead of duplicating it.
**Note:** per Garrett's corpus rule, the Sports repo is the record. Drive files noted here that duplicate repo content are flagged.

---

## Section 1 — Sports repo corpus map

Source: `~/workspace/vendor/Sports/docs/research/` — **468 files** across dated dirs (2026-09-10 → 2026-09-21) + named dirs. AGENTS.md (3,685 lines) carries the benchmark inventory.

### Per-directory topic list

| Directory | Contents / topics |
|---|---|
| `2026-09-10-galaxy-commentary-brand/` | final-report.md — X voice/brand research (not methods) |
| `2026-09-13-dfs/` | Week 1 DFS: deep/ (matchup-scheme, stacks, environment, winning-lineups), raw/ (consensus sources: FantasyPros/ESPN/CBS, NumberFire/RotoGrinders/FantasyLabs, DK Playbook), verify/ (ownership hunt, salaries, tiers, papers-scoring-strategy). FanDuel scoring rules verified 0.5 PPR |
| `2026-09-17/` | **The big benchmark drop.** README + dossiers/ (v1: 36 verified X analyst accounts, 26-metric catalog; v2: 50 more accounts, 9 lanes; 7-topic methods literature review; 156-item benchmark completeness audit), gse-lab/ (29 CSVs, 15 metric families computed from nflverse: team metrics, down splits, drives, EPA distributions, turnover luck, QB aggressiveness, rush/pressure, unit matchups, kickers, special teams, weekly trends; 4 Python scripts), props-consensus/ (Bills-Lions TNF: projection methods, garbage-time correction, script model, market captures, gamelogs), edge-sheet/ (published one-game graphic + build scripts), full-tables/ (14 weekly stat CSVs), statrankings/ (StatRankings CSV dumps) |
| `2026-09-18/` | chart-reads/ (6 chart CSVs), ftn/ (FTN DVOA docs, openapi.json, charting catalog), full-tables/ (30+ CSVs: benbbaldwin objective ratings v2 + SOS, gridironinfo team tables, sfdata9ers tables, tejfbanalytics QB EPA), statrankings/ |
| `2026-09-18-props-reverse-engineering/` | **Reverse-engineering mission**: 10 analyst accounts (sfdata9ers, ThunderDanDFS, SamHoppen, benbbaldwin, MagicSportsGuy, tejfbanalytics, RyanJ_Heath, Shauncore, b_peters12) — raw inputs, computation, data access, replicability verdicts per creator; report.md is the deliverable. firecrawl/ = API deep-dives (OddsPapi, APIVault, FreePublicAPIs, TheSportsDB, NFL historical-odds/stats-apis 50-link lists) |
| `2026-09-19/` | chart-reads + full-tables (benbbaldwin v3 ratings, SumerSports PRWR edge, PFF double-team rate, Statyx coverage/run-type matchups) |
| `2026-09-19-dk-week2/` | Week 2 DK main slate: deep/ (consensus by position, coverage matchups, defense scheme, DST phases, new-metrics-sweep, x-sweep1-4, referee crews MNF totals, SNF/MNF addendum), raw/, verify/, optimizer pool JSON |
| `2026-09-20/` | full-tables (CoverageIQ Ravens cards, hawkblogger QB EPA, magicsportsguy personnel usage, ngreenberg 4th-down go-for-it estimates 2002-2026, samhoppen WPA waterfalls, thunderdandfs WR coverage upgrades) |
| `2026-09-21/` | **X sweep** (5 accounts: TheHonestNFL, CFB_Data, Matt_barlowe, benlinsey_, NextGenStats) + **@NextGenStats profile deep-dive** (48 posts Sep 20 → Apr 25 2026, post-inventory + metric-glossary, 27 metric families, 2026 NGS additions: Run Scheme Classification, Run Blocking Matchups, Route Classification 2.0) |
| `cept/` | HONEST_CEPT.md + coin-commitments.json (CEPT = Garrett's ensemble theory lane; "Baxley Causal E-Process Theory" publication files also referenced in Gmail) |
| `competitor-scrape-2026-09-12.md` / `scrape-wave-2*.md` | Competitor tool scrape; contains the grouping-loss calibration paper (arXiv 2210.16315), temperature scaling, EV50 |
| `prediction-market-ecosystem-triage-2026-08-09.md` / `prediction-market-tool-bookmarks.md` | Polymarket/Kalshi/Octagon/Probalytics/TREMOR/Synthesis tooling; oracle3 (Wang Transform + Kelly); TurbineFi backtests |
| `2026-09-18-ml-research-brief.md` | **The 15-area ML research brief** (tabular learners, hierarchical pooling, representation learning on play-by-play, state-space team strength, learning-to-rank, interpretable models, conformal uncertainty, market-relative learning, online learning, causal inference, ensembling, automated discovery, multimodal fusion, frontier-model techniques, continuous learning loop) — topics commissioned, results not yet in repo |
| `2026-09-18-ngs-replacement-spec.md` | NGS replacement spec (build equivalents from public data) |
| `2026-09-18-ever-gauzy-reference-architecture.md` | Reference architecture doc |
| `pundit-signal-legal-research-prompt.md`, `evidence-source-strategy-2026-05-21.md`, `intelligence-pass-prompt.md`, `session-handoff-2026-09-12.md` | Ops/research prompts, not methods |
| `SUNDAY_FRONTIER_R_AND_D_MAP_2026-07-05.md`, `STATKING_STILL_DARK.md`, `anthropic-gate-content-flag-aware-2026-05-21.md` | Older R&D maps / status notes |

### Master "already covered" list — metrics & methods

**Efficiency core (computed in-repo from nflverse, 2026-09-17 gse-lab):** EPA/play (team, dropback/rush split), success rate (EPA>0 convention), drive stats, down splits, EPA distributions, extra metrics, metric percentiles, weekly trends, unit matchups.

**Luck layer (computed):** turnover luck (occurrence vs recovery), special teams EPA, kicker metrics, player first-downs, QB aggressiveness, rush/pressure splits.

**Metrics inventoried (26-metric catalog + sweeps, with provider traps documented):** EPA/play, dropback/rush EPA, success rate (3 competing definitions), DVOA, DAVE (83%/98% Week-1 2026 blend), EPA+CPOE composite, CPOE, DYAR, pressure rate, PRWR/PBWR (ESPN, Sumer, PFF — 3 public sources now), RBWR/RSWR, time to throw, explosive-play rate, havoc rate, stuff rate, red-zone EPA/trip rate, late-down efficiency, turnover margin/luck, special-teams EPA, situation-neutral pace, 4th-down aggressiveness, wind/weather, rest/bye (edge vanished post-2011 CBA), travel/altitude (no verified coefficient), SOS, FPI, PFF grades, SIS Total Points, separation/open rate (3 incompatible), RYOE, TPRR, YPRR, aDOT, air yards, YAC, PROE+, xFP/FPOE, GCOE, BDUE, RAS, QBR, ANY/A, DPAR, SumerScore, SP+, FEI, Massey/Sagarin/Colley, nfelo/nfelounits, Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, Plackett-Luce, Dixon-Coles, Skellam, Poisson, Harville, Stern.

**Calibration/uncertainty (covered):** CQR (conformalized quantile regression — Drive research doc), grouping loss (arXiv 2210.16315), temperature scaling, Platt scaling, isotonic regression, Venn-Abers, Mondrian/cross-conformal (ML brief topic), Clopper-Pearson intervals (repo calibration work), reliability diagrams / LRD (2207.13770), ECE by sport/week.

**State-space / dynamics:** Kalman filters, particle filters, dynamic Elo, nested AR(1) team strength (1701.05976), Gaussian processes, temporal fusion transformers (ML brief topics; 1701.05976 read in depth).

**Market microstructure:** closing-line value (CLV) as training label, de-vigged consensus, beat-the-close, line movement/steam, market-implied ratings (benbbaldwin tiers), Kalshi futures blends, Polymarket/Kalshi tooling.

**Bet sizing / decision:** Kelly criterion (mentioned 12×, no paper read), Wang Transform (oracle3, prediction-market lane), fourth-down WP models (nfl4th, full correction literature).

**NGS/tracking:** full 27-family taxonomy inventoried 2026-09-21 (MTF, RYOE, CPOE, EPA/dropback, pressure rate, get-off, quick pressure <2.5s, time to pressure, blitz rate, success rate, RECYOE, YAC over expected, completion probability, target separation, air distance, WP added, motion at snap, under-center splits, on/off-field splits, coverage-matchup splits, chip blocks, top speed, draft scores, route/run-scheme classification). STRAIN paper (2305.10262) read.

**X accounts inventoried (86+ verified across v1/v2 + daily sweeps):** @csv_enjoyer, @benbbaldwin, @ASchatzNFL, @bburkeESPN, @StatsbyLopez, @KeeganAbdoo, @SethWalder, @KevinCole___, @tejfbanalytics, @greerreNFL, @MathBomb, @BrandonThornNFL, @BaldyNFL, @BenjaminSolak, @Nate_Tice, @MikeClayNFL, @LordReebs, @ihartitz, @DwainMcFarland, @RufusPeabody, @ClevTA, @whale_capper, @NextGenStats, @PFF, @SumerSports, @SportsInfo_SIS, @SamHoppen, @DianteLeeFB, @GridironInfo_, @sfdata9ers, @MagicSportsGuy, @Shauncore, @statyxio, @DevyEusuf, @ScottBarrettDFB, @LateRoundQB, @ThunderDanDFS, @thunderdandfs, @hawkblogger, @cmain7, @benlinsey_, @CFB_Data, @Matt_barlowe, @TheHonestNFL, @JohnLaghezza, @JMac_FF, @AdamLevitan, @FTNFantasy, @PattonAnalytics, @FantasyPtsData, @EstablishTheRun + v2's 50 (betting-market lane: @AnthonyDabbundo, @iamrahstradamus, @EvanHAbrams, @TheHammerHQ, @RobPizzola, @CirclesOffHQ, @ForwardNFL, @PlusEVAnalytics, @gfienberg17, @CircaSports, @UnabatedSports, @VSiNLive, @beatingthebook; fantasy: @The_Oddsmaker, @LateRoundQB, @FriscoJosh, @HaydenWinks, @FFNateJahnke, @arjunmenon100; RotoViz staff; draft: @MoveTheSticks, @dpbrugler, @Jordan_Reid; film: @NFL_DougFarrar).

### arXiv papers already read in depth (dedup — skip these)

**From repo (7):**
| ID | Paper |
|---|---|
| 1802.00998 | Yurko/Ventura/Horowitz — nflWAR (multinomial-logit EP foundation) |
| 2409.04889 | Brill et al. — EP critique (drive-level dependence, selection bias) |
| 2309.00756 | Sandholtz et al. — risk preferences in 4th-down MDPs |
| 2305.10262 | STRAIN — tracking-data pass-rush metric |
| 2210.16315 | Grouping loss — calibration diagnostic |
| 1211.4000 | Performance of betting lines for predicting NFL games |
| 2408.10867 | Bye-week advantage vanished post-2011 CBA |

**From Drive 58-paper dossiers, full-text reads (57 — 2312.11067 withdrawn):**
1605.08753, 1607.00379, 1607.01756, 1701.05976, 1704.00197, 1704.00823, 1707.01855, 1710.02824, 1801.02954, 1902.08081, 1906.05029, 1909.08034, 1910.07410, 1911.01815, 1911.04541, 1911.08791, 2001.00878, 2005.12853, 2008.01485, 2011.11178, 2012.04378, 2105.09881, 2110.14017, 2202.08500, 2206.09083, 2206.13246, 2207.13770, 2207.14124, 2208.08598, 2301.04001, 2301.13052, 2303.01318, 2307.06754, 2310.03417, 2311.03490, 2402.12400, 2404.12499, 2405.10247, 2406.19563, 2408.08331, 2409.17129, 2411.02000, 2412.19363, 2501.02505, 2501.17711, 2502.07491, 2503.18589, 2503.21713, 2503.23911, 2505.21543, 2508.02725, 2602.08083, 2604.02447, 2606.09327, 2608.09824, 2608.21530.
Standouts already absorbed: iWinRNFL (1704.00197), Lopez/Baumer state-space (1701.05976), in-game soccer WP (1906.05029), conformal WP (2208.08598), GNN sports outcomes (2207.14124), LRD calibration dashboard (2207.13770), Fischer/Heuer soccer Poisson-vs-ML (2408.08331), FineCausal (2503.23911), diffusion trajectory modeling (2503.18589), TabTransformer event representation (2606.09327), Boltzmann-informed probabilities (2505.21543), xG player/position-adjusted (2301.13052), 4th-down humility (2311.03490), bookmaker-rigging critique (1710.02824).

**Other cited (non-arXiv):** Bock 2017 (PMC5969004, turnovers GBM), Romer 2006, Yam & Lopez 2019, Daly-Grafstein 2023 (Heckman), Lopez 2020 (yardline rounding), Brill/Yurko/Wyner 2023, Roach & Owens 2024, PLOS ONE 2023 "statistical theory of optimal decision-making in sports betting", Stuart 1990-2012 fumble recovery, Burke 2007.

**Overlap with the new fetch:** 41 of the current 841 fetched papers match already-covered IDs (list verified 2026-09-21: 1802.00998, 2409.04889, 2408.08331, 2311.03490, 2301.13052, 2301.04001, 2208.08598, 2207.14124, 2207.13770, 2202.08500, 2105.09881, 2012.04378, 2011.11178, 1911.04541, 1906.05029, 1902.08081, 1707.01855, 1704.00197, 1701.05976, 2608.21530, 2608.09824, 2606.09327, 2604.02447, 2508.02725, 2505.21543, 2503.21713, 2503.18589, 2502.07491, 2501.17711, 2501.02505, 2411.02000, 2409.17129, 2406.19563, 2405.10247, 2404.12499, 2310.03417, 2303.01318, 2206.13246, 2005.12853, 1911.08791, 1911.01815). Screeners: mark these SKIP, or re-read only if a newer version adds results.

---

## Section 2 — Gmail research threads summary

Read-only triage, queries capped at 30 results each. (~25 emails read; rest were notifications/vendor spam.)

| Thread / sender | Dates | Substance |
|---|---|---|
| Google Deep Research notifications (workspace-deepresearch-noreply@google.com) | 2026-09-17 | Two commissioned reports ready: **"Galaxy Sports Edge Research Audit"** and **"Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE"** (full text lives in Drive as Google Docs — see Section 3) |
| Grok daily briefs (noreply@x.ai, "Grok" sender) | 2026-08-28 → 2026-09-12, daily | Short-subject news alerts ("Swift Bears extension, Brown IR", "Maye 3 INTs, Brown ankle") — **news/injury/cap signals for the engine, not methods research** |
| Codacy bot notifications | 2026-09-16 → 2026-09-19 | Repo workflow results: `Sports/gse/research-by-category-workflow`, `Sports/claude/gse-gsn-architecture-research`, `Sports/hermes/opp-adj-epa-20260919` — CI noise, but confirms **Hermes's opponent-adjusted EPA build** is active in the repo |
| GitHub Copilot notification | 2026-08-10 | "[WIP] Add Baxley Causal E-Process Theory publication files" — Garrett's own theory lane (CEPT), still WIP |
| arXiv/substack/EPA keyword searches | 60-day window | No research-paper emails; newsletter queries returned only vendor spam (TeePublic, Roboflow, AgentMail) |

**Active threads:** (1) the two Deep Research reports (delivered, awaiting digestion into the repo); (2) Grok daily news-signal briefs (ongoing, feeding engine inputs not methods); (3) Hermes's opp-adj-EPA repo work (2026-09-19, in flight).

---

## Section 3 — Google Drive research files

~50 files matched (research/GSE/Galaxy/sports/model/metric name filters). Key items:

**Deep Research reports (Google Docs, 2026-09-18 → 2026-09-20, metadata only — no export per rule):**
- "Galaxy Sports Edge Research Audit" (+ v1/v2 docx copies, 2026-09-20)
- "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE" (+ docx copies)
- "Architectural Blueprint for a Calibrated, Tracking-Decoupled Sports Probability Engine" (+ docx copies)
- "World-Class Sports Probability Engine Corpus Audit" (+ docx copies)
- "CQR Research" (+ docx copies) — conformalized quantile regression research

**58-paper deep-reads (downloaded, plain markdown):**
- `GSE_58_independent_research.md` (2026-09-16, 57KB) — independent relevance pass, Band 1-4 ranking
- `GSE_58_paper_dossiers.md` (2026-09-16, 68KB) — per-paper: core method, equations, reported results, code/data, GSE application, implementation cost/risk

**Other:**
- `research_results.csv` / `.json` (2026-09-15, 1,343 rows) — general arXiv ID harvest (Company,url columns), **no sports content** — not sports research, likely a pipeline artifact
- `gse_research_analysis*.xlsx` (multiple, 2026-09-16/17/20) — research tracking spreadsheets (metadata only)
- "GSE FINAL LAUNCH 9.20", "Galaxy Sports Edge Launch Plan" (2026-09-20) — launch docs, not methods
- Zip archives: Sports-main (3)/(4)/(6)/(7), GSE.zip, GSE2.zip, gse-competitive-intel-main.zip — repo snapshots
- Folders: "research" ×2, "Galaxy Sports Edge", "gse-frontier-recovery", "Galaxy Sports Edge Launch Ready", "20260523002500_add_model_journal_entries"

**Dedup note:** the 58-paper dossiers + CQR/conformal Deep Research reports already cover Garrett's deepest paper reads. The new sweep must not re-read these 57 IDs.

---

## Section 4 — Dedup guide + gap list

### DEDUP GUIDE (skip or deprioritize in the new 500)

**Papers (64 IDs):** the 7 repo-covered + 57 Drive-dossier IDs listed in Section 1. 41 already overlap the fetched corpus — mark SKIP in screening.

**Methods already implemented or deeply researched in-repo (no new-paper value unless a result overturns them):**
- EP as 7-event probability vector (Yurko foundation + nflfastR XGBoost production status)
- CPOE as Bernoulli residual + shrinkage (nflfastR cp_model = XGBoost; feature list UNVERIFIED — a paper pinning it down is still valuable)
- DVOA/DAVE mechanics (opponent adjustment, 50/30/20 prior-year splits, 83%/98% early blend)
- Turnover occurrence-vs-recovery split (Stuart 0.00/-0.02, forced-not-recovered rule)
- Pressure generation vs sack conversion (R²<0.005, STRAIN r=0.8545)
- EPA forward-validity numbers (pass 0.53-0.61 vs rush 0.13-0.19)
- 4th-down correction literature (selection bias, yardline rounding, uncertainty understatement)
- NGS metric taxonomy (2026-09-21, 27 families) — NGS methodology papers are proprietary, but arXiv tracking-data methodology that *reproduces* them is in scope
- Calibration stack: CQR, grouping loss, temperature scaling, LRD, ECE-by-slice

**Accounts:** 86+ X handles inventoried — sweep posts, not profiles, unless new methods appear.

### GAP LIST — prioritize these in the new 500 (thin or absent)

1. **Kelly criterion / optimal bet sizing under uncertainty** — mentioned 12× in repo, zero papers read. Fractional-Kelly, Kelly with estimation error, portfolio-of-bets sizing are directly product-relevant.
2. **nflfastR CPOE/EP feature specifications** — methodology articles unfetchable in prior passes (UNVERIFIED). Any paper pinning down current production features is high value.
3. **Market microstructure in sports betting** — only 1211.4000 + PLOS ONE 2023. Order flow, steam-move predictability, limit-order-book analogues, when public models beat liquid closes: thin.
4. **RL / bandits for pick selection** — ML brief lists contextual bandits, but no papers read. Selection-under-budget, learning-to-abstain with coverage-risk curves.
5. **Optimal transport / diffusion for sports** — FineCausal and trajectory-diffusion are covered; OT for matchup modeling, schedule strength, or distribution-shift correction is absent.
6. **Peer-reviewed EPA forward-validity** — the dossier's own "biggest literature gap." Any apples-to-apples forward validation of passing EPA vs rushing EPA vs success rate is priority.
7. **In-play / live NFL spread & total modeling** — iWinRNFL covers in-game WP; live *spread/total* probability surfaces are thin.
8. **Weather physics for totals** — barometric-pressure benchmark exists; no papers on wind physics × stadium geometry × passing efficiency.
9. **Causal injury impact** — causal inference is a brief topic; player-level causal injury effect estimation (synthetic controls on QBs/OL) is thin.
10. **DFS-specific optimization literature** — repo has deep DFS practice work; academic contest-theory / ownership-game equilibrium papers are absent.
11. **Non-NFL sports depth** — 58-paper set skews soccer/volleyball/tennis; golf, MMA (FightTracker withdrawn), NHL, MLB Statcast-era prediction papers are thin.
12. **Text/news as features beyond the price** — ML brief area 13 commissioned, no papers read; beat-writer text embeddings for injury news is untested.
13. **Referee/crew effects on totals** — repo has referee-crews MNF totals work; no academic papers.
14. **Hawkes processes / self-exciting models** — mentioned 1×; momentum/scoring-burst modeling absent.
15. **Garrett's own lanes (do not duplicate, do cite):** CEPT / Baxley Causal E-Process Theory (WIP publication files), MOVE-37 machine-discovery lane, the 15-area ML research brief (results pending), the two Deep Research reports in Drive (awaiting repo digestion).

---

**Counts for this map:** 468 repo files listed (READMEs/index files read fully, ~30 key files sampled, corpus-wide greps for metrics/methods/handles/papers); ~25 Gmail messages triaged across 5 queries; 50 Drive files matched, 3 downloaded (GSE_58 ×2 markdown + research_results.csv), 8 Google Docs recorded by metadata.
