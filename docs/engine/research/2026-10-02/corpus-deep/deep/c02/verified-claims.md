# c02 Deep Research — Verified Claims

**Coordinator:** c02 Phase 2+ (session cbb07087)
**Date:** 2026-10-02
**Method:** 6 specialist analysts verified phase-1 map findings against primary sources. Every claim below carries its source file:line and a confidence rating. Items marked INFERENCE are analyst judgment, not source text.
**Analyst reports:** `work/a01-pressure-indices.md` · `work/a02-ngs-ttt.md` · `work/a03-int-model.md` · `work/a04-completion-model.md` · `work/a05-trust-target.md` · `work/a06-int-situational.md`

---

## 1. INT modeling (analyst a03 — source: `docs/props/research/2026-09-17/props-consensus/projection_methods.md`, 282 lines, read completely)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| INT-1 | INT recipe: `E[INT_game] = expected_dropbacks × (interception-worthy throws / dropbacks) × 0.523` (league worthy→INT conversion). Worked: Allen 27.0 × 3.66% × 0.523 = 0.5; Goff 34.2 × 1.44% × 0.523 = 0.3. | L178-183 | HIGH — arithmetic checks |
| INT-2 | 52.3% conversion is a single league-wide constant: stated once, no denominator, no n, no sample definition, no situational split. | L180 | HIGH |
| INT-3 | The doc contains **zero** INT-by-situation splits (no pressure/quarter/score/field/down splits for INT or worthy rates — grep-verified absence). | full-file grep | HIGH |
| INT-4 | Sack-prop veto is explicit and literature-backed: pressure-to-sack conversion R² < 0.005; "no sack projection for any player." The veto kills sack *prediction*, not pressure as an *evaluative* feature — the doc treats pressure as "real, sticky" and uses Goff's 18.9% hit rate as downside risk. | L190-197, L244, §8 | HIGH |
| INT-5 | Garbage-time volume ratios measured 1.025–1.195 (min Allen att 1.025, max LaPorta targets 1.195). Garbage = `qtr==4 AND (wp>0.95 OR wp<0.05)`; OT kept. | L61-75, L29-30 | HIGH |
| INT-6 | WP-bucket dropback rates measured: BUF leading 50.0% (n=328) / neutral 57.2% / trailing 61.8% / season 56.3%; DET 54.2% (n=284) / 57.1% / 68.2% / 59.5%. | L94-97 | HIGH |
| INT-7 | Scramble composition measured descriptively only (Allen: 45 of 89 rushes were scrambles, 387 of 543 rush yards = 71%). No situational scramble model. | L198-201 | HIGH |
| INT-8 | Throwaway treatment: NOT addressed (zero mentions, grep-verified). | full-file grep | HIGH |
| INT-9 | Aggressiveness %: NOT addressed (zero mentions, grep-verified). | full-file grep | HIGH |
| INT-10 | Doc's own caveats: "single-game INTs are noise" (L185); "INT projections rest on FTN charting (2025 only) and a league-average conversion" (L266-267). | L185, L266-267 | HIGH |
| INT-11 | `qb_hit` is a lower-bound pressure proxy: "hurries invisible" (L195-196); "`qb_hit` undercounts true pressure (no hurries); sack/hit proxies are floors" (L264-265). Structural blind spot of nflverse-only pressure work. | L195-196, L264-265 | HIGH |
| INT-12 | Veto list (all verified): no longest-reception props; no props without projectable sample (Vaki rule); no INT prop priced off actual INT counts (use worthy rate); no blending current-season efficiency into rates (100% prior-season / 0% current); no opponent-adjusted numbers without data; no reporting filtered-sample means as full-game expectations. | §9 | HIGH |

