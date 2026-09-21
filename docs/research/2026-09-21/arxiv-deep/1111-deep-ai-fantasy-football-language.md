# [1111] Deep Artificial Intelligence for Fantasy Football Language Understanding (arXiv:2111.02874v1)

**Citation:** Aaron Baughman, Micah Forester, Jeff Powell, and Eduardo Morales (2021). *Deep Artificial Intelligence for Fantasy Football Language Understanding*. arXiv:2111.02874v1. URL: https://arxiv.org/abs/2111.02874v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the only published end-to-end production NLP pipeline for fantasy football (ingest → entity → doc2vec → boom/bust/injury classifiers → projections); a reference architecture for GSE's news-to-projection lane, read with heavy caveats about proprietary omissions.

## 1. Research question
Can a production language-understanding pipeline over 50,000 sources / 2.3M daily articles, videos, and podcasts power fantasy-football player insights (boom/bust/hidden-injury/meaningful-touches classification and projection adjustment) at ESPN scale?

## 2. Dataset / schema
Claimed ingestion: 50,000 sources, 2.3M articles/videos/podcasts daily. Training: 2015–2016 archive; 2017 test; deployed 2018. Over 100 GB ingested; doc2vec training text reported as 94 GB. Entity detector: 1,200 documents, 3 annotators, 13 entity types, 14% entity density, annotator agreement 70%. Evaluation: 2017 season outcomes vs projections.

## 3. Method / model
Pipeline: ingestion → NLP entity/relation extraction → doc2vec embeddings (94 GB) → deep classifiers (reported as 98 layers) for boom, bust, hidden injury, meaningful touches → projection adjustment: fit 24 PDFs per player, 1,000 Monte-Carlo draws, display 15th/85th percentiles. Label equations/extraction for boom/bust/injury are ambiguous in the paper (trade-secret omissions).

## 4. Equations & assumptions
"Not stated in paper" at re-implementable fidelity — the paper describes the pipeline qualitatively; label definitions, loss functions, and the 24-PDF fitting procedure are not given as equations. Assumptions: news text contains signal beyond projections; doc2vec analogies (player-team 100%, team-location 93.48%, player keyword 80%, team/location keyword 74%) indicate a usable embedding space.

## 5. Features / target
Inputs: news/social/video/podcast text. Targets: boom/bust/hidden-injury/meaningful-touches labels; adjusted fantasy point projections.

## 6. Validation design
2015–2016 training archive, 2017 season test, 2018 deployment. Baselines: ESPN projections vs Watson-adjusted vs combined. Metrics: classifier accuracy/PPV/NPV; projection RMSE. Time-ordered: yes (train past, test future season).

## 7. Numerical results / baselines
Entity detector: precision 79%, recall 73%, F1 76%. Classifiers: bust accuracy 55%; boom 67%; hidden injury 77% (PPV 68.1%); meaningful touches 91.4%; bust NPV 85.5% against a real-world bust base rate of 12%. Projection RMSE: ESPN 6.81, Watson-adjusted 6.92, combined 6.78. Other claims: 88.2% of projections within 10 points, 71% within 7; 90% boom-or-close when predicted boom, 78% bust-or-close when predicted bust. Doc2vec analogies: player-team 100%, team-location 93.48%, player keyword 80%, team/location keyword 74%.

## 8. Code / data availability
None stated — proprietary ESPN pipeline; no code or data released.

## 9. Leakage & limitations
Major caveats: proprietary pipeline with trade-secret omissions — ambiguous label equations and feature extraction, limited independent reproducibility. Note the red flag: the Watson-*adjusted* RMSE (6.92) is *worse* than ESPN's own (6.81); only the *combined* (6.78) wins — the pipeline's standalone value is unproven. Bust accuracy 55% is barely above the 12%-base-rate trivial regime (NPV 85.5% is mostly base rate). 98-layer depth claim is implausible as stated for this task. Deployment claims (2018) unverifiable.

## 10. GSE overlap
Extension: GSE has X/news monitoring but no published news-to-projection pipeline design. Cite `~/workspace/arxiv-sweep/existing-research-map.md` (text-as-features GAP 12; fantasy/DFS lanes). Not duplicative.

## 11. GSE implementation spec
(a) Ingest: beat-writer RSS + X lists + podcasts transcripts (Whisper) — start with ~500 sources, not 50k; (b) NER for players/teams/injuries with a fine-tuned transformer (the paper's 79/73/76 is the bar); (c) player-news embeddings + classifier heads for the four labels with *published* label definitions; (d) blend classifier outputs into GSE projections as a shrinkage prior; (e) evaluate RMSE delta vs GSE baseline on 2025. Effort: ~3-4 engineer-weeks for the pilot.

## 12. Reproducible test
Dataset: 2024 NFL season news (open sources) + GSE projections. Metric: RMSE on fantasy points, and boom/bust precision/recall with fixed label definitions. Baseline to beat: GSE's current projections — the combined model must beat them by ≥0.1 RMSE (the paper's own margin: 6.81→6.78) before any deployment claim.

## 13. Acceptance / rejection gate
ADOPT the pipeline into production if the combined projections beat GSE's baseline RMSE on a full 2025-season backtest with p<0.05 (paired Diebold-Mariano); REJECT if the NLP adjustment is directionally inconsistent (worse RMSE like the paper's 6.92) or if label precision doesn't exceed base rates.

## 14. Improvement experiment
Replace the opaque classifier labels with *calibrated* outputs: train the four heads with proper scoring rules and isotonic recalibration, then feed the calibrated probabilities (not hard labels) into the projection blend — the paper's hard boom/bust labels discard uncertainty that a calibration-first company should keep.
