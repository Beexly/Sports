# [1703] Assessing Course Difficulty and the Effect of Weather in Amateur Cross Country Running Races (arXiv:2405.09865)

**Citation:** Wilson, K. J. & Wilson, N. (2024). *Assessing Course Difficulty and the Effect of Weather in Amateur Cross Country Running Races*. arXiv:2405.09865. URL: https://arxiv.org/abs/2405.09865
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections 1–4 + Appendix + references, ~37k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the Bayesian log-scale mixed-effects model with random athlete/course/season effects and lagged rainfall covariates is a directly adaptable template for modeling weather and field-condition effects on NFL performance, but the sport is amateur distance running and the headline windspeed result is a null (no effect) that must not be misread as applying to stadium wind.

## 1. Research question
How do course difficulty, weather, and underfoot conditions affect cross-country finish times? The authors model log finish times of all senior finishers across 28 races (8 courses, 5 seasons, 2017/18–2022/23) in England's North East Harrier League with a Bayesian linear mixed-effects model — random athlete, course, and season effects plus fixed effects of distance, windspeed, and current/previous-month rainfall — and validate via posterior predictive checks.

## 2. Dataset / schema
- 14,067 men's + 10,515 women's finish times (chip-timed, no missing data); 28 races on 8 courses (Alnwick, Aykley Heads, Druridge Bay, Gosforth, Herrington, Lambton, Thornley, Wrekenton); 2,668 unique men, 2,116 unique women; seasons 2017/18–2022/23 (2019/20 shortened, 2020/21 cancelled — Covid).
- Covariates: race distance (men's via Garmin GPS, ~10 km/3 laps; women's = 2/3 of men's), windspeed (Durham weather station, 2 pm race day, visualcrossing.com), monthly rainfall current + previous month (Met Office Durham station data) as proxy for underfoot conditions.
- Acknowledged measurement error: central-station weather vs course-level conditions; GPS distance error. Not modeled.

## 3. Method / model
Linear mixed model on Y_ijk = log(T_ijk): μ_ijk = λ + α_i + β_j + δ_k + γ(D_jk−d̄) + λ_w(W_jk−w̄) + ρ_m R_m + ρ_{m−1} R_{m−1}, with α_i ~ N(0,1/τ_α) athlete, β_j ~ N(0,1/τ_β) course, δ_k ~ N(0,1/τ_δ) season random effects (corner constraints α_1=β_1=δ_1=0), diffuse Normal priors on fixed effects, Gamma priors on precisions, correlated prior on the two rainfall effects via a Gamma-distributed decay φ<1. Bayesian inference via rjags/JAGS (10k burn-in, 1M iterations thinned by 100 → 10k posterior samples). Windspeed dropped after showing no effect; log-pace variant fit as robustness check (qualitatively identical). Adequacy: posterior predictive distributions vs observed per-race histograms and quartile summaries.

## 4. Equations & assumptions
- Y_ijk = log(T_ijk) | μ_ijk, τ ~ N(μ_ijk, 1/τ); μ_ijk = λ + α_i + β_j + δ_k + γ(D_jk−d̄) + ρ_m R_{m(jk)} + ρ_{m−1} R_{m(jk)−1} (windspeed term removed).
- α_i ~ N(0,1/τ_α), β_j ~ N(0,1/τ_β), δ_k ~ N(0,1/τ_δ); τ's ~ Gamma; ρ_m ~ N(m_ρ,v_ρ), ρ_{m−1} ~ N(φm_ρ, v_{ρ−1}), φ ~ Gamma(a_φ,b_φ), a_φ ≤ b_φ.
- Assumptions: log-normal times; additive separable effects; athlete ability constant over 5 years (flagged as limitation); weather measured without error at central station; no temperature/snowfall/elevation covariates (stated extensions).

## 5. Features / target
Features: athlete ID, course ID, season, race distance, windspeed, current-month rainfall, previous-month rainfall. Target: log finish time (and log pace in robustness variant).

## 6. Validation design
In-sample posterior predictive checking: for each of 28 races, overlay posterior-predictive vs observed log-time histograms (Figs. 9–10) and compare min/LQ/med/UQ/max for 3 randomly chosen races (Table 1) — no systematic discrepancies. No out-of-sample validation (authors state 2023/24 season would be needed for a predictive claim).

## 7. Numerical results / baselines
- **Rainfall (current month):** +10 mm → **+25 s** for a man running 47 min / **+18 s** for a woman running 38 min (posterior median 0.001 per mm on log scale).
- **Rainfall (previous month):** +10 mm → **+22 s** (men) / **+14 s** (women) — lagged underfoot effect nearly as large as contemporaneous.
- **Distance:** +0.1 mile → +65 s (men, 47-min race) / +86 s (women, 38-min race); posterior median γ = 0.224 (men), 0.368 (women) per mile on log scale.
- **Windspeed:** posterior centered at 0 (−0.001 to 0.000); **no effect** — authors attribute to looped courses (headwind + tailwind cancel per lap) vs point-to-point marathons where Knechtle et al. found negative wind effects.
- **Course effects** (vs Alnwick): hardest Herrington (+0.150 men / +0.191 women) and Thornley (+0.153/+0.181); easiest Druridge Bay (−0.068/−0.057) and Gosforth (−0.043/−0.029) — ordering differs from raw times (which just rank by length), matching runners' qualitative opinions.
- **Seasons:** no systematic pre/post-Covid trend; 19/20 and 21/22 slightly slower (+0.03 to +0.045 log).
- Posterior predictive quartiles match observed within ~1 min at all quartiles (Table 1).

## 8. Code / data availability
Data public via harrierleague.com; Met Office station data public. No code repo stated (rjags/JAGS described).

## 9. Leakage & limitations
- Weather from a central station miles from some courses — attenuation bias toward zero (may partly explain the wind null).
- No out-of-sample validation; predictive claims would need a held-out season.
- Athlete ability assumed constant over 5 years; no temperature, snowfall, elevation, or rainfall×temperature (frozen ground) interactions — all flagged by authors.
- Amateur running population; effect magnitudes don't transfer to elite or team sports.
- The windspeed null is course-geometry-specific (looped); must not be generalized to open NFL stadiums.

## 10. GSE overlap
New methodology, not duplicate. The corpus has weather *feature inventories* and forecast-postprocessing papers, but no hierarchical performance model with random team/venue effects and lagged weather covariates — this is the missing estimation layer between "weather matters" and "by how much, for which venue." The lagged-rainfall → underfoot-conditions mechanism transfers directly to NFL field-condition modeling (accumulated rain → sloppy natural grass → slower games), and the random-course-effect machinery is the Bayesian sibling of ledger 1700's fixed stadium factors. The wind-null discussion is a useful caution for GSE: wind effects are geometry-dependent (bowl shape, orientation), so a single league-wide wind coefficient is misspecified.

## 11. GSE implementation spec
- Module `weather/field_conditions.py`: adapt the model to NFL — log(total points) or log(team offensive yards) per game = λ + α_offense_i + α_defense_j + β_stadium_k + δ_week + γ·(temp) + ρ_0·(rain week of game) + ρ_1·(rain prior 7 days) + dome/turf interactions; random effects for teams and stadiums, corner constraints, JAGS/Stan inference mirroring the paper.
- The two-lag rainfall structure becomes: game-day precipitation + trailing-7-day precipitation (field degradation), interacted with surface (grass vs turf) — the paper's rainfall×temperature (frozen ground) extension becomes rain×temp for NFL.
- Output: posterior distributions of weather/field effects per surface type → calibrated totals adjustments (e.g., "heavy trailing-week rain on grass: −1.5 points, 95% CI [−2.8, −0.3]").
- Effort: ~3–4 days (nflverse + weather-station join is the bulk; Stan model ~1 day).

## 12. Reproducible test
Dataset: nflverse 2018–2025 game totals + team/season + stadium surface + game-day and trailing-7-day precipitation/temperature from a weather API at stadium coordinates. Baseline: team-strength-only model (no weather). Test: full model with weather/field terms; metric: out-of-sample log-loss/RMSE on 2025 totals. Secondary: posterior predictive checks per the paper (predicted vs observed total distributions per stadium). Expectation: rain terms significant on grass, ≈0 on turf/dome (structural sanity check mirroring the paper's looped-course wind null).

## 13. Acceptance / rejection gate
ADOPT the field-condition adjustment if (a) out-of-sample RMSE on 2025 totals improves ≥ 1.5% over the no-weather baseline, (b) trailing-week rain on grass has a 95% CI excluding zero with the correct sign (slower/lower scoring), and (c) turf/dome rain effects are ≈ 0 (geometry/material specificity, as the paper's wind discussion demands). REJECT if weather terms add nothing out-of-sample — the paper itself only validated in-sample, and GSE needs the predictive claim.

## 14. Improvement experiment
Fix the paper's two stated gaps: (a) replace central-station weather with stadium-coordinate gridded reanalysis (removes the attenuation bias the authors suspect behind their wind null); (b) add the rainfall×temperature interaction (frozen/saturated ground) and a wind×stadium-orientation term (bowl geometry, per the paper's looped-vs-point-to-point insight). Hypothesis: with course-level (stadium-level) weather, wind *does* show an effect — but only in open, wind-aligned stadiums (Buffalo, Chicago), not domes or sheltered bowls — and the rain effect concentrates in cold games on grass. Test: fit the extended model and check whether the wind×orientation interaction has a 95% CI excluding zero while the main wind effect stays ≈ 0; success turns the paper's null into GSE's stadium-specific wind coefficient.

**Verdict:** ADAPT — the Bayesian log-scale mixed model with random venue effects and lagged weather covariates is the right estimation template for NFL weather/field-condition effects, but it must be rebuilt at stadium-coordinate resolution with out-of-sample validation the paper lacks.
