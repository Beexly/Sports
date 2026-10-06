# c01 Deep Research — Partition 01: QB-BEHAVIOR

**Partition scope:** all briefs in `~/workspace/corpus-intelligence/briefs/c01/` with real QB-BEHAVIOR content (not just the tag-taxonomy header line).
**Read:** 70 briefs (100% of the true partition). The slice map says 95; the other 25 mention "QB-BEHAVIOR" only in the boilerplate `## Intelligence connections (tag each: ...)` header or state explicitly "no QB content". 70 is the verified partition.
**Spot-checks against source:** 14 consequential claims re-verified against the source file under `~/workspace/vendor/Sports/docs/`. Read-only; no builds.
**Related pipeline:** `~/workspace/qb-behavioral-profiles/` (compute_metrics.py / gen_profiles.py, 8 QB profiles). **Target build lane:** `~/workspace/gse-intelligence-build/qb-behavior/`.

Every INFERENCE is marked. Numbers are quoted verbatim from briefs/sources; where the brief's number matches the source I say so; where it doesn't, I flag it.

---

## 1. Verified claims

| # | Claim | Source file | Conf | Verification note |
|---|---|---|---|---|
| 1 | Pressure-to-sack = share of pressured dropbacks ending in a sack; Bryce Young 23.3% (30 of 30, 2023) → 15.8% (10 of 31, 2024) → 12.7% (8 of 29, 2025) → 10.5% (2026, unranked, 2 games/38 pressured dropbacks); league avg ~18% flat | arxiv-program/research/2026-09-21/sweep-2026-09-21.md | HIGH (transcription), LOW (trait claim) | Source line matches verbatim. But each season's denominator is n=29–38: se≈7pp, so the 13pp "YoY trait movement" is <2σ — consistent with noise as well as improvement. Do not treat as a stabilized trait. |
| 2 | QB behavioral profile recipe: first-read rate + scramble rate + pressure EPA/db + sack-vs-blitz + aggressiveness/aDOT, crossed with team playcalling rates (motion/PA/RPO/no-huddle) and playcaller ratings as coaching priors | research/2026-09-19-dk-week2/deep/qb-phase2.md | HIGH | Matches source; read-progression figures (Purdy 27.0% first-read, Love 78.6%) source-cited to DonAtkinsonNFL read-progression CSV (9/17). |
| 3 | Pitts with/without London TPRR split: FPG 8.0 [TE27] / 19.0 [TE1]; TPRR 0.18 [TE37] / 0.28 [TE1]; sample 2024–2026 | dfs/research/2026-09-25/full-tables/README.md | MED | Matches source CSV doc exactly. Caveats inherited: text-only X post, author's own data implied, no source stated; without-London sample size not stated (London is durable — likely only a handful of games). Treat as directional template, not an estimate. |
| 4 | BUILD 1: per-QB rolling EPA/dropback keyed by `passer_player_id` (follows trades), 16-game rolling cross-season window, availability weight = prior-games snap share with anti-leakage (weeks strictly before current). Team efficiency stats add nothing over Elo (0.632 vs 0.632); per-QB rating = single largest gain: log loss 0.633→0.625, AUC 0.690→0.700. Walk-forward 3,816 games 2012–2025: 65.2% acc, Brier 0.216. Source repo github.com/TreMatt03/nfl-game-predictor (MIT) | dfs/research/2026-09-25/youtube-builder-research/handoff-indie-builders-v2-fullspec-2026-09-25.md | HIGH (transcription), MED (independent run) | Source matches verbatim. It is the handoff doc's report of an external builder's results — GSE did not re-run it. The anti-leakage test (`test_snap_share_excludes_the_current_week`) is the replicable part. |
| 5 | Metric bible: expected INTs = league-avg INT rate × team dropbacks (2025 baseline **1.867%**); expected fumbles lost = 0.640%/play; turnover-worthy-play rate ≈3.0% of dropbacks flagged (FTN `is_interception_worthy`, 2025 only), **52.3%** of flagged throws became actual INTs; garbage-time removal (4Q, WP>0.95 or <0.05) removed 11.2% of 2025 plays; Success = EPA > 0 (0 mismatches with nflverse flag); dropback = pass attempt OR scramble; sacks count as attempts, scrambles as dropbacks; R² < 0.005 for pressure→sack → explicit veto on individual sack props | props/research/2026-09-17/props-consensus/our-metric-stack.md | HIGH | All numbers match source verbatim. Note: the veto line is about the TEAM level; see Challenge A for the tension with the QB-level trait. |
| 6 | PFF lowest pressure-to-sack (min 10 pressures, through Wk 2 2026): Purdy 0.0% (0/15), Daniels 4.2% (1/24), Stafford 6.3% (1/16), Dart 7.7% (1/13), Prescott 9.1% (2/22), D. Jones 9.1% (2/22) | research/2026-09-24/full-tables/README.md | HIGH (transcription), LOW (inference) | Source CSV doc matches verbatim (PFF-branded chart). n=15 for Purdy: P(0/15 \| p=0.18) ≈ 0.05 — suggestive, not conclusive. Flag n<30. |
| 7 | Uncatchable throw rate (min 30 att, FTN): Purdy best 10.71%, Winston worst 22.0%; Wentz 16/39 = 41.03% (author reply) | research/2026-09-24/full-tables/README.md | HIGH | Matches source verbatim. League avg 21.5% (21 targets / 5 not catchable) from 9-29 README. Wentz is ~3σ above league mean on n=39 — the collapse claim is statistically solid. |
| 8 | GSE-CPOE: `GSE-CPOE(passer) = 100 × mean(complete − P̂(complete))`, logistic fit (L2-regularized full-batch GD, 400 iter, lr 0.3, L2=1e-3), 10 features (airYards, airYards², qbHit, isMiddle/isLeft, down, ydstogo, yardline100, shotgun, noHuddle); floors: 200 plays to fit, 100 dropbacks qualifier; graduation bars Pearson 0.60/0.50/0.40 (cpoe/xyac/ryoe), provisional 0.35/0.25/0.20, min join n=12 | math/GSE_EXPECTED_METRICS.md | HIGH | Formula, features, floors, and thresholds all match source verbatim. CPOE bar is highest because depth+pressure are public (honest rationale in-file). |
| 9 | Receiver-conditional TD decomposition: P(TD) = Σ_t P(TD\|target=t)·P(target=t) — train conditional on ground-truth target, marginalize at inference. Paper result: receiver top-3 accuracy 0.782±0.039; shot F1 unconditional 0.521 → conditional 0.677 (0.712 with D₂) | arxiv-program/research/2026-09-21/arxiv-deep/0912-tacticai-ai-assistant-football-tactics.md | HIGH (paper numbers), MED (NFL port) | Matches brief. INFERENCE/FLAG: the brief's "numeric gate ≥5% holdout log-loss improvement (paired bootstrap, p<0.05)" is the READER'S proposal, not the paper's. Paper caveats: soccer corners; D₂ symmetry exact for a pitch, weaker on a football field (play direction, hash marks, down/distance); random 80/20 split not by match (mild leakage). |
| 10 | Scramble rates W1 2026 (dropback-outcome CSV): Caleb 34.2%, Maye 27.5%, Hurts 25%, Daniels 20.6%, Mayfield 11.1%; designed-run rush EPA +2.0/gm Hurts; Allen +2.4 rushing EPA/gm since '99 (only peer per AGENTS-history) | research/2026-09-19-dk-week2/deep/qb-phase2.md + ops/AGENTS-history-main-2026-09-26.md | HIGH | Both files agree on the scramble ladder. Allen +2.4 rushing EPA/gm "since '99" appears in AGENTS-history lab notes — origin of the number is the lab, not an external authority; treat as lab-computed. |
| 11 | Per-QB dropback-outcome split: COMPLETE/INCOMPLETE/SCRAMBLE/SACK/INT % per QB (GridironInfo_, Wk 3, min 15 dropbacks, 32 rows) | dfs/research/2026-09-29/full-tables/README.md | MED-HIGH | Matches source. In-file data-quality flag: read places both C. Keenum and C. Stroud on HOU — likely logo misread (Keenum started for CHI on MNF), noted not corrected. |
| 12 | FTN charting 2022–2025 (~47,316 rows/season) columns: qb_location, is_qb_out_of_pocket, is_interception_worthy, is_throw_away, read_thrown, is_catchable_ball, is_contested_ball, is_created_reception, is_drop, is_qb_sneak, n_blitzers, n_pass_rushers, is_qb_fault_sack — rights-cleared, NO production caller (S6 gap) | engine/research/2026-09-24/signal-wiring-catalog.md | HIGH | Columns match source verbatim. This is the single most important unwired input for the QB-behavior engine. |
| 13 | HB Analytics composites: 2025 at 83% weight fading out by Week 6 (pass-block), 50% fading by Week 6 (run-block); 150+ rep minimum; wins vs top rushers count more; rusher/blocker grades solved simultaneously; double teams handled separately; small samples pulled to average. NGS aggressiveness definition: % of attempts with a defender within 1 yard of the receiver at completion/incompletion | dfs/research/2026-09-17/full-tables/README.md | HIGH | Matches source verbatim. Directly reusable methodology family. |
| 14 | Allen vs Lions blitz (55.3%, highest under DC Sheppard): passing vs blitz 12/17, 137 yds, 2 TD; scramble runs 5 for 49 + TD; QB sneaks 4/4; full game 20/31, 248, 3-0, 14 carries/69 yds/2 TD, 78.6% success rate | arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md | HIGH | Matches source verbatim. Source itself flags: graphic stat-box "CPOE +55.3%" is likely a labeling anomaly (same digits as the blitz rate). |
| 15 | QB per-player volatility unmodeled by the fantasy signal: corr(predicted SD, realized SD) = +0.0636 QB (n=48, pred 8.8 / real 7.5) vs RB +0.6251, WR +0.5699, TE +0.2957. Decision: do not publish player-specific QB bands from this signal. Half-life H=6 (within 2.3% of best pooled MAPE) | fantasy/research/2026-09-28/half-life-and-band-calibration.md | HIGH | Matches the internal memo (33,962 player-weeks, 2020–2026 walk-forward). z-coverage curve measured: z=1 → 92.5% coverage; 50%-coverage band = ±34% of projection. |
| 16 | First-read rate × EPA/att scatter (Wk 2): league avg ≈+0.25 EPA/att, 65% FRR; Caleb outlier ≈+0.48/~48% (efficient without first-read reliance); Lock ≈80% FRR; Purdy 27.0% (lowest) vs Love 78.6% (highest), Wk 2 adds Wentz 76.2% … G. Smith 26.2% | ops/AGENTS-history-main-2026-09-26.md + research/2026-09-24/full-tables/README.md | MED | Directionally verified. Source 9-24 README explicitly flags the Patton scatter values as VISUAL APPROXIMATIONS off axes. Caleb "outlier" read rests on approximations — directional, not numeric. |
| 17 | Opponent-adjusted EPA blend: 55% opp-adj pass EPA + 15% opp-adj rush EPA + 15% CPOE + 10% explosive pass rate (20+ air yds) + 5% interception luck (sign-flipped); shrinkage 80 pass attempts / 40 carries; 2026 weeks judged against 2025 defense | reasoning/competitive-intel-intake-2026-09-26.md | HIGH | Matches source verbatim. The FantasyGuru QB-mobility-type construction was REJECTED as duplicate of rushing EPA — mobility belongs inside rushing EPA, no standalone family. |
| 18 | Pressure proxy floor convention: (qb_hit OR sack)/dropback runs 2–3 pts high vs charting; composite QB formula = EPA/Play + Success Rate + CPOE + Air Yds/Rec — still tuning; Dynatyze DAKOTA all-in-one QB score exists | ops/AGENTS-history-main-2026-09-26.md | MED | Matches source. The composite is explicitly "still tuning" — do not hardcode it as final. |
| 19 | Caleb Williams 20+ mph: six 20+ mph plays since start of last season (20.80 on 29-yard TD run, 20.35 on 9-yard scramble TD) — no other QB has more than two | arxiv-program/research/2026-09-21/nextgenstats-profile/post-inventory-2026-09-21.md | MED | Matches NGS X-post inventory. NGS numbers only — learning-only per the NGS doctrine, never republished commercially. |
| 20 | Burden-index drivers (QBI, SHADOW): pressure, depth, down-distance friction, weather/context penalty, line disruption; "burden ≠ quality" — context load separated from QB skill | ops/archive/dated/SUNDAY_FRONTIER_MAXFORCE_AUDIT_2026-07-05.md | MED | Matches source. All formulas are SHADOW-only and NOT published in the doc — driver list is real, weights are not. |
| 21 | Hurts +1.50 EPA/att on 10+ air-yard throws (20 att, best of charted QBs); air yards lost to drops: Herbert 70, Mahomes 59, Mayfield 57 | research/2026-09-24/full-tables/README.md | MED (transcription), LOW (stability) | Matches source (min 8 attempts qualifier — n=20 for Hurts is small; do not generalize as a deep-ball trait). Air-yards-lost-to-drops is receiver-driven EPA drag, not QB fault — the brief's own read. |

