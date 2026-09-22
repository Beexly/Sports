# [1853] A Report on Semantic-Guided RL for Interpretable Feature Engineering (SMART) (arXiv:2410.02519)

**Citation:** Mohamed Bouadi, Arta Alavi, Salima Benbernou, Mourad Ouziri (2024). *A Report on Semantic-Guided RL for Interpretable Feature Engineering*. arXiv:2410.02519v1. URL: https://arxiv.org/abs/2410.02519
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, lines 0–1447; main body through conclusion at line 1193; lines 1254–1447 verified as references only, no appendices).
**Verdict:** ADAPT

Rationale: the bi-objective accuracy/interpretability formulation and the semantic-validity guardrails are uniquely valuable for GSE's show-your-work mandate, but the paper is tabular-only with no temporal discipline and requires building a sports ontology from scratch — real adaptation work, not a drop-in.

## 1. Research question
Can feature engineering be formalized as a bi-objective optimization — maximizing model performance and feature interpretability jointly — and solved with a hybrid of Knowledge-Graph semantic reasoning (exploitation) and reinforcement learning (exploration), beating pure-RL feature-engineering systems while producing features a domain expert can actually explain?

## 2. Dataset / schema
14 public tabular datasets spanning healthcare, banking, retail, e-commerce, physics, transport (10 tabulated in Table II): Wine Quality, Bikeshare DC, Home Credit, Amazon Employee, Higgs Boson, Brazilian E-Commerce, Medical Appointment, Fraud Detection, Retail Spending, NYC Taxi, OpenML-618, Diabetes, German Credit, +2 more. Five downstream models: RF, DT, LR, SVM, XGB. Metrics: 1−rae (regression), F1 (classification). Evaluation: 80/20-style with k-fold CV inside the reward loop. All datasets public.

## 3. Method / model
Step 1 (Exploitation): Description-Logics reasoning (HermiT) over a Knowledge Graph — domain-agnostic knowledge (SI units, arithmetic/aggregation semantics) plus domain-specific ontologies — infers new domain features (Date → Day/Month/Year; Mass + Velocity → Energy) and SWRL rules veto nonsensical combinations (adding features with different units, or summing stock variables, yields nonInterpretable). KG built with a TBox of DL axioms (Function ⊑ ≥1 hasInput; Arithmetic ⊑ Function ⊓ ≤2 hasInput ⊓ ≤1 hasOutput; Date ⊑ ∃hasDay.Day ⊓ ∃hasMonth.Month ⊓ ∃hasYear.Year; domain concepts like Energy ⊑ ∃hasMass.Mass ⊓ ∃hasVelocity.Velocity). Step 2 (Exploration): a DQN over the transformation space where the state is a semantic vectorization of the dataset (each feature mapped to KG concepts, state = summed semantic feature vectors Φ(X)), actions are transformations (unary, binary, aggregations, date operators), and the reward is ΔP (k-fold CV performance gain vs. previous step) + interpretability score. DQN with decaying ε-greedy, experience replay, and a target network. Key differentiator vs. pure RL FE (Khurana 2018, mCAFE, NFS): the KG supplies transferable prior knowledge — the semantic vectorization lets the agent reuse learned policy structure across datasets instead of re-exploring from scratch.

## 4. Equations & assumptions
- Objective: T* = argmax_T (λ·P(L(X̂_T, Y)) + (1−λ)·I_KG(X̂_T)); I_KG(X̂_T) = Σ_{x̂∈X̂_T} I_KG(x̂), with λ ∈ [0,1] user-set trading accuracy against interpretability.
- Interpretability of one feature: I_KG(x̃) = max_{paths pk} I^{pk}_KG(x̃), with I^{pk}_KG(x̃) = Π_j Inter(t_j) × min_i I_KG(x_i) — the product of per-transformation interpretability scores times the least interpretable feature on the decomposition path.
- Definition 2.2: feature interpretability = the intellectual effort a domain expert exerts to map a feature to domain concepts — operationalized via KG distance rather than asserted.
- DQN loss: L_i(θ_i) = E_{(s,a,r,s')∼U(D)} [(r + γ·max_{a'} Q̂(s',a';θ̂_i) − Q(s,a;θ_i))²], standard two-network setup.
- SWRL examples: Feature(?x) ∧ hasUnit(?x,?u) ∧ Feature(?y) ∧ hasUnit(?y,?v) ∧ Different(?u,?v) ∧ Addition(?f) ∧ hasInput(?f,?x) ∧ hasInput(?f,?y) → nonInterpretable(?z); aggregationSum over a Stock feature → nonInterpretable (periodic inventory totals are not summable).
- Stated assumptions: interpretability is well-approximated by KG decomposition distance; SWRL rule coverage is adequate; λ is user-set with no guidance.

## 5. Features / target
Input: raw tabular columns per dataset. Targets per dataset (regression: 1−rae; classification: F1). SMART-generated example features (human-readable by construction): Haversine pickup–dropoff distance (NYC Taxi), appointment booking lead time (Medical Appointment — longer lead time → higher no-show probability, a mechanism a domain expert can act on).

## 6. Validation design
Reward-loop k-fold CV per step; 80/20-style outer evaluation; baselines: Base (raw), Random, DFS, AutoFeat, DIFER, NFS, mCAFE. SHAP feature-importance analysis on raw+SMART datasets (top-10 comparison vs. mCAFE on interpretability). Splits are cross-sectional, not time-ordered — the DQN has no notion of time ordering.

