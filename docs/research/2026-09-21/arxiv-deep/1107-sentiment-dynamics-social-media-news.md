# [1107] Sentiment Dynamics in Social Media News Channels (arXiv:1908.08147v1)

**Citation:** Nagendra Kumar, Rakshita Nagalla, Tanya Marwah, and Manish Singh (2019). *Sentiment Dynamics in Social Media News Channels*. arXiv:1908.08147v1. URL: https://arxiv.org/abs/1908.08147v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — descriptive platform study with no predictive validation or transferable method; not worth GSE adaptation. Replaced by ledger 1308 (arXiv:2408.02520v1).

## 1. Research question
How does sentiment in news posts and audience reactions vary across five Facebook news channels (CNN, NPR, Fox, Economist, NYT)?

## 2. Dataset / schema
~0.15M Facebook posts and 1.13B reactions. Post counts: CNN 33,324; NPR 18,266; Fox 26,525; Economist 24,272; NYT 47,522. VADER scores mapped to integer [-5,5]; LDA optimum k=10; human topic precision 80.3%; relevance weight λ=0.6.

## 3. Method / model
VADER sentiment scoring of posts and comments; LDA topic modeling; correlation of post sentiment with comment sentiment per channel. Reported: Fox negative posts 40%; NPR positive 43%, negative 28%; post/comment correlations CNN 0.97, Fox 0.98, Economist 0.95, NYT 0.97, NPR 0.93 (claimed p<.05).

## 4. Rejection grounds
(1) Purely descriptive: no predictive task, no held-out evaluation, no model that could be applied to new data. (2) Post/comment correlations ~0.95+ are likely artifacts of the normalized engagement metric and common audience rather than discovered signal — and engagement is *normalized*, removing the scale that prediction needs. (3) No direct GSE transfer: the object of study is news-channel audience behavior on Facebook, not sports outcomes, markets, or fan sentiment with a prediction horizon. (4) The claimed p<.05 on N≈10^5 correlations is meaningless (any correlation is "significant" at that N). Nothing here is actionable for the most accurate and calibrated prediction company.

## 5. Replacement
Replaced by full ledger 1308: arXiv:2408.02520v1 — "OneLove beyond the field" (few-shot LLM topic+stance pipeline for live sports-event social data), a directly operational NLP read.
