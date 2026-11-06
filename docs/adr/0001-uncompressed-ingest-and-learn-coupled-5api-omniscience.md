# ADR-0001: Uncompressed Ingest-and-Learn Doctrine & Coupled 5-API Omniscience Engine

## Status

Accepted (`2026-11-06`)

## Context

Galaxy Sports Edge (`GSE`) and Galaxy Sports Intelligence (`GSI`) require total informational, mathematical, and tactical omniscience across NFL football, sports medicine/biomechanics, statistical physics, causal inference, and market microstructure. Historically, naive pipelines either discarded third-party commercial/academic feeds out of excessive caution or compressed large textbook/paper corpora into shallow summaries.

At the same time, our corpus expanded to:
- `197 / 197` (`100.0%`) unique Mega-Sweep Google Drive textbooks across `395` synced PDF files (`204` unique folder/filename paths) and `210` total cataloged textbooks (`197` Drive PDFs + `3` source-repo resolved + `10` web-native textbooks) plus `41` `.md` wave/index files.
- `372` total repositories and URLs (`198` unique wave repos across `200` manifest rows + `174` new URLs across 3 batches).
- `20` `AM-01..AM-20` open-source algorithmic dossiers, `30` Morning Sweep CSV tables (including `nfl-researcher-pressure-rate-ngs-2026.csv`), `10` Innovation Kernels, `5` `gse-ml-service` models (`TDA`, `MPS`, `MaxEntIRL`, `Friston Free Energy`, `ETKF`), `877` cached sports research PDFs, and `12,304` source-traced executable equations.

## Decision Drivers

* **Zero Information Loss (`INGEST-AND-LEARN` & `THE STACK`)**: Every dataset, textbook, equation, and charting feed (including `nflverse_ngs`, FTN charting, SumerSports, FantasyPoints Data, PFF samples, and Sports Info Solutions) must be 100% ingested into the internal mind and reasoning engine for learning—while ensuring public customer copy is 100% original GSE first-party prose.
* **Bidirectional Discovery**: Forward ingestion alone misses unindexed practitioner alpha; we need a coupled 5-API (`Kaggle <-> xAI Grok <-> arXiv <-> OpenAlex <-> Hugging Face`) forward and 8-step reverse/interleaved loop.
* **Single-Writer Mind Integrity**: Agents must stage trainer-ready JSONL records to `data/mind_staging/*.jsonl` without directly mutating `brain/mind.jsonl`.

## Considered Options

### Option 1: Selective Filtering & Summarized Ingestion
- **Pros**: Smaller disk footprint and faster one-pass scripts.
- **Cons**: Violates `INGEST-AND-LEARN` and `UNCOMPRESSED-INTELLIGENCE`; loses deep mathematical derivations, tail-risk lemmas, and NGS/charting interaction terms.

### Option 2: Uncompressed 100% Zero-Skip Ingestion + Coupled 5-API Omniscience Engine + Internal-Only Commercial Learning Firewall
- **Pros**: 100% coverage (`0` skipped pages, `0` skipped books, `0` skipped repos/URLs); learns from every charting/tracking feed internally while keeping customer-facing surfaces 100% first-party; couples `xAI Grok` (`grok-4.7` & `grok-4.20-0309-reasoning`) with `arXiv`, `OpenAlex`, `Kaggle`, and `Hugging Face`.
- **Cons**: Requires structured staging (`data/mind_staging/`) and hybrid cloud vector indexing (`Pinecone`) to stay within laptop disk and RAM budgets.

## Decision

We adopt **Option 2**: Uncompressed 100% Zero-Skip Ingestion across all 7 corpus roots, backed by the Internal-Only Commercial Learning Firewall and the Forward + 8-Step Reverse/Interleaved Coupled 5-API Omniscience Engine (`Waves 1–16B`).

## Rationale

1. **Equations are school, not ammo**: Feeding all `210` books, `12,304` equations, and `30` Morning Sweep CSVs (including NGS pressure rates) gives the engine complete structural grounding before pricing any market.
2. **Coupled 5-API loop eliminates blind spots**: Practitioner observations harvested on X via `xAI Grok` are cross-verified against peer-reviewed biomechanics/math papers on `arXiv` and `OpenAlex` and empirical tracking tables on `Kaggle` and `Hugging Face`.

## Consequences

### Positive
- `197/197` (`100.0%`) unique Mega-Sweep Drive books (`395` PDFs, `41` MDs) and `372/372` repos/URLs are actively wired with `skipped = 0`.
- `Waves 1–16B` provide `32/32` NFL team tactical dossiers, beat-writer practice tells, orthopedic return-to-play degradation curves, and cross-derivative arbitrage detectors.

### Negative
- High volume of extracted knowledge (`>1.1 MB` wired manifest JSON + `>540 KB` PDF knowledge index) requires automated verification gates.

## Implementation Notes

- Extraction script: `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py`
- Corpus wiring script: `scripts/ops/wire_mega_sweep_2026_11_06_corpus.py`
- 32-Team & Unseen Alpha harvester: `scripts/ops/xai_32_team_dossier_and_unseen_alpha_harvester.py`

## Related Decisions

- [ADR-0002](0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md): Situational-First 5-Stage Engine Gate
- [ADR-0004](0004-hardware-aware-laptop-execution-pinecone-hybrid-and-bazel-monorepo.md): Hardware-Aware Laptop Execution & Pinecone Hybrid Index

## References

- `data/audits/pdf_and_book_zero_skip_audit_2026_11_06.json`
- `data/audits/mega_sweep_2026_11_06_wired_manifest.json`
- `docs/engine/research/2026-11-06/MEGA_SWEEP_200_BOOK_AND_198_REPO_WIRING_LEDGER.md`
