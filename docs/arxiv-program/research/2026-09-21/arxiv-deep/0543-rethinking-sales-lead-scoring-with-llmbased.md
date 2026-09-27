# [0543] Rethinking Sales Lead Scoring with LLM-based Hierarchical Preference Ranking (arXiv:2606.04387v1)

**Citation:** Zhang, C., Liu, Y., Sun, Y., Zhang, X., Cao, Y., Jiao, J., & Qiao, J. (2026). *Rethinking Sales Lead Scoring with LLM-based Hierarchical Preference Ranking*. Intelligent Business Team, Li Auto Inc. arXiv:2606.04387v1. URL: https://arxiv.org/abs/2606.04387v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1756 lines).
**Verdict:** ADAPT — the sales-lead domain does not transfer, but the funnel-hierarchy → tiered-margin Bradley–Terry pair construction (HPRO) is a clean, portable device for injecting domain priors into GSE's pairwise ranking and game-importance weighting.

## 1. Research question
In long-chain B2B sales (automotive), supervision is sparse: a test-drive customer and a website browser are both labeled "non-converted" if neither buys, yet their intent differs enormously. Standard pointwise CTR-style models and rule scorecards optimize only terminal labels, discarding intermediate funnel information. The paper asks: can an LLM-based discriminative framework (joint tabular + dialogue modeling) combined with a *hierarchical preference ranking* objective — turning the sales funnel into tiered preference pairs with margin-encoded business priors — beat industrial CTR baselines on both classification (AUC) and top-of-list ranking precision, and does it move real sales volume in a 132-day A/B test?

## 2. Dataset / schema
- **Two proprietary datasets** from a leading NEV (new-energy-vehicle) retail system (Li Auto):
  - Benchmark: 340k samples, 1.45% positive (order lock-in); enables fair comparison with CTR baselines under consistent feature engineering.
  - Industrial: 6.14M samples, 1.33% positive; richer intermediate behavioral signals (test drives, call durations) for HPRO training.
- **Features:** x_i = (T_i, L_i) — tabular (demographics, behavioral statistics) + dialogue (sales conversation transcripts, truncated to 2,000 tokens).
- **Labels:** binary y_i ∈ {0,1} (final order lock-in) + funnel-stage mapping Φ: X → F = {L_lock, L_drive, L_call, L_defeat}.
- **Split:** 7:3 train/test with strict temporal ordering (explicitly to prevent look-ahead bias).
- **Access:** proprietary — not public, not replicable. Code/scripts claimed in a repository (no URL in the extracted text beyond the reference).

## 3. Method / model
**asLLR architecture (discriminative LLM).** Qwen1.5-1.8B (Scenario 1) / Qwen2.5-1.5B (Scenario 2) backbone with LoRA adaptation; final hidden state h_text ∈ R^d feeds three heads:
1. Semantic head φ_gen (R^d → R^{|V|}): original vocab projection, next-token CE on QA-style targets ("Yes"/"No") — a representation regularizer against catastrophic forgetting.
2. Pointwise head φ_point (R^d → R): scalar s_point(x), BCE for calibrated conversion probability.
3. Pairwise head φ_pair (R^d → R): scalar s_pair(x), optimized by HPRO for relative ordering.

**HPRO (Hierarchical Preference Ranking Optimization).** Preference pairs (x_w, x_l) with Φ(x_w) ≻ Φ(x_l), in three tiers with margins:
- Global Dominance P_global (m_g = 1.0): Lock-in vs. Defeat (strongest signal).
- Key Action P_key (m_k = 0.5): Test Drive vs. No Drive (critical intermediate).
- Soft Signal P_soft (m_s = 0.1): Long Call vs. Short Call (dense but noisy).
Margin-aware BT: P(x_w ≻ x_l | m) = σ(s_pair(x_w) − s_pair(x_l) − m); L_HPRO = −E_{(x_w,x_l,m)∼D_pair}[log σ(s_pair(x_w) − s_pair(x_l) − m)]. Larger margins force wider separation in score space for strong signals; small margins allow fine discrimination on soft signals.

**Training:** L_total = α·L_BCE + λ_1·L_HPRO + λ_2·L_CE with α = 2.0, λ_1 = 1.0, λ_2 = 0.5. Differential learning rates: task heads at base 5×10⁻⁵, LoRA backbone at 20× lower. Observation: purely discriminative losses overfit; L_CE acts as the regularizer.

