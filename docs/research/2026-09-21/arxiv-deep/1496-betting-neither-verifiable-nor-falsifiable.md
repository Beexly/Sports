# [1496] Betting on what is neither verifiable nor falsifiable (arXiv:2402.14021v1)

**Citation:** Abhimanyu Pallavi Sudhir, Long Tran-Thanh (University of Warwick, 2024). *Betting on what is neither verifiable nor falsifiable*. arXiv:2402.14021v1. URL: https://arxiv.org/abs/2402.14021
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro 1.1–1.3, framework section 2, results section 3, discussion, references).
**Verdict:** REJECT
philosophy-of-mathematics paper on prediction markets for first-order-logic sentences with no resolution criterion; contains no sports content, no data, no empirical mechanism, and no transferable component for GSE's sports prediction, market, or calibration work.

## 1. Research question
How can prediction markets be designed for sentences that are neither verifiable nor falsifiable (e.g. higher levels of the arithmetical hierarchy: "there is an immortal man", "P halts"), where standard markets reduce to betting on provability rather than truth?

## 2. Dataset / schema
None. Pure theory — no data, no experiments, no simulations.

## 3. Method / model
Hintikka verification-falsification (VF) game semantics adapted to markets: an asset for ∃x.P(x) is an option to exchange it for a finite conjunction ∧_{x∈S}P(x); for ∀x.P(x) an obligation against the opponent's finite choice. A "program market" of polynomial-time agents (trader + player + labeler + inventory), with an equilibrium price setter ̟ defined as the zero of aggregate excess demand; ̟'s player counters the aggregate agent's players on P vs ¬P so it wins exactly as many games as it loses.

## 4. Equations & assumptions
Key results: Lemma 1.2 (no computable asset/scoring-rule mechanism exists for Σ₄/Π₄+ sentences — Tarski's theorem); Lemma 3.1 (inexploitability of ̟); Theorem 3.2 (equilibrium prices converge for every sentence); Theorem 3.4/ Corollary 3.5 (market learns "constructive truth": if P is computably-verifiable-true then ̟^∞(P)=1). Assumptions: polynomial-time agent class; finite endowments/birthdays; equilibrium computed exactly.

## 5. Features / target
Features: none. Target: theoretical properties of limiting market prices on FOL sentences.

## 6. Validation design
None — proofs only.

## 7. Numerical results / baselines
None. No numbers in the paper.

## 8. Code / data availability
None.

## 9. Leakage & limitations
Stated by authors: the framework is "very theoretical, intended to prove that certain optimality results hold at least in principle"; says nothing about sentences neither constructively true nor false; practical implementation faces asymmetric computational costs for opposing players. Added: zero empirical content; the motivating examples are mathematical/logical sentences, not events.

## 10. GSE overlap
None. GSE's markets-lane interests (closing-line value, market microstructure, prediction-market calibration for sports) concern verifiable, fixed-resolution events — exactly the class this paper sets aside ("prediction markets are useful for estimating probabilities of claims whose truth will be revealed at some fixed time"). Nothing in the corpus duplicates or is duplicated by this work.

## 11. GSE implementation spec
Not applicable — REJECT. The paper's machinery (VF games over FOL sentences, constructive truth, polynomial-time agent markets) has no mapping onto sports outcomes, which are Δ₀-verifiable events with fixed resolution times. No component transfers.

## 12. Reproducible test
Not applicable — REJECT.

## 13. Acceptance / rejection gate
REJECT: fails Garrett's "active and valuable to GSE" standard — a logic/philosophy paper with no data, no sports content, and no implementable mechanism. (Replacement read in the same lane under ledger 1511.)

## 14. Improvement experiment
Not applicable — REJECT. (Replacement read in the same lane under ledger 1511.)
