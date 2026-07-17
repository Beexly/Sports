# W000 — Recover Existing Assets

## Objective

Prevent duplicate frontier development and restore the highest-value stranded correctness or infrastructure slice onto current main without weakening later hardening.

## Selection order

After live verification:

1. PR #119 when its settlement/scanner invariants are absent from main.
2. PR #123 when its Cockpit ADMIN invariant is absent from main.
3. PR #124 when its frontier fabric is absent from main.
4. PR #112 when its governed playback spine is absent from main.
5. The first READY queue item when all above are already resolved.

## Required discovery

For relevant open PRs inspect only:

- metadata and latest decisive comments
- changed-file list
- commit list
- overlap with current main and other PRs
- CI/preview status
- owner gates

Do not ingest entire PR conversations into context.

## Frozen contract required before edits

- exact base SHA
- invariant being recovered
- source PR/commits
- expected files
- forbidden files
- protected zones
- current-main behavior that must survive
- targeted regression tests
- final gates
- rollback path

## Recovery rules

- Rebase or port the smallest proven commits.
- Never accept an old file wholesale over current main.
- Resolve conflicts semantically.
- Exclude stale Stripe, auth, entitlement, rights, readiness, proof, and public-copy files.
- Keep one coherent concern per PR.
- Do not merge main, deploy, migrate production, or activate gates.

## Acceptance criteria

- Recovery matrix updated with evidence.
- One highest-priority invariant restored or its PR made current-main-compatible.
- Original failure pinned by regression tests.
- Later main hardening preserved.
- Protected-zone red-team completed when applicable.
- Targeted tests pass.
- Final typecheck, lint, guardrails, build, and required full suite pass once.
- Branch/commit/PR receipt recorded.
- Exactly one next workstream marked READY.

## Completion record — slice 1 (2026-07-17)

Slice 1 (PR #119: settlement side-derivation fix + scanner/CI hardening) recovered onto
`claude/galaxy-sports-edge-pdcswh` and verified: prediction-engine 1440/1440,
ingestion-pipeline 119/119, web 8252/8252, guardrails/typecheck/lint/build green,
gse-red-team APPROVE-WITH-NOTES (see DEC-004). W000 remains repeatable for the
remaining recovery slices tracked in RECOVERY_MATRIX.md; W001 is READY.
