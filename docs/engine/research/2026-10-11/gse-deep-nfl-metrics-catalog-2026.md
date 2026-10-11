# GSE Deep NFL Metrics Catalog

**Date:** 2026-10-10 · **Scope:** internal only — not for public surfaces. Every metric Garrett's operation has built or researched in the past ~2 months, attributed to its source file. No invented metrics; vague sources are flagged.

---

## 1. GSE Proprietary Metrics (the bible — Slice 1 + governed continuations)

*Source: `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md` (updated 2026-07-06). All metrics lifecycle `SHADOW`, API exposure `INTERNAL`, licensing `NOT_READY` unless noted. Each carries a "birth certificate" (target question, allowed/forbidden inputs, formula class, validation method, failure modes) and returns public drivers only — never protected weights. `probability` is always `null` on decision metrics; confidence = evidence quality, not win probability.*

### Source layer
- **Data Reliability Index (DRI)** — *Is this data reliable enough to influence a decision?* Scores freshness (age vs TTL), source coverage, provider trust, rights cleanliness, minus contradiction/missing-data penalties. Grades HIGH/MEDIUM/LOW/BLOCKED. Feeds no-bet pressure, API warnings, content approval. Status: SHADOW, grade_only.
- **Source Trust Score** — backlog item (build after CUW/DPI/no-bet/payload-envelope/source-rights/historical-adapter veto tests stay green). *Rates source trustworthiness as a standalone score.* Status: NOT YET BUILT.

### Market layer
- **Market Gravity Index (MGI)** — *Is the market meaningfully pulling toward a side, total, or prop?* Uses line movement, book consensus, timing, injury explainability, key-number crossing, staleness, dispersion. Stale data returns `NO_SIGNAL`. Derived market interpretation, not raw odds resale; never an edge claim. Status: SHADOW, score_band.
- **Stale Line Risk Score (SLRS)** — *Is this line too stale, thin, contradictory, or rights-unclear to interpret?* Higher = worse. Line age, freshness TTL, source coverage, contradiction pressure, rights cleanliness, book dispersion, movement audit. At/beyond TTL → forced `BLOCK`, `marketSignalAllowed=false`. Market-risk score, not a playable-edge score. Status: SHADOW, score_band.
- **Market Mirage Score (MMS)** — *Is the apparent market signal real, or a noisy/stale/narrative-driven mirage?* Composes MGI, SLRS, signal allowance, public narrative heat, contradiction pressure, dispersion, explainability, no-bet pressure, drift pressure, calibration debt, source posture. Upstream market-integrity primitive for PWS/GSS review, not a pick trigger. Status: SHADOW, score_band.

### Passing layer
- **GSE Expected Completion (expected-completion-gse)** — *How likely should this pass have been completed?* Uses air yards, yards-to-go, red-zone flag, sideline proxy, pressure proxy, weather penalty, time-to-throw proxy, plus shrunk QB/receiver/defense priors. Returns completion probability + separate evidence-confidence score. Status: SHADOW, score_band.
- **QB Burden Index (QBI)** — *How much contextual burden was placed on the QB, independent of QB quality?* Expected-completion difficulty, pressure, throw depth, down-distance friction, OL disruption proxy, receiver separation deficit proxy, time-to-throw stress, weather, pass-rate pressure. Burden score, NOT a talent score. Status: SHADOW, score_band.

### Receiving layer
- **Receiver Difficulty Index** — *How hard was this catch to make?* Rises as expected completion falls, air yards rise, separation/cushion worsen, contested-catch/sideline proxies rise. Shrinks low-sample receiver priors toward neutral. Status: SHADOW, score_band.
- **Expected YAC (expected-yac-gse)** — *How many yards after catch should this reception have produced?* Rises with space/separation/cushion + shrunk receiver YAC prior; falls with defender leverage, deeper target depth, red-zone constraint. Status: SHADOW, score_band.
- **YAC Creation (yac-creation-gse)** — *How much YAC did the receiver create above expectation?* Residual: actual YAC minus GSE expected YAC, with receiver YAC-over-expected prior as shrinkage stabilizer. Can include broken-tackle/contact-balance proxies as drivers. Status: SHADOW, score_band.
- **Player Residual Rollup (helper)** — rolls play-level YAC-creation and rush-over-expected residuals into per-player season summaries (metric+player+season only; mixed rollups rejected). SHADOW/INTERNAL only.

### Rushing layer
- **Rush Environment Index** — *How favorable was the rushing context before crediting/blaming the ball carrier?* Rises with lighter boxes, OL continuity, favorable run-direction leverage, run-friendly script; falls with heavy fronts, down-distance stress, weather. Status: SHADOW, score_band.
- **Expected Rush Yards (expected-rush-yards-gse)** — *How many yards should this carry have gained?* Built on rush-environment-index + shrunk rusher prior + defensive rush allowance + designed-rush context; falls with long-distance stress and red-zone compression. Status: SHADOW, score_band.
- **Rush Over Expected (rush-over-expected-gse)** — *How many yards did the rusher gain above expectation?* Residual: actual minus GSE expected rush yards, rusher RYOE prior as shrinkage stabilizer. Broken-tackle/yards-after-contact proxies as drivers. Status: SHADOW, score_band.

### Role layer
- **Role Volatility Index (RVI)** — *How unstable is a player's role signal before the model treats it as reliable?* Snap-share movement, target/carry/route opportunity movement, depth-chart shock, injury/return uncertainty, teammate role shock, sample size, usage freshness. Stale usage or blocked source posture → `roleSignalAllowed=false`. Role instability, not player quality. Status: SHADOW, score_band.

### Calibration / drift layer
- **Calibration Integrity Grade (CIG)** — *Is the calibration evidence healthy enough for downstream review?* ECE, Brier risk, reliability slope, settled-sample support, bucket coverage, report freshness, drift pressure, calibration debt. Grades evidence quality, not win probability. Status: SHADOW, score_band.
- **Drift Pressure Index (DPI)** — *Is the model/data regime drifting enough to veto downstream decisions?* Feature PSI, Brier delta, calibration-error delta, schema change rate, prediction-volume shift, model disagreement, contradiction pressure, freshness, sample support. Can recommend downstream veto. Status: SHADOW.
- **Conformal Uncertainty Width (CUW)** — *Are projection intervals too wide, stale, thin, or under-covering to support decisions?* Conformal interval bounds, empirical coverage vs target, width thresholds, settled interval samples, report freshness, drift pressure. Narrow-but-under-covering intervals = unsafe. Can recommend downstream veto. Status: SHADOW.

### Decision layer
- **No-Bet Pressure (NBP)** — *Should this candidate be refused before action review?* Wraps the existing `computeNoBetStrength()` governor: missing/stale data, model disagreement, unvalidated calibration, blocked rights, low evidence, market volatility, responsible-gaming pressure. Refusal-pressure score, not a pick trigger. Status: SHADOW, score_band.
- **Playable Window Score (PWS)** — *Is the decision window ready for downstream review, or should it stay closed?* Composes MGI, SLRS, signal allowance, NBP, drift pressure, calibration debt, signal integrity, evidence health, model agreement, RVI, QBI. Readiness primitive, not a pick trigger. Status: SHADOW, score_band.
- **Portfolio Fit Score (PFS)** — *Does this candidate fit the shadow portfolio without concentration/correlation/duplicate-thesis risk?* Playable-window readiness + exposure concentration + correlation risk + duplicate thesis + liquidity + bankroll fit + NBP + drift + calibration debt. Not stake sizing. Status: SHADOW, score_band.
- **GSE Signal Score (GSS)** — *Is this signal high-quality enough to act on?* The composite decision-quality score: edge quality, signal integrity, market gravity, proprietary player signal, calibration integrity, portfolio fit, minus NBP/drift/calibration-debt suppressors and interaction penalties. Public grades: HARD_PASS / PASS / WATCH / LEAN / SPEAK / STRONG. Decision quality, NOT win probability. Status: SHADOW, score_band.

