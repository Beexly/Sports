# GSE Engine-Benchmark Completeness Audit — 2026-09-17

**Mandate (Garrett, 2026-09-17):** every advanced metric, stat breakdown, new
stat, analytic, account/profile, document, spreadsheet, and source path goes
into the Sports repo's `AGENTS.md` — nothing lost, nothing forgotten.
Proactively find more the same way Garrett does.

**Scope audited:**
- `~/workspace/gse-research/dossier-v2-accounts.md` (50 accounts, 10 method
  deep-dives, watch lane, entries 51-58)
- Every `.md` in `~/workspace/gse-research/props-consensus/`
- `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md` + all CSVs + all
  scripts
- `~/workspace/gse-research/edge-sheet/README.md` + build scripts + design
  docs
- Sports `docs/` screenshots (air-yards, coverage-defender)

**Compared against:** `~/workspace/vendor/Sports/AGENTS.md` (1,545 lines,
read in full 2026-09-17).

**Coverage standard per item:** does AGENTS.md carry (1) the account/profile,
(2) the metric definition, (3) the engine gap, (4) the source-document path?
All four = COVERED. Fewer = MISSING (partial state noted). **Nothing was
edited in the Sports repo during this audit** — the ready-to-append blocks in
Section 3 are for Garrett/parent review and append.

**Integrity flags found during the audit:**
1. `docs/coverage-defenders-week1-2026.png` is very likely the WRONG image:
   the 2026-09-17 archive command copied the TikTok ad-credit screenshot
   (`media_library/image/3a/3a33…png`) instead of Garrett's coverage screenshot
   (`media_library/image/2c/2ccc…jpg`). Replace before trusting the section.
2. AGENTS.md says "14 new CSVs" in the extended metric library line — the
   directory holds **29 CSVs** (15 families). Count corrected below.

---

## 1. Executive summary

| Tally | Count |
|---|---|
| **Total items inventoried** | **156 (96 accounts/profiles + 32 metric/analytics rows + 16 documents + 4 spreadsheet rows + 6 scripts + 2 screenshots)** |
| COVERED (all four: profile + definition + gap + path) | 82 |
| MISSING (≥1 of the four absent) | 73 |
| Integrity flag (covered, but archived file is likely wrong) | 1 |

Breakdown: accounts — 96 inventoried, all with profile+path in AGENTS.md,
56 with full metric-definition coverage, **40 missing definitions** (the v2
lane accounts outside the 10 deep-dives). Metrics: 32 rows, 11 covered, 21
missing. Documents: 16, 11 covered, 5 missing. Spreadsheets: 4, 1 covered,
3 missing. Scripts: 6, 2 covered, 4 missing. Screenshots: 2, 1 clean, 1
flagged.

**Three most important missing items:**
1. **Edge-sheet v2 eight-panel rebuild** — AGENTS.md describes only the v1
   3-panel prototype. The current build (`build_edge_sheet_v2.py`: efficiency
   map, 10-metric percentile faceoff, dropback-EPA KDE, luck ledger, form
   lines, situational edges, unit matchups, THE READ footer; fair line =
   net-EPA × 63 + 2.0 HFA) is unrecorded. The repo's record of our flagship
   data product is stale.
2. **Garbage-time correction + script-adjusted volume model**
   (`projection_methods.md`) — the measured unfiltered/filtered ratios
   (1.025-1.195 per stat) and possession-WP-bucket dropback rates (BUF 53% /
   DET 63%) are load-bearing for every props number published. AGENTS.md
   carries the verdicts but not the method; a future builder cannot reproduce
   the numbers from AGENTS.md alone.
3. **Drive-outcome system + extra metrics** (`drive_stats_*`, `extra_metrics_*`
   CSVs) — drive TD/FG/punt/3-and-out/turnover rates, avg starting field
   position, stuff rate, air-vs-YAC EPA, late-and-close EPA. Not named in
   AGENTS.md at all. These are exactly the engine-feature candidates the
   benchmark lane exists to capture, and the "14 new CSVs" line undercounts
   the lab's output (29 files).

---

## 2. Inventory and coverage

Legend: ✅ = COVERED · ❌ = MISSING (partial notes inline). "Path" means the
source document is named/linked in AGENTS.md.

### 2A. Accounts and profiles

