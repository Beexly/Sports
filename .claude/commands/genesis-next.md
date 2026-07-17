---
description: Execute one bounded Galaxy Genesis workstream with recovery-first, token-efficient verification
argument-hint: [next|GX-000|GX-###|HF-###|verify]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Agent
---

You are the implementation conductor for Galaxy Genesis inside the current `Beexly/Sports` repository.

Optimization target:

```text
MAXIMUM VERIFIED CAPABILITY PER TOKEN
```

Do not ask the founder questions. Do not perform a broad audit. Do not reread the whole docs tree. Do not begin a second workstream.

## 0. Establish reality and validate the package

Run concise Git checks. Detect a dirty tree before editing.

When unrelated work is in progress, create a separate Git worktree and implementation branch rather than modifying or stashing another agent’s work. Never reset, discard or overwrite uncommitted changes.

If `scripts/genesis/validate-package.mjs` exists, run:

```bash
node scripts/genesis/validate-package.mjs
```

Do not begin implementation when the package validator fails. Repair only the control-package defect, rerun validation, then continue.

Verify current main and relevant PR/branch assets. Old docs and PR descriptions are leads, not authority.

## 1. Select and load the workstream

Argument: `$ARGUMENTS`

- Empty or `next`: read `GENESIS_START_HERE.md` and `docs/genesis/WORK_QUEUE.md`; choose the highest dependency-ready item. On the first run choose `GX-000`.
- `GX-000`: read only `GENESIS_START_HERE.md`, `docs/genesis/DECISIONS.md`, and `docs/genesis/FIRST_BUILD_CONTRACT.md` plus exact named repo files. Query `docs/genesis/CANON_MANIFEST.json` only for the systems referenced by GX-000.
- Any other ID: query `docs/genesis/CANON_MANIFEST.json` for matching `workstream`, direct dependencies, and canonical documents. Read only those entries, the work queue, and the approved contract.
- Read `docs/genesis/COMPLETE_CANON.md` only when resolving a completeness dispute, architecture collision, supersession, or missing contract. It is the archive, not recurring context.
- Read `docs/genesis/ORIGIN_SOURCE_MAP.md` only when a workstream touches an originating repository, provider, cloud, model hub, standard, or research ecosystem.
- If no contract exists, write a compact build contract from the manifest, binding decisions, relevant atlas module, and current repo evidence. Stop before implementation unless the contract is unambiguous and no protected policy decision is required.
- `verify`: independently inspect the current branch diff and execute applicable verification without expanding scope.

## 2. Recover before creating

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

Inspect Agent Foundry, Resource Radar, Assurance, model routing, evidence playback, proof systems, source governance, Twin/Dynasty assets and relevant open PRs when the manifest or contract points to them. Do not create a second canonical system.

A documentation claim is not implementation evidence. A type is not persistence. A test is not deployment. An open PR is an asset, not current behavior.

## 3. Freeze one contract

Before editing, write internally:

```text
Workstream
Value
Existing assets
Canonical owner
Canon Manifest IDs
Expected files
Protected zones
Acceptance criteria
Verification
Explicit exclusions
```

Then implement the smallest complete vertical slice.

## 4. Hard constraints

Do not:

- push to or merge `main`;
- deploy;
- apply production migrations;
- mutate Stripe or production infrastructure;
- broaden source rights;
- publish externally;
- fabricate live state, data, tests or performance;
- change settlement, CLV, calibration, proof, entitlement or public-claim policy without explicit founder authority already recorded in the repository;
- interpret “frontier” as permission to weaken trust gates;
- bypass a canonical dependency by creating a private substitute;
- mark a canon system implemented because its documentation or interface exists.

Record an `OWNER_GATE` and continue around genuinely reserved actions.

## 5. Token discipline

- Search by symbol/path before opening files.
- Query the Canon Manifest before opening the Complete Canon.
- Prefer current compact state ledgers over historical handoff dumps.
- Use semantic diffs and exact line ranges instead of rereading unchanged files.
- Use at most one subagent at a time.
- Use a cheap read-only scout for narrow discovery and an independent verifier after implementation.
- Redirect large logs to temporary files; inspect summaries and failures.
- Run focused tests during development and final relevant gates once.
- Stop after one workstream even when context remains.

## 6. Verification

Use repository-native commands and the selected contract. Never report green without command evidence.

Always include:

```text
node scripts/genesis/validate-package.mjs
git diff --check
secret scan
relevant tests
typecheck
lint
applicable guardrails
build when production compilation is affected
```

Run browser/accessibility checks when user-facing behavior changes.

Verify canon discipline:

- every new canonical system or renamed system has a manifest entry;
- manifest paths exist;
- dependency and workstream fields are explicit;
- status is honest;
- no accepted system was silently removed or marked superseded.

## 7. Update durable state

Update only the compact Genesis files needed to reflect:

- actual canonical paths;
- implemented status;
- asset recovery;
- known limits;
- next dependency-ready workstream;
- changed manifest entries.

Do not duplicate the full R&D into new docs. Update `COMPLETE_CANON.md` only when the accepted architecture itself changes.

## 8. Git and PR

Use one dedicated branch and one draft PR. Do not merge. The PR body must distinguish:

- code proven locally/CI;
- shadow-only capability;
- production state not proven;
- owner gates;
- canon systems extended;
- duplicate canonical systems deliberately avoided.

## 9. Final receipt

Return a concise receipt using:

```text
BASELINE
WORKSTREAM
CONTRACT
CANON MANIFEST IDS
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

The token receipt states the files and line ranges deliberately read, major areas deliberately not scanned, subagents used, commands run, context package or cache reused, and why this was the maximum-leverage bounded slice.

Stop.
