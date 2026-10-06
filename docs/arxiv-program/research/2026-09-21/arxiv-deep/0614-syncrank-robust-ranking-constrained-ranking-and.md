# [0614] Sync-Rank: Robust Ranking, Constrained Ranking and Rank Aggregation via Eigenvector and Semidefinite Programming Synchronization (arXiv:1504.01070v1)

**Citation:** Mihai Cucuringu (2015). *Sync-Rank: Robust Ranking, Constrained Ranking and Rank Aggregation via Eigenvector and SDP Synchronization*. arXiv:1504.01070v1. URL: https://arxiv.org/abs/1504.01070v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 12133 lines).
**Verdict:** ADAPT — the SO(2) angular-synchronization ranking (eigenvector method, not the SDP) is a robust, outlier-tolerant rank-aggregation engine worth porting for fusing GSE's multiple rating sources (engine model, market-implied, Elo, FPI); adopt the eigenvector relaxation for speed, add the rank-offset mapping tuned to score differentials, and skip the SDP except for the constrained (semi-supervised) variant.

## 1. Research question
Can the group-synchronization problem over SO(2) — recovering angles from noisy pairwise angle-offset measurements — be repurposed as a statistical ranking engine that is robust to inconsistent/incomplete pairwise comparisons, and can it (a) aggregate multiple rating systems' pairwise matrices, (b) enforce known ranks as hard constraints, and (c) extract locally-consistent partial rankings via densest-subgraph detection? Tested on synthetic noise models plus three real datasets: English Premier League (2011–2014), Halo 2 beta (606 players), NCAA basketball (1985–2014).

## 2. Dataset / schema
- Synthetic: n=100 nodes, Erdős–Rényi or complete measurement graphs, two noise models — MUN (multiplicative uniform noise) and ERO (Erdős–Rényi outliers, a fraction η of measurements replaced by random outliers), 10 replications each.
- Premier League 2011-12, 2012-13, 2013-14 (20 teams, home+away round robin). Four input constructions from (C^home, C^away): C^tpd (total point difference, cardinal), C^stpd (sign of TPD, ordinal), C^nw (net wins ∈ {−2,−1,0,1,2}, cardinal), C^snw (sign of net wins, ordinal).
- Halo 2 beta: 606 players, 6,227 head-to-head games → after dropping <3-game players, n=535 nodes, 6,109 edges, mean degree 22.8 (max 125, sd 19.6). Data courtesy Microsoft Research/Bungie.
- NCAA basketball regular seasons 1985–2014 (e.g., 2014: 351 teams, 5,362 games, ~30 games/team; 1985: 282 teams, 3,737 games).
- Metrics: upsets Q^(u) = Σ_{i<j} 1_{sign(C_ij Ĉ_ij)=−1} (lower better); correlation scores Q^(s) = Σ C_ij sign(Ĉ_ij) and Q^(w) = Σ C_ij Ĉ_ij (higher better); Kendall correlation vs official standings.

## 3. Method / model
Map pairwise rank offsets C_ij to angles Θ_ij on the circle (Eq. 34), form the Hermitian matrix H with H_ij = e^{iΘ_ij} (Eq. 22). Synchronization: recover angles θ_i minimizing inconsistency. Two relaxations: (a) eigenvector — top eigenvector of H, angles from its phases, then sort to a ranking; (b) SDP relaxation of the same least-squares problem, followed by rounding. Rank aggregation (k rating systems): EIG-AGG/SDP-AGG solve synchronization on H̄ = Σ_{u=1..k} H^(u) (Eq. 60–61) — the reduced n×n formulation; the enlarged nk×nk SDP (Eq. 58) is also given. Constrained (semi-supervised) ranking: SDP with hard constraints fixing known ranks (§7); soft constraints via H̃ = H + λQ or a generalized eigenvalue problem with z*Qz ≥ α (§8.1). Local partial rankings: synchronization + spectral densest-subgraph detection (Appendix 10). Ordinal-input scoring: "Superiority Score" S_ij from witness counts W_ij = L(i)∩H(j) (Eq. 36–37) — SYNC-SUP variant. Adjusted Rank-Centrality baselines for ordinal (Eq. 14–15) and cardinal (Eq. 16) inputs. Theory: phase transition — top eigenvector correlates with truth as soon as 1−η > 1/√n (Eq. 21); ER-graph version 1−η > √(n⁵/(8m³)).

