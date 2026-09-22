# Exhaustive improvement catalog — second pass (what the first playbook missed)

**Date:** 2026-09-21 · **Corpus:** `arxiv-deep/` @ `b83e12f1` · **First pass:** `RESEARCH_TO_PRODUCT_PLAYBOOK.md`  
**Purpose:** every remaining leverage item — method families, stress-tests, and **built-but-unwired** GSE code. Not a top-8 list. Use this as the checklist.

---

## 1. What the first playbook under-leveraged

| Family | First pass | Reality |
|---|---|---|
| Copulas / joint dependence | 1 line | **10+ ledgers** — parlays, correlated Kelly, win×over joint reliability |
| Survival / hazard / DeepHit | 0 | Injury risk as time-to-event; competing risks; fumble hazard |
| Hawkes / self-excitation | 0 | Scoring bursts; within-drive dependence; gap #14 |
| Contextual bandits / RL | 0 | **Named gap #4** — pick selection, abstain arms, Thompson |
| Optimal stopping | 0 | Wait-vs-act on line moves (belief martingale) |
| Order flow / LOB | 0 | Gap #3 — steam prediction, Kalshi tape, S-shape + NetLiq |
| Hierarchical Bayes / partial pooling | 1 line | QB⊂team⊂scheme; HFA; home-field **fixed effects** |
| LOPO validation | 0 | Leave-one-player-out leakage in every prop model |
| Online experts / Hedge / change-points | 0 | Weighted **median** beats mean; Kairosis; SAA |
| Distributional / CRPS / quantiles | 1 line | afCRPS training; IDR CDFs; tails for totals |
| Incentive / stakeless games | 1 line | Weeks 17–18 weights; MAE null baseline |
| Nested score dependence | 0 | Garbage-time: P(underdog \| favorite realized) |
| Meta-metrics D/S/I | 0 | Audit **metrics themselves**, not outcomes |
| Effective vs posted price | 0 | Fee shrouding; boosts with strings |
| Residual-as-ability | 0 | ML residuals as player skill |
| Atomic equilibrium prior | 0 | Cap latent mixtures at ≤I+1 support points |
| e-process / bipolar Kelly ceiling | 0 | inf-KL ≠ KLinf — model-class haircut on sizing |
| Content integrity / ads | 0 | Responsible-gaming compliance taxonomy |
| Assortment / choice models | 0 | DFS menu substitution nests |

---

## 2. Stress-tests of the current stack (trust nothing)

These **contradict or constrain** what we thought we knew. Treat as mandatory red-team items.

1. **Momentum is mostly dead.** 0249 memorylessness, 1183 heterogeneity-not-momentum, 1476 anti-persistence-only (off/def split). Aligns with MOVE-37 Koopman kill (p=0.89). Do not ship “hot hand” features without a null that kills them.
2. **Pooled ECE can hide minority collapse.** 0720: marginal conformal restored only 30.5% minority coverage (failure 0.8%); Mondrian +96.7pp. **ECE floors alone are not enough** if upsets/extremes are the product.
3. **Count-based confidence should not gate posting.** 0717: contextual drift breaks count/consensus confidence. Need ensemble disagreement + recency (C1 Spearman / C2 inversion checks).
4. **Equal-weight and weighted-mean ensembles fail.** 0793 weighted median required (mean skill −0.54); 0790 PW worst (0.11 vs ICI 0.48 Sharpe); 1336 **D-only trim is worst**. Max-min (2102.07081) is a floor, not the answer.
5. **κ=0.25 Kelly is folklore.** 1500: haircut from calibration-error width / inf-KL to bipolar class. 0795: diversity (not recency) drives combination under misspec.
6. **Mixed-effects HFA is schedule-biased.** 1050: 3.37 vs true 3.00 under nonrandom scheduling. **Default fixed effects** for any HFA term (founder-gated scale ~2.1 pts — do not edit blindly).
7. **Random splits leak player identity.** 2605.05487 + 1052: 90/10 random is leakage. **LOPO / rolling-origin** for every player-level prop model.
8. **Global isotonic/TS is under-specified.** 1480 local T(c); 1184 metrics themselves unreliable (D/S/I).
9. **Exotic topology is a trap.** 0015 TDA: 0.2pp / 242h. Require ≥1pp standalone before any “cool math” lane.
10. **Independence assumptions overbet correlated slates.** Copula-Kelly and Ising parlay joints (multiple ledgers) — same-game parlays and divisional clusters are where this bites.

