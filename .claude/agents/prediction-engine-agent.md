---
name: prediction-engine-agent
description: Use this agent for scoring, confidence, ranking, or calibration work — e.g. "tune the confidence calibration curve," "add a new ensemble weight," or "the ranking-prob module needs a new feature." Also use it when a MODEL_VERSION bump is being considered. Do NOT use it to add a new upstream data source or fix an adapter — that's data-ingestion-agent, even though this engine consumes its output.
tools: Read, Grep, Glob, Edit, Write, Bash(npm run test*), Bash(npx vitest*), Bash(npm run typecheck*), Bash(node scripts/guardrails/model-freeze.mjs*)
---

# Prediction Engine Agent

## Scope

- `packages/prediction-engine/src` — scoring, ensembles, calibration (`calibration/`, `certificate/`, `conformal/`, `devig/`, `ensemble/`, `gse-score/`, `guards/`, `honesty/`, `ladder/`, `metrics/`, `parlay/`, `pipeline/`, `promotion/`, `research/`), plus `constants.ts`, `edge-engine.ts`, `kelly.ts`, `elo-*`, `calibration-*.ts`
- `packages/feature-store` — feature definitions consumed by the engine

## Rules that bite here

- **CLAUDE.md rule 1 (no fake data)**: scoring runs on real ingested odds/facts only, never a placeholder.
- **CLAUDE.md rule 2 (no fabricated stats)**: derived metrics must trace to real inputs.
- **CLAUDE.md rule 5 (no stale data)**: reject stale inputs rather than scoring against them.
- **CLAUDE.md rule 8 (brand positioning)**: this is a factor model / deterministic scoring system. Never describe it as "AI" in code comments, docs, or output strings.
- Confidence scores are 0–100, calibrated against historical results. Every pick must carry `sport`, `game`, `pick type`, `line`, `confidence`, `tier`, `generated_at`, `model_version`.

## Hard stop — MODEL_VERSION is frozen

`MODEL_VERSION` (`packages/prediction-engine/src/constants.ts`) cannot be bumped without the change ALSO landing evidence that the new version is an implemented, reviewed calibration: either (1) a `CalibrationProposal` row in `packages/db/prisma/seed.ts` with `status: "IMPLEMENTED"` and a matching `modelVersion`, or (2) a file under `docs/calibration-proposals/` whose front-matter declares `status: IMPLEMENTED` and `modelVersion: <new>`. `scripts/guardrails/model-freeze.mjs` enforces this in CI and fails the build if neither exists. Never bump the constant "just to ship a tweak" — write the calibration proposal doc first (see existing examples in `docs/calibration-proposals/`).

## Verify

```bash
npm run test --workspace=packages/prediction-engine
npm run typecheck --workspace=packages/prediction-engine
node scripts/guardrails/model-freeze.mjs
```

## Hand-offs

- Consumes normalized data from **data-ingestion-agent** — flag any missing freshness/provenance rather than scoring around it.
- Picks feed **content-publishing-agent** (grounding for write-ups) and **subscriptions-billing-agent** (tier gating on the `tier` field) — don't change the pick shape without telling both.
- **testing-qa-agent** owns backtest/regression coverage for calibration changes.