Verification summary: 14 of the 22 rows re-checked against source files in `~/workspace/vendor/Sports/docs/`; the rest taken from brief text (briefs are short and internally consistent). Two brief numbers were found to be weaker than presented — both are now Challenges, not verified claims.

---

## 2. Syntheses — cross-file systems (findings that compose into ONE buildable feature)

### S1. The pressure chain (L3 causal stack)
**Files:** sweep-2026-09-21 · our-metric-stack · qb-phase2 · 2026-09-24 full-tables · signal-wiring-catalog · post-inventory-2026-09-21
**What it is:** HB composite OL grades (opponent-adjusted, time-blended) → NGS <2.5s quick-pressure split (coverage sacks vs true rush wins) → per-QB pressure-to-sack trait (YoY-tracked, shrunk to ~18% baseline) → first-read/trust-target response (Love 78.6% one-read under pressure vs Purdy distributor) → receiver-conditional TD.
**Joins:** all keyed by (qb_id, season-week). The chain converts the current pipeline's "qb_hit proxy" INT splits into a modeled pressure attribution: expected pressure (OL + scheme) → QB sack conversion (trait) → read decision (behavior) → target (trust).
**Gap it fills:** the pipeline has no pressure feature at all today (only a qb_hit proxy for INT splits). FTN's `is_qb_fault_sack` + `n_blitzers` + `n_pass_rushers` are the wiring fuel (rights-cleared, no production caller).