### Governance infrastructure (not metrics, but part of the system)
- **Metric Birth Certificate** — every metric's declared contract: target question, target variable, historical precedent, allowed/forbidden inputs, formula class, protected components, validation methods, failure modes, source-rights requirements, public exposure level, lifecycle status.
- **Metric Asset + Graduation layer** — `GseMetricAsset` wrapper (birth certificate, source-rights envelopes, model/drift/validation card status, API exposure, licensing). Graduation statuses: BLOCKED_SOURCE_RIGHTS / BLOCKED_MODEL_CARD / BLOCKED_SAMPLE / BLOCKED_VALIDATION / BLOCKED_DRIFT / REVIEW_READY / APPROVED_FOR_CONTENT / APPROVED_FOR_API. Default: apiExposure INTERNAL, licensing NOT_READY, model/validation/drift cards MISSING.
- **Source Rights + Payload Rights layer** — code-level policy gates mirroring the web source-rights registry. nflverse: approved_open_license (modeling allowed, derived API allowed with attribution, raw API blocked). the-odds-api: modeling BLOCKED (registry sets model_training_allowed=false), derived market intelligence allowed where payload hides raw provider values.
- **Metric Evidence Cards + Markdown reports** — draft-first model/drift cards generated from fixtures; `docs/math/GSE_SHADOW_METRIC_EVIDENCE_REPORTS.md` holds 10 generated reports (SLRS, QBI, RVI, CIG, DPI, CUW, NBP, PWS, PFS, MMS). All synthetic/local evidence only — not promotion evidence.
- **Core math grammar** — bounded clamps, sigmoid/logit/softplus, z-scores, weighted means, empirical Bayes shrinkage, protected nonlinear basis expansion (keeps raw features hard to reverse-engineer), source-policy validation, evidence uncertainty bands, public driver ordering.

---

## 2. Expected + Shadow Metrics (GSE's own NGS equivalents)

*Source: `docs/math/GSE_EXPECTED_METRICS.md`. Thesis: don't re-serve NGS's private tracking numbers — compute our own expected-value metrics from public play-by-play (nflverse, CC-BY-4.0), then PROVE them by correlating per-player values against NGS as ground truth (NGS is the referee, never the product). Fit-on-load (models fit at load time on the current season, never hardcoded); sample floors return `null` rather than guess; graduation verdicts: graduated / provisional / insufficient-sample / failed.*

- **GSE-CPOE (Completion % Over Expectation)** — *How accurate was this QB relative to how makeable his throws were?* Logistic regression (L2, deterministic) on 10 features: airYards, airYards², qbHit (pressure proxy), throw location (middle/left/right), down, ydstogo, yardline100, shotgun, noHuddle. Per-passer: 100 × mean(actual − predicted completion). Graduation bar: Pearson ≥ 0.60 vs NGS (high bar — depth + pressure are public, so the signal should reproduce). Sample floors: 200 dropbacks to fit, 100 attempts to appear. Status: implemented, fit-on-load, premium-gated measurement-only route.
- **GSE-RYOE (Rush Yards Over Expected / attempt)** — *How many extra yards per carry did this rusher create beyond what the situation predicted?* Ridge linear regression on 9 features: yardline100, down, ydstogo, shotgun, scoreDifferential, run location (middle/left/right), run gap (guard/tackle/end). Per-rusher mean residual. Graduation bar: Pearson ≥ 0.40 vs NGS (lower bar — box counts and runner top speed are tracking-only). Floors: 200 rushes to fit, 50 attempts to appear. Status: implemented, fit-on-load.
- **GSE-xYAC (YAC Over Expectation / catch)** — *How much extra YAC did this receiver create beyond what the catch situation predicted?* Ridge regression on 6 features: airYards, yardline100, down, ydstogo, throw location. Per-receiver mean residual. Graduation bar: Pearson ≥ 0.50 vs NGS (medium bar — air yards are public, defender proximity at catch is not). Floors: 200 catches to fit, 30 to appear. Status: implemented, fit-on-load.
- **Validation methodology** — `buildCalibrationReport` joins our per-player series to NGS's on nflverse `gsis_id` (inner join), reports n, Pearson, Spearman, RMSE, MAE, bias (ourMean − truthMean). GRAIN DISCIPLINE: same season, same season type (REG), same per-player key, matched qualifiers — anything else makes the correlation fiction.
- **Honest limitations** — what tracking sees that public PBP doesn't: receiver separation/cushion, defender proximity at catch, defenders in the box, runner closing/top speed, time to throw, route geometry. Our proxies: air yards (+square), qb_hit, location/gap buckets, down/distance/field position, shotgun/no-huddle, score differential.
- **IP ledger note** (`docs/ip/GSE_METRIC_IP_LEDGER.md`, 2026-07-06): governed birth certificates also cover `gse-xcomp`, `gse-receiver-difficulty`, `gse-xyac`, `gse-rush-environment`, `gse-qb-burden`, `gse-role-volatility`, plus SLRS, MMS, QBI, RVI, PWS — all SHADOW. Original compatibility primitives live in `packages/prediction-engine/src/nfl/`.

---

## 3. Benchmark-Lane Metrics (from X/research, Sep 17 → Oct 10)

*Sources: `AGENTS.md` metric entries 2026-09-17 onward (X metrics dossier, extended library, named benchmarks); `docs/research/2026-09-19-dk-week2/deep/new-metrics-sweep-2026-09-19.md`; `docs/research/2026-09-19-dk-week2/deep/player-advanced-metrics-2026-09-19.md`; `gse-research/props-consensus/our-metric-stack.md`. Definitions as filed; proprietary-vendor numbers are benchmark references, not engine inputs. UNVERIFIED labels preserved where the source flagged them.*

### 3A. The X Metrics Dossier — 26-metric catalog (2026-09-17)
Full definitions/evidence/limitations were filed in the missing catalog file (see §8); below is as stated in AGENTS.md.

