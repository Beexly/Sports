# 0965 — Football fever: goal distributions and non-Gaussian statistics (self-affirmation models) (physics/0606016v1)

## Citation / full-text source
- Bittner, Nußbaumer, Janke, Weigel. "Football fever: goal distributions and non-Gaussian statistics." arXiv:physics/0606016v1 (2006).
- Full text read: https://arxiv.org/pdf/physics/0606016 (1665 text lines via fetch; complete: abstract through Appendix A and references).
- Note: assigned to reader 15, initially BLOCKED (no local copy); recovered and fully read via direct PDF fetch. Replacement-for: 0606016v1 BLOCKED record → this ledger (no reserve consumed).

## Research question
Can football score distributions be explained by a microscopic model — a modified Bernoulli/Binomial process with a "self-affirmation" feedback (scoring changes subsequent scoring probability) — rather than by ad-hoc phenomenological distributions (Poisson, negative binomial, GEV)?

## Dataset / schema
- **Bundesliga** (men's, FRG) 1963/64–2004/05: ~12,800 matches.
- **Oberliga** (men's, GDR) 1949/50–1990/91: ~7,700 matches.
- **Frauen-Bundesliga** (women's, FRG) 1997/98–2004/05: ~1,050 matches.
- **FIFA World Cup qualification** 1930–2002: ~3,400 matches (neutral-ground games excluded).
- 14 further European premier leagues (Austrian, Belgian, British, Bulgarian, Czechoslovak, Dutch, French, Hungarian, Italian, Portuguese, Romanian, Russian, Scottish, Spanish) — similar conclusions.
- Histogram bins with single/isolated entries excluded; bootstrap error estimates.

## Method
- Fit phenomenological distributions: (2.1) Poisson P(n) = λⁿe^(−λ)/n!; (2.4) negative binomial (Poisson–gamma compound); (2.10) GEV (Weibull ξ<0 / Gumbel ξ=0 / Fréchet ξ>0).
- Microscopic models: match = N = 90 Bernoulli steps; scoring probability adapts on each goal —
  - **Model A (additive)**: p(n) = p(n−1) + κ (2.6)
  - **Model B (multiplicative)**: p(n) = κ·p(n−1) (2.7)
  - **Model C (coupled)**: home goal → p_h × κ_h, p_a / κ_a and vice versa (2.9)
  - **Model D**: tail-enhancing renormalization → GEV limit (Bertin–Clusel).
- Exact distributions via Pascal recurrence (2.8): P_N(n) = [1−p(n)]P_{N−1}(n) + p(n−1)P_{N−1}(n−1), O(N²); continuum limit of A → NBD with **r = p₀/κ, p = 1 − e^(−κN)** (Appendix A, generating-function proof).
- Simplex minimization of total χ² on home/away scores (also sums/differences); home–away correlation R = Cov(n_h,n_a)/(σ_h σ_a).

## Equations / assumptions
- p_A(n) = p₀ + nκ; p_B(n) = p₀κⁿ (clipped to [0,1]).
- NBD as limit of A: r = p₀/κ, p = 1 − e^(−κN).
- GEV: P_{ξ,μ,σ}(n) = (1/σ)[1 + ξ(n−μ)/σ]^(−1−1/ξ) exp(−[1 + ξ(n−μ)/σ]^(−1/ξ)).
- Sum/difference consistency: P_Σ(σ) = Σ_n P_h(n)P_a(σ−n); P_Δ(δ) via modified Bessel I_δ (Poisson case).
- Assumption: N = 90 identical time steps; team skill differences averaged out (league-level fits); home/away independence as working approximation (tested via R).

## Features / target
- Target: PDFs of home goals P_h(n_h), away goals P_a(n_a), sums P_Σ(σ), differences P_Δ(δ).
- Parameters: (λ) Poisson; (r, p) NBD; (ξ, μ, σ) GEV; (p₀, κ) models A/B.

## Validation
- χ²/dof on four datasets; bootstrap bin errors; cross-check of sum/difference PDFs against convolution of fitted home/away PDFs; 14 additional leagues as replication.

## Exact results / baselines
- **Poisson rejected everywhere**: χ²/dof 6.53–12.8 (Table I: Oberliga home λ=1.85±0.02 χ²/dof=12.5; away λ=1.05±0.01, 12.8; Bundesliga home λ=2.01±0.02, 6.53; away λ=1.17±0.01, 7.31). Tails fatter than Poisson.
- **NBD fits well**: χ²/dof 0.68–4.09 (Oberliga home: p=0.17±0.01, r=9.06±0.88, χ²/dof=0.99; Bundesliga home: p=0.11±0.01, r=15.9±2.10, 0.68). Bundesliga r ≈ 2× Oberliga r.
- **Feedback reading**: larger κ (= p₀/r) in Oberliga than Bundesliga — scoring was "more encouraging" in the East; alternatively West teams switched to defensive mode when leading. Frauen-Bundesliga: much larger κ (fatter tails), parallels World Cup qualification.
- **GEV**: ξ small, mostly negative (Weibull); ξ = 0 (Gumbel) clearly rejected (much larger χ²/dof). GEV never the best fit for German leagues.
- **Model A ≈ NBD** for scores (identical fit quality) but **better for sums/differences** (continuum-limit deviations matter). **Model B fits World Cup qualification extremely well — away scores better than GEV**; each goal motivates more than the previous ("true football fever").
- **Home–away correlation**: R = −0.015 ± 0.011 (Oberliga), **−0.031 ± 0.009** (Bundesliga) — weak but significant negative correlation; explains Bundesliga sum/difference deviations under independence.
- Model C ≈ Model B (not tabulated).

## Code / data
- No code. Data: fussballdaten.de, fussballportal.de, nordostfussball.de, sportergebnisse.de, rdasilva.demon.co.uk.

## Leakage
- N/A (distributional fitting). Bins with isolated entries excluded to stabilize fits — mild selection, disclosed.

## Limitations
- Authors' own: "models with a single parameter of self-affirmation are a **gross oversimplification** of the complex psychosocial phenomena on a football pitch"; team-skill differences ignored (league averages); no time-resolved scoring data — intra/inter-team motivation dynamics untested.
- Authors' own caveat [37]: possible **spurious contagion** — the NBD arises both as compound-Poisson (non-contagious) and as the limit of contagious model A, so fit quality alone cannot prove the feedback mechanism.
- GEV-as-limit (model D) construction is sketched, not fitted.

## GSE overlap
- Checked against `arxiv-program/state/existing-research-map.md`: no existing score-distribution / self-affirmation / momentum-feedback distributional work in the corpus; ratings lane has Elo/Glicko but nothing on within-match feedback or NBD/GEV score modeling. No duplication.

## Implementation (GSE adaptation)
- **Total-goals distribution for totals betting**: fit model B (multiplicative feedback) per league on historical scores via the O(N²) recurrence — one parameter κ per league plus p₀. The κ estimate is a direct measure of "scoring begets scoring" and should modulate **in-play totals**: after each goal, update remaining-goals expectation multiplicatively, not additively.
- **League profiling**: κ ranks leagues by feedback strength (Frauen-Bundesliga/WCQ > Oberliga > Bundesliga) — use as a prior for new/low-data leagues (e.g., project NFL: is scoring self-affirming? Fit on play-by-play TD sequences).
- **Sum/difference consistency check**: the paper's convolution test (fitted home/away → predicted total/diff PDFs) is a template for GSE's spread/total coherence gate — if spread-model and total-model imply inconsistent score-difference distributions, flag.
- **Negative home–away correlation** (−0.03): build into bivariate score models rather than assuming independence; the paper quantifies the cost of the independence assumption.

## Reproducible test
- Implement recurrence (2.8) for model B (N=90); fit p₀, κ by χ² minimization on 5 seasons of any league's home/away scores; verify κ > 0 significant and χ²/dof < 2. Then fit NBD and confirm r ≈ p₀/κ relationship holds approximately.

## Numeric gate
- **Model B beats GEV on World Cup away scores**; NBD χ²/dof 0.68–4.09 vs Poisson 6.53–12.8. Gate: feedback model must beat Poisson by ≥ 4 χ²/dof points on GSE's target league before use in totals pricing.

## Improvement experiment
- Fit κ **per team** (not per league) with hierarchical shrinkage toward league κ; test whether team-level κ predicts second-half scoring conditional on first-half goals — the in-play edge. Extend model C with separate κ_h/κ_a to capture asymmetric momentum.

## Verdict
**ADAPT** — the self-affirmation feedback formalism (p(n) = p₀κⁿ, exact O(N²) recurrence, NBD as its limit) is the principled alternative to Poisson/NBD totals modeling, with a direct in-play application: multiplicative goal-feedback updates. The league-κ profiling and the spread/total coherence check are immediately usable.