## 4. Equations & assumptions
- Margin-aware preference probability (Eq. 1): P(x_w ≻ x_l | m) = σ(s_pair(x_w) − s_pair(x_l) − m).
- HPRO loss (Eq. 2): L_HPRO = −E_{(x_w,x_l,m)∼D_pair}[log σ(s_pair(x_w) − s_pair(x_l) − m)].
- Margins used: m_g = 1.0, m_k = 0.5, m_s = 0.1.
- Total loss (Eq. 3): L_total = α·L_BCE + λ_1·L_HPRO + λ_2·L_CE.
- BCE (Eq. 4): L_BCE = −(1/N)Σ_i [y_i log σ(s_point(x_i)) + (1−y_i) log(1−σ(s_point(x_i)))].
- Semantic CE (Eq. 5): L_CE = −(1/N)Σ_i log P_{φ_gen}(v_target | x_i), v_target ∈ {"Yes","No"}.
- Learning rates: heads 5×10⁻⁵, LoRA backbone 20× lower. Weights: α=2.0, λ_1=1.0, λ_2=0.5.
- **Stated assumptions:** (1) funnel stages form a true engagement hierarchy usable as preference supervision (Lock ≻ Drive ≻ Call ≻ Defeat); (2) hand-set margins (1.0/0.5/0.1) encode correct relative preference strength — not learned or ablated in the reported results; (3) 132-day single-province A/B test generalizes (stratified by 4 sales-capability tiers and 7/14/30-day lock-in counts); (4) strict temporal 7:3 split suffices for no-leakage claims; (5) dialogue truncation at 2,000 tokens loses no decision-critical signal.

## 5. Features / target
- **Inputs:** tabular CRM features (demographics, behavioral statistics) + full sales dialogue transcripts (≤2,000 tokens), funnel-stage assignment.
- **Targets:** pointwise — binary terminal conversion; pairwise — tiered preference pairs across funnel stages with margins; semantic — QA-style Yes/No token.
- **Horizon:** static per-lead scoring.

## 6. Validation design
- **Scenario 1 (benchmark):** AUC vs six industrial CTR models (Wide&Deep, DeepFM, xDeepFM, DCN, DCN-M, AutoInt; all at batch 256, embedding dim 8); embedding-transfer test (inject h_text into CTR baselines); ablation of asLLR components (base → +L_CE → +HPRO).
- **Scenario 2 (industrial ranking):** P@0.1%, P@1.0%, R@5.0%, AUC vs industrial baselines: Funnel+Recency (rule heuristic), Funnel+CTR two-stage (group-by-stage then DeepFM within stage), Funnel+CTR direct (funnel stage as input feature).
- **Online:** 132-day province-wide A/B test, stratified sampling (4 capability tiers; 7/14/30-day lock-ins as primary balancing metric, follow-up volumes secondary); primary outcome lead conversion; two-sided t-test.
- Splits time-ordered; no cross-validation reported.

## 7. Numerical results / baselines
- **Table 1 (benchmark AUC):** W&D 0.7860, DeepFM 0.7917, xDeepFM 0.7808, DCN 0.7862, DCN-M 0.7900, AutoInt 0.7896. With injected asLLR text embedding h_text: W&D 0.7951 (+0.0091), DeepFM 0.7976 (+0.0059), xDeepFM 0.7895 (+0.0087), DCN 0.7911 (+0.0049) — average +0.007 lift, showing complementary signal.
- **asLLR ablations:** base 0.7921 (already beats strongest CTR baseline DeepFM 0.7917); +L_CE 0.8081; **full (+HPRO) 0.8161** — +3.0% over base, +2.3% over the best baseline per the abstract.
- **Table 2 (industrial ranking):** Funnel+Recency: AUC 0.6332, P@0.1% 3.28%, P@1.0% 1.50%, R@5.0% 9.23%. Funnel+CTR (two-stage): 0.6898 / 7.21% / 1.90% / 18.76%. Funnel+CTR (direct): 0.7382 / 14.41% / 10.14% / 21.85%. asLLR w/o HPRO: 0.7491 / 18.44% / 11.56% / 23.94%. **asLLR w/ HPRO: 0.7583 / 25.76% / 13.33% / 25.18%.** Relative lift vs no-HPRO: +1.2% AUC, **+39.7% P@0.1%**, +15.3% P@1.0%, +5.2% R@5.0%. Two-stage funnel grouping underperforms direct funnel-as-feature (0.6898 vs 0.7382 AUC) — "funnel stage should not be imposed as a hard ranking constraint"; HPRO uses it as *structured preference supervision* instead.
- **Online A/B:** **+9.5% relative uplift in lead conversion** over 132 days (two-sided t-test, p < 0.001), cumulative conversion gap stable over the test window (Fig. 2).

## 8. Code / data availability
Data: proprietary (not public, not replicable). Code/training scripts: claimed provided in a repository (no URL in extracted text).

