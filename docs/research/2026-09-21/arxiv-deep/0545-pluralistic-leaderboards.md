# [0545] Pluralistic Leaderboards (arXiv:2606.02547v1)

**Citation:** Haghtalab, N., Procaccia, A. D., Shao, H., Wang, S. L., & Yang, K. (2026). *Pluralistic Leaderboards*. UC Berkeley / Harvard / UMD. arXiv:2606.02547v1. URL: https://arxiv.org/abs/2606.02547v1
**Ledger completed:** 2026-09-21. **Read:** full text main body (PDF text extract; appendices A–D proofs and ranking tables skimmed).
**Verdict:** ADAPT — the LLM domain does not transfer, but the *local stability* fairness criterion for rankings plus the geometric-checkpoint construction ports directly to GSE's published pick sheets and power rankings: a single consensus ranking can systematically shut out a cohesive subgroup, and this paper gives a formal, testable criterion for detecting and fixing it.

## 1. Research question
LMArena-style leaderboards fit a single Bradley–Terry model to pairwise comparisons, collapsing heterogeneous users (safety vs creativity, concise vs thorough) into one scalar "quality". The paper demonstrates BT is *misspecified* under heterogeneous preferences: two preference profiles can induce identical pairwise comparisons (hence identical BT rankings) while one profile's 40% faction is completely shut out of the top-3. Research problem: design *pluralistic leaderboards* — ranking mechanisms from pairwise comparisons that fairly represent heterogeneous preferences — formalized via **local stability** from social choice theory, with sample/query complexity bounds.

## 2. Dataset / schema
- **Synthetic:** mixtures of k Mallows models (central rankings drawn uniformly, dispersion φ ∈ {0.1, 0.5, 0.9}, weights 1/k), m = 20 candidates.
- **Semi-synthetic LMArena:** based on the "arena-human-preference-140k" dataset (huggingface.co/datasets/lmarena-ai/arena-human-preference-140k); top m = 20 models by BT score; user distribution = mixture of Mallows with one center per each of the 20 largest prompt categories (center = per-category BT ranking; weight = relative battle count per category; Appendix D.4).
- **Model:** users i ∼ D with strict preference orders σ_i over m models; each user contributes d pairwise battles (x_i^t ≻_i y_i^t); users are *consistent* (battle outcome matches their latent ranking). Mechanism complexity measured by (i) comparisons per user d, (ii) total users sampled n.

