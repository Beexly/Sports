# MANIFEST BATCH 35 - MOTIF-TIERB-DRAIN-01

Landed by Motif fleet, 2026-11-16. Both items are gatekeeper-valid
REFUSAL artifacts with true book_ids, verified by Motif (gatekeeper
pass, book_id recomputed from the PDF bytes).

- f3bc81c25e181419 James, Principles of Psychology Vol 2 (1890):
  REFUSAL, INSUFFICIENT_OCR. Shipped text is 3,755 bytes of Google
  Books front matter only; a fresh pdftotext of the 726-page PDF
  returns the same 496 words. The PDF is an image-only scan.
- a8460213ae97b1e7 Tolman, Purposive Behavior in Animals and Men
  (1932): REFUSAL, INSUFFICIENT_OCR. Shipped text is 495 bytes of
  form feeds, 0 words; the 495-page PDF is an image-only TIFF scan
  (tiff2pdf producer, no text layer).

Named closer for both, and for the Galton and Hull refusals: a
full-book OCR pass over each PDF, then re-queue for extraction. One
lead already on disk: an Indra-lane full markdown of the Tolman PDF
exists at full-library-2026-11-12/indra-full/ - its completeness and
page fidelity must be verified before it can serve as a quote source.

Running Motif total: 173 books extracted, 6,017 primitives, 177
artifact files on the branch, 22 refusal records (18 file-absent
placeholders + Galton + Hull + James Vol 2 + Tolman). The
books-must-have shelf is now fully processed. Next: scan-digest FREE
pass over books-a-sports and books-b-medical for batch 36+.
