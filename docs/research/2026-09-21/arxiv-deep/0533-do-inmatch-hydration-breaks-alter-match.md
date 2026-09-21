# [0533] Do In-Match Hydration Breaks Alter Match Momentum? A Within-Match Case-Crossover Analysis of the 2026 FIFA World Cup (arXiv:2607.19783v2)

**Citation:** Debangan Dey (2026). *Do In-Match Hydration Breaks Alter Match Momentum? A Within-Match Case-Crossover Analysis of the 2026 FIFA World Cup*. arXiv:2607.19783v2. URL: https://arxiv.org/abs/2607.19783v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 75904 chars; all sections incl. tables, figures discussion, appendices C/B summaries read; references skimmed).
**Verdict:** ADAPT — the case-crossover design is a clean quasi-experimental template GSE can reuse for in-game causal questions (weather stops, injury timeouts, challenge reviews, booth-review delays) using NFL play-level momentum proxies; the momentum-finding itself (momentum reverts through stoppages) is directly relevant to live-betting edge and heat-policy totals modeling.

## 1. Research question
Do the mandated ~3-minute hydration breaks near the 22nd minute of each half in the 2026 FIFA World Cup blunt the momentum of whichever side is dominant (the pundit claim), or does momentum simply mean-revert through the stoppage? A within-match case-crossover design tests this, differencing out all match-level characteristics and adjusting only for game time, scoreline, and pre-break momentum state.

## 2. Dataset / schema
- 99 World Cup 2026 matches (67 group, 32 knockout), 198 break events (exactly 2 per match), 3,139 non-break control anchors. 3 matches dropped (empty/over-long series, missing second-half break).
- Outcome: SofaScore Attack Momentum, minute-resolved signed index (home positive), re-oriented to dominant side: o_i = sign(mean of raw momentum over 5 min pre-break); Y_i(t) = o_i·M_i(t) so positive = momentum toward pre-break dominant side (Eq. 1).
- Pre-break window [c−5, c−1]; in-play 3 min blanked [c, c+2]; post-break outcome [c+3, c+12]; first-half break median minute 23 (IQR 23–24), second-half 68 (IQR 68–69); 96% of breaks 2–3 min wide.
- Event-based outcome: net expected goals (SofaScore xG).
- Covariates: oriented score margin, pre-break momentum level+slope, match-dated international Elo (dominant side mean +111, SD 227), WBGT heat index (mean 24.2°C, SD 4.3, range 17.8–34.7; indoor stadia set to 20.7°C), local kickoff hour (median 17:00).
- External-control pool: Copa América 2019/2021/2024, EURO 2020/2024, Gold Cup 2019/2021/2023/2025, World Cups 2018/2022 — same covariates.
- Data/code: https://github.com/Ddey07/wc2026-hydration-momentum (MIT); derived datasets + break timings open; SofaScore series regenerated via public interface (not redistributed).

## 3. Method / model
Primary: within-match case-crossover — each break event's own match supplies control minutes (self-matched), differencing out every match-level characteristic mechanically (teams, Elo, WBGT, stadium, era all collinear with match fixed effect α_i). Two counterfactual designs for the break window: (a) clock-aligned — break and control compared at same clock offset (windows [s+3,s+12] vs [c+3,c+12]); (b) play-aligned — break removed as dead time, resume minute matched to control's first play minute ([e,e+9] vs [c+1,c+10]).
Estimation: within-match fixed-effects ANCOVA with match-clustered SEs: Y_ic = α_i + g(c) + φ·half + λ·L^lev + ψ·L^slp + δ·S + β·D + γ(D×S) + ηᵀ(D×Z) + ε (Eq. 3); g(c) = quadratic game-time trend (θ₁c + θ₂c²) by default; Z = heat, Elo gap (match-level modifiers enter only as interactions). Corroborating check: random-intercept (Mundlak-style) mixed model. Estimand: case-crossover ATT local to observed break minutes, τ = E[Y(1)−Y(0)|D=1] (Eq. 2). Placebo break at 38′/82′ as falsification. External design: tight-caliper (0.2 SD logit) propensity-score matching to historical no-break minutes, with common-support trimming.

