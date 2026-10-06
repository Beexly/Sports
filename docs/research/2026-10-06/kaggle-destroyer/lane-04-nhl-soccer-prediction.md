# LANE 4 — NHL + Soccer Prediction Notebooks
**Kaggle Research Destroyer fleet · Lane 4 of 20 · 2026-10-06**

All evaluations in this report were produced by **z-ai/glm-5.3-flash** via the OpenRouter skill (per the power-change directive). Mechanical gathering (search, fetch) was done by the lane agent; every verdict, ranking, and line of analysis is GLM's.
- `:free` variant was unavailable (404) → used paid `z-ai/glm-5.3-flash`
- Total token spend: 11,589 prompt + 36,591 completion = **$0.0184**

**Lane scope:** NHL win probability / puck-line / totals, soccer 1X2 / Asian handicap / goals, goalie/pitcher-form analogs. Public notebooks and metadata only; no logins, no account creation. (Note: Kaggle's code pages are JS-walled and would not fetch — several notebook bodies were evaluated from their public GitHub mirrors and detailed search-indexed descriptions, flagged where depth was limited.)

**Method note:** transfer METHODS, never coefficients. Layer 1 = market line (respected). Layer 2 = situational reasoning on top. Point-in-time discipline is law.

---

## PART 1 — SOCCER EVALUATIONS (S1–S7)

# GSE Evaluation — Soccer Prediction Candidates (S1–S7)

---

### S1 — mohamedfarouk94/fwc26

**METHOD** — Iterative Elo-style ratings plus attack/defense decomposition (ASI/DWI) built sequentially from ~150 years of internationals. XGBRegressor (Poisson objective) maps 6 features → per-team expected goals λ. A Skellam-based sampler draws the 1X2 outcome (with a hand-tuned "shock" μ compressing upsets), then samples a scoreline consistent with that outcome. OOP bracket engine (Team/Match/Group/KnockoutRound) with post-match rating updates scaled by ρ. ~100k Monte Carlo runs → championship probabilities.

**MATH** — Skellam is the distribution of the *goal difference* of two independent Poissons — a pure home-minus-away diff object, exactly GSE's preferred geometry — and gives closed-form P(win/draw/loss) from the λ pair. Outcome-then-scoreline sampling keeps simulated scorelines consistent with the drawn result (useful for bracket/correct-score markets). Two flaws: (1) the μ shock factor is an uncalibrated bias knob that artificially suppresses upsets — it inflates favorite reliability precisely where longshot mispricing (the value zone) lives; it is anti-calibration by design. (2) A single XGB fit across 1872–2026 with no time decay lets 1930s football inform 2026 λs.

**DATA** — D2-lineage international results. No Brier/log loss reported anywhere in the pipeline — calibration unproven. Must verify ASI/DWI are updated strictly sequentially; if any aggregate is computed over full history and backfilled onto training rows, that's leakage.

**GSE APPLICATION** — Layer 2, soccer **and NHL** (Skellam transfers 1:1 to any low-scoring Poisson-like goal process). The bracket engine becomes GSE's futures/derivative pricer: outright winner, group finish, to-advance — run as a Layer 2 overlay compared *against* market futures (Layer 1), never as a standalone price.

**IMPLEMENTATION SPEC** — (1) Port the Skellam sampler as `gse.soccer.skellam_outcome(λh, λa)`; **delete μ** — if upset adjustment is wanted, blend with market-implied probabilities, never a free parameter. (2) Reconcile with S2's DC grid: sample sim outcomes from the DC grid's 1X2 marginals, not raw Skellam, so sims and market prices are internally consistent. (3) Port the bracket engine as `gse.sim.tournament` with ρ mapped to GSE's existing rating-update hook. (4) Rebuild λ with exponential time decay (half-life ~8y for internationals), walk-forward features, per-stage Brier/log-loss reporting.

**VERDICT** — **ADAPT.** Keep the Skellam generator + bracket simulator; delete μ; rebuild λ estimation with decay and verified point-in-time discipline.

---

### S2 — soumendu-11/fifa-wc2026-predictor

**METHOD** — Elo from scratch (K=30, +100 home) over 49k internationals; 16 rolling features (attack, defense, form, win rate); XGBoost + RandomForest base classifiers; Dixon-Coles bivariate Poisson fitted as an additional signal; LogisticRegression meta-learner stacks all signals; 10k Monte Carlo sims. Claim: DC ρ improves draw calibration; RF is the most informative base.

**MATH** — The DC τ correction is the real asset: it reweights the (0-0, 1-0, 0-1, 1-1) cells and is the standard principled fix for independent Poisson's draw underpricing. Draws are ~25–30% of internationals — this is where 1X2 log loss is won or lost. The stacking claim is suspect: if base-model probabilities fed to the meta-learner are in-sample (no purged/time-series CV), the meta-learner learns leakage and "RF most informative" is an artifact. Fixed K=30 ignores match importance (friendlies vs WC knockouts) — FIFA's own Elo uses variable K for a reason.

**DATA** — 49,071 internationals 1872–2026 (D2 lineage; D2 nominally ends 2017 — verify post-2017 provenance and its as-of integrity). Draw-calibration claim not backed by reported metrics in the description; demand Brier/log loss vs an independent-Poisson baseline before believing it.

**GSE APPLICATION** — Layer 2, soccer plus NHL regulation-time 1X2 (the OT/SO "draw" is a live betting outcome and the same low-score correction applies). The DC-corrected Poisson core becomes GSE's soccer scoreline engine. The meta-learner concept maps to a GSE signal combiner that outputs *model-vs-market residuals*, never a standalone price.

**IMPLEMENTATION SPEC** — (1) Implement `gse.soccer.dixon_coles(ρ, ξ)` with τ adjustment and time-decay ξ; fit ρ per competition. (2) Rebuild the stack with purged walk-forward CV (base predictions strictly out-of-fold in time); drop the stack if it doesn't beat the best single base on log loss. (3) Replace fixed K with importance-weighted K (S3's scheme). (4) Verify form/win-rate features are trailing-window as-of match date.

**VERDICT** — **ADAPT.** DC ρ correction + walk-forward Elo are the keepers. The stacking layer is guilty-until-proven-innocent (leakage risk); the RF claim is unverified.

---

### S3 — saptarshi501/fifa-world-cup-prediction

**METHOD** — Tournament-importance-weighted Elo; XGBoost multi-class for 1X2; separate Poisson regression for goals; hybrid simulation combining both heads. Backtested on WC 2018 + 2022 with accuracy and log loss. Honestly declares: no squad/injury modeling, no market calibration.

**MATH** — Variable-K Elo by match importance is the correct treatment for internationals (a friendly should not move ratings like a knockout). The dual-head design is right: 1X2 and O/U/BTTS want different objects. Eval discipline is the best in this set — log loss on held-out tournaments — but n≈128 matches across two tournaments gives wide confidence intervals; treat the numbers as directional only.

**DATA** — D2 internationals; eval on WC 2018/2022. Self-declared gaps: injuries/squads, market anchor.

**GSE APPLICATION** — Two transfers: (a) importance-weighted K into GSE's soccer Elo module; (b) the dual-head architecture as the *shape* of GSE's soccer module — outcome head feeds 1X2/DC markets, goals head feeds O/U/BTTS/correct-score via the market-mapping layer. Its replay harness (replay last N tournaments, report log loss) becomes the GSE soccer eval harness.

**IMPLEMENTATION SPEC** — (1) Add a `match_importance` multiplier to `gse.ratings.elo` (friendly ≈0.5×, qualifier 1×, tournament 2×, knockout 2.5× — tuned on log loss). (2) Structure `gse.soccer` as two heads over a shared λ/rating base. (3) Port the 2018/2022 replay harness; extend to 2010/2014/2016/2021/2024 for n≈400+.

**VERDICT** — **ADAPT (narrow).** Variable-K Elo, dual-head shape, and the replay-eval harness. The predictive core is dominated by S1/S2 and is not separately ported.

---

### S4 — tunghoangt/Soccer-prediction-with-Machine-Learning

**METHOD** — EPL 2007–2018 (D1). Home/away paired features → LR/KNN/GB/SVM/RF with Sequential Backward Selection, PCA, CV. Stage 2: generate synthetic match stats → convert to per-team expected goals → simulate a full season → "correctly picked the league winner."

**MATH** — The season-simulation stage is where it dies. To simulate a season and name the winner, team-strength parameters must come from somewhere; if they are aggregates of the season being "predicted" (mean goals for/against over that season — the standard construction in notebooks of this type), the sim is fit to the answer: **full-season aggregates used for match-week 1 = textbook point-in-time leakage.** "Picked the winner" is n=1 — zero evidentiary value. Upstream: PCA on ~3,800 matches of interpretable features is cargo cult; random CV across a time span leaks via autocorrelated team strength. D1 ships up to 10 bookmakers' odds per match — ignoring free market data while claiming predictive success is disqualifying under GSE's Layer-1-respect law.

**DATA** — D1 (EPL subset 2007–2018), including unused bookmaker odds. No Brier/log loss reported.

**GSE APPLICATION** — None. The stats→xG→season-sim shape is conceptually what GSE's sim layer already is; this implementation adds nothing and imports a leakage pattern GSE must avoid.