## 2. Completion probability / CPOE (analyst a04 — source: arXiv:2109.08051 ledger + primary paper via ar5iv, 985 lines)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| COMP-1 | Two-stage architecture: empirical target-ID (86.92% accuracy) → conditional completion P(C\|T=i) via RF. Marginal P(C) = Σ_i P(C\|T=i)·P(T=i). | paper Eqs. 1–15 | HIGH |
| COMP-2 | RF AUC 0.8829 (10-fold leave-group-out CV, plays as groups; mtry=15); baselines: logit 0.7874, probit 0.7861, LDA 0.7840. | paper Table 2 | HIGH |
| COMP-3 | Calibration Pearson 0.998 / Lin's concordance 0.998 — **conditional P(C\|T=i) per frame vs completion % only**. Marginal P(C) per frame: 0.978/0.958. Per-play averages strictly worse. | paper Table 5 | HIGH — with the conditional qualifier |
| COMP-4 | 95.8% accuracy at 0.5 threshold is **training-set** and misleading (base rate ~65%); AUC is the honest metric. | paper L688-689 | HIGH |
| COMP-5 | Authors' exact skill-gap quote: "possibly utilize information not available on the data to create variables to differentiate specific players based on their historical performance on the NFL and college football." | paper Discussion | HIGH |
| COMP-6 | Feature inventory: 32 features; 12 pbp-usable (quarter, down, ydstogo, game_seconds_remaining, yardline_100, scores, home, target position group + partials); **20 tracking-only** (all 16 frame features, dropback type, passer-to-target distance, defender positions). The 16 frame features are the actual engine of the 0.88 AUC — none ports to pbp. | paper L374-514 | HIGH |
| COMP-7 | Portable kernel: the probability identity (Eq. 15); the validation discipline (grouped CV, AUC primary, debiased ECE ≤ 0.05, calibration slope [0.9, 1.1]); a *rebuilt* play-level pbp model expected in AUC ~0.70–0.78 band, NOT 0.88. | analyst INFERENCE on the band | HIGH on discipline; MEDIUM on the band (INFERENCE) |
| COMP-8 | Baseline to beat is **nflfastR's `cp`**, not the paper's RF. Do NOT train on `cp`/`cpoe` as targets (NGS internal-only doctrine). | analyst + doctrine | HIGH |
| COMP-9 | The paper contains **zero** target-selection modeling (who the QB throws to). Target choice is entirely absent. | paper (verified absence) | HIGH |
| COMP-10 | Skill-prior recipe (analyst-specified, buildable): hierarchical logistic `logit P(complete) = Xβ + u_receiver`, `u ~ N(0,σ²)`, EB-shrunk per-receiver intercepts (min-targets guard, rookies get u=0); defense-team random effect + PFR advstats Tier-2 CB prior; independent QB_CPOE = complete_pass − E[complete\|situation, receiver, coverage], EB-shrunk per QB. | analyst design | MEDIUM — design, not source-verified |