| # | Item | Source doc | Profile | Metric def | Engine gap | Path | Verdict |
|---|---|---|---|---|---|---|---|
| A1 | v1: 36 verified accounts (tables + alternates) | landscape v1 | ✅ | ✅ (§2) | ✅ (§3) | ✅ | ✅ |
| A2 | v2 lane 1: @throwthedamball, @statsowar, @ESPN_BillC, @mrcaseb, @LeeSharpeNFL, @Ben_R_Brown_, @ericeager_ | dossier-v2-accounts.md | ✅ (lanes list) | ❌ (SP+, BDUE/GCOE, mixed-effects EPA named, not defined) | ❌ | ✅ | ❌ |
| A3 | v2 lane 2: 13 betting-market accounts (@UnabatedSports, @CirclesOffHQ, @RobPizzola/betstamp, @beatingthebook, @AnthonyDabbundo, @EvanHAbrams, @TheHammerHQ, @ForwardNFL, @PlusEVAnalytics, @gfienberg17, @CircaSports, @VSiNLive, @iamrahstradamus) | dossier-v2-accounts.md | ✅ | ❌ (vig-free consensus, synthetic hold methods not defined) | ❌ | ✅ | ❌ |
| A4 | v2 lane 3: @Jason_OTC (Fitzgerald-Spielberger draft chart) | dossier-v2-accounts.md | ✅ | ❌ (chart named, not defined) | ❌ | ✅ | ❌ |
| A5 | v2 lane 4: 14 fantasy quants (@The_Oddsmaker, @LateRoundQB, @FriscoJosh, @HaydenWinks, @FFNateJahnke, @davecabanff/GLSP, @JohnLaghezza, @arjunmenon100, …) | dossier-v2-accounts.md | ✅ | ❌ (GLSP, air-yards pioneering, VBD, Koerner projections not defined) | ❌ | ✅ | ❌ |
| A6 | v2 lane 5: 5 RotoViz staff | dossier-v2-accounts.md | ✅ | ❌ | ❌ | ✅ | ❌ |
| A7 | v2 lane 6: draft — @MoveTheSticks, @dpbrugler, @Jordan_Reid | dossier-v2-accounts.md | ✅ | ❌ | ❌ | ✅ | ❌ |
| A8 | v2 lane 7: film — @NFL_DougFarrar | dossier-v2-accounts.md | ✅ | ❌ | ❌ | ✅ | ❌ |
| A9 | v2 lane 8: 5 official brands | dossier-v2-accounts.md | ✅ (also v1) | ✅ | ✅ | ✅ | ✅ |
| A10 | v2 lane 9: indie @EstablishTheRun | dossier-v2-accounts.md | ✅ | ❌ | ❌ | ✅ | ❌ |
| A11 | Watch lane: @NutshellSportz, @GridironInfo_ | dossier-v2-accounts.md | ✅ | ✅ (RB FD quadrants; 4-man vs pressure) | ✅ (recomputed, matched) | ✅ | ✅ |
| A12 | Eight-post sweep entries 51-58 (8 accounts) | dossier-v2-accounts.md | ✅ | ✅ | ✅ (ranked build targets 1-6) | ✅ | ✅ |
| A13 | v2: 10 method deep-dives (Carpenter, Baldwin, Schatz, Clay, Abdoo, Walder, Cole, Sharp, Peabody, Greer) | dossier-v2-accounts.md | ✅ | ✅ (§2) | ✅ (mostly) | ✅ | ✅ |

Note: Peabody deep dive's **barometric-pressure/humidity totals modeling**
is in the dossier but not in AGENTS.md's §2 Peabody bullet → itemized as
missing in Section 3.

### 2B. Metric and analytic items