---

## 3. Method families to implement (exhaustive transfer list)

### 3.1 Dependence / copulas / joint models
| id | Idea | Gate | Polish |
|---|---|---|---|
| 0014 | Bayesian bivariate conditional Poisson (H→A) | ≥5 ELPD vs independent | Market totals as intensity offset |
| 0239 | Sarmanov COM-Poisson (signed corr, free dispersion) | ≥0.01 nats/obs + cal slope [0.9,1.1] | δ(spread, pace) |
| 0277-class | Gaussian-copula / Ising joint for parlays & same-slate Kelly | Beats independence Kelly on max DD | Fréchet-violation audit on SGP |
| 0858-class | Nested P(fav)→P(dog\|fav score) | Exact-score LL vs Dixon-Coles λ3 | Garbage-time total inflation test |
| 1085 | Energy score + copula energy score (CES) | DM test vs univariate | Rank-adjusted copula |
| — | Joint reliability: win-prob decile × over-prob decile | Factorization test | Mondrian on joint cells |

### 3.2 Survival / hazard / competing risks
| id | Idea | Gate | Polish |
|---|---|---|---|
| 0622-class | DeepHit time-to-injury | C-index > binary MLP | Landmark-conditional estimand |
| 0437 | Competing process hazards (drive outcome) | Beats multinomial on held-out | Time-varying baseline in drives |
| 1906.01760 polish | Per-frame fumble hazard | Joint multi-task | Dropback decision heads |
| 2512.00203 | Hawkes drive threat | Beats independent product | — |
| 0026 | Random-memory Hawkes “hot” τ~Gamma, ν≈2× | ν>0 p<0.01, ΔBIC>10 vs Poisson | Multivariate excite/inhibit TD↔TO |
| 2601.14727 / 2608.27362 | PlusDC-BT + QB component u_i=τ_team+q_QB | LL vs plain BT | Injury moves q without refit |

### 3.3 Selection, abstention, bandits
| id | Idea | Gate | Polish |
|---|---|---|---|
| 0743 | CRC loss-rate ≤ α on posted slate | ≤α−0.01 at ≥60% volume | Mondrian CRC |
| 0700 | Dual-threshold conformal + Youden-J | ≥1pp ROI vs fixed 70% | Per-regime (weather, short week) |
| 1154 | Exact-coverage γ randomization | Coverage within 0.05 | Adaptive c_w by slate quality |
| 1157 | Lipschitz version-space certificates | Selective-ROI ≥ disagree at match cov | Local Lipschitz |
| 0717 | C1/C2 pre-deploy diagnostics | Zero C2 inversions | Auto-kill on 4-week C2 break |
| 0720 | Mondrian conformal K=3 (cover/push/no-cover) | Minority cov ±3pp | Online adaptive under drift |
| 2609.13564 | Greedy-Gibbs / Thompson pick selection | Cumulative CLV ≥ current rule | Anneal η; coverage-risk abstain arm |
| 0810-class | Online model-selection bandits | Regret vs best expert | Hedge over feature families |

### 3.4 Ensembles / aggregation
| id | Idea | Gate | Polish |
|---|---|---|---|
| 0793 | Kairosis change-point + **weighted median** | Skill >0.04 | Adams-MacKay online BOCPD |
| 0790 | ICI/CU fusion unknown correlation | ≥1% LL vs best single | Epistemic/aleatoric split |
| 0795 | DTVW diversity particle filter | ≥2% CRPS vs equal weight | Tail-quantile diversity |
| 0788 | FFORMA meta-learned weights | Beats average | Features from slate context |
| 1336 | RAD trim (Tukey+ADT); **never D-only** | RAD ≥ A > None | Scoring-rule ADT |
| 1490 | Hierarchical reconciliation (game↔season, props↔team) | ≥0.002 Brier 2/3 markets | Regime weights early/late |
| 0625 | SAA Brier mixable η=1 | Regret ln K + ≥0.002 Brier | Discounted SAA |
| 2102.07081 | Max-min log/linear pool + OGD | Log-loss vs equal | Contextual weights |
| 2603.10916 | Rank-space fusion + cognitive diversity | Beats score-fusion 2/3 seasons | Adaptive within-season |

