# GSE Intelligence Decisions To Ratify

This file records reversible choices and human-gated actions surfaced by the GSE Intelligence Core work. Codex may scaffold code paths behind OFF flags, but it may not self-approve owner, infra, data, schema, payment, entitlement, or calibration truth flips.

## 2026-06-23 - Slice 0

| Decision | Owner | Status | Rationale | Ratification Needed |
|---|---|---:|---|---|
| Use `codex/intelligence-core` in `C:\Users\Garrett\Sports-intelligence-core` instead of editing the dirty primary checkout | Codex | chosen | Preserves unrelated in-flight work on `codex/galaxy-dynasty-studio-rescue-v2` while starting from `origin/claude/sweet-fermi-sk9gws`. | No owner action required unless the owner wants work applied directly to another branch. |
| Treat the GSE Intelligence package as external operating specs, not committed repo docs | Codex | chosen | The package files exist under `C:\Users\Garrett\Documents\Claude\Projects\AI Sports` but are absent from this branch by filename. | Optional: owner/Claude can commit the package docs later for repo-native provenance. |
| Use `node --use-system-ca` for local nflverse probes on this host | Codex | chosen | Plain Node fetch failed TLS verification locally; system CA mode succeeded. | Optional environment cleanup if future scripts should run without `--use-system-ca`. |
| Add `LadderEvent` to Prisma schema without applying a migration | Codex | chosen | A1 needs the append-only model contract, but schema application to a shared database is a human/infra gate. | `[SCHEMA]` Generate and apply a reviewed migration in the target database environment. |
| Keep ladder reducer output shadow-only | Codex | chosen | A1 proves evidence derivation and two-track invariants without flipping `canPublishProjections`, pricing, performance stats, or model calibration. | `[OWNER]/[DATA]` Ratify any future runtime consumption of ladder state. |
| Use a runtime-neutral deterministic replay fingerprint in E1 | Codex | chosen | Exporting a Node-only crypto import through `@sports/prediction-engine` breaks the Next web bundle; E1 only needs deterministic replay identity. | No owner action required; D4 must choose the cryptographic hash-chain implementation for replayable provenance. |
| Keep B1 feature-store persistence as an injected R2/DuckDB seam | Codex | chosen | The feature-store contract needs a durable target shape, but no bucket, relation, credential, or write path should be created by Codex. | `[INFRA]` Provision `R2_FEATURE_STORE` and `feature_store.metric_snapshots`, then wire an implementation behind review. |
| Use `DEFAULT_PLAYER_RATE_SHRINKAGE_K = 12` for B2 posteriors | Codex | chosen | Twelve pseudo-samples gives visible shrinkage for thin player rates while letting real volume dominate; every posterior remains shadow and `priced=false`. | `[DATA]` Tune k by position and metric through purged/embargoed walk-forward evidence before any public weighting. |

## Standing Human Gates

- `[OWNER]` Stripe price creation and live money actions.
- `[OWNER]/[DATA]` `PROJECTIONS_PROVIDER`, `canPublishProjections`, `PERFORMANCE_STATS_ENABLED`, `PUBLIC_PICKS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, and `CALIBRATION_ADJUSTMENTS_ENABLED` flips.
- `[DATA]` Any `MODEL_VERSION` bump or `IMPLEMENTED` calibration proposal.
- `[INFRA]` R2/DuckDB/Oracle/prod DB provisioning.
- `[SCHEMA]` Applying migrations to any shared or production database.
