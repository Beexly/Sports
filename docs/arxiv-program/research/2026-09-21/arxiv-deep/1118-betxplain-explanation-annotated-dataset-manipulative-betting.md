# [1118] BetXplain: An Explanation-Annotated Dataset for Detecting Manipulative Betting Advertisements on Social Media (arXiv:2606.27274v2)

**Citation:** MSVPJ Sathvik, Parmitha Vangapandu, Nishit Rane, Sathwik Narkedimilli, Mark Lee, Akrati Saxena (2026). *BetXplain: An Explanation-Annotated Dataset for Detecting Manipulative Betting Advertisements on Social Media*. arXiv:2606.27274v2. URL: https://arxiv.org/abs/2606.27274
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; dataset/annotation, experimental setup, exact results, explanation metrics, discussion, applications, limitations, ethics read).
**Verdict:** ADAPT — the manipulative-vs-deceptive-vs-responsible ad classifier (ELECTRA macro-F1 0.6946) is a working content-integrity primitive GSE can adapt for affiliate/promo compliance; the explanation-generation results are too weak to use.

## 1. Research question
Can ML detect *manipulative* and *deceptive* gambling advertisements on social media — and explain its verdicts — to support responsible-gambling oversight? The paper releases BetXplain, an explanation-annotated 3-class dataset.

## 2. Dataset / schema
- **BetXplain**: 4,000 ads collected, 216 duplicates removed → final **3,779**.
- Classes: manipulative **1,507 (39.9%)**; deceptive **396 (10.5%)**; responsible **1,876 (49.6%)**.
- Split: **70%/10%/20% = 2,645 / 378 / 756**, stratified.
- Source: Meta Ads Library, described as primarily Instagram. (The paper's narrative also claims Instagram and Reddit coverage — this conflicts with the methods' emphasis on Meta Ads Library/primarily Instagram; see §9.)
- Each ad has a label plus a human-written explanation of the verdict.

## 3. Method / model
- Fine-tuning: **5 epochs**, **AdamW**, weight decay **0.01**, **10% warmup**, learning rate **2×10⁻⁵**, max length **256**, batch **16**, **inverse-frequency weighted cross-entropy**.
- Models: ELECTRA, Longformer, others (encoder fine-tunes); GPT-4o few-shot and chain-of-thought prompting for classification + explanation generation.
- Explanation evaluation: ROUGE-1/L, BLEU-1, cosine similarity of embeddings.

## 4. Equations & assumptions
- No novel equations stated; standard inverse-frequency weighted cross-entropy. Assumptions: (a) two annotators' (the coauthors') labels are ground truth; (b) the 3-class taxonomy (manipulative/deceptive/responsible) is exhaustive and separable; (c) explanations can be evaluated with n-gram overlap metrics.

## 5. Features / target
- Features: ad text (title/body/creative text). Targets: (a) 3-class label; (b) free-text explanation of the label.

## 6. Validation design
- Single stratified 70/10/20 split. Metrics: accuracy, macro-F1 (classification); ROUGE-1, ROUGE-L, BLEU-1, cosine similarity (explanations). Baselines: encoder fine-tunes vs GPT-4o few-shot/CoT.

## 7. Numerical results / baselines
- **ELECTRA best macro-F1: 0.6946**. **Longformer best accuracy: 0.8511**.
- GPT-4o few-shot: accuracy **0.8210**, macro-F1 **0.6898** (Table 2). Note: the narrative text inconsistently says CoT achieved the highest macro-F1 at **0.6870** — a small table-vs-text discrepancy; table values quoted here.
- Explanation (CoT): ROUGE-1 **0.2707**, ROUGE-L **0.2144**, BLEU-1 **0.0173**, cosine **0.5776** — weak; explanations are not usable.
- **Deceptive class is weakest: ELECTRA F1 0.511** (only 10.5% of data).

## 8. Code / data availability
- Dataset access promised **"upon acceptance"**; the download link is omitted in the anonymized version. No code link stated.

## 9. Leakage & limitations
- **Only two annotators, both coauthors; no inter-annotator agreement reported** — the labels *are* the paper's main contribution and their reliability is unmeasured. (b) Deceptive class: 396 examples, F1 0.511 — the most policy-relevant class is the worst-detected. (c) Platform claims conflict (Instagram+Reddit vs Meta Ads Library/primarily Instagram). (d) Explanation metrics (BLEU-1 0.0173) show generation is decorative, not functional. (e) Single split; no temporal validation; no adversarial test on paraphrased ads.

## 10. GSE overlap
- No gambling-ad-integrity or promo-compliance ledger exists in `arxiv-deep/` (checked; `0618-deep-gamblers-learning-to-abstain.md` is about model abstention — distinct). The affiliate lane (Amazon/FanDuel/DraftKings) makes promo-copy compliance a live GSE concern. **New capability**, not a duplicate.

## 11. GSE implementation spec
- **Use case:** scan GSE's affiliate promo copy, sportsbook ad creatives, and sponsored content for manipulative/deceptive patterns before publication (responsible-gambling compliance + brand safety).
- **Data:** sample 500–1,000 sportsbook promos/affiliate blurbs; annotate with **3+ annotators** and report Cohen's κ (fixing the paper's two-annotator gap); reuse the paper's 3-class taxonomy.
- **Model:** fine-tune ELECTRA with the paper's recipe (5 epochs, AdamW, lr 2e-5, inverse-frequency weighted CE) as the starting point.
- **Serving:** batch screen on content ingest; flag deceptive/manipulative for human review.
- **Effort:** ~2 engineer-weeks + annotation cost.

## 12. Reproducible test
- Dataset: 500 held-out sportsbook promos, triple-annotated (κ reported). Baseline: keyword/regex rules (e.g., "risk-free", "guaranteed"). Metric: macro-F1; report per-class F1 with emphasis on the deceptive class.

## 13. Acceptance / rejection gate
- **Adopt** if macro-F1 ≥ 0.65 on triple-annotated held-out promos with annotator κ ≥ 0.6 AND deceptive-class F1 ≥ 0.60 (the paper's 0.511 is the bar to clear); **reject** otherwise — a compliance filter that misses deceptive ads is liability theater.

## 14. Improvement experiment
- **Multimodal + active learning:** add creative-image OCR text and image features (many manipulative claims live in the image, not the caption), and run uncertainty-based active learning targeted at the deceptive class (the paper's weakest point). Hypothesis: the deceptive-class F1 gap closes because deceptive ads are rare (10.5%) and visually distinct — exactly where active learning and a second modality help most.
