# [1476] Predicting sports scoring dynamics with restoration and anti-persistence (arXiv:1504.05872v1)

**Citation:** Leto Peel, Aaron Clauset (2015). *Predicting sports scoring dynamics with restoration and anti-persistence*. arXiv:1504.05872v1. URL: https://arxiv.org/abs/1504.05872
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf, 12 pages, §§I–X + Tables I–V + Figs. 1–9 read in full).
**Verdict:** ADAPT
**Verdict rationale:** interpretable generative models of within-game scoring (latent skills + lead-restoration + last-scorer anti-persistence) with direct application to GSE's live in-game win-probability and next-score models; the NFL-specific finding (independent anti-persistent, no restoration) is itself actionable.

## 1. Research question
Given a partially observed game, two online prediction tasks: *Who will score next?* and *Who will win?* — and the underlying mechanism question: does the probability of scoring depend on game state (lead size → "restoration"; last scorer → "anti-persistence") or only on latent team skill? Hypotheses: H1 (independence — skill alone matters) vs H2 (state dependence). Tested via a family of increasingly complex generative models on four leagues' scoring-event sequences.

## 2. Dataset / schema
STATS LLC scoring-event data (proprietary; not public): per game, sequence of scoring events with time, scoring team/player, point value. Coverage: CFB 10 seasons 2000–2009 (461 teams, 13,689 preprocessed games, 117,752 events, mean 8.60 events/game); NFL 10 seasons 2000–2009 (32 teams, 2,561 games, 20,115 events, mean 7.85); NBA 9 seasons 2002–2010 (30 teams, 11,744 games, 1,096,179 events, mean 93.34); NHL 9 seasons 2000–2003, 2005–2009 (30 teams, 10,259 games, 59,227 events, 5.77/game; 2004 lost to lockout). Preprocessing: remove OT events (0.88% of events), remove one-team-scored games (6.24% of games), merge simultaneous/ambiguous-order events preserving the running lead (lead L_i = Σ φ_j δ(ψ_j,r) − φ_j δ(ψ_j,b), Eq. 1). Timestamps discarded; only event order used.

## 3. Method / model
Latent-skill Bradley–Terry extensions, one fitted per season (skills fixed within a season), via MCMC. Four models:
1. **Independent:** P(ψ_i=r) = d_rb = π_r/(π_r+π_b) (Eq. 2–3); π∈[0,1] latent skill.
2. **Restorative:** P(ψ_i=r) = d_rb + ℓ^r_i c_rb, c_rb = γ_r+γ_b (Eq. 4–5), γ = per-team "restorative force" (γ<0 restorative, >0 momentum). Logisticized to σ(m_rb ℓ+v_rb) with m_rb=4c_rb, v_rb=−4(1/2−d_rb) by matching gradients at the 1/2 symmetry point (Eq. 6–9; Fig. 3).
3. **Independent anti-persistent:** separate offensive/defensive skills; P(ψ_i=r|ψ_{i−1}=r)=π^def_r/(π^def_r+π^off_b), P(ψ_i=r|ψ_{i−1}=b)=π^off_r/(π^off_r+π^def_b) (Eq. 10) — encodes forced possession change after a score.
4. **Restorative anti-persistent:** combination of 2 and 3.
Lead perspective ℓ^r_i is r's lead just before event i; scoring function rotationally symmetric: P(ψ_i=r|L_{i−1}) = 1 − P(ψ_i=b|−L_{i−1}).

## 4. Equations & assumptions
- (1) Lead: L_i = Σ_{j=1..i} φ_j δ(ψ_j,r) − φ_j δ(ψ_j,b).
- (2) BT: P(r beats b) = π_r/(π_r+π_b). (3) Independent per-event scoring.
- (4)–(5) Restoration: P(ψ_i=r) = d_rb + ℓ^r_i c_rb; c_rb = γ_r + γ_b = c_br. Game-level restoration ⟺ c_rb < 0.
- (6)–(9) Logistic matching: σ(x)=(1+e^{−x})^{−1}; σ'(mℓ+v) = m e^{mℓ+v}/(e^{mℓ+v}+1)² = c_rb at symmetry; v_rb = −4(1/2−d_rb); m_rb = 4c_rb.
- (10) Anti-persistence with offense/defense split (above).
- (11) First-order Markov baseline: P(ψ_{i+1}=ψ_i) from empirical bigram frequencies over first T games.
- Assumptions: team skill fixed within a season; scoring events conditionally independent given skills + game state; OT scoring is a different process (excluded); simultaneous events merged without loss; timestamps uninformative beyond order; BT form adequate for per-event contests.

## 5. Features / target
Inputs: ordered sequences of (point value φ_i, scoring team ψ_i∈{r,b}) per game; derived states: running lead L, previous scorer ψ_{i−1}. Targets: (task A) ψ_i — which team scores next; (task B) game winner given the state trajectory up to event i. For task B, point values predicted as season mean ⟨φ⟩ (a stated simplification).

## 6. Validation design
Time-ordered: each season fitted separately via MCMC; goodness-of-fit = 10-fold CV held-out log-likelihood per season per sport (Tables II–V, two best highlighted). Online prediction: train on first T games of a season (T ≥ 10% so every team has played), predict all remaining games' events; accuracy = AUC over all predictions across all seasons. Task B: train on first 30% of season, predict winner observing game states progressively 0.1 ≤ i/N ≤ 0.9. Baselines: (a) leading model (team ahead scores next/wins; coin flip at L=0); (b) standard BT on win-loss records; (c) first-order Markov (Eq. 11). Also: standard randomization tests (serial, Wald–Wolfowitz runs, autocorrelation) shown to lack power on short sequences (Fig. 2); semi-parametric bootstrap regenerating scoring functions from the best skill model (Fig. 4).