## 3. NGS time-to-throw / naming contract (analyst a02 — source: `docs/data-sources/research/2026-09-18/2026-09-18-ngs-replacement-spec.md`, 126 lines)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| NGS-1 | Stafford (LAR) 2025 REG: 9.1 avg intended air yards, **2.799s** TTT; Maye (NE): 9.1 air yards, **2.97s** TTT. Pinned to the decimal in the test fixture; "verified live against the source to the decimal on 2026-07-03." | spec L66-69; fixture | HIGH |
| NGS-2 | Heuristic "intermediate 4.0s" is 35–43% above measured (4.0/2.799−1=42.9%; 4.0/2.970−1=34.7%). Arithmetic exact. | spec L69 | HIGH — conditional on the 4.0s constant being as stated (source module not found in-repo, see challenges) |
| NGS-3 | Naming contract (hard rules): `coverage_exposure_*` never `per_defender_*`; `time_to_throw_*` never pressure; matchup = receiver-vs-defense differential, never an assignment. "Time to THROW is not time to PRESSURE." | spec L38-44, L52-54 | HIGH — verbatim |
| NGS-4 | Governing rule: "A measurement is a number produced by observing the world. A heuristic constant is a number produced by someone's judgement. Substituting the second for the first while keeping the first's name is how a track record stops meaning anything." | spec L88-97 | HIGH — verbatim |
| NGS-5 | NextGenStat grain is player-week, never per-play. Per-play kinematics are NFL enterprise-only. | spec L12-20, L101-103 | HIGH |
| NGS-6 | Field computability from nflverse pbp: 8 of 20 fields computable (avgYac, catchPct, air-yard share, intended/completed air yards, air-yards-to-sticks, cpoe with `_nflverse_pbp` suffix caveat, xComp identity, completion%). **Strictly NGS-only: `avgTimeToThrow`, `aggressiveness`, `avgCushion`, `avgSeparation`, `avgExpectedYac`, `rushYardsOverExpected*`, `avgTimeToLos`.** | analyst inventory | HIGH |
| NGS-7 | nflverse pbp `cpoe` ≠ NGS CPOE (different estimators). Any pbp-derived stand-in carries `_pbp`/`_proxy` suffix — never the NGS name. | analyst + governing rule | HIGH |
| NGS-8 | TTT has no honest pbp proxy — emit NULL, never a proxy. `aggressiveness_proxy_deep_rate = P(air_yards ≥ 20)` is the observable correlate; label as proxy. `pressure_floor_rate = (sacks + qb_hits)/dropbacks` — explicit FLOOR, hurries absent. | analyst buildable spec | HIGH |
| NGS-9 | Rights blocker, exact quote: "`nextgen_stats` via nflverse is flagged ... as 'equally third-party-sourced with no explicit grant, not a safe substitute'." Live founder question: may anything built on the nflverse NGS feed be served to customers — or even used in internal modeling? | spec L113-117 | HIGH — verbatim |
| NGS-10 | Small-sample honesty: `conformal-calibration.ts:174` returns +∞ below minN 20 rather than clamping (correct); `cqr.ts:12-15` clamps and is a known defect. Rule: small-sample intervals refuse rather than pretend. | spec L120-126 | MEDIUM — code not re-read by analyst |