## 4. Equations & assumptions
Upsets (Eq. 48): Q^(u) = Σ_{i=1}^{n−1} Σ_{j=i+1}^{n} 1_{sign(C_ij Ĉ_ij)=−1}. Correlation scores (Eq. 49–50): Q^(s) = Σ_{i<j} C_ij sign(Ĉ_ij); Q^(w) = Σ_{i<j} C_ij Ĉ_ij.
Witness/superiority score (Eq. 36–37): W_ij = {k | C_ik=−1 and C_jk=1}; S_ij = ±(W_ij − W_ji) with sign preserving skew-symmetry.
Input constructions (Eq. 44–47): C^tpd_ij = C^home_ij + C^away_ij; C^stpd = sign(C^tpd); C^nw_ij = sign(C^home_ij)+sign(C^away_ij); C^snw = sign(C^nw).
Rank aggregation (Eq. 60–61): Σ_u Σ_{ij∈E} e^{−iθ_i} Θ^(u)_ij e^{iθ_j} = Σ_{ij∈E} e^{−iθ_i} H̄_ij e^{iθ_j}, H̄ = Σ_u H^(u).
Phase transition (Eq. 21): recovery when 1−η > 1/√n.
Rank-Centrality adjustments (Eq. 15): A_ij = 1−½S_ij/n if C_ij>0, ½S_ij/n if C_ij<0; (Eq. 16): A_ij = ½±½C_ij/(n−1).
Assumptions: rank offsets map linearly to angles (wrapping handled by the circle); measurement graph connected enough for spectral concentration; noise models (MUN/ERO) approximate reality; sorting eigenvector phases yields the ranking (rounding step).

## 5. Features / target
- Features: pairwise comparison matrices C (ordinal ±1 or cardinal score differences), possibly k of them from different rating systems; optional known ranks (constraints).
- Target: global ranking minimizing upsets / maximizing correlation scores; for aggregation, one consensus ranking from k systems.
- Baselines: SVD, least squares (LS), Serial-Rank (SER, SER-GLM), Rank-Centrality (original RCO + adjusted RC), SYNC variants (SYNC, SYNC-SDP, SYNC-SUP).

## 6. Validation design
Synthetic: n=100, ER graphs at densities p ∈ {0.2, 0.5, 1.0}, noise levels η swept, 10 replications; accuracy = Kendall correlation with ground truth (Figs. 13–14). Real data: no train/test split (unsupervised ranking) — quality measured by upsets/correlation against the input data itself, plus Kendall correlation vs official standings (which the author explicitly distrusts as a metric: "We do not believe that correlation with the official standings is a good measure of success"). Three seasons of EPL, full Halo 2 graph, 30 seasons of NCAA basketball.

## 7. Numerical results / baselines
- EPL 2013–14 (Table 2, C^nw input; upsets / Score/100 / W-Score/1000 / Kendall-vs-GT): SVD 66/9.5/9.5/0.69; LS 44/10.3/10.0/0.87; SER 44/10.0/9.9/0.80; SYNC 44/10.3/10.0/0.87; SER-GLM 52/10.0/10.0/0.75; SYNC-SUP 48/10.1/10.0/0.84; SYNC-SDP 44/10.3/10.0/0.87; RC 46/10.2/10.0/0.86; GT 54/10.4/10.6/1.00. Claim: "LS, SYNC and SYNC-SDP correlate best with the official ranking… and in almost all scenarios achieve the highest Q^(s), Q^(w)"; upsets alternate between sync methods and SER by preprocessing.
- Halo 2 (Fig. 8): LS, SYNC, RC achieve lowest upsets across all four inputs and best Q^(s); Q^(w) varies (SVD best twice).
- NCAA 1985–2014 (Fig. 9): SYNC-SUP "significantly outperforms all other methods" on upsets — "twice as good as any of the other methods"; LS/SYNC/SYNC-SDP/RC similar second tier; SVD and SER clearly worst. (Author's hypothesis: NCAA measurement graphs are ~1D/league-structured.)
- Rank aggregation synthetics (Figs. 13–14): SDP-AGG best on cardinal MUN, followed by EIG-AGG; on cardinal ERO, EIG-AGG and SDP-AGG best; on ordinal ERO complete graphs, SER-AVG/SER-GLM-AVG beat everything by 2–3 orders of magnitude at η ≤ 0.2 (sync methods' weak spot). The adjusted RC "performs far better than the original RCO."
- No confidence intervals; figure-based claims dominate; n=100 synthetic scale only.

## 8. Code / data availability
None stated. No repository, no code, no data URLs. Datasets: EPL (public), Halo 2 (Microsoft/Bungie, restricted), NCAA (public via sports-reference). All equations needed for reimplementation are in the paper.

## 9. Leakage & limitations
- Unsupervised: no train/test, no held-out prediction — every "result" is in-sample consistency with the input. The EPL/Halo/NCAA numbers measure agreement with the data used to fit, so outperformance claims are about optimization quality, not generalization.
- Distrusts its own external metric (official standings correlation) while reporting it — the honest metric (upsets on input) is circular by construction.
- SYNC-SUP's 2× NCAA win is unexplained (author's 1D-graph hypothesis is "preliminary investigation") — could be a dataset quirk, not a method property.
- Aggregation synthetics cap at n=100, m=5 systems; SDP scales badly (nk×nk) — the paper admits the reduced formulation exists precisely because the enlarged SDP is impractical.
- Ordinal-with-outliers on dense graphs: sync methods lose by orders of magnitude to Serial-Rank averaging — a documented failure mode.
- The ERO noise model (random outlier replacement) may flatter angular embedding vs real-world structured noise (injuries, rest days, tanking).
- NFL transfer: 32 teams, ~17 games each — sparser than EPL's double round robin; angle-mapping of point differentials needs a scale parameter the paper doesn't discuss.

## 10. GSE overlap
Corpus has: Bradley–Terry, Plackett–Luce, Elo, Massey/Sagarin/Colley, TrueSkill (mentioned), Rank-Centrality is not in the corpus, spectral ranking methods are not in the corpus, and multi-rating-system aggregation is an open gap (the 2026-09-18 ML brief lists "ensembling" as a commissioned topic, results not in repo). **Extension / new capability**: Sync-Rank's EIG-AGG gives GSE a principled way to fuse its rating sources (engine v5.2.7 outputs, dynamic Elo, benbbaldwin objective ratings, market-implied tiers, FPI) into one consensus ranking — the corpus has no fusion engine. The constrained-SDP variant maps to "anchor known truths" (e.g., pin playoff teams' relative order). Rank-Centrality (Negahban et al.) is adjacent but the paper's adjusted RC is presented as strictly better.

