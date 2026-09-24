# [0242] UEFA EURO 2020 Forecast via Nested Zero-Inflated Generalized Poisson Regression (arXiv:2106.05174v1)

**Citation:** Gilch, L. A. (2021). *UEFA EURO 2020 Forecast via Nested Zero-Inflated Generalized Poisson Regression*. Technical Report MIP-2101, Department of Informatics and Mathematics, University of Passau. arXiv:2106.05174v1. URL: https://arxiv.org/abs/2106.05174
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,484 lines).
**Verdict:** ADAPT — the nested conditional dependence mechanism (simulate the stronger team's goals, then condition the weaker team's goals on the realized score) is a genuinely distinct, deployable dependency structure that GSE's bivariate inventory lacks; adopt the mechanism, not the full ZIGP machinery or the EURO-2020-specific Elo fits.

## 1. Research question
Can a nested zero-inflated generalized Poisson (ZIGP) regression model, with team Elo ratings and match location as covariates, produce quantitative probabilities for each UEFA EURO 2020 team's chances of reaching each tournament stage (champion/final/semi/quarter/last-16/group exit)? In particular: which team is the favorite, and do some teams have an easy or hard path to the final given the fixed bracket?

## 2. Dataset / schema
- **Source:** all matches of the participating teams between 1 January 2014 and 7 June 2021, from eloratings.net (historical match data + Elo ratings, World Football Elo Ratings variant).
- **Schema:** per match: Elo_before/Elo_after for both teams, opponent Elo, location (home/neutral/away), goals scored/conceded.
- **Weighting:** each historical match m weighted by w(m) = w_date(m) · w_importance(m), with w_date(m) = (1/2)^{D(m)/H}, H = 365·3 = 3 years half-life (Ley, Van de Wiele & Van Eetvelde 2019); w_importance(m) = 4 (World Cup), 3 (continental championship/Confederation Cup), 2.5 (WC or EURO qualifier/Nations League), 1 (otherwise) — the FIFA ranking importance ratios.
- **Elo snapshot:** top-5 participating nations' Elo on 8 June 2021: Belgium 2100, France 2087, Portugal 2037, Spain 2033, Italy 2013.
- **Access:** eloratings.net (public web; scraped, no API stated).

## 3. Method / model
1. **Nested ZIGP regression for one match** between A (higher Elo) and B. G_A, G_B ~ ZIGP. Simulation order: realize G_A first, then G_B conditional on G_A: P(G_A=i, G_B=j) = P(G_A=i)·P(G_B=j | G_A=i).
2. **Step 1 — stronger team's scoring:** log μ_A(Elo_B) = α₀⁽¹⁾ + α₁⁽¹⁾·Elo_B + α₂⁽¹⁾·loc_A|B; φ_A = 1+e^{β⁽¹⁾}; ω_A = γ⁽¹⁾/(1+γ⁽¹⁾); loc ∈ {+1 home, 0 neutral, −1 opponent home}. Models goals scored, ignoring B's defense skill.
3. **Step 2 — goals against B:** log ν_B(Elo_A) = α₀⁽²⁾ + α₁⁽²⁾·Elo_A + α₂⁽²⁾·loc_B|A; ψ_B = 1+e^{β⁽²⁾}; δ_B = γ⁽²⁾/(1+γ⁽²⁾). Models goals B concedes vs stronger opponents (attack/defense heterogeneity at similar Elo).
4. **Step 3 — averaging:** final G_A parameters = averages of the two fits: μ_A|B = (μ_A+ν_B)/2, φ_A|B = (φ_A+ψ_B)/2, ω_A|B = (ω_A+δ_B)/2. (Ad hoc reconciliation; author notes the two means rarely coincide.)
5. **Step 4 — weaker team's scoring, conditional:** log μ_B|A = α₀⁽³⁾ + α₁⁽³⁾·Elo_A + α₂⁽³⁾·loc_B|A + α₃⁽³⁾·G_A (the key nested dependence term — e.g., if A scores 5, B's concentration-breaking late goals are more likely; if A scores 1, B likely 0–1 as A protects the lead).
6. **Tournament simulation:** 100,000 Monte Carlo replications of the full EURO 2020; each match simulated via the nested order; Elo ratings UPDATED after each simulated match (rewards in-tournament form); Elo reset at the start of each replication. Computed in R 3.6.2.
7. **Validation:** chi-square GOF per team per regression stage (Tables 1–3); retrospective application to EURO 2016 vs the earlier Nested Poisson model (Gilch 2019), scored with Maximum-Likelihood Distance, Brier score, and Rank Probability Score.

