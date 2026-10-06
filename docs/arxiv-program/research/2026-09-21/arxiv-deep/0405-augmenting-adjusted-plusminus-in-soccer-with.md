# [0405] Augmenting Adjusted Plus-Minus in Soccer with FIFA Ratings (arXiv:1810.08032v1)

**Citation:** Francesca Matano, Lee F. Richardson, Taylor Pospisil, Collin Eubanks, Jining Qin (2018). *Augmenting Adjusted Plus-Minus in Soccer with FIFA Ratings*. arXiv:1810.08032v1. URL: https://arxiv.org/abs/1810.08032v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 574 lines).
**Verdict:** ADAPT — soccer APM itself doesn't transfer to the NFL (no lineup stints, 22-man units), but the paper's core trick — a Bayesian APM whose prior is centered on video-game ratings instead of zero — ports directly to NFL player valuation with Madden ratings as the prior, a genuinely new content metric for GSE ("which players most outperform their Madden rating on the field").

## 1. Research question
Can Adjusted Plus-Minus (APM) — the state-of-the-art one-number player-value stat in basketball and hockey — be made to work in soccer, where low scoring plus few substitutions create fatal collinearity (two fullbacks who always play together are indistinguishable) and a sparse response? The paper's answer: recast ridge APM as a Bayesian model and center the prior on **FIFA video-game ratings** (subjective evaluations of 9,000+ scouts/coaches/season-ticket holders covering 18,000+ players), producing "Augmented APM." Tests whether it out-predicts standard APM and FIFA-only models and whether it decorrelates collinear teammates.

## 2. Dataset / schema
- **Three English Premier League seasons: 2015–16, 2016–17, 2017–18.** Play-by-play event data (goals, substitutions) converted to a segment matrix: each row = a substitution-free game segment; response y = goal differential in the segment; columns per player (+1 home, −1 away, 0 not playing). Example shown for Manchester City vs. Liverpool (Figure 2).
- **Preseason FIFA overall ratings** per player per season (single overall rating, not components), scraped from sofifa.com (released late August each year), mean-centered before modeling.
- Access: authors' R package scrapes play-by-play + FIFA ratings; results tables at www.intraocular.net/apm. (Note: the extract's title-page date line reads "August 8, 2026" — an apparent PDF artifact; the arXiv identifier dates the paper to October 2018.)

## 3. Method / model
1. Standard APM as ridge regression (equation 1): β̂ = argmin_β ‖y − Xβ‖²₂ + λ‖β‖²₂ (Sill 2010).
2. Bayesian recast (equation 2): y|β ~ N(Xβ, σ²); β ~ N(0, τ²). Advantages claimed: τ interpretable as SD of player abilities (set to τ=0.1, σ=1 in the results, or given a hyperprior); posterior sampling yields uncertainty for estimates and rankings; easy extension.
3. **Augmented APM** (equation 3, multilevel): y|β ~ N(Xβ, σ²); **β|α ~ N(α × rating, τ²)**; α ~ N(μ_α, σ_α²). The prior mean is a scaled FIFA rating (ratings mean-shifted to zero, so β remains interpretable as effect vs. the average player). Collinear teammates split credit according to their FIFA ratings instead of equally.
4. **Time-weighted segments** (equation 4): y|β ~ N(tXβ, tσ²) for segment length t — equivalent in the optimization form to regressing y/t with weights √t.
5. Fit with standard Bayesian software (Stan, Carpenter et al. 2017); shipped as the R package **PlusMinusModels**, with data prep in the **apm** package.

## 4. Equations & assumptions
- Ridge APM (1): β̂ = argmin_β ‖y−Xβ‖²₂ + λ‖β‖²₂.
- Bayesian recast (2): y|β ~ N(Xβ, σ²); β ~ N(0, τ²), with τ = 0.1, σ = 1 used in the reported results.
- Augmented APM (3): y|β ~ N(Xβ, σ²); β|α ~ N(α·rating, τ²); α ~ N(μ_α, σ²_α). Ratings shifted to mean zero.
- Time weighting (4): y|β ~ N(tXβ, tσ²); β ~ N(0, τ²) — optimization equivalent: regress y/t with weights √t.
- Stated assumptions: (i) segment goal differentials are Gaussian with variance scaling linearly in segment length; (ii) player effects are additive and constant within a segment; (iii) the FIFA overall rating is a valid prior location for true ability (up to the learned scale α); (iv) mean-centering ratings preserves the "vs. average player" interpretation; (v) the prior scale τ = 0.1 is set by intuition, not estimated (hyperprior mentioned as an option, not used).