## 9. Leakage & limitations
- **Proprietary data, no replication possible:** the 340k/6.14M NEV datasets are private; reported numbers cannot be verified or reproduced by anyone outside Li Auto. No public benchmark validation.
- **Margin values are hand-set and unablated:** m_g=1.0, m_k=0.5, m_s=0.1 are business priors with no sensitivity analysis — the +39.7% P@0.1% could be margin-luck; no grid or learned-margin comparison is reported.
- **A/B test is single-province** (anonymized) with stratification details given but no pre-registration, no reported power analysis, and no discussion of spillover between control/experimental sales specialists.
- **Baseline hyperparameters look thin:** all CTR baselines at batch 256 / embedding dim 8 — a fixed, possibly under-tuned config; asLLR's ablations are within-architecture only.
- **External validity to NFL:** lead-scoring is not a GSE task. But the *method* — converting a natural event hierarchy into tiered-margin BT pairs instead of binary labels — is domain-free and ports to any GSE ranking problem with a natural strength ordering of outcomes.

## 10. GSE overlap
Per the existing-research map: **Bradley–Terry** is inventoried (26-metric catalog; ledger 0004), and the just-read ledger 0542 covers covariate-adjusted BT — the *plain* BT pairwise objective is covered ground. **New:** (a) **tiered-margin BT** — margins as explicit probabilistic constraints encoding domain priors about preference strength (σ(Δs − m)); the corpus has no margin-aware pairwise formulation; (b) **constructing preference pairs from an event/funnel hierarchy** rather than from observed wins — GSE's labels are binary game outcomes or ATS covers, and the corpus has no method for turning *graded* outcome importance into ranking supervision; (c) the **triple-head** (calibration + ranking + auxiliary) training design — GSE's models are single-objective. Verdict: **extension** — a new objective formulation for GSE's existing ranking machinery, not a duplicate.

## 11. GSE implementation spec
1. **Game-importance-weighted team ratings via tiered-margin BT.** Port: define an NFL "funnel" hierarchy of game informativeness — e.g., Playoff games ≻ late-season games between contenders ≻ early-season games (mirroring P_global/P_key/P_soft with margins m=1.0/0.5/0.1 as starting values, then tune). For BT rating fits, weight pairwise comparisons with margin-aware targets P(i≻j | m) = σ(θ_i − θ_j − m) so that ratings separate more on high-information games — the same mechanism the paper uses to separate lock-in vs defeat leads. Data: nflverse 2015–2025 game results + playoff flags. Effort: ~2 days (win-matrix → margin-aware BT objective; compare to static BT on the §12 test).
2. **Dual-head margin model (calibration + ranking).** GSE's margin model currently optimizes a single objective; add a pairwise ranking head trained on margin-aware BT pairs across games (same architecture, second linear head, joint loss α·BCE + λ·L_HPRO-style) to improve top-of-slate pick ordering — directly mirroring the paper's pointwise+pairwise triple-head, which delivered the +39.7% P@0.1% top-of-list gain that matters for GSE's published edge sheet. Effort: ~1 week.

## 12. Reproducible test
- **Dataset:** nflverse 2018–2024 regular + postseason games; outcome = SU winner; tier assignment: playoff games (m=1.0 tier), weeks 12–17 non-playoff (m=0.5), weeks 1–11 (m=0.1).
- **Baseline:** static BT ratings (GSE's existing formulation).
- **Protocol:** rolling 4-season fit → predict next season SU winners; compare accuracy and log-loss on the test season; ablate margins {1.0/0.5/0.1} vs {0/0/0} (no-margin) vs {1/1/1} (uniform) to test whether the *tiering* (not just BT) drives gains.

## 13. Acceptance / rejection gate
- **Adopt** if the tiered-margin BT beats static BT on next-season SU log-loss by ≥ 0.005 per game (averaged over the 2022–2024 rolling test seasons) AND the margin ablation shows tiered ≻ uniform ≻ none (confirming the hierarchy, not the BT, is the gain source). **Reject otherwise.** Gate stated before running; margin values (1.0/0.5/0.1) are starting points, tuned on a 2021 validation season only.

## 14. Improvement experiment
Go beyond hand-set margins: **learn the tier margins end-to-end** by making m_g, m_k, m_s trainable parameters (constrained m_g ≥ m_k ≥ m_s ≥ 0 via softplus + cumulative sum), optimized on a validation-season log-loss. The paper never tests whether 1.0/0.5/0.1 are right; learned margins would reveal the data's own informativeness hierarchy (e.g., the model might discover that weeks 1–4 deserve *negative* margin — i.e., should be down-weighted below uniform — a finding with direct implications for how GSE weights early-season games in every rating it publishes).