## 4. Equations & assumptions
- Sign-adjusted outcome (Eq. 1): o_i = sign((1/5)Σ_{k=1}^5 M_i(c−k)) ∈ {±1}; Y_i(t) = o_i·M_i(t).
- ATT estimand (Eq. 2): τ = E[Y_ic(1) − Y_ic(0) | D_ic=1].
- Fixed-effects model (Eq. 3): Y_ic = α_i + g(c) + φ·half_c + λ L^lev_ic + ψ L^slp_ic + δ S_ic + β D_ic + γ(D_ic×S_ic) + ηᵀ(D_ic×Z_i) + ε_ic.
- External estimand (Eq. 4–5): τ_ext = E[E[Y|D=1,X^ext] − E[Y|D=0,X^ext] | D=1].
- Assumptions (A1) conditional exchangeability given {g(c), half, L, S} + match effect (break minute governed by clock/referee protocol, not by evolving play state); (A2) no anticipation; (A3) SUTVA (single treatment version, no cross-match interference); (A4) within-match positivity (holds for scoreline/momentum-state but NOT for game time — no untreated minute exists at the break location, so the main effect β is a trend extrapolation).

## 5. Features / target
Target: sign-adjusted post-resumption momentum over 10 minutes (dominant side positive; pre-break level mean +20.4). Event-based target: net xG over the same windows. Features (adjustment set): quadratic game-time trend, half, pre-break momentum level + slope, oriented score margin; modifiers (interaction only): Elo gap/100, lead, WBGT.

## 6. Validation design
Self-matched within-match design with cluster-robust inference; placebo break at 38′/82′ (returns no effect); sensitivity to in-play exclusion width and referent-band relocation; trend specification robustness (quadratic default vs polynomial vs saturated per-minute dummies). External design: propensity-score tight-caliper matching (0.2 SD, Austin 2011), nonparametric bootstrap percentile intervals, positivity diagnosed via overlap (Figure 6, Appendix A). Read-by-effect-size protocol: no significance declarations (Amrhein et al. 2019 guidance). No train/test splits — causal identification design, not a predictor.

## 7. Numerical results / baselines
- Main effect (Table 3): within-match +0.26 [−2.50, +3.02] clock-aligned; −0.63 [−3.63, +2.37] play-aligned. External matched: −1.57 [−5.00, +1.87] clock-aligned; −2.48 [−5.97, +1.01] play-aligned. Every interval crosses zero; play-aligned leans negative everywhere.
- Break×lead: −0.90/goal averaged over strength; −2.19 to −2.23/goal (SE 1.36–1.39) holding strength fixed (Table 2). At level scoreline effect ≈ +0.4; at 2-goal lead ≈ −4.1 at average strength, interval [−9.3, +1.1] — asymmetric about zero.
- Break×Elo/100: +1.59 (SE 0.80), +1.58 (SE 0.81) — THE ONLY statistically significant interaction. At level scoreline, implied effect runs from −4 points (200-point underdog dominant) to +5 points (400-point favorite dominant).
- Heat: cool matches ≈0 (+0.5 clock-aligned, −0.3 play-aligned); hot matches (WBGT≥28°C, n=42 events) −0.96 [−6.6,+4.7] clock-aligned, −2.80 [−8.3,+2.7] play-aligned; external hot +4.60?? — external-design hot effect −4.60 [−9.6,+7.6] vs cool +0.43 [−2.4,+3.0]. Heat×break continuous term −0.21 (SE 0.31).
- Event-based net xG: essentially zero under both counterfactuals: −0.001 [−0.051,+0.049] clock-aligned; +0.011 [−0.051,+0.073] play-aligned.
- Sensitivity (Appendix B, Table 5): main effect β moves +1.1 → −5.1 when referent band relocated; saturated per-minute dummies → β = −1.7 [±7]; break×lead slope stays ≈ −0.2 across trend specs — interactions stable, main effect fragile.
- Observations: 3,337 anchor observations across 99 matches.
- Interpretation: momentum reverts through the break at the same rate as at non-break minutes (Figure 4a); the break excises the dominant side's continued pressure but leaves no trace in chance creation.

## 8. Code / data availability
Full code + derived datasets + break timings: https://github.com/Ddey07/wc2026-hydration-momentum (MIT). SofaScore Attack Momentum/xG series proprietary but regenerable from SofaScore's public interface via provided script.

## 9. Leakage & limitations
Author-stated (honestly): n=99 matches → no power to reject a small effect; wide intervals read as power limits, not evidence of null. Main effect is a trend extrapolation into an unobserved window (fragile; moves ±6 points across specifications). Interactions selected after inspection, no multiplicity adjustment — exploratory. External design has a positivity void: no historical match above WBGT 32°C (a dozen 2026 break events above it); 28% of break events kick off ≤14:00 vs 2% of controls. Effect modifiers (Elo, heat) identified cross-sectionally across matches, not causally. The momentum index is SofaScore proprietary with algorithmic decay artefacts during stoppages (the 3-minute blanking handles it but the play-aligned transient dip is index artefact, confirmed by the zero xG effect). Transfer limits: soccer-specific claim; NFL stoppages differ (injury timeouts, 2-minute warning, challenges) and NFL momentum proxies (EPA/success per drive) are coarser than minute-resolved indices. Pre-break dominant-side definition (5-min window sign) is a construction choice. An LLM assisted dataset compilation/code under author supervision (disclosed).

