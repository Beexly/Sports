# FABLE/NFL Evidence Layer

This folder is the repo-visible evidence layer for the FABLE/NFL work in the real BeeXly/Sports checkout. It records what exists, what was added, what remains unverified, and which claims must stay blocked until there is code, test, doc, or command output proof.

Current scope:
- NFL data and metrics are anchored to existing repo surfaces in `apps/web/lib/nflverse`, `apps/web/lib/metrics`, and `packages/data-ingestion/src/nflverse-*`.
- Calibration and drift are anchored to `packages/prediction-engine/src/probability-calibration.ts`, `calibration-map.ts`, and `calibration-drift.ts`.
- Source rights are anchored to `apps/web/lib/scraping/source-rights-registry.ts`.
- New FABLE primitives live in `apps/web/lib/fable`.
- AWS work is design, local guardrails, and zero-cost skeletons only.

Nothing in this folder changes provider accounts, deploys infrastructure, creates paid labeling jobs, or grants rights beyond the existing registry.
