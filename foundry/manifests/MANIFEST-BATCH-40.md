# MANIFEST BATCH 40 - MOTIF-TIERB-DRAIN-01 (final local batch)

Landed by Motif fleet, 2026-11-16. Every artifact verified by Motif
with the gatekeeper contract plus per-quote substring checks, and
book_id recomputed from the PDF bytes (scan digest, first 16 hex).

- 5fee5df924431396 Berry, The Forward Pass in Football (1921): 36 primitives, 950 think words, clean first pass
- e73b74ed0cb107fe Hull, Principles of Behavior (1943): 31 primitives, 947 think words. COMPLETE via the Indra full text of the same PDF; OVERWRITES the batch 33 INSUFFICIENT_OCR refusal at the same path. Supersession recorded in the artifact and logs.
- f71e7f8d0f56e236 Spalding Official Foot Ball Guide 1915 (ed. Camp): 34 primitives, 968 think words, via the books-38 full OCR text of the same scan
- 496accf108936510 Camp, Book of College Sports (1900): 35 primitives, 1,222 think words, via books-38
- 136f6949e9cf6b25 Yost, Football for Player and Spectator (1905): 35 primitives, 1,306 think words, via books-38
- 05c6c8cfbaf6c8b0 Roper, Winning Football (1920): 34 primitives, 992 think words, via books-38
- f9f1f764900914c6 Daly, American Football (1921): 35 primitives, 930 think words, via books-38
- aecf6d872156f408 Camp, Football for the Spectator (1911): REFUSAL, INSUFFICIENT_OCR. Shipped text is 3,099 bytes / 496 words of Google Books boilerplate; fresh pdftotext of the 70-page image-only PDF returns the identical 496 words; no full text exists on disk (indra-full and books-38 both checked). Re-queue condition: a full-book OCR pass.

Batch total: 240 primitives across 7 extractions plus 1 refusal.
Running Motif total: 201 books extracted, 6,991 primitives, 204
artifact files on the branch, 21 refusal records standing (18
file-absent titles, Galton, James Vol 2, Camp 1911).

With this batch the local library is fully processed: every book
file on this machine carries a gatekeeper-verified artifact,
COMPLETE or an honest refusal with its re-queue condition.