## 10. GSE overlap
New capability + methodological extension. Garrett's corpus: weather-physics-for-totals is an explicit GAP (#8: "no papers on wind physics × stadium geometry × passing efficiency"); referee-crew effects studied for MNF totals (2026-09-19 DK work) but never causally identified; momentum is a corpus-relevant concept (MOVE-37 Koopman/DMD momentum was REJECTED p=0.89; AR(1) beat DMD — this paper's "momentum reverts through stoppages as if play continued" is consistent with that finding but in a causal rather than dynamical-systems frame). Nothing in the corpus uses a case-crossover/self-controlled design for in-game causal questions — this is a transferable template. The weather-physics gap (#8) and referee-crew effects are the exact places this design slots in: within-game comparisons difference out team quality, stadium, and era mechanically.

## 11. GSE implementation spec
Port the case-crossover design to two GSE lanes:
1. **Injury-timeout / weather-stop effect on live spreads** (gap #7, in-play modeling): for every NFL weather delay or injury timeout (2020–2025, nflverse pbp + game logs), define "break events" with pre-break window = prior 3 drives (or 5 min game time), blank the stopped minutes, post-window = next 3 drives. Outcome: oriented EPA/drive (sign-adjusted to pre-break dominant side, mirroring o_i) and net expected points. Controls: non-stoppage drive sequences in the same game matched on quarter, score margin, pre-break EPA slope. Two counterfactuals: clock-aligned (game-clock window) vs play-aligned (drive-aligned). Estimand: causal effect of the stoppage on momentum. Serving: pre-computed effect table by (score margin, time remaining, weather severity) fed into the live model.
2. **Referee-crew stoppage burden on totals** (corpus extension): crew-level comparison — games with high stoppage-minute counts as "treated," matched same-game clock windows; outcome = drive EPA pace. This upgrades the existing referee-crews MNF totals work from correlation to quasi-causal.
3. Compute within-game, cluster SEs on game; placebo test at arbitrary non-stoppage minutes.
Estimated effort: 4–6 engineer-days (stoppage-event extraction from pbp + case-crossover pipeline + placebo/sensitivity battery). Risk: low — descriptive findings regardless.

## 12. Reproducible test
Dataset: nflverse pbp 2020–2025; all games with a weather delay ≥15 min or injury timeout ≥4 min (stoppage events, ~60–120 events expected); controls = non-stoppage 6-drive sequences from same game matched on quarter + score margin + pre-window EPA/drive slope. Baseline model: naive before/after contrast (mean EPA/drive 3 drives before vs 3 drives after the stoppage — the "pundit" estimator). Candidate: the case-crossover estimator (Eq. 3 analog: game fixed effect + quadratic game-time trend + pre-window level/slope + score margin + stoppage indicator). Metric: bias of the naive estimator vs case-crossover under a placebo (apply both at random non-stoppage windows — bias should vanish for the case-crossover, persist for the naive estimator if mean reversion contaminates it). Success = placebo bias |naive| > 2× |case-crossover| AND the real-stoppage ATT estimate's 95% CI has correct coverage in a permutation null.

## 13. Acceptance / rejection gate
ADOPT the case-crossover module if: (a) the placebo battery shows the naive before/after estimator has mean-reversion bias ≥0.05 EPA/drive while the case-crossover bias is <0.02 EPA/drive; AND (b) at least one stoppage-type ATT (weather delay or injury timeout) has |effect| ≥0.05 EPA/drive with cluster-robust 95% CI excluding zero, or the design is shown to have power (permutation test) to detect such an effect. REJECT if stoppages are too rare (<40 events) for stable inference or the case-crossover CI is too wide to rule out ±0.1 EPA/drive — the live model then stays with the naive estimator plus a mean-reversion correction.

## 14. Improvement experiment
Go beyond the paper: HOME-TEAM-ASYMPTOTIC stoppage effect — the paper's cleanest result was the Elo-gap interaction (strong favorites sustain momentum through breaks). Test in NFL whether the stoppage effect on momentum differs for home vs away dominant sides (home sideline medical access, crowd energy after resumption). If a home/away×stoppage interaction exists, wire it into live spread/total adjustments during weather delays: e.g., a trailing away team's momentum decay through a weather stop is steeper (crowd re-engages) → adjust live totals down by the estimated EPA/drive shift. The paper never tests directional/team-side asymmetry of the interaction; NFL home-field structure makes this the natural extension.