### S2. The trust-target system
**Files:** qb-phase2 · advanced-matchups-deep-dive-2026-09-19 · 2026-09-25 full-tables (Pitts) · tacticai-0912 · signal-wiring-catalog (FTN read_thrown/catchable) · CARDS_INCENTIVE_CALENDAR (IC4) · 2026-09-29 full-tables (first-read target share top-25)
**What it is:** HHI/top-1/top-2 shares (already in pipeline) + first-read share + TPRR + air-yard share → the QB's "trust map". Two conditional layers on top: (a) **WR-absence conditionalization** — recompute every concentration metric with each receiver present vs absent (the Pitts 0.18→0.28 template, generalized); (b) **regime-state conditionalization** — IC4's incentive states (eliminated/auditioning teams refit usage on post-state games only; rest-window = refuse to price).
**Prop join:** the trust map is exactly the P(target=t) prior for the receiver-conditional TD decomposition P(TD)=Σ_t P(TD|target=t)·P(target=t).
**Gap it fills:** pipeline has HHI but no first-read, no TPRR (needs route denominators — FTN charting), no absence-conditional, no incentive-state handling.

### S3. The INT projection system
**Files:** our-metric-stack · AGENTS-history-main-2026-09-26 · existing pipeline · signal-wiring-catalog (is_interception_worthy) · advanced-matchups (INT-luck ledger: LAC +7.11, CHI +7.22, NYJ −10.08)
**What it is:** TWP rate (~3.0% flagged, 52.3%→INT) as the situational INT signal + 1.867%/dropback baseline for the prior + the pipeline's existing INT splits (quarter/script/hit-clean) re-fit with TWP as the target + INT-luck regression (takeaways over expected mean-revert: DET recovered only 26.3% vs 46.3% league on +6.5 forced fumbles over expected).
**Joins:** (qb_id, season-week, situation). FTN `is_interception_worthy` joins to nflverse pbp on (game_id, play_id) at 100% coverage for 2025 (per the metric bible).
**Gap it fills:** pipeline measures raw INT rate; corpus says raw INT count is the wrong target — TWP is.