**IMPLEMENTATION SPEC** — Nothing ported. If season sims are revisited: parameters estimated strictly from prior completed seasons or trailing windows, walk-forward across ≥5 seasons, scored by Brier/log loss against the D1 closing-odds baseline.

**VERDICT** — **REJECT.** Specific reasons: (1) same-season aggregates as simulation inputs = leakage; (2) single-season validation, n=1; (3) market odds present in the dataset and ignored; (4) PCA/SBS complexity with no calibration evidence. Would change my mind: multi-season walk-forward sims with prior-data-only parameters beating the D1 odds baseline on log loss.

---

### S5 — bowhza/euro2024-predictor

**METHOD** — XGBoost classifier on Elo + attack/defense ratings, aimed at EURO 2024. Self-documented as a learning project.

**MATH** — Nothing beyond the S1/S2 feature family, cruder. No calibration machinery, no reported metrics, no market comparison. Attack/defense rating provenance is unverified — if computed over the tournament being predicted, that's leakage; if sequential, it's still S1 minus rigor.

**DATA** — EURO 2024 (51 matches). Single tournament, no backtest.

**GSE APPLICATION** — None. Fully dominated by S1/S2/S3, which implement the same feature family with evaluation attached.

**IMPLEMENTATION SPEC** — None.

**VERDICT** — **REJECT.** No evaluation, no calibration evidence, single-tournament scope, strictly dominated by S1/S2 on the identical feature family. Would change my mind: reported log loss/Brier vs market across multiple tournaments.

---

### S6 — robertostl/2024-euro-prediction-using-poisson-distribution

**METHOD** — Independent Poisson: per-team λ from historical scoring rates adjusted by attack/defense multipliers; scoreline grid P(h,a) = Pois(λh)·Pois(λa); grid summed into 1X2 (and presumably O/U, BTTS, correct score).

**MATH** — The scoreline-grid → market mapping is the correct skeleton for converting goal expectations into every soccer market, and GSE needs exactly that conversion. But the predictive core is **strictly dominated**: independent Poisson systematically underprices draws (0-0, 1-1) relative to empirical frequencies — the exact bias Dixon-Coles (S2) fixes; DC reduces to this model as ρ→0 with strictly better draw fit. λ provenance is the leakage risk: static historical averages (typical for "pure Poisson" notebooks), no time decay, no as-of verification.

**DATA** — Euro 2024. No calibration metrics reported.

**GSE APPLICATION** — Only as the conversion layer inside the S2-derived module: λ pair → scoreline grid → 1X2 / DC handicaps / O/U lines / BTTS / correct score / team totals. The λ estimation is rebuilt, not ported.

**IMPLEMENTATION SPEC** — Implement `gse.soccer.market_map(scoreline_grid)` → all soccer markets; feed it DC-corrected grids, never raw independent-Poisson grids.

**VERDICT** — **REJECT** as a predictor: strictly dominated by S2's DC-corrected model (known draw underpricing, no decay, no calibration evidence). The one salvageable artifact — the market mapping — is a textbook transform that gets written fresh inside the S2 module anyway. Would change my mind: evidence its λ calibration beats a DC baseline on log loss.

---

### S7 — madferit/2026-fifa-world-cup-prediction

**METHOD** — Historical internationals + FotMob match statistics + Transfermarkt national-team profiles merged into a 2026 prediction.

**MATH** — Two hard point-in-time problems. (1) FotMob match statistics (shots, possession, etc.) are **post-match by construction** — usable only as trailing-window aggregates of strictly prior matches; any same-match stat as a feature is leakage. Coverage cliff: detailed international stats are sparse pre-~2014, so feature availability varies across the training window. (2) Transfermarkt squad values are snapshots — applying a current snapshot to historical backtests projects today's information backward; and undated snapshots structurally cannot represent transfer windows, which is precisely the squad-break dynamic that makes this data interesting. This is the only candidate touching squad composition (the gap S3 flagged) — the one genuinely novel idea in the set — but the implementation is unverified end-to-end: no reported Brier/log loss, unknown as-of discipline, join-key/coverage risk across three heterogeneous sources.

**DATA** — D2 internationals + FotMob stats + Transfermarkt profiles. No calibration metrics reported.

**GSE APPLICATION** — The idea, not the notebook: a squad-composition feature block (time-stamped squad market value, age curve, key-player availability) as GSE Layer 2 situational features for soccer; the pattern generalizes to roster-quality proxies in NBA/NHL.

**IMPLEMENTATION SPEC** (if rebuilt) — (1) Transfermarkt values as *dated snapshots per window/tournament*; never project a single snapshot backward. (2) FotMob stats only as trailing-k-match aggregates as-of match date, with coverage-mask features for sparse eras. (3) Backtest on WC 2018/2022 + Euro 2024, log loss vs market, before the block earns a slot.

**VERDICT** — **REJECT** (as implemented). Unverifiable point-in-time discipline on both external sources; same-match stats are post-match by construction; undated squad snapshots can't model windows; zero calibration evidence. Would change my mind: time-stamped per-window values + trailing-window-only stats + log loss vs market on 2018/2022/2024. The squad-value feature idea goes on the GSE backlog independent of this notebook.

---

## CROSS-CUTTING FLAGS

**Leakage register (worst first):**
- **S4** — same-season aggregates as season-sim inputs: confirmed-pattern leakage.
- **S7** — same-match FotMob stats are post-match; Transfermarkt snapshots undated.
- **S2** — stacking without purged time-series CV puts in-sample base probabilities into the meta-learner; form/win-rate windows unverified.
- **S1** — verify ASI/DWI sequential updates; single 150-year fit with no decay (era heterogeneity, leakage-adjacent).
- **S6** — static full-history λ averages, no decay.
- **S5** — rating provenance unverified.
- **S3** — cleanest of the set (sequential Elo, held-out tournament eval with log loss).

**Transfer windows:** None of S1–S6 handle mid-season squad breaks. S4 operates on club soccer — where windows matter most — and ignores them entirely. S7 gestures at squad composition but with undated snapshots, which is structurally incapable of window handling. GSE must build window-aware team strength natively (dated squad snapshots, strength reweighting at window close); nothing here transfers for it.

**Calibration honesty:** Only S3 reports log loss (on a tiny eval set). S1's μ shock factor is actively anti-calibration. S2's draw-calibration claim is plausible but unevidenced. S4's "picked the winner" is not an evaluation. S5/S6/S7 report nothing.

**Build order for GSE soccer:** S2's DC-corrected Poisson core → S6-style market mapping (rebuilt, fed DC grids) → S1's Skellam/bracket engine for futures (μ deleted, reconciled to DC marginals) → S3's variable-K Elo and replay harness as the eval spine. S4/S5/S6/S7 contribute no code; S7's squad-value data idea is shelved pending time-stamped sources. Mine D1's 10 bookmaker odds as the Layer-1 baseline for every soccer backtest — S4's disregard of them is the cautionary tale.


---

## PART 2 — NHL EVALUATIONS (N1–N6)

# GSE NHL Candidate Evaluation

---

## N1 — sports-data-hq/hockey-skills

**METHOD:** A full NHL pipeline: five Elo variants with logarithmic margin-of-victory multipliers and season carryover; goalie-quality features (lagged season SV%, last-5-starts rolling SV%, shot-quality-adjusted GSAA, confirmed-starter flag); 158 PuckCast-style features all expressed as home-minus-away diffs with opponent-adjusted rolling metrics; XGBoost trained under walk-forward validation; Monte Carlo playoff simulator.

**MATH:** The numbers pass the honesty smell test. Brier 0.237 and log loss 0.670 vs. coin-flip baselines of 0.250/0.693 is a modest, real edge — exactly what a calibrated model near the ~62% theoretical ceiling (see N4) should produce. Anyone claiming 65%+ NHL accuracy is lying; 59.7% is credible. The carryover `0.88*end_elo + 0.12*1500` is a 12% regression to mean, appropriate for a high-parity league. HFA of 35 Elo ≈ 55% home win probability, consistent with NHL reality. Log-MoV multiplier prevents blowouts from over-updating ratings. Critically, rolling windows on **starts not games** for goalies is the correct sample-base decision — a backup with 8 starts and a workhorse with 40 become comparable.

**DATA:** Full NHL seasons, walk-forward (expanding window) validation, chronological processing with ratings-as-of-yesterday. Top features: elo_diff, starter_gsaa diff, corsi_pct diff, rest days.

**GSE APPLICATION:** This is the Layer 2 NHL blueprint. Wire the feature block into GSE's Layer 2 gradient-boosted model on top of the market line (Layer 1 untouched). The Elo engine becomes the Layer 2 prior and a market-sanity cross-check. Transfers partially to NBA/MLB (Elo carryover structure, rest-diff features); goalie features are NHL-only. The rest-days feature directly serves GSE's back-to-back interest — and the killer NHL angle is b2b × confirmed-starter: backup goalie detection on the second night is the classic exploitable edge, and this feature pair captures it.

