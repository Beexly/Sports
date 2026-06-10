# 00 — Current State & Safety (Phase 0)

> Data Mesh program, Wave 1. This is the working-tree snapshot the rest of the
> program builds on. **Nothing in this wave commits, resets, or deploys.**
> This document is the contract for what is safe to touch and what is off-limits.

## Repository state at capture

| Field | Value |
|---|---|
| Branch | `safety/sports-wip-2026-06-04` |
| HEAD | `f897fd5` |
| Dirty (tracked) | 37 modified |
| Untracked | 48 untracked |
| Staged | **0 files staged** |
| Launch-26 files staged | **No (0 files staged)** |

There is no staged change set and no Launch-26 work in the index. The tree is a
broad work-in-progress: 37 tracked files have uncommitted edits and 48 new files
are untracked. That mix is the reason this wave is **read-and-document only**.

## Standing rule for this wave

**Do not `git reset`, do not `git commit`, do not deploy.**

- No `git reset` (hard or soft): there are 37 modified + 48 untracked files with
  no staging discipline; a reset would silently destroy uncommitted work.
- No `git commit`: the working tree mixes unrelated in-flight changes; a commit
  here would entangle Data Mesh docs with P0 core edits.
- No deploy: production is alias-based and the cron/readiness surfaces are
  mid-edit (see `avoid` list). A deploy from this tree would ship half-built
  health/live/ready APIs.

Wave 1 writes **only** under `docs/command-center/data-mesh/` (this directory).

## Safe to touch

These paths are documentation, research, type definitions, type tests, and
report artifacts — isolated from the live request path and safe to add to or edit:

- `docs/command-center/**`
- `docs/research/**`
- `packages/types/src/__tests__/world-model.test.ts`
- `packages/types/src/world-model.ts`
- `reports/codex/**`

## Avoid (off-limits this wave)

These are P0 core surfaces with uncommitted edits already present, plus the new
health/live/ready/cockpit code that Wave 2 will harden. Touching them now risks
colliding with in-flight work or shipping a partial control plane:

- `apps/web/**` — P0 modified core: tests, API routes, pages, middleware, auth,
  board state.
- `reports/launch-night/snapshots/**` — snapshot files (golden outputs; editing
  invalidates comparisons).
- `scripts/prod-probe.mjs` — production probe script.
- `apps/web/lib/cockpit/**` — control-plane code.
- `apps/web/app/api/live/**` — new API (in progress).
- `apps/web/app/api/ready/**` — new API (in progress).
- `apps/web/lib/health/**` — new health module (in progress).

## Why this matters for the program

The Data Mesh work touches exactly the surfaces in the `avoid` list (odds
ingestion, the cron job, the health/ready endpoints). Wave 1 is deliberately
confined to docs so that the diagnosis is captured and reviewable **before** any
code on those surfaces changes. The single launch-critical fix (job truth
contract — see `01-current-odds-api-failure-root-cause.md`) lands in **Wave 2**,
on a clean branch, gated by review — not here.