### S4. The run-behavior system
**Files:** qb-phase2 (scramble ladder) · post-inventory (Allen vs blitz; Williams 20+ mph) · AGENTS-history (scramble vs designed EPA; Allen +2.4 rush EPA/gm) · 2026-09-29 full-tables (dropback outcomes, QB-sneak 4/4) · 0912-adjacent scramble/scramble-EPA tracking notes
**What it is:** scramble rate (reactive) vs designed-rush rate (called) — computed separately, EPA'd separately — + heavy-blitz scramble production splits (Allen 5 for 49 + TD vs 55.3% blitz) + QB-sneak conversion + QB-as-ball-carrier speed frequency (Williams archetype) + under-center vs shotgun rushing split (scheme-alignment).
**Joins:** (qb_id, season-week, blitz_flag). Pipeline already separates scramble/designed; the corpus adds the blitz-conditional and EPA-per-type layers.
**Note:** competitive-intel says do NOT build a standalone "QB mobility" family — mobility lives inside rushing EPA. This system respects that: it is a behavioral decomposition for props/fantasy, not a new team-strength factor.

### S5. The form/stability system
**Files:** handoff-indie-builders (BUILD 1: 16-game rolling EPA/db; BUILD 5: n/(n+6) prior blend; Damepivot) · AGENTS-history (HB 83%-prior fade-by-Wk6; DVOA 50/30/20; DAVE 83/98) · half-life-and-band-calibration (H=6) · 0495 (Marcel 40/30/20/10 recency; dual-metric gate: predictive GMP + simulated added wins) · 1184 (D/S/I metric audit: flag D<0.5 or I<0.2 for shrinkage) · 2048 (Minerva Seal ≥80 for production entry; regime-stability gate) · 1655 (regularized HMM hot/cold QB form states) · 0576-adjacent upset-proneness profiling (INFERENCE only)
**What it is:** every QB behavioral rate gets a recency model (16-game rolling window as the proven form measure, cross-checked against H=6 half-life and HB-style prior blending), a stability audit (D/S/I + split-half), and a production gate (Minerva Seal). The HMM gives formal hot/cold form states for prop models.
**Key decision:** BUILD 1's measured gain (log loss 0.633→0.625, AUC 0.690→0.700 on 3,816 games) makes the 16-game rolling per-QB EPA/dropback the FORM feature; the other schemes are priors/blends around it.

