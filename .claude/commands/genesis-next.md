---
description: Execute one bounded Galaxy Genesis workstream with recovery-first, token-efficient verification
argument-hint: [next|GX-000|GX-###|verify]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Agent
---

You are the implementation conductor for Galaxy Genesis inside the current `Beexly/Sports` repository.

Optimization target:

```text
MAXIMUM VERIFIED CAPABILITY PER TOKEN
```

Do not ask the founder questions. Do not perform a broad audit. Do not reread the whole docs tree. Do not begin a second workstream.

## 0. Install the durable package when needed

If `docs/genesis/FIRST_BUILD_CONTRACT.md` is absent and `scripts/install-genesis-package.mjs` exists, run:

```bash
node scripts/install-genesis-package.mjs
```

Verify the generated files exist, then continue. Do not reread the installer payload.

## 1. Establish reality

Run concise Git checks. Detect a dirty tree before editing.

When unrelated work is in progress, create a separate Git worktree and implementation branch rather than modifying or stashing another agent’s work. Never reset, discard or overwrite uncommitted changes.

Verify current main and relevant PR/branch assets. Old docs and PR descriptions are leads, not authority.

## 2. Select the workstream

Argument: `$ARGUMENTS`

- Empty or `next`: read `GENESIS_START_HERE.md` and `docs/genesis/WORK_QUEUE.md`; choose the highest dependency-ready item. On the first run choose `GX-000`.
- `GX-000`: read only `GENESIS_START_HERE.md`, `docs/genesis/DECISIONS.md`, and `docs/genesis/FIRST_BUILD_CONTRACT.md` plus exact named repo files.
- Any other ID: read the work queue and only that workstream’s approved contract. If no contract exists, write a compact build contract from existing Genesis doctrine, then stop before implementation unless the contract is unambiguous and no protected policy decision is required.
- `verify`: independently inspect the current branch diff and execute applicable verification without expanding scope.

## 3. Recover before creating

For every required capability classify existing assets:

```text
ALREADY_ON_MAIN
EXTEND_EXISTING
RECOVER_WHOLE
RECOVER_PARTIAL
SUPERSEDED
OWNER_GATE
ABSENT
```

Inspect Agent Foundry, Resource Radar, Assurance, model routing, evidence playback, proof systems, source governance and Dynasty assets when relevant. Do not create a second canonical system.

## 4. Freeze one contract

Before editing, write internally:

```text
Workstream
Value
Existing assets
Canonical owner
Expected files
Protected zones
Acceptance criteria
Verification
Explicit exclusions
```

Then implement the smallest complete vertical slice.

## 5. Hard constraints

Do not:

- push to or merge `main`;
- deploy;
- apply production migrations;
- mutate Stripe or production infrastructure;
- broaden source rights;
- publish externally;
- fabricate live state, data, tests or performance;
- change settlement, CLV, calibration, proof, entitlement or public-claim policy without explicit founder authority already recorded in the repository;
- interpret “frontier” as permission to weaken trust gates.

Record an `OWNER_GATE` and continue around genuinely reserved actions.

## 6. Token discipline

- Search by symbol/path before opening files.
- Prefer current compact state ledgers over historical handoff dumps.
- Use at most one subagent at a time.
- Use a cheap read-only scout for narrow discovery and an independent verifier after implementation.
- Redirect large logs to temporary files; inspect summaries and failures.
- Run focused tests during development and final relevant gates once.
- Stop after one workstream even when context remains.

## 7. Verification

Use repository-native commands and the selected contract. Never report green without command evidence.

Always include:

```text
git diff --check
secret scan
relevant tests
typecheck
lint
applicable guardrails
build when production compilation is affected
```

Run browser/accessibility checks when user-facing behavior changes.

## 8. Update durable state

Update only the compact Genesis files needed to reflect:

- actual canonical paths;
- implemented status;
- asset recovery;
- known limits;
- next dependency-ready workstream.

Do not duplicate the full R&D into new docs.

## 9. Git and PR

Use one dedicated branch and one draft PR. Do not merge. The PR body must distinguish:

- code proven locally/CI;
- shadow-only capability;
- production state not proven;
- owner gates.

## 10. Final receipt

Return a concise receipt using:

```text
BASELINE
WORKSTREAM
CONTRACT
ASSET RECOVERY
IMPLEMENTATION
PROTECTED-ZONE REVIEW
VERIFICATION
BRANCH / DRAFT PR
OWNER GATES
KNOWN LIMITS
NEXT WORKSTREAM
TOKEN-DISCIPLINE RECEIPT
```

Stop.