### 3.5 Calibration upgrades (beyond first pass)
| id | Idea | Gate | Polish |
|---|---|---|---|
| 1074/0738/0762/1480/0724 | ENIR / spline / per-cell θ / local TS / trees | (see playbook) | Mondrian mix |
| 0469 | CORP MCB/DSC/UNC | MCB ≥ 0.15×UNC | Week block bands |
| 0748 | Train on **afCRPS α=0.95** | ≥2% CRPS + PIT ok | +twCRPS tails; watch spread collapse |
| 1084/1082 | IDR / GP-PIT distributional | ≥5% CRPS | GPD tail graft |
| 1184 | Meta-metrics D/S/I (+ R Shapley) | Drop metrics D<0.5 or I<0.2 → ≥0.002 LL | 4D D/S/I/R |
| 0462 | Boldness recal (max sharpness s.t. cal posterior) | LL ≤ MLE AND SD ≥ 1.15× | Publication extremization |

### 3.6 Market microstructure / timing
| id | Idea | Gate | Polish |
|---|---|---|---|
| 0245 | LOB order-flow, S-shape + NetLiq, steam predict | R² lift ≥15pp; SL precision ≥60% | Avoid taker in SL regimes |
| 2509.14645 | Late-move path velocity/accel | Late coeff p<0.01 adds to CLV | Fade public steam |
| 2609.06739 | Profit-bias identity | ≥90% decomposable | handle% vs bet% |
| 0240-class | Live activity SSM / overreaction | ΔAIC ≥ 10⁴ hurdle | News residual clusters |
| Optimal stopping | Act-now vs wait on belief martingale | Beats naive “always post at T-0” | Inventory/steam bookmaker sim |
| Fee-aware | Effective price (boosts, cash-out fees) | CLV on effective ≠ posted | US shrouding dormant but measure |

### 3.7 Player / props / fantasy
| id | Idea | Gate | Polish |
|---|---|---|---|
| 2605.05487 | **LOPO CV** mandatory | LOPO vs pooled gap quantified | Residual-as-ability |
| 2509.25858 | Aging curves + archetypes | Beats last-season / linear age | Supervised clustering head |
| 2603.11016 | Restricted Shapley on plays | Rank corr ≥0.8 bootstrap halves | Tracking coalitions |
| 0023 | Assortment nests (Dream11) | Rand ≥ Benson +0.05 | Contest substitution clusters |
| 2512.00203 | Hurdle XGBoost drive threat | Beats EP baseline | Hawkes aggregate |
| 1311 | Ballpark/stadium × unit residual WLS | Validity home/away | Hierarchical park×team; wind×kicker |
| 0243 | IRL coaching reward; gap to nfl4th = coaching-alpha | Recover synthetic reward | Neural reward ranks |
| 0222 | Atomic equilibrium ≤I support points | ≤2-atom beats logistic ≥0.005 nats | Reveal-time beliefs |
| 0049 | SNR σ_η/σ_indiv gate for diff vs abs features | ≥0.01 AUC when ratio >0.4 | Env-loading λ dome/outdoor |
| 1500 | Kelly ceiling inf-KL bipolar | ≥90% full-Kelly growth at ≤70% max DD | Block-slate e-processes |
| 1468 | Safe-lead erf(L/√(4Dτ)) live feature | ≥1% log-loss | Jump-diffusion 3/7-pt |
| 1493 | Weather multi-lead chaining + RQE | Direct 24h > iterative | RQE on high-wind totals |
| 1118 | Manipulative ad taxonomy | Deceptive F1 ≥0.60 | Affiliate compliance |
| 0861 | Scoreline partial-credit model eval | Must re-rank vs raw acc | Extend to CLV objective |
| 0122 | ATB rate limiting | 429s −50% | Quota-aware cold start |
| 0126 | SportsQL text-to-SQL | ≥75% EM, SELECT-only | Two-stage joins |

### 3.8 Outside-the-box / new theory (carry into Deep Research)
1. **Atomic equilibrium priors** (0222) — information-theoretic cap on latent play-type mixtures.
2. **Random-memory Hawkes** (0026) — finite-memory self-excitation vs classical infinite-memory.
3. **Sarmanov COM-Poisson family** (0239) — signed dependence + independent dispersion.
4. **Bipolar / e-process Kelly ceilings** (1500) — model-class uncertainty haircut (inf-KL ≠ KLinf).
5. **Assortment design + substitution nests** (0023) — deliberate menu experiments as data.
6. **Metric meta-science D/S/I/R** (1184) — metrics are objects of measurement.
7. **Content-integrity classifiers** (1118) — responsible-gambling surface quality.
8. **Coaching-alpha via IRL** (0243) — winners-as-experts reward inference.
9. **Risk-neutral compensated-Poisson live pricing** (0097) — in-play risk-neutral intensities.
10. **Safe-lead diffusion Q(L,τ)** (1468) — closed-form live WP feature with arcsine laws.

