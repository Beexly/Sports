# MANIFEST BATCH 34 - MOTIF-TIERB-DRAIN-01

Landed by Motif fleet, 2026-11-16. All five artifacts verified by
Motif with the gatekeeper contract plus per-quote substring checks
against the shipped extracted texts, and book_id recomputed from the
PDF bytes (scan digest, first 16 hex).

- 1eeec19323dd2eb8 James, Principles of Psychology Vol 1 (1890): 35 primitives, 965 think words, clean first pass
- dd3ab9f8360fad55 Laplace, Philosophical Essay on Probabilities (1814): 34 primitives, 1132 think words, clean first pass
- 16bef7d3575fbb4b Pearson, The Grammar of Science (1892): 35 primitives, 988 think words, clean first pass
- 62edbd6b1829b7d3 Sherrington, The Integrative Action of the Nervous System (1906): 35 primitives, 923 think words, after repair (12 quotes re-sourced to the shipped text)
- fb393f2a874dbca2 Virchow, Cellular Pathology (1858): 35 primitives, 936 think words, clean first pass

Batch total: 174 primitives. Running Motif total: 173 books
extracted, 6,017 primitives, plus 20 refusal records (18 file-absent
placeholders, Galton, Hull). Remaining in books-must-have: James Vol 2
and Tolman, both with stub shipped texts (refusals expected unless an
OCR pass is run first).