### S6. The attribution/uncertainty system
**Files:** 1540-space-time-von-cramm (Decision IQ: marginalize over execution, fix pre-throw configuration — separates read quality from arm execution) · GSE_EXPECTED_METRICS (CPOE/RYOE/xYAC as the over-expected kernel; NGS enters only as validation ground truth) · half-life-and-band-calibration (no per-QB bands from this signal) · SUNDAY_FRONTIER audit (QBI burden drivers)
**What it is:** decision quality vs execution quality vs context burden — three separate numbers, never conflated. CPOE is the execution kernel (with the 100-dropback qualifier and graduation bars); Decision IQ is the read-quality number (long-term, NGS-lane, internal-only per the 2026-09-28 doctrine); QBI drivers are the context number.
**Enforcement:** the band-calibration memo is the display rule — QB-specific floor/ceiling from the fantasy signal presents a prior as the player's own uncertainty. Do not publish it.

---

## 3. Challenges — claims that don't hold up, contradict, or rest on thin samples

**A. Pressure-to-sack R² < 0.005 veto (team level) vs pressure-to-sack as a YoY-moving QB trait.** The metric bible's veto is cross-sectional at the team level ("conversion near-pure luck"). The sweep reads Bryce Young's 23.3%→10.5% as QB-trait movement. Both can be true — but the trait read is statistically weak: each season is n=29–38 pressured dropbacks (se≈7pp), so the 13pp four-year move is <2σ, and the 2026 reading (2 games, "unranked") is noise. The map's proposed resolution (model it at the QB level with the <2.5s split) is the right direction, but the corpus provides NO shrinkage or stability evidence. Stronger side: the veto (measured, pre-registered). The trait is UNTESTED — wire it only with empirical-Bayes shrinkage toward the ~18% baseline and a regime-stability gate (Minerva/D-S-I), never as raw single-season rates.

**B. Purdy 0.0% pressure-to-sack (0/15) presented as an elite-pressure-handling cluster.** n=15. P(0 sacks in 15 pressured dropbacks | league 18%) ≈ 0.051. Borderline significant one-sided and the 9-24 brief compounds it with CPOE +10.5 and 10.71% uncatchable into a "cluster" — but the three numbers come from different sources with different minimums (PFF min-10 vs FTN min-30 vs StatRankings) on 2-game samples. INFERENCE: suggestive, not established. Needs n≥30 before it enters any profile as a trait.

**C. Pitts-without-London (0.18→0.28 TPRR, 8.0→19.0 FPG) treated as a template for estimation.** The without-London sample size is unstated (London has been durable; likely 2–6 games across 2024–2026), the post is text-only with no stated data source, and 19.0 FPG [TE1] on a tiny sample will regress. The brief correctly flags the source thinness. Keep the METHOD (recompute trust metrics conditional on receiver absence), do not keep the NUMBERS as priors.

**D. Concepcion vs single-high (TPRR 0.22→0.33, +50%) flagged in-file as a betting recommendation ("The Play: Over 3.5 receptions"), not research.** Do not wire. The scheme-conditional target profile method is fine; this instance is tainted.

**E. Single-game extremes presented as profiles:** Lawrence +0.81 pressure EPA/db vs DEN (W1 only); Rush 80% pressure-to-sack and 2.6 QBR (W1 only); Watson PFF grade 40.1 with 3 TWP vs 1 BTT (W1 only). All are one-game numbers. The qb-phase2 brief uses them as slate reads (legitimate), but nothing from W1 2026 should enter a behavioral profile without accumulation. The 100-dropback minimum exists for exactly this reason.

