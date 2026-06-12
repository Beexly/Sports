---
vault: jarvis
folder: 03-prompts
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy, prompts]
---

# 03 — Prompt Library Index

Source of truth for prompt templates is code:
`apps/web/lib/jarvis/prompt-library.ts` (typed, tested, deterministic).
This folder holds the human-readable mirror plus experimental drafts.

## Registered templates

| Id | Type | Purpose |
|---|---|---|
| `jarvis-os-build` | CLAUDE_CODE_TASK | Build Jarvis OS features end-to-end |
| `overnight-test-run` | OVERNIGHT_RUN | Full test/typecheck/lint sweep overnight |
| `data-reliability-check` | DATA_RELIABILITY | Audit ingestion freshness and adapter health |
| `calibration-review` | QA_REVIEW | Review prediction calibration vs settled results |
| `gse-feature-build` | GSE_BUILD | Build a new GSE feature with tests |
| `content-generation` | AIRWAVE_TASK | Draft content from approved picks data |
| `design-review-pass` | DESIGN_REVIEW | Review UI/UX against cockpit doctrine |
| `security-review` | LEGAL_REVIEW | Security and legal posture review |

## Protocol

- New prompts are drafted here as notes, then promoted into the typed library.
- Every prompt declares: model lane, token budget, forbidden actions,
  acceptance criteria, validation commands, scribe instructions, approval boundary.
- Prompts never instruct evasion, auto-publishing, or unverified claims.
