# a05 — Trust-Target Dynamics: Evidence Hunt (c02)

**Slice:** c02 (300/300 briefs swept) | **Author:** slice c02 deep-research, trust-target track
**Written:** 2026-10-02 | **Status:** EVIDENCE-GRADE — every claim below is traced to a source file with `file:line`.

**Bottom line up front:** the parent's premise is confirmed and then some. Zero briefs in c02 mention HHI in a football sense. The one and only predictive target-funnel rule in the slice is the **PRFFBall WR triple criterion** (25+ first-read targets / 35%+ air-yard share / 0.25+ TPRR → 64%/84.2%/92% top-12 hit rates since 2021), and it is an *attributed third-party X-chart claim* (FantasyPtsData), not a GSE-computed result. The closest thing to "who does the QB trust" is a third-party **read-progression table** (first-read % by QB, single week) cited in one DFS weekly file. There is **no** target concentration under pressure, **no** first-read by coverage shell, **no** Dirichlet-multinomial or share model, **no** per-QB trust-target profile anywhere in c02. This document inventories everything that exists, then defines exactly what can be computed from nflverse pbp today and what is genuinely missing.

---

## 1. EVIDENCE FOUND — every verified trust-target claim in c02

Every item below was verified against the source file in `~/workspace/vendor/Sports/docs/`. Numbers are quoted from the source; anything else is marked INFERENCE.

### 1A. PRFFBall WR triple criterion (the slice's only predictive target-funnel rule)

- **Criterion:** WRs through 3 weeks with **25+ first-read targets**, **35%+ air-yard share**, **0.25+ TPRR**.
- **Historical claim (verbatim post text, attributed):** "25 total players met this criterion since 2021. 16/25 (64%) finished as top 12 WRs, and that's counting all of the injured players. If we account for injuries for players that played at least 12 healthy games, 16/19 (84.2%) finished in the top 12. 23/25 (92%) were top 12 WRs when healthy and playing with their starting QB."
- **Current window:** 6 WRs met it W1–W3 (2026 season), + league-average row (G=3).
- **Attribution:** @PRFFBall, "Data via @FantasyPtsData" (Fantasy Points Data Suite), surfaced 2026-09-30 3:09 AM CDT.
- **Source:** `docs/dfs/research/2026-09-30/full-tables/README.md`, line 12 (CSV row: `prffball-wr-triple-criterion-future-top-12.csv`; columns: RANK, PLAYER, TEAM, TPRR, AIR_YARD_SHARE_PCT, FIRST_READ_TARGETS, FANTASY_POINTS, LEAGUE_AVG_ROW).
- **Corroborating briefs:** `briefs/c02/c02-r37/docs__dfs__research__2026-09-30__full-tables__README.md.brief.md` lines 13, 27; `briefs/c02/c02-r52/docs__ops__wiring-backlog-2026-10-01.md.brief.md` lines 11, 22.
- **Wiring status:** `docs/ops/wiring-backlog-2026-10-01.md` item 31 calls it "strongest predictive claim in the window. No GSE composite rule." The wiring-backlog recon explicitly greps the repo for each candidate — "Doc-only mentions never count as wired" — so as of 2026-10-01 this rule is **not wired** in any production code.
- **Metric-definition caveat:** the definitions of "first-read target", "air-yard share", and "TPRR" as @FantasyPtsData computes them are **not specified** anywhere in c02 (both covering briefs say "not specified"; the README is a catalog manifest of CSVs, not the data itself). INFERENCE: standard meanings are first-read target = target on the QB's designated first read (charting, not nflverse-native), air-yard share = receiver air yards / team air yards, TPRR = targets / routes run. None of the three is recomputed from nflverse in this slice.

### 1B. QB read-progression rates — first-read % by QB (Week 1 2026, third-party charting)

Source: `docs/research/2026-09-19-dk-week2/deep/wr-phase1.md`, attributed to "corpus" / "qb-read-progression, 9/17" (a third-party chart, likely X-transcribed; the named CSV is listed as a data source in the brief but no such CSV file exists in the corpus directory — provenance caveat).