## 7. Numerical results / baselines
- **Bigram self-rates (rr+bb):** NBA 0.35, CFB 0.45, NFL 0.44, NHL 0.49 — NBA strongly anti-persistent.
- **Held-out log-likelihood (higher = better):** NBA — restorative anti-persistent best all 9 seasons (e.g., 2002: −75,627 vs independent −80,849, indep. anti-pers. −75,655); NFL — independent anti-persistent favored in 8/10 seasons (e.g., 2000: −1,278 vs indep −1,286; restorative models always worse); CFB — independent best (only sport strongly favoring independence; e.g., 2000: −7,487 vs restorative −8,114); NHL — no clear winner (indep. anti-pers. best-or-2nd in 8/9, indep. best-or-2nd in 7/9, margins tiny; restorative tentatively preferred given faceoff design + negative scoring-function gradient).
- **Who-scores-next AUC (Fig. 5):** best model significantly beats all baselines for CFB and NBA (95% CI); for NFL/NHL beats baselines after ≥50% of season observed. First-order Markov is the strongest baseline — best NFL predictor early in the season (until ~30% observed), near-best for NBA (captures anti-persistence) — but is beaten later because it cannot learn team heterogeneity.
- **Who-wins AUC (Fig. 6):** best model ≥80% accuracy at halftime in all four leagues; beats BT baseline early (BT cannot update mid-game); leading baseline barely above chance.
- **Skill dynamics (Fig. 7–9):** Spearman rank correlation of seasonal skills shows strong diagonal (skills evolve slowly); CFB highest long-term correlation (regional recruiting monopolies vs pro free agency); champions not necessarily top-skilled (e.g., Patriots/Steelers, Lakers/Spurs highlighted); LeBron's 2010 departure drops Cleveland's offensive skill to bottom rank — sanity check on interpretability.

## 8. Code / data availability
None stated. STATS LLC data proprietary (copyright 2015).

## 9. Leakage & limitations
Adversarial notes: (1) Skills fixed per season and fitted on the *full* season's events for the goodness-of-fit tables — the CV is over games within a season, so parameters see other games from the same season; the online-prediction protocol (train on first T games) is the clean one. (2) OT excluded (0.88% events) — the model cannot score overtime, which matters for win betting. (3) Point values collapsed to season mean for winner prediction — a real weakness for spread/total tasks; the generative model over *teams* is strong but the *points* model is naive. (4) Timestamps discarded — ignores clock/score interactions (pace, garbage time, timeouts); the "safe lead" literature they cite handles time but they don't integrate it. (5) NHL 2004 missing; one-team games dropped (6.24%) — selection bias toward competitive games. (6) Data is 2000–2010 — NFL has changed (OT rules, 2-pt, PAT distance, kickoff rules); coefficients won't transfer directly. (7) AUC figures are read from plots, not tabulated — exact AUC values not quoted in text. External validity: the framework is sport-agnostic and the NFL-specific empirical finding (anti-persistence yes, restoration no) matches possession-alternation rules — robust to the era concern at the qualitative level.

## 10. GSE overlap
Existing-research-map check: GSE corpus has 4th-down WP models (nfl4th + correction literature), EPA-based efficiency, and market microstructure (CLV) — but **no within-game generative scoring-dynamics model with latent skills, and no "who scores next" / live-lead model built on scoring sequences**. The map's "Skellam, Poisson, Dixon-Coles" are final-score models, not online event models. New capability: a live in-game win-probability engine grounded in fitted scoring dynamics rather than generic WP curves.

## 11. GSE implementation spec
Rebuild the NFL arm on modern data: nflverse pbp 2009–2025, events = scoring plays (TD+try, FG, safety), per-season fits of the independent anti-persistent model with offense/defense skill split (Eq. 10) — the paper's NFL winner — via Stan/PyMC MCMC or MAP. Serve two products: (a) live "next score" probabilities conditional on game state (lead, who scored last) for in-game content and live-betting edges vs stale market WP; (b) an online win-probability model that updates per scoring event, benchmarked against existing WP baselines (nfl4th WP, ESPN). Replace the naive mean-φ with an empirical point-value distribution per team/season for spread/total extensions. Data: nflverse (public). Effort: ~1 week for the core refit + live API; per-season refits are cheap (NFL: 2,561 games, ~20k events — minutes of MCMC).

## 12. Reproducible test
Dataset: nflverse pbp 2015–2024; protocol mirrors the paper: fit on first 30% of each season's games (time-ordered), predict remaining games' scoring events and winners. Metrics: AUC for who-scores-next and who-wins vs baselines (current market-implied WP from odds API de-vigged as the BT analogue, first-order Markov, and GSE's existing WP model). Split is strictly time-ordered — no within-season leakage.

## 13. Acceptance / rejection gate
ADAPT-accept iff the refit independent anti-persistent model beats the de-vigged market-implied next-score baseline by ≥0.01 AUC on who-scores-next AND beats GSE's existing WP model by ≥0.005 AUC on who-wins at halftime, over the 2022–2024 test seasons; otherwise reject (the dynamics add nothing over markets).

## 14. Improvement experiment
Clock-aware extension: add game-clock remaining and timeout state as covariates in the logistic (Eq. 8–9) form — σ(m_rb ℓ + v_rb + α·clock_frac + β·(clock_frac × ℓ)) — testing whether garbage-time/urgency effects (the "safe lead" phenomenon, Clauset et al. 1503.03509) create a state dependence the paper's order-only model misses; if the clock-interaction term improves held-out log-likelihood on 4th quarters specifically, fold it into the live engine.
