# [0563] Efficient inference of rankings from multi-body comparisons (arXiv:2501.16565)

**Citation:** Yeung, J., Kaiser, D., & Radicchi, F. (2025). *Efficient inference of rankings from multi-body comparisons*. arXiv:2501.16565. URL: https://arxiv.org/abs/2501.16565
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2884 lines).
**Verdict:** ADAPT — the position-1-breaking Plackett–Luce model fits NFL division-standings/seeding prediction exactly (each division-season is an ordered 4-team hyperedge), and the Newman rearranged iteration gives 5–70× speed-ups for PL/Bradley–Terry fitting; port both, but the NFL is pairwise-dominated so the multi-body advantage must be proven per use-case as the paper does.

## 1. Research question
Can the Plackett–Luce (PL) model — the principled probabilistic generalization of Bradley–Terry to multi-body (multi-entity) comparisons — be fitted with an iterative algorithm as fast as Newman's accelerated BT scheme, and does modeling the true multi-body structure actually predict better than pairwise projections? The paper derives the Newman-style iteration for PL, benchmarks convergence speed-ups, and runs 80/20 cross-validation comparing PL vs pairwise-projected pPL on 9 datasets.

## 2. Dataset / schema
- Synthetic hypergraphs: N=1000 nodes, M=10,000 or 100,000 interactions, interaction sizes K∈[2,10]; scores drawn from the logistic prior, hyperedges sampled per Eq. (1) or Eq. (14).
- FIFA World Cup 1930–2022: N=83 teams, M=364 rounds (each round an ordered hyperedge, K∈[2,4]); Wikipedia sources.
- UEFA Champions League 1992–2024: N=174 teams, M=674 rounds, K∈[2,4].
- Sushi preferences: 5,000 voters, N=10 and N=100 sushi types, K=10 complete rankings (preflib 00014).
- AGH course selection 2004: 153 students × 7 courses, full rankings (preflib 00009).
- APA elections 2009: 12,078 voters ranking up to 5 candidates, K∈[2,5] (preflib 00028).
- Network Science collaborations: 2,461 papers, 3,517 authors, K∈[2,14] (OpenAlex, 1999–2023, journals: Nature, Nat. Commun., Nat. Phys., PNAS, PRE, PRL, PRX, Science, Sci. Adv.; author order inverted so senior author is first).

## 3. Method / model
PL model on ordered weighted hypergraphs: P(ω⃗|π⃗) = ∏_{r=1}^{K−1} π_{ω_r}/Σ_{q=r}^{K} π_{ω_q}. MLE via Zermelo's iteration (Eq. 7, slow) vs the new Newman rearrangement (Eq. 9): π′_s = [Σ_{K,r<K} Σ_{ω⃗∈Ω_s^{K,r}} z(ω⃗)·(Σ_{i=r+1}^{K}π_{ω_i}/Σ_{i=r}^{K}π_{ω_i})] / [Σ_{K,r} Σ z(ω⃗)·Σ_{v=1}^{r−1} 1/Σ_{i=v}^{K}π_{ω_i}]. Convergence criterion A = sqrt((1/N)Σ_s (π_s/(1+π_s) − π′_s/(1+π′_s))²) ≤ 10⁻⁶ (Eq. 8). To guarantee convergence regardless of hypergraph connectedness (full-breaking graph must be strongly connected per Maystre & Grossglauser 2015), they adopt Newman's logistic prior P(π⃗) = ∏_i π_i/(1+π_i)² and maximize the posterior: Zermelo-with-prior (Eq. 12), Newman-with-prior (Eq. 13). Also a position-1-breaking PL variant (Eq. 14, softmax/multinomial-logistic form, Newman iteration Eq. 15) and its pairwise projections pPL (Eq. 16 full-breaking; Eq. 17 position-1-breaking).

