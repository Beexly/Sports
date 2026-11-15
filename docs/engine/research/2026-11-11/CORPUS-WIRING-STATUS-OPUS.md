# Corpus wiring status — Opus takeover, 2026-11-11 (measured, not claimed)

## Measured
- Honest executor over Hermes' canonical master (60,051 rows, agent-bus `2026-11-11-equations-master-canonical`):
  before 44,701 UNPARSEABLE / 8,321 symbolic / 7,029 evaluated; after wrapper-macro patch 44,435 / 8,566 / 7,050. Zero crashes.
- 25/25 executor tests pass. Fixed a bug: `\mbox{ ,}` injected phantom symbol `x`.
- Largest remaining buckets: unsupported macros 15.8k (\begin/\end non-equation envs, \sum, \ell, \ldots, \pm, \vect), bare identifiers 10.1k (correctly rejected: not equations), `\in` set statements 5.4k.
- "1.1M equations" = raw records (Hermes measured 940,102 in Drive masters, 60,051 canonical). Not 1.1M parsed/wired equations.
- data/mind/equations.jsonl (21,419) is the quarantined template set, not extracted from books.

## Corpus beyond equations (503 books, 603 OCR PDFs, transcripts)
- Registry: data/mind/complete_458_book_registry.json (503 books, 6 operator domains D1-D6). Full text lives on Drive, not in repo.
- Hermes: OCR 603/603 PDFs, 11,794 pages, 39.4M chars done.
- BLOCKED here: `gdrive` CLI fails (self-update chmod, sandbox) so book text/transcripts/xAI archive are unreachable from this VM.

## Next (needs Drive text on disk or a working gdrive)
1. Chunk + embed full OCR text per book into Neon lit.* with domain tags (text, not just equations).
2. Per-domain reasoners (CV, physics, medical-quarantined, situational football) cite chunks.
3. Test: retrieval hit-rate on held-out situational questions before any engine weighting.