## 7. Numerical results / baselines
- SMART vs. raw data: +20.94% average improvement across datasets and models.
- SMART vs. strongest baselines: +11.55% over DIFER, +4.86% over NFS, +7.24% over mCAFE (averages); beats Base, Random, DFS, AutoFeat baselines in nearly all cells.
- Example cells (RF): Diabetes 0.740 → 0.853; Medical Appointment 0.491 → 0.893; OpenML-618 White 0.689 → 0.722; Bikeshare DC 0.393 → 0.988; Amazon Employee 0.712 → 0.912; NYC Taxi 0.425 → 0.610; Higgs 0.718 → 0.743.
- Interpretability validation: SHAP feature-importance on raw+SMART datasets shows SMART features (blue) outrank raw features (orange) on all four plotted datasets; top-10 comparison vs. mCAFE shows SMART's features are human-readable (Haversine distance, booking lead time) while mCAFE's are opaque composites.

## 8. Code / data availability
Not stated in paper. The domain-specific TBox fragments are privacy-limited in the paper, so reproducibility of the exact KG is limited. All 14 datasets are public.

## 9. Leakage & limitations
- Tabular only: no temporal dimension, no leakage/lookahead discipline — the DQN can compose transformations with no notion of time ordering. GSE adaptation must add the causal-past-only constraint (cf. ELATE's prompt rules).
- The KG must be built per domain: the paper hand-curates domain-specific TBox fragments; a sports ontology is real construction work.
- SWRL rules are hand-written; coverage is only as good as the rule author. Novel sports concepts outside the KG get low interpretability scores by construction — the metric penalizes genuine novelty.
- 14 datasets tested but only 10 tabulated ("due to lack of space"); reward-loop k-fold CV per step is expensive (no runtime table given — a gap vs. ELATE's cost accounting).
- λ is user-set with no guidance on choosing the accuracy/interpretability tradeoff.
- The transferability claim (semantic state lets the agent reuse policy across datasets) is asserted as the key differentiator but never empirically tested.

## 10. GSE overlap
Garrett's brand rule is "analysts who show their work" — features must be explainable on air. SMART is the only wave-5a paper that *optimizes* for human-readability as a first-class objective with a quantitative metric, rather than treating it as a side effect. The unit-typed SWRL idea is directly portable as a guardrail on GSE's LLM feature generation: adding points to temperatures, or summing stock variables (e.g., summing a team's season-long rating across weeks), should be vetoed automatically — a semantic type-checker for the feature pipelines in ledgers 1847/1850. The semantic vectorization state representation offers a path to *transferable* FE policy across sports: train the DQN on NFL, reuse the KG-grounded state encoding for NCAA/CFB without re-exploring from scratch. This is a new capability (semantic-validity guardrails + interpretable-by-construction features), not a duplicate of existing GSE work.

## 11. GSE implementation spec
Sports bridge: build a sports TBox — concepts (Team, Player, Game, WeatherCondition, MarketLine) with units (points, yards, dollars, days); axioms like RestDifferential ⊑ ∃hasDays.Days; SWRL rules such as "points + temperature → nonInterpretable," "summing a rate stat over games without weighting → nonInterpretable." Exploitation: reason over the sports KG to infer domain features (kickoff datetime → rest days, divisional flag, primetime flag; wind + temperature → kicking-difficulty index). Exploration: DQN over sports transformations with reward = validation log-loss gain + I_KG; generated features must read as broadcast-explainable concepts.

Concrete build plan:
1. Encode a sports ontology (OWL/Turtle): SI-style unit hierarchy extended with sports units; DL axioms for composite concepts; SWRL rules for semantic validity (unit mismatch, stock-vs-flow aggregation errors).
2. Semantic vectorization: map each dataset column to KG concepts; state = summed concept vectors.
3. DQN (or reuse the Khurana-style RL agent from ledger 1848) with action space = {unary, binary, groupby-aggregations, date/rest operators}; reward = Δ(validation log-loss) + (1−λ)·I_KG, λ=0.7 default.
4. Decomposition graph: log every generated feature's derivation path; compute I_KG per feature; filter features below an interpretability threshold before the model-selection stage.
5. Causal guard: extend the SWRL rule set with temporal rules (no negative shifts, past-rows-only aggregations) — the paper lacks these; GSE requires them.

## 12. Reproducible test
Task: NFL game prediction on walk-forward splits (train 2019–2023, validate 2024, test 2025) with the sports KG; baselines: raw features, Random, DFS, and the DQN without the interpretability term (λ=1) to isolate the semantic contribution. Human evaluation: 3 raters score top-20 features per method on "could you explain this on a broadcast" (1–5); SMART must win on interpretability while matching or beating on log-loss.

## 13. Acceptance / rejection gate
ADAPT if: ≥0.003 held-out NFL log-loss improvement on 2025 games versus the raw-features baseline, zero semantically invalid features in the final set (SWRL veto pass), no post-kickoff leakage (temporal rules enforced), and mean human interpretability rating ≥4.0/5.0 on the top-20 features. REJECT (do not deploy) if any of: no gate improvement vs. raw baseline, SWRL veto failures, leakage scan fails, or the λ=1 DQN matches performance (semantic term adds nothing).

## 14. Improvement experiment
Test the paper's untested transferability claim — the actual differentiator. Train the semantic DQN on the NFL panel, then freeze the KG-grounded state encoder and transfer the policy to an NCAA/CFB panel (shared sports TBox, new columns) with (a) zero re-exploration vs. (b) from-scratch re-exploration. Compare validation log-loss after equal compute budgets. If the transferred policy reaches target performance with substantially fewer explored transformations, the semantic vectorization is doing real work and GSE gets a multi-sport FE policy for the price of one sport's exploration budget. If not, the KG is functioning as an expensive type-checker only — still worth keeping as a guardrail on the 1847/1850 LLM pipelines, but the DQN transfer story dies.
