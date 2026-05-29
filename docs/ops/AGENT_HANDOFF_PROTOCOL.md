# Agent Handoff Protocol

Status: ACTIVE
Date: 2026-05-28

## Claude -> Codex
Claude handoff must include branch, commit, files changed, route count, test count, build result, trust/compliance result, screenshots/probes if available, owner gates untouched, and known unresolved builder gaps.

## Codex -> Claude
Codex handoff must include final verdicts, gap matrix, Claude-owned repairs only, acceptance criteria, validation commands, do-not-touch list, and re-audit trigger.

## Shared Rules
- One broad writer at a time.
- Do not rely on local-only artifacts unless committed or restated in committed reports.
- Do not assign owner gates to builders.
- Do not present tests passing as release readiness.
- Every handoff must preserve public/private engine boundaries and owner authority gates.