## 4. Equations & assumptions
Copied faithfully:
- PL: P(ω⃗|π⃗) = ∏_{r=1}^{K−1} π_{ω_r}/Σ_{q=r}^{K} π_{ω_q} — eq. (1); normalization ∏_i π_i = 1 — eq. (2).
- Log-likelihood: L(Ω|π⃗) = Σ_{ω⃗∈Ω} z(ω⃗) log P(ω⃗|π⃗) — eqs. (3–4).
- Score equations: ∂L/∂π_s = Σ_{K,r} Σ_{ω⃗∈Ω_s^{K,r}} z(ω⃗)(1/π_s − Σ_{v=1}^{r} 1/Σ_{i=v}^{K} π_{ω_i}) = 0 — eq. (6).
- Zermelo iteration (Eq. 7), Newman iteration (Eq. 9), convergence criterion (Eq. 8) with ϵ=10⁻⁶, logistic prior (Eq. 10), posterior (Eq. 11), Zermelo-with-prior (Eq. 12), Newman-with-prior (Eq. 13).
- Position-1-breaking PL: P(ω⃗|π⃗) = π_{ω_1}/Σ_{q=1}^{K} π_{ω_q} — eq. (14); Newman iteration eq. (15).
- pPL projections: P̃ = ∏_{r=1}^{K−1}∏_{t=r}^{K} π_{ω_r}/(π_{ω_r}+π_{ω_t}) — eq. (16); position-1 variant P̃ = ∏_{r=2}^{K} π_{ω_1}/(π_{ω_1}+π_{ω_r}) — eq. (17).
- Assumptions: hyperedges are ordered by true ranking (no ties); scores invariant under common scaling (fixed by normalization); strong connectivity of the projected graph for MLE existence (handled by the prior); synthetic tests draw scores from the prior and order nodes per the model.

## 5. Features / target
No features — pure ranking inference. Input: ordered hyperedges (rankings) over N entities. Target: per-entity scores π_i → rankings. Prediction evaluation: log-likelihood of held-out 20% of interactions under the fitted model.

## 6. Validation design
Speed: ≥10 runs per dataset from different initializations, iterations-to-convergence at ϵ=10⁻⁶, same criterion for both schemes. Prediction: 80/20 cross-validation with 1,000 independent realizations per dataset; compare held-out log-likelihood of full PL vs projected pPL (both full and position-1-breaking variants); synthetic tests also compare against the known ground-truth scores. Top-10 rankings published for FWC/UCL/NS (Table 2).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper (Table 1, iterations to convergence, speed-up = Zermelo/Newman):
- Synthetic (N=1000, M=10,000): Zermelo 103±1, Newman 11.0±0.1 → 9×. Synthetic (N=1000, M=100,000): 169±1 → 11.0±0.1 → 15×.
- FWC: 50±2 → 9.0±0.3 → 6×. UCL: 60±2 → 11.1±0.5 → 5×. Sushi-10: 14±1 → 7.6±0.5 → 1.8×. Sushi-100: 21±2 → 6.9±0.3 → 3×. AGH: 534±4 → 7.6±0.4 → 70×. APA: 16±1 → 7.3±0.5 → 2.2×. NS: 144±7 → 24±1 → 6×.
- Prediction (Fig. 2 synthetic; Fig. 3 real): true PL consistently beats pPL on held-out log-likelihood; ground-truth scores beat both. On real data, multi-body PL is more predictive than pairwise pPL for every dataset except APA 2009 (equal — authors question whether that dataset is genuinely multi-body). Position-1-breaking PL is ≥ its pPL variant everywhere; the gap is largest where the full ranking order is informative (survey data), and small for FWC/UCL where most comparisons are pairwise.
- Top-10 (Table 2): FWC: Brazil, Germany, Italy, Argentina, Netherlands, France, Croatia, England, Sweden, Czechoslovakia. UCL: Real Madrid, Bayern Munich, Barcelona, Liverpool, Chelsea, Manchester City, Juventus, Milan, PSG, Atlético Madrid. NS (position-1-breaking): Vespignani, Makse, Amaral, Pastor-Satorras, Sneppen, Barabási, Zdeborová, Havlin, Mendes, Stanley (A. Vespignani top: senior author on all 28 co-authored papers).

