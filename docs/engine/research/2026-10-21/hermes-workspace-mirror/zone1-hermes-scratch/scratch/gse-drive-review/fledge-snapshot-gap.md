# Snapshot gap report — Sports-main (8).zip vs live worktree

Extraction root verified: `G:\My Drive\GSE. 10.2.26\Sports-main (8).zip` (14,087 entries, ~288 MB).
Extracted to `C:\Users\Garrett\AppData\Local\Temp\gse-extract\fledge\Sports-main`.
Live worktree: `C:\Users\Garrett\Sports-wt-intel`.

Scope reviewed (same as prompt): `packages/` (all EXCEPT `packages/prediction-engine/src/calibration`, already handled by a prior pass), `workers/`, `apps/web/lib/`, `gse-ml-service/`, `scripts/`. Docs (`docs/` segments, `*.md`) and test fixtures (`__fixtures__/`, `/fixtures/`, `*.snap`) excluded. Prior-pass dirs (`intelligence/reasoning_engine`, `intelligence/gates`, `packages/prediction-engine/src/calibration`) not re-checked.

In-scope file counts: snapshot 5,158 files; live 5,158 files.

## Counts

- SNAPSHOT-ONLY (in zip, absent from live): **0**
- DIVERGED (present in both, materially different): **0**
  - One file hashed differently (`packages/ingestion-pipeline/src/signal-registry-extensions.ts`) but the difference is CRLF vs LF line endings only — content is identical after normalization. Not counted as diverged.

## Snapshot-only list

None.

## Diverged list

None material.

## Wire-candidate verdicts

None — the `Sports-main (8).zip` snapshot is a byte-for-byte copy of the live worktree in every in-scope path (modulo one CRLF/LF file). There is no mechanism hiding in this archive that the live branch lacks.

## Honest notes / what I could not read

- `packages/ingestion-pipeline/node_modules/.vite/vitest/results.json` and `packages/prediction-engine/node_modules/.vite/vitest/results.json` exist only in live — cache artifacts, not source.
- `intelligence/reasoning_engine` exists in both but the live copy has more entries (18 vs 30) — expected growth since the snapshot; intelligence dirs were explicitly out of this pass's scope and handled previously.
- Scripts were compared as raw files; I did not execute or trace the call graph of every `scripts/*` file (none are snapshot-only, so none affect the verdict).
- Prior passes own `intelligence/reasoning_engine`, `intelligence/gates`, and `packages/prediction-engine/src/calibration`; their gap analysis is not reproduced here.