- Jordan Love: **78.6% first-read** (highest in NFL; labeled "alpha-friendly") — `wr-phase1.md:88`
- C.J. Stroud: **62.2% first-read**; 21% aggressiveness (3rd-highest) — `wr-phase1.md:77`
- Aaron Rodgers: **60.5% first-read** — `wr-phase1.md:81`
- Carson Wentz: **50% first-read**; 11% aggressiveness — `wr-phase1.md:68`
- Caleb Williams: **39.5% first-read** (low); 34.2% scramble — `wr-phase1.md:72`
- Lamar Jackson: **34.5% second-read** rate (highest) — per brief, `wr-phase1.md` NO@BAL section
- Bryce Young: 16% aggressiveness (2nd-highest Sunday); Maye 6% (low); Geno Smith 12%; Shough 14%

Corroborating brief: `briefs/c02/c02-r56/docs__research__2026-09-19-dk-week2__deep__wr-phase1.md.brief.md` lines 7, 17–20, 27–28; both briefs flag "no formulas given" and first-read % is not nflverse-native. **This is the closest c02 gets to "who does the QB trust" as a per-QB behavioral number** — and it is one week of third-party charting, never a time series.

### 1C. Target-share levels (team/receiver grain, assorted third-party tables)

- **League median WR1 target share: 21%** (32 teams, W1–W3 2026; @DynatyzeFF WR1 Feed, "Who Feeds Their Alpha") — `docs/dfs/research/2026-09-30/full-tables/README.md` line 9. INFERENCE: this is the natural league baseline against which any HHI/concentration number should be read.
- **JSN: 45.8% target share, 0.42 TPRR** (W1; SumerSports) — `docs/research/2026-09-19-dk-week2/deep/consensus-map.md` (brief lines 9, 21 note the Drew Lock suppression caveat).
- **Ladd McConkey: 46.7% target share** (pre-exit W1) — `docs/research/2026-09-19-dk-week2/deep/qb-phase3.md` (brief line 15).
- **Bijan Robinson: 45% target share** (ATL with London OUT) — `docs/research/2026-09-19-dk-week2/deep/qb-phase3.md` (brief line 25; "ATL offense = Bijan + scraps").
- **Trey McBride: 35% target share** (W1) — consensus-map brief line 9.
- **Matthew Golden: 30% target share** (12 targets, W1) — `wr-phase1.md` GB section.
- **Terrance Ferguson: 26.9% target share / 23.8% first-read share** (first 3 quarters of one game; partial-game caveat in file) — `docs/research/2026-09-26/full-tables/README.md` line 15 (CSV: `dbro-ffb-ferguson-usage-splits.csv`; source: @FantasyPtsData).
- **Demario Douglas: 22.6% target share, 0.21 TPRR** (W1); **Mack Hollins: 16.1% share** (W1) — `wr-phase1.md` NE section.
- **Mark Andrews baseline: 17.2% target share** (16th among TEs, 2025) vs 1st/1st/4th in 2021–23 — `docs/research/2026-09-19-dk-week2/deep/farrell-andrews-participation-2026-09-19.md` (brief line 23).

### 1D. Coverage-shell × WR splits (target-efficiency trust signal, not concentration)

- **JSN vs 2-high since 2025: 35% TPRR & 4.07 YPRR — 1st in both among 115 qualified WRs.** Context: WAS highest 2-high rate (78.3%). Source: `docs/research/2026-09-26/full-tables/README.md` line 13 (via @DBro_FFB / @FantasyPtsData, TPRR-search-discovered).
- **CeeDee Lamb vs 2-high: 2026 — 36% TPRR / 4.24 YPRR; 2025 — 24% TPRR (15th) / 2.15 YPRR (11th)** among 69 WRs. Context: BAL 8th-highest 2-high rate (63%). Same source line.
- **Parker Washington vs man: 2025 — 25% TPRR / 2.70 YPRR** (12th); 2026 — 7th in TPRR & YPRR among 78 qualifiers (values not in post). Context: NE 2nd-highest man-coverage rate (45.2%). Same source line.
- What this shows: c02 has receiver-side efficiency *vs coverage shell*, but never the complementary QB-side cut — no first-read rate or target concentration *by coverage shell* for any QB.

### 1E. "Alpha Role" — the one formal alpha-receiver identification method in c02

