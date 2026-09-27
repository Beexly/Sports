# [0127] Enhancing GraphQL Security by Detecting Malicious Queries Using Large Language Models, Sentence Transformers, and Convolutional Neural Networks (arXiv:2508.11711)

**Citation:** Irash Perera, Hiranya Abeyrathne, Sanjeewa Malalgoda, Arshardh Ifthikar (2025). *Enhancing GraphQL Security by Detecting Malicious Queries Using Large Language Models, Sentence Transformers, and Convolutional Neural Networks*. arXiv:2508.11711v2. URL: https://arxiv.org/abs/2508.11711v2
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** ADAPT (narrowly) — the layered defense pattern (static AST checks as the authoritative gate + ML as additive telemetry) is the right doctrine for Garrett's public web apps (SignPreview, Kit pages on Vercel), but GSE runs no GraphQL API, so the paper's specific machinery does not transfer.

## 1. Research question
Can malicious GraphQL queries (injection, XSS, DoS-shaped queries) be detected at the API gateway by combining static AST analysis, LLM-generated schema-specific thresholds, and neural classifiers — with low enough latency for production?

## 2. Dataset / schema
Three labeled corpora (Section III): SQLi ≈77K malicious / 75K benign; OS command injection 7.5K / 7.5K; XSS 38K / 44K. Split sizes, collection dates, and deduplication protocol: "Not stated in paper." Payloads are GraphQL query strings with embedded injection attempts.

## 3. Method / model
(a) Static layer: GraphQL AST parsing with checks for query depth, alias overloading, batching, circular queries, directives, payload inflation, and SSRF patterns. (b) LLM layer: an LLM generates schema-specific thresholds and per-field complexity scores (the paper's novel claim — static ceilings alone are too blunt). (c) SQLi / OS-injection classifiers: SBERT all-MiniLM-L6-v2 embeddings (384-dim) concatenated with handcrafted features (special-char counts, keyword counts); 1D CNN with filters 128/256/512, kernel size 3, batch-norm + max-pool; dense 256, dropout 0.5, sigmoid output; Adam lr 0.001, binary cross-entropy, ≤20 epochs, batch 32, early stopping patience 5. (d) XSS: custom Doc2Vec (20-dim) + Random Forest and MLP classifiers. (e) Serving: ONNX INT8 quantization, FastAPI + Gunicorn/Uvicorn, parallel CPU and I/O thread pools. Load test on Azure F-series (4 vCPU, 8 GB), ramp 0→500 users at 10 users/s over 2 minutes — figures show curves but no exact latency/RPS numbers ("Not stated in paper").

## 4. Equations & assumptions
No numbered equations ("Not stated in paper"). Architecture described verbally as above. Assumptions: attacker payloads resemble the training corpora distribution; AST-parseable queries (malformed queries rejected upstream); LLM-generated thresholds are advisory, static ceilings remain hard gates.

## 5. Features / target
Input features: GraphQL query string → 384-dim SBERT embedding + handcrafted counts (special characters, SQL keywords, OS-command tokens). Target: binary malicious/benign per attack class (SQLi, OS injection, XSS separately). Prediction horizon: per-request, gateway inline.

## 6. Validation design
Standard train/test on the three corpora; metrics accuracy/precision/recall/F1. No adversarial evaluation (no test against adaptive attackers or payload mutations), no cross-dataset generalization (e.g., train on SQLi corpus A, test on corpus B), no false-positive cost analysis on legitimate complex queries. Load test measures throughput/latency under ramp but reports only figures.

## 7. Numerical results / baselines
Exact (Section IV): SQLi CNN — accuracy 0.9678, precision 0.9940, recall 0.9403, F1 0.9664; OS-injection CNN — 0.9767, 0.9950, 0.9659, 0.9802; XSS Random Forest — 0.9938, 0.9988, 0.9879, 0.9933; XSS MLP — 0.9948, 0.9961, 0.9926, 0.9943. Baselines: RF vs MLP on XSS only; no comparison against a pure-static-rules baseline or against existing GraphQL security gateways (e.g., Escape, Inigo) — the static layer's standalone performance is never ablated.

## 8. Code / data availability
"Not stated in paper" — no repository URL, no dataset link.

## 9. Leakage & limitations
Adversarial read: (a) near-perfect scores (F1 ≥ 0.966) on i.i.d. test splits with no adversarial or out-of-distribution evaluation — classic overfitting-to-the-corpus risk; (b) no dataset provenance (dates, dedup) — possible train/test leakage via near-duplicate payloads; (c) the LLM-generates-thresholds idea is unevaluated — no measurement of whether LLM thresholds beat hand-set ones; (d) load-test figures without numbers; (e) an LLM in the security decision path is itself prompt-injectable — unaddressed; (f) GSE runs no GraphQL endpoint, so the entire method section is non-transferable as-is. The transferable doctrine is defense layering: deterministic gates authoritative, ML additive.

## 10. GSE overlap
From existing-research-map.md: no API-security or adversarial-ML research in the corpus. Garrett's public surfaces (SignPreview, Kit landing pages, Vercel apps) have no published security analysis. No duplication — but also minimal relevance: the corpus's security concerns are unaddressed generally, and this paper doesn't address web-form/static-site threats specifically.

## 11. GSE implementation spec
Do NOT build the paper's pipeline. Adapt only the doctrine to Garrett's Vercel apps: (a) static, deterministic input validation as the hard gate (payload size caps, character allowlists on form fields, rate limits at the edge); (b) ML-based detection only as additive logging/telemetry, never as the sole block decision — the paper's own architecture agrees (static ceilings stay authoritative). Effort: a few hours of hardening on the Kit/SignPreview forms; no model training warranted.

## 12. Reproducible test
Dataset: 7 days of request logs from the Kit/SignPreview Vercel apps. Metric: count of blocked malicious-shape requests (static rules) and false-positive rate on legitimate submissions. Baseline: current state (no validation). This tests the adapted doctrine, not the paper's classifiers.

## 13. Acceptance / rejection gate
ADAPT the static-gate doctrine iff the 7-day log review shows ≥1 credible malicious-shape request blocked per week with zero false positives on legitimate leads; reject any LLM-in-the-security-path component unconditionally (the paper provides no evidence its LLM thresholds outperform static ones, and it expands attack surface).

## 14. Improvement experiment
One follow-up (for the paper's own program): ablate the static AST layer alone vs static+CNN vs static+CNN+LLM-thresholds on a held-out, time-split corpus plus an adversarial mutation set (payload obfuscation via encoding/case/whitespace variants). Dataset: their SQLi corpus re-split by time. Metric: recall at fixed 0.1% FPR on the adversarial set. Gate: the CNN must beat static-alone by ≥5 points recall on adversarial payloads to justify its complexity.
