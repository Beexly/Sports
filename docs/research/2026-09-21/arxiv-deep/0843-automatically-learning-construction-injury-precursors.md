# 0843 Automatically Learning Construction Injury Precursors from Text (arXiv:1907.11769v4)

**Citation:** Henrietta Baker, Matthew R. Hallowell, Antoine J.-P. Tixier (2019). *Automatically Learning Construction Injury Precursors from Text*. arXiv:1907.11769v4. Published in *Automation in Construction*. URL: https://arxiv.org/abs/1907.11769v4
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — three post-training precursor-extraction methods (CNN receptive-field norms, gradient saliency, HAN attention) that surface the text fragments most predictive of safety outcomes from 90,000+ incident reports; the direct GSE analogue is mining NFL injury-report / practice-report text for predictive phrases, with the paper's leakage warning (narratives often contain the outcome) as required reading.

## 1. Research question

Can injury precursors — environmental/behavioral conditions observable *before* an incident — be learned automatically from raw construction accident reports as a by-product of training classifiers to predict safety outcomes (severity, injury type, body part, incident type)? The paper compares CNN, HAN, and TF-IDF+SVM both as classifiers and as precursor miners.

## 2. Dataset / schema

- **Reports:** 90,000+ incident reports from a global oil-and-gas industrial partner, five continents, early 2000s–2018; ~75% originally English, rest machine-translated; hundreds of authors, heterogeneous style.
- **Text fields:** title, description, details (physical environment), root_cause.
- **Outcomes:** severity (1st aid 16,510 / med.-restr. 2,875), injury_type (contusion 4,048 / cut-puncture 3,737 / FOB 2,073 / pain 1,587), bodypart (finger 4,421 / hand 3,161 / eye 2,392 / lower extr. 2,321 / head 2,184 / upper extr. 1,757), incident_type (eq./tools 29,033 / slips-trips-falls 20,474 / rules 14,296 / access 10,368 / PPE 8,998 / dropped 8,469).
- **Preprocessing:** sentence/word tokenization, lowercasing, non-ASCII/HTML removal, word-segmentation repair.
- **Access:** proprietary (industrial partner); not replicable.

## 3. Method / model

- **CNN:** document matrix A ∈ ℝ^{s×d}, s=200 words; 3 branches with filter sizes {2,3,4}, 100 filters/branch (300 for incident_type); ReLU; global 1-max pooling; softmax.
- **HAN:** word-level and sentence-level bidirectional GRU encoders with self-attention at both levels; softmax.
- **TF-IDF+SVM:** established baseline pipeline.
- **Precursor extraction (the transferable part):**
  1. *Predictive regions (CNN):* inspect receptive-field embeddings just before pooling; select regions with highest-norm embeddings per report; aggregate over the training set → top n-grams per outcome level (e.g., "trip hazard" 78,240 mentions for access; "not wearing" 36,603 for rules).
  2. *Word saliency (CNN):* saliency(a) = |∂CNN/∂a| at a| — one backward pass on the prediction (not the loss); ranks words by how little they'd need to change to flip the class score.
  3. *Attention weights (HAN):* word- and sentence-level attention directly highlight predictive fragments.

## 4. Equations & assumptions

- Saliency (quoted): saliency(a) = |∂(CNN)/∂a|ₐ|.
- Predictive-region selection: argmax over receptive-field embedding norms (described procedurally, not as a numbered equation).
- Assumptions: 1-max pooling's position-invariance ("congested workspace" matters wherever it appears); attention weights are faithful explanations; the training distribution's predictive fragments generalize as *precursors* (causal) rather than mere correlates.

## 5. Features / target

- **Inputs:** raw report text (title + description + details + root_cause), embedded (CNN/HAN) or TF-IDF.
- **Targets:** four safety outcomes (severity, injury_type, bodypart, incident_type), each multi-class.

## 6. Validation design

- Train/test split (exact proportions not extracted; best epochs reported: HAN/CNN 35/60 for incident_type).
- Baselines: the three models against each other + a random classifier.
- Metrics: per-class precision/recall/F1; mean F1 per outcome.
- Precursor validity: manual inspection — valid precursors bolded in Table 14 (e.g., "trip hazard", "blocked by", "speeding in car park", "not wearing").

## 7. Numerical results / baselines

- incident_type mean F1: HAN 68.98, CNN 63.33, TF-IDF+SVM 71.55, random 15.74.
- injury_type FOB class: CNN 95.49 F1; bodypart eye class: HAN 97.04 F1.
- Hard categories: rules (incident_type) best 61.75 F1, pain (injury_type) best 66.17 — both by TF-IDF+SVM.
- HAN beats CNN almost everywhere (attention + longer context) but trains ~3× slower (216.99 vs 71.47 s/epoch on incident_type); HAN has slightly fewer params (1.63M vs 1.71M).
- TF-IDF+SVM beats deep learning except on bodypart — the authors attribute this to dataset size (deep learning needs more data) and keyword-sufficiency of the task.

## 8. Code / data availability

None stated (dataset proprietary).

## 9. Leakage & limitations

- **Outcome leakage in narratives:** report authors often wrote the outcome into the text ("his eye", "access"), so top predictive regions include label mentions — the model partially "cheats." The paper discusses mitigation strategies (§7.1) but the headline F1s are inflated by this.
- ~25% of reports machine-translated; heterogeneous authorship over 15+ years.
- Precursor validity judged by author inspection, not by prospective validation (do the mined precursors actually predict *future* incidents?).
- Class imbalance severe (e.g., severity 16,510 vs 2,875).

## 10. GSE overlap

Per the existing-research map: injuries/causal is a named lane (FineCausal 2503.23911 read; Grok daily briefs carry news/injury signals as engine *inputs*), but NLP mining of injury-report *text* is not covered. This paper is the first text→injury-precursor ledger and the direct methodological ancestor of an NFL injury-text parser. Complements 0841/0842 (social sentiment) with official-report text.

## 11. GSE implementation spec

- Build an NFL injury-report NLP pipeline: ingest official practice/injury reports + beat-writer text; train classifiers for (will-play / limited / out) and for performance-impact; extract predictive phrases via the paper's three methods (attention, saliency, receptive-field norms).
- Map mined phrases to a structured injury-feature vocabulary for the engine (body part, severity language, practice participation).
- Effort: 1–2 weeks (data licensing/collection dominates).

## 12. Reproducible test

Dataset: 2022–2024 NFL official injury reports with Wednesday–Friday designations and Sunday inactive status as labels. Metric: F1 on inactive prediction; baseline = designation-only rules (Q→ out-rate). Pass if text features beat the designation-only baseline by ≥3pp F1 — and separately verify mined phrases aren't just restating the designation (the paper's leakage lesson).

## 13. Acceptance / rejection gate

ADOPT the phrase-mining pipeline if text-augmented inactive prediction beats designation-only F1 by ≥0.03 on a 2024 holdout *after* masking explicit designation tokens; REJECT if all signal comes from the designations themselves (then it's a parser, not a predictor — still useful, but not this paper's claim).

## 14. Improvement experiment

Prospective precursor validation: take phrases mined from 2022–2023 reports and test whether their appearance in *Wednesday* reports predicts *Sunday* inactives/re-injury in 2024 — the true precursor test the paper never ran. Hypothesis: practice-participation language ("DNP", "limited", "veteran rest") prospectively predicts inactives, while body-part mentions do not (they're the leakage).