- **Definition (verbatim, @DynatyzeFF):** "A single number measuring how completely a wide receiver dominates their offense's targets, deep routes, and red-zone chances."
- Two cuts exist: WR leaders (10 rows + league-average row, mean of 96 qualified; every row clears 5+ tgts; columns: RK, PLAYER, ALPHA ROLE, PLAYS, EPA/PLAY, CREATED REC%, TOP-12 WK%, TGT SHARE, FANTASY WAR) and TE leaders (10 rows + avg of 42 qualified; 4+ tgts; adds ROUTES RUN%, TE ROUTE LOAD).
- Source: `docs/research/2026-09-26/full-tables/README.md` lines 9–10 (CSVs: `dynatyze-alpha-role-wr-leaders.csv`, `dynatyze-alpha-role-te-leaders.csv`, 2026-09-26 8:00 AM CDT). Data: Dynatyze's own product (behind free-trial signup) — formula undisclosed, so it cannot be re-implemented; usable only as a benchmark/reference.
- Brief: `briefs/c02/c02-r57/docs__research__2026-09-26__full-tables__README.md.brief.md` lines 8–9, tagged COACHING/SCHEME.

### 1F. Anecdotal concentration observations (qualitative, single-game)

- **Wentz → Jefferson "or-bust" concentration:** "No other Minnesota receiver caught a pass" in W1; Jefferson 8/9/92/2 TDs with Wentz; Wentz CPOE −6.7 (Addison open twice, missed both) — `docs/research/2026-09-19-dk-week2/deep/qb-phase3.md` (brief lines 19, and tagged QB-BEHAVIOR).
- **Pittman as "Rodgers' underneath outlet":** sportradar bio + PIT W1 box score confirm Michael Pittman Jr. is a Pittsburgh Steeler (Q, foot) — "Rodgers' underneath outlet at real risk" — `docs/research/2026-09-19-dk-week2/deep/qb-phase3.md` (brief line 19). This is the "Rodgers trust-target" unit-of-analysis the c02 map references; it is one line in a DFS weekly, not a profile.
- **HOU without Collins:** Schultz "benefits most" as the inside funnel (NBC Sports via `wr-phase1.md:77`).

### 1G. QB pressure indices (EPA-based, no target shares)