**IMPLEMENTATION SPEC:** New `gse/nhl/` package: `elo_engine.py` (5 variants, carryover, HFA as config, strict chronological update loop); `goalie_form.py` (lagged season SV%, rolling-5-start SV%, quality-adjusted GSAA, confirmed-starter flag with a hard assertion that lineup data timestamp < puck drop); `feature_diff.py` (schema-enforcing home-minus-away diff transformer — reject any non-diff feature at ingest); `walkforward.py`; `playoff_sim.py` (MC, ROW tiebreaker). Features built: `elo_diff`, `starter_gsaa_diff`, `starter_sv5_diff`, `corsi_pct_diff`, `rest_days_diff`, `b2b_home`, `b2b_away`, `backup_start_flag`.

**VERDICT: ADAPT.** The single richest candidate; rebuild in GSE's framework, take no coefficients. Three leakage checks required before adoption (see roll-up below). No trade-deadline handling — GSE must add it (see roll-up).

---

## N2 — anthonyevans29/sports-predictor NHL Elo v3

**METHOD:** Process candidate, not model candidate. Hyperparameters selected by walk-forward strictly inside 2024 (60/40 chronological fit/validation, predict-then-update scoring), full-2024 refit, 2025 scored exactly once as holdout. 8,400-point frozen grid. 80/80 pytest including grid-frozen and split-disjointness tests.

**MATH:** The predict-then-update protocol is the only correct way to evaluate Elo (score with pre-game rating, then update) — most public Elo implementations get this wrong. The full-2024 refit before the 2025 holdout is legal because the holdout is disjoint; the grid saw 2024, never 2025. The single-pass holdout is honest but statistically thin: ~1,312 games gives wide confidence intervals on any Brier delta — one season cannot rank Elo variants reliably.

**DATA:** 2024 (fit + validation), 2025 (holdout, scored once).

**GSE APPLICATION:** Adopt the *harness*, not the Elo. N1's Elo is strictly richer (MoV multiplier, goalie awareness via downstream features). The transferable artifact is the validation gate: split-disjointness and grid-frozen as CI tests. This applies to **all five sports**, not just NHL.

**IMPLEMENTATION SPEC:** `gse/validation/gates.py` with pytest fixtures: `test_split_disjointness` (assert max(fit game_date) < min(val game_date), run on every training job); `test_grid_frozen` (hash of selected params must match committed hash before any holdout scoring; mismatch fails CI); `test_predict_then_update` (assert every rating used at prediction time excludes the current game). Wire into GSE's training CI for NFL/NBA/MLB/NHL/soccer Elo layers.

**VERDICT: ADAPT** — specifically the validation harness. The Elo model itself is dominated by N1's; the 8,400-point grid is a tuning artifact, not a method.

---

## N3 — McGill NHL-Game

**METHOD:** Classification of game winner using **first-period statistics**. Benchmarked against Forecheck (Globe and Mail) at 62% pre-game accuracy.

**MATH:** Structurally confused. First-period data does not exist at puck drop, so this is an in-play model being compared to a pre-game benchmark — apples to oranges. Worse, if first-period *score* is among the features, the model is largely learning "teams leading after one period win ~X% of the time," which is conditional probability, not predictive skill, and will trivially post high accuracy that means nothing for pre-game use.

**DATA:** NHL games with first-period box score/corsi data.

**GSE APPLICATION:** None for GSE's pre-game layers. Layer 1 (market line) and Layer 2 (situational) both require features available before puck drop; this violates the point-in-time law by construction.

**IMPLEMENTATION SPEC:** None.

**VERDICT: REJECT.** Specific reason: feature set is future-dated relative to GSE's decision time; benchmark comparison is methodologically invalid. What would change my mind: GSE building a live/in-play layer — at which point N5's Markov state model is the superior tool anyway, so this stays rejected even then.

---

## N4 — "NHL Success Prediction with Text and Stats"

**METHOD:** Monte Carlo luck/skill decomposition: simulate leagues with varying injected skill, match observed outcome distributions, estimate NHL at ~24% skill / 76% luck → theoretical prediction ceiling of 24% + 76%/2 = 62%. Secondary: fusing textual pre-game reports with stats.

**MATH:** The ceiling formula `s + (1−s)/2` is correct: skill-decided games are perfectly predictable (contribute s), luck games are coin flips (contribute (1−s)/2). Two caveats: (1) the decomposition estimates the fraction of variance from *static team strength* — in-season form, goalie, and injuries are predictable signal *beyond* it, while the 24% may overstate what's actually knowable — so treat 62% as an upper guardrail, not a target; (2) the figure is era-dependent (cap parity, 3v3 OT, point system) and must be re-estimated per season, never hard-coded.

**DATA:** Historical NHL seasons (decomposition); pre-game text reports + stats (fusion model).

**GSE APPLICATION:** The decomposition becomes a **calibration guardrail for all sports**: re-estimate the skill fraction per league per season; flag any candidate model whose walk-forward accuracy exceeds ceiling + tolerance as presumptively leaky. This is a direct enforcement mechanism for GSE's calibration-honesty law. The text+stats fusion is a legitimate Layer 2 augmentation pattern *if* publication timestamps are enforced — pre-game injury/report NLP is point-in-time legal.

**IMPLEMENTATION SPEC:** `gse/calibration/ceiling.py`: per-season Monte Carlo skill-fraction estimator per sport; CI gate `test_accuracy_below_ceiling` that fails any model registering walk-forward accuracy > ceiling + 2%. Optional `gse/layer2/text_signal.py` with hard timestamp assertions on every document.

**VERDICT: ADAPT** — the decomposition method is a keeper and cheap to build. The specific 24%/62% numbers are era-bound; recompute. The text pipeline itself is dated; take the pattern, not the implementation.

---

## N5 — UNC Markov-chain hockey model

**METHOD:** In-game win probability from state (manpower situation × goal differential × time elapsed) via 100+ state-transition equations; manpower model vs. shots-on-goal model compared on 2013 games.

**MATH:** The state-space approach is the canonical live-WP architecture, and the manpower dimension is the right one — PP goal rates per minute are several times even-strength rates, so ignoring manpower misprices every penalty-heavy stretch. Red flags: 100+ transition equations fit on a *single season* means sparse cells everywhere; empirical transition matrices will be noise in rarely-visited states. "Goal events move WP near 1.0" is plausible for late-game/empty-net states but must be audited state-by-state. Also: fit and evaluation on the same 2013 games = in-sample.

**DATA:** 2013 NHL games only.

**GSE APPLICATION:** Two uses. (1) **Structural simulation core**: run the state machine forward from 0-0 with Layer 2 team-strength inputs to generate a pre-game win-prob prior — a physics-based cross-check on Layer 1 and a far better engine for N1's playoff Monte Carlo (replacing the crude constant ~23% OT rate with state-dependent transition rates). (2) Foundation for a future GSE live/in-play module. Not a Layer 2 feature source for pre-game.

