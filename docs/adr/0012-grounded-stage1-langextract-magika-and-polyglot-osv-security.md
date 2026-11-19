# ADR 0012 - Source-Grounded Stage-1 Ingestion (`langextract` + `magika`), `LocalStack` Receipts & Polyglot `osv.dev` Security

**Date:** 2026-11-15
**Status:** Accepted

## Context

Silent upstream feed corruptions (HTML challenge/error pages saved under `.csv` or `.parquet` paths), ungrounded beat-report paraphrases, monolithic script coupling (`gse_connected_game_workflow.py`), and Node-only vulnerability auditing (`dependency-audit.mjs` blind to Python `uv.lock`, `gse-ml-service/requirements.txt`, and `apps/mobile/package-lock.json`) repeatedly degraded pregame reliability.

## Decision

1. **Deep-Module Python 3.12+ Engine (`src/gse_engine`):** Consolidate ingestion guards, vacated-volume conservation, empirical QB rushing/kneeldown physics, two-sided Class B gates, Empirical-Covariance DFS optimization, Temporal workflows, Arize OpenInference walk-forward evals, and `python-fire` CLI commands behind clean Google-style typed interfaces (`mypy --strict`, `ruff` Google docstrings, zero emojis).
2. **Content-Type & Character-Span Grounding:** Validate raw fetched bytes with `google/magika` magic/deep-learning inspection before parsing, and enforce exact `transcript[start_char:end_char] == verbatim_quote` span grounding (`google/langextract` pattern) on beat and coach-press extractions.
3. **Zero-Cost Local S3 Testing & Polyglot OSV Security:** Verify immutable `boto3` proof receipts against `localstack/localstack` in dev/CI and Cloudflare R2 in production (strictly preserving `aws-compatibility-index-scan.mjs` with zero paid AWS resources), and extend supply-chain scanning via `google/osv.dev` across JS, Python, and iOS lockfiles.

## Consequences

- Corrupted upstream feeds and hallucinated beat claims fail closed at Stage 0/1 before touching simulations.
- Windows and Linux developer workflows execute identically via Node `.mjs` (`google/zx` idioms) scripts without WSL `/bin/bash` fragility.