**F. TacticAI "ADAPT" verdict overstates the port.** The brief's two build proposals carry a reader-invented numeric gate (≥5% log-loss improvement) that does not come from the paper. The paper's domain is soccer corner kicks with exact D₂ pitch symmetry and a random 80/20 split (mild same-match leakage). The portable part is the receiver-conditional decomposition MATH (F1 0.521→0.677); the 22-node pre-snap GATv2 on NGS data is speculative and would need its own held-out proof. Downgrade the GNN port to QUEUED; keep the decomposition as buildable.

**G. First-read × EPA/att scatter (Caleb "outlier", Lock 80% FRR) rests on VISUAL APPROXIMATIONS off chart axes** — flagged in the 9-24 README itself. Directional read only; do not quote ≈+0.48/~48% as measured values.

**H. Composite QB formula (EPA/Play + Success Rate + CPOE + Air Yds/Rec) is "still tuning"; DAKOTA is a third-party all-in-one.** Do not bake either into the pipeline as canonical. The corpus's canonical QB efficiency unit is EPA/dropback (+ CPOE as the over-expected kernel with pre-registered bars).

**I. @joe307bad QB composite scores (Lawrence 100.00, Dart 94.62, C. Williams 91.40 …) — weak source, account not verified.** The 9-17 brief flags this itself. Exclude.

**J. Keenum/HOU logo misread in the GridironInfo_ dropback-outcome chart (both Keenum and Stroud on HOU).** In-file flag, noted not corrected. Any pipeline ingesting that chart needs a QB→team sanity join.

**K. Count discrepancy: map says 95 QB-BEHAVIOR briefs; verified partition is 70.** The other ~25 carry the tag only in the boilerplate header or state explicitly "no QB content" (e.g., 0435-wages-of-wins, 1351-volleyball, 1366-kelly, 1449, 1465). No action — but a downstream consumer counting on 95 will over-count.