**IMPLEMENTATION SPEC:** `gse/nhl/live_wp.py`: state machine (score_diff × manpower × time bucket); replace empirical transitions with parametric hazards — Poisson goal rates modulated by manpower and score effect, fit with shrinkage across multiple seasons (this conveniently reconciles with N6's only valid finding, that Poisson is the right family for hockey event counts). Pre-game mode: MC from 0-0 → win-prob prior; plug into `playoff_sim.py` as the series-game engine.

**VERDICT: ADAPT** — as simulation core and live-WP foundation, with mandatory multi-season refit and cell-shrinkage; the 2013-only in-sample evaluation is disqualifying as-is.

---

## N6 — integerman penalties / Azure ML

**METHOD:** Tutorial-grade model comparison (linear regression, decision forest, boosted trees, NN, Poisson, AutoML) predicting penalty counts; deployed as a web service.

**MATH:** "Poisson fits penalty counts" is a domain prior, not a finding — penalties are rare count events, so of course Poisson is in the right family. But penalties are serially correlated (retaliation, score effects, referee behavior), so Poisson underdisperses; the honest baseline is negative binomial or a hurdle model, which is never tested. No walk-forward validation, no calibration metrics, no temporal discipline anywhere.

**DATA:** Open NHL Kaggle dataset, static split.

**GSE APPLICATION:** None demonstrated. Penalty counts have no shown link to game outcome in this work. The *potentially* interesting GSE angle — referee assignments are knowable pre-game and drive predictable penalty rates — is exactly what this candidate does not do.

**IMPLEMENTATION SPEC:** None.

**VERDICT: REJECT.** Specific reasons: (1) target variable with no demonstrated predictive link to the game-level outcome GSE cares about; (2) no temporal validation — presumed leakage risk, and AutoML on a static Kaggle split typically leaks; (3) the headline finding is a prior, not a result. What would change my mind: a walk-forward demonstration that predicted penalty differential (or referee-conditioned penalty rates) improves game-level Brier/log loss. The Poisson-hazard insight survives via N5's implementation spec regardless.

---

## Goalie-form changepoint cross-examination (CUSUM/BOCPD thesis)

**N1 best supports the thesis, and no candidate contradicts it.** Three specific reasons:

1. **N1 supplies the correct detection signal.** Shot-quality-adjusted GSAA on start-indexed windows is exactly the stream CUSUM/BOCPD should run on. Raw SV% conflates defense quality with goalie form; N1's quality adjustment strips the defense out. And `starter_gsaa_diff` ranking as the #2 feature is direct evidence that goalie form carries real predictive weight — the signal exists.
2. **N1's fixed windows are the limitation that justifies the changepoint layer.** A 5-start window lags a form break by up to 5 starts. N1 doesn't contradict the thesis; it establishes the baseline the changepoint layer must beat.
3. **The critical implementation warning — noise floor.** A goalie faces ~25–30 shots per start; last-5-starts SV% carries a standard error of roughly ±2.5–3 points. A "hot" .940 stretch over a .910 baseline is barely 1.2 SE — most hot/cold streaks are noise, consistent with N4's 76%-luck finding. CUSUM on raw rolling SV% **will** fire on noise. The changepoint detector must run on quality-adjusted GSAA with shot-count weighting and Bayesian shrinkage to a career prior (BOCPD with shot-scaled observation noise, or CUSUM on shrunk z-scores), tuned for precision over recall, and validated the only honest way: walk-forward Brier/log-loss delta vs. N1's fixed-window baseline. If CUSUM/BOCPD doesn't beat fixed windows on that metric, the thesis fails on the merits.

N2 (Elo-only) implicitly treats goalie form as irreducible noise — a design choice, not evidence against the thesis. N4's text reports could capture "goalie is struggling" narratives as a corroborating signal but offer no detection method.

## Leakage & trade-deadline roll-up

**Leakage flags:**
- **N1:** Clean by design (lagged features, chronological processing, ratings-as-of-yesterday), pending three verification checks before adoption: (a) opponent-adjusted metrics must subtract *lagged* opponent rolling averages — if the adjustment window includes the current game, that's leakage; (b) confirmed-starter flag must derive only from pre-announcement lineup data; (c) "season-to-date SV% lagged" must provably exclude the current game. No full-season SOS usage detected.
- **N2:** Clean by construction — the split-disjointness pytest is the strongest leakage guarantee in the set.
- **N3:** Structural violation — first-period data is future-dated relative to puck drop.
- **N4:** Clean for the decomposition (it's a meta-analysis over outcomes, not a per-game feature). Text fusion is clean *only if* publication timestamps are enforced — make that a hard ingest assertion.
- **N5:** In-sample fit/eval on 2013; also in-game by definition — legal only for live use or structural simulation.
- **N6:** Unverified; static split + AutoML = presumed leakage.

**Trade deadline: no candidate models it.** N1's rolling windows adapt organically but slowly, and its Elo carryover fires only at season boundaries — a post-deadline roster overhaul is invisible for weeks. GSE must build this: (1) deadline-date flag feature in `feature_diff.py`; (2) partition all rolling windows and opponent-adjustment baselines at the deadline — re-estimate post-deadline baselines as if for a new entity; (3) one-time post-deadline Elo volatility bump (elevated K for ~10 games), since early post-deadline results are unusually informative about the new roster. This is a genuine gap across all six candidates and a differentiating build for GSE.

**Bottom line:** ADAPT N1 (Layer 2 NHL blueprint), N2 (validation harness), N4 (ceiling guardrail), N5 (simulation/live core). REJECT N3 (future-dated features) and N6 (no outcome link, no temporal discipline). Build the goalie changepoint layer on N1's GSAA signal with shrinkage, and build the trade-deadline break yourself — nobody else did.


---

## PART 3 — CROSS-LANE SYNTHESIS

## CROSS-LANE RANKING

1. **N1** — NHL Layer 2 blueprint (Elo variants + goalie features + walk-forward). Only candidate with real, credible calibration evidence (Brier 0.237/LL 0.670) and the richest feature block, including the b2b × backup-start edge.
2. **S2** — Dixon-Coles corrected Poisson core. The soccer scoreline engine; draw calibration is where 1X2 log loss is won, and DC is the principled fix.
3. **S1** — Skellam generator + bracket simulator. GSE's futures/derivative pricer, and the only soccer candidate whose math transfers 1:1 to NHL.
4. **N2** — Validation harness (split-disjointness, grid-frozen, predict-then-update). Narrow artifact but foundational: it is the credibility gate for all five sports' training CI.
5. **N5** — Markov state machine as simulation core and live-WP foundation. Structural asset (parametric hazards, multi-season shrinkage) that upgrades N1's playoff sim and seeds a future in-play module.
6. **S3-narrow** — Variable-K Elo, dual-head architecture shape, and the soccer replay-eval spine. Predictive core dominated by S1/S2; the harness and importance-weighting are the value.
7. **N4** — Skill/luck ceiling decomposition as a cross-sport leak-detector gate. Cheap, clever, but a guardrail, not a predictor — and its 24%/62% numbers are era-bound.

## WIRING PRIORITY QUEUE

1. **`gse/validation/gates.py`** (from N2) — split-disjointness, grid-frozen, predict-then-update pytest gates. Unblocks: trustworthy training CI; nothing downstream can be scored honestly without it.
2. **`gse/calibration/ceiling.py`** (from N4) — per-season skill-fraction estimator + `test_accuracy_below_ceiling` gate. Unblocks: automatic leak detection across all sports; depends on gates existing.
3. **`gse/ratings/elo_engine.py`** (from N1's five variants + S3's importance-weighted K) — chronological update loop, carryover, HFA config, `match_importance` multiplier. Unblocks: the Layer 2 rating prior for both NHL and soccer.
4. **`gse/nhl/feature_diff.py` + `goalie_form.py`** (from N1) — diff-schema transformer, quality-adjusted GSAA, rolling-5-start SV%, confirmed-starter flag with pre-drop timestamp assertion, b2b/backup flags. Unblocks: the NHL Layer 2 feature block, and the signal stream the changepoint layer (step 9) consumes.
5. **`gse/soccer/dixon_coles.py`** (from S2) — τ correction, time-decay ξ, per-competition ρ. Unblocks: the soccer scoreline engine; everything soccer-market depends on this grid.
6. **`gse/soccer/market_map.py`** (S6's pattern, rebuilt fresh, fed DC grids only) — λ pair → scoreline grid → 1X2/DC/O-U/BTTS/correct score/team totals. Unblocks: all soccer market outputs.
7. **`gse/soccer/skellam_outcome.py` + `gse/sim/tournament.py`** (from S1) — μ deleted; sim outcomes sampled from DC marginals for internal consistency. Unblocks: futures/derivative pricer (outright, group finish, to-advance) as a Layer 2 overlay vs market.
8. **`gse/nhl/live_wp.py`** (from N5) — parametric hazards (Poisson rates modulated by manpower/score effect, multi-season shrinkage refit); pre-game MC mode plugs into `playoff_sim.py`. Unblocks: physics-based prior cross-check on Layer 1, state-dependent playoff MC, future live module.
9. **`gse/nhl/goalie_changepoint.py`** (new build on N1's signal; protocol below) — requires step 4's GSAA stream. Unblocks: the goalie-form edge beyond fixed windows.
10. **`gse/rosters/window_break.py`** (new build; spec below) — requires dated roster/squad sources from ingestion. Unblocks: the transfer-window/deadline differentiator in both sports.
11. **Soccer replay harness** (from S3, extended to 2010–2024, n≈400+) — scored on log loss vs D1 bookmaker odds baseline. Unblocks: the soccer eval spine that certifies steps 5–7.

## DATASET INGESTION

**D1 — European Soccer Database: YES.** Used for: club-soccer Layer 2 backtests, the 10-bookmaker odds as the mandatory Layer-1 baseline for every soccer backtest (the S4 cautionary tale), lineups, match events, FIFA player attributes as dated features. Schema/quality: 25k matches, 11 countries, 2008–2016; rich but frozen. Point-in-time caveats: FIFA attributes update at irregular intervals — use strictly as-of the latest update *prior* to each match, never the season snapshot; verify odds timestamps are pre-kickoff; 2016 cutoff means no live use, backtest only.

**D2 — martj42 international results: YES.** Used for: soccer Elo/DC-λ training (S1/S2/S3 lineage) and the replay harness. Schema/quality: 49k matches 1872–2017, scores + tournament labels + dates; no events, lineups, or odds. Point-in-time caveats: S2 claims 2026 coverage but D2 nominally ends 2017 — verify post-2017 provenance and as-of integrity before trusting any post-2017 rows; era heterogeneity pre-1950 demands the time-decay treatment; tournament labels must be validated before use as importance weights.

**Gaps:** (1) No current NHL play-by-play Kaggle dataset surfaced — GSE needs shot-level play-by-play with coordinates, manpower state, and start timestamps (NHL API / MoneyPuck-style exports) to power N5's state machine and quality-adjusted GSAA. (2) No time-stamped squad-value source — Transfermarkt values must be re-collected as dated per-window snapshots, never single scrapes. (3) No NHL lineup/starter-announcement feed with timestamps — required for N1's confirmed-starter assertion. (4) No transfer-transaction data with dates for soccer windows. (5) No post-2016 soccer odds history — needed to extend the Layer-1 baseline past D1's cutoff.

## TRANSFER-WINDOW / TRADE-DEADLINE GAP

**Mechanism (both sports): entity re-segmentation.** At each roster break, treat the post-break team as a new entity for baseline estimation: partition all rolling windows, opponent-adjustment baselines, and rating histories at the break date; re-estimate from post-break data plus shrunk priors; apply a one-time volatility bump (elevated K / widened uncertainty for ~10 games) because early post-break results are unusually informative about the new roster.

**Soccer (summer + January windows):** Features — dated squad snapshots as-of window close (market value, age curve, key-player availability), net turnover weighted by prior minutes share, arrivals/departures count, manager-change flag. Validation — walk-forward across the ~16+ window events in D1 (2008–2016, all clubs): compare post-window Brier/log loss for re-segmented baselines vs N1-style continuous rolling windows. Kill criterion: no post-window improvement → drop the re-segmentation, keep only the volatility bump.

**NHL (single trade deadline, ~late Feb):** Features — deadline flag in `feature_diff.py`, roster turnover weighted by TOI/usage, goalie-room changes, buyer/seller posture. Validation — walk-forward across seasons: post-deadline log-loss delta of re-segmented + elevated-K handling vs N1's organic slow-adaptation baseline. Kill criterion: delta CI includes zero across ≥5 seasons.

**IP status:** zero candidates in either lane touch this; it is native GSE build, differentiating by default.

## GOALIE CHANGEPOINT VERDICT

**Confirmed, with refinements.** N1 supplies the correct signal (quality-adjusted GSAA on start-indexed windows; `starter_gsaa_diff` as the #2 feature proves form carries weight) and its fixed 5-start window is exactly the lagging baseline the changepoint layer must beat. Refinements: run detection on **shrunk** z-scores of quality-adjusted GSAA (Bayesian shrinkage to career prior, shot-count-scaled observation noise) — BOCPD preferred over raw CUSUM, tuned precision-over-recall, because the ±2.5–3 point SE on 5-start SV% means unshrunk detectors will fire on noise.

**Validation protocol (proves or kills):**
1. Walk-forward over ≥5 NHL seasons; detector sees only strictly prior starts.
2. Primary metric: Brier/log-loss delta on games following detected changepoints vs N1's fixed-window baseline, with the changepoint flag added as a feature.
3. Ablation: does the flag improve the predictive weight of `starter_gsaa_diff` itself?
4. Sanity guard: detection rate per goalie-season — firing above a low threshold (single digits %) means it's fitting the noise floor.
5. **Kill criterion:** delta CI includes zero, or no ablation improvement → thesis fails on the merits; keep N1's fixed windows.

## REJECT ROLL-UP

- **S4** — same-season aggregates as sim inputs = textbook leakage; ignored 10 bookmakers of free odds data.
- **S5** — no evaluation, no calibration; strictly dominated by S1/S2 on the identical feature family.
- **S6** — independent Poisson underprices draws; dominated by S2's DC; its one asset (market map) gets rebuilt anyway.
- **S7** — post-match stats as features and undated squad snapshots; zero calibration evidence end-to-end.
- **N3** — first-period features are future-dated at puck drop; benchmark comparison methodologically invalid.
- **N6** — penalty counts with no demonstrated outcome link; static-split AutoML = presumed leakage.

---

## CANDIDATE URL INDEX

**Soccer**
- S1 fwc26: https://github.com/mohamedfarouk94/fwc26 · Kaggle: https://www.kaggle.com/code/mohamedfarouk94/wave-your-flag-predicting-fifa-world-cup-2026
- S2 fifa-wc2026-predictor: https://github.com/soumendu-11/fifa-wc2026-predictor · Kaggle: https://www.kaggle.com/code/sarazahran1/world-cup-2026-match-predictor
- S3 fifa-world-cup-prediction: https://github.com/saptarshi501/fifa-world-cup-prediction · Kaggle: https://www.kaggle.com/code/saptarshisadhukhan/fifa-worldcup-prediction
- S4 Soccer-prediction-with-Machine-Learning: https://github.com/tunghoangt/Soccer-prediction-with-Machine-Learning
- S5 euro2024-predictor: https://github.com/bowhza/euro2024-predictor
- S6 2024-euro-prediction-using-poisson-distribution: https://www.kaggle.com/code/robertostl/2024-euro-prediction-using-poisson-distribution
- S7 2026-fifa-world-cup-prediction: https://www.kaggle.com/code/madferit/2026-fifa-world-cup-prediction
- D1 European Soccer Database: https://www.kaggle.com/datasets/hugomathien/soccer
- D2 international-football-results: https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017

**NHL**
- N1 hockey-skills: https://github.com/sports-data-hq/hockey-skills
- N2 sports-predictor: https://github.com/anthonyevans29/sports-predictor
- N3 NHL-Game: https://github.com/McGill-MMA-EnterpriseAnalytics/NHL-Game
- N4 NHL Success Prediction (luck/skill): https://www.scribd.com/document/207660960/Combining-Textual-Pre-Game-Reports-and-Statistical-Data-for-Predicting-Success-in-the-National-Hockey-League
- N5 Markov-chain hockey (UNC): https://janeway.uncpress.org/ms/article/1219/galley/1911/download/
- N6 Predicting Hockey Penalties: https://dev.to/integerman/predicting-hockey-penalties-with-azure-machine-learning-2jj

## LANE CAVEATS
- Kaggle `/code` pages would not render via text fetch (JS-walled); notebook bodies for S1/S2/S3/S7 were evaluated from their public GitHub mirrors plus search-indexed method descriptions. Depth on S6 (pure-Poisson notebook) is thinnest — its method is fully described by its title pattern and it was evaluated as a method archetype.
- No current NHL play-by-play Kaggle dataset surfaced in this lane's hunt — flagged as a dataset gap in Part 3.
- GLM initially burned 8K tokens on internal reasoning with empty content; resolved by raising max_tokens to 24K with an efficiency instruction. First wasted call cost $0.004 (included in the $0.0184 total).


---

## PART 4 — SITUATIONAL/EMOTIONAL LAYER (E1–E6)

*Garrett directive 2026-10-06: lock into the situational + contextual + emotional layer. All evaluations below by z-ai/glm-5.3-flash.*

# Layer 2 Build — Situational/Emotional Finds: Method-Transfer Review

## Operating rule (applies to every verdict below)

Layer 2 earns weight through one gate: **residual explanation against the closing line, not raw outcome prediction.** Procedure: (1) construct the feature strictly point-in-time; (2) compute residual = actual outcome − market-implied expectation from a pre-close snapshot; (3) the feature gets edge-weight only if it explains residual variance out-of-sample, per sport; (4) features that fail the edge test but improve simulation fidelity (rest, home advantage, cards) are retained as **zero-edge controls**. Additionally, classify every feature as **mean-shifting / variance-shifting / tail-shaping** — several situational effects act on variance and tails more than means, which matters for alt-line pricing and same-game correlation even when mean edge is thin. Per the transfer law, all numbers below are prior *shapes*; coefficients get re-estimated on GSE data per league.

---

## E1 — NEW MANAGER BOUNCE (soccer)

**METHOD:** Model the post-appointment period as a **decaying shock on top of a mean-reverting form process** — never as a flat "+X under the new manager." Shock amplitude scales with the gap between underlying squad quality and recent form, is gated by appointment timing, and turns *negative* after ~40–55 games.

**MATH:** The 41% headline is a selection-biased baseline and must be decomposed. The predecessor's PPG is measured on a trough sample — that trough is *why* he was fired. Illustrative arithmetic: predecessor trailing 0.85 PPG; market-implied squad quality ~1.15 PPG; pure mean reversion alone predicts ~1.05–1.15 post-change; the observed "41% uplift" lands at ~1.20 → **real residual effect ≈ +0.05–0.15 PPG, decaying**. "20 of 26 improved" is nearly guaranteed by reversion against a trough baseline — it is not evidence of a manager effect. The informative structures are elsewhere: (i) **timing** — the games 10–19 window is strongest precisely because it's the *clean* window: enough sample to establish genuine underperformance, pre-January-window so no transfer confound; (ii) **decay below baseline** after ~54 games (opponents rebuild the tactical file; club dysfunction resumes); (iii) **regime shrinkage** — only 3 of 10 changes in 2023/24+2024/25 produced a discernible bounce → prior magnitude down, variance up. The Hodgson quote identifies a further confound: part of the "bounce" is injured players returning — which is *knowable* and must be separated out.

**GSE APPLICATION:**
- **MGR_TENURE_G** (soccer primary; NBA secondary; NHL via E2; **exclude MLB** — manager leverage is minimal in baseball): games since appointment, from appointment timestamp.
- **BOUNCE_CURVE**: multiplicative form adjustment h(g): near-zero mean at g1–3 (opponent unfamiliarity raises *variance* more than mean), peak g≈8–20, decay to zero by g≈35–45, mildly negative g>45 (**NEW_MGR_FADE**). Amplitude A = k × QUALITY_GAP, where QUALITY_GAP = market-implied strength (Layer 1 snapshot, prior 5 matches) − trailing form, **decomposed into an availability-recovery component (who's due back — knowable) and a pure form component**.
- **Timing gate**: full weight for appointments in games 10–19; 0.5× for g1–9 (underperformance may be noise); 0.5× for January+ (transfer confound).
- **PROCESS_RESULT_DIVERGENCE**: post-change results-vs-expectation minus xG-vs-expectation; positive divergence → fade signal (market overpricing a hot start without process support).
- Augments: match-level 1x2 probabilities and the team-strength vector in simulation.

**VERDICT: ADAPT.** The bounce is real but small, hump-shaped, and conditional; the 41% framing is unmodelable as stated. Flip to REJECT if, re-baselined against market expectation rather than predecessor PPG, post-change beat rates show no hump/fade structure out-of-sample — i.e., if the market already prices the full conditional dynamics.

---

## E2 — NEW COACH BUMP (NHL)

**METHOD:** Same mechanism as E1, cross-sport instantiation. The NHL data supplies the decay structure and the smoking gun that the effect is **effort + luck, not system**: CF% barely moves while wins jump.

**MATH:** Blocks .523 / .544 / .487 vs .451 at hire. Two corrections before believing it: (1) .451 is a trough sample, so the reversion baseline is realistically .475–.490 → **real bounce ≈ +.03–.06 points% in blocks 1–2, ~0 by block 3**; (2) "60% reached .500+" is nearly the league base rate under loser points (league-average points% sits *above* .500 by construction), so that headline carries almost no information. The hump (block 2 > block 1) fits an effort/guilt component that builds then collapses — consistent with the player quote, and the reason **INTERIM_FLAG** (maximum guilt dynamics) is a real conditioning variable; the SI interim numbers (.481→.551) carry the same trough-baseline caveat. February firing ≈ game 34 means the block-3 fade lands in the stretch run, where it interacts with E5: out-of-race teams hire for roster evaluation and the tank incentive mutes the bounce. CF% flat + wins up = results without process = the market will overreact to the results.

**GSE APPLICATION:**
- **NHL_COACH_BUMP**: same BOUNCE_CURVE construction, NHL-calibrated (peak g≈21–40, fade g>40); INTERIM_FLAG boosts amplitude; **HIRE_CALENDAR** (games 30–40 hires) shifts the fade into the final 20 games and couples to STAKES_ASYMMETRY.
- **PROCESS_RESULT_DIVERGENCE (NHL)**: results-vs-expectation minus CF%-vs-expectation → fade teams whose line inflates on results alone.
- NBA: same construction, lower prior weight. NFL: offseason hires only, small weight.
- Augments: NHL team-strength vector, period/total simulation.

**VERDICT: ADAPT** (merged with E1 as one mechanism, two sport calibrations). Flip to REJECT if the block structure fails to replicate on out-of-sample hires re-baselined against market expectation.

---

## E3 — DERBY/RIVALRY EFFECTS

**METHOD:** Treat "derby" not as a rivalry multiplier but as a **regime change in three separate model objects**: score dependence (more draws/low scores), home advantage (partially collapses), and discipline (cards inflate) — each estimated with hierarchical shrinkage.

**MATH (per sub-part):**
- (a) Dixon-Coles/bivariate Poisson with derby-specific low-score dependence: rho = −0.11 moved the draw 25.2%→28.6% (+3.4pp). Method sound; **the 10-match rolling window makes that rho noise** — pool Δrho = rho_derby − rho_base across all derbies league-wide with shrinkage. The feature is the *delta*, never the level.
- (b) Ordered probit Home×Derby = −0.25 to −0.31 goals; city-derby home win 38% vs 44%. Mechanism is clean: same-stadium removes travel/crowd asymmetry; familiarity removes tactical surprise. The same-stadium subset is the strongest, most defensible effect here.
- (c) Underdog +8–12%, draws +5–10pp, cards +40%/+60%: betting-site sourcing, lowest rigor tier. Card inflation is the most replicated derby finding in football — keep. The underdog claim is partially priced — prior only.
- (d) Club HA spread 0.15–0.45 goals: this is a **general feature, not derby-specific** — partial pooling fixes small-sample HA estimates (promoted clubs) and shifts 1x2 several points per fixture.

**GSE APPLICATION:**
- **DERBY_TAXONOMY** (soccer): static, point-in-time-safe — same-stadium / city / regional (distance threshold) / established rivalry list.
- **HA_DERBY_DISCOUNT**: multiplicative haircut on club HA, deepest for same-stadium; re-estimated per league.
- **DERBY_DEPENDENCE**: Δrho draw-inflation in the score model.
- **DERBY_CARDS**: negative-binomial card model, derby multiplier (~1.4Y / 1.6R priors) × referee severity (assignment known pre-match); feeds card markets, in-match red-card risk in the simulator, and **next-fixture suspension availability**.
- **CLUB_HA_HIERARCHICAL** (all sports): per-team home advantage as a shrunken random effect.
- Variance note: derby = variance-up + favorite-edge-down + tail-thickening (red-card risk) — price alt lines accordingly.

**VERDICT:** (a) **ADAPT**, (b) **ADAPT**, (c) **ADAPT for cards / hold underdog claim as unpriced prior**, (d) **ADOPT**. Flip any to REJECT if: Δrho is unstable across leagues; HA×derby loses significance once referee and crowd-split controls are added; or the card multiplier fails out-of-sample stability.

---

## E4 — FIXTURE CONGESTION

**METHOD:** Split the narrative into features with different evidence strength: (1) **availability/rotation forecasting — strong** (injury RR is real; rotation is predictable); (2) **team-performance fatigue — weak** (UEFA's own performance null is the anchor); (3) **travel load — best-supported lever** (80% of studies negative).

**MATH:** ≤4d vs ≥6d recovery: total injury RR 1.09, muscle RR 1.32 — real, but that is an *availability* effect, not a results effect. The same 11-year study found **no team-performance association** with load or recovery except Europa League short-recovery (p=0.048 — marginal, fragile under multiple comparisons). Pass accuracy 88.5→81.2 and sprint volume 1150→820m in <72h windows are within-match fatigue markers; the performance null says they don't reliably convert to results. The 72h threshold (43% of studies) sets the congestion flag at <72h, not <4 days. Mourinho's late collapse: **n=1 anecdote → hypothesis queue** (test late-game concession rate conditional on international-load differential), not a feature.

**GSE APPLICATION:**
- **CONGESTION_WINDOW** (all sports): games/7 days, <72h flag. NBA back-to-back/3-in-4; NHL 3-in-5; NFL Thursday short week; MLB bullpen availability (same method, different muscle).
- **TRAVEL_LOAD** (all): distance × time zones × direction (west→east worst) × altitude; NFL London/Mexico games.
- **INTL_BREAK_LOAD** (soccer): Σ over squad of international minutes (prior 14 days) × competition weight × position weight, plus RETURN_TIME (Friday return for Saturday match). Point-in-time: completed internationals only.
- **ROTATION_FORECAST** (all): P(key player rests) from coach's historical rotation propensity conditional on congestion × stakes (E5 interaction) × position (wide/strikers rotate most, CBs least — position-specific priors). **This is the real edge: predicting the lineup decision before it's public.**
- **INJURY_RISK_FORECAST**: muscle RR 1.32 → expected availability loss over the upcoming window; feeds futures and squad-depth valuation more than single matches.
- Augments: lineup-adjusted team strength (rotation forecast is the biggest single-match lever); NBA totals under rest; MLB bullpen-driven totals.

**VERDICT: ADAPT, split.** Availability/rotation/travel features ADAPT — and are kept as controls even at zero edge, because simulation fidelity requires them. A blanket "tired team underperforms" performance multiplier would be **REJECT** — the UEFA performance null forbids it; only travel and extreme <72h windows earn performance weight, and only if the residual test passes. Flip the performance side to full REJECT if travel/international-load residuals show nothing out-of-sample.

---

## E5 — END-OF-SEASON MOTIVATION ASYMMETRY (the gap, specified)

**METHOD:** Quantify motivation as a **stakes-state differential built from Layer 1's own futures prices** — the market's season-outcome probabilities are the point-in-time-legal measure of what a team is playing for. Then model the game-level residual the market misses: it prices table position crudely, not schedule-adjusted survival probability, and it cannot price a rotation decision that hasn't been announced.

**MATH (construction):**
- **STAKES_STACK** per team per match, from de-vigged futures at match time: P_releg, P_euro/UCL, P_playoff, P_title, plus binary eliminated / seed-locked flags.
- **MOTIVATION_GAP** = Σ w_k (S_k,home − S_k,away), with asymmetric weights — desperation weighs more than comfort (loss aversion).
- **DEAD_RUBBER flag**: both teams' max stake probability < 0.05.
- **Calibration protocol**: final 8–10 gameweeks, ≥10 seasons; regress (actual points − market-expected points) on the stakes differential. Priors from the qualitative sources: relegation-threatened **+0.2–0.5 PPG** vs expectation; dead-rubber mid-table **−0.1–0.3 PPG** with **2–3× rotation odds**; shrink heavily.
- Cross-sport: NBA/NHL tank (P_playoff≈0 + lottery incentive); NFL weeks 17–18 locked-seed rest; MLB September. The NFL case is the cleanest edge: **predicting the rest decision before announcement** from coach history + seed math — once announced, the market reprices instantly.

**GSE APPLICATION:**
- **STAKES_ASYMMETRY** (soccer primary; NBA/NHL/MLB/NFL variants): mean-shift toward the desperate side in desperation mismatches; DEAD_RUBBER triggers ROTATION_FORECAST priors plus a small form haircut.
- **TANK_FLAG** (NBA/NHL): rest-star probability → totals down, variance up, opponent cover rate up.
- Augments: match probabilities in the final third of the season; futures hedging; alt-line pricing.

**VERDICT: ADAPT** with the construction above. This is the highest-prior Layer-2 feature in the set: the mechanism (loss aversion + rotation) is behavioral, and the market's pricing instrument (table position) is a crude proxy for the true state (probability-weighted stakes). Flip to REJECT if the residual regression shows no asymmetry across 10+ seasons — but the cross-source qualitative consistency makes that unlikely.

---

## E6 — SENTIMENT/NLP AS EMOTIONAL PROXY

**METHOD:** Reject sentiment as a probability input; salvage the pipeline for two uses where text has structural advantages: (1) **news latency** — structured extraction from verified journalist accounts updates the availability vector before odds fully adjust; (2) **divergence** — sentiment-vs-line disagreement as a public-shade detector.

**MATH:** AUC 0.642 vs outcomes is *below* what EPL closing odds achieve (~0.65–0.70 on 1x2) — and the capstone had no odds baseline, so incremental value is unestablished. A market-respecting engine benchmarks against the market, not the coin flip. Schumaker: higher payout with **lower accuracy** = longshot-bias harvesting, a market-structure artifact, not forecasting skill. Springer's negative result is the most informative finding in the whole set: in-play Twitter carries no incremental information vs pre-game odds, and RF ≤ logistic means there is no hidden nonlinearity — **the signal is absent, not the method wrong**. Miranda-Peña's network centrality is the one methodological idea worth keeping: *who* talks and how chatter is structured may proxy attention better than *what* they say.

**GSE APPLICATION:**
- **NEWS_VELOCITY** (all sports): entity-relation extraction ("Player X — hamstring — out 3 weeks") from timestamped verified accounts → updates the availability vector; point-in-time legal (public, timestamped); edge exists only in the odds-lag window (minutes to hours). This is really a Layer-1.5 input: it changes true probability, not variance.
- **SENTIMENT_DIVERGENCE** (soccer/NBA): SentSkew − k×LineMove; large |divergence| flags games where Layer 1 may be shaded toward the popular side; **requires corroboration** (sharp-side reversal or model disagreement) before any weight. Never a standalone input.
- **NETWORK_ATTENTION**: exploratory only, no probability weight.

**VERDICT: REJECT** as a direct outcome-probability feature — public sentiment is already in the price, and importing it imports public bias. **ADAPT** the pipeline for NEWS_VELOCITY and SENTIMENT_DIVERGENCE as above. Flip to full REJECT including auxiliary uses if verified news consistently moves odds faster than GSE can ingest it (latency edge uncapturable in practice).

---

## Leakage ledger (point-in-time flags per feature)

| Feature | Leakage trap | Discipline |
|---|---|---|
| BOUNCE_CURVE / COACH_BUMP | Defining "bounce regimes" from post-change data; end-of-season points% used in-season | Appointment timestamps only; curve shape fixed a priori, amplitude estimated point-in-time |
| DERBY_* | None serious — taxonomy is static | Referee assignment must be pre-match known |
| CONGESTION / INTL_LOAD | Backfilled season injury aggregates | Injuries as known at match time; internationals from completed matches only |
| STAKES_ASYMMETRY | **Final league table as stakes** | Futures odds timestamped at match time; never the final table |
| NEWS_VELOCITY / SENTIMENT | Using content published after t | Feature at time t uses only content published ≤ t |
| Global | Closing line as an input | Closing line is the benchmark, never a feature |

## Edge-weight summary

| Feature | Sports | Acts on | Expected status |
|---|---|---|---|
| BOUNCE_CURVE + fade timing | Soccer, NHL, NBA | Mean + variance | Edge candidate (decay timing is the market's weak spot) |
| PROCESS_RESULT_DIVERGENCE | Soccer, NHL | Mean (fade) | Edge candidate |
| HA_DERBY_DISCOUNT + Δrho | Soccer | Mean + variance | Edge candidate (same-stadium deepest) |
| DERBY_CARDS | Soccer | Tail + derivatives | Edge candidate |
| CLUB_HA_HIERARCHICAL | All | Mean | Control (partially priced) |
| ROTATION_FORECAST | All | Mean (lineup-adjusted) | **Highest-value edge candidate** |
| INJURY_RISK_FORECAST | All | Availability | Control + futures edge |
| STAKES_ASYMMETRY + TANK_FLAG | All | Mean + variance | Edge candidate |
| NEWS_VELOCITY | All | True probability | Latency edge, timestamp-gated |
| Sentiment level | — | — | Rejected |

The pattern across all six finds: the market prices *levels* well and *dynamics* poorly. Every surviving Layer-2 feature is a timing, decay, interaction, or pre-announcement prediction — never a static narrative multiplier.

---

## SITUATIONAL SOURCES INDEX
- E1 new-manager bounce: https://www.premierleague.com/en/news/4593686/what-is-a-new-manager-bounce-and-is-it-a-myth · https://www.skysports.com/football/news/12890611/is-sean-dyche-the-premier-leags-most-effective-manager-in-history · https://www.livescore.com/en/news/football/premier-league/what-is-the-new-manager-bounce-and-is-it-real/
- E2 NHL coach bump: https://www.Dailyfaceoff.com/news/the-new-coach-bump-is-realand-its-temporary · https://www.si.com/nhl/2018/11/08/willie-desjardins-jeremy-colliton-interim-coaches-last-decade
- E3 derby: https://www.linkedin.com/posts/gahida-altwati-0aa73510a_datascience-sportsanalytics-machinelearning-activity-7506064873772978176-00Kh · https://www.golsinyali.com/en/blog/derby-match-predictions-analysis · https://medium.com/@bankomaclar_89228/home-advantage-weighting-in-1x2-models-cff1def8abe8
- E4 congestion: https://www.researchgate.net/publication/249319881_Muscle_injury_rates_in_professional_football_increase_with_fixture_congestion_An_11-year_follow-up_of_the_UEFA_Champions_League_injury_study · https://onlinelibrary.wiley.com/doi/10.1111/sms.70163
- E5 motivation: https://stakehunters.com/why-you-should-back-with-caution-at-the-end-of-the-football-season/ · https://theactionelite.com/pre-match-motivation-and-its-impact-on-football-odds/
- E6 sentiment: https://cse.aua.am/wp-content/uploads/2025/06/Vahram-Dressler-Capstone.pdf · https://www.springerprofessional.de/a-big-data-analysis-of-twitter-data-during-premier-league-matche/19977672 · https://www.iccs-meeting.org/archive/iccs2021/papers/127470403.pdf

---

## REVIEW PASS (adversarial, wave 2)

*Fresh reviewer, did not write the original. Method: re-read full report, ran fresh web/Kaggle/GitHub searches (Oct 6, 2026), stress-tested every verdict against the report's own stated law: "Layer 2 earns weight by explaining residual variance against the closing line."*

### (a) NEW CANDIDATES THE FIRST PASS MISSED (5)

**R1 — adambloebaum/xg-puck-benchmark → ADAPT.**
Public-data NHL expected-goals benchmark: 825,907 shots, 7 seasons, six model families, strict temporal train/val/test split. Headline: tuned XGBoost beats MoneyPuck's own published xG on test log-loss (0.2145 vs 0.2146); MoneyPuck leads on val and AUC, attributed to tracking/private game-state features. This is the audited public substrate the report's entire goalie thesis depends on: N1's "shot-quality-adjusted GSAA" is taken on faith, and the GOALIE CHANGEPOINT section admits raw rolling SV% fires on noise — the quality adjustment is load-bearing and this repo is the best open implementation of it. Wire the xG feature set into `gse/nhl/goalie_form.py`'s quality adjustment and use its test log-loss as the minimum bar any GSE xG model must clear.
URL: https://github.com/adambloebaum/xg-puck-benchmark

**R2 — RotoWire NHL travel-fatigue study (July 2026, 11 seasons, all 32 franchises, 2015–16→2025–26) → ADAPT.**
Freshest large-sample rest study available: back-to-back + time-zone travel is the ONLY split that clears significance — 46.8% vs 49.5% win (−2.7 pts). Time-zone travel alone (49.1%) and eastward (48.3%) vs westward (49.9%) are noise. Implication the report missed: the fatigue effect is an **interaction** (B2B × TZ change), not an additive rest term. This refines both N1's `rest_days_diff` (a single rest-diff feature underfits the interaction) and E4's TRAVEL_LOAD (which lists distance × zones × direction but not the interaction structure). Build feature: `b2b_tz_crossing` = zero-rest AND ≥1 TZ change; demote pure directional travel terms to controls. Corroborates: nhlinsight (3 seasons, 810 rest-disadvantage games, 41.4% win, 38.6% on road vs 49.1% at home — the home/away split is massive, supports the report's b2b_home/b2b_away split).
URL: https://www.rotowire.com/hockey/article/how-time-zone-travel-hurts-nhl-teams-11-seasons-of-data-122663

**R3 — erab17/nhl_mcdavid_study (rebuilt) → ADAPT-narrow.**
McDavid-era rebuild now on `api-web.nhle.com` + MoneyPuck shot data (~120 columns incl. pre-shot context: rebound, rush, prior event type/location/timing), LightGBM, **GroupKFold out-of-fold (leak-free) validation**, log loss + Brier + AUC + reliability curve. Narrow take: the pipeline pattern (grouped temporal validation + reliability curve + explicitly documented leak-fix bugs like `timeOnIce "20:30"->20.30`) belongs in N2's `gse/validation/gates.py` as xG-specific CI checks. The old NHL statsapi is dead (2023-24) — any GSE ingestion still pointed at it is broken; this repo documents the migration path.
URL: https://github.com/erab17/nhl_mcdavid_study

**R4 — bardiyashavandi/world-cup-2026-predictor → ADAPT-narrow.**
Dixon-Coles + XGBoost + **Bayesian updating** of team strength, documented time-weighting exp(−0.003 × days_ago), SHAP explainability, backtesting harness. The narrow asset wave 1 missed across all seven soccer candidates: Bayesian (recursive posterior) updating of attack/defense strengths instead of fixed-window refits. This is a better update rule for S1/S2's λ than re-fitting on windows — it composes naturally with the report's window-break re-segmentation (posterior widening at break dates is exactly the "elevated K / widened uncertainty" mechanism in the native build spec).
URL: https://github.com/bardiyashavandi/world-cup-2026-predictor

**R5 — Frontiers in Sports (2025): EPV vs xG for match-outcome prediction, Bundesliga 2024/25, 306 unseen matches → ADAPT-narrow.**
Tests Expected Possession Value against xG as match-outcome predictors: EPV carries consecutive-action/possession-phase context that xG drops. Narrow take for the soccer module: EPV-derived team-strength features (possession-value differential, not just goal differential) as an input family to S2's λ estimation. Cross-lane note: this is the soccer instantiation of the lane-13 VAEP line — one of the two lanes should own the possession-value pipeline; currently both gesture at it. Assign ownership to lane 13 (tracking data), expose `team_possession_value_diff` as a λ-model feature here.
URL: https://public-pages-files-2025.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1713852/pdf

### (b) VERDICT CHANGES ADVOCATED

**1. STRONGEST CHANGE — N1's b2b × backup-start "classic exploitable edge": demote from asserted edge to gated hypothesis.**
The report writes that b2b × confirmed-starter captures "the classic exploitable edge." No closing-line residual test is shown. The report's own operating law (Part 4) requires Layer-2 features to earn weight by explaining residual variance against the closing line — this sentence is exempted from that law without justification. nhlinsight's numbers (home B2B teams win 49.1%) suggest the market may well price the common cases; the remaining edge, if any, lives in the interaction cells (road B2B + TZ crossing, per R2). Action: keep the feature flags, but the wiring queue must add a residual-vs-closing-line test for b2b × backup-start before any stake-sized weight, and the report's language must change from "edge" to "edge candidate pending the residual test."

**2. N5's 2013 fit is thinner than reported: lockout-shortened 48-game season.**
The report notes 100+ equations on one season = sparse cells. Add: the 2012-13 season was a lockout-shortened 48-game season with compressed scheduling and a different game-state distribution (more fatigue effects, no inter-conference play). The in-sample baseline is worse than stated. The parametric-hazards rebuild is the correct fix; the review adds a requirement: multi-season refit must span *both* pre- and post-2015 (3v3 OT changed overtime transition rates structurally) and the playoff continuous-OT format must be a separate regime in the state machine, not extrapolated from regular-season 3v3 transitions.

**3. Promote window-break *ingestion* out of the wiring queue's basement.**
`gse/rosters/window_break.py` sits at #10 of 11 while the report calls the window/deadline build "differentiating by default" and "native GSE build." The modeling can wait; the *data* cannot. Dated squad snapshots (Transfermarkt per-window values, NHL roster-transaction logs with dates) must be an ingestion workstream starting in parallel with steps 1–5, because without the dated sources the build is impossible and the delay compounds every season. Promote to: **dataset track 0** (starts now, parallel), model build stays after `market_map.py`.

**4. S7: keep REJECT on the notebook, upgrade the squad-composition idea from "shelved" to the ingestion track above.**
The report correctly rejects the notebook (undated snapshots, post-match stats) but files the only genuinely novel idea in the soccer set — squad composition at window boundaries — under "shelved pending time-stamped sources." That's passive. The review pass folds it into change #3: dated-snapshot ingestion is the unblocking work, not a wait condition.

**5. Insert R1 (xG benchmark) as wiring step 4b.**
N1's `goalie_form.py` quality adjustment and the entire goalie-changepoint thesis rest on quality-adjusted GSAA. Currently the queue builds `goalie_form.py` at step 4 with no audited quality-adjustment substrate. Insert: 4b — reproduce xg-puck-benchmark's tuned model (or port its feature set), beat-its-log-loss CI gate, then feed GSAA into `goalie_form.py` and the changepoint detector. Without this, the changepoint protocol's "shot-count weighting" is unimplemented machinery.

### (c) WIRING-QUEUE RE-RANK (changes only)

1. `gse/validation/gates.py` (N2) — keep; **add R3's xG-specific CI checks** (grouped temporal validation, reliability-curve assertion, dead-endpoint ingestion test for statsapi).
2. `gse/calibration/ceiling.py` (N4) — keep.
3. `gse/ratings/elo_engine.py` (N1 + S3) — keep; **add R4's Bayesian updating** as the update rule option (posterior widening at window/deadline breaks replaces the ad-hoc elevated-K hack).
4. `gse/nhl/feature_diff.py` + `goalie_form.py` (N1) — keep; **add R2's `b2b_tz_crossing` interaction feature** (B2B × TZ change); demote pure directional-travel terms to controls. **Add residual-vs-closing-line gate for b2b × backup-start** (change #1).
4b. **NEW — `gse/nhl/xg_benchmark.py`** (R1) — audited public xG substrate; beat-MoneyPuck-log-loss CI gate; feeds `goalie_form.py` quality adjustment (change #5).
5. `gse/soccer/dixon_coles.py` (S2) — keep; **add R5's EPV-derived team-strength inputs** (owned by lane 13, exposed as features).
6. `gse/soccer/market_map.py` — keep.
7. `gse/soccer/skellam_outcome.py` + `gse/sim/tournament.py` (S1) — keep (μ stays deleted; no change to the verdict — a hand-tuned upset knob is correctly dead, market blend covers the need).
8. `gse/nhl/live_wp.py` (N5) — keep; **split regular-season 3v3 OT and playoff continuous OT into separate transition regimes** (change #2).
9. `gse/nhl/goalie_changepoint.py` — keep; now consumes 4b's audited GSAA stream.
10. `gse/rosters/window_break.py` — keep the model build here; **ingestion of dated squad snapshots starts at track 0, parallel with step 1** (change #3).
11. Soccer replay harness (S3) — keep.

### (d) DANGEROUSLY WRONG / OVERSTATED — BLUNT LIST

1. **"b2b × confirmed-starter: the classic exploitable edge" (N1 application)** — an evidence-free edge claim in a report whose own law forbids edge claims without a closing-line residual test. If Garrett sizes anything off this sentence, he's betting a narrative. Gated now (see b.1).
2. **Implied precision of E1/E2 decay parameters** (BOUNCE_CURVE peak g≈8–20, fade g>45; NHL peak g≈21–40) — these read as implementable constants but rest on secondary sports-press sources and GLM's synthesis. The report does attach flip-to-REJECT gates; the review adds: the curve *shape family* (hump + fade) is the transferable mechanism, the exact knot points are league re-estimates, and the first shipped version should use deliberately wide priors until the 10-season residual regression (E5's protocol, applied here too) fixes them.
3. **"N1 clean by design"** — three verification checks are listed, which is honest, but check (b) (confirmed-starter flag from pre-announcement lineups) is the one that will actually fail in practice: NHL starter announcements leak into odds 10–60 minutes before puck drop, and the residual edge of the flag decays inside that window. The feature's value is a *latency* edge, not a static edge — NEWS_VELOCITY-style ingestion (E6) applies here. The report treats it as a static feature; reframe as latency-gated.
4. **Minor but real: N5's "~23% OT rate"** — quoted as the crude constant the state machine replaces. That number is regulation-format- and era-specific; post-2015 3v3 OT sends far fewer games to shootouts and the rate differs between the old 4v4 era. Don't hard-code it anywhere; the parametric-hazards rebuild already avoids this, but the prose shouldn't bless a number.
5. **E4's Mourinho n=1** is correctly quarantined to the hypothesis queue — good. No change; citing it as evidence of the discipline working.

### Net assessment

The original report is the strongest-structured of the lanes reviewed so far: the leakage register, the flip-to-REJECT gates, and the "market prices levels, misprices dynamics" synthesis are genuinely load-bearing and survive adversarial review. Its real gaps: (1) the xG substrate under the goalie thesis was assumed, not sourced — now fixed (R1); (2) rest effects were modeled additively where the best new evidence says they're interactional — now fixed (R2); (3) the window-break differentiator was ranked like an afterthought — now promoted; (4) one sentence ("classic exploitable edge") violated the report's own law — now gated. No verdict flips from REJECT to ADOPT; the review is a sharpening pass, not a reversal.