## 5. Features / target
Input features: the segment design matrix X (player-in-segment indicators, ±1/0) plus each player's preseason FIFA overall rating (mean-centered) as the prior location. Segment length t as a weight. Target: y = goal differential within each substitution-free segment; game-level predictions are the sum of segment predictions. No prediction horizon beyond the game (out-of-sample game-result prediction is the evaluation).

## 6. Validation design
- **10-fold cross-validation** per season: MSE of summed segment predictions vs. actual game goal differentials. Baselines: Zero (predict 0), Intercept (mean home advantage from training data), FIFA-only (team FIFA-rating difference), standard ridge APM, Augmented APM.
- **Rolling-origin through the season**: train on all data up to month M, predict the next two months' games; MSE per month averaged over the three seasons (Figure 4) — tests the "FIFA early, APM late" hypothesis.
- **Intraocular test**: top-15 player lists for APM vs. Augmented APM in 2017–18 (Figure 5) — sanity-checked against known quality (Salah, EPL Player of the Year).
- **Decorrelation check**: visual — Manchester City/Manchester United players cluster less in Augmented APM than in standard APM.

## 7. Numerical results / baselines
Paper's claims (figures, no numeric tables — MSE values are read from plots, so I report the paper's qualitative statements exactly):
- 10-fold CV (Figure 3): **Augmented APM has the best predictive accuracy in all three seasons**. FIFA-only beats the Intercept model (FIFA ratings "are a valuable predictor"). Surprisingly, **standard APM out-predicts FIFA-only in 2015 and 2017** despite APM's soccer limitations.
- Rolling season (Figure 4): **FIFA starts the season as the best predictor; both APM and Augmented APM out-predict FIFA by February** — "APM picks up useful information over the course of the season."
- Intraocular (Figure 5): **Mohamed Salah ranks 1st in standard APM and 4th in Augmented APM** (2017–18) — presented as passing the eye test since he was EPL Player of the Year. Augmented APM systematically up-weights high-FIFA-rating players (green) and down-weights low ones (red) vs. standard APM.
- Decorrelation: Man City/Man Utd "cluster" in standard APM is "less pronounced" under Augmented APM.
- Prior hyperparameters used: τ = 0.1, σ = 1.
- Negative result (Discussion): replacing goal differential with an **expected-goals response did not improve accuracy** — attributed to coarse play-by-play data.

## 8. Code / data availability
Two R packages: **PlusMinusModels** (fits APM and Augmented APM) and **apm** (scrapes play-by-play + FIFA ratings, prepares data). Results as sortable tables at **www.intraocular.net/apm**.

## 9. Leakage & limitations
- **No held-out future-season test**: 10-fold CV is within-season random folds — segments from the same teams appear in train and test; the rolling-month analysis partially addresses this but averages over only 3 seasons.
- **MSE numbers are plot-only**: no numeric table, no confidence intervals on the MSE differences — can't tell if Augmented APM's edge over APM is statistically meaningful.
- **FIFA ratings are preseason and static**: mid-season form changes, transfers, and injuries are invisible to the prior; the rolling analysis shows the prior's value decays, but the model never updates ratings.
- **Gaussian assumption on goal differentials**: low-count segment differentials are discrete and skewed; the normal likelihood is a convenience.
- **τ = 0.1 set by intuition**, not estimated or cross-validated — the headline result depends on an unjustified hyperparameter.
- **Only the overall FIFA rating used** — pace/shooting/defending components discarded, though they might locate the prior better by position.
- **External validity to NFL**: soccer's segment structure (substitution-free intervals, 90 minutes, 3 subs) has no NFL analogue — NFL has no "stints"; all 22 players' participation is determined by package/situation. The APM design matrix concept needs a full rethink (drives? series? personnel groupings?). What transfers is the *prior* trick, not the model structure.
- **xG negative result** is under-explored: attributed to coarse data without testing whether better xG would help.

