# MANIFEST BATCH 33 — MOTIF-TIERB-DRAIN-01

Landed by Motif (QC lead verification: gatekeeper validate + verbatim-quote substring proof against extracted text + book_id recomputed from PDF bytes for every artifact).

| book_id | Title | Primitives |
|---|---|---|
| 9f60825fd9658c1f | Olson — The Logic of Collective Action (1965) | 35 |
| a18b4d7374943f5b | OpenStax — Anatomy and Physiology (2013) | 35 |
| 6e242c689b7979a1 | Pavlov — Conditioned Reflexes (1927) | 35 |
| e380c0619b73bfbf | Galton — Natural Inheritance (1889) | REFUSAL (INSUFFICIENT_OCR) |
| e73b74ed0cb107fe | Hull — Principles of Behavior (1943) | REFUSAL (INSUFFICIENT_OCR) |

Batch total: 105 primitives across 3 extractions, plus 2 gatekeeper-valid refusal artifacts with true book_ids. Drain running total after batch 33: 168 books extracted, 5,843 primitives (batches 01-33), plus 20 refusal records overall.

Notes: all three extractions passed first verification clean, including Pavlov (1927). Galton and Hull are image-only scans with no text layer (Galton: shipped text is 3,316 bytes of Google Books front matter; Hull: 428 bytes of form feeds over 428 pages). Both refusals carry the true scan-digest book_id, so a full-book OCR pass over each PDF closes them without re-keying; that OCR pass is the named next step for both, following the route that closed Wiener, Knight, Dixon and Coles, and Halmos earlier in this drain. Seven books remain on the local books-must-have shelf: James Vol 1 and Vol 2, Laplace, Pearson, Sherrington, Tolman, Virchow.
