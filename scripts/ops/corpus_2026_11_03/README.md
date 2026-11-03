# Downloads corpus ingestion, 2026-11-03

Scripts (run with python -I):
- build_manifest.py: sha256 + size manifest for the listed Downloads files (370 real files; dedupe by content hash)
- extract_corpus.py: writes brain/feeds/2026-11-03/trainer_feed.jsonl (gitignored) from the manifest
- fix_zip_docx.py: re-extracts docx members of zip archives (needs python-docx)

Honest status per record: EXTRACTED | EMPTY_TEXT | EXTRACT_ERROR | BINARY_RECORDED | SKIPPED_TOO_LARGE.

Known gaps (not done):
- 4 image-only PDFs need OCR (tesseract not installed): LS_Advanced_Calculus5.pdf, lecture-01-world-models-overview.pdf, monmonier001.pdf, CIA-RDP96-00792R000700710002-1.pdf
- 2 zip members over 40 MB skipped (prod-grok-backend.json)
- Equation waves to onejev mind-queue blocked: C:/Users/Garrett/onejev missing on this machine
- Sensitive files deliberately excluded from feed: SSN Passport.pdf, Statement 10_26_26 (449K, PDF).pdf