---

## 4. Built-but-unwired GSE (wire before researching more)

Highest ROI is often **shipping code we already tested**. From the asset audit:

| Priority | Wire this | Effort | Accuracy upside |
|---:|---|---|---|
| 1 | `pfr-advstats-via-nflverse` rights gate → `pfr_adv_stats` / `player_rush_profiles` | M | HIGH — only free missed-tackle/YAC |
| 2 | A14 FTN rates into props (ΔBrier already measured −0.00093) | M | HIGH |
| 3 | `EVENT_ODDS_INGEST_ENABLED` → full **props-hb** stack | S+verify | HIGH |
| 4 | Calibration bakeoff winner → `calibration-apply` | M | HIGH |
| 5 | `online-beta-sliding-window` on book path | L | HIGH |
| 6 | Mondrian + CQR intervals **report-only** on cards | M | MED-HIGH |
| 7 | `calibration-tournament.ts` weekly map selection | S | MED |
| 8 | `no-bet-adversary` + `no-bet-strength` second opinion (withhold-only) | S | MED |
| 9 | Writer for `gate_decisions` (3 dead readers) | M | MED (honesty) |
| 10 | `rpcp-conformal-bridge` uncertainty band | S | MED |
| 11 | Replace empty `clvPositive` reads with `clvVerdict`; wire `clv-decomposition` | S | MED |
| 12 | `reconstruction/separation-surface` → WR/TE props | L | MED |
| 13 | `verifier/factgraph` scorecard every mint | M | MED (trust) |
| 14 | `model-parliament` + Murphy-RES on `/cockpit/calibration` | S | LOW-MED |
| 15 | `robust-kelly` / `calibration-kelly-bridge` sizing display | M | LOW (hit-rate) |

**Empty data still empty:** `Signal` (no wire writers), `product_events`, `CalibrationProposal` (seed-only), `clvPositive`/`clvPoints`/`clvCents`/`clvComputedAt`.  
**Stale note:** LAST_PLAN “pfr 0 importers” is wrong — writer+cron exist; **clearance-denied** keeps rows at 0.

---

## 5. Research questions we still cannot answer (send outward)

1. Mondrian conformal: minority-coverage restore curve at α=0.10 when pooled ECE already green?
2. ICI/CU vs PW vs average on **unstable** source correlation (Diebold–Mariano); does DTVW help beyond ICI?
3. Mixed vs fixed HFA bias under NFL SOS — does fixed HFA cut closing-spread MAE by ≥0.2?
4. Selective ROI: Lipschitz certificates vs C1/C2 disagreement vs fixed confidence at matched coverage; ConSat ±0.05 hold?
5. afCRPS (+twCRPS) training for totals/margins: CRPS ≥2% and 90th-pct calibration without spread collapse?
6. Copula-Kelly vs independence-Kelly on known-correlated NFL slates (same-game, divisional): max DD and growth?
7. Hawkes “hot” offense: does multivariate excite/inhibit beat Poisson on next-score Brier after schedule adjustment?
8. LOPO vs pooled gap size on receiving-yards props — how much of published prop skill is identity leakage?
9. Atomic ≤I mixtures vs rich latent class on play-type: when does parsimony win?
10. e-process / bipolar Kelly haircut: empirical growth-vs-DD vs fixed κ=0.25 on GSE pick history?

---

## 6. Definition of “all leverage captured”

A transfer counts only when:
1. Ledger id + method + **numeric gate** recorded.
2. Pre-registered factor/experiment (`docs/factors/*.yaml`) with kill_line **before** run.
3. Frozen-holdout / time-ordered score — never train-era fit.
4. Status CANDIDATE or DEAD (or BLOCKED with reason).
5. If CANDIDATE and L11 passes → `model-version` PR. Else published as DEAD (the kill ledger is the product).
6. Wire-existing items get a production caller + test, or an explicit BLOCKED line.

**Do not** ship a gate flip, floor change, or invented number to “complete” a row.