## 8. Code / data availability
Data and code: https://github.com/jackyeung99/higher_order_ranking (full rankings published there). FWC/UCL from Wikipedia; sushi/course/APA from preflib; NS from OpenAlex.

## 9. Leakage & limitations
Adversarial notes: (a) the speed-up numbers compare iteration counts, not wall-clock — the Newman update has heavier per-iteration work, though on FWC/UCL Figure 1 the wall-clock-style error curves still favor it; (b) for prediction, the held-out "events" are random 20% of interactions, not time-ordered, so temporal leakage inflates both models (the real question — predicting future tournaments — is not tested); (c) convergence requires the logistic prior for disconnected hypergraphs, i.e., the prior is doing shrinkage work the paper underplays; (d) for FWC/UCL the multi-body gain is small because most rounds are pairwise — the datasets were chosen to include genuine multi-body events but barely have them; (e) NFL relevance is limited: NFL games are strictly pairwise, so the PL-vs-pPL finding does not apply to game outcomes — the transferable parts are the position-1-breaking variant (division/seed winners) and the fast iteration algebra.

## 10. GSE overlap
Extension. The corpus inventory lists Bradley–Terry and Plackett–Luce as inventoried concepts (26-metric catalog) but shows no fitting-implementation work and no PL applied to football standings. The paper itself is the first in this batch validated on real sports outcomes (FWC/UCL), which is directly adjacent to GSE's lane. The Newman iteration scheme is a concrete engineering upgrade over whatever iterative BT/PL fitting GSE uses.

## 11. GSE implementation spec
1. Build the NFL division hypergraph: each season 2002–2025, each of 8 divisions yields one ordered hyperedge of 4 teams (final standings order) → 192 multi-body comparisons. 2. Fit position-1-breaking PL (Eq. 14, Newman iteration Eq. 15 with logistic prior Eq. 10) to pre-season-observable inputs only: pre-season market-implied division-winner odds and/or Elo → hyperedges of predicted order (train on 2002–2022). 3. Predict each season's division winner for 2023–2025; baselines: pairwise BT on head-to-head games and raw market-implied probabilities. Metric: held-out log-likelihood of the winner + top-1 hit rate. 4. Separately, swap GSE's BT/PL fitting loops to the Newman rearrangement (Eq. 13/15) wherever iterative score fitting is used — pure speed win. Effort: ~1 week (data already in nflverse; fitting code from the GitHub repo as reference).

## 12. Reproducible test
Dataset: NFL division final standings 2002–2025 (nflverse) + pre-season division-winner odds (market captures per repo props-consensus workflow; archive where needed). Protocol: train position-1-breaking PL on 2002–2020, predict division winners 2021–2025 (time-ordered — fixing the paper's random-CV flaw). Baselines: (a) pairwise BT fitted on regular-season games; (b) market-implied probabilities. Metrics: top-1 hit rate and log-loss on the 8 division winners per season (40 events).

## 13. Acceptance / rejection gate
Adopt position-1-breaking PL for division-winner modeling if, on the 2021–2025 time-ordered test, it matches or beats the market baseline on log-loss (within 0.02) AND beats pairwise BT on top-1 hit rate by ≥1 additional correct division — then the multi-body structure is earning its keep for the NFL case (mirroring the paper's PL-vs-pPL test). Reject if it underperforms the market on log-loss by >0.05: then pre-season odds already subsume the structure and the NFL analogue of the paper's finding is negative.

## 14. Improvement experiment
NFL playoff seeding (7 seeds × 2 conferences per season) is a richer multi-body target than division winners (K=7 vs K=4). Fit the full PL (Eq. 1, Newman iteration Eq. 9) to pre-season predicted seed orders 2002–2025 and test whether modeling the *entire* seed order beats position-1-breaking on held-out seasons — this directly tests the paper's "genuine multi-body" hypothesis in the NFL: if full-order PL beats position-1-only, NFL seed positions carry joint information worth modeling; if not, the NFL analogue of the APA result holds (pairwise/first-place suffices).