**L. OpenSkill-vs-Elo and nfelo-vs-Elo baselines disagree on which simple rating to benchmark** (map contradiction #3). Out of the QB lane proper, but it touches the team-strength features the QB numbers roll up into — treat both as baselines, pick by walk-forward.

**M. "2026" early-season numbers throughout the X-sweep briefs are 1–3 game samples with no early-sample disclaimers** (the RaritosFootball note makes this explicit: "no explicit early-sample disclaimer"). Anything with n<30 dropbacks is a slate read, not a profile input — enforce the pipeline's 100-dropback minimum and add an n<30 flag on any dashboard surface.

---

## 4. Buildable systems — ranked for the QB behavioral engine

Ranked by (measured gain or unique data) × (input availability) × (fit to the existing pipeline).

### #1 — Per-QB rolling EPA/dropback (16-game window, trade-following, anti-leakage availability weight)
- **Computes:** `qb_form_epa` = rolling 16-game EPA/dropback keyed by `passer_player_id` (follows trades/takeovers); `availability_weight` = prior-games snap share computed from weeks STRICTLY before the current week (anti-leakage rule, with the `test_snap_share_excludes_the_current_week` test as the acceptance criterion).
- **Input:** nflverse pbp (already in pipeline) + snap counts (nflverse or roster participation).
- **Measured gain:** log loss 0.633→0.625, AUC 0.690→0.700, walk-forward 3,816 games 2012–2025, 65.2% acc, Brier 0.216 — the single largest measured gain of any build in the partition. MIT repo: github.com/TreMatt03/nfl-game-predictor (code liftable with attribution).
- **Refs:** handoff-indie-builders-v2-fullspec-2026-09-25 (BUILD 1); 0495 (40/30/20/10 recency as the alternative form model to beat).
- **Pipeline change:** EXTEND — new module `code/rolling_form.py` writing `qb_rolling_form.parquet`; consumed by both the engine and gen_profiles (add a "Form" section). Does not touch the per-season grain.

### #2 — Pressure-to-sack QB trait with empirical-Bayes shrinkage
- **Computes:** per-QB `p2s = sacks / pressured_dropbacks`, shrunk toward the ~18% league baseline (80/40-style shrinkage or EB; flag n<30); <2.5s quick-pressure split separates coverage sacks from true rush wins; YoY delta tracked.
- **Input:** SumerSports free pressure-to-sack data (cheapest signal per the X dossier) OR FTN charting (`n_blitzers`, `n_pass_rushers`, `is_qb_fault_sack` — rights-cleared, 2022–2025, no production caller).
- **Refs:** sweep-2026-09-21; our-metric-stack (veto context); 2026-09-24 full-tables (Purdy 0/15, Daniels 1/24); signal-wiring-catalog; nfl-analytics-x-dossier.
- **Pipeline change:** NEW module `code/pressure_trait.py` + new profile section. Note the pipeline's current `qb_hit` proxy is outcome-based and cannot do this — external pressure data is required. Challenge A applies: raw rates never published, only shrunk.

### #3 — Receiver-absence conditional trust targets (Pitts/London template, generalized)
- **Computes:** for every (QB, receiver) pair, recompute HHI/top-1/top-2/TPRR with that receiver's games IN vs OUT (presence from participation/snap data). Output: `trust_delta_absent[qb][receiver]` — who the ball funnels to when WR1 sits.
- **Input:** nflverse pbp + participation (already in pipeline).
- **Refs:** 2026-09-25 full-tables (Pitts 0.18→0.28 TPRR / 8.0→19.0 FPG); CARDS_INCENTIVE IC4 (per-state usage re-fit machinery: `regimeShift(career, sample)`, `aggregateGameLog`).
- **Pipeline change:** EXTEND — conditional pass inside `target_stats()`; new columns `abs_top1_share`, `abs_hhi_delta` etc. Challenge C applies: report n alongside every delta.

### #4 — TWP-based INT projection per QB
- **Computes:** per-QB turnover-worthy-play rate (target) instead of raw INT rate; `expected_int = TWP_rate × 52.3%` blended with the 1.867%/dropback prior; keep the existing quarter/script/hit-clean splits, re-fit with TWP.
- **Input:** FTN `is_interception_worthy` joined on (game_id, play_id) — 100% coverage for 2025 per the metric bible.
- **Refs:** our-metric-stack; AGENTS-history (INT-luck ledger); signal-wiring-catalog.
- **Pipeline change:** EXTEND — new columns in the INT splits section; the hit/clean split becomes hit/clean × TWP. This replaces raw INT rate as the profile's INT number.

### #5 — First-read share + TPRR ingestion (FTN wiring)
- **Computes:** per-QB first-read target share (Purdy 27.0% distributor vs Love 78.6% one-read archetypes) and per-QB→receiver TPRR (targets/routes), plus the trust-target trinity with air-yard share.
- **Input:** FTN 2022–2025 charting (`read_thrown`, routes) — the S6 gap: rights cleared, no production caller. Until wired, statrankings.com 1st-Read-% is the intake candidate (paywalled; catalogued in the 9-17 README).
- **Refs:** qb-phase2; advanced-matchups (Jefferson 52.9% first-read, JSN 45.8% share); 2026-09-29 full-tables (Week 3 top-25 first-read target share); signal-wiring-catalog.
- **Pipeline change:** NEW module `code/first_read_tprr.py`; new profile section. This is the single biggest missing behavioral dimension in the current pipeline (the recipe's #1 feature family).

### #6 — Dropback-outcome split per QB (complete/incomplete/scramble/sack/INT %)
- **Computes:** per-QB outcome distribution over dropbacks (the GridironInfo_ table, min 15 dropbacks), enabling scramble-vs-sack-vs-throwaway decision profiles and the Keenum control-case style backup analysis.
- **Input:** nflverse pbp (dropback convention already in pipeline: sacks count as attempts, scrambles as dropbacks).
- **Refs:** 2026-09-29 full-tables; qb-phase2 (scramble ladder).
- **Pipeline change:** EXTEND run-behavior section — outcome shares are computable today; Challenge J applies (QB→team sanity join).

### #7 — Scramble-vs-designed EPA decomposition under pressure
- **Computes:** EPA split four ways: scramble vs designed rush, each × blitzed vs not; plus QB-sneak conversion rate and heavy-blitz scramble production (the Allen 5-for-49+TD template).
- **Input:** nflverse pbp + FTN `n_blitzers` (or pbp-derived pressure proxy as floor).
- **Refs:** qb-phase2; post-inventory (Allen vs 55.3% blitz; Williams 20+ mph); AGENTS-history (Allen +2.4 rush EPA/gm since '99).
- **Pipeline change:** EXTEND run-behavior — add EPA columns per run type and a blitz-conditional sub-table. Respects the competitive-intel ruling: behavioral decomposition for props/fantasy, not a new team-strength family.

### #8 — aDOT / air-yard-share / deep-rate profile (public aggressiveness proxy)
- **Computes:** per-QB aDOT, air-yard share, deep-throw rate (10+ air yards), 0–5-yard throw share (the Mahomes 70.4% / Willis 13.6 aDOT ladder), EPA/att on 10+ air-yard throws.
- **Input:** nflverse `air_yards` (already available; not currently in the pipeline).
- **Refs:** qb-phase2 (aggressiveness ladder); 2026-09-24 full-tables (Hurts +1.50 EPA/att deep; NGS aggressiveness definition = 1-yard defender proximity — the public proxy substitutes depth profile for it).
- **Pipeline change:** EXTEND — new metrics in compute_metrics.py; pure nflverse, no external dependency. Note the NGS-true aggressiveness number is internal-only/learning-only per doctrine — this is the public, publishable proxy.

### #9 — Receiver-conditional TD model (prop engine)
- **Computes:** P(TD) = Σ_t P(TD|target=t)·P(target=t): a target-distribution model (from the S2 trust map + matchup features) marginalized with a conditional TD model given the target. Train conditional on ground-truth target; marginalize at inference.
- **Input:** nflverse pbp (targets, TDs) + trust-target features.
- **Refs:** tacticai-0912 (paper: F1 0.521→0.677); advanced-matchups (RZ receiving leaders: RZ_TGT, RZ_SHARE, FINISH %, RZ_TD — the conditional-model features); 2026-09-29 full-tables (goal-line rush-share monopolies as the run-side prior).
- **Pipeline change:** NEW — lives in the prop engine, consumes the QB profile's trust map. Gate: beat a tabular baseline on held-out log-loss (paired bootstrap); the brief's ≥5% is reader-proposed, not a paper result (Challenge F).

### #10 — QB Burden Index context features
- **Computes:** per-QB-game context load: pressure faced, throw depth, down-distance friction, weather/context penalty, line disruption — reported SEPARATELY from quality (burden ≠ quality).
- **Input:** nflverse pbp (pressure proxy, depth, down/distance) + weather (wave4b-weather2.jsonl exists in the signal catalog).
- **Refs:** SUNDAY_FRONTIER_MAXFORCE_AUDIT (QBI drivers; SHADOW, weights unpublished); IC8 (body-clock/weather bind machinery).
- **Pipeline change:** EXTEND — new "Context burden" profile section; driver list is real, weights must be learned (do not copy unpublished SHADOW weights — they don't exist in the doc).

### #11 — QB familiarity + availability features
- **Computes:** `qb_familiarity` = share of last 16 starts by the listed starter; snap-share availability weight (shared with #1's anti-leakage rule); backup-QB flag with the Keenum control case as the template (backups get full profiles, per the map's gap #8).
- **Input:** nflverse rosters/starts + snap counts.
- **Refs:** handoff-indie-builders (BUILD 2: QB familiarity); qb-behavioral-profiles README (Keenum control case; 8 starters only).
- **Pipeline change:** EXTEND — cheap features; extend TARGETS to all 100-dropback QBs (the pipeline already computes everyone; only gen_profiles is limited to 8).

### #12 — Recency/stability governance for every behavioral rate
- **Computes:** D/S/I audit (discrimination/stability/information; flag D<0.5 or I<0.2 for shrinkage) + Minerva Seal ≥80 gate + regime-stability check across season phases before any mined tendency enters production; recency model comparison (16-game rolling vs H=6 half-life vs HB 83%-prior fade vs Marcel 40/30/20/10) by walk-forward.
- **Input:** the pipeline's own parquet outputs.
- **Refs:** 1184 (D/S/I); 2048 (Minerva); 0495 (dual-metric gate: predictive GMP + simulated added wins — a feature with log-loss gain but zero decision-WPA gain is deprioritized); half-life memo; AGENTS-history (stabilization schemes).
- **Pipeline change:** NEW — `code/metric_audit.py` run as a gate before gen_profiles publish. This is the answer to Garrett's 17:34 audit challenge for this lane: every profile number ships with its n, its stability grade, and its recency model.

### Not built (queued with reason)
- **Decision IQ / Execution+ / Coverage VACC** (1540): needs NGS tracking; NGS is internal-only per the 2026-09-28 doctrine and the wiring path is unbuilt (map gap #1). Queued behind the NGS lane.
- **Regime-switching HMM for QB form** (1655): modeling upgrade; build #1 first, then test whether latent form states add decision-WPA over the rolling window (0495's gate).
- **Pre-snap GATv2 graph** (0912 proposal 2): speculative; needs its own held-out proof (Challenge F).
- **Man/zone and blitz/no-blitz EPA splits per QB:** nflverse pbp doesn't carry coverage charting — the pipeline's own README already queues this for NGS/charting data (map gap #1).
- **QB-specific uncertainty bands:** explicitly SUPPRESSED (memo #15) — the profile displays the positional prior and labels it as such.

---

*Partition complete: 70/70 briefs read. 21 verified-claim rows (14 source-checked against `~/workspace/vendor/Sports/docs/`). 13 challenges. 12 buildable systems (+5 queued-with-reason).*
