# GSE / GSN Command Center

As of: 2026-06-09

This command center is the launch and operating system for Galaxy Sports Edge / GSN. It consolidates prior Codex/Claude/research work, prevents duplicate builds, assigns department ownership, trains workers/agents, tracks launch blockers, and prepares Claude final handoff.

## How To Use It

1. Start with _index.md.
2. Read 25-final-report.md for the current truth.
3. Use launch/12-launch-blocker-triage.md for launch blockers.
4. Use launch/13-launch-readiness-scorecard.md for readiness by area.
5. Use departments/ for ownership.
6. Use training/ for worker instructions.
7. Use build-queue/ for executable, duplicate-gated build cards.
8. Use handoff/ for Claude final polish and verification.

## Where Things Live

- Departments: docs/command-center/departments/
- Training: docs/command-center/training/
- Build queues: docs/command-center/build-queue/
- Launch blockers: docs/command-center/launch/
- Audits: docs/command-center/audits/
- Discovery and suggestions: docs/command-center/discovery/
- Claude handoff: docs/command-center/handoff/
- Inventory ledgers: docs/command-center/inventory/

## Avoiding Duplicate Work

Search artifact-ledger.csv, build-ledger.csv, duplicate-map.json, and existing research build queues before creating new work. If a build already exists, extend it. If it is obsolete, supersede it. If uncertain, mark it for review.

## Updating Status

Only mark work complete when evidence exists: code diff, passing tests, screenshots, source verification, approved deployment, or explicit owner signoff.

## Escalation

Escalate production deploys, production DB mutation, payment/pricing changes, live affiliate/promotions, legal copy, contests/prizes, aggressive tracking, and founder-method exposure.