## 4. QB pressure indices (analyst a01 — source: `docs/models/qb-pressure-indices-proposal.md`, 68 lines, read completely)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| PRESS-1 | Index 1 formula (verbatim): `sensitivity = EPA/dropback (clean pockets) − EPA/dropback (pressured)`. Units EPA/dropback, season-to-date, REG only. "Higher = more pressure-fragile." | proposal L16, L19-20 | HIGH |
| PRESS-2 | Index 1 guards (verbatim): < 100 pressured dropbacks → NULL (never a guessed split); < 95% FTN join coverage → NULL ("a partial join is a silent bias"). | proposal L23-25 | HIGH as stated; guards unjustified (no derivation in file) |
| PRESS-3 | Index 2 formula (verbatim): `stress = pressure_rate_allowed − league_expected_rate(blitz_rate_faced)`; expectation = season-to-date league OLS regression of pressure rate on blitz rate, refit weekly. Positive = line loses one-on-ones beyond blitz exposure. | proposal L41, L44-47 | HIGH |
| PRESS-4 | Index 2 guards: < 3 team games → NULL; league fit pool < 32 team-weeks → NULL for all teams (early-season null). | proposal L49-50 | HIGH as stated; 32-point floor for a 2-param OLS is a bare minimum, no fit-quality gate |
| PRESS-5 | Index 2 usage bar: "No pick-engine input in v1 — display + analyst use only until calibration says otherwise." | proposal L57-60 | HIGH |
| PRESS-6 | File's own stated weaknesses: FTN pressure is subjective at margins; sensitivity conflates QB and line ("a QB pressured instantly has no clean baseline"); EPA inherits opponent strength, no opponent adjustment in v1; blitz count ≠ rusher quality. | proposal L28-31, L52-53 | HIGH |
| PRESS-7 | **The nflverse FTN charting release contains NO per-play pressure field.** Official 29-column dictionary (nflreadr, read 2026-10-02): ids, `is_interception_worthy`, `is_throw_away`, `read_thrown`, `is_catchable_ball`, `is_contested_ball`, `is_created_reception`, `is_drop`, `is_qb_sneak`, `is_qb_out_of_pocket`, `n_blitzers`, `n_pass_rushers`, `is_qb_fault_sack`, flags — no `is_pressure`/hurry field. | nflverse FTN dictionary (official) | HIGH |
| PRESS-8 | Index 1 is therefore **unbuildable from nflverse as specified** — not in pbp (only `qb_hit`), not in the FTN release, and `pbp_participation.was_pressure` is post-season-only. Charting from outside nflverse is mandatory; the file's "No new sources" (L7) conflicts with Index 1. | analyst verification | HIGH |
| PRESS-9 | The phase-1 `qb_hit`-over-dropbacks construction (team-week, REG, min-30 gate) **violates the spec** in letter (mandated FTN split + join guard) and substance (hit ⊂ pressure; hurries misclassified as clean → attenuation bias; wrong grain). If kept anywhere it must be named `hit_rate_proxy`, never `sensitivity`. | analyst assessment vs proposal | HIGH |
| PRESS-10 | **Index 2 (Protection Stress) IS buildable from nflverse today**: `pfr_advstats` weekly pass rows carry `times_pressured`, `times_blitzed`, `times_hurried`, `times_hit`, `times_pressured_pct` at (game, team, player) grain, 2018+. Three PFR definitions to confirm before wiring: pressure dedup rule, blitz definition, rate denominator. | nflverse docs (example output read 2026-10-02) | HIGH on columns; MEDIUM on definitions (unverified glossary) |
| PRESS-11 | nflverse FTN charting covers **2022+ only** (~48k plays/season), charted within ~48h of each game — a season-to-date index built on it lags reality up to 2 days. | nflreadr docs | HIGH |
| PRESS-12 | The proposal's data premise ("datasets already in the ingestion registry", `pfr_advstats` "live in `lib/nflverse/pressure-coverage.ts`", L5-7) is **unverifiable in this checkout**: no `lib/nflverse/` dir, no `pressure-coverage.ts`, no ingestion-registry artifact, zero `pfr_advstats` references under `lib/` or `docs/data-sources/`. | repo-wide grep | HIGH |
| PRESS-13 | QB-quality confounding of sensitivity is real and unaddressed: bad QBs face more pressure AND degrade more under it (level + exposure + behavioral self-selection channels); the spec's stated weakness covers line-contamination of the clean baseline, not the cross-QB confound. The 100-pressured-dropback guard additionally overselects QBs in bad situations. | analyst (INFERENCE) | MEDIUM — mechanism argued, not measured |
| PRESS-14 | With σ(EPA/dropback) ≈ 0.7–1.0, the SE of the clean−pressured difference at n_pressured=100, n_clean≈300 is ≈ 0.08–0.12 EPA — large relative to plausible sensitivity values (~0.3–0.5). The 100-guard is defensible direction, arbitrary value, no power analysis in file. | analyst arithmetic (INFERENCE) | MEDIUM |

