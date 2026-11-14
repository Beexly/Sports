# MANIFEST BATCH 05 — MOTIF-TIERB-DRAIN-01

Landed by Motif (QC lead verification: gatekeeper validate + verbatim-quote substring proof against extracted text + book_id recomputed from PDF bytes for every artifact).

| book_id | Title | Primitives |
|---|---|---|
| e08896844a3e14e7 | Wiener — The Human Use of Human Beings (1950) | 35 |
| 09fe4b789dbfcaff | Bertsekas — Rollout, Policy Iteration, and Distributed Reinforcement Learning (2020) | 35 |
| 6685233edb82e64f | Shumway & Stoffer — Time Series Analysis and Its Applications | 36 |
| b6476d8715b01a7b | Anderson, Guionnet & Zeitouni — An Introduction to Random Matrices (2010) | 35 |
| 57781e83055e56f1 | Hastie, Tibshirani & Friedman — The Elements of Statistical Learning, 2ed (2009) | 35 |

Batch total: 176 primitives. Drain running total after batch 05: 30 books, 1,036 primitives (batches 01-05).

Notes: Wiener's library PDF is an image-only scan and its extracted text file is a 130-byte stub; quotes were proven against a full-book OCR pass of that same PDF (stored with the artifact's source_note; OCR text at the Motif work dir for reconciliation). Hastie entered after repair: its first-pass book_id matched neither the PDF nor the text under any digest variant, so it was re-keyed to the true PDF scan digest 57781e83055e56f1 and 5 quotes were replaced with contiguous single-page spans, then re-verified.
