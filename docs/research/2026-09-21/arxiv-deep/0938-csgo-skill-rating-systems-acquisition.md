# [0938] Skill Issues: An Analysis of CS:GO Skill Rating Systems (arXiv:2410.02831)

## Citation / full-text source

- arXiv:2410.02831 — full text: https://arxiv.org/pdf/2410.02831
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Mikel Bober-Irizar, Naunidh Dua, Max McGuinness (2024). *Skill Issues: An Analysis of CS:GO Skill Rating Systems*. arXiv:2410.02831 [cs.AI]. URL: https://arxiv.org/abs/2410.02831.
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
How do Elo, Glicko2, TrueSkill (team and per-player), and naive WinRate actually perform on real CS:GO data — and how does the *matchmaking* (which games the system learns from, framed as an acquisition function from surrogate modeling) affect rating quality? Novelty: the rating↔matchmaking circular dependency is simulated rather than evaluating on a static dataset.

## 2. Dataset / schema
- **9,929 professional/semi-professional CS:GO matches** (hltv.org, ≥1-star team rating, 2017–2022); random 50/50 train/test split (deliberately not time-ordered, to preserve matchup choice).
- skillbench library (github.com/mgm52/skillbench): Emulators (rating systems) + Acquisition Functions (match selectors) + Simulator (trains emulator on AF-chosen matches from training pool, evaluates accuracy on full test set).

## 3. Method / model
- **Emulators:** WinRate (E[A|B] = (1+w(A)−w(B))/2), Elo (E=1/(1+10^{(R_B−R_A)/400})), Glicko2 (μ, φ RD, σ volatility, τ), TrueSkill team-level (μ, σ, β, τ), **TrueSkillPlayers** — per-player ratings for all 10 players updated jointly (TrueSkill's native n-way support).
- **Acquisition functions:** Expected Improvement (4)(5); Cheater's AF (6) (oracle upper bound); **LikeliestDraw** (7) — binary entropy of predicted outcome, max at p=0.5; **CrossEntropy** (8) — surprisal vs all previously seen matchups, with p(m) from team observation counts; **Weighted** (9) = α·draw_factor + β·seen_factor, α=β=1; LeastSeen (10) −Σlog c(T); MostSeen; LikeliestWin; TSQuality (TrueSkill's built-in match quality).
- Simulator: each iteration draws 25 random training matches, trains on the AF's top pick; evaluation = accuracy on non-draw test matches.

## 4. Equations & assumptions
- WinRate: E[A|B] = (1+w(A)−w(B))/2. Elo: E[A|B] = 1/(1+10^{(R_B−R_A)/400}).
- Glicko2: v = [g(φ′)²E(μ,μ′,φ′)(1−E)]^{−1}; Δ = vg(φ′)(s−E).
- AF_draw = −p log p − (1−p) log(1−p); AF_CE from −p(w_T1|m)log(p(w_T1|m)·c(T_1)c(T_2)/(Σc)²) − …; AF_weighted = α(1−|p_1−p_2|) + βΣ(1/c − 1/(c+1)); AF_unseen = −Σlog c(T).
- TrueSkill: β = class width (80% win prob per β gap), τ additive dynamics factor.
- Assumptions: historical match outcomes are valid stand-ins for simulated matchups; random 50/50 split acceptable despite ignoring time; 100 runs give <0.1% epistemic CI.

## 5. Features / target
Input: team identity + match history. Target: binary match outcome (draws excluded from eval).

## 6. Validation design
100 simulator runs per emulator×AF cell; accuracy after 500/1000/2000 training matches (~1–4 per team); TrueSkill sensitivity via log grid search over (σ,β,τ) ±1 order of magnitude, GP-smoothed (RBF kernel, 1/1000·exp(−‖x−x′‖²/0.5), 60% prior mean).

## 7. Numerical results / baselines
Table I (rows = training matches; cols = Random/MostSeen/LeastSeen/LikeliestWin/LikeliestDraw/CrossEntropy/Weighted[/TSQuality]):
- **500 matches:** WinRate 58.8→59.0; Elo 59.3→59.5; **Glicko2 60.1→61.2** (best team-based); TrueSkill 59.1→60.4; **TSPlayers 59.6→62.1** (best overall). Average 59.4→60.4.
- **1000:** Glicko2 61.4→62.4; TSPlayers 60.7→**63.2**. Average 60.9→62.0.
- **2000:** Glicko2 62.6→63.1; TSPlayers 61.8→**64.1** (best achieved). Average 62.2→62.8.
- **Weighted AF best for every emulator** (α=β=1); LikeliestDraw/CE +1–1.5% over random; MostSeen and LikeliestWin *worse* than random; TSQuality worse than random (56.5–62.9%) — "fun" matchmaking ≠ informative matchmaking.
- **TrueSkill sensitivity:** β and σ dominate, τ minor; optimal β=σ/0.5 and β=σ/1.6 vs default β=σ/2; high-σ+low-β collapses per-team TrueSkill; per-player emulator robust (1.3% range vs 7.5%); **defaults near-optimal** — tuning gains are small, mistuning costs are large.
- Weighted-AF accuracy *declines* late in training (Figure 3): informative matches consumed early, uninformative leftovers skew ratings — a dataset-limitation artifact, but a real warning about training only on "selected" games.