| # | Item | Source doc | Verdict | Notes |
|---|---|---|---|---|
| B1 | team_metrics_2025/2026 (48 cols, filters, EP model, success=EPA>0, garbage-time def) | COMPUTATION_NOTES.md | ✅ | §4 "Our own lab numbers" |
| B2 | Sanity checks (JAX +0.400 W1, DAL turnover-luck demo, SEA def +0.112) | COMPUTATION_NOTES.md | ✅ | §4 |
| B3 | metric_percentiles_*: pct = (rank-1)/(n-1)×100, 100 = best, lower-is-better inverted | COMPUTATION_NOTES.md | ❌ | Named in "extended library"; convention not stated |
| B4 | epa_distributions_*: team×side×split, n/mean/p10/p25/median/p75/p90/share_neg_epa/share_chunk_epa (EPA>1.0) | COMPUTATION_NOTES.md | ❌ | Named only |
| B5 | weekly_trends_2025: 544 rows, 32 teams×17 wks, bye gaps | COMPUTATION_NOTES.md | ❌ | Named only |
| B6 | unit_matchups_*: pass/rush off vs opposing def EPA + success, stuff_rate, pct ranks | COMPUTATION_NOTES.md | ❌ | Named only |
| B7 | drive_stats_*: drive = game_id×fixed_drive, td/fg/punt/3-and-out/turnover-drive/downs rates, avg start own 30.4, 2.10 ppd, UNFILTERED sample | COMPUTATION_NOTES.md | ❌ | Not named at all |
| B8 | down_splits_*: early_1_2 vs late_3_4, defense sign-flipped | COMPUTATION_NOTES.md | ❌ | Named only |
| B9 | extra_metrics_*: stuff_rate(+allowed), air_epa/yac_epa/air_yards per dropback (+allowed), late-and-close EPA (4Q, wp ∈ [0.20, 0.80]) | COMPUTATION_NOTES.md | ❌ | Not named at all |
| B10 | kicker_metrics_*: FG by distance bucket, XP rate, kicking pts/game, FG/XP EPA/att, kicker names | COMPUTATION_NOTES.md | ❌ | Named as "kicker by distance bucket" only; no columns/path detail |
| B11 | defense_detail_*: INT forced/dropback, FF rate, opp fumble recovery share, COMPUTED TFL rate (yards_gained<0), takeaway rate/drive, def TD rate, pts allowed/drive | COMPUTATION_NOTES.md | ❌ | Named with hints; computed-TFL caveat + paths absent |
| B12 | special_teams_*: touchback rate (35-yd spot, dynamic kickoff), opp avg start, kick/punt EPA, return EPA (bundled caveat), blocks | COMPUTATION_NOTES.md | ❌ | Named only |
| B13 | turnover_luck_*: occurrence (partially skill) vs recovery (near-pure noise) decomposition; league recovery 46.3%; DET 26.3% case | COMPUTATION_NOTES.md | ❌ | Named only; decomposition absent |
| B14 | player_first_downs_*: rush/rec FD rates per reception AND per target; qualifiers 50+ rushes / 30+ targets (2025) | COMPUTATION_NOTES.md | ❌ | Named only |
| B15 | qb_aggressiveness_*: aDOT, CPOE (throwaway-handled, nflfastR cp), qualifiers 100+ att | COMPUTATION_NOTES.md | ❌ | Named as "aDOT/CPOE" only |
| B16 | rush_pressure_*: four_man_rush_rate (FTN n_pass_rushers), pressure proxy = (hit OR sack)/dropback = floor, matched @GridironInfo_ within 1-3 pts | COMPUTATION_NOTES.md | ❌ | Named only |
| B17 | FTN charting 2026 now public, 100% join on dropbacks | COMPUTATION_NOTES.md | ✅ | In sweep section |
| B18 | Turnover→INT props (FTN is_interception_worthy 2025; Allen 3.66% worthy rate, 52.3% conversion; sack props NULL R²<0.005) | projection_methods.md | ✅ | In CONSENSUS PROPS |
| B19 | Garbage-time correction: measured unfiltered/filtered ratios (Allen att 1.025, Goff 1.105, targets 1.042-1.195; moves Allen 195→201, StB rec 6.5→8.0) | projection_methods.md | ❌ | Load-bearing method, absent from AGENTS.md |
| B20 | Script-adjusted volume model: dropback rates by possession-WP bucket (BUF lead 50.0/neutral 57.2/trail 61.8; DET 50.0…68.2); tonight 53%/63% | projection_methods.md | ❌ | Absent |
| B21 | Efficiency baselines 2025 (YPA, YPC, target shares, catch rates, YPT, TD means, tackles/g) | projection_methods.md | ❌ | Absent |
| B22 | Split-half target-share stability test (StB 29.5/27.0 ✓; Kincaid/LaPorta fail naive → when-active shares + Wk1 confirmation) | projection_methods.md | ❌ | Absent |
| B23 | Market comparison (DK via SI 2026-09-16; Allen 250.5 vs 201 UNDER; Gibbs 89.5 vs 95 no-edge; StB 7.5 vs 8.0 mild over) | projection_methods.md | ❌ | AGENTS.md has verdict shape, not this audit |
| B24 | Roster-correction protocol (Montgomery→HOU, Moore→BUF verified in pbp; Vaki too thin to price) | projection_methods.md | ✅ | In CONSENSUS PROPS |
| B25 | Allen scramble composition (45/89 rushes scrambles = 71% of rush yards; goal-line 27 RZ rushes → 13 TDs, 48.1%) | projection_methods.md | ❌ | Absent |
| B26 | Eight-post metrics: Havoc/Threat, FPOE/xFP/FP-S, QB pocket EPA, draft Monte Carlo, ST EPA, penalty EPA, hidden yardage, best-ball/survivor EV | agents-draft-eight-posts.md | ✅ | Ranked build targets 1-6 |
| B27 | Air-yards decomposition (catchable / not-catchable / dropped) | Garrett screenshot | ✅ | ENGINE BENCHMARK section |
| B28 | Coverage-defender grades (yards/route vs avg, opp-adjusted, 83%-fade prior, OVER EXP.) | @hawkbledger screenshot | ✅ | ENGINE BENCHMARK section (file-flagged) |
| B29 | v1 26-metric catalog (EPA, DVOA, DAVE, CPOE, PRWR/PBWR, pressure, luck layer, pace, wind, rest, SOS…) | advanced-metrics-data-source-catalog.md | ✅ | §2 "The metrics" |
| B30 | EP model = XGBoost now (not Yurko logit); CPOE feature list UNVERIFIED; fumble recovery 0.00/-0.02; pressure→sack luck R²<0.005; 4th-down gap; drive-grouped validation | dossier-v2-methods.md | ✅ | §3 "Methods literature" |
| B31 | Engine gap analysis (opponent-adj EPA #1, turnover regression #2, pressure matchup #3, QB efficiency #4, market-relative calibration #5, tiers 6-13, deprioritized list) | AGENTS.md §3 | ✅ | Present |
| B32 | Barometric pressure + humidity in totals models (Peabody early-career signature) | dossier-v2-accounts.md §9 | ❌ | Dossier has it; AGENTS.md §2 Peabody bullet omits it |

### 2C. Documents

| # | Item | Verdict | Notes |
|---|---|---|---|
| C1 | dossier-v2-accounts.md | ✅ | Referenced §1219, §1410 |
| C2 | dossier-v2-methods.md (7-topic lit review) | ✅ | Referenced §1220 |
| C3 | COMPUTATION_NOTES.md | ✅ | Referenced §1220, §1446 |
| C4 | advanced-metrics-data-source-catalog.md | ✅ | Referenced §905, §1004 |
| C5 | nfl-analytics-x-dossier.md | ✅ | Referenced §906 |
| C6 | docs/2026-09-17-advanced-analytics-landscape.md (v1) | ✅ | Referenced §904 |
| C7 | docs/2026-09-17-advanced-analytics-landscape-v2.md | ✅ | Referenced §1217 |
| C8 | props-consensus/props-report.md | ✅ | Referenced §1365 |
| C9 | props-consensus/game-projections.md | ✅ | Referenced §1459 |
| C10 | props-consensus/our-metric-stack.md | ✅ | Referenced §1448 |
| C11 | props-consensus/agents-draft-eight-posts.md | ✅ | Referenced §1411 |
| C12 | props-consensus/projection_methods.md | ❌ | Never named in AGENTS.md |
| C13 | props-consensus/kicker-defense-props.md | ❌ | Never named in AGENTS.md |
| C14 | props-consensus/sources_notes.md | ❌ | Never named in AGENTS.md |
| C15 | edge-sheet/README.md | ✅ | Referenced §1342 |
| C16 | edge-sheet/DESIGN_BRIEF.md + DESIGN_CRITIQUES_V2.md | ❌ | Never named |

### 2D. Spreadsheets / CSVs

| # | Item | Verdict | Notes |
|---|---|---|---|
| D1 | nfl-2026: team_metrics_2025/2026 | ✅ | §1317-1332 |
| D2 | nfl-2026: 27 more CSVs (percentiles, distributions, weekly_trends, unit_matchups, drive_stats, down_splits, extra_metrics, kicker, defense_detail, special_teams, turnover_luck, player_first_downs, qb_aggressiveness, rush_pressure — 2025+2026) | ❌ | Only family names in one line; **drive_stats and extra_metrics not named**; exact file paths absent; count says "14", actual 29 |
| D3 | props-consensus/consensus_lines.csv + our_projections.csv | ❌ | Never named |
| D4 | edge-sheet/dropback_epa_2025_all.csv (v2 data artifact) | ❌ | Never named |

### 2E. Scripts

| # | Item | Verdict | Notes |
|---|---|---|---|
| E1 | nfl-2026/compute_team_metrics.py | ✅ | §1319 ("script") |
| E2 | nfl-2026/compute_advanced_metrics.py | ❌ | Never named |
| E3 | nfl-2026/compute_kicker_defense_metrics.py | ❌ | Never named |
| E4 | nfl-2026/compute_player_metrics.py | ❌ | Never named |
| E5 | edge-sheet/build_edge_sheet.py (v1) | ✅ | §1341 |
| E6 | edge-sheet/build_edge_sheet_v2.py (8-panel rebuild) | ❌ | Never named |

### 2F. Screenshots

| # | Item | Verdict | Notes |
|---|---|---|---|
| F1 | docs/air-yards-week1-2026.png | ✅ | Full benchmark section; file verified correct |
| F2 | docs/coverage-defenders-week1-2026.png | ✅-with-flag | Full benchmark section, BUT the archived file is likely the TikTok ad-credit screenshot, not Garrett's coverage image — replace before use |

---

## 3. Ready-to-append blocks for every missing item

Each block follows the mandated format. Nothing below has been appended to
`AGENTS.md` — parent/Garrett reviews and appends.

---

## ENGINE BENCHMARK: SP+ AND MIXED-EFFECTS EPA ATTRIBUTION (2026-09-17)

**Source:** @ESPN_BillC (Bill Connelly, SP+ creator) and @statsowar (Parker
Fleming, Sumer Sports) — verified accounts in
`~/workspace/gse-research/dossier-v2-accounts.md` (v2 lane 1). Method claims
per the dossier; independent verification pending.

**Metric:** SP+ = tempo- and opponent-adjusted, forward-facing efficiency;
priors phase out weekly; résumé SP+ uses capped margin. @statsowar's EPA
attribution = mixed-effects modeling of EPA separating QB, coaching,
opponent, supporting cast, and weather/venue controls. Lane-mates: @mrcaseb
(nflreadr co-author, data infra), @LeeSharpeNFL (EP/pbp modeling),
@Ben_R_Brown_ (ESPN Bet data science, blowup-performance probability
models), @ericeager_ (Sumer: BDUE = Bite Distance Under Expected, GCOE =
Ground Covered Over Expected — linebacker run-flow vs play-action
susceptibility).

**Engine gap:** we have no mixed-effects attribution (no QB/coaching/
opponent/supporting-cast decomposition of EPA) and no SP+-style forward
prior schedule. Build target: hierarchical EPA attribution on nflverse
(random effects for QB, coach, opponent); weekly-decaying prior à la DAVE.

---

## ENGINE BENCHMARK: VIG-FREE CONSENSUS AND MARKET TOOLING (2026-09-17)

**Source:** @UnabatedSports (Rufus Peabody's shop), @RobPizzola (betstamp
co-founder), @CirclesOffHQ, @beatingthebook — verified accounts,
`~/workspace/gse-research/dossier-v2-accounts.md` (v2 lane 2).

**Metric:** vig-free consensus lines (de-juiced), synthetic hold, +EV /
arbitrage / middle detection across books. betstamp = line-shopping and
bet-tracking tooling. Circles Off = market-education content.

**Engine gap:** v5.3.0's conjunction gate compares model p to de-vigged
market p from one source; we have no multi-book vig-free consensus feed,
no synthetic-hold computation, and no arb/middle scanner. Build target:
multi-book consensus puller, de-vig (Shin or logit), synthetic-hold alert.

---

## ENGINE BENCHMARK: FITZGERALD-SPIELBERGER DRAFT VALUE CHART (2026-09-17)

**Source:** @Jason_OTC (Jason Fitzgerald, OverTheCap founder) — verified,
`~/workspace/gse-research/dossier-v2-accounts.md` (v2 lane 3).

**Metric:** draft-pick value chart that prices draft slots by later
salary/financial outcomes rather than Pro Bowls or games started.

**Engine gap:** our draft Monte Carlo (build target #2) prices picks by
expected player value; we have no salary-outcome-based pick valuation.
Build target: fit pick-value curve on second-contract APY by draft slot.

---

## ENGINE BENCHMARK: FANTASY-PROJECTION METHODS (2026-09-17)

**Source:** @davecabanff (Dave Caban, RotoViz — GLSP: Game Level Similarity
Projections), @FriscoJosh (Josh Hermsmeyer — air-yards/receiver-usage
pioneer), @LateRoundQB (JJ Zachariason — value-based drafting),
@The_Oddsmaker (Sean Koerner — FantasyLabs/Action projections, multiple
FantasyPros accuracy awards), RotoViz staff, @MoveTheSticks / @dpbrugler /
@Jordan_Reid (draft), @NFL_DougFarrar (film), @EstablishTheRun —
all verified, `~/workspace/gse-research/dossier-v2-accounts.md` (v2 lanes
4-7, 9).

**Metric:** GLSP = range-of-outcomes projections from game-level similarity
matching; air-yards-based receiver usage (Hermsmeyer); value-based
drafting; Koerner's weekly projection tiers and best-ball stacks.

**Engine gap:** our player-projection framework (props-consensus) uses base
rates + script adjustment; we have no similarity-based range-of-outcomes
engine and no air-yards usage model feeding it. Build target: GLSP-style
nearest-neighbor game matching for prop distributions; air-yards share as
a leading usage indicator (links to the air-yards benchmark section).

---

## ENGINE BENCHMARK: BAROMETRIC PRESSURE IN TOTALS MODELS (2026-09-17)

**Source:** Rufus Peabody deep dive, `~/workspace/gse-research/dossier-v2-accounts.md`
entry 9. Method claim per the dossier; early-career signature, not his
current stack.

**Metric:** NFL/MLB totals models incorporating barometric pressure and
humidity as weather variables, alongside wind.

**Engine gap:** AGENTS.md's weather entry covers wind (nonlinear,
stadium-specific) but not pressure/humidity. Our totals inputs have no
atmospheric-pressure term. Build target: backtest pressure/humidity
coefficients on historical totals; experimental only until verified.

---

## ENGINE BENCHMARK: PERCENTILE CONVENTION AND EPA DISTRIBUTIONS (2026-09-17)

**Source:** computed 2026-09-17 by Worker A, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `metric_percentiles_2025/2026.csv`, `epa_distributions_2025/2026.csv`.

**Metric:** percentile pct = (rank-1)/(n-1)×100 per season (n=32),
**100 = best in league, 0 = worst**; lower-is-better metrics inverted
(def success allowed, explosive allowed, INT/fumble rates, sack/hit
allowed, stuff rates). Identifier/volume/raw-count columns get no
percentile. EPA distributions: long format team×season×side×split
(all/dropback/rush), columns n, mean, p10/p25/median/p75/p90,
share_neg_epa, share_chunk_epa (EPA > 1.0).

**Engine gap:** AGENTS.md names these files but not the convention — a
builder reading "84th percentile" cannot know 100 = best without the
source doc. Append the convention and the distribution columns; the
distributions (median vs mean, chunk rate) feed underdog/over pricing
where tail shape matters.

---

## ENGINE BENCHMARK: WEEKLY TRENDS AND UNIT MATCHUPS (2026-09-17)

**Source:** computed 2026-09-17 by Worker A, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `weekly_trends_2025.csv`, `unit_matchups_2025/2026.csv`.

**Metric:** weekly_trends = 544 rows (32 teams × 17 weeks, bye weeks
absent): weekly EPA/play, EPA/dropback, EPA/rush, success rate, defensive
splits. Unit matchups = pass_off/rush_off EPA + success vs pass_def/
rush_def EPA (sign-flipped) + success allowed, stuff_rate and
stuff_rate_allowed, int_worthy_throw_rate (2025), n_plays, plus _pct ranks.
BUF@DET 2025 sheet: BUF pass O +0.174 (84th) vs DET pass D +0.014 (61st);
DET pass O +0.168 (81st) vs BUF pass D +0.108 (94th).

**Engine gap:** no form/trend features in the engine; no unit-level matchup
matrix (pass O vs pass D, rush O vs rush D). Build target: weekly-trend
momentum features and unit-matchup differentials as spread/total inputs.

---

## ENGINE BENCHMARK: DRIVE-OUTCOME SYSTEM (2026-09-17)

**Source:** computed 2026-09-17 by Worker A, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `drive_stats_2025/2026.csv`. **Not currently named anywhere in
AGENTS.md.**

**Metric:** drive = one (game_id, fixed_drive) group, drive != 0; offense =
majority posteam; points from score differential (captures PATs, 2-pt,
safeties). Rates: td_rate, fg_rate, punt_rate, three_and_out_rate (exactly
3 plays AND punt), turnover_drive_rate (Turnover + Opp touchdown —
pick-sixes count against the offense), downs_rate, avg_drive_start_own.
Deliberately UNFILTERED REG sample (punts/FGs/garbage drives are real
drives). League 2025: 2.10 pts/drive, 24.0% TD, 20.4% 3-and-out, 11.1%
turnover-drive, avg start own 30.4.

**Engine gap:** engine has no drive-level outcome model — the "drive
method" margin (-3 vs -7 EPA method for BUF-DET) already showed drive
anatomy moves the number. Build target: drive-outcome distributions as a
second scoring model alongside EPA; 3-and-out and turnover-drive rates as
defensive features.

---

## ENGINE BENCHMARK: DOWN SPLITS AND EXTRA METRICS (2026-09-17)

**Source:** computed 2026-09-17 by Worker A, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `down_splits_2025/2026.csv`, `extra_metrics_2025/2026.csv`.
**Neither file family is named in AGENTS.md.**

**Metric:** down_splits = team×season×side×down_group (early_1_2 /
late_3_4): n_plays, epa_per_play (defense sign-flipped), success_rate.
extra_metrics: stuff_rate (designed rushes with yards_gained ≤ 0),
stuff_rate_allowed, air_epa/yac_epa/air_yards per dropback and allowed,
late-and-close EPA (4Q, possession-team wp ∈ [0.20, 0.80], ~50-80
plays/team/season, n_late_close reported).

**Engine gap:** early-vs-late down decomposition (the v2 literature's
predictive split: early-down success r ~ 0.36 vs 3rd-down "nearly
meaningless"); air-vs-YAC EPA split (feeds the FPOE/xFP stack and the
air-yards benchmark); late-and-close EPA (DET's 6th-percentile collapse was
the edge sheet's sharpest situational story). None recorded in AGENTS.md.

---

## ENGINE BENCHMARK: KICKER METRICS (2026-09-17)

**Source:** computed 2026-09-17 by Worker, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `kicker_metrics_2025/2026.csv`, script
`compute_kicker_defense_metrics.py`. FULL-game REG record (no garbage
filter — a garbage-time FG counts on the scoreboard).

**Metric:** FG attempts/make rate by distance bucket (<30, 30-39, 40-49,
50+; buckets cross-foot to totals), XP make rate, kicking points/game
(3×FG+XP per team game; 2-pt excluded), FG/XP EPA per attempt (nflverse
epa, 100% non-null), kicker names (raw kicker_player_name; 2026 W1 confirms
T.Bass BUF, J.Bates DET). League 2025: FG 85.6%, XP 95.9%, 7.36 kick pts/g.
DET paradox: Bates 79.4% FG but 7.94 pts/g — volume (34 att) + nine 50+
attempts at 44.4% → negative FG EPA/att (-0.080); long attempts are
negative-EPA on average, not an error.

**Engine gap:** AGENTS.md says "kicker by distance bucket" with no columns,
no file path, no script. Kicker/defense props lane needs these exact
fields (tonight's published rows: Bass 6.8 [3,10], Bates 7.2 [4,11]).

---

## ENGINE BENCHMARK: DEFENSIVE DETAIL AND TFL COMPUTATION (2026-09-17)

**Source:** computed 2026-09-17 by Worker, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `defense_detail_2025/2026.csv`.

**Metric:** INT forced rate per opponent dropback; forced fumble rate per
play (opponent fumble==1); opponent fumble recovery share (fumble_lost /
fumble); **tfl_rate_per_rush is COMPUTED** — no tackle_for_loss column
exists in nflverse pbp, so every opponent designed rush with
yards_gained < 0 counts as a TFL (exact by definition, will not match
charting vendors' counts); takeaway rate per drive (INT or
fumble+fumble_lost on pass/run); defensive TD rate per drive
(return_touchdown==1; 2025: 46 — 29 INT-TD + 18 fumble-TD, 1 flagged both);
points allowed per drive (opponent final scores ÷ defensive drives,
unfiltered sample).

**Engine gap:** AGENTS.md names the file with column hints but omits the
computed-TFL convention and the per-drive rate definitions — the exact
details a builder needs to extend the defensive side (tonight's rows: team
sacks BUF 2.1 / DET 2.2; INTs 0.3 / 0.5; takeaways ~1.1 each).

---

## ENGINE BENCHMARK: SPECIAL TEAMS METRICS (2026-09-17)

**Source:** computed 2026-09-17 by Worker, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `special_teams_2025/2026.csv`. FULL-game REG record.

**Metric:** kickoff touchback rate (2025 spot = 35-yard line, dynamic
kickoff confirmed in drive_start_yard_line); opponent avg start after
kickoffs (excludes 93/2785 where kicking team kept possession — onside
kicks unidentifiable, no column); kickoff/punt EPA; kick/punt return EPA
and yards per return — **bundled caveat: nflverse has no per-return EPA
column, so these are return-INCLUSIVE play EPA, not isolated return
skill**; FG/punt/XP blocks forced. League 2025: 20.5% touchback, opp avg
start own 29.8, kickoff EPA -0.257/kick (kicking off is negative-EPA in the
dynamic-kickoff era), punt EPA -0.127/punt, 23 FG / 9 punt / 12 XP blocks.
Kickoff bookkeeping verified: posteam = RETURN team on kickoff plays.

**Engine gap:** AGENTS.md names "special teams" with no columns, no
caveats, no path. The hidden-yardage build target (#3) is specified as
"ST EPA + penalty EPA + field position" — these are the ST inputs, and the
bundled-EPA caveat constrains what can honestly be claimed.

---

## ENGINE BENCHMARK: TURNOVER-LUCK OCCURRENCE VS RECOVERY (2026-09-17)

**Source:** computed 2026-09-17 by Worker, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `turnover_luck_2025/2026.csv`.

**Metric:** luck-layer decomposition. Occurrence (partially skill): forced
fumbles per play vs league-rate expectation (same actual-minus-expected
construction as the INT luck columns). Recovery (near-pure noise):
recovery share minus league mean (2025: 46.3%). Literature: recovery
~0.00 year-to-year; forced-fumble occurrence weakly repeatable. Textbook
2025 case: DET forced 19 fumbles (+6.5 over expected) but recovered only
26.3% (-20 pts vs league) — process good, results unlucky, positive
regression expected. Engine rule already in AGENTS.md §3: model
occurrence; regress recovery to ~50%; count forced fumbles, never
recovered fumbles.

**Engine gap:** AGENTS.md names "turnover luck" and states the engine rule,
but not the file, the 46.3% league baseline, or the DET case numbers —
the concrete calibration anchors. Append for completeness.

---

## ENGINE BENCHMARK: PLAYER FIRST-DOWNS, QB AGGRESSIVENESS, RUSH/PRESSURE (2026-09-17)

**Source:** computed 2026-09-17 by Worker, `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.
Files: `player_first_downs_2025/2026.csv`, `qb_aggressiveness_2025/2026.csv`,
`rush_pressure_2025/2026.csv`, script `compute_player_metrics.py`.

**Metric:** player_first_downs — per-player rushing FD rate
(rusher_player_name, includes QB scrambles on the QB's row) and receiving
FD rate per reception AND per target; qualifiers 50+ rushes or 30+ targets
(2025: 225 players; 2026 W1: 8+/8+, 55 players, role-check only); 2025
extremes: T.Lawrence 52.1% rush FD (scramble-inflated, documented),
T.McLaurin 88.9% rec FD. qb_aggressiveness — aDOT (Σair_yards ÷ attempts
with non-null air_yards; sacks excluded), comp%, expected comp% (nflfastR
cp), CPOE in percentage points; **throwaway handling: cp = NA on all
2,132 2025 throwaways, so comp/exp/CPOE are computed on the cp-available
subset only** (early version got this wrong; fixed); qualifiers 100+ att
(45 QBs); 2025: Maye +10.6 CPOE, Mariota 10.18 aDOT. rush_pressure —
four_man_rush_rate = share of dropbacks with FTN n_pass_rushers == 4
(n_pass_rushers==0 excluded as quirk); pressure_proxy_rate = (qb_hit OR
sack)/dropback — a FLOOR, no hurries in nflverse or FTN; sanity-checked vs
@GridironInfo_ W1 chart (BUF 64.3%/21.4% vs chart ~65%/~19%; DET
63.5%/14.3% vs ~60%/~12%; ordinal agreement, proxy runs 2-3 pts high).

**Engine gap:** AGENTS.md names these as "player first-downs, QB
aggressiveness (aDOT/CPOE), rush/pressure" with no definitions, no
qualifiers, no throwaway-handling note, no proxy-floor caveat, no script
path. The props lane's QB rows and the pressure-matchup feature both rest
on these conventions.

---

## ENGINE BENCHMARK: LAB SCRIPT AND FILE INVENTORY CORRECTION (2026-09-17)

**Source:** `~/workspace/gse-research/nfl-2026/` directory listing,
2026-09-17.

**Metric:** the lab produced **29 CSVs across 15 families** (2025 + 2026
each, except weekly_trends_2025 only): team_metrics, metric_percentiles,
epa_distributions, weekly_trends, unit_matchups, drive_stats, down_splits,
extra_metrics, kicker_metrics, defense_detail, special_teams,
turnover_luck, player_first_downs, qb_aggressiveness, rush_pressure — via
**4 scripts**: `compute_team_metrics.py` (base filters + team metrics),
`compute_advanced_metrics.py` (percentiles, distributions, trends,
matchups, drives, downs, extra), `compute_kicker_defense_metrics.py`
(kicker, defense detail, special teams, turnover luck),
`compute_player_metrics.py` (player first-downs, QB aggressiveness,
rush/pressure). All documented in COMPUTATION_NOTES.md.

**Engine gap:** AGENTS.md says "14 new CSVs" and names one script. The
count is wrong (29), drive_stats and extra_metrics families are unnamed,
and three of four scripts are unrecorded. Correct the line to the 15-family
/ 29-file / 4-script inventory so future work doesn't treat the lab output
as smaller than it is.

---

## ENGINE BENCHMARK: PROJECTION METHOD — GARBAGE-TIME CORRECTION AND SCRIPT MODEL (2026-09-17)

**Source:** `~/workspace/gse-research/props-consensus/projection_methods.md`
(Workstream 2, 2026-09-17). **Not currently named in AGENTS.md.**

**Metric:** base prior = 2025 full-season per-game means (filtered sample);
2026 Wk1 = one-game role check only, efficiency never blended (100%
2025 / 0% Wk1 for rates). **Garbage-time correction:** filtered per-game
means understate full-game volume (~11% of plays excluded); each volume
projection is multiplied by the measured unfiltered/filtered per-game
ratio for that exact stat (Allen att 1.025, yds 1.031; Goff att 1.105,
yds 1.094; targets 1.042-1.195). Moves Allen 195→201, St. Brown rec
6.5→8.0 — measured bias correction, not a fudge. **Script-adjusted volume:**
2025 dropback rates by possession-WP bucket — BUF lead 50.0% / neutral
57.2% / trail 61.8%; DET 54.2% / 57.1% / 68.2%. Tonight: BUF 53% (leads
more), DET 63% (trails more); expected plays BUF 56 / DET 55. QB shares:
Allen 91.0% of team dropbacks, Goff 98.6%. **Split-half stability:**
receptions projected only where target-share stability was verifiable
(St. Brown 29.5/27.0, J. Williams 14.1/17.5, Gibbs 12.3/17.5, Cook
6.4/8.4); Kincaid/LaPorta fail the naive split-half (injury games) →
projected on when-active share + Wk1 role confirmation. **Efficiency
baselines:** YPA Allen 7.83 / Goff 8.01; YPC Cook 5.42 / Gibbs 4.82;
YPT Kincaid 11.42 / J. Williams 11.07 / LaPorta 10.85 / St. Brown 8.29;
TD means Allen pass 1.375 / rush 0.875, Goff pass 1.706. **Market audit**
(DK via SI 2026-09-16): Allen 250.5 vs 201 UNDER lean; Gibbs 89.5 vs 95
no edge; StB 7.5 vs 8.0 mild over. **Nulls:** Montgomery (DET) VOID —
on HOU; Vaki too thin; longest reception = noise; individual sacks NULL
(conversion luck); Milano/Bernard tackles = rotational noise.

**Engine gap:** AGENTS.md's CONSENSUS PROPS section carries verdicts and
roster corrections but none of the load-bearing method. Without this block
the numbers are unreproducible from the repo record. Also feeds the
recommended next step: backtest this method vs 2025 Weeks 1-18 closing prop
lines.

---

## ENGINE BENCHMARK: PROPS-CONSENSUS SOURCE PATHS (2026-09-17)

**Source:** `~/workspace/gse-research/props-consensus/` directory,
2026-09-17. **None of these four paths are currently named in AGENTS.md.**

**Metric:** `projection_methods.md` (full method, 11 sections — see block
above); `kicker-defense-props.md` (kicker/defense prop workstream behind
tonight's rows Bass 6.8 [3,10], Bates 7.2 [4,11], sacks BUF 2.1 / DET 2.2,
INTs 0.3 / 0.5, takeaways ~1.1 each, both-teams-2+FGs +275 BetMGM);
`consensus_lines.csv` (market-line capture); `our_projections.csv` (model
projection capture); `sources_notes.md` (source/verification notes for the
props workstream).

**Engine gap:** AGENTS.md references props-report.md, game-projections.md,
our-metric-stack.md, and agents-draft-eight-posts.md but not these four —
the method doc and the raw line/projection captures are invisible in the
repo record. Append the paths.

---

## ENGINE BENCHMARK: EDGE SHEET V2 EIGHT-PANEL REBUILD (2026-09-17)

**Source:** `~/workspace/gse-research/edge-sheet/build_edge_sheet_v2.py` +
updated `README.md`, 2026-09-17. **Not currently named in AGENTS.md**
(§5 describes the v1 3-panel prototype only).

**Metric:** complete visual rebuild as a metric-dense 1080×1350 graphic,
eight panels: 1) efficiency map (32-team EPA/play scatter); 2) 10-metric
percentile faceoff (sorted by BUF/DET split); 3) pass-game shapes
(dropback EPA KDE; Gaussian KDE on 539 BUF / 562 DET 2025 dropbacks, tail
share = P(EPA ≥ 1.0)); 4) luck ledger (actual vs expected turnovers);
5) form lines (4-week rolling 2025 offensive EPA/play, bye weeks as gaps;
2026 W1 as isolated hollow dots, "one game each, not a rating"); 6)
situational edges (2×2 small multiples: early/late/late-and-close/ball
security — DET late-and-close collapse, 6th percentile, was the sharpest
story; drive-anatomy scatter cut per rotation rule); 7) unit matchups
(offense vs opposing defense); 8) THE READ footer (market vs model).
Methodology: fair line = (BUF net EPA − DET net EPA) × 63 plays + 2.0 home
field — illustrative only, printed on the sheet. Percentiles: pct_rank
descending, 100 = best, 2025 season. Turnover luck converted at ~4.5
points per turnover. Data: `dropback_epa_2025_all.csv`. Deps in `.venv-v2`
(matplotlib, pandas). Run: `./.venv-v2/bin/python build_edge_sheet_v2.py
[--market -5.5] [--out bills-lions-edge-sheet-v2.png]`.
Limitations: no opponent adjustment; 2026 W1 one game; no 2026 weekly
trends or 2026 INT-worthy data; red-zone and pressure splits not in
grounded data, not fabricated; no weather/injury/rest.

**Engine gap:** the repo record describes the superseded v1. The v2 is the
current data product — its panels (percentile faceoff, KDE pass-game
shapes, form lines, situational multiples) are the reusable graphic
templates for every future game. Update §5 to v2 and record the fair-line
formula and the rotation rule ("if two panels say the same thing, cut the
weaker").

---

## ENGINE BENCHMARK: EDGE-SHEET DESIGN DOCS (2026-09-17)

**Source:** `~/workspace/gse-research/edge-sheet/DESIGN_BRIEF.md` and
`DESIGN_CRITIQUES_V2.md`, 2026-09-17. **Not currently named in AGENTS.md.**

**Metric:** design brief and v2 critique notes behind the Edge Sheet
rebuild — the FIELD palette rules, panel rotation decisions, and the
critiques that drove the v1→v2 rebuild.

**Engine gap:** design rationale is part of the build record; without the
paths, a future rebuild loses the "why" behind panel choices. Append both
paths alongside the v2 block.
