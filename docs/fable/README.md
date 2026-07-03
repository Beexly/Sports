# FABLE/NFL Evidence Layer

This folder is the repo-visible evidence layer for the FABLE/NFL work in the real BeeXly/Sports checkout. It records what exists, what was added, what remains unverified, and which claims must stay blocked until there is code, test, doc, or command output proof.

## Reviewer Start Here

This system is a repo-native evidence machine for FABLE/NFL and AWS research. It separates lawful, measured, falsifiable work from unsupported claims.

What is proven:
- Source status can be adapted from the existing rights registry.
- FABLE uncertainty, labeling, drift, parity, AWS gate, and evidence harness primitives have targeted tests.
- AWS deploy, paid-resource, and decision-engine gates default off for risky AWS action.
- GitHub navigation exists from the root README into this folder.

What is not proven:
- Any model-performance gain.
- Any broad competitive claim.
- Any live AWS deployment or paid labeling setup.
- Any legal clearance beyond source-specific registry evidence.

How to verify locally:

```bash
npm run fable:evidence
npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts
```

AWS posture:
- AWS docs here are research and decision records only.
- All AWS work is no-cost/local unless the owner explicitly approves a gated spike.

Needs approval:
- AWS deploys, paid resources, external-source automation, ML runtime additions, partner demos, and any public claim using unsupported historical phrases.

Current scope:
- NFL data and metrics are anchored to existing repo surfaces in `apps/web/lib/nflverse`, `apps/web/lib/metrics`, and `packages/data-ingestion/src/nflverse-*`.
- Calibration and drift are anchored to `packages/prediction-engine/src/probability-calibration.ts`, `calibration-map.ts`, and `calibration-drift.ts`.
- Source rights are anchored to `apps/web/lib/scraping/source-rights-registry.ts`.
- New FABLE primitives live in `apps/web/lib/fable`.
- AWS work is design, local guardrails, and zero-cost skeletons only.

Nothing in this folder changes provider accounts, deploys infrastructure, creates paid labeling jobs, or grants rights beyond the existing registry.

Navigation:
Root README -> `docs/fable/README.md` -> `docs/fable/INDEX.md` -> `docs/fable/evidence/EVIDENCE_INDEX.md` -> `docs/fable/master/MASTER_FINAL_REPORT.md`.