## 10. GSE overlap
Extension/new capability — the prior trick is novel to the corpus. Per the existing-research map, player-valuation coverage is: **nflWAR** (1802.00998, multinomial-logit EP foundation — read in depth), PFF grades (inventoried), and nothing on plus-minus or on blending subjective priors with on-field regression. No paper in the corpus centers a Bayesian player-value prior on video-game ratings. The NFL analogue of FIFA ratings is **Madden ratings** — a preseason, position-aware, widely-respected subjective one-number summary that the map never mentions. So: Augmented APM's *structure* doesn't transfer (no soccer-style segments in football), but its *idea* — regularize noisy on-field player-value estimates toward Madden-rating priors, with the data deciding the weight via a learned scale α — is a new capability for GSE's player-valuation and content lanes (e.g., "players most outperforming their Madden rating" as a weekly X feature).

## 11. GSE implementation spec
Build **Madden-Prior Player Value (MPPV)** for the NFL:
1. Unit of analysis: the **drive** (not soccer segments) — response y = drive EPA or points scored; design matrix X = skill-position players on the field for the drive (QB/RB/WR/TE indicators; OL as a unit effect). Drives give ~11–12 observations per team-game — thin, which is exactly when an informative prior helps.
2. Prior: β|α ~ N(α · madden_overall_centered, τ²), α ~ N(μ_α, σ²_α) — the paper's equation (3) verbatim, with Madden overall ratings (preseason, mean-centered per position group) as the FIFA analogue. Learn α per position group (QB priors should scale differently than WR priors).
3. Fit: Stan or PyMC, 2019–2024 regular seasons from nflverse (drive EPA + participation from participation data / snap counts). Time-weighting: weight by drives, not plays (paper's equation 4 adapted: as t).
4. Products: weekly "Madden vs. reality" content — players whose posterior β most exceeds/falls short of their Madden-implied prior (the intraocular test, GSE-ified); a one-number player-value leaderboard with posterior uncertainty intervals (the paper's Bayesian advantage over point-estimate plus-minus).
5. Effort: ~2 weeks (drive matrix construction from nflverse 1 wk; Stan model + validation 1 wk). No proprietary data needed.

## 12. Reproducible test
Implement the paper's exact protocol on EPL-style data first as a sanity replication (validates understanding), then the NFL port: fit MPPV on 2019–2022 drives and test on 2023–2024 drives with the paper's rolling-origin design — train through month M, predict the next two months' drive EPA. Baselines: (a) intercept-only, (b) Madden-only (team Madden-rating differential), (c) un-augmented ridge drive-APM (prior at zero). Metric: out-of-sample MSE on drive EPA. Success: MPPV beats both (b) and (c) — replicating the paper's "augmented beats both components" result in the NFL setting. Time window: 2023–2024 holdout. Runnable on nflverse + public Madden ratings.

## 13. Acceptance / rejection gate
**Adopt** MPPV as a GSE player-valuation metric if on the 2023–2024 rolling holdout it beats both the Madden-only and the zero-prior ridge baselines on drive-EPA MSE **in both seasons** (the paper's result replicated, not a one-season fluke) AND the learned position-group α's are positive and stable (prior genuinely informative, not washed out). Then the "Madden vs. reality" leaderboard ships as recurring X content. **Reject** if MPPV fails to beat zero-prior ridge (the prior adds nothing once on-field data accumulates — the paper's February crossover arriving in week 1, so to speak), or if α ≈ 0 (Madden ratings carry no signal for drive EPA). Gate evaluated on 2023–2024 before any content use; Madden ratings are public data, no licensing step needed for internal modeling.

## 14. Improvement experiment
Go beyond the paper by fixing its two admitted weaknesses at once: (a) replace the static preseason prior with a **dynamic prior** — update each player's prior location weekly as a Kalman-filtered blend of preseason Madden rating and cumulative posterior (the paper's prior never updates; its own rolling analysis shows the prior's value decays); (b) replace the single overall rating with **component ratings** (Madden speed/awareness/catching by position — the paper discarded FIFA's components). Test on 2024 holdout: does the dynamic component-prior MPPV beat the static overall-prior MPPV on drive-EPA MSE? If yes by any margin with α > 0, the dynamic version becomes the production spec — turning the paper's one-shot preseason prior into a proper Bayesian updating system, which is also the natural bridge to GSE's existing state-space team-strength work (1701.05976).