## 3. Method / model
**Local stability.** Committee W_k of size k is **γ-approximately locally stable** if max_{a∉W_k} Pr_{i∼D}[a ≻_i W_k] ≤ γ/k (a ≻_i W_k = user i prefers a to *every* model in W_k). A ranking π is γ-approximately locally stable if every top-k prefix W_k^π satisfies this for all k ≤ m.
**Algorithm 1 — committee selection via iterated rounding** (adapted from Jiang et al. 2020 to sampling + sparse pairwise queries): T = ⌈10 log(k/ε)⌉ rounds; α = 1/2 + 4ε, β = 1/4 + 2ε; sub-committee sizes k_t = max{1, ⌊(1−α)α^{t−1}k⌋} (geometric decrease). Each round: sample the *unsatisfied* user distribution (estimated-rank threshold β−ε, conservative to absorb estimation error), draw a (1+ε)-approximately stable lottery Δ_t over size-k_t committees, keep the support member minimizing estimated unsatisfied mass. Rank estimation oracle: Rank̂(i;S,Δ) = (1/L)Σ_ℓ 1[S ⪰_i S'_ℓ] with S'_ℓ ∼ Δ; each committee-vs-committee comparison costs |S|+|S'| pairwise queries.
**Algorithm 2 — ranking via geometric checkpoints:** run Algorithm 1 at geometrically growing committee sizes k_r = ⌊λ^{r−1}⌋; concatenate new members blockwise. Every prefix contains a checkpoint committee within a constant factor of its size, transferring stability with factor λ²/(λ−1)·γ (λ = 2 best theory).
**Algorithm 3 — heuristic via committee monotonicity:** single-addition decomposition (k_t = 1, T = m); order candidates by the round they're added — monotone nested committees, fewer samples, weaker theory.

## 4. Equations & assumptions
- γ-approximate local stability: max_{a∉W_k} Pr_{i∼D}[a ≻_i W_k] ≤ γ/k.
- Stability estimator: γ̂ = k·(max_{a∉W_k} (1/n)Σ_i 1[a ≻_i W_k]).
- Rank oracle: Rank̂(i;S,Δ) = (1/L)Σ_{ℓ=1}^L 1[S ⪰_i S'_ℓ]; Õ(1/ε²) draws for ε additive error.
- Lemma 3.2 (satisfied users): Pr_{i∼D̂_t^x}[a ≻_i S_t, i newly satisfied] ≤ (1+ε)/(k_t(x−ε)).
- Lemma 3.3 (progress): unsatisfied mass μ̂_t ≤ (β+2ε)^{t−1} geometrically.
- Checkpoint transfer: Pr[a ≻_i W_k^π] ≤ Pr[a ≻_i A] ≤ γ/|A| ≤ c·γ/k when |A| ≥ k/c.
- **Stated assumptions:** (1) users consistent across battles; (2) context-dependence folded into latent user type (prompt-dependence deferred to future work); (3) mechanism may *adaptively* choose battle pairs per user (offline/pre-collected data setting explicitly out of scope — §6); (4) the paper deliberately targets the *weaker* local-stability notion, not PSC: Appendix A proves PSC (Proportionality for Solid Coalitions) is **unverifiable** from k-wise comparisons — no deterministic algorithm can check it, and no randomized algorithm succeeds with probability > k/(k+1) (Prop A.2, via Halpern et al. 2024 k-indistinguishability).

## 5. Features / target
- **Inputs:** sparse pairwise comparisons (battles) from sampled users; no features — pure preference aggregation.
- **Targets:** a full ranking π over m models satisfying per-prefix local stability.

## 6. Validation design
- **Synthetic (committee stability):** mixture of k Mallows, m = 20; compare Algorithm 1 vs (i) ideal baseline (top candidate of each Mallows center) and (ii) status-quo baseline (top-k prefix of BT ranking); metric = estimated stability ratio γ̂ (γ̂ ≤ 1 = stable); 10 repeats.
- **LMArena semi-synthetic (ranking stability):** compare BT ranking vs Algorithms 2 and 3 on per-prefix γ̂ for all k; φ ∈ {0.1, 0.5, 0.9}; 5 repeats.
- No code released in the paper; algorithms are fully specified pseudocode.

## 7. Numerical results / baselines
- **Theorem 3.1 (Algorithm 1):** (16+O(ε))-approximately stable committee w.h.p. 1−δ; n = O(poly(m, 1/ε, log 1/δ)) users; **d = O((k/ε²)·log(m/εδ)) comparisons per user** (Õ(k) for constant ε). E.g., ε = 0.01 → factor 18.97; ε = 0.05 → 39.2.
- **Theorem 4.1 (Algorithm 2):** λ²/(λ−1)·γ-approximate stability (λ = 2 optimal for theory).
- **Synthetic:** Algorithm 1 produces stable committees (γ̂ well below the 16+O(ε) bound) across all k and φ. **BT top-k prefix violates stability for many k at φ = 0.1 and φ = 0.5.** The "Mallows centers" ideal baseline is stable at small φ but violates stability at φ = 0.9 (centers stop covering dispersed users).
- **LMArena semi-synthetic:** **BT ranking violates stability for top-k prefixes k = 4, 5 at φ = 0.1 and k = 5 at φ = 0.5**; Algorithms 2 and 3 maintain stability for *all* k and all φ. Algorithm 3 (heuristic) slightly outperforms Algorithm 2 empirically despite weaker theory. At φ = 0.9 stability is "easiest" (high diversity → no large cohesive clusters).
- **Sampling budgets (Appendix D):** Algorithm 1 (Mallows, k = 5, φ = 0.5): 18,540 users, median 38 pairwise comparisons/user (max 98). Algorithm 2 (LMArena): 39,080 users, median 24 (max 95). Algorithm 3: 74,150 users, median 5 (max 45) — the heuristic is dramatically cheaper per user. MWU oracle: T_MWU = 20, T_Oracle = 30, n_MWU = 50, n_eval = 100. Notable identity (D.3): BT over all pairs ≡ Borda count ≡ Elo over all pairwise comparisons.

## 8. Code / data availability
No code released. Algorithms fully specified (Algorithms 1–3 + oracles in appendix). LMArena 140k dataset is public (Hugging Face). Synthetic experiments reproducible from the Mallows specification.

## 9. Leakage & limitations
- **No real-user evaluation:** the LMArena experiment is semi-synthetic — a Mallows mixture *fit around* real BT rankings, not real users' latent rankings; the stability violations of BT are demonstrated on simulated heterogeneity, and the authors are upfront about this (§5.2).
- **Adaptive querying is load-bearing:** the guarantees require the mechanism to choose battle pairs per user adaptively (§6 admits offline/pre-collected data is out of scope) — this kills direct application to any fixed historical dataset, including GSE's.
- **Approximation factors are large in theory** (16+O(ε); 18.97 at ε=0.01) — the theory is a feasibility result; the empirical γ̂ is much better but reported only via figures, no tables of exact values.
- **Consistency assumption** (user's battles always match a fixed latent ranking) is strong; prompt-dependent preferences deferred.
- **Committee sizes in experiments are small** (m = 20); scaling to hundreds of candidates (LLMs, or GSE's full pick universe) is untested.
- **PSC ceiling:** the stronger PSC notion is not just hard — Appendix A proves it is *unverifiable* from k-wise comparison data (deterministic impossible; randomized ≤ k/(k+1)). Any GSE port inherits this: stability (the weak notion) is checkable, proportional representation for solid coalitions is not.
- **Sample hunger:** the stability guarantee costs 18k–74k users per committee/ranking in the paper's experiments; a GSE port must get by with game-context clusters as pseudo-users (far fewer "users"), so the empirical γ̂ will be noisier than the paper's setting.

## 10. GSE overlap
Per the existing-research map: GSE has consensus/aggregation machinery (BT covered in ledgers 0004, 0542, 0544) and published rankings (power ratings, pick sheets), but **no fairness/representation criterion for rankings** — the corpus has no local-stability analogue, no analysis of whether a single consensus ranking shuts out cohesive user subgroups, and no checkpoint-style construction. The paper's BT-misspecification argument also applies to GSE *if* GSE ever blends heterogeneous signals (e.g., sharp vs public, model vs market) into one scalar. Verdict: **extension** — a new evaluation criterion + construction for GSE's ranking outputs, orthogonal to the accuracy-focused BT work.

## 11. GSE implementation spec
1. **Stability audit of GSE's published pick sheet.** Port the criterion: define "users" as matchup-context clusters (e.g., k-means clusters of game feature vectors from nflverse 2018–2025), "candidates" as the week's candidate picks, and user preference as realized pick profitability within cluster. Compute γ̂ for GSE's published top-k picks each week: flag weeks where an excluded pick would have been preferred by > γ/k of contexts. This directly tests whether GSE's single ranking systematically shuts out a cohesive game-type. Effort: ~3 days.
2. **Checkpoint-structured weekly pick sheet.** If the audit finds violations: restructure the published sheet using Algorithm 2's blockwise idea — top pick = stable singleton, then geometrically growing blocks (1, 2, 4, …) each chosen to represent currently-unrepresented game contexts — so every prefix of the sheet is guaranteed representation coverage. Effort: ~1 week.

## 12. Reproducible test
- **Dataset:** nflverse 2020–2024; GSE's historical weekly pick sheets (or engine top-k outputs) for 2022–2024.
- **Baseline:** the published top-k pick ordering itself.
- **Protocol:** cluster weeks' games into 8 context clusters (features: spread, total, rest, dome, divisional); for each week, define cluster preference = ATS profitability rank of each candidate pick; compute per-prefix γ̂ for k = 1..5 across all weeks; report fraction of weeks with γ̂ > 1 (stability violation) at each k. Expectation from the paper's BT finding: violations concentrate at small k (k = 2–5), where the sheet matters most.

## 13. Acceptance / rejection gate
- **Adopt the stability audit as a standing weekly check** if the backtest finds γ̂ > 1 violations in ≥ 15% of weeks at any k ≤ 5 (2022–2024) — i.e., the single-ranking shutout problem is real in GSE's outputs. **Adopt the checkpoint-structured sheet** only if, on the same backtest, a blockwise-stable reconstruction of the top-5 achieves equal-or-better aggregate ATS ROI *and* zero violation weeks. **Reject otherwise.** Gates stated before running; cluster count (8) and k range (1–5) fixed in advance.

## 14. Improvement experiment
Go beyond the paper's prefix-stability: implement **full local stability** (Aziz et al. 2017b's stronger notion, §6) on the pick sheet — require that any user subgroup of O(ℓ/k) fraction has no collective deviation of size ℓ. The paper leaves this as future work even for LLMs. For GSE the "users" are game-context clusters and the "deviation" is a multi-pick parlay/slate — test whether the checkpoint construction extends to slate-level (multi-pick) representation, which is exactly the product shape of GSE's DFS content. This would turn a theoretical open problem into a shipped product feature: "every stable slate, guaranteed representative."
