# [0652] Inferring Team Strengths Using a Discrete Markov Random Field (arXiv:1305.1998)

**Citation:** John Zech, Frank Wood (2013). *Inferring Team Strengths Using a Discrete Markov Random Field*. arXiv:1305.1998v1. URL: https://arxiv.org/abs/1305.1998
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/1305.1998.txt`).
**Verdict:** REJECT — the paper's own predictive test shows the discrete-state MRF UNDERPERFORMS Elo and bookmaker-implied probabilities; the authors concede a continuous-state extension is needed. No transferable edge over rating systems already in GSE's corpus. **Replacement required:** fresh arXiv search in rating-system territory (see wave report).

## 1. Research question
Can team offensive/defensive strengths — latent, time-varying, discrete-state — be inferred from scorelines via a Markov Random Field, with EM + loopy belief propagation, for sports with low discrete scores (soccer, hockey)?

## 2. Dataset / schema
- English Premier League, 1993–2012 (45 teams, 678 weeks, ~11 matches/week). Only goals scored per team per match used; goals capped at 4 (<2% exceed).
- Predictive test: train through 2004-05 season; rolling weekly predictions 2005–2012, refit with 10 coordinate-ascent iterations per week.

## 3. Method / model
- Latent variables: per team t, per date d: offensive strength O_{t,d} ∈ S and defensive strength D_{t,d} ∈ S (discrete states, 4 used for plotting).
- Time dynamics: Markov transition matrices Ω (offense), Δ (defense) — teams usually stay in same state week-to-week.
- Emission: home goals ~ Ψ(offense_home, defense_away); away goals ~ Γ(offense_away, defense_home) — freely parameterized discrete conditional distributions (NOT assumed Poisson).
- Inference: EM with loopy belief propagation in the E-step; non-convex — 8 random restarts give different joint log-likelihood paths (Figure 7); regularization needed.
- Prediction: posterior predictive over goal totals → win/draw/loss probabilities.

## 4. Equations & assumptions
- EM objective: Q(θ,θ^old) = Σ_Z P(Z|X,θ^old) ln P(X,Z|θ). (Eq. 1)
- BP marginal via message reordering: O(NK²) instead of O(K^N). (Eq. 2)
- Model factors: P(M|Ψ, offense, defense) with indicator variables M_{h,a,d,g}, N_{a,h,d,g} for goal totals.
- Assumptions: discrete strength states sufficient; Markovian strength evolution; goals conditionally independent given strengths; home/away emission asymmetry captured by separate Ψ/Γ.

## 5. Features / target
- Target: match goal totals (home/away), then win/draw/loss.
- Inputs: only historical scorelines + fixture list.

## 6. Validation design
Rolling out-of-sample 2005–2012: cumulative net log-likelihood on actual outcomes vs (a) William Hill implied probabilities, (b) Elo optimized on same training data, (c) naive constant home/draw/away rates.

## 7. Numerical results / baselines
- Model substantially beats naive constant-rate baseline (cumulative net log-likelihood).
- Model UNDERPERFORMS both Elo and William Hill linemakers — stated explicitly: "The model underperformed both Elo and expert human linemakers, however."
- Non-convexity: 8 identical-training runs converge to different optima (Figure 7).
- Discovered emission distributions deviate from Poisson (Figure 12: Ψ_{1,2,g} vs matched Poisson differ notably on 0/1 goals).
- Interpretability win: Man City offensive strength jump from 2008-09 correctly inferred without knowledge of the 2008 takeover.

## 8. Code / data availability
No code linked. Data: football-data.co.uk (England). Methodological background sections are textbook EM/BP exposition.

## 9. Leakage & limitations
- Loses to Elo on its own benchmark — the discrete-state restriction is the binding constraint (authors' own diagnosis).
- Non-convex EM + loopy BP (approximate, no convergence guarantee) — fragile training.
- Soccer-specific low-score setting; NFL scoring is higher-variance and not goal-count-like.
- Freely parameterized emissions risk overfitting with 45 teams × states × goal levels.
- No player-level or within-match information.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus already covers Elo, Bradley-Terry, TrueSkill-style rating systems and state-space team-strength models. A discrete-state MRF that loses to Elo adds nothing. The Poisson-deviation finding is soccer-specific. Duplicate territory, weaker method.

## 11. GSE implementation spec
None — REJECT. The only salvageable idea (discrete interpretable strength regimes) is dominated by continuous state-space models already in the corpus, and the paper itself recommends the continuous extension.

## 12. Reproducible test
Not applicable — REJECT. (Had it been pursued: replicate rolling EPL prediction vs Elo; the paper already ran this test and lost.)

## 13. Acceptance / rejection gate
REJECT because: (a) the paper's own head-to-head shows it underperforms Elo, which GSE already has; (b) authors concede the discrete-state formulation is the limitation and point to continuous extensions — i.e., the paper's direction is away from its own method; (c) no NFL-applicable finding beyond "ratings work," which is settled. A REJECT never counts toward the 750 target; replaced by a fresh-search paper in rating-system territory.

## 14. Improvement experiment
Not applicable — REJECT. (The authors' suggested experiment — Gaussian strength states with Poisson emissions — is the natural follow-up, but that paper isn't this paper.)
