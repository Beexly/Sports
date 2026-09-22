# [2153] Minimax Decision Rules for Planning Under Uncertainty (arXiv:2203.01420)

**Citation:** Edward Anderson, Stan Zachary (2022). *Minimax Decision Rules for Planning Under Uncertainty*. arXiv:2203.01420. URL: https://arxiv.org/abs/2203.01420
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* the lane's *governance* paper: a rigorous critique of minimax-regret rules (scenario-choice sensitivity, IIA failure, gaming via decoy alternatives) with a constructive fix (minimax *median* regret). GSE is adopting minimax regret (2151) and weighted regret (2152); this paper dictates *how to use them safely*: fixed auditable scenario-generation protocols, median instead of max, and explicit acknowledgment of the IIA tradeoff (Lemma 2). A decision rule Garrett publishes picks under must be game-proof.

## 1. Research question
Minimax rules (esp. minimax regret) are popular for planning under deep uncertainty because they avoid assigning probabilities to scenarios. But: how sensitive are they to *which* scenarios are chosen? And what breaks when regret-based rules violate independence of irrelevant alternatives (IIA) — can the process be gamed by introducing decoy alternatives?

## 2. Dataset / schema
No data — analytic paper with constructed counterexamples (infrastructure-investment framing: energy planning, hydrogen vs electrification). Decision variables over convex sets in R^n and finite decision sets.

## 3. Method / model
- **Scenario-sensitivity analysis:** with a finite scenario set, minimax "replaces the arbitrary choice of probabilities with the similarly arbitrary choice of a very small number of specific scenarios" — the max-regret decision is typically determined by 1–2 binding scenarios; adding/removing one scenario can flip the decision.
- **Lemma 1 (gaming):** a decoy decision z with an artificially extreme cost M in all-but-one scenario can force the minimax-regret choice to flip from x to y — i.e., introducing an irrelevant alternative changes the decision. Proof via regret arithmetic (R_i(z) = M − min_x C_i(x) > M−L).
- **Lemma 2 (IIA characterization):** any decision rule minimizing a continuous non-decreasing function of the regret vector that *also* satisfies IIA is equivalent to minimizing expected cost under some probability distribution over scenarios. Punchline: you cannot have both regret-based robustness and IIA — pick one knowingly.
- **Minimax median regret:** proposed alternative — replace max over scenarios with median; Lemma 1's decoy construction fails against the median, reducing gaming surface.
- **Generalized minimax regret:** regret defined relative to functions of the outcome set (finite-decision case).
- **Axiomatic context:** Stoye's 8 axioms imply minimax regret; Hayashi/Diecidue-Somasundaram regret-only axiom sets; Savage-style results showing "reasonable axioms ⇒ expected utility."

## 4. Equations & assumptions
- Regret R_i(x) = C_i(x) − min_x C_i(x); minimax regret: min_x max_i R_i(x); minimax median regret: min_x median_i R_i(x).
- Lemma 1: decoy construction with extreme cost M; Lemma 2: IIA + continuity + monotonicity in regret vector ⇒ expected-cost minimization for some p_i.
- Assumptions: finite scenario set; continuous or finite decision space; costs bounded; at least 3 decision points (Lemma 2).

## 5. Features / target
Abstract scenarios/decisions/costs. Target: decision rule properties (sensitivity, IIA, gameability).

## 6. Validation design
Proofs + constructed counterexamples. No experiments, no data.

## 7. Numerical results / baselines
No numerical results. Key qualitative results: (a) minimax-regret decisions are typically determined by a tiny subset of scenarios; (b) decoy alternatives can flip decisions (Lemma 1); (c) median regret resists the decoy construction; (d) IIA-respecting regret rules collapse to expected utility (Lemma 2).

## 8. Code / data availability
None.

## 9. Leakage & limitations
- Pure theory; the gaming examples are stylized — no evidence of how often real scenario sets exhibit the pathology.
- Median regret loses the worst-case guarantee that motivates minimax in the first place — the paper doesn't quantify what protection is sacrificed.
- No guidance on *how* to choose the scenario set well, only on the dangers of choosing it badly.
- Infrastructure-planning framing; the mapping to weekly betting decisions is ours, not the authors'.
- Lemma 2's IIA definition is specific (changes to a third decision's costs); other IIA formulations exist.

## 10. GSE overlap
Existing-research map: this is the only *critical* paper in the lane — every other ledger proposes a rule; this one stress-tests the rules. It directly governs three adopted methods: 2151's minimax-regret policy (scenario = sampled worlds — Lemma 1 says a single weird world can dictate the policy), 2152's MWER (same sensitivity via the sup), and 2150's DRO (ambiguity-set choice is the continuous analog of scenario choice). GSE-specific stakes: picks are *published*, so the decision rule is visible — a rule that flips when an irrelevant alternative appears is both internally fragile and externally gameable (e.g., narrative pressure to include/exclude certain games). The paper's prescription — fixed scenario-generation protocol + median aggregation — becomes GSE's audit standard for all robust rules.

## 11. GSE implementation spec
- **Scenario protocol (anti-gaming):** worlds for 2151/2152 generated by a *fixed, versioned* bootstrap protocol (seeded RNG, documented in repo); no hand-added or hand-removed worlds without a protocol amendment logged in the research repo. This answers the paper's core warning directly.
- **Median aggregation:** replace max-world regret with median-world regret (with a 75th-percentile variant as a compromise) in the 2151 policy computation; report both.
- **Sensitivity audit:** monthly, recompute the policy with each world dropped one at a time (leave-one-world-out); if dropping any single world flips >20% of the policy table, flag the policy as scenario-fragile and fall back to the 2149 mean-CVaR policy.
- **IIA disclosure:** document the explicit tradeoff (Lemma 2) in the engine's decision-logic notes: GSE keeps regret-based robustness and accepts IIA failure, mitigated by the fixed protocol.
- **Effort:** ~3–5 days (protocol doc + median variant + leave-one-world-out audit job).

## 12. Reproducible test
Dataset: engine 2022–2025. (a) Demonstrate the pathology: hand-inject one extreme bootstrap world into the 2151 world set and measure the policy-table flip rate (expect large — confirming Lemma 1's relevance). (b) Show the fix: median-regret policy's flip rate under the same injection (expect small). (c) Backtest both policies 2024–2025: metrics = worst-world regret, mean profit, max drawdown. The test passes if median-regret matches max-regret on worst-world regret within 10% while cutting the injection flip rate by ≥50%.

## 13. Acceptance / rejection gate
**ACCEPT if:** the injection experiment confirms scenario sensitivity is real for GSE's world set (flip rate >20% under max) AND median-regret cuts it by ≥50% AND backtested worst-world regret is within 10% of max-regret's. **REJECT if** the pathology doesn't reproduce on GSE's actual world sets (then the governance overhead isn't justified) or median-regret sacrifices >15% of worst-world protection.

## 14. Improvement experiment
Beyond the paper: *trimmed-mean* regret (drop top-k worst worlds, average the rest) as a parametric bridge between max and median — sweep k and trace the robustness-vs-gaming-resistance frontier on the injection experiment, picking the k at the knee. Second axis: *adversarial* world generation — instead of fixed bootstrap, actively search for the world that maximally flips the policy (red-team the scenario set), then harden the policy against it; measure whether red-teamed median-regret beats plain median-regret on held-out extreme weeks.

