# [0274] Pre-game paired-comparison modeling of professional League of Legends map outcomes (arXiv:2609.08060)

**Citation:** Min-Ren Guan, Shen-Ning Tung (2026). *Pre-game paired-comparison modeling of professional League of Legends map outcomes*. arXiv:2609.08060. URL: https://arxiv.org/abs/2609.08060
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1322 lines).
**Verdict:** ADAPT — a hybrid one-stage dynamic+stable paired-comparison architecture (ridge-shrunk team strengths + EWMA form, fit end-to-end on log-loss, natively calibrated) that statistically ties the strongest two-stage mixed-model rival and matches Polymarket on per-game contracts; port the architecture to NFL game-outcome forecasting and adopt the paper's leakage-proof market-benchmark protocol.

## 1. Research question
How much modeling machinery does pre-game win-probability forecasting actually require? Specifically: (a) does a minimal one-stage logistic model — same-side EWMA form + a ridge-shrunk stable team-strength block + a schedule-assigned first-pick covariate, fit end-to-end on the forecasting loss — concede any held-out accuracy to the strongest two-stage composite mixed model (REML + BLUP + Platt) the authors can build; (b) do both improve on the classical dynamic (Cattelan–Varin–Firth) and static (Stefani) paired-comparison benchmarks; (c) does the forecaster price maps as accurately as Polymarket?

## 2. Dataset / schema
- **Corpus:** 5,893 games collected, **5,135** retained (require a populated first-pick assignment): six regional LoL leagues (LPL 1,822; LCK 1,276; LEC 697; LCP 432; CBLOL 277; LCS 216) plus Worlds 190, MSI 157, First Stand 68, spanning ~80 teams and ~80 patches over 2024–2026 (counts as of July 2026).
- **Sources (no common join key; reconciled by team/date/patch):** lolesports broadcast telemetry (schedule, metadata, 10s-cadence gold/kills/objectives; source of outcome Oi and end-game margins; unofficial endpoints via community API docs); Leaguepedia MediaWiki Cargo DB (patch ids, rosters, **first-pick draft assignment** — sole source of the draft covariate); **Polymarket API** (per-map "Game N winner" prices, external benchmark only, never used in fitting).
- Schema: map i = blue team b(i) vs red team r(i), patch p(i), time ti; blue-win indicator Oi∈{0,1}; blue-perspective margin response Yi. Code/data: ingestion + estimation + backtest code "written with the assistance of" Claude and reviewed by authors — **no repository link given**.

## 3. Method / model
**Proposed (one-stage, minimal, d=1):** EWMA same-side form states per team (E^B, E^R), zero-initialized at debut, decay λ grid-selected; win probability is a single logistic expression
**pi = expit(β0 + γFP·1[blue is first-pick_i] + βB·E^B_b(i)(ti) − βR·E^R_r(i)(ti) + θ_b(i) − θ_r(i))** — 4 coefficients + ridge-shrunk stable team block θ. Fit by one convex L-BFGS minimization of penalized log-loss. Richer family members (d=4, d=10) fold directional end-game features into the EWMA update.
**Second candidate (two-stage composite mixed model):** Gaussian linear mixed model **Yi = α + γFP·1[first-pick] + θ_b(i) − θ_r(i) + γ1·S^B − γ2·S^R + εi** on z-standardized composite **Yi = 0.50·Oi + 0.25·Δg/σg + 0.15·Δk/σk + 0.10·ΔT/σT** (gold/kills/towers margins), REML variance components, BLUP strengths shrunk by reliability κt = σ̂²θ/(σ̂²θ+σ̂²/nt), then a **Platt map** p = expit(c0 + c1·Ŷ) fit in-sample for probabilities. λ1=λ2=0.3 fixed a priori.

