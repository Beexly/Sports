# [0613] Match results prediction ability of official ATP singles ranking (arXiv:1705.05831v1)

**Citation:** Eiji Konaka (2017). *Match results prediction ability of official ATP singles ranking*. arXiv:1705.05831v1. URL: https://arxiv.org/abs/1705.05831v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 963 lines).
**Verdict:** REJECT — the result (ATP points ratio → win probability via p = x^α/(1+x^α), α ≈ 0.87) is a tennis-specific artifact of the ATP's engineered doubling point structure, with no transferable mechanism for NFL; the only portable observation is that official ranking-point ratios can beat naive "higher-ranked wins" baselines, which GSE already knows from market-implied ratings work.

## 1. Research question
Do official ATP ranking points — as opposed to Elo or other models — have intrinsic match-prediction power, and what is the functional form? The paper hypothesizes that because the ATP point system doubles per tournament round/tier (250→500→1000→2000), the log of ranking points measures "how high a player can climb in a bracket," so the win probability should be a logistic function of the ranking-point ratio.

## 2. Dataset / schema
- ~20,000 ATP World Tour + Davis Cup + Olympic matches, 2009–2015 (Fig. 7); ~3,400 matches in 2016–2017 for out-of-sample confirmation (§3.2). Match results excluded if either player had 0 ranking points.
- Ranking data: ATP official rankings, 2017-03-20 edition; ranking-point trajectories at ranks 16/32/64 from 2010 (Fig. 5, Table 5).
- Sources: ATP rankings site, Jeff Sackmann's tennis database (github.com/JeffSackmann). Schema: per match — players, ranking points r_i, r_j, outcome.

## 3. Method / model
Structural analysis of the ATP point system (Tables 1–3: winner points double per tier; per-win points roughly double per round; top-30 players' mandatory Slam/Masters schedule makes points comparable), then empirical fit of p̂_{i,j} = π_{i,j}^α/(1+π_{i,j}^α), π_{i,j} = r_i/r_j, with α chosen to minimize mean squared error E² = (1/n)Σ(w_{i,j} − p̂_{i,j})². Verification that rank-16/32/64 point levels match theoretical ideals (2430/1260/650: observed means 2009.8/1224.4/753.5 — hypothesis "cannot be rejected").

## 4. Equations & assumptions
p(x) = x^α/(1+x^α), α > 0 (Eq. 1–2, 4). Objective (Eq. 3): E² = (1/number of matches) Σ_{all matches} (w_{i,j} − p̂_{i,j})². Ideal rank-32 points: 90×4 + 45×8 + 90×3 + 90×3 = 1260. Assumptions: ranking-point ratio is the sufficient statistic for ability gap (surface, form, head-to-head ignored); the ATP point system's doubling structure makes log-points a linear ability scale; 52-week rolling points are stationary enough for a single α.

## 5. Features / target
- Features: single feature — ranking-point ratio π_{i,j} = r_i/r_j.
- Target: binary match outcome; α fit by least squares on outcomes.
- Baselines: naive "higher-ranked player wins" (E² = 0.3227); α=1 model p̂ = π/(1+π) (overestimates favorites — shown as inadequate in Fig. 7).

## 6. Validation design
In-sample fit on ~20,000 matches (2009–2015) giving α = 0.8722, E² = 0.2052; temporal holdout on ~3,400 matches (2016–2017) giving α = 0.8667, E² = 0.2065 — the parameter is stable across periods. No cross-validation, no comparison against Elo/Bradley–Terry baselines (notable omission — Kovalchik 2016, cited in the paper, showed Elo beats ten other models, but no head-to-head is run).

## 7. Numerical results / baselines
- α = 0.8722 (2009–2015), E² = 0.2052; naive higher-rank-wins E² = 0.3227 (≈36% relative improvement).
- Holdout 2016–2017: α = 0.8667, E² = 0.2065 — consistent.
- Rank-point structure: rank-16/32/64 means 2009.8/1224.4/753.5 vs theoretical 2430/1260/650; point ratios to rank 32: rank 16 ≈ 1.64 (expected 1.93), rank 64 ≈ 0.62 (expected 0.52).
- Ratio range in data: 0.1 to 10 in "the major part of the matches."

## 8. Code / data availability
None stated. Data from ATP site + Sackmann's GitHub (public, re-scrapable). No code.

## 9. Leakage & limitations
- No lookahead (ranking points are pre-match), but the model is fit on the same 2009–2015 window it describes; only the 2016–2017 check is truly out-of-sample.
- The entire result is downstream of the ATP's engineered point doubling — there is no analog in the NFL, where no official point system exists and "rankings" (power rankings, FPI) are not constructed on a doubling scale. The α ≈ 0.87 exponent is uninterpretable outside tennis.
- Ignores surface, injuries, form, head-to-head — deliberately, but that caps its ceiling and the paper never benchmarks against the Elo models it cites.
- MSE on binary outcomes (E²) is a weak proper-scoring choice vs log loss; no calibration analysis.
- Zero-point players excluded — a selection bias at the bottom of the distribution.
- NFL external validity: none. The NFL has no official ranking points; the closest analog (market-implied ratings) is already in GSE's corpus and strictly more informative.

## 10. GSE overlap
Corpus covers market-implied ratings (benbbaldwin tiers), Elo/nfelo, and official-rating benchmarks (FPI, SP+) — the general principle "official ratings contain predictive signal" is already absorbed. The tennis-specific point-ratio mechanism is **new but non-transferable**. Verdict: no duplication, no extension — a clean REJECT on domain grounds, recorded so no future worker re-reads it.

## 11. GSE implementation spec
None — do not implement. If a future analog is ever wanted (e.g., testing whether College Football Playoff committee rankings predict bowl outcomes via a ratio transform), the recipe is: take the official ranking points, form pairwise ratios, fit p = x^α/(1+x^α) by MSE/log-loss, compare against Elo. Not recommended for NFL.

## 12. Reproducible test
Not applicable (rejected). For the record, the paper's own test is reproducible: Sackmann's tennis CSVs + ATP rankings → compute π_{i,j}, fit α by minimizing E², verify α ≈ 0.87 on 2009–2015 and ≈ 0.87 on 2016–2017. This validates the paper, not a GSE use case.

## 13. Acceptance / rejection gate
Rejected outright: no GSE implementation is proposed, so no gate is needed. The ledger is complete as a negative result — do not re-read this paper for the NFL program.

## 14. Improvement experiment
If the mechanism were ever ported (it shouldn't be for NFL): the natural upgrade is replacing least-squares α with a proper log-loss fit plus surface-specific α_s (clay/hard/grass) — mirroring paper 0609's finding that surface covariates are where the real signal lives. For tennis modeling generally, α-by-surface would likely beat the single global 0.87. Not a GSE action item.
