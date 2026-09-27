# [0647] Modelling Basketball Players' Performance and Interactions Between Teammates with a Regime Switching Approach (arXiv:1912.10417)

**Citation:** Paola Zuccolotto, Marco Sandri, Marica Manisera, Rodolfo Metulini (2019). *Modelling Basketball Players' Performance and Interactions Between Teammates with a Regime Switching Approach*. arXiv:1912.10417v1. URL: https://arxiv.org/abs/1912.10417
**Ledger completed:** 2026-09-21. **Read:** full text (canonical PDF https://arxiv.org/pdf/1912.10417, recovered because cached file was an error stub).
**Verdict:** ADAPT — the three-step pipeline (regime-switching performance decomposition → co-presence ARIMAX interaction effects → signed teammate network → lineup-synergy validation) transfers directly to NFL DFS stacking: quantifying which on-field player combinations positively/negatively affect each other's fantasy-regime probability.

## 1. Research question
Basketball analytics focuses on performance LEVEL, neglecting performance VARIABILITY. Can shot-performance variability be decomposed into alternating good/bad regimes (Markov switching), can teammate co-presence effects on regime probabilities be measured (ARIMAX with covariates), and can those interactions be represented as a network to guide in-game substitution decisions?

## 2. Dataset / schema
- Play-by-play, web-scraped from FIBA (www.fiba.basketball.com): 20 games of Iberostar Tenerife, 2016/2017 Basketball Champions League. One match dropped (missing lineup data).
- Shot-level data: time since last shot / court entry, shot type (2P/3P/FT), made/missed, match goal percentages by shot type, lineup composition per shot.

## 3. Method / model
Three-step procedure:
- Step 1 (performance regimes): event-level measures — shooting intensity φ̃_ij = 1/t_ij, match-adjusted φ_ij = φ̃_ij/φ(m_ij) (Eqs. 1–2); shot efficiency E_ij = x_ij − p_ij where x_ij = make indicator, p_ij = match goal % by shot type (Eq. 3); combined performance ψ_ij = φ̂_ij · E_ij after Nadaraya–Watson Gaussian-kernel smoothing (bandwidth = 25th percentile of player's shots/match) (Eq. 4). Regime analysis on differences ψ̂_ij,Δ(k) = sgn(ψ̂_ij − ψ̂_i(j−1))·|ψ̂_ij − ψ̂_i(j−1)|^k with two-state Markov switching model: E(ψ̂_ij,Δ(k)|R_ij=r) = Ψ^r_i, r ∈ {G,B} (Eq. 5); Markov dynamics Pr(R_ij|history) = Pr(R_ij|R_i(j−1)) (Eq. 6); Gaussian densities per regime; EM estimation (R package MSwM); filtered π_ijr|j (Eq. 7) and smoothed π_ijr (Eq. 8) probabilities. Ergodic unconditional probabilities π_iG = (1−π_iBB)/(2−π_iGG−π_iBB) (Eq. 9); average regime persistence δ_iG = 1/(1−π_iGG), δ_iB = 1/(1−π_iBB) (Eq. 10).
- Step 2 (teammate interactions): for player pairs (i,h), ARIMAX model on filtered good-regime probability π_ijG|j = ε_j + Σ_l α_l π_i(j−l)G|j−l + Σ_l γ_l ε_{j−l} + β_ih C_ijh (Eq. 12), where C_ijh = 1 if teammate h on court at shot j. Orders via Hyndman auto-ARIMA. Significant β_ih (p<0.1/0.05) → directed signed edges in a teammate network (blue = positive, red = negative, thickness ∝ |β_ih|); network metrics: density, reciprocity, eigenvector centrality, in/out degree, signed strength degrees (Barrat et al. 2004).
- Step 3 (team impact): intensity of scored points ISP(η) = (1/2400)·Σ_t w_t scaled to 40 min (Eq. 13); compare ISP40 for subsamples defined by network-selected player pairs/triples vs comparison subsamples.

## 4. Equations & assumptions
- φ̃_ij = 1/t_ij. (Eq. 1)
- φ_ij = φ̃_ij/φ(m_ij). (Eq. 2)
- E_ij = x_ij − p_ij. (Eq. 3)
- ψ_ij = φ̂_ij E_ij. (Eq. 4)
- E(ψ̂_ij,Δ(k)|R_ij=r) = Ψ^r_i. (Eq. 5)
- Pr(R_ij|R_i(j−1),…) = Pr(R_ij|R_i(j−1)). (Eq. 6)
- Filtered π_ijr|j = Pr(R_ij=r|I_j,θ_i); smoothed π_ijr = Pr(R_ij=r|I,θ_i). (Eqs. 7–8)
- π_iG = (1−π_iBB)/(2−π_iGG−π_iBB). (Eq. 9)
- δ_iG = 1/(1−π_iGG); δ_iB = 1/(1−π_iBB). (Eq. 10)
- ARIMAX: π_ijG|j = ε_j + Σ α_l π_i(j−l)G|j−l + Σ γ_l ε_{j−l} + β_ih C_ijh. (Eq. 12)
- ISP(η) = (1/2400) Σ_t w_t; ISP40 = ISP × 2400. (Eq. 13)
- Assumptions: two regimes sufficient; first-order Markov; Gaussian per-regime densities; ergodicity; no explicit control for opponent quality (partially absorbed in match-effect adjustments); 20-game sample of one team.

## 5. Features / target
- Step 1 target: binary regime labels (good/bad performance) via filtered/smoothed probabilities from shot-event sequences.
- Step 2 target: filtered good-regime probability π_ijG|j; features: own lagged probabilities + teammate co-presence dummies.
- Step 3 target: team points intensity per 40 minutes.

## 6. Validation design
No out-of-sample predictive validation. Evidence is in-sample: significance of regime parameters (95% CI on Ψ^G_i > 0, Ψ^B_i < 0), significance of β_ih (90%/95%), and positive ISP40 differences for all network-selected subsamples (Tables 5–7). The k-sensitivity curve (Figure 4) ranks players by robustness of regime switching to the k amplification factor.

## 7. Numerical results / baselines
- Regime parameters (k=0.5, Table 1): e.g., Doornekamp Ψ^G=0.1410, Ψ^B=−0.1274, π_GG=0.8288, π_BB=0.8429; Vazquez Ψ^G=0.2671, Ψ^B=−0.3373.
- Unconditional good-regime probabilities 0.41–0.58; average persistence 3.0–12.3 shots (Table 2); e.g., White stays in regimes ~11.6–12.3 shots.
- Significant teammate effects (Table 3): White→Doornekamp +0.0880*, Doornekamp→Vazquez +0.1202*, Vazquez→San Miguel +0.1406*, San Miguel→Vazquez +0.1013*; negative: Grigonis→Doornekamp −0.0623, Grigonis→Abromaitis −0.0801, San Miguel→Doornekamp −0.0844, White→San Miguel −0.0667.
- Network: density 0.2619; reciprocity 0.3636; Doornekamp & Vazquez most central (eigenvector 1.0).
- Team impact: Doornekamp on court → +5.65 points/40min (Table 5); network-selected pairs: White+Doornekamp +3.33, Doornekamp+Vazquez +12.86, Vazquez+San Miguel +19.10 vs San Miguel alone and +9.54 vs Vazquez alone (Table 6); triples rules +0.46 to +8.90 (Table 7). ALL differences positive — which itself is a red flag for selection/cherry-picking.

## 8. Code / data availability
R packages: MSwM (Markov switching), forecast (auto-ARIMA), igraph (networks). Data: FIBA play-by-play, web-scraped (site structure may have changed). No author code repo linked.

## 9. Leakage & limitations
- k-factor amplification is ad hoc: with k ≤ 0.6 ALL players "significantly switch" (because |Δ|<1 raised to small k inflates small differences); the ranking in Figure 4 is a sensitivity artifact as much as a finding.
- In-sample only; no holdout validation of regime assignments or β_ih; all Table 5–7 differences positive suggests criterion-hacking in subsample selection.
- One team, 20 games — teammate effects may be lineup/schedule confounds; no opponent-quality or game-state controls in the ARIMAX.
- ARIMAX on filtered probabilities (bounded [0,1]) without logit transform — model misspecification risk.
- Basketball-specific: shot-level granularity; NFL analogue must use play-level or drive-level events.
- Gaussian per-regime densities on amplified differences — distributional assumption untested.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus covers player performance modeling and some lineup/DFS optimization, but has no regime-switching performance decomposition and no signed teammate co-presence interaction networks for synergy detection. DFS stacking is done heuristically in the corpus; a formal statistical pipeline for positive/negative on-field synergies is new. Extension, not duplicate.

## 11. GSE implementation spec
- Data: NFL play-by-play (nflverse, existing in GSE corpus) 2022–2024, with on-field personnel per play. Unit of analysis: player-drive or player-game fantasy output; or QB per-drive EPA.
- Adaptation of Step 1: for each fantasy-relevant player, compute per-drive smoothed fantasy-points-above-expectation (expected from GSE's own model); fit 2-state Markov switching on drive-to-drive changes → classifies each player's game into hot/cold regimes. Simpler robust alternative: skip k-amplification (the paper's weakest point), use k=1 differences.
- Adaptation of Step 2: ARIMAX (or logistic regression on regime labels with drive-lag controls) with co-presence dummies: is WR2 on field / in route tree when QB attempts pass j; is backup RB in on 3rd down, etc. Significant β → signed synergy network: QB↔WR positive edges = stack candidates; negative edges = anti-correlation to avoid pairing.
- Step 3: validate with actual DFS-relevant metric — compare lineup combinations' joint fantasy output (e.g., QB+WR combined points per game when both active vs expected from individual averages).
- Use cases: (a) DFS stacking optimizer constraints (require/encourage positive-synergy pairs, penalize negative); (b) GSE pick confidence adjustments when key synergistic teammates are out (inactives); (c) same-game parlay correlation inputs.
- Effort: medium — nflverse data exists; MSwM/statsmodels Markov switching + ARIMAX are standard; main work is play-level personnel alignment.

## 12. Reproducible test
Dataset: 2022–2023 NFL (fit), 2024 NFL (test). Test 1 (regime validity): 2-state Markov switching on QB per-drive EPA-above-expectation; gate = regimes significant (Ψ^G>0, Ψ^B<0 at 95%) for ≥50% of QBs with ≥200 drives, and regime persistence δ between 2 and 20 drives (not degenerate). Test 2 (synergy value): top-20 positive QB→WR synergy pairs from 2022–2023 ARIMAX; on 2024, compare their joint fantasy points per game vs the sum of individual game-average expectations; gate = mean synergy ≥ +1.5 fantasy points/game with paired t-test p < 0.05, and negative-synergy pairs ≤ −1.0. 

## 13. Acceptance / rejection gate
ADAPT if Test 1 passes (regimes are real, not k-artifacts) AND Test 2 passes (synergies replicate out-of-sample with ≥+1.5 pts/game and p<0.05). REJECT if regimes are degenerate (persistence ≈ 1 or ≈ full game) or synergies don't replicate — the paper's in-sample-only evidence doesn't survive contact with a holdout. Fix the paper's k-hack first: use k=1.

## 14. Improvement experiment
Replace ARIMAX-on-filtered-probabilities with a joint hierarchical model: Markov switching whose transition probabilities are functions of on-field personnel (a Markov-switching model with time-varying transition probabilities, Kim 1994 extension): π_GB(j) = logit^−1(γ_0 + Σ_h γ_h C_ijh). This estimates teammate effects directly inside the regime dynamics (no two-stage error propagation, no bounded-dependent-variable problem) and yields per-personnel transition matrices — immediately usable as DFS optimizer inputs (e.g., "with WR2 active, QB's hot-regime persistence increases by x drives").