## 4. Equations & assumptions
- EWMA form recursion: **E^B_b(i)(ti) = (1−λ)·E^B_b(i)(t−) + λ·x(t−)**, x = signed game summary (±1 for d=1); Layer-2 analogue **S^B_b(i)(ti) = (1−λ1)·S^B_b(i)(t−) + λ1·O(t−)**.
- Proposed: **pi = expit(β0 + γFP·1[blue first-pick] + βB·E^B_b(i)(ti) − βR·E^R_r(i)(ti) + θ_b(i) − θ_r(i))**; penalized log-loss **−Σ[Oi·log pi + (1−Oi)·log(1−pi)] + τ/2·‖θ‖²**.
- **Key methodological equivalence (the paper's own construction):** the ridge penalty is exactly the **MAP estimate of a logistic GLMM with θt ~ N(0, σ²θ)**, with correspondence **τ ↔ 1/σ²θ**; unseen teams get θ=0 (prior mean) under both architectures.
- Two-stage: Yi composite as above; Platt **p = expit(c0 + c1·Ŷ)**; BLUP reliability weights κt.
- RPS for r ordered categories **RPS = (1/(r−1))·Σᵢ(Σⱼ≤ᵢpj − Σⱼ≤ᵢej)²**, which **reduces exactly to the Brier score (pb−O)²** for the 2-outcome map market; baseline 0.25 = uninformative forecast.
- Assumptions: team strengths exchangeable under a Gaussian prior (shrunk, not free); form is geometrically discounted; first-pick is a schedule-assigned covariate (exogenous); cross-region pooling justified (no patch fixed effects fit); walk-forward + global time split valid because features are path-dependent — **random CV is declared invalid**.

## 5. Features / target
- Inputs: per-team same-side EWMA of past signed results (d=1), schedule-assigned first-pick indicator, latent stable strength block θ (ridge).
- Target: pre-game blue-win probability pbi; scored on held-out log-loss/Brier. Market leg: matched Polymarket per-map prices.

## 6. Validation design
- **Global time split:** train oldest 80% / test newest 20% (test sits after roster turnover + patch drift).
- **Per-game walk-forward:** refit at every scored game on all strictly prior games (≥500 minimum), 4,605 games scored — the production cadence; hyper-parameters selected once on first 500 games, frozen thereafter.
- Test games scored only if both teams have appeared on their side (identical-game paired tests); unseen-team fallback θ=0 isolated (0.2312 with fallback vs ~0.23 without; near 0.27 on the 115 fallback games).
- **Paired Diebold–Mariano inference** on per-game score differences (di = sᴬi − sᴮi, t = d̄/SE, SE = sd(di)/√n); per-league rows Bonferroni ×8. Market backtest: leakage-proof by id-keyed exclusion of the predicted game from its own window (not timestamp cutoff), anchored to first telemetry frame; coherence check: backtest model Brier 0.2260 ≈ independent walk-forward 0.2263 on same window.

## 7. Numerical results / baselines
- **Holdout (nte=912):** proposed **0.2230** vs two-stage **0.2257** vs Cattelan dynamic BT 0.2351 (λ=0.1 best) vs Stefani static least-squares 0.2301 vs BLUP static boundary 0.2268. Decomposition: dynamic-only 0.2351 → static-only 0.2268 → both blocks 0.2257 → proposed one-stage 0.2230; BLUP shrinkage alone worth 0.0033.
- **Walk-forward (4,605 games):** proposed **0.2207** vs candidate 0.2215 (paired Δ=+0.0008, p=0.40, score corr. 0.944) vs Cattelan 0.2319 — stable-strength advantage 0.0112/0.0104, robust across protocols.
- **Parity:** architectures statistically indistinguishable on every protocol and window (holdout Δ=+0.0027, p=0.22); d-ablation monotone-degrading (0.2230 < 0.2242 < 0.2258 for d=1,4,10) because end-game features are mutually correlated 0.89–0.96.
- **Native calibration:** walk-forward slope **0.995**, intercept −0.009 for proposed (no calibration step); candidate's in-sample Platt slope 0.67 holdout; out-of-fold Platt recovers 0.2257→0.2248.
- **Rank validity:** Spearman between end-of-training team ranking and test win rates: 0.438 (proposed θ) vs 0.436 (BLUPs) over 50 teams.
- **vs Polymarket (928 matched maps):** per-game contracts parity — Δ=+0.005 (95% CI −0.004 to +0.014, candidate) and +0.006 (−0.002 to +0.015, proposed); including 136 decider maps (series-winner fallback prices) market modestly ahead: Δ=+0.0093/+0.0097, **p=0.025 both**; deficit concentrated on Worlds (only slice surviving Bonferroni ×8); dense domestic leagues at parity, LPL nominally model-ahead.
- Ablation flatness: λ ∈ {0.1…0.9} changes walk-forward Brier by 0.0002 total; τ ∈ {2,4,8} moves training log-loss <0.005; selected (λ,τ)=(0.9,4) walk-forward ≡ τ=4 ↔ σ̂θ=0.5 log-odds.
- LCP thin-league diagnostic: proposed 0.2648 vs two-stage 0.3055 — ridge identifiable where REML goes singular.

## 8. Code / data availability
Authors state the ingestion/estimation/backtest/figure code was LLM-drafted and author-reviewed, but **no repository or data URL is provided** in the extracted text; corpus depends on unofficial lolesports endpoints + Leaguepedia + Polymarket API, with two documented provider quirks (paginated schedule must be paged exhaustively; some leagues record game-end not game-start timestamps — anchor to first telemetry frame).

## 9. Leakage & limitations
- Three providers share no join key — standing exposure to silent provider-side convention changes; unofficial endpoints.
- In-sample Platt map mildly inflates the candidate's absolute scores (bounded at 0.0009 by the out-of-fold refit).
- First-pick is a LoL-specific draft covariate with no direct NFL analog; blue/red side asymmetry also LoL-specific (NFL analog: home/away + rest edges, handled separately in GSE).
- Classical random-effect fits go singular on thin slices (LCP) — a warning for any GSE league-subset fitting.
- Market window limited (Polymarket per-game LoL only from Oct 2025; 928 matched maps); decider prices fall back to series-winner contracts (market-side only).
- Authors concede: no patch fixed effects; series-level modeling left for future work; day-of information (roster news) not consumed — exactly where the market beats them (Worlds, deciders).

## 10. GSE overlap
- **Paired comparison is inventoried but this architecture is new.** The existing-research-map already covers Bradley–Terry, Plackett–Luce, Elo/Glicko/TrueSkill, plus CLV, de-vigged consensus, line movement/steam, and market-implied ratings — but **nothing** combining a *stable ridge-shrunk strength block with a dynamic EWMA form term in one end-to-end logistic fit*, nothing on native calibration of such models (GSE's engine emits win probabilities; calibration slopes are an open question), and **nothing on a leakage-proof model-vs-market benchmark protocol** (id-keyed exclusion, first-telemetry-frame anchoring, staleness filters, walk-forward coherence check).
- Direct fill: (a) the **MAP↔ridge equivalence** gives GSE a principled shrinkage story for team-strength logistic models (τ ↔ 1/σ²θ) that is more robust than REML on thin slices; (b) the **paired DM testing discipline** (paired SE, never marginal; Bonferroni across slices) is immediately reusable for GSE model-comparison claims; (c) the **d-ablation result** — richer same-game features *hurt* because margins are near-collinear with the outcome — is a caution for any GSE feature-engineering on box-score margins.

## 11. GSE implementation spec
- **Port the one-stage architecture to NFL:** for each game, team form = EWMA of past same-venue (home/away) signed results; stable strengths θ per team with ridge penalty τ; logistic link on (spread-adjusted) win; covariates: home indicator (NFL analog of first-pick/blue-side), rest differential, and division-game indicator as exogenous fixed effects. Select (λ, τ) by inner chronological split on log-loss; fit by L-BFGS on the full team-season panel.
- **Calibration gate:** require walk-forward calibration slope ∈ [0.9, 1.1] and intercept ∈ [−0.05, 0.05] before any probability enters content or CLV comparisons — the paper's native-calibration result (slope 0.995) is the bar, and no Platt step is allowed to paper over miscalibration.
- **Adopt the market-benchmark protocol:** evaluate the NFL model against de-vigged consensus moneylines with id-keyed backtests (predicted game excluded from its own training window by game id, never by timestamp cutoff), staleness filters on line timestamps, and the walk-forward coherence check; report paired DM tests with Bonferroni correction across slices (division/non-division, primetime, etc.).
- Owner: stats/calibration lane (Mimo's lanes per memory); data: existing GSE game panels + consensus lines already in the corpus.

## 12. Reproducible test
- Rebuild the one-stage model on GSE's 2020–2025 NFL game panel (moneyline target): EWMA same-venue form (λ grid {0.1,…,0.9}), ridge θ (τ grid {0.25,…,16}), home + rest + division covariates; walk-forward from a 500-game minimum.
- **Numeric gate:** walk-forward Brier must (a) beat a static ridge-only boundary (β_form=0) and a form-only boundary (τ→∞) by paired DM p<0.05, and (b) achieve calibration slope ∈ [0.9,1.1]; (c) the combined model's paired Δ vs de-vigged consensus must have a 95% CI whose lower bound excludes −0.015 (parity-with-market bar from the paper: model not worse than market by more than 0.015 Brier on per-game contracts). Record (λ, τ) selection stability across folds.

## 13. Acceptance / rejection gate
- **Accept the port if:** the combined stable+dynamic model beats both boundaries on walk-forward Brier with paired p<0.05 AND calibration slope ∈ [0.9,1.1] AND the market-parity CI condition holds. If the EWMA form term adds nothing over the static ridge block (as the paper's monotone-λ diagnostic would reveal — dynamic-only model demanding the slowest decay), **reject the form term** and keep only the static block: the paper's own lesson is that parsimony wins ties.

## 14. Improvement experiment
- **Experiment A (NFL analog of the Worlds slice):** the paper's deficit concentrates where cross-region strength transfer is hardest. Test whether the NFL model likewise degrades on the hardest transfer slice — **inter-conference games and playoff games** (teams with no common-opponent history): compute paired Δ vs consensus separately for intra-conference, inter-conference, and playoff slices; if the model loses >0.01 Brier to the market on inter-conference games, add a conference-interaction term on θ (separate ridge blocks per conference) and re-test.
- **Experiment B (series analog):** port the paper's proposed-but-unbuilt **series-level RPS** (§4.3/§6) to NFL **playoff-series-free analog: season series / division-title races** — i.e., a multi-category RPS over ordered season outcomes (win division / wild card / miss) from per-game win probabilities, rewarding probability mass placed "close" to the true ordinal outcome. Compare against the engine's current season-simulation outputs.
- **Experiment C (calibration as a product):** the paper's natively-calibrated probabilities (slope 0.995) vs GSE engine probabilities — run the same walk-forward calibration diagnostic on the engine's published pick probabilities for 2024–2025 and publish the slope/intercept as a calibration card; if the engine is miscalibrated, the one-stage logistic recalibration (fit on engine outputs, ridge-penalized) becomes the fix.