`docs/models/qb-pressure-indices-proposal.md` (map finding #8) specifies `sensitivity = EPA/dropback(clean) − EPA/dropback(pressured)` with 100-pressured-dropback and 95% FTN-join-coverage null guards (REG only), plus `Protection Stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)`. This is the closest c02 comes to "under pressure" QB behavior — and it measures **EPA, not target concentration**. It proves the pressure-split machinery is conceivable on existing data; nobody has applied it to target shares.

### 1H. Wiring backlog item 33 — "first-read target share (measured)" inventoried, not implemented

`docs/ops/wiring-backlog-2026-10-01.md` item 33 lists, among 34 inventoried-but-unwired X-sweep metrics: "**first-read target share (measured)**, QB vs-pressure efficiency splits … all inventoried, none implemented." This confirms (a) that a "measured" first-read target share series exists somewhere in the full sweep corpus (i.e., not just single-week values), and (b) it is not in the engine. The word "measured" here is the backlog author's, distinguishing charted values from GSE-owned proxies — its own definition is not in the doc.

---

## 2. PRFFBall TRIPLE — verified spec

| Element | Verified value | Source |
|---|---|---|
| Leg 1: first-read targets | **25+** (through 3 weeks) | `docs/dfs/research/2026-09-30/full-tables/README.md:12` |
| Leg 2: air-yard share | **35%+** | same |
| Leg 3: TPRR | **0.25+** | same |
| Base rate cohort | **25 total players since 2021** met it | same |
| Hit rate A (all qualifiers) | **16/25 = 64%** finished top-12 WRs (counting injured players) | same |
| Hit rate B (≥12 healthy games) | **16/19 = 84.2%** finished top-12 | same |
| Hit rate C (healthy + starting QB) | **23/25 = 92%** were top-12 | same |
| Current-season qualifiers | **6 WRs** (W1–W3 2026) + league-average row | same |
| Data provenance | **@FantasyPtsData** (Fantasy Points Data Suite) | same |

**Exact definitions of each metric: NOT in c02.** The covering briefs (`c02-r37`, `c02-r52`) both record "not specified" for formulas. The README is a catalog of transcribed CSVs; the underlying post/chart carries the definitions, which were not transcribed. INFERENCE (standard analytics meanings, to be confirmed against FantasyPtsData before wiring):
- *First-read target* = target where the receiver was the QB's designated first progression read. Charting-derived (PFF/FTN/FantasyPts-style); not nflverse-native.
- *Air-yard share* = receiver air yards ÷ team air yards (sum of intended air yards on all pass attempts).
- *TPRR* = targets ÷ routes run (charting-derived denominator).
- *Top-12 WR* = season-long fantasy finish (PPR half-PPR? unspecified — presumably PPR WR1-12; INFERENCE).

**Statistical cautions (analyst's, not the source's):** n=25 with nested conditioning (25→19→"healthy+starting QB") — hit rates B and C are subsets of A, so they are not independent validations; the "healthy + starting QB" conditioning is applied retrospectively (survivorship); and the claim is attributed post text, never independently recomputed in the corpus. Wire as a composite *screen*, not a certified edge, until backtested against GSE-owned data.

---

## 3. COMPUTABLE TODAY — exact metric definitions from nflverse pbp

INFERENCE note: c02 establishes that nflverse pbp is the engine's base play layer (`c02-r42`: FTN 2022–2025 joined to nflverse pbp on `game_id`+`play_id`, 77,239 joined REG pass attempts; pbp = 372 columns) and that it carries receiver/target data per play, but c02 does **not** contain the pbp column dictionary. The field names below are the standard nflverse pbp schema; treat them as schema-check items (run `names(pbp)` / `nflreadr::load_pbp()` columns) before implementation.

**Universe definition (do this first):** a "target" = row where `pass_attempt == 1` AND `receiver_player_id`/`receiver_player_name` is non-missing. Exclude spikes (`spike == 1`). INFERENCE decision: exclude throwaways only if a throwaway flag exists; otherwise keep them (they dilute concentration toward no one). Passer = `passer_player_name`/`passer_player_id`; team = `posteam`.

### Metric 1 — HHI of target shares (per QB, per grain)

For QB q over grain G (season, game-week, or rolling 4-week):
- `T_i` = targets to receiver i; `T = Σ_i T_i`; `s_i = T_i / T`.
- **HHI_q(G) = Σ_i s_i²**, on [1/N, 1] where N = distinct receivers targeted.
- Report also as **effective targets N_eff = 1 / HHI** (intuition: "the QB behaves as if he has N_eff options").
- League-baseline anchor from this slice: median WR1 share 21% (§1C) implies a typical top-share baseline; a fully-equal 5-receiver spread would read HHI = 0.20, N_eff = 5.
- Minimum-denominator guard: require T ≥ 25 targets per grain (INFERENCE; matches the PRFFBall 25-target leg and avoids small-sample blowups).

### Metric 2 — Top-target share (the "alpha load")

- **TopShare_q(G) = max_i s_i** = largest single-receiver share of the QB's targets.
- Companion: **Top2Share_q(G) = sum of the two largest s_i** (captures the QB's 1-2 punch; most NFL offenses live here).
- INFERENCE calibration points from c02 evidence: Jefferson-or-bust weeks (Wentz W1: "no other MIN receiver caught a pass") would read TopShare ≈ 0.45+; a spread offense sits ≈ 0.20–0.28.

### Metric 3 — Situational concentration (the trust-target time series the qb-behavior module wants)

Compute HHI, TopShare, Top2Share on filtered play subsets. All filters are pbp-native:

| Series | Filter | What it measures |
|---|---|---|
| `conc_rz` | `yardline_100 <= 20` | trust when the field compresses (who gets the RZ looks) |
| `conc_3rd` | `down == 3` | trust on money downs |
| `conc_2min` | last 2:00 of either half (`half_seconds_remaining <= 120`) | trust under clock pressure |
| `conc_trailing` | `score_differential < -7` (or `wp < 0.35`) | trust when forced to throw (INFERENCE: WP-cutoff is the cleaner "must-pass" definition; verify `wp` column presence) |
| `conc_pressured` | **pressure proxy:** `qb_hit == 1 OR sack == 1` | target concentration when hit/sacked |

**Pressure caveat (important):** nflverse pbp has **no charted "pressure" column** — only outcomes (`qb_hit`, `sack`). `conc_pressured` as defined above measures concentration *conditional on being hit or sacked*, not conditional on pressure. True "concentration under pressure" needs charting (PFF/FTN) or the FTN join path c02 documents (`c02-r42`: FTN→pbp 99.6–100% join rate). Until then, a cleaner pbp-native proxy is **time-to-throw**: nflverse pbp carries `time_to_throw` on some seasons (INFERENCE — verify); `conc_quick = time_to_throw < 2.5` approximates "hot reads / first-read throws", which is exactly the trust-target behavior of interest.

### Metric 4 — First-read share proxy (pbp-native, no charting)

True first-read requires charting and is not in pbp. The computable proxy: **share of targets thrown within 2.5 seconds of snap** (`time_to_throw < 2.5`, where available) or **share of targets with `air_yards` in the 0–9 band** (INFERENCE: short-area timing throws ≈ first-read/scheduled throws). Neither is a true first-read; label them `*_proxy` and never present them as charted first-read %.

### Metric 5 — Target-share volatility (trust *stability*)

- Week-to-week coefficient of variation of TopShare: `CV = sd(TopShare_w) / mean(TopShare_w)` over a rolling 4-week window. A QB whose alpha load swings 0.45→0.20→0.40 week to week is a different trust profile than a steady 0.30 — this is the "behavioral profile" the map says is missing, and it is fully computable today.

### Delivery shape for the qb-behavior module

Per QB × week × situation-filter: `{targets, distinct_receivers, hhi, n_eff, top_share, top2_share}` — a flat time series table, no new data license, joinable to everything downstream (props: receiver target-floor models; DFS: stack-concentration priors; calibration: concentration as a variance feature for reception props).

---

## 4. GAPS — precisely what's missing, and which sibling slice likely holds it

1. **Target concentration under pressure.** Zero evidence in c02 (explicit zero-hit grep). Requires charted pressure joined to pbp (FTN/PFF). Likely holder: whichever slice covers `docs/props/` and `docs/dfs/` pressure-usage research, or the arXiv pressure-modeling papers (BDB-derived). The qb-pressure-indices proposal (`docs/models/qb-pressure-indices-proposal.md`) is the natural home *if* a sibling extended it to targets — c02 only has the EPA version.
2. **First-read rate by QB as a time series.** c02 has exactly one week of third-party charting (§1B) plus a backlog note that a "measured" first-read target share series was inventoried (§1H). The actual series (where? which sweep? FantasyPtsData?) is not in this slice. Likely holder: a sibling slice covering the X-sweep corpus (`docs/dfs/research/2026-09-2*/full-tables/`), or the props/research lanes.
3. **First-read behavior by coverage shell.** c02 has the receiver-side mirror (TPRR/YPRR vs 2-high/man, §1D) but nothing QB-side. Likely holder: sibling slices over `docs/research/2026-09-*/deep/` weekly lanes (the r56/r57 weekly files in this slice are the tail of a larger weekly program) or the NGS coverage-classification work.
4. **Per-QB trust-target behavioral profiles.** Nothing in c02. §3 Metric 5 defines what one would look like; the profiles themselves need building (they are a compute product, not a find).
5. **Dirichlet-multinomial or any share model.** Zero in c02 (the two "multinomial" hits are EP logistic regression and Kelly portfolio sizing — unrelated). INFERENCE: this is genuinely absent program-wide until another slice says otherwise; it is a build, not a find.
6. **Exact FantasyPtsData definitions** for first-read target / air-yard share / TPRR, and the underlying 25-player/6-WR datasets. c02 catalogs the CSVs; the definitions live in the transcribed charts or FantasyPtsData docs. Needed before the triple criterion can be re-implemented on GSE data.
7. **In-game decision-style modeling** (aggressiveness shifts by game state) — map gap, confirmed: c02 has static aggressiveness % values (Young 16%, Stroud 21%, Maye 6%) but no state-conditional series.

---

## 5. CHALLENGES

- **Provenance fragility.** The two richest trust-target items (triple criterion, read-progression %) are *attributed third-party X-chart claims* (FantasyPtsData and an unnamed 9/17 chart), transcribed into catalog READMEs, never independently recomputed. Backtesting the triple on nflverse before wiring is mandatory, not optional.
- **Charting vs pbp boundary.** First-read, pressure, and coverage-shell-at-throw are charting constructs; nflverse pbp cannot produce them. Every "computable today" metric in §3 is a proxy for at least one of these. The honest labeling discipline is: `charted` vs `pbp_proxy` in every column name, and the two must never be averaged together.
- **Small-sample instability.** Single-game and 3-week target shares are noisy (Ferguson's 23.8% first-read share is three quarters of one game — the source file itself flags it). The T ≥ 25 guard and rolling windows in §3 are the floor, not the ceiling; credible intervals on HHI (bootstrap over plays) should be part of the buildable spec.
- **Conditioning traps in the triple claim.** 64% → 84.2% → 92% are nested subsets, not independent confirmations; "healthy + starting QB" is retrospective. Any GSE re-test must pre-register the health/QB conditioning or it re-imports survivorship bias.
- **Doctrinal fit.** Per the 2026-09-28 public/private doctrine, all of this is internal reasoning fuel (projections/rankings only on the public site) — no issue, but the qb-behavior module's outputs must stay behind the fence.
- **Slice skew.** ~70% of c02 is arXiv methods; the football-substance files that yielded §1B–1F are a minority. Sibling slices (other mod-10 residues) plausibly hold the weekly-lane continuations of exactly these series — cross-slice aggregation is required before declaring anything program-level absent.

---

## 6. BUILDABLE SPEC

**Module:** `qb-trust-target` time series (feeds the qb-behavior module; shadow-first per Garrett's wire-first sequencing: research → wire → weight → calibrate → test → polish).

**Inputs:** nflverse pbp (existing ingestion), per season 2021–present (matches the triple criterion's window).

**Outputs (per QB × week × situation):**
```
{qb_id, qb_name, season, week, situation, targets, distinct_receivers,
 hhi, n_eff, top_share, top2_share, top_share_cv_4wk, boot_hhi_lo, boot_hhi_hi}
```
where `situation ∈ {all, rz, third_down, two_min, trailing, pressured_proxy, quick_throw_proxy}` per §3 filters.

**Computation:** single pass over pbp targets; group-by (qb, week, situation); bootstrap 1,000 resamples of plays within grain for HHI CIs. No new license, no new API, no founder gate.

**Validation gates (pre-registered before first run):**
1. **Reproduce a known number:** the pipeline must reproduce the Dynatyze WR1-feed league median (21% median WR1 target share, W1–W3 2026) within ±2pp from raw pbp — grounds the target definition against a third-party chart.
2. **Triple-criterion backtest:** recompute legs 2–3 (air-yard share, TPRR needs routes — charting; so backtest legs 1-proxy + 2 on pbp) and test whether the historical 64%/84.2%/92% ordering holds on GSE-owned data, 2021–2025. Leg 1 (true first-read) stays charted-only until the FTN join is stood up.
3. **Stability gate:** report week-to-week autocorrelation of `hhi` and `top_share` — if concentration doesn't persist, it's a descriptive stat, not a predictive feature, and ships as context only.
4. **Anti-leakage:** per the KONTOGRAPH invariant (c02 finding #20), every grain must be point-in-time (week w features use plays < week w kickoff); perturb-the-future property test on the week boundary.

**Explicitly out of scope for v1:** true first-read % (needs charting join — queue behind the FTN/PFF decision), Dirichlet-multinomial smoothing (adopt only if the stability gate shows small-sample blowups — then HHI gets a Dirichlet prior, α from the league median share vector; this is the principled place for the share model, not v1), coverage-shell splits (needs NGS coverage classification wiring, founder-gated).

**Estimated shape:** one ingestion-time aggregation job + one table; ~1 engineer-day to first shadow numbers, gated by the three validation checks above. The 25-target minimum, the bootstrap CIs, and the `charted`/`pbp_proxy` naming discipline are non-negotiable parts of the spec.