## 5. Trust-target dynamics (analyst a05 — sweep of all 300 briefs + wiring backlog `docs/ops/wiring-backlog-2026-10-01.md`)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| TRUST-1 | **Zero HHI-in-football-sense hits** across all 300 briefs (case-insensitive grep). HHI exists in the corpus only in a DFS-optimizer context, never as a target-concentration metric. | 300-brief grep | HIGH |
| TRUST-2 | PRFFBall WR triple (attributed third-party, @FantasyPtsData): 25+ first-read targets AND 35%+ air-yard share AND 0.25+ TPRR → 64% hit WR1 (16/25), 84.2% top-24, 92% top-36 since 2021 (n=25). First-read leaders by week (2026): W1 Wilson 68.5%, W2 Evans 83.3%, W3 Pittman 73.3%, W4 Jeudy 66.7%; W1–4 leaders 67.6–73.9% all finished top-24. | `docs/dfs/research/2026-09-30/full-tables/README.md:12` | HIGH as an attributed claim; MEDIUM as a predictive fact (third-party, not recomputed in corpus) |
| TRUST-3 | Triple is **not wired** (wiring-backlog item 31: "not yet in any pipeline or model"); its definitions (first-read, air-yard share, TPRR) are not in the corpus; n=25 is a small denominator; nested conditioning (16/25 → 16/19) changes the headline. | wiring backlog; analyst | HIGH |
| TRUST-4 | Read-progression W1 2026 (third-party chart, one week): Love 78.6%, Stroud 62.2%, Rodgers 60.5%, Wentz 50%, Williams 39.5% first-read. Single-week, n≈28–42 reads/QB. | `docs/nfl/.../2026-09-17` (a05 report) | MEDIUM — third-party, one week |
| TRUST-5 | Receiver-side coverage splits exist with no QB-side complement: JSN 35% TPRR / 4.07 YPRR vs 2-high, 17%/2.16 vs single-high; Sutton 34%/2.76 vs single-high, 21%/1.52 vs 2-high; McConkey 22.9% TPRR vs 2-high, 19.6% vs single-high (W2–3, third-party). | a05 report | MEDIUM |
| TRUST-6 | No concentration-under-pressure, no first-read time series, no target-share predictive model, no in-game aggressiveness-by-game-state series anywhere in c02. | 300-brief sweep | HIGH |
| TRUST-7 | Computable from pbp today: HHI, N_eff=1/HHI, top_share, top2_share per QB×week×situation (all/rz/3rd/2min/trailing/pressure_proxy/quick_throw_proxy); target-share volatility (4-week CV of top_share); air-yard share of top target; T≥25 denominator guard; bootstrap HHI CIs. | analyst design | MEDIUM — design |
| TRUST-8 | `charted` vs `pbp_proxy` naming boundary: FTN `read_thrown` (2022+) can VALIDATE a pbp first-read proxy (short/medium/deep band, T≥25) but never be averaged into it; engine features stay pbp-native. | analyst + naming contract | HIGH on the rule; MEDIUM on the proxy |
| TRUST-9 | Validation gates: (1) reproduce Dynatyze's 21% median WR1 share ±2pp from raw pbp; (2) backtest the triple's ordering on 2021–2025 pre-registered; (3) week-to-week autocorrelation of hhi/top_share (persistence gate); (4) point-in-time week boundaries (KONTOGRAPH anti-leakage). | analyst design | MEDIUM — design |
| TRUST-10 | FTN `read_thrown` (which read the QB threw on) is a direct first-read measurement available 2022+ in the local FTN parquets — upgrades the first-read leg from proxy to measurement in the display lane. Coordinator-verified column inventory, not from a05. | local `ftn_charting_*.parquet` | HIGH |

## 6. INT-by-situation evidence (analyst a06 — sweep of all 300 briefs)