**Efficiency core**
- **EPA/play (team)** — change in Expected Points per play. Passing EPA predicts future point differential (r ~ 0.42 at 6 games); passing efficiency correlates with wins ~0.53–0.61 vs rushing ~0.13–0.19. Trap: nflfastR vs ESPN EP models differ slightly; filter garbage time/kneels.
- **Dropback EPA / Rush EPA** — pass plays (incl. sacks/scrambles) vs designed runs. Pass EPA predicts at ~0.53–0.61, rush EPA only ~0.13–0.19.
- **Success rate** — share of plays with EPA > 0. Stabilizes faster than EPA (r ~ 0.60 by game 6). Trap: THREE competing definitions (nflfastR EPA>0, Football Outsiders 40/60/100, Connelly 50/70/100) — never mix.
- **DVOA (FTN)** — per-play value vs situational average, opponent-adjusted; 0% = average. Proprietary; weekly tables only.
- **DAVE** — DVOA blended with preseason forecast at decaying weight (FTN Week 1 2026: 83% prior offense, 98% defense/ST). The shrinkage concept is what matters.
- **EPA+CPOE composite** — QB efficiency index combining EPA and completion-over-expected. @CharlesChillFFB 9/19: "much better indicator [than YPA], still should be scaled with volume." Canonical weighting UNVERIFIED.
- **CPOE** — completion % over expected; model-dependent (nflfastR's is one specification).
- **DYAR/DVOA (player)** — cumulative player value; convert to per-play before spreads.

**Trenches & pressure ("most predictive matchup lens")**
- **Pressure rate** — share of pass plays producing hurry/hit/sack. PFF research: pressure CREATION is the stable skill; sacks are the noisy outcome.
- **PRWR / PBWR (ESPN)** — pass-rush win within 2.5s / pass-block sustain 2.5s+. Proprietary, rankings only. As of 9/18–9/19, three public PRWR versions exist (ESPN, PFF, Sumer).
- **RBWR / RSWR (ESPN)** — run-block / run-stop win rates. Same proprietary sourcing; run game matters less than pass game.
- **SIS blown block** — exact glossary wording UNVERIFIED (primary source not located).
- **Time to throw** — descriptive, not normative; pair with pressure data.

**Explosiveness & finishing**
- **Explosive-play rate** — threshold varies by provider (15/10 vs 20-yard conventions); must be stated.
- **Havoc rate** — NO NFL standard definition; fix one before computing.
- **Stuff rate** — boundary (does zero count?) varies by provider.
- **Red-zone EPA** — conversion is near-noise (Schatz's critique); trip rate is the sticky part.
- **Late-down efficiency** — 2012 hierarchical-Bayes study: raw 3rd-down conversion "nearly meaningless." Use early-down success / all-downs efficiency (predictive r ~ 0.36).

**Luck layer**
- **Turnover margin/luck** — regresses hard to zero. Model the process (turnover-worthy plays, fumble recovery rates, INT vs expected); never carry raw margin forward.
- **Special-teams EPA** — small, real, systematically unpriced (Wharton study: +1.9% RMSE improvement).

**Game-state & situational**
- **Situation-neutral pace** — trailing teams hurry, confounding intent; filter choice changes the number.
- **4th-down aggressiveness** — go-rate vs WP model; correlates with roster quality.
- **Wind/weather** — nonlinear; interacts with stadium/roof/direction. HIGH for totals, LOW for moneyline. Never flat "X mph = Y points."
- **Barometric pressure + humidity (totals)** — Rufus Peabody deep dive: atmospheric pressure and humidity as totals-model variables alongside wind. EXPERIMENTAL — coefficients unverified, build target only.
- **Rest (bye/mini-bye/short week)** — 2024 analysis: bye edge largely VANISHED post-2011 CBA. Tiny coefficients only.
- **Travel/time zones/altitude** — no verified NFL coefficient; FPI's altitude term weakly nonzero. Experimental only.
- **Strength of schedule** — forward SOS = market-based (projected win totals); backward = efficiency-based. Never raw prior-season win%.

**Composite ratings (benchmarks, not inputs)**
- **ESPN FPI** — predictive margin vs average on neutral; EPA/play-based, Vegas-anchored preseason prior. No feed; partially IS the market.
- **PFF grades** — per-play execution, −2 to +2 scaled 0–100. Analyst judgment, assignment ambiguity, paywalled.
- **SIS Total Points** — EPA distributed across positions via charting. Proprietary.
- **Weighted EPA (nfelo)** — Robby Greer's open Elo + Weighted EPA; direct benchmarking peer for GSE's Elo core.
- **RAS (Relative Athletic Score)** — 0–10 historical athletic composite (Kent Lee Platte).

### 3B. Extended metric library — 15 computed families (2026-09-17, Worker A)
All computed from nflverse (29,239 filtered 2025 REG plays) via 4 scripts (`compute_team_metrics.py`, `compute_advanced_metrics.py`, `compute_kicker_defense_metrics.py`, `compute_player_metrics.py`):
- **EPA distributions** — per team median, p10/p25/p75/p90, share of negative-EPA plays, share of chunk plays (EPA > 1.0); consistency vs boom-bust.
- **League percentiles** — pct = (rank−1)/(n−1)×100, 100 = best; lower-is-better metrics inverted.
- **Down splits** — EPA/play and success rate on early downs (1st–2nd) vs late downs (3rd–4th), offense/defense.
- **Drive stats** — points per drive (2025 league norm 2.10), TD rate (24.0%), three-and-out rate (20.4%), turnover-drive rate, avg drive-start field position.
- **Air-vs-YAC EPA splits** — per dropback, passing EPA through the air vs after the catch; plus air yards per dropback.
- **Late-and-close performance** — EPA and success rate in 4Q with possession-team WP ∈ [0.20, 0.80] (~50–80 plays/team/season; always reported with play count).
- **Unit matchups** — pass offense vs pass defense EPA, rush offense vs rush defense, with success rates and percentile ranks.
- **Weekly trends** — 544 rows (32 teams × 17 weeks): weekly EPA/play, EPA/dropback, EPA/rush, success rate, defensive splits.
- **Turnover components (actual vs expected)** — expected INTs = 1.867% league-average INT rate × dropbacks; expected fumbles lost = 0.640% × plays. Actual-minus-expected = the luck meter. 2025 DAL textbook: 4th EPA/play, 7-9-1, defense 4.6 INTs below expected.
- **Turnover-worthy-play rate** — FTN `is_interception_worthy` per dropback (2025 only); ~3.0% flagged; 52.3% became actual INTs. INT-projection signal, not raw INT counts.
- **Pressure proxies** — QB-hit rate and sack rate per dropback, allowed and forced. A FLOOR (no hurries in play-by-play), not the true rate. Applied as veto: pressure-to-sack conversion near-pure luck (R² < 0.005); fumble recovery ~0.00 year-to-year.
- **Kicker metrics** — FG attempts/make by distance bucket (<30/30-39/40-49/50+), XP make rate, kicking points/game, FG/XP EPA per attempt. 2025: FG 85.6%, XP 95.9%, 7.36 kick pts/g.
- **Defensive detail** — INT forced rate per opponent dropback; forced fumble rate per play; opponent fumble recovery share; computed TFL rate (yards_gained < 0 on designed rushes); takeaway rate per drive; defensive TD rate per drive; points allowed per drive.
- **Special teams** — kickoff touchback rate (2025: 20.5%), opponent avg start after kickoffs (own 29.8), kickoff/punt EPA, return EPA (return-INCLUSIVE caveat), blocks forced.
- **Player first-downs** — per-player rushing FD rate and receiving FD rate per reception AND per target (qualifiers: 50+ rushes or 30+ targets).
- **QB aggressiveness** — aDOT (Σair_yards ÷ attempts, sacks excluded), comp%, expected comp% (nflfastR cp), CPOE in percentage points. Throwaway handling: cp = NA on all 2,132 2025 throwaways → comp/CPOE on cp-available subset. 2025: Maye +10.6 CPOE, Mariota 10.18 aDOT.
- **Rush/pressure** — four_man_rush_rate (FTN n_pass_rushers == 4) and pressure_proxy_rate = (qb_hit OR sack)/dropback (a floor). Sanity-checked vs @GridironInfo_ W1 charting (ordinal agreement, proxy runs 2–3 pts high).

### 3C. Named benchmarks from X-analytics sweeps (2026-09-17 onward; definitions as filed)
- **SP+** (Bill Connelly) — tempo- and opponent-adjusted, forward-facing efficiency; priors phase out weekly; résumé SP+ uses capped margin.
- **GLSP** (Dave Caban, RotoViz) — Game Level Similarity Projections: range-of-outcomes projections from game-level similarity matching.
- **Vig-free consensus lines / synthetic hold** (@UnabatedSports, @RobPizzola) — de-juiced multi-book consensus, synthetic hold computation, +EV/arbitrage/middle detection.
- **All-32-QB composite (@sfdata9ers)** — EPA/Play + Success Rate + CPOE + Air Yards per Reception, explicitly defined; formula being tuned in public.
- **Composite QB ranking (@sfdata9ers)** — PFR-weighted: QBR 0.35, EPA/play 0.25, CPOE 0.15, Bad Throw% 0.10, Pressure-to-Sack% 0.10, Air Yds/Rec 0.05.
- **Pressure-to-Sack Ratio** — times_sacked / times_pressured (QB pocket-responsibility split).
- **Cost of drops (@sfdata9ers)** — Air EPA + expected YAC EPA − actual EPA (FTN charting).
- **NFL SNAP (@EaglesXsandOs)** — "Seven Numbers Assessing Performance" composite (components not enumerated in AGENTS.md); 10-season backtest: EPA/dropback margin won same-game 83.5% vs ANY/A 80.9%; predicting future winners EPA 62.6% vs ANY/A 62.1%.
- **Market-implied win% v3 (@benbbaldwin)** — win% vs league-average team on neutral; blends near-term Kalshi lines with division/conference/Super Bowl/playoff/#1-seed futures. Companion: remaining-SOS (site-adjusted avg remaining-opponent win%; ARI 55.6 hardest … NO 43.4 easiest).
- **10-facet EPA/WPA decomposition (@SamHoppen)** — EPA/WPA oriented to team and assigned to facets (turnovers > penalties > pass/run off > pass/run def > ST > other).
- **Playcaller Tendency Rating (@PattonAnalytics)** — Y-Aware PCA composite on personnel diversification / play sequencing / tendencies; author: correlates with EPA. Exact inputs UNVERIFIED.
- **Playcalling tendency rates (@sfdata9ers)** — motion/screen/PA/no-huddle/RPO % of rush+pass plays (FTN data; W1 leader LAC 84.3% motion).
- **PROE+ (StatRankings)** — "Pass Rate Over Expectation + Neutral Pace" composite team metric (created 2025; Week 1 2026 leaders: TEN +1.42, CAR +1.36, GB +1.32).
- **ARBY (StatRankings)** — Adjusted Run Blocking Yards per Carry.
- **True Target Share (StatRankings)** — proprietary receiving-usage metric.
- **CoverageIQ+ (StatRankings)** — man/zone + 8 coverage-shell splits (132 WR coverage stats); powers CB/WR assignment matchup reports.
- **xFP — expected fantasy points (StatRankings / Sharp)** — model expected fantasy points (Week 1 2026 leaders: Amon-Ra St. Brown 24.9, M. Golden 23.4, C. Olave 23.0); catchable-target-rate/target-quality in development.
- **Separation Score / Separation Market Share / ADOR (FantasyPtsData)** — proprietary 2nd-year/rookie WR metrics; no definitions published.
- **YPRR / TPRR** — yards / targets per route run (league avg YPRR 1.64 / TPRR 0.20; only 3 receivers > 2.90 YPRR since start of 2025).
- **SumerSports WR metrics (SūmerPass)** — EPA/TGT, Targeted Success %, TPRR, Target Share (JSN 45.8% target share led NFL in opener).
- **BDUE / GCOE** (Eric Eager, Sumer) — Bite Distance Under Expected / Ground Covered Over Expected: linebacker run-flow vs play-action susceptibility.
- **Run stops (SumerSports)** — count of run stops (EdgeAI caveat: "a rate stat wearing a counting stat's clothes").
- **Vertical route share (SumerSports)** — share of go/post/corner routes (Doubs 60.0% led Week 1).
- **Yards per route grade (HB Analytics)** — opponent-adjusted coverage-defender (CB/S) grade: yards/route vs average (negative = better); 2026 W1 with 2025 weighted at 83% fading by Week 6, 150+ rep filters; columns: GRADE, TREND, REPS, yards allowed, OVER EXP. (e.g., Woolen −0.64, Surtain −0.55).
- **Pressure rate grade — Blended (HB Analytics)** — OL/DL pass-protection grade: pressure-rate movement on a typical rep vs average blocker facing the same rushers; wins vs top rushers count more; negative = good (e.g., Bolles −3.1, 777 reps, −37.5 over expected).
- **NGS Aggressiveness (@GridironInfo_)** — % of pass attempts with a defender within a tight window (Week 1 leaders: Willis/Brissett 22%, … Mahomes 4%).
- **Paganetti series** — two-back formations vs middle-open (+0.10 EPA/play run, +0.26 pass); six-up pre-snap rate (NYJ 3.5%); middle-third target rates; play-clock drain; expected rushing YPA regression by team (NGS).
- **Big-time throws (PFF)** — charted elite throw count (QB profile use).
- **Passer rating allowed (StatRankings)** — coverage-liability leaderboard (Stevenson +158.3, Lassiter +153.3 — baseline unstated).
- **Target distribution by alignment / CB-WR assignment mapping** — StatRankings AI matchup report: offense alignment % × CB side/coverage %; man/zone TPRR-YPRR-FP-per-route splits; coverage-shell splits (e.g., Nacua vs C3: 41.96% TPRR, 4.63 YPRR on 112 routes).
- **Mixed-effects EPA attribution (@statsowar)** — EPA decomposed via mixed-effects modeling separating QB, coaching, opponent, supporting cast, weather/venue controls.
- **Fitzgerald-Spielberger draft value chart** — draft slots priced by later salary/financial outcomes (second-contract APY) rather than Pro Bowls/games started.
- **Schedule-adjusted survivor EV (@cmain7)** — EV per surviving entry by Week 1 team used vs $1,341 flat-equity baseline.
- **Composite Score percentile dashboard (@joe307bad)** — per-position-group percentiles (100 = good end) auto-averaged into a composite score.
- **Rushing EPA/game vs rushing TDs/game scatter (@MediJo20/gridironviz)** — career rushing value vs scoring profiles (author caveat: QB scrambles not comparable to RB rushes).
- **Survivor win-probability charts (@ClevTA)** — per-week win probabilities for Circa/Splash survivor contests.
- **EPA/rush by run gap (@csv_enjoyer)** — Week 1 rushing efficiency by designated run gap (Palazzolo's charting-validity warning: gap labels mislabel outside-zone runs).
- **Time to Pressure (@Doug_Analytics)** — OL/DL timing metric of how fast pressure arrives; weekly leaderboard.
- **Under-center usage × efficiency (@tejfbanalytics)** — EPA/play vs under-center snap rate quadrant chart.
- **StatRankings free leaderboards** (1525 player rows / 290 metrics; 607 team rows / 122 metrics): DK/FD/FFPC/NFFC/Underdog FPPG; FP per route/touch/target/dropback/opportunity; clean/under-pressure passer rating; FMT (forced missed tackles); stacked-box rate; target quality; separation/win rate man-vs-zone; inside-20/10/5/2 red-zone splits; game-script pass/rush rates; defensive ARBY; expected pressures; pressure rate over expected; slot/perimeter FP/route allowed; fantasy points allowed (position); blitz rate; scrambles/game; FP/dropback; QB-under-pressure passer rating (Caleb 120.6 1st).

### 3D. Player advanced metrics — 40 distinct metrics (2026-09-19)
Applied across 10 WRs, 4 TEs, 9 RBs, 9 QBs, 8 DSTs.
- **Receiving usage:** route share; route rate; target share; TPRR; aDOT; air yards / air-yard share; YPRR; alignment splits (wide vs slot + EPA); slot target %; red-zone target share; first-read target share (JSN 57.9%, Jefferson 52.9%); xFP (Sharp model); actual FP vs xFP (TD-luck read); PFF WR ranking; separation rank / route win rate; deep targets / red-zone targets.
- **Rushing:** snap share; RB opportunity share; carry share; touch share (early downs); touch splits (early vs late); red-zone touch rate / RZ touches; inside-the-10 usage; yards after contact per attempt (PFF); missed tackles forced / explosive runs (PFF); PFF rushing grade.
- **Quarterback:** EPA/pass play & splits (by personnel, no-play-action, pressured vs clean); passing success rate; yards per attempt; highly accurate throw rate; catchable-target rate; adjusted completion % (PFF); big-time throws; personnel rate; pressure rate faced; blitz rate faced; QB EPA under pressure; sacks / scrambles; team passing aDOT.
- **Defense:** pressure / blitz / sack rates (team); passing defense peripherals (success rate allowed, passer rating allowed, EPA/dropback allowed); takeaways.
- **Requested but N/A (not published by any requested provider — explicitly NOT invented):** EPA vs blitz, deep accuracy, play-action splits, time to throw, pressure-to-sack, separation/contested-catch rate.

### 3E. New-metrics sweep extras (2026-09-19, beyond the AGENTS.md dossier)
- **Statyx runner-evidence package** — YAC/att, evaded tackles/att, rush success %, 10+ run rate, breakaway 15+ rate, stuff avoidance, RYOE flag.
- **Statyx TE targets w/ EPA/target** — e.g., McBride 13 targets / 35% share / +0.289 EPA/target.
- **Rookie-debut stat lines** (@DevyEusuf, PFF data) — Rec Grade, YPRR, REC YD, TGT, ROUTE, ADOT, YAC/REC cross-era.
- **SumerSports PRWR edge-rusher table** — edge production by Pass Rush Win % with pressure/run-defense lines (min 25 snaps; Jalyx Hunt 29.6%).
- **Transferable 2025 team tables** — EPA/play, EPA/db, EPA/rush, def EPA/play, pts/drive per team (NE 0.1856 EPA/play; LV −0.228).
- **2025 ST return EPA** — KR/PR EPA per return (SEA 0.429|0.684, SF 0.504|0.366).
- **Trevor Lawrence depth buckets (NGS)** — Behind LOS / Short / Intermediate / Deep: comp%, separation, time-to-throw (Deep: 3 att / 66.7% / 2.13 / 4.43).
- **Blitz tendencies** — no/one/two-plus blitz rate by team.
- **Ownership leverage % (@StokasticNFL)** — projected optimal-lineup share minus projected ownership; mispricing flag (McConkey "40% leverage, widest gap on a five-game slate").
- **PFF single-game defensive grades** — min-20-snap weekly grades (Deone Walker 93.0, V. Miller 92.4, T.J. Watt 92.3).
- **Rookie/2nd-year WR separation suite** — Separation Score, SEP Market Share, WIN Rate, ADOR (Ayomanor 0.111/60.0/8.8).

---

## 4. NGS-Derived Concepts

*Source: `docs/data/NGS_GROUND_TRUTH_MAP.md`, `docs/research/2026-09-28/orchestration/ngs-feed-creation-plan.md`, `docs/research/2026-10-01/ngs-backfill-step1-validation.md`, `docs/research/2026-10-01/ngs-weighting-design.md`, `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/metric-glossary.md`, `docs/data/ngs-legal-leverage.md`, code (`apps/web/lib/nflverse/ngs-signal-project.ts`, `apps/web/lib/ops/signal-ledger-writer.ts`, `packages/prediction-engine/src/signal-scale-table.ts`). INTERNAL ONLY — Garrett's 2026-09-28 HARD rule: NGS data, metric names, methodology never appear on any public surface; reasoning fuel only. CI-enforced via `apps/web/lib/fences/no-raw-ngs-fence.ts`. Source is only the nflverse mirror (CC-BY-4.0); primary NGS origins never scraped.*

### Standing posture
- NGS is the **referee, never the product**: its numbers enter only as the y-axis of validation correlations (GSE-CPOE/RYOE/xYAC) and as weight-0 shadow signals — never copied into a served metric.
- `canPublishProjections` hardcoded `false` on NGS surfaces; required attribution stamp: "Data from nflverse (nflverse-data), CC-BY-4.0. NGS values used as ground truth only."
- **Strictly NGS-only** (tracking-derived, unreachable from pbp): avgCushion, avgSeparation, avgExpectedYac/avgYacAboveExpectation, avgTimeToThrow, expectedCompletionPercentage, completionPercentageAboveExpectation residuals. Computable from nflverse pbp without NGS: avgYac (actual), catchPct, avgIntendedAirYards, avgCompletedAirYards, pctShareIntendedAirYards.

### NGS signal keys in the signal ledger (WIRED at weight 0 — evidence accumulating)
Four keys (category PRODUCTION) with scale-table anchors/spreads, all weight 0 — present, honest, not allowed to move a score:
- **ngs.cpoe** — QB completion % above expected, per player-week. Spread 7.820 (re-validated 7.644 on 2024 backfill). Strongest NGS prior; expected fitted weight 0.02–0.07.
- **ngs.avg_separation** — average yards of separation at the catch point, per receiver-week. Spread 1.020 (re-validated 1.039). Weakest prior — fit decides, may stay 0. (Older `ngs.separation` key superseded.)
- **ngs.yac_above_expectation** — actual YAC minus model-expected YAC, per receiver-week. Spread 1.951.
- **ngs.air_yards_to_sticks** — average target depth relative to the first-down marker (route-depth aggressiveness). Spread 2.321.
- Projector writes three headline keys per player-week (`ngs.avg_separation`, `ngs.ryoe_per_att`, `ngs.cpoe`), weight 0 / confidence 1. **Discrepancy flagged:** scale table's 4 keys lack `ryoe_per_att`; projector's 3 keys lack `yac_above_expectation`/`air_yards_to_sticks` — two parallel writers, merge/union unresolved.

### NGS in the engine's reasoning layer (WIRED as components)
- **On-field efficiency blend:** 55% pass EPA residual, 15% rush EPA residual, **15% CPOE**, 10% explosive-pass rate, 5% interception luck. NGS may move on-field efficiency by at most 0.15 of that family's signed value.
- **Week-3 component gating:** NGS summary-table fields admitted as live components only if |r| vs 2025 home result ≥ 0.08. LIVE: CPOE (+0.176), **time to throw** (+0.110), **air yards differential** (+0.184), **rush yards over expected** (+0.124), **YAC over expected** (+0.171). Stored but unused: aggressiveness (−0.057), separation (+0.010), special-teams EPA (+0.054).

### Backfill + weighting status
- **Backfill:** Step 1 validated locally 2026-10-01 on 2024 (weeks 1–18 REG; ~130–147 payloads/REG week; ~21,000 payloads 2016–2024; 162 season×week fixtures/key). Backfill route `/api/ops/ngs-backfill` exists. Steps 2–4 (crosswalk join, within-player fit, weight promotion) **BLOCKED on a throwaway Neon branch + Neon API key (founder-gated)**. Crosswalk resolver shipped (Tier 1 commit d824d2b) so the join is runnable once the backfill lands.
- **Weighting design (2026-10-01, not executed):** within-player Pearson r of this-week normalized reading vs next-week PPR-above-median (player fixed effect removed — between-player correlation was 4–36× inflated); weight = clamp(r × √(fixtures/100), −1, 1); floors (CPOE ≥15 attempts, RYOE ≥8 rushes, separation ≥4 targets); mandatory redundancy discount vs PGS counterparts; drops-adjusted CPOE experiment. Expected final weights: CPOE 0.02–0.07, RYOE 0.005–0.03, separation 0–0.02. Garrett's stance: NGS signals are "extremely, extremely valuable" — calibrated weight, backtested like every other family.

### NGS metric taxonomy (from the 48-post inventory + pass 2, consolidated in metric-glossary.md; definitions inferred from post usage unless marked published — mostly NOT ingested)
- **Core chart metrics:** missed tackles forced (MTF); RYOE; CPOE; EPA per dropback; pressures/pressure rate; **get-off** (seconds from snap to first pass-rush movement); blitz rate; **quick pressures** (under 2.5s — the only metric with a printed definition); time to pressure; top speed (mph); YAC over expected; air yards/air distance; target separation; completion probability; win probability added; success rate; **RECYOE** (receiving yards over expected).
- **Situational splits:** motion at snap %; under-center splits; on/off-field splits; coverage matchup tables (per-defender matchups, rec-targets, yards, TDs, man coverage %); yards after missed tackles (team); chip blocks faced.
- **Pass-2 additions:** NGS Draft Model scores (Overall/Production/Athleticism 0–100 + Raw ATH 10.0); **makes over expected** (kicker FG probability vs actual); **time to pressure allowed** (OL); motion-at-snap rate; cumulative WPA on interceptions; **target EPA** (DB); **yards per coverage snap**; **quick pressure rate allowed** (OL); pressures when double-teamed; run stuffs; missed tackle rate; scramble EPA; average speed on carries/at LOS; vertical receptions; receptions vs split-safety; isolated-alignment TDs; air yards per target; coverage classification ("classifies every coverage defender's responsibility and matchups on every dropback"); Expected Points Models (behind EPA/success rate).
- **Published methodology facts:** CPOE = XGBoost on SageMaker, 36k+ attempts back to 2016, r²=0.98, YoY r=0.375 trait stability. RYOE xRY = "The Zoo" 2D-CNN (2020 Big Data Bowl winners; inputs X/Y/S/A/Dir for all 22 at handoff); only 2.5% season carryover, severe O-line confound. YAC-over-expected = same structure as xRY. Pressure = GNN (blocker vs route-runner) + random-forest pressure likelihood (75% threshold) + blocking-matchup model; whitepaper "Feeling the Pressure" (MIT Sloan). Tackle probability → missed tackles / tackle yards saved (>2M data points, 15 models tested). Pipeline: RFID chips (players 10 Hz, ball 25 Hz), ~300M data points/season. New 2026: optical pose tracking (4K, 16 angles, 29 body parts, 60 Hz); announced metrics Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0.
- **Reimplementation specs** (from `ngs-implementation-playbook-2026-09-21.md`, written 2026-09-21, implementation status unverified): XGBoost completion probability from charting-derived features; transformer run-scheme classifier (16 labels) on Big Data Bowl; engagement-detection for OL time-to-pressure-allowed; route classification 2.0 sequence classifier; 2D-CNN xRY reimplementation; GNN pressure model on 2023 Big Data Bowl; frame-level tackle-probability model; TCN QB Passing Score replication (AWS-released SBP code); three-score NGS Draft Model mirror (combine Athleticism + college Production + blended Overall).

### Per-frame tracking feed (PLANNED, not built)
- `ngs-feed-creation-plan.md` (2026-09-28, research-only): target = one row per entity per frame (22 players + ball, 10 Hz) with x, y, s, a, dis, o, dir, event, team, position + play context. Source ranking: (1A) asonty/ngs_highlights 2017–2019 TSVs bootstrap; (1B) nflverse NGS aggregates as calibration anchors; (2) NGS API scrape (fallback needs Garrett's NFL+ Premium token — founder-blocked); (3) broadcast-CV lane (counsel-blocked); (4) licensed feeds — SkillCorner (five-figures/yr) or Genius Sports (six-to-seven figures). Milestones M0–M6: none started as of plan date. Hard constraint: Big Data Bowl data never a training input (license conflict unresolved).

---

## 5. Metric Stack + Extended Library Families

*Source: `gse-research/props-consensus/our-metric-stack.md` (written 2026-09-17). The metric stack is GSE's own lab implementation layer: the 15 computed families listed in §3B (EPA/play, success rate, explosive-play rate, EPA distributions, league percentiles, down splits, drive stats, stuff rate, air-vs-YAC EPA splits, late-and-close performance, unit matchups, weekly trends, turnover components actual-vs-expected, turnover-worthy-play rate, pressure proxies) computed from nflverse play-by-play.*

### Method metrics (how a number becomes a projection — from the stack doc)
- **Base prior** — 2025 full-season per-game means from the filtered sample; 2026 Wk1 = role-check only (100% 2025 / 0% Wk1 for efficiency rates).
- **Script-adjusted volume** — measured 2025 dropback rates by win-probability bucket (lead ~50–54% / neutral ~57% / trail ~62–68%) move favorites toward running, underdogs toward passing.
- **Garbage-time correction** — each volume projection multiplied by the measured unfiltered/filtered per-game ratio for that exact stat (filters remove ~11.2% of 2025 plays; e.g., Allen att 1.025, targets 1.042–1.195; moved St. Brown receptions 6.5 → 8.0).

### Predictive evidence cited in the stack doc
Success rate steadier than EPA; pressure-to-sack conversion R² < 0.005 → individual sack props deliberately NULL (literature applied as veto); fumble recovery year-to-year ~0.00; turnover-luck layers regress (DAL 2025 case); luck-layer decomposition: occurrence (forced fumbles) weakly repeatable, recovery near-pure noise (league baseline 46.3%).

### Known limitations (as filed)
No opponent adjustment (raw EPA; JAX#1 vs DVOA's SF#1 case after adjustment), no weather/injury/rest inputs, 2026 = one-game samples.

### Adjacent definition sources
- `docs/research/2026-09-18/statrankings/methodology-definitions.json` — 673 metric definitions (NFL + NBA), per the subagent read.
- `gse-research/nfl-2026/COMPUTATION_NOTES.md` — lab computation conventions.
- `gse-research/props-consensus/projection_methods.md` — projection method.

---

## 6. Recent Intel-Build Metric Items (queue, Oct 6–10)

*Source: `goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/intel-build-queue.md`. Budget: max 2 Jules sessions/24h. All SHADOW, point-in-time disciplined.*

### Fired (sessions working)
- **Drive Failure Rate** (fired 10-06; re-proposed clean 10-07) — *What share of a team's drives end in failure (turnovers + punts per drive)?* Team-level drive efficiency from @PattonAnalytics via StatRankings.
- **2H game-script half-split features** (fired 10-06) — *How does a team adjust at halftime?* Per-team 1H/2H EPA-play + points-per-drive splits, halftime-adjustment differential, 60-play floor.
- **Receiver-usage bundle + target-dominance composite** (fired 10-09) — *Who commands the passing game?* Per-player target share, deep-target share (air_yards≥15), red-zone target share (yardline≤20), WR+TE; weighted dominance composite; 4/8/season rolling windows, 15-target floor, shrinkage. Folds in WR/TE red-zone target share (Q16).
- **Defensive target-share-by-position allowed** (fired 10-09) — *Where does this defense bleed targets?* Per-defense WR%/TE%/RB% allowed target share, season-to-date rolling, 4-game floor.
- **QB TE-target-rate tendency** (fired 10-10) — *Which QBs funnel targets to tight ends?* Per-QB TE target share = TE targets on the QB's dropbacks / dropbacks; career-all-seasons AND rolling 16-game windows; floors 200 career / 80 rolling dropbacks; shrinkage toward league mean. Source: @FantasyPtsData (Huntley 34.2% vs league avg 21.9%).
- **RB cohort aging curves** (fired 10-10) — *How do RBs age?* RB cohort (≥2 top-36 RB FPTS seasons); per-age PPR mean from nflverse player season data 1999–2026; age-decay multiplier table normalized to peak age ~23; shrinkage on small age cells; vintage-safe. Source: @DynatyzeFF "Age atlas" (peak ~23, ~38% decline age 28→30, 84 lead backs / 679 seasons).

### Queued (awaiting budget)
- **Q5:** Drive Failure Rate SHADOW module re-proposal (clean PR from current main).
- **Q7:** Game-script half-splits clean re-proposal (PR #1140 closed: auto-reject, guardrail tampering — feature verified sound, re-propose clean).
- **Q8:** EPA from opponent FG misses — *How many expected points did a team gain from opponent missed kicks?* Special-teams luck decomposition (PIT +9.8, PHI +7.8, LV +7.0, Weeks 1–4).
- **Q9:** WR cushion-vs-separation CB-WR matchup layer — *Which WRs get open against which coverage?* Pre-snap cushion × at-catch separation differentials vs CB opposition (NGS-internal).
- **Q10:** Down-of-conversion distribution — *When does this offense move the chains?* Per-team 1st/2nd/3rd/4th-down conversion distribution; offense-style fingerprint.
- **Q11:** Drive-outcome distribution — *How do this team's drives end?* Full stacked distribution (TD/FG/punt/turnover/downs) vs points-per-drive reconciliation.
- **Q12:** Play-caller tendency fingerprint (GSE's own) — *What does this play-caller tend to do?* Personnel-grouping diversification + play-sequencing rates (GSE's own implementation, not StatRankings' proprietary formula).
- **Q14:** QB pressure-behavior change detection — *Is this QB breaking out or declining under pressure?* Trend-break in EPA per pressured dropback vs pressure rate (cf. Bryce Young progression).
- **Q15:** Per-position defensive fantasy-points allowance — *Which positions does this defense give up fantasy points to?* Per-team QB/RB/WR/TE FPTS allowed/game.
- **Q17:** QB-conditioned receiver efficiency (supersedes Q13) — *How efficient is this receiver with THIS qb on the field?* Per QB-receiver pairing yards/target + YPRR conditioned on QB on-field status (cf. Flowers 8.02 YPRR w/ Lamar, London 19.8 fpts/g w/ Penix vs 12.1 w/o).
- **Q18:** QB scramble-EPA layer — *How much value does this QB add scrambling?* Per-QB scramble EPA + scramble rate (Maye 34, Allen 29, Purdy 22).
- **Q19:** Shotgun-vs-under-center efficiency split — *Is this QB better from shotgun or under center?* Per-QB under-center rate + EPA/dropback split by formation.
- **Q20:** Play-caller sequencing volatility — *How predictable is this play-caller drive to drive?* SD of drive-to-drive predictability (second moment to Q12).
- **Q21:** Year-over-year efficiency persistence / regression priors — *How sticky is team efficiency?* Per-team current-vs-prior-season EPA/play with shrinkage (+ defensive mirror); regression-to-mean prior for team strength.
- **Q22:** Sacks taken on third down — *Which QBs/OLs collapse on money downs?* Per-team and per-QB 3rd-down sacks count + rate (SF 0 … Bucs/Steelers 8, Weeks 1–4).
- **Q23:** Yards by size of play — *Is this offense explosive or just efficient?* Per-team play-size bucket distribution (Loss/1–5/6–10/11–20/21+/Total); explosive-play generation vs negative-play avoidance axes.
- **Q24:** Third-down target share — *Who gets the ball when it matters?* Per-player 3rd-down target share + 3rd-vs-other-downs differential (Evans 44.8% vs 13.1% on other downs; JSN 43.8%).
- **Q25:** Red-zone carry share — *Who owns the goal line?* Per-player RZ carry share (Gibbs 91.3%, Henry 82.1%, Jeanty 78.9%).
- **Q26:** Defensive coverage-technique trends — *Are these CBs pressing less than they used to?* Per-team-secondary press-rate and cushion rolling trends (NGS-internal; cf. Texans CBs at career-low press rates).
- **Q27:** ANY/A QB efficiency expected metric — *How efficient is this QB per dropback, all-in?* Per-QB ANY/A = (PassYds + 20·TD − 45·INT − SackYds)/(Att + Sacks), rolling 4/8/season windows (Purdy 10.46, Lamar 9.50, Mahomes 8.13).
- **Q28:** Offensive-minus-defensive snap differential — *Who controls possession?* Per-team offensive snaps/game minus defensive snaps/game (CHI +28 … TEN −11.0); pace/possession descriptor.
- **Q29:** Pressure-vs-elusiveness matchup collision — *Can this QB escape this pass rush?* Per-QB sack-avoidance on pressured dropbacks vs per-defense pressure rate (cf. Purdy 0.0% sack rate vs SEA 8.1% pressure rate).
- **Q30:** Multi-axis secondary fragility profile — *How many ways is this secondary bad?* Per-defense pass-defense fragility vector (EPA/pass, success rate, Y/A, comp%, passer rating, pass-TD rate, INT rate allowed), rank-normalized composite (cf. Cowboys 32nd in EPA/pass allowed).
- **Q31:** Per-player NGS average-separation expected metric — *How open does this receiver get?* Per-player avg_separation from NGS ingestion, rolling 4/8/season windows, 20-target floor (NGS-internal).
- **Q32:** Negative Play % — *How often does this offense go backwards?* Share of offensive plays gaining negative yards (penalties, kneels excluded; SF 2.3% … PHI 12.3%).
- **Q33:** QB red-zone carry share — *Which QBs steal goal-line TDs?* Per-QB RZ carry share = QB rush attempts inside the 20 / team rush attempts inside the 20 (Allen 41.7%, Nix 40.0%, Burrow 37.5%, Hurts 26.1%, Herbert 22.7%).
- Queue depth as of 10-10 PM: 24 pending (Q8–Q12, Q14, Q15, Q17–Q33).

---

## 7. Implementation Status

### Implemented in code — `packages/prediction-engine/src/metrics/` (Slice 1 + governed continuations)
Core grammar: `core/` (metric-birth-certificate, driver, math, shrinkage, validation, source-rights, payload-rights, metric-asset, metric-graduation, residual-rollup, evidence-cards, report-markdown, historical adapters, payload-envelope).
- source/: `data-reliability-index.ts`
- market/: `market-gravity-index.ts`, `stale-line-risk-score.ts`, `market-mirage-score.ts`
- passing/: `expected-completion.ts`, `qb-burden-index.ts`
- receiving/: `receiver-difficulty.ts`, `expected-yac.ts`, `yac-creation.ts`
- role/: `role-volatility-index.ts`
- rushing/: `rush-environment-index.ts`, `expected-rush-yards.ts`, `rush-over-expected.ts`
- calibration/: `calibration-integrity-grade.ts`, `conformal-uncertainty-width.ts`, `drift-pressure-index.ts`
- decision/: `no-bet-pressure.ts`, `playable-window-score.ts`, `portfolio-fit-score.ts`, `gse-signal-score.ts`

### Implemented in code — `packages/prediction-engine/src/expected-metrics/` (GSE's own NGS equivalents)
`expected-completion.ts` (GSE-CPOE, gse-xcomp-v1), `expected-rush-yards.ts` (GSE-RYOE, gse-xrush-v1), `expected-yac.ts` (GSE-xYAC, gse-xyac-v1), `expected-points.ts`, `win-probability.ts`, `success-rate.ts`, `drives.ts`, `nflverse-pbp-mapper.ts`, `rollup.ts`, `validation.ts`, `linear.ts` (ridge), `logistic.ts`, `numeric.ts`, `types.ts`.

### Implemented in code — `packages/prediction-engine/src/nfl/` (NFL-specific metric modules)
- `expected-completion.ts`, `expected-yac.ts`, `receiver-difficulty.ts`, `rush-environment.ts`, `role-volatility.ts`, `qb-burden.ts` (older compatibility primitives; governed versions live in `metrics/`)
- `coverage-db-metrics.ts` — *Coverage/DB metrics:* target EPA, yards-per-coverage-snap, EPA per target, completion % allowed, passer rating allowed for defensive backs (from nflverse + charting; NGS playbook §11).
- `luck-neutralized-epa.ts` — *Luck-neutralized EPA:* adjusts play EPA for high-variance outcomes (fumble recoveries, tipped INTs, missed FGs) so team strength reflects process, not coin flips; `deserveToWin` replays a game with neutralized EPA → win-probability distribution.
- `ngs-adjacent-metrics.ts` — *Adjacent metric families:* kicker makes-over-expected, scramble EPA, motion-at-snap rate, run stops/stuffs, air yards per target, on/off-field EPA splits (NGS playbook §12).
- `parsimonious-season.ts` — *Parsimonious season model:* football-tables transplant — the paper's MAE null E=(1/3)(n²−1)/n as the documented chance baseline for standings products; schedule-adjusted early point differential as the weeks-1–6 team-strength prior (horse-raced vs full Monte Carlo on final-table MAE).
- `progress-target.ts` — *Progress target:* down-aware continuous play-value measure (progress = gained/togo with quadratic down penalty, no win-probability model); adopted as a secondary play-level target alongside EPA in play-by-play prediction (arXiv:1601.00574v1).
- `skellam-margin.ts` — *Skellam regression for score differentials:* final margin Z ~ Skellam(λ1, λ2) with log-links on unit-strength differential covariates; closed-form margin PMF → P(home win), P(cover | spread) by summation (arXiv:1807.07536). Complement to Monte Carlo, O(1) spread pricing.
- `margin-mixture-model.ts` — *Margin mixture:* Stern-normal continuous component mixed with discrete point masses at key numbers 3, 7, 6, 10 (both signs); closed-form method of moments + Laplace-smoothed empirical key masses. First-party.
- `block-poisson.ts` — *Block-Poisson chance-rate layer:* team scoring chances (drive reaches opp 35) modeled as Poisson per 7.5-min block with log λ = off rating − def rating + home + score-diff + turnover/penalty proxy; posterior θ = team "chance-creation ability" — totals-model feature and matchup input.
- `generalized-poisson.ts` — *Generalized Poisson TD model (V6):* trailing Bayesian-blended team ratings → generalized Poisson TD counts (under-dispersed) → FG Poisson, safety Bernoulli, XP conditional, OT separate → matchup simulation. Home field is a fit parameter, never hardcoded.
- `ats-ablation-harness.ts` — ATS ablation test harness.

### Implemented in code — `apps/web/lib/` metric surfaces
- `metrics/opponent-adjusted-epa.ts` — *Opponent-adjusted EPA/play* ("our DVOA"): transparent equivalent of proprietary efficiency ratings from open data.
- `metrics/coverage-map.ts` — *Derived-metrics coverage map:* registry of which competitor-withheld signals (NGS/PFF/ESPN) we compute transparent equivalents for, gated by source clearance.
- `metrics/feature-store.ts`, `metrics/uncertainty-map.ts` — feature store + uncertainty mapping.
- `nflverse/pressure-coverage.ts` — *Pressure & coverage:* PFR advanced charting via nflverse `pfr_advstats` — QB pressure faced/handled, defender throwability in coverage.
- `nflverse/qbr.ts` — *ESPN Total QBR* via nflverse `espn_data` — independent QB-quality estimate to triangulate vs CPOE and pressure views.
- `nflverse/player-lab.ts` — *Player Production Lab:* per-position season leaders, last-5 form splits, positional defense-allowed ranks from `player_stats_week`.
- `nflverse/expected-metrics.ts` — fit-on-load loader for GSE-CPOE/RYOE/xYAC with grain enforcement and honesty gates.
- `intelligence/qb-forward.ts` — computes ANY/A in the web layer (display/intelligence; the engine SHADOW ANY/A module per Q27 must compose, not duplicate).
- `fable/uncertainty.ts` — ranks candidate predictions by probability uncertainty. `fable/drift.ts` — distribution drift + safe football segment parity checks.

### Research-only (documented, not implemented in code)
- Source Trust Score (bible backlog item #11 — not yet built).
- NGS model reimplementations from the implementation playbook (XGBoost completion probability, run-scheme transformer, route classification 2.0, 2D-CNN xRY, GNN pressure model, frame-level tackle probability, TCN QB Passing Score, NGS Draft Model) — specs written 2026-09-21, implementation status unverified at catalog time.
- Reproduction strategy builds: QBR-like composite from nflfastR EPA + WP-leverage weight; FPI-like rating (Elo + efficiency inputs + preseason priors, calibrated); Galaxy Opponent-Adjusted Efficiency (DVOA-like from situational baseline + opponent adjustment — the "single best value-for-effort build"); PRWR/PBWR/RBWR approximations from PFR charting + Big Data Bowl; AV-like single-number season value; de-vig consensus fair-value + "edge vs our model" signal; execution-approximation layer (ML over PBP + public charting as PFF-grade substitute).
- All Q8–Q33 queued intel-build items (section 6) except those fired.
- Provider teardowns in `PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md`: NGS, PFF, ESPN QBR, ESPN FPI, ESPN PRWR/PBWR/RBWR, Football Outsiders/FTN DVOA & DYAR, SIS Total Points, PFR AV, SumerSports/Telemetry ML grades, betting markets (Pinnacle/consensus), fantasy projection houses (4for4/ETR/FantasyPros) — each with "our build" spec.

---

## 8. Known Gaps

- **`~/workspace/gse-research/advanced-metrics-data-source-catalog.md` is MISSING** (referenced in the task brief and possibly in AGENTS.md; file does not exist). The benchmark-lane metric summaries in this catalog come from the AGENTS.md entries instead.
- **Metric glossary** at `docs/arxiv-program/research/2026-09-21/nextgenstats-profile/metric-glossary.md` (18.9KB) — mined via its consolidated taxonomy for §4; raw 48-post inventory lines at `post-inventory-*.md` not paged individually.
- **48-post @NextGenStats inventory**: `post-inventory-2026-09-21.md` (+ continuation + QC files) exist in the nextgenstats-profile dir; the consolidated glossary (inventory + pass 2, 80 posts) was used instead of per-post extraction.
- **arXiv program**: 579/750 ADAPT/ADOPT papers verified as of 2026-10-03 (tracker: `docs/research/2026-09-21/arxiv-program/phase2/AUDIT-2026-09-21-tracker.md`) — the math methods distilled from those papers (rating systems, time-series, calibration) are a separate methods corpus, not itemized here.
- **NGS raw tracking feed**: hardware moat — irreproducible. GSE gets aggregates + outcome approximations, never live sub-second geometry. (Stated plainly in the reproduction strategy.)
- **PFF/SIS exact human grades**: labor moat — approximated, never replicated.
- **Any provider's exact numbers**: GSE builds equivalents, never copies (legal boundary).
- **Session persistence**: not a metric, but blocks the automated metric pipelines (SiriusXM nightly pull runs in a browser profile that never receives the session; YouTube server-side routes are datacenter-IP-blocked) — noted because it affects data freshness for research inputs.
