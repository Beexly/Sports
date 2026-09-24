# [1103] Probabilistic Neuro-Symbolic Reasoning for Sparse Historical Data (arXiv:2512.01723v1)

**Citation:** Saba Kublashvili (2025). *Probabilistic Neuro-Symbolic Reasoning for Sparse Historical Data: A Framework Integrating...*. arXiv:2512.01723v1. URL: https://arxiv.org/abs/2512.01723v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — tiny hand-built case studies with no genuine validation; not worth GSE adaptation. Replaced by ledger 1306 (arXiv:2602.09982v1).

## 1. Research question
Claims a "HistoricalML" framework integrating ML, probabilistic reasoning, and causal DAGs to analyze sparse historical data (WWI naval arms race / colonial tensions; Punic Wars).

## 2. Dataset / schema
Colonial case N=7; Punic case N=2. Tiny, hand-authored score/prior/DAG structures.

## 3. Method / model
Hand-authored features, priors, and causal DAGs; reported numbers include Germany projected 18.1% vs historical 8.7% (discrepancy +107.9%), tension factor 36.43, naval-arms correlation 0.79; Cannae 57.3%, Zama 57.8%; 1,000 simulations; an implausible "100.0% [100.0%, 100.0%]" interval.

## 4. Rejection grounds
(1) N=7 and N=2 samples — no statistical content can be extracted. (2) Features, scores, priors, and DAGs are hand-authored by the paper's author, so calibration is circular: the model "confirms" structures it was fed. (3) Ground truth is arbitrary (what is the "correct" historical probability of Cannae?). (4) No genuine held-out validation — the 1,000 simulations resample the author's own hand-built structure. (5) The degenerate 100.0% [100.0%,100.0%] claim signals broken or overconfident machinery. Nothing here transfers to GSE's prediction/calibration mission.

## 5. Replacement
Replaced by full ledger 1306: arXiv:2602.09982v1 — "Kelly Betting as Bayesian Model Evaluation" (sizing + Bayesian model-evaluation lane), a substantive probabilistic-reasoning read.