| ID | Claim | Source | Confidence |
|---|---|---|---|
| SIT-1 | **No measured INT-rate-by-situation numbers exist anywhere in c02** — no INT × pressure/quarter/score/field/down table was ever computed. Must be computed fresh from nflverse pbp. | 300-brief sweep (grep-verified absence) | HIGH |
| SIT-2 | FTN charting rights are a HARD gate: `resolveFeatureRights` pins FTN-derived columns (incl. interception-worthy rate) as `modelEligible: false` — **display/research only, permanently, under the L7 share-alike model-ineligibility.** Never enters served engine features. | `docs/architecture/2026-09-18-signal-architecture.md:680, 1564, 1602` | HIGH |
| SIT-3 | INT occurrence is weakly repeatable QB skill; recovery is near-pure noise — purge recovery luck by regressing realized INT counts toward the 46.3% league recovery mean; model occurrence only. | `docs/models/.../projection_methods.md` (a06 §EVIDENCE-2) | MEDIUM-HIGH |
| SIT-4 | Complementary football verified: a takeaway is worth **+0.6–1.0 points per drive** and **+21 yards** field position; median post-turnover starting position is the **own 41**. | arXiv paper 0678 (ordinal regression), L27-28 | HIGH |
| SIT-5 | EB shrinkage recipe (corpus precedent, c02-r36 denoised-rate auditor): `cell = (w + M·p̂_parent)/(n + M)`, M=25, ladder league → team → QB; null floors n<30 (auto back-off); 3-season pooling with regime-change resets; per-QB pressure splits below 100 pressured dropbacks get no INT-rate estimate. | c02-r36 brief | HIGH as precedent; MEDIUM as chosen constants |
| SIT-6 | Engine-eligible cells from nflverse pbp: INT × (qtr, score buckets, yardline_100 thirds + RZ≤20, down/distance buckets, `pressure_floor = qb_hit|sack` labeled floor). Blitz splits are rights-gated (nflverse has no blitz column; FTN `n_blitzers` is display-only; engine blitz needs founder decision). | analyst design | HIGH on the column inventory; MEDIUM on cell design |
| SIT-7 | Blitz splits (`n_blitzers` from FTN) are display-only in the analyst lane; the same `resolveFeatureRights` unit tests that pin worthy-rate also pin them. | signal-architecture doc (a06) | HIGH |
| SIT-8 | Coordinator-computed check (2026-10-01): Rodgers INT% vs TTT bands from game logs — U-shaped (2.26s: 0.6%; 2.51–2.75s: 0.0%; 2.76–3.00s: 1.7%) — suggestive only, game-log TTT is not NGS TTT. | coordinator (a06 report) | LOW — anecdotal |
| SIT-9 | The a03 worthy-rate × 52.3% formula is **props/analyst lane only** (T2 data); the engine lane uses actual `interception` occurrence from nflverse pbp (T1). Both lanes were conflated in phase-1; the rights architecture separates them. | coordinator synthesis (a06 + a03) | HIGH |

---

## Local data assets verified during deep research (coordinator)

| Asset | Location | Contents | Relevance |
|---|---|---|---|
| FTN charting 2022–2025 | `~/workspace/gse-discovery/ftn_charting_{2022..2025}.parquet` | 29 cols, 47,316 rows (2025); join keys `nflverse_game_id`/`nflverse_play_id`; `is_interception_worthy`, `is_throw_away`, `read_thrown`, `n_blitzers`, `n_pass_rushers`, `is_qb_out_of_pocket`, `is_contested_ball`, `is_catchable_ball`, `is_drop`, `is_created_reception`, `qb_location`, `is_motion`, `is_play_action`, `is_screen_pass`, `is_rpo` | INT recipe input (worthy rate); throwaway handling; first-read proxy (`read_thrown`); pressure context (`n_blitzers`); scheme flags |
| nflverse pbp 2010–2026 | `~/workspace/qb-behavioral-profiles/data/pbp_{2010..2026}.parquet` | 372 cols; `qb_hit`, `sack`, `qb_scramble`, `interception`, `air_yards`, `epa`, `cpoe`, `pass_attempt`, `qb_dropback`, `yardline_100`, `down`, `ydstogo`, `qtr`, `score_differential`, player IDs | All situational-split computation |
| Phase-1 QB metrics | `~/workspace/qb-behavioral-profiles/data/qb_season_metrics.parquet` | Per-QB-season HHI, trust shares (3rd/rz), INT splits (qtr/script/hit), scramble rate, EPA splits | Baseline the module extends (import, don't duplicate) |
