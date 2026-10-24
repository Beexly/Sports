# Plan: GSE Pipeline, Worker, and Intelligence Hardening

## Overview
Execute end-to-end hardening, synchronization, and verification for GSE ingestion, workers, cloud backend, and optimizer tooling per requirements R1-R3.

## Phase 0: Architecture Survey
Spawn 3 Explorers in parallel to inspect the codebase:
1. `explorer_survey_ingest`: Survey `packages/ingestion-pipeline` and `workers/data-refresh` odds path, keyless-first provider tagging, fallback to paid feeds (`ODDS_PROVIDER`), and bet term preservation.
2. `explorer_survey_test`: Survey Vitest configurations (`vitest.config.ts`, package-level vitest configs), test runner inclusion/exclusion of `.worktrees/**`, and current failures in `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`.
3. `explorer_survey_cloud_opt`: Survey `.env.local` / Neon S3 & AI Gateway integrations, snapshot exporters, `intelligence/optimizer/` (`dfs_optimizer_suite.py` and `pull_entries.py`), and `docs/<bucket>/research/2026-10-11/` AGENTS.md filing compliance.

## Phase 1: M1 - Test Suite Isolation (.worktrees/** exclusion)
- Ensure Vitest, TypeScript, and test runners do not scan into `.worktrees/**`.
- Fix any mock leaks or config issues in `packages/ingestion-pipeline`.

## Phase 2: M2 - Odds Ingestion Pipeline & Worker Synchronization
- Synchronize `packages/ingestion-pipeline` and `workers/data-refresh` with Galaxy keyless-first path.
- Proper provider tagging, clean fallback, zero schema drift, write-once bet term preservation.

## Phase 3: M3 - Cloud Backend, Optimizer & Research Filing
- Validate Neon S3 storage and AI Gateway connectivity and snapshot exporters.
- Verify `intelligence/optimizer/dfs_optimizer_suite.py` and `pull_entries.py`.
- Ensure research docs in `docs/<bucket>/research/2026-10-11/` adhere to AGENTS.md rules.

## Phase 4: M4 - Multi-Agent Verification & Forensic Audit
- Verify all acceptance criteria:
  - `vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` (87/87 pass)
  - No `.worktrees/**` scanning
  - Full build & type checks pass cleanly
  - Research doc filing verified
  - Optimizer scripts run without errors
- Reviewers, Challengers, and Forensic Auditor verification.

## Phase 5: Handoff & Completion
- Deliver `handoff.md` and report to Sentinel.