## 11. GSE implementation spec
- Data: weekly rating snapshots from GSE's sources (engine model probabilities → pairwise matrices via logit differences; Elo differences; market-implied ratings; FPI) for the 32 NFL teams, 2020–2026.
- Build pairwise matrices: for each source u, C^(u)_ij = clipped logit/probability difference (cardinal) or sign (ordinal); map to angles Θ^(u)_ij = π·C^(u)_ij/C_max (scale parameter tuned); H̄ = Σ_u H^(u).
- Aggregate weekly with the eigenvector method (EIG-AGG): top eigenvector of H̄ → phases → consensus ranking. Weight sources by recent predictive accuracy (weighted sum Σ w_u H^(u)).
- Use cases: (1) consensus power ranking published content (weekly graphic); (2) outlier detection — teams where sources disagree (large angular residuals) flagged for analyst review; (3) constrained variant: pin known results (head-to-head just played) via the SDP when fusing mid-week.
- Effort: 3–4 days (numpy/scipy eigensolver; the math is fully specified; tuning = angle scale + source weights).

## 12. Reproducible test
Dataset: NFL 2021–2025, weekly. Build 4 source matrices (GSE engine win probs, Elo, market-implied, FPI) → EIG-AGG consensus ranking each week → predict next week's games via Bradley–Terry on consensus rank gaps (fit a single scale parameter on 2021–2022). Metric: log loss. Baseline: best single source (engine) alone; secondary baseline: simple average of source ranks.

## 13. Acceptance / rejection gate
Adopt EIG-AGG fusion iff on 2023–2025 walk-forward (scale fit on 2021–2022): (a) consensus log loss beats the best single source by ≥ 0.002; AND (b) beats simple rank-averaging by ≥ 0.001 (proves the angular machinery earns its keep over naive ensembling); AND (c) runtime per weekly fusion < 30 s. If only (a) holds, use rank-averaging instead and note the sync machinery as overkill. Reject the SDP variant unless the eigenvector method is within 0.001 (then SDP's cost isn't justified).

## 14. Improvement experiment
The paper's weak spot is ordinal data with outliers on dense graphs (loses to Serial-Rank by 2–3 orders of magnitude). Test a hybrid: EIG-AGG on cardinal matrices + a Serial-Rank-style similarity pre-weighting of H̄'s entries (downweight pairs whose witness-score S_ij disagrees with the direct measurement) — i.e., fuse the paper's own §2.4 witness machinery into the aggregation step. If the hybrid beats both parents on the ERO-ordinal synthetic protocol and on NFL weeks with heavy injury noise, GSE gets a noise-adaptive fusion engine the paper didn't build.