## 8. Code / data availability
skillbench: https://github.com/mgm52/skillbench (emulators, AFs, simulator). hltv.org data scraped by authors.

## 9. Leakage
Random (non-temporal) 50/50 split means the "future" can inform the "past" — ratings don't model time-varying skill (authors disclose; deliberate to preserve matchup choice). Accuracy-only eval, no log-loss; draws excluded.

## Limitations
- Matchup choice restricted to matches that actually occurred.
- Not time-ordered: time-varying skill untested.
- Single dataset, pro CS:GO only; amateur/other games untested.
- Accuracy only — no log-loss (no reward for well-calibrated beliefs), draws dropped.
- AFs judged only on rating accuracy, not match quality/fairness trade-offs.

## 10. GSE overlap vs existing-research-map
- Repo has no TrueSkill implementation and no per-player rating persistence across roster moves; team ratings implicitly assume roster continuity — TSPlayers' +1% is the first read quantifying the cost of that assumption.
- Connects to 0932 (Elo-MMR: bounded updates) — this paper's information-weighted updates are the complementary idea (weight by *informativeness*, not just robustness).
- Connects to 0934 (evaluation): accuracy-only eval is exactly what 0934 criticized — note the tension honestly.
- skillbench's emulator/AF/simulator architecture is a reusable harness pattern for GSE's own rating-system bake-offs.

## 11. Implementation spec (GSE adaptation)
- **Player-persistent ratings:** implement per-player TrueSkill (via OpenSkill, cited in the paper) for QBs and key starters; team strength = aggregate of current-roster player ratings. When a QB is traded/injured, the rating travels with the player — no more "team keeps rating with new QB" error. Backtest 2015–2025 vs team-only Elo.
- **Information-weighted updates:** scale each game's K by matchup informativeness — draw_factor analog = 1−|p−(1−p)| from the pre-game model (close games update more), plus a novelty term for new QBs/coaches. Direct port of AF_weighted (9).
- **skillbench-style harness:** build a GSE rating bake-off harness (emulator interface + matchup selector + simulator) so every future rating idea (0932 MMR, 0936 Ω, 0937 all-games Elo) is compared identically.
- Effort: 1 week (OpenSkill QB ratings) + 1 week (harness).

## 12. Reproducible test
Dataset: nflverse 2015–2025. Implement (a) team Elo, (b) per-player OpenSkill TrueSkill for QBs aggregated to team level, (c) team Elo with information-weighted K. Walk-forward log-loss + accuracy 2020–2025. Baselines: existing GSE Elo. Success: per-player ratings beat team Elo by ≥0.004 log-loss (the paper's ~1% accuracy gap translated), or information-weighted K beats fixed K by ≥0.003 — either confirms one of the paper's two claims on football data.

## 13. Numeric gate
ADAPT confirmed if per-player TrueSkill aggregation OR information-weighted updates improve 2020–2025 walk-forward log-loss by ≥0.003 over the existing GSE team Elo. Reject if both fail — roster-churn effects are too small in a 17-game season to matter, and fixed-K is fine.

## 14. Improvement experiment
**Adversarial scheduling test:** the paper's late-training accuracy decline (uninformative leftovers skew ratings) has an NFL analog — late-season games with resting starters are "low-quality" training data. Test: down-weight or exclude Week 18 rest-games from rating updates and measure 2020–2025 playoff prediction log-loss. Hypothesis: excluding low-information games improves postseason log-loss by ≥0.005. Second: tune the Weighted AF's α/β on NFL data via Bayesian optimization (the paper's stated future work) — find the optimal draw-vs-novelty trade-off for football, where blowouts are more informative about true strength than in CS:GO.

## 15. Verdict

**ADAPT** — two transferable findings: (1) **per-player TrueSkill beat every team-based system by ~1%** (64.1% vs 63.1% best team-based) because players carry ratings across roster changes while team ratings need "core" continuity — directly relevant to NFL roster churn (trades, injuries, QB changes); (2) the **acquisition-function framing**: close/uncertain matchups (likeliest-draw) teach a rating system 1–1.5% more than random games, while obvious mismatches teach less than random — adapt as information-weighted rating updates (high-leverage, close-spread games move ratings more). Also a useful humility result: all systems land within ~1–2% of each other, and defaults (TrueSkill β=σ/2) are near-optimal — don't over-invest in the rating algorithm over the features. Code released (skillbench). Not ADOPT: CS:GO-specific, single pro dataset, accuracy-only.