## 4. Equations & assumptions
- **ZIGP pmf** (Consul 1989; Stekeler 2004): P(X=0) = ω + (1−ω)·e^{−μ/φ}; P(X=k) = (1−ω)·μ·(μ+(φ−1)k)^{k−1}/k!·φ^{−k}·e^{−(μ+(φ−1)k)/φ} for k ≥ 1. Reduces to Poisson when ω=0, φ=1.
- **Moments:** E(X) = (1−ω)·μ; Var(X) = (1−ω)·μ·(φ² + ωμ).
- **Elo update:** Elo_after = Elo_before + K·G·(W − W_e); K = 60 (World Cup), 50 (continental tournaments); G = 1 (draw or 1-goal win), 3/2 (2-goal win), (11+N)/8 (N-goal win otherwise); W ∈ {1, 0.5, 0}; W_e = 1/(10^{−D/400}+1), D = Elo_before − Elo_Opp.
- **Regression equations (2.1)–(2.3):** as in §3: log-link on μ/ν in Elo and location; φ = 1+e^β, ω = γ/(1+γ) links. Note (2.3) as typeset uses α₀⁽³⁾ twice (location coefficient should presumably be α₂⁽³⁾) — a typographical slip in the report, and parameters are listed separately in the parameter enumeration.
- **Error metrics (EURO 2016 validation):** MDL error(T) = |result(T) − argmax_j p_j(T)|; Brier error(T) = Σ_j (p_j(T) − 1[result=j])²; RPS error(T) = (1/5)Σ_i (Σ_{j≤i} p_j − 1[result=j])².
**Assumptions:** goals depend on opponent Elo and location only (no attack/defense separation beyond step 2's averaging); the stronger team's goals drive the weaker team's distribution (asymmetric dominance assumption — "the better team dominates the weaker team's tactics"); time-decay half-life 3 years is appropriate (borrowed from Ley et al.); the arithmetic mean of two regression fits is a valid reconciliation; Elo is a sufficient team-strength statistic; simulated Elo updating mirrors real tournament momentum.

## 5. Features / target
Target: per-match exact scoreline (G_A : G_B), then tournament-stage probabilities per team. Features: opponent Elo, match location (home/neutral/away), and — in step 4 — the realized goals of the stronger team. Prediction horizon: pre-tournament (Elo snapshot 8 June 2021; EURO 2020 played June/July 2021). All features are pre-match knowable.

## 6. Validation design
- **In-sample GOF:** χ²_T = Σ_i (x_i − μ̂_i)²/μ̂_i per team on the training matches; p-values reported for selected teams in Tables 1–3 (e.g., attack regression: Belgium 0.98, France 0.15, Portugal 0.34, Spain 0.33, Italy 0.93; Germany 0.05; defense regression: Italy/Portugal "very poor" but noted as low-impact by construction).
- **Retrospective validation:** model applied to EURO 2016, scored against actual stage results with MDL / Brier / RPS, compared head-to-head with the earlier Nested Poisson Regression (Gilch 2019) — the only benchmark. No train/test split of the 2014–2021 match data; no out-of-sample match-level scoring.
- **Forecast:** 100k tournament replications; Elo updated within each replication.

## 7. Numerical results / baselines
- **EURO 2016 retrospective (Table 4):** ZIGP vs Nested Poisson — MDL 22 vs 26; Brier 17.52441 vs 18.68; RPS 5.280199 vs 5.36. ZIGP strictly better on all three metrics.
- **EURO 2020 forecast (Table 11, 100k simulations):** champion probabilities — Belgium 18.4%, France 15.4%, Spain 13%, England 7.8%, Portugal 7.7%, Netherlands 7.1%, Germany 6.1%, Italy 4.8% (actual winner — the model's long shot), Turkey 3.7%, Denmark 3.5%, Croatia 3.4%, Switzerland 3.2%, … North Macedonia 0%. Stage probabilities also given for final/semifinal/quarterfinal/last-16 (e.g., Belgium: final 29.1%, semi 47.7%, QF 68.7%, last-16 98.5%).
- **Group stage (Tables 5–10):** e.g., Group F: France 37.7%/30.4%/17.9%/14.0% (first/second/third-Q/eliminated), Germany 32.4/30.3/19.9/17.4, Portugal 26.4/29.9/23/20.6, Hungary 3.5/9.5/11.8/75.1.
- **Worked example (France vs Germany, Munich):** France μ(1936) = exp(1.895766 − 0.0007002232·1936 − 0.2361780·(−1)) = 1.35521; ω = e^{−3.057658}/(1+e^{−3.057658}) = 0.044888; expected France goals (1−ω)·μ = 1.32516. Germany ν(2087) = exp(−3.886702 + 0.002203437·2087 − 0.02433679·1) = 1.988806; combined mean (1−(ω+δ)/2)·(μ+ν)/2 = 1.627268. Germany's μ_Germany|France = exp(3.340300 − 0.0014539752·2087 − 0.089635003·G_A + 0.21633103·1) = 1.54118 when G_A = 1.
- **Most probable single scores (Turkey vs Italy, Rome):** 1:0 or 2:0 Italy win or 1:1 draw.
- **Baselines compared:** only the author's own Nested Poisson (2019) — no comparison to bookmaker-implied probabilities, Dixon-Coles, or market baselines.

## 8. Code / data availability
No code links or repository. All calculations in R 3.6.2 (version stated). Data from eloratings.net (public web source, scraped; no script provided).

## 9. Leakage & limitations
- **No pre-tournament holdout:** model fit on all matches through 7 June 2021, forecast EURO 2020 — legitimately pre-tournament, no temporal leakage. But the only "validation" is EURO 2016 backtest fit by the same methodology (methodology was presumably developed with knowledge of 2016 — mild researcher-df concern, unaddressed).
- **No market comparison:** no bookmaker-implied benchmark; beating only one's own simpler model is a low bar.
- **Ad hoc averaging (step 3):** (μ_A + ν_B)/2 has no statistical justification — two inconsistent conditional models averaged by fiat; the paper acknowledges the two means rarely coincide.
- **Asymmetry assumption hardcoded:** A is always the higher-Elo team; near-equal matchups still force the directional structure; the (2.3) equation typesetting has a duplicated α₀⁽³⁾ coefficient.
- **Zero-inflation rationale thin:** "no goal is a special event" — in soccer, 0 goals by one team is not a structural zero; the extra parameter risks overfitting (GOF tests are in-sample, so no check).
- **In-sample GOF only for the regressions;** tournament-level forecast has no validation metric on 2020 (can't — one realization), and Italy (actual winner) was the model's 8th choice at 4.8%.
- **Domain transfer to NFL:** soccer goals → not directly transferable, but the nested simulation MECHANISM is sport-agnostic (see §11).

## 10. GSE overlap
- **Novel vs map:** existing-research-map §1 inventories Dixon-Coles, Karlis & Ntzoufras, Skellam, Poisson GLM — all symmetric/parametric bivariate dependence. The NESTED conditional structure (P(favorite's score) → P(underdog's score | realized favorite goals)) is NOT in the map; it is a different dependency primitive from copulas and from Dixon-Coles' λ₃ correction.
- **Related but distinct:** MultCOMP (0239) gives symmetric multivariate count dependence; the live-betting state-space (0240) handles in-play dynamics. Neither captures "underdog behavior changes conditional on the favorite's realized output" — the classic garbage-time / prevent-defense dynamic in NFL.
- This is a soccer/Elo application of the mechanism, not an NFL method — hence ADAPT, not ADOPT.

## 11. GSE implementation spec
Adapt the nested conditional simulation for exact-score and tournament/prop simulation:
1. Fit per-team scoring distributions (points scored by favorite A vs opponent strength) and concession distributions as the paper does (steps 1–3), replacing ZIGP with whatever count model GSE uses (Poisson/NB already in inventory).
2. Add the dependence term: underdog's scoring mean depends on the REALIZED favorite score: log μ_B|A = β₀ + β₁·opp_strength + β₂·location + β₃·G_A. Fit β₃ on nflverse play-by-play aggregated to game level (does the underdog's scoring rate rise when the favorite piles on? — garbage-time effect).
3. Monte Carlo: simulate favorite's points, then underdog's conditional on it; extend to bracket/playoff sims with rating updating inside replications (as the paper does with Elo).
4. Evaluate vs independent-Poisson baseline on Brier/RPS of exact-score buckets and vs market-implied totals; keep the mechanism only if β₃ ≠ 0 and log-loss improves.
Estimated effort: small — the change is one extra covariate in an existing count regression plus a two-stage sampler.

## 12. Reproducible test
- **Data:** nflverse game-level scores 1999–2025 (repo already vendors or documents access).
- **Test 1 (dependence term):** regress underdog points on favorite's realized points + pregame spread/total; report β̂₃, z, p. Prediction: β̂₃ > 0 in garbage-time games (favorite win prob > 85%).
- **Test 2 (forecast value):** exact-score log-loss for nested model vs independent Poisson on a rolling-origin backtest; also Brier on margin buckets. Keep if improvement ≥ 0.5% log-loss and β₃ significant.
- **Test 3 (tournament):** simulate 2024 playoff bracket 100k times with in-replication rating updates vs static ratings; compare stage-probability Brier vs actual.

## 13. Acceptance / rejection gate
ADAPT gate: (a) the nested dependence term β₃ must be empirically ≠ 0 on NFL data (garbage-time/prevent-defense mechanism); (b) exact-score log-loss must improve over the independent baseline out-of-sample; (c) the step-3 parameter averaging must be replaced by a principled reconciliation (e.g., fit the favorite's mean once with both attack and defense covariates, rather than averaging two fits). If (a) fails, the mechanism is soccer-specific theater and the paper drops to REJECT. The EURO-2020 Elo fits, ZIGP parameterization, and weighting scheme are not adopted.

## 14. Improvement experiment
- Replace the ad hoc averaging with a single joint fit: log μ_A = α₀ + α₁·Elo_B + α₂·loc + α₃·(A's attack rating) + α₄·(B's defense rating) estimated in one likelihood — tests whether steps 1–3's machinery is needed at all.
- Compare the nested sampler against a Gaussian-copula Poisson and against Dixon-Coles λ₃ on exact-score log-loss for NFL (low-count setting) — determines whether the nested primitive beats the symmetric ones in football.
- Extend to totals betting: the nested structure induces a specific over/under correlation pattern; check whether market totals price the garbage-time inflation the model predicts.
